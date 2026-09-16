import type {
  AlertsStatusOut,
  AnalyticsOut,
  ChargebackListItemOut,
  DriftReportOut,
  EvidencePackageOut,
  HealthOut,
  ModelInfoOut,
  PaginatedTransactions,
  PredictionOut,
  ReturnModelInfoOut,
  SimulateRequest,
  SimulateResponse,
  SimulateTransactionsRequest,
  SimulateTransactionsResponse,
  TransactionIn,
} from '../types/api';

// Vite dev server runs on 5173; the backend on 8000 (see api/main.py's CORS
// config, which currently allow-lists localhost:5173 / 127.0.0.1:5173).
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000/api/v1';

/** FastAPI's default validation-error shape for 422 responses. */
interface ValidationErrorDetail {
  type: string;
  loc: (string | number)[];
  msg: string;
  input?: unknown;
}

/** HTTPException(detail=...) shape used by our 404/409/503 responses. */
type ApiErrorDetail = string | ValidationErrorDetail[];

export class ApiError extends Error {
  readonly status: number;
  readonly detail: ApiErrorDetail;

  constructor(status: number, detail: ApiErrorDetail) {
    super(formatDetail(detail));
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

function formatDetail(detail: ApiErrorDetail): string {
  if (typeof detail === 'string') return detail;
  return detail.map((d) => `${d.loc.join('.')}: ${d.msg}`).join('; ');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    // Network failure / backend unreachable (not an HTTP error status).
    throw new ApiError(0, 'Could not reach the API. Is the backend running?');
  }

  if (!response.ok) {
    let detail: ApiErrorDetail = response.statusText;
    try {
      const body = await response.json();
      if (body?.detail !== undefined) detail = body.detail;
    } catch {
      // Response had no JSON body; fall back to statusText above.
    }
    throw new ApiError(response.status, detail);
  }

  return (await response.json()) as T;
}

export function health(): Promise<HealthOut> {
  return request<HealthOut>('/health');
}

export function predict(transaction: TransactionIn): Promise<PredictionOut> {
  return request<PredictionOut>('/predict', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
}

export function getTransactions(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedTransactions> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return request<PaginatedTransactions>(`/transactions${queryString ? `?${queryString}` : ''}`);
}

export function getTransaction(transactionId: string): Promise<PredictionOut> {
  return request<PredictionOut>(`/transactions/${encodeURIComponent(transactionId)}`);
}

export function getAnalytics(): Promise<AnalyticsOut> {
  return request<AnalyticsOut>('/analytics');
}

export function getAlerts(): Promise<AlertsStatusOut> {
  return request<AlertsStatusOut>('/alerts');
}

export function simulate(body: SimulateRequest): Promise<SimulateResponse> {
  return request<SimulateResponse>('/simulate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Threshold Simulator's drill-down: only called when a user explicitly
 * expands the "Transactions affected" card, never on a slider drag -- see
 * ThresholdSimulator.tsx.
 */
export function simulateTransactions(body: SimulateTransactionsRequest): Promise<SimulateTransactionsResponse> {
  return request<SimulateTransactionsResponse>('/simulate/transactions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getModelInfo(): Promise<ModelInfoOut> {
  return request<ModelInfoOut>('/models');
}

export function getReturnModelInfo(): Promise<ReturnModelInfoOut> {
  return request<ReturnModelInfoOut>('/models/return');
}

export function getChargebacks(): Promise<ChargebackListItemOut[]> {
  return request<ChargebackListItemOut[]>('/chargebacks');
}

export function getChargebackEvidence(chargebackId: string): Promise<EvidencePackageOut> {
  return request<EvidencePackageOut>(`/chargebacks/${encodeURIComponent(chargebackId)}`);
}

export function getDriftReport(): Promise<DriftReportOut> {
  return request<DriftReportOut>('/monitoring/drift');
}
