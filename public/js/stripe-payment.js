// ════════════════════════════════════════════════════════════════
//  stripe-payment.js — Doctor Smile
//  Gestion des paiements Stripe côté frontend
// ════════════════════════════════════════════════════════════════

const API_BASE = 'http://127.0.0.1:8000';

// ── Lancer le paiement ────────────────────────────────────────
export async function startCheckout(plan) {
  try {
    const { fetchWithAuth } = await import('./utils.js');

    showPaymentLoading(true);

    const response = await fetchWithAuth(`${API_BASE}/payment/create-checkout`, {
      method: 'POST',
      body: JSON.stringify({
        plan,
        success_url: `${window.location.origin}/dashboard.html?payment=success`,
        cancel_url:  `${window.location.origin}/dashboard.html?payment=cancelled`,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // Rediriger vers Stripe Checkout
    window.location.href = data.checkout_url;

  } catch (err) {
    console.error('[Stripe] Erreur checkout:', err);
    showPaymentError('Erreur lors de la création du paiement. Réessayez.');
    showPaymentLoading(false);
  }
}

// ── Vérifier le résultat après retour Stripe ──────────────────
export function checkPaymentResult() {
  const params  = new URLSearchParams(window.location.search);
  const status  = params.get('payment');

  if (status === 'success') {
    showToastPayment('🎉 Paiement réussi ! Votre plan a été mis à jour.', 'ok');
    // Nettoyer l'URL
    window.history.replaceState({}, '', window.location.pathname);
    // Recharger après 2s pour rafraîchir le plan
    setTimeout(() => window.location.reload(), 2000);
  } else if (status === 'cancelled') {
    showToastPayment('Paiement annulé.', 'warn');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// ── Charger les plans depuis l'API ────────────────────────────
export async function loadPlans() {
  try {
    const res   = await fetch(`${API_BASE}/payment/plans`);
    const data  = await res.json();
    return data.plans;
  } catch {
    // Fallback plans statiques
    return {
      standard: { name: 'Standard', price: 0,     features: ['2 modèles ML', '5 analyses/mois'] },
      premium:  { name: 'Premium',  price: 7900,  features: ['3 modèles ML', 'Simulateur What-If', 'Rapports PDF'] },
      extra:    { name: 'Extra',    price: 15900, features: ['4 modèles stacking', 'API accès direct', 'Analyses illimitées'] },
    };
  }
}

// ── Rendu du modal de paiement ────────────────────────────────
export async function showPaymentModal(currentPlan = 'standard') {
  const plans = await loadPlans();

  const modal = document.createElement('div');
  modal.id    = 'payment-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    display:flex;align-items:center;justify-content:center;
    background:rgba(2,4,11,.85);backdrop-filter:blur(12px);
    animation:mIn .28s ease;
  `;

  const formatPrice = (cents) => cents === 0 ? 'Gratuit' : `${(cents/100).toFixed(0)}€/mois`;

  modal.innerHTML = `
    <div style="
      background:rgba(10,14,26,.95);border:1px solid rgba(125,211,252,.12);
      border-radius:20px;padding:40px;max-width:720px;width:90%;
      box-shadow:0 40px 80px rgba(0,0,0,.6);
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:900;color:#fff;">
            Choisir un plan
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px;">
            Tous les plans incluent un essai gratuit de 14 jours
          </div>
        </div>
        <button onclick="document.getElementById('payment-modal').remove()"
          style="background:rgba(255,255,255,.06);border:none;border-radius:8px;
          padding:8px 12px;color:rgba(255,255,255,.5);cursor:pointer;font-size:16px;">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
        ${Object.entries(plans).map(([key, plan]) => {
          const isCurrent = key === currentPlan;
          const isPopular = key === 'premium';
          return `
            <div style="
              border:1px solid ${isCurrent ? 'rgba(125,211,252,.4)' : isPopular ? 'rgba(255,215,0,.3)' : 'rgba(255,255,255,.08)'};
              border-radius:14px;padding:24px;position:relative;
              background:${isCurrent ? 'rgba(125,211,252,.05)' : isPopular ? 'rgba(255,215,0,.03)' : 'rgba(255,255,255,.02)'};
            ">
              ${isPopular ? `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);
                background:#FFD700;color:#000;font-size:9px;font-weight:800;padding:3px 12px;
                border-radius:100px;letter-spacing:.08em;">POPULAIRE</div>` : ''}
              ${isCurrent ? `<div style="position:absolute;top:-10px;right:16px;
                background:rgba(125,211,252,.2);color:#7DD3FC;font-size:9px;font-weight:800;
                padding:3px 12px;border-radius:100px;letter-spacing:.08em;">ACTUEL</div>` : ''}

              <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#fff;margin-bottom:8px;">
                ${plan.name}
              </div>
              <div style="font-size:28px;font-weight:900;color:${isPopular ? '#FFD700' : '#7DD3FC'};margin-bottom:16px;">
                ${formatPrice(plan.price)}
              </div>
              <ul style="list-style:none;padding:0;margin:0 0 20px;font-size:11px;color:rgba(255,255,255,.6);">
                ${(plan.features || []).map(f => `
                  <li style="padding:4px 0;display:flex;align-items:center;gap:8px;">
                    <span style="color:#10b981;">✓</span>${f}
                  </li>`).join('')}
              </ul>
              ${isCurrent
                ? `<button disabled style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.1);
                    background:transparent;color:rgba(255,255,255,.3);font-size:11px;cursor:not-allowed;">
                    Plan actuel
                  </button>`
                : key === 'standard'
                  ? `<button disabled style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.1);
                      background:transparent;color:rgba(255,255,255,.3);font-size:11px;cursor:not-allowed;">
                      Gratuit
                    </button>`
                  : `<button onclick="window.DS_PAYMENT?.startCheckout('${key}')"
                      style="width:100%;padding:10px;border-radius:8px;border:none;cursor:pointer;
                      font-family:'Syne',sans-serif;font-size:11px;font-weight:800;letter-spacing:.05em;
                      background:${isPopular ? '#FFD700' : 'rgba(125,211,252,.15)'};
                      color:${isPopular ? '#000' : '#7DD3FC'};">
                      Passer ${plan.name} →
                    </button>`
              }
            </div>`;
        }).join('')}
      </div>

      <div style="margin-top:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.25);">
        🔒 Paiement sécurisé par Stripe · Annulation à tout moment · Pas de frais cachés
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ── Helpers UI ────────────────────────────────────────────────
function showPaymentLoading(show) {
  const btn = document.querySelector('[data-payment-btn]');
  if (btn) btn.disabled = show;
}

function showPaymentError(msg) {
  showToastPayment(msg, 'err');
}

function showToastPayment(msg, type = 'ok') {
  const COLORS = {
    ok:   { bg:'rgba(16,185,129,.1)',  border:'rgba(16,185,129,.25)',  text:'#10b981' },
    warn: { bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.25)',  text:'#f59e0b' },
    err:  { bg:'rgba(239,68,68,.1)',   border:'rgba(239,68,68,.25)',   text:'#ef4444' },
  };
  const c = COLORS[type] ?? COLORS.ok;
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    z-index:10000;padding:10px 22px;border-radius:9px;
    background:${c.bg};border:1px solid ${c.border};color:${c.text};
    font-family:'Syne',sans-serif;font-size:11px;font-weight:700;
    backdrop-filter:blur(14px);white-space:nowrap;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ── Exposition globale ─────────────────────────────────────────
window.DS_PAYMENT = { startCheckout, showPaymentModal, checkPaymentResult };
