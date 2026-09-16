"""POST /api/v1/simulate -- re-threshold the model's precomputed
VALIDATION-set probabilities (see api/services/simulation_service.py) to
show the precision/recall/cost tradeoff at any threshold, live. Reuses
src/risk/cost_engine.py verbatim (Day 2); no new ML logic here.
"""

from __future__ import annotations

import os

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Request, status

from api.schemas.simulate import (
    SimulateRequest,
    SimulateResponse,
    SimulateTransactionItem,
    SimulateTransactionsRequest,
    SimulateTransactionsResponse,
)
from api.services.rate_limiter import RateLimiter
from api.services.simulation_service import simulation_service
from src.risk.cost_engine import confusion_counts_at_threshold, expected_cost

router = APIRouter()

# 500/min default, not the same 200/min /predict uses -- sized against
# this endpoint's actual real traffic pattern, not a guess: the Threshold
# Simulator page fires 51 parallel /simulate calls on every mount (one
# per point on the P/R curve -- see frontend's CURVE_THRESHOLDS), plus up
# to one more per 150ms-debounced slider tick while a judge drags across
# the full 0-1 range. A continuous drag for the full 60s window is, worst
# case, ~400 additional debounced calls (60000ms / 150ms), so 51 + ~400
# with real margin lands well under 500 for one legitimate session, while
# still capping a runaway/abusive client at a small fraction of what an
# actual scraper would need to matter (each call here is cheap -- no
# model inference, just re-thresholding an already-loaded array -- so the
# DoS concern is lower than /predict's, which is reflected in the higher
# ceiling rather than a stricter one).
SIMULATE_RATE_LIMIT_PER_MINUTE = int(os.environ.get("SIMULATE_RATE_LIMIT_PER_MINUTE", "500"))
simulate_rate_limiter = RateLimiter(max_requests=SIMULATE_RATE_LIMIT_PER_MINUTE, window_seconds=60.0)

# Much lower than /simulate's 500/min: this is a deliberate-click drill-
# down (see ThresholdSimulator.tsx), not something fired on every slider
# tick, so real legitimate usage for one session is a handful of clicks,
# not hundreds of debounced calls. Each response can also carry up to 200
# rows instead of /simulate's dozen scalar fields, so the per-request cost
# is higher too -- a lower ceiling matches both the expected traffic
# pattern and the larger payload.
SIMULATE_TRANSACTIONS_RATE_LIMIT_PER_MINUTE = int(
    os.environ.get("SIMULATE_TRANSACTIONS_RATE_LIMIT_PER_MINUTE", "120")
)
simulate_transactions_rate_limiter = RateLimiter(
    max_requests=SIMULATE_TRANSACTIONS_RATE_LIMIT_PER_MINUTE, window_seconds=60.0
)


def enforce_simulate_transactions_rate_limit(request: Request) -> None:
    client_key = request.client.host if request.client else "unknown"
    result = simulate_transactions_rate_limiter.check(client_key)
    if not result.allowed:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Rate limit exceeded: max {SIMULATE_TRANSACTIONS_RATE_LIMIT_PER_MINUTE} requests/minute "
                f"per client. Retry after {result.retry_after_seconds:.1f}s."
            ),
            headers={"Retry-After": str(int(result.retry_after_seconds) + 1)},
        )


def enforce_simulate_rate_limit(request: Request) -> None:
    """Same dependency pattern as predict.py's enforce_predict_rate_limit --
    see that function's docstring for why this is a dependency, not
    middleware, and why request.client can be None."""
    client_key = request.client.host if request.client else "unknown"
    result = simulate_rate_limiter.check(client_key)
    if not result.allowed:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Rate limit exceeded: max {SIMULATE_RATE_LIMIT_PER_MINUTE} requests/minute "
                f"per client. Retry after {result.retry_after_seconds:.1f}s."
            ),
            headers={"Retry-After": str(int(result.retry_after_seconds) + 1)},
        )


@router.post(
    "/simulate",
    response_model=SimulateResponse,
    responses={429: {"description": "Rate limit exceeded for this client IP"}},
    dependencies=[Depends(enforce_simulate_rate_limit)],
)
def simulate(request: SimulateRequest) -> SimulateResponse:
    if not simulation_service.is_loaded:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Validation set not loaded")

    tp, fp, fn, tn = confusion_counts_at_threshold(
        simulation_service.y_true, simulation_service.y_prob, request.threshold
    )

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    false_positive_rate = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    actual_fraud_count = tp + fn
    fraud_caught_percent = (tp / actual_fraud_count * 100) if actual_fraud_count > 0 else 0.0

    total = tp + fp + fn + tn
    transactions_affected_count = tp + fp
    transactions_affected_percent = (transactions_affected_count / total * 100) if total > 0 else 0.0

    financial_loss = expected_cost(fp, fn, request.false_positive_cost, request.false_negative_cost)

    return SimulateResponse(
        threshold=request.threshold,
        false_positive_cost=request.false_positive_cost,
        false_negative_cost=request.false_negative_cost,
        precision=precision,
        recall=recall,
        false_positive_rate=false_positive_rate,
        fraud_caught_count=tp,
        fraud_caught_percent=fraud_caught_percent,
        transactions_affected_count=transactions_affected_count,
        transactions_affected_percent=transactions_affected_percent,
        expected_financial_loss=financial_loss,
        tp=tp,
        fp=fp,
        fn=fn,
        tn=tn,
        validation_set_size=total,
    )


@router.post(
    "/simulate/transactions",
    response_model=SimulateTransactionsResponse,
    responses={429: {"description": "Rate limit exceeded for this client IP"}},
    dependencies=[Depends(enforce_simulate_transactions_rate_limit)],
)
def simulate_transactions(request: SimulateTransactionsRequest) -> SimulateTransactionsResponse:
    """Drill-down companion to /simulate: the actual validation-set rows on
    the flagged side of `threshold`, not just their count.

    READ-ONLY, same as /simulate: this only re-thresholds the in-memory
    arrays SimulationService loaded once at startup (see that module's
    docstring). It never opens a database session, and touches nothing in
    api/services/db_models.py -- there is no write path through this
    function at all, so there is nothing here that could retroactively
    change a real stored prediction or transaction record.
    """
    if not simulation_service.is_loaded:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Validation set not loaded")

    y_true = simulation_service.y_true
    y_prob = simulation_service.y_prob
    amount = simulation_service.amount
    transaction_ids = simulation_service.transaction_ids

    affected_mask = y_prob >= request.threshold
    total_affected = int(np.sum(affected_mask))

    affected_indices = np.flatnonzero(affected_mask)
    # Top `limit` by probability descending -- the highest-confidence
    # flags first, since that's what a reviewer would want to see first
    # when scanning a capped list rather than the full affected set.
    order = np.argsort(-y_prob[affected_indices], kind="stable")
    top_indices = affected_indices[order][: request.limit]

    transactions = [
        SimulateTransactionItem(
            transaction_id=f"val_{int(transaction_ids[i])}",
            amount=float(amount[i]),
            fraud_probability=float(y_prob[i]),
            true_label="fraud" if y_true[i] == 1 else "legitimate",
        )
        for i in top_indices
    ]

    return SimulateTransactionsResponse(
        threshold=request.threshold,
        total_affected=total_affected,
        returned_count=len(transactions),
        limit=request.limit,
        transactions=transactions,
    )
