import { auth } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import { get2FAVerified, get2FAUid } from '@/lib/auth-session';

const API_BASE = 'http://127.0.0.1:8000';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  const user = auth.currentUser;
  if (user) {
    try {
      const token = await getIdToken(user);
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      /* optional auth */
    }
  }

  const twoFa = get2FAVerified();
  const uid = get2FAUid();
  if (twoFa && uid) {
    headers['X-2FA-Verified'] = twoFa;
    headers['X-User-UID'] = uid;
  }

  return headers;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const body = options.body;
  const isFormData = body instanceof FormData;

  const headers: Record<string, string> = {
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  if (isFormData) {
    delete headers['Content-Type'];
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiClientError(
      (data as { detail?: string; message?: string }).detail ||
        (data as { message?: string }).message ||
        'Erreur API',
      res.status,
      data
    );
  }

  return data as T;
}

export interface ScoreSummary {
  id: string;
  entreprise: string;
  score: number;
  zone: string;
  confidence: number;
  confiance: string;
  plan: string;
  processingMs: number;
  createdAt: string;
  filename: string;
  secteur: string;
  pays: string;
}

export async function fetchScores(limit = 20) {
  return apiClient<{ userId: string; count: number; analyses: ScoreSummary[] }>(
    `/scores?limit=${limit}`
  );
}

export async function fetchScoreDetail(analyseId: string) {
  return apiClient<Record<string, unknown>>(`/scores/${analyseId}`);
}

export async function fetchMonitoringHealth() {
  return apiClient<{ status: string; components?: Record<string, string> }>(
    '/monitoring/health'
  );
}

// ─── Calendrier Fiscal DGI ────────────────────────────────────────────────────

export interface FiscalEvent {
  id: string;
  titre: string;
  date: string;
  type: 'tva' | 'dsf' | 'is' | 'patente' | string;
  gravite: 'critique' | 'haute' | 'moyenne' | string;
  penalite: string;
  description: string;
  action: string;
  jours_restants: number;
  statut: 'passee' | 'urgente' | 'proche' | 'a_venir';
}

export interface FiscalCalendarResponse {
  date_consultation: string;
  annee: number;
  total_echeances: number;
  echeances: FiscalEvent[];
}

export interface FiscalAlertsResponse {
  alertes_urgentes: FiscalEvent[];
  prochaines_echeances: FiscalEvent[];
  prochaine_echeance: FiscalEvent | null;
  nb_alertes: number;
}

export async function fetchFiscalCalendar(year?: number): Promise<FiscalCalendarResponse> {
  const q = year ? `?year=${year}` : '';
  return apiClient<FiscalCalendarResponse>(`/fiscal/calendar${q}`);
}

export async function fetchFiscalAlerts(): Promise<FiscalAlertsResponse> {
  return apiClient<FiscalAlertsResponse>('/fiscal/alerts');
}

// ─── Analyse Detail + Modules Prescrptifs ─────────────────────────────────────

export interface AnalysisDetail {
  id: string;
  entreprise?: string;
  score?: number;
  zone?: string;
  ivf_cemac?: number;
  cashFlow?: { monthly: Record<string, number>; burnRate?: number; runway?: number };
  actionPlans?: Array<{ priorite: string; action: string; impact: string; delai: string }>;
  ratios?: Record<string, { n: string; v: number; label?: string }>;
  radarDimensions?: Array<{ dimension: string; score: number; weight: number }>;
  recommendations?: string[];
  [key: string]: unknown;
}

export async function fetchAnalysisDetail(analyseId: string): Promise<AnalysisDetail> {
  return apiClient<AnalysisDetail>(`/scores/${analyseId}`);
}

// ─── Validate / Preview ─────────────────────────────────────────────────────

export async function fetchValidationResult(formData: FormData) {
  return apiClient<Record<string, unknown>>('/validate', {
    method: 'POST',
    body: formData,
  });
}
