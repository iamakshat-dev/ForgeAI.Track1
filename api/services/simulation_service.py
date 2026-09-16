"""Precomputes the VALIDATION split's true labels and calibrated
probabilities once at API startup, so POST /api/v1/simulate can
re-threshold them near-instantly on every slider drag -- no model
inference, no re-scoring, just numpy array comparisons over an
already-scored, fixed set (see src/risk/cost_engine.py, unchanged from
Day 2).

Deliberately the VALIDATION split, not test and not live traffic: this
page shows "what would happen at this threshold" using the same set Day
1/2's evaluation was built on, so it stays consistent with numbers
already reported, and keeps the test split untouched.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "models" / "fraud_model_v1.pkl"
FEATURES_PATH = PROJECT_ROOT / "data" / "processed" / "features.csv"


class SimulationService:
    def __init__(self) -> None:
        self.y_true: np.ndarray | None = None
        self.y_prob: np.ndarray | None = None
        self.amount: np.ndarray | None = None
        # The validation slice's own pandas index -- stable and unique
        # because `data` is reset_index(drop=True)'d to 0..N-1 in sorted-
        # by-Time order BEFORE slicing, and .iloc slicing preserves index
        # labels rather than renumbering them. Used as the drill-down's
        # transaction_id: a deterministic pointer into this frozen
        # snapshot, not a real database primary key -- see
        # api/routes/simulate.py's /simulate/transactions.
        self.transaction_ids: np.ndarray | None = None
        self._loaded = False

    def load(self) -> None:
        bundle = joblib.load(MODEL_PATH)
        model = bundle["model"]
        feature_columns = bundle["feature_columns"]
        split = bundle["split_indices"]

        # "Amount" is already one of feature_columns (see the model bundle),
        # so it isn't added again here -- doing so would duplicate it in
        # usecols.
        data = (
            pd.read_csv(FEATURES_PATH, usecols=[*feature_columns, "Class"])
            .sort_values("Time", kind="stable")
            .reset_index(drop=True)
        )
        validation = data.iloc[split["train_end"] : split["validation_end"]]

        self.y_true = validation["Class"].to_numpy()
        self.y_prob = model.predict_proba(validation[feature_columns])[:, 1]
        self.amount = validation["Amount"].to_numpy()
        self.transaction_ids = validation.index.to_numpy()
        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded


# Process-wide singleton, loaded once from api/main.py's startup hook.
simulation_service = SimulationService()
