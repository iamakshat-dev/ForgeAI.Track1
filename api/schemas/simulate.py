"""Request/response schemas for POST /api/v1/simulate and its drill-down
companion, POST /api/v1/simulate/transactions."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from src.risk.cost_engine import DEFAULT_FALSE_NEGATIVE_COST, DEFAULT_FALSE_POSITIVE_COST


class SimulateRequest(BaseModel):
    threshold: float = Field(..., ge=0.0, le=1.0)
    # Defaults reuse Day 2's cost_engine.py constants verbatim -- these are
    # still placeholder unit-costs (5 and 100), not calibrated real
    # currency figures. See expected_financial_loss's note in
    # SimulateResponse below.
    false_positive_cost: float = Field(default=DEFAULT_FALSE_POSITIVE_COST, ge=0.0)
    false_negative_cost: float = Field(default=DEFAULT_FALSE_NEGATIVE_COST, ge=0.0)


class SimulateResponse(BaseModel):
    threshold: float
    false_positive_cost: float
    false_negative_cost: float

    precision: float
    recall: float
    false_positive_rate: float

    fraud_caught_count: int
    fraud_caught_percent: float
    transactions_affected_count: int
    transactions_affected_percent: float

    # NOTE: this is cost_engine.expected_cost() renamed for the page's
    # audience -- it's still (fp_count * false_positive_cost) + (fn_count *
    # false_negative_cost) in placeholder unit-costs, not a real, calibrated
    # dollar figure. Don't read it as "actual money at stake" without
    # substituting real cost estimates for false_positive_cost/
    # false_negative_cost.
    expected_financial_loss: float

    tp: int
    fp: int
    fn: int
    tn: int
    validation_set_size: int


class SimulateTransactionsRequest(SimulateRequest):
    # Explicit-click drill-down, not fired on every slider drag -- see
    # ThresholdSimulator.tsx. Capped at 200: this is a UI table meant for a
    # human to scan, not a bulk export, and the response body would
    # otherwise scale with however many rows a very low threshold flags
    # (up to the full ~57k-row validation set at threshold 0.0).
    limit: int = Field(default=50, ge=1, le=200)


class SimulateTransactionItem(BaseModel):
    # A deterministic pointer into the frozen validation-set snapshot
    # (see SimulationService.transaction_ids), NOT a real database primary
    # key -- this endpoint never touches api/services/db_models.py.
    transaction_id: str
    amount: float
    fraud_probability: float
    true_label: Literal["fraud", "legitimate"]
    # This simulator exposes a single binary threshold (unlike the real
    # three-tier ALLOW/REVIEW/HOLD decision engine used elsewhere in this
    # app -- see src/risk/decision_engine.py -- which needs a second,
    # medium threshold this page doesn't take as input). Every row
    # returned here is, by construction, on the flagged side of that one
    # threshold, so this is always "REVIEW/HOLD" -- matching the same
    # label the "Transactions affected" stat card already uses for this
    # bucket, not a new distinction.
    decision: Literal["REVIEW/HOLD"] = "REVIEW/HOLD"


class SimulateTransactionsResponse(BaseModel):
    threshold: float
    # Total transactions on the flagged side of the threshold (equal to
    # SimulateResponse.transactions_affected_count for the same threshold)
    # -- kept separate from `transactions` below, which is capped by
    # `limit`, so the UI can show "showing 50 of 3,214" instead of
    # implying the capped list is the whole picture.
    total_affected: int
    returned_count: int
    limit: int
    transactions: list[SimulateTransactionItem]
