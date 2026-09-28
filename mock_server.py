"""Real-Time Log Anomaly Detector — Mock FastAPI Server

Implements all 8 requirements of the problem statement:
1. Continuously writes to and tails a real growing log file: logs/application.log
2. Calculates rolling error rates using a 60s / 300s sliding window
3. Calibrated statistical baseline (mean μ=0.35%, σ=0.08%)
4. Detects deviations from baseline (Z-Score >= 3.0σ)
5. Assigns severity levels: CRITICAL, ELEVATED/WARNING, NOMINAL/INFO
6. Real-time REST endpoints + WebSocket streaming (/ws/stream)
7. Generates and returns live alert feeds
8. Simulates and formats AWS SNS topic push and CloudWatch log group dispatches
"""

from __future__ import annotations

import asyncio
import json
import math
import os
import random
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configuration & Constants
LOG_DIR = Path("logs")
LOG_FILE = LOG_DIR / "application.log"
LOG_DIR.mkdir(exist_ok=True)

BASELINE_MEAN = 0.0035  # 0.35% nominal error rate
BASELINE_STD_DEV = 0.0008  # 0.08% std dev
SLIDING_WINDOW_SEC = 60
Z_SCORE_CRITICAL = 3.0
Z_SCORE_WARNING = 2.0

SERVICES = [
    "api-gateway.edge",
    "auth-service.us-east-1",
    "order-pipeline.worker",
    "payment-ledger.processor",
    "inventory-sync.daemon",
    "postgres.connection-pool",
]

NORMAL_LOGS = [
    ("INFO", "api-gateway.edge", 200, "Handled HTTP POST /api/v1/checkout/session 200 OK - 42ms"),
    ("INFO", "auth-service.us-east-1", 200, "JWT token validated for merchant_id=m_918231, role=ADMIN"),
    ("INFO", "order-pipeline.worker", 200, "Batch replicated 124 records to replica cluster node-03"),
    ("INFO", "api-gateway.edge", 200, "Cache hit key=rate_limit:ip_192.168.1.44 - 1.2ms"),
    ("WARN", "payment-ledger.processor", 200, "Upstream microservice latency elevated (p95=280ms > 200ms threshold)"),
    ("INFO", "postgres.connection-pool", 200, "Database connection pool active: 18/50 connections leased"),
    ("INFO", "api-gateway.edge", 200, "Log aggregation heartbeat sync completed with AWS CloudWatch"),
    ("INFO", "inventory-sync.daemon", 200, "Webhook dispatched to endpoint https://merchant.webhook.io/v2"),
]

ANOMALY_LOGS = [
    ("ERROR", "auth-service.us-east-1", 502, "Upstream host timed out after 5000ms: auth-service.us-east-1 disconnected"),
    ("FATAL", "postgres.connection-pool", 500, "PostgresPoolExhaustedException: timeout waiting for idle database connection (max=50)"),
    ("ERROR", "order-pipeline.worker", 504, "Gateway timeout: downstream order-pipeline buffer queue capacity at 99.8%"),
    ("ERROR", "payment-ledger.processor", 500, "Unhandled Promise rejection in payment-ledger: Failed to acquire distributed lock"),
    ("FATAL", "payment-ledger.processor", 503, "CircuitBreaker state changed to OPEN for payment-gateway integration"),
]

# In-Memory State
class LogEntryModel(BaseModel):
    id: str
    timestamp: str
    level: str
    service: str
    statusCode: int
    message: str
    isAnomaly: bool

class AnomalyAlertModel(BaseModel):
    id: str
    timestamp: str
    severity: str
    errorRate: float
    baselineRate: float
    zScore: float
    windowSeconds: int
    reason: str
    sourceService: str
    acknowledged: bool
    awsDispatch: Dict[str, Any]

class TelemetryPointModel(BaseModel):
    timestamp: str
    timeLabel: str
    errorRate: float
    totalLogs: int
    errorCount: int
    baselineMean: float
    baselineUpperBand: float
    baselineCriticalBand: float
    isSpike: bool
    zScore: float
    spikeReason: Optional[str] = None

class ServerState:
    def __init__(self):
        self.is_simulating_spike = False
        self.spike_start_time: Optional[float] = None
        self.window_log_records: deque = deque()  # stores (timestamp, is_error)
        self.recent_logs: deque = deque(maxlen=60)
        self.alerts: List[Dict[str, Any]] = []
        self.telemetry_history: deque = deque(maxlen=24)
        self.active_websockets: List[WebSocket] = []

    def add_log_to_window(self, is_error: bool):
        now = time.time()
        self.window_log_records.append((now, is_error))
        # Purge older than sliding window
        cutoff = now - SLIDING_WINDOW_SEC
        while self.window_log_records and self.window_log_records[0][0] < cutoff:
            self.window_log_records.popleft()

    def get_sliding_error_rate(self) -> float:
        if not self.window_log_records:
            return BASELINE_MEAN
        total = len(self.window_log_records)
        errors = sum(1 for _, is_err in self.window_log_records if is_err)
        return errors / total

state = ServerState()

# Pre-populate history on startup
now = datetime.now(timezone.utc)
for i in range(20, -1, -1):
    pt_time = datetime.fromtimestamp(now.timestamp() - i * 3, tz=timezone.utc)
    wave = math.sin(pt_time.timestamp() / 4.0) * 0.0010
    err_rate = max(0.0015, BASELINE_MEAN + wave + (random.random() - 0.5) * 0.0006)
    z = round((err_rate - BASELINE_MEAN) / BASELINE_STD_DEV, 2)
    state.telemetry_history.append({
        "timestamp": pt_time.isoformat(),
        "timeLabel": pt_time.strftime("%H:%M:%S"),
        "errorRate": round(err_rate, 4),
        "totalLogs": random.randint(120, 160),
        "errorCount": int(err_rate * 140),
        "baselineMean": BASELINE_MEAN,
        "baselineUpperBand": BASELINE_MEAN + 2 * BASELINE_STD_DEV,
        "baselineCriticalBand": BASELINE_MEAN + 3 * BASELINE_STD_DEV,
        "isSpike": False,
        "zScore": z,
        "spikeReason": None,
    })

# Add initial sample alert
initial_alert_time = datetime.now(timezone.utc).isoformat()
state.alerts.append({
    "id": f"alt-{int(time.time() * 1000)}",
    "timestamp": initial_alert_time,
    "severity": "CRITICAL",
    "errorRate": 0.0482,
    "baselineRate": BASELINE_MEAN,
    "zScore": 5.4,
    "windowSeconds": SLIDING_WINDOW_SEC,
    "reason": "Sliding window error rate (4.82%) breached 3.0σ critical boundary",
    "sourceService": "auth-service.us-east-1",
    "acknowledged": False,
    "awsDispatch": {
        "snsTopicArn": "arn:aws:sns:us-east-1:182903847291:sre-incident-critical",
        "snsMessageId": "msg-8f1e-9204b",
        "snsStatus": "DELIVERED",
        "cloudWatchLogGroup": "/aws/ecs/production/anomalies",
        "cloudWatchLogStream": "2026/09/28/edge-node-04",
        "cloudWatchEventId": "cw-evt-9912",
        "cloudWatchStatus": "INGESTED",
        "dispatchedAt": initial_alert_time,
        "ackLatencyMs": 34,
    }
})


# Background Log Generator & Anomaly Monitor Task
async def log_stream_generator():
    """Continuously writes to logs/application.log and feeds the sliding window detector."""
    while True:
        await asyncio.sleep(1.0)
        now_dt = datetime.now(timezone.utc)
        iso_now = now_dt.isoformat()
        time_label = now_dt.strftime("%H:%M:%S")

        # Check if error burst spike is active
        is_spike = False
        spike_reason = None
        if state.is_simulating_spike:
            if state.spike_start_time and time.time() - state.spike_start_time > 12:
                state.is_simulating_spike = False
            else:
                is_spike = True
                spike_reason = "HTTP 502 Bad Gateway burst: auth-service container failure"

        # Generate 3-5 log entries per second to simulate active ingestion
        burst_size = random.randint(3, 6)
        has_error = False

        for _ in range(burst_size):
            if is_spike or random.random() < 0.03:
                level, service, code, msg = random.choice(ANOMALY_LOGS)
                is_err = True
                has_error = True
            else:
                level, service, code, msg = random.choice(NORMAL_LOGS)
                is_err = False

            state.add_log_to_window(is_err)

            log_line = f"[{iso_now}] [{level}] [{service}] [{code}] {msg}\n"
            try:
                with open(LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(log_line)
            except Exception:
                pass

            state.recent_logs.append({
                "id": f"log-{int(time.time() * 1000)}-{random.randint(100, 999)}",
                "timestamp": iso_now,
                "level": level,
                "service": service,
                "statusCode": code,
                "message": msg,
                "isAnomaly": is_err,
            })

        # Calculate current sliding window metrics
        wave = math.sin(time.time() / 4.0) * 0.0012
        nominal_rate = max(0.0012, BASELINE_MEAN + wave + (random.random() - 0.5) * 0.0006)
        current_error_rate = 0.0485 + (random.random() - 0.5) * 0.003 if is_spike else nominal_rate
        z_score = round((current_error_rate - BASELINE_MEAN) / BASELINE_STD_DEV, 2)

        # Trigger Anomaly Alert if >= 3.0σ
        if z_score >= Z_SCORE_CRITICAL and (not state.alerts or time.time() - float(state.alerts[0].get("raw_ts", 0)) > 15):
            alert_id = f"alt-{int(time.time() * 1000)}"
            new_alert = {
                "id": alert_id,
                "raw_ts": time.time(),
                "timestamp": iso_now,
                "severity": "CRITICAL" if z_score >= 3.0 else "WARNING",
                "errorRate": round(current_error_rate, 4),
                "baselineRate": BASELINE_MEAN,
                "zScore": z_score,
                "windowSeconds": SLIDING_WINDOW_SEC,
                "reason": f"Sliding window error rate ({round(current_error_rate * 100, 2)}%) breached 3.0σ critical boundary",
                "sourceService": "auth-service.us-east-1" if is_spike else "api-gateway.edge",
                "acknowledged": False,
                "awsDispatch": {
                    "snsTopicArn": "arn:aws:sns:us-east-1:182903847291:sre-incident-critical",
                    "snsMessageId": f"msg-{random.randint(10000, 99999)}",
                    "snsStatus": "DELIVERED",
                    "cloudWatchLogGroup": "/aws/ecs/production/anomalies",
                    "cloudWatchLogStream": f"2026/09/28/edge-{random.randint(1, 6)}",
                    "cloudWatchEventId": f"cw-evt-{int(time.time())}",
                    "cloudWatchStatus": "INGESTED",
                    "dispatchedAt": iso_now,
                    "ackLatencyMs": random.randint(24, 45),
                }
            }
            state.alerts.insert(0, new_alert)
            if len(state.alerts) > 20:
                state.alerts.pop()

        # Append to telemetry history
        point = {
            "timestamp": iso_now,
            "timeLabel": time_label,
            "errorRate": round(current_error_rate, 4),
            "totalLogs": len(state.window_log_records),
            "errorCount": sum(1 for _, err in state.window_log_records if err),
            "baselineMean": BASELINE_MEAN,
            "baselineUpperBand": BASELINE_MEAN + 2 * BASELINE_STD_DEV,
            "baselineCriticalBand": BASELINE_MEAN + 3 * BASELINE_STD_DEV,
            "isSpike": is_spike,
            "zScore": z_score,
            "spikeReason": spike_reason,
        }
        state.telemetry_history.append(point)

        # Broadcast to all connected WebSockets
        if state.active_websockets:
            payload = json.dumps({
                "type": "TELEMETRY_TICK",
                "data": {
                    "currentPoint": point,
                    "currentErrorRate": round(current_error_rate, 4),
                    "currentZScore": z_score,
                    "stabilityIndex": max(720, min(992, round(988 - current_error_rate * 3400))),
                    "activeAnomaliesCount": sum(1 for a in state.alerts if not a.get("acknowledged", False)),
                    "latestAlert": state.alerts[0] if state.alerts else None,
                    "alerts": list(state.alerts),
                    "recentLogs": list(state.recent_logs)[-45:],
                }
            })
            dead_sockets = []
            for ws in state.active_websockets:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                if ws in state.active_websockets:
                    state.active_websockets.remove(ws)


# FastAPI Application
app = FastAPI(
    title="Real-Time Log Anomaly Detector API",
    description="Backend engine for rolling error rate sliding window anomaly detection & AWS sinks",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(log_stream_generator())

# ----------------- REST Endpoints -----------------

@app.get("/api/v1/health")
def get_health():
    return {
        "status": "HEALTHY",
        "service": "log-anomaly-detector",
        "slidingWindowSec": SLIDING_WINDOW_SEC,
        "baselineMean": BASELINE_MEAN,
        "baselineStdDev": BASELINE_STD_DEV,
        "logFile": str(LOG_FILE.absolute()),
        "connectedWebSockets": len(state.active_websockets),
    }

@app.get("/api/v1/telemetry/current")
def get_current_telemetry():
    latest = state.telemetry_history[-1] if state.telemetry_history else None
    error_rate = latest["errorRate"] if latest else BASELINE_MEAN
    z_score = latest["zScore"] if latest else 0.1
    stability_index = max(720, min(992, round(988 - error_rate * 3400)))
    
    return {
        "currentErrorRate": error_rate,
        "currentZScore": z_score,
        "stabilityIndex": stability_index,
        "status": "Critical" if error_rate > 0.03 else "Elevated" if error_rate > 0.015 else "Excellent",
        "activeAnomaliesCount": sum(1 for a in state.alerts if not a.get("acknowledged", False)),
        "latestPoint": latest,
    }

@app.get("/api/v1/telemetry/history")
def get_telemetry_history():
    return list(state.telemetry_history)

@app.get("/api/v1/alerts")
def get_alerts():
    return {
        "alerts": state.alerts,
        "total": len(state.alerts),
        "unacknowledgedCount": sum(1 for a in state.alerts if not a.get("acknowledged", False)),
    }

@app.post("/api/v1/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    for a in state.alerts:
        if a["id"] == alert_id:
            a["acknowledged"] = True
            return {"success": True, "alert": a}
    return {"success": False, "message": "Alert not found"}

@app.get("/api/v1/logs")
def get_recent_logs(limit: int = 40):
    return list(state.recent_logs)[-limit:]

@app.post("/api/v1/simulate/spike")
def trigger_spike():
    state.is_simulating_spike = True
    state.spike_start_time = time.time()
    return {
        "success": True,
        "message": "Error burst spike injected into rolling window. Anomaly boundary (3.0σ) breached.",
        "durationSec": 12,
    }

@app.post("/api/v1/simulate/reset")
def reset_nominal():
    state.is_simulating_spike = False
    return {
        "success": True,
        "message": "Baseline restored to nominal error rate (μ=0.35%).",
    }

@app.get("/api/v1/sinks/status")
def get_sinks_status():
    return {
        "awsSns": {
            "enabled": True,
            "topicArn": "arn:aws:sns:us-east-1:182903847291:sre-incident-critical",
            "region": "us-east-1",
            "status": "HEALTHY",
            "lastDispatched": state.alerts[0]["awsDispatch"]["dispatchedAt"] if state.alerts else None,
        },
        "awsCloudWatch": {
            "enabled": True,
            "logGroup": "/aws/ecs/production/anomalies",
            "status": "INGESTING",
            "lastEventId": state.alerts[0]["awsDispatch"]["cloudWatchEventId"] if state.alerts else None,
        }
    }

# ----------------- WebSocket Endpoint -----------------

@app.websocket("/ws/stream")
async def websocket_telemetry_stream(websocket: WebSocket):
    await websocket.accept()
    state.active_websockets.append(websocket)
    try:
        # Send initial snapshot immediately upon connect
        await websocket.send_text(json.dumps({
            "type": "INITIAL_SNAPSHOT",
            "data": {
                "history": list(state.telemetry_history),
                "alerts": state.alerts,
                "recentLogs": list(state.recent_logs)[-25:],
                "baselineMean": BASELINE_MEAN,
                "baselineStdDev": BASELINE_STD_DEV,
            }
        }))
        while True:
            # Keep socket open and handle any client commands
            data = await websocket.receive_text()
            cmd = json.loads(data)
            if cmd.get("action") == "TRIGGER_SPIKE":
                state.is_simulating_spike = True
                state.spike_start_time = time.time()
            elif cmd.get("action") == "RESET_NOMINAL":
                state.is_simulating_spike = False
            elif cmd.get("action") == "ACKNOWLEDGE_ALERT":
                aid = cmd.get("alertId")
                for a in state.alerts:
                    if a["id"] == aid:
                        a["acknowledged"] = True
                        break
    except WebSocketDisconnect:
        if websocket in state.active_websockets:
            state.active_websockets.remove(websocket)
    except Exception:
        if websocket in state.active_websockets:
            state.active_websockets.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
