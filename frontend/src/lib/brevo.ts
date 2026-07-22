/**
 * brevo.ts — Proxy sécurisé vers le backend FastAPI
 *
 * SÉCURITÉ : La clé API Brevo n'est JAMAIS exposée côté client.
 * Tous les appels passent par le backend FastAPI qui détient la clé
 * dans les variables d'environnement serveur (non-NEXT_PUBLIC_).
 *
 * L'ancien client direct (NEXT_PUBLIC_BREVO_API_KEY) est supprimé.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';

interface BrevoOTPData {
  email: string;
  otp: string;
  expiryMinutes?: number;
}

async function _getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // Ajouter le token Firebase si disponible
  try {
    if (typeof window !== 'undefined') {
      const { auth } = await import('@/lib/firebase');
      if (auth?.currentUser) {
        const { getIdToken } = await import('firebase/auth');
        const token = await getIdToken(auth.currentUser);
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {
    // Silencieux — certains appels (ex: OTP pre-login) n'ont pas de token
  }
  return headers;
}

export class BrevoService {
  /**
   * Envoie un email OTP via le backend FastAPI (POST /auth/2fa/send).
   * Le backend utilise BREVO_API_KEY côté serveur — jamais exposé au navigateur.
   */
  async sendOTPEmail(data: BrevoOTPData): Promise<boolean> {
    try {
      const resp = await fetch(`${API_BASE}/email/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          otp: data.otp,
          expiry_minutes: data.expiryMinutes || 5,
        }),
      });
      return resp.ok;
    } catch (err) {
      console.error('[BrevoService] sendOTPEmail erreur:', err);
      return false;
    }
  }

  /**
   * Envoie un email de vérification via le backend FastAPI.
   */
  async sendVerificationEmail(email: string, verificationLink: string): Promise<boolean> {
    try {
      const headers = await _getAuthHeaders();
      const resp = await fetch(`${API_BASE}/email/verification`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, verification_link: verificationLink }),
      });
      return resp.ok;
    } catch (err) {
      console.error('[BrevoService] sendVerificationEmail erreur:', err);
      return false;
    }
  }

  /**
   * Envoie un email de reset de mot de passe via le backend FastAPI.
   */
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    try {
      const resp = await fetch(`${API_BASE}/reset-password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return resp.ok;
    } catch (err) {
      console.error('[BrevoService] sendPasswordResetEmail erreur:', err);
      return false;
    }
  }

  /**
   * Envoie un email générique — route via backend.
   */
  async sendEmail(data: { to: string; subject: string; htmlContent: string; textContent?: string }): Promise<boolean> {
    try {
      const headers = await _getAuthHeaders();
      const resp = await fetch(`${API_BASE}/email/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: data.to,
          subject: data.subject,
          html_content: data.htmlContent,
          text_content: data.textContent,
        }),
      });
      return resp.ok;
    } catch (err) {
      console.error('[BrevoService] sendEmail erreur:', err);
      return false;
    }
  }
}

export const brevoService = new BrevoService();
