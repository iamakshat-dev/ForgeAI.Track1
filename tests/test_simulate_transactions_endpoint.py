"""Tests for POST /api/v1/simulate/transactions (Threshold Simulator
drill-down): the actual validation-set rows behind /simulate's
"Transactions affected" count.

Uses the same isolated-per-test-database pattern as test_api.py so the
write-safety test (b) can assert against a real, empty predictions table
rather than data/predictions.db's actual accumulated rows.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

import api.services.db as db_module
from api.main import app
from api.services.db_models import AlertRecord, ChargebackRecord, PredictionRecord, RefundRecord


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """A TestClient wired to an isolated, per-test SQLite database -- same
    pattern as test_api.py, so this test can assert on real row counts
    without touching data/predictions.db.
    """
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'test_predictions.db'}",
        connect_args={"check_same_thread": False},
    )
    test_session_local = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    monkeypatch.setattr(db_module, "engine", test_engine)
    monkeypatch.setattr(db_module, "SessionLocal", test_session_local)

    with TestClient(app) as test_client:
        yield test_client


def _table_row_counts(session) -> dict[str, int]:
    return {
        "predictions": session.scalar(select(func.count()).select_from(PredictionRecord)),
        "alerts": session.scalar(select(func.count()).select_from(AlertRecord)),
        "chargebacks": session.scalar(select(func.count()).select_from(ChargebackRecord)),
        "refunds": session.scalar(select(func.count()).select_from(RefundRecord)),
    }


def test_returned_transactions_all_cross_the_threshold(client):
    """(a) every returned row's fraud_probability is >= threshold, and every
    row's `decision` reflects that it's on the flagged side -- the drill-down
    must never leak a row that wouldn't actually be affected at this
    threshold."""
    threshold = 0.5
    response = client.post("/api/v1/simulate/transactions", json={"threshold": threshold, "limit": 50})
    assert response.status_code == 200
    body = response.json()

    assert body["threshold"] == pytest.approx(threshold)
    assert len(body["transactions"]) == body["returned_count"]
    assert body["returned_count"] <= body["limit"]
    assert body["returned_count"] <= body["total_affected"]

    for txn in body["transactions"]:
        assert txn["fraud_probability"] >= threshold
        assert txn["decision"] == "REVIEW/HOLD"
        assert txn["true_label"] in {"fraud", "legitimate"}
        assert txn["transaction_id"].startswith("val_")


def test_total_affected_matches_simulate_endpoint(client):
    """total_affected here must equal /simulate's transactions_affected_count
    for the same threshold -- same underlying mask, two views of it."""
    threshold = 0.3
    sim_response = client.post("/api/v1/simulate", json={"threshold": threshold})
    drilldown_response = client.post("/api/v1/simulate/transactions", json={"threshold": threshold})
    assert sim_response.status_code == 200
    assert drilldown_response.status_code == 200

    assert drilldown_response.json()["total_affected"] == sim_response.json()["transactions_affected_count"]


def test_results_sorted_by_probability_descending(client):
    response = client.post("/api/v1/simulate/transactions", json={"threshold": 0.1, "limit": 50})
    assert response.status_code == 200
    probabilities = [txn["fraud_probability"] for txn in response.json()["transactions"]]
    assert probabilities == sorted(probabilities, reverse=True)


def test_limit_is_respected_and_capped(client):
    response = client.post("/api/v1/simulate/transactions", json={"threshold": 0.0, "limit": 10})
    assert response.status_code == 200
    body = response.json()
    assert body["returned_count"] == 10
    assert len(body["transactions"]) == 10
    # threshold 0.0 flags the entire validation set.
    assert body["total_affected"] > 10

    too_large = client.post("/api/v1/simulate/transactions", json={"threshold": 0.0, "limit": 500})
    assert too_large.status_code == 422


def test_no_write_occurs_on_the_real_tables(client):
    """(b) calling this endpoint -- repeatedly, at different thresholds --
    must not create, modify, or delete a single row in any of the app's
    real stored tables. This is a read-only re-thresholding of an
    in-memory, precomputed snapshot (see api/services/simulation_service.py)."""
    with db_module.SessionLocal() as session:
        before = _table_row_counts(session)

    for threshold in (0.1, 0.4, 0.7, 0.9):
        response = client.post("/api/v1/simulate/transactions", json={"threshold": threshold, "limit": 50})
        assert response.status_code == 200

    with db_module.SessionLocal() as session:
        after = _table_row_counts(session)

    assert after == before
    assert all(count == 0 for count in after.values())


def test_list_updates_when_threshold_changes_between_requests(client):
    """(c) two separate drill-down requests at different thresholds must
    return different, threshold-appropriate results -- not a cached/stale
    list from the first call."""
    low_response = client.post("/api/v1/simulate/transactions", json={"threshold": 0.1, "limit": 50})
    high_response = client.post("/api/v1/simulate/transactions", json={"threshold": 0.9, "limit": 50})
    assert low_response.status_code == 200
    assert high_response.status_code == 200

    low_body = low_response.json()
    high_body = high_response.json()

    # A higher threshold flags a subset (or none) of what a lower one does.
    assert high_body["total_affected"] <= low_body["total_affected"]
    for txn in high_body["transactions"]:
        assert txn["fraud_probability"] >= 0.9
    for txn in low_body["transactions"]:
        assert txn["fraud_probability"] >= 0.1


def test_invalid_threshold_returns_422(client):
    response = client.post("/api/v1/simulate/transactions", json={"threshold": 1.5})
    assert response.status_code == 422
