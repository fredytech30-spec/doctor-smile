const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';

export interface SendOTPResponse {
  status: string;
  message: string;
  email_sent?: boolean;
  expires_at?: string;
}

export interface VerifyOTPResponse {
  status: string;
  message: string;
  verification_token: string;
}

export async function send2FAOTP(
  uid: string,
  email: string,
  name: string,
  idToken?: string | null
): Promise<SendOTPResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  const res = await fetch(`${API_BASE}/auth/2fa/send`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ uid, email, name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }));
    throw new Error(err.detail || err.message || 'Échec envoi OTP');
  }

  return res.json();
}

export async function verify2FAOTP(
  uid: string,
  code: string,
  idToken?: string | null
): Promise<VerifyOTPResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ uid, code }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Code invalide' }));
    throw new Error(err.detail || err.message || 'Code OTP invalide');
  }

  return res.json();
}
