/**
 * Session 2FA — aligné sur otp-verify.html / auth-ui.js / dashboard.html
 */

const KEYS = {
  PENDING_OTP: 'pending_otp',
  PENDING_EMAIL: 'pending_email',
  PENDING_UID: 'pending_uid',
  TWO_FA_VERIFIED: '2fa_verified',
  TWO_FA_UID: '2fa_uid',
  TWO_FA_EMAIL: '2fa_email',
  OTP_SENT_FOR: 'otp_sent_for',
  OTP_SENT_AT: 'otp_sent_at',
} as const;

function safeSession(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export function setPendingOtp(uid: string, email: string) {
  const s = safeSession();
  if (!s) return;
  s.setItem(KEYS.PENDING_OTP, '1');
  s.setItem(KEYS.PENDING_UID, uid);
  s.setItem(KEYS.PENDING_EMAIL, email);
  s.setItem(KEYS.TWO_FA_UID, uid);
  s.setItem(KEYS.TWO_FA_EMAIL, email);
}

export function setOtpSent(uid: string) {
  const s = safeSession();
  if (!s) return;
  s.setItem(KEYS.OTP_SENT_FOR, uid);
  s.setItem(KEYS.OTP_SENT_AT, Date.now().toString());
}

export function set2FAVerified(token: string, uid: string) {
  const s = safeSession();
  if (!s) return;
  s.setItem(KEYS.TWO_FA_VERIFIED, token);
  s.setItem(KEYS.TWO_FA_UID, uid);
  s.removeItem(KEYS.PENDING_OTP);
}

export function get2FAVerified(): string | null {
  return safeSession()?.getItem(KEYS.TWO_FA_VERIFIED) ?? null;
}

export function get2FAUid(): string | null {
  return safeSession()?.getItem(KEYS.TWO_FA_UID) ?? null;
}

export function get2FAEmail(): string | null {
  return safeSession()?.getItem(KEYS.TWO_FA_EMAIL) ??
    safeSession()?.getItem(KEYS.PENDING_EMAIL) ?? null;
}

export function is2FAVerified(): boolean {
  return !!get2FAVerified();
}

export function clearAuthSession() {
  const s = safeSession();
  if (!s) return;
  Object.values(KEYS).forEach((k) => s.removeItem(k));
}

export function shouldSendOtp(uid: string): boolean {
  const s = safeSession();
  if (!s) return true;
  const sentFor = s.getItem(KEYS.OTP_SENT_FOR);
  const sentAt = parseInt(s.getItem(KEYS.OTP_SENT_AT) || '0', 10);
  if (sentFor === uid && Date.now() - sentAt < 60_000) return false;
  return true;
}
