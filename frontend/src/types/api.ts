/**
 * Types mirror the FastAPI Pydantic schemas exactly:
 *   - api/schemas/transaction.py (TransactionIn)
 *   - api/schemas/prediction.py (PredictionOut, PaginatedTransactions,
 *     AnalyticsOut, HealthOut)
 * Field names/casing are copied verbatim from those models, not guessed.
 */

/** Body for POST /api/v1/predict. V1-V28 match the raw PCA columns exactly. */
export interface TransactionIn {
  transaction_id?: string | null;
  Time: number;
  Amount: number;
  V1: number;
  V2: number;
  V3: number;
  V4: number;
  V5: number;
  V6: number;
  V7: number;
  V8: number;
  V9: number;
  V10: number;
  V11: number;
  V12: number;
  V13: number;
  V14: number;
  V15: number;
  V16: number;
  V17: number;
  V18: number;
  V19: number;
  V20: number;
  V21: number;
  V22: number;
  V23: number;
  V24: number;
  V25: number;
  V26: number;
  V27: number;
  V28: number;
}

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type Decision = 'ALLOW' | 'REVIEW' | 'HOLD';

/** One feature's SHAP contribution. Mirrors
 * api/schemas/prediction.py:ShapFeatureContribution. `label` is
 * human-readable where the feature is known (amount_zscore, hour_of_day);
 * V1-V28 are labeled "Anonymized signal V14" etc. rather than given
 * invented meanings (see src/models/explain.py).
 */
export interface ShapFeatureContribution {
  feature: string;
  label: string;
  shap_value: number;
  feature_value: number;
}

/** Mirrors api/schemas/prediction.py:ShapExplanationOut. SHAP values are in
 * the base model's log-odds space, not calibrated-probability points --
 * only relative ranking/direction is meaningful for display.
 */
export interface ShapExplanationOut {
  top_positive_features: ShapFeatureContribution[];
  top_negative_features: ShapFeatureContribution[];
}

/** Response from POST /api/v1/predict, GET /transactions/{id}, and each
 * item in GET /transactions. Mirrors api/schemas/prediction.py:PredictionOut.
 */
export interface PredictionOut {
  transaction_id: string;
  amount: number;
  fraud_probability: number;
  risk_tier: RiskTier;
  decision: Decision;
  expected_loss: number;
  model_version: string;
  timestamp: string; // ISO 8601, as serialized by Pydantic's datetime
  shap_explanation: ShapExplanationOut;
}

/** Response from GET /api/v1/transactions. */
export interface PaginatedTransactions {
  items: PredictionOut[];
  total: number;
  limit: number;
  offset: number;
}

/** Response from GET /api/v1/analytics. */
export interface AnalyticsOut {
  total_transactions: number;
  count_by_risk_tier: Partial<Record<RiskTier, number>>;
  count_by_decision: Partial<Record<Decision, number>>;
  average_expected_loss: number;
  high_tier_fraud_rate: number | null;
  high_tier_fraud_rate_note: string;
}

/** Response from GET /api/v1/health. */
export interface HealthOut {
  status: string;
  model_loaded: boolean;
  db_reachable: boolean;
  model_version: string;
}

export type AlertSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

/** A single persisted alert event. Mirrors api/schemas/alerts.py:AlertEventOut. */
export interface AlertEventOut {
  alert_id: string;
  alert_type: string;
  severity: AlertSeverity;
  description: string;
  created_at: string;
}

/** Response from GET /api/v1/alerts. Mirrors api/schemas/alerts.py:AlertsStatusOut.
 * recent_alerts already carries persisted history -- no separate
 * ?history=true param exists or is needed (see FraudSpike.tsx).
 */
export interface AlertsStatusOut {
  is_spike_active: boolean;
  anomaly_score: number;
  current_fraud_rate: number;
  baseline_fraud_rate: number;
  severity: AlertSeverity;
  window_size: number;
  insufficient_data: boolean;
  first_detected_at: string | null;
  recent_alerts: AlertEventOut[];
}

/** Body for POST /api/v1/simulate. Mirrors api/schemas/simulate.py:SimulateRequest. */
export interface SimulateRequest {
  threshold: number;
  false_positive_cost?: number;
  false_negative_cost?: number;
}

/** Response from GET /api/v1/models. Mirrors
 * api/schemas/model_info.py:ModelInfoOut. Metrics are held-out TEST-set
 * performance (Day 5's audited numbers), NOT validation -- see
 * ModelPerformance.tsx.
 */
export interface ModelInfoOut {
  model_name: string;
  model_version: string;
  training_date: string;
  dataset_version: string;
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  pr_auc: number;
  roc_auc: number;
  false_positive_rate: number;
  false_negative_rate: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  test_set_size: number;
}

/** Response from GET /api/v1/models/return. Mirrors
 * api/schemas/return_model_info.py:ReturnModelInfoOut -- a SEPARATE model,
 * SEPARATE dataset (UCI Online Retail II, not the fraud model's ULB
 * dataset) -- never blend these two models' metrics together on screen.
 */
export interface ReturnModelInfoOut {
  model_name: string;
  model_version: string;
  training_date: string;
  dataset_version: string;
  dataset_honesty_note: string;
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  pr_auc: number;
  roc_auc: number;
  false_positive_rate: number;
  false_negative_rate: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  test_set_size: number;
}

/** Response from POST /api/v1/simulate. Mirrors
 * api/schemas/simulate.py:SimulateResponse. Computed against the
 * VALIDATION split's precomputed probabilities, not live traffic -- see
 * ThresholdSimulator.tsx.
 */
export interface SimulateResponse {
  threshold: number;
  false_positive_cost: number;
  false_negative_cost: number;
  precision: number;
  recall: number;
  false_positive_rate: number;
  fraud_caught_count: number;
  fraud_caught_percent: number;
  transactions_affected_count: number;
  transactions_affected_percent: number;
  expected_financial_loss: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  validation_set_size: number;
}

/** Body for POST /api/v1/simulate/transactions. Mirrors
 * api/schemas/simulate.py:SimulateTransactionsRequest.
 */
export interface SimulateTransactionsRequest {
  threshold: number;
  false_positive_cost?: number;
  false_negative_cost?: number;
  limit?: number;
}

/** One row in SimulateTransactionsResponse. Mirrors
 * api/schemas/simulate.py:SimulateTransactionItem. `transaction_id` is a
 * pointer into the frozen validation-set snapshot, NOT a real stored
 * transaction/prediction id -- never link this to TransactionDetail.tsx's
 * route, which reads real data.
 */
export interface SimulateTransactionItem {
  transaction_id: string;
  amount: number;
  fraud_probability: number;
  true_label: 'fraud' | 'legitimate';
  decision: 'REVIEW/HOLD';
}

/** Response from POST /api/v1/simulate/transactions. Mirrors
 * api/schemas/simulate.py:SimulateTransactionsResponse -- the Threshold
 * Simulator's drill-down list, same VALIDATION-set snapshot /simulate
 * uses, not live traffic. See ThresholdSimulator.tsx.
 */
export interface SimulateTransactionsResponse {
  threshold: number;
  total_affected: number;
  returned_count: number;
  limit: number;
  transactions: SimulateTransactionItem[];
}

/** One item in GET /api/v1/chargebacks. Mirrors
 * api/schemas/evidence.py:ChargebackListItemOut. Chargeback/refund data is
 * SEEDED/SIMULATED (src/evidence/seed_chargebacks.py) -- see
 * ChargebackCenter.tsx.
 */
export interface ChargebackListItemOut {
  chargeback_id: string;
  transaction_id: string;
  reason: string;
  amount: number;
  timestamp: string;
  status: string;
  fraud_probability_at_scoring: number | null;
  risk_tier_at_scoring: RiskTier | null;
  was_flagged_in_advance: boolean;
}

export interface ChargebackDetailOut {
  chargeback_id: string;
  transaction_id: string;
  reason: string;
  amount: number;
  timestamp: string;
  status: string;
}

export interface RefundOut {
  refund_id: string;
  transaction_id: string;
  amount: number;
  timestamp: string;
  reason: string;
}

export interface TimelineEventOut {
  event: string;
  timestamp: string | null;
  description: string;
}

export interface EvidenceSummaryOut {
  was_flagged_in_advance: boolean;
  risk_tier_at_scoring: RiskTier | null;
  decision_at_scoring: Decision | null;
  fraud_probability_at_scoring: number | null;
  narrative: string;
}

/** Output of src/evidence/summarize_evidence.py -- a plain-English
 * narrative built by pure string templating from facts already shown
 * elsewhere on the page. NOT generated by an LLM or any external call --
 * see that module's docstring. `available: false` is only expected on a
 * genuinely malformed evidence package; the rest of the page must render
 * correctly regardless.
 */
export interface AutoSummaryOut {
  text: string | null;
  available: boolean;
  error: string | null;
}

/** Response from GET /api/v1/chargebacks/{id}. Mirrors
 * api/schemas/evidence.py:EvidencePackageOut. `transaction` and
 * `risk_prediction` are the SAME underlying record in this system -- see
 * `data_model_note`, always shown on the page verbatim.
 */
export interface EvidencePackageOut {
  chargeback: ChargebackDetailOut;
  transaction: PredictionOut | null;
  risk_prediction: PredictionOut | null;
  customer: string;
  refund: RefundOut | null;
  timeline: TimelineEventOut[];
  summary: EvidenceSummaryOut;
  auto_summary: AutoSummaryOut;
  data_model_note: string;
}

export type DriftStatus = 'STABLE' | 'MODERATE_DRIFT' | 'SIGNIFICANT_DRIFT';

/** One monitored feature's PSI drift score. Mirrors
 * api/schemas/monitoring.py:FeatureDriftOut. `psi` has no fixed upper
 * bound -- 0 means identical distributions, growing as training vs. live
 * diverge. See src/monitoring/drift_detector.py for the full method and
 * its honesty notes on thresholds/sample size/bucketing. */
export interface FeatureDriftOut {
  feature: string;
  psi: number;
  status: DriftStatus;
  reference_sample_size: number;
  live_sample_size: number;
}

/** Response from GET /api/v1/monitoring/drift. Mirrors
 * api/schemas/monitoring.py:DriftReportOut. `insufficient_data: true`
 * means live_sample_size was below min_live_sample_size -- every `psi` is
 * 0 and `overall_status` is a placeholder "STABLE", not a real reading;
 * check this flag before trusting the numbers. */
export interface DriftReportOut {
  overall_status: DriftStatus;
  features: FeatureDriftOut[];
  live_sample_size: number;
  min_live_sample_size: number;
  insufficient_data: boolean;
}
