// ════════════════════════════════════════════════════════════════
//  stripe-payment.js — Doctor Smile
//  Gestion des paiements via NotchPay et Fapshi côté frontend
// ════════════════════════════════════════════════════════════════

const API_BASE = (() => {
  if (window.API_BASE && !window.API_BASE.includes('votre-api-render.onrender.com')) {
    return window.API_BASE;
  }
  if (window.location.origin && !window.location.origin.startsWith('file')) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
})();

function formatPrice(amount, currency = 'XAF') {
  if (!amount) return 'Gratuit';
  const formatted = new Intl.NumberFormat('fr-FR').format(amount);
  return `${formatted} ${currency.toUpperCase()}/mois`;
}

// ── Lancer le paiement ────────────────────────────────────────
export async function startCheckout(plan) {
  try {
    const { fetchWithAuth } = await import('./utils.js');

    showPaymentLoading(true, plan);

    // Récupérer l'opérateur sélectionné dans le modal
    const operator = (window.DS_PAYMENT?.selectedOperator || 'notchpay').trim().toLowerCase();
    const currency = 'XAF';

    const response = await fetchWithAuth(`${API_BASE}/payment/create-checkout`, {
      method: 'POST',
      body: JSON.stringify({
        plan,
        operator,
        currency,
        success_url: `${window.location.origin}/dashboard.html?payment=success&operator=${encodeURIComponent(operator)}`,
        cancel_url:  `${window.location.origin}/dashboard.html?payment=cancelled&operator=${encodeURIComponent(operator)}`,
      }),
    });

    if (!response.ok) {
      // essai de parser le message d'erreur renvoyé par l'API pour affichage
      let errMsg = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        if (errBody && errBody.detail) errMsg = errBody.detail;
        else if (errBody && errBody.message) errMsg = errBody.message;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();

    if (data?.session_id) {
      localStorage.setItem('ds_last_payment_ref', data.session_id);
      localStorage.setItem('ds_last_payment_plan', plan);
      localStorage.setItem('ds_last_payment_operator', operator);
    }

    // Rediriger vers NotchPay (checkout_url = authorization_url)
    const checkoutUrl = data?.checkout_url;
    if (typeof checkoutUrl !== 'string' || !checkoutUrl.trim()) {
      console.error('[Payment] checkout_url invalide/vide. Response:', data);

      showPaymentError('Paiement indisponible (URL de paiement manquante). Réessayez.');

      // Stop loader toujours
      showPaymentLoading(false);

      // Nettoyage UX: retirer tout overlay "Redirection…" laissé par erreur
      document.querySelectorAll('[data-payment-btn]').forEach((btn) => {
        if (btn.dataset && btn.dataset._origText) {
          btn.textContent = btn.dataset._origText;
          delete btn.dataset._origText;
        }
        btn.disabled = false;
      });

      return;
    }

    window.location.href = checkoutUrl;

  } catch (err) {
    console.error('[Payment] Erreur checkout:', err);
    showPaymentError(err && err.message ? err.message : 'Erreur lors de la création du paiement. Réessayez.');

    // Stop loader toujours
    showPaymentLoading(false);

    // Cleanup UX
    document.querySelectorAll('[data-payment-btn]').forEach((btn) => {
      if (btn.dataset && btn.dataset._origText) {
        btn.textContent = btn.dataset._origText;
        delete btn.dataset._origText;
      }
      btn.disabled = false;
    });
  }
}

// ── Vérifier le résultat après retour de paiement ───────────────
export async function checkPaymentResult() {
  const params      = new URLSearchParams(window.location.search);
  const status      = params.get('payment');
  const sessionId   = params.get('session_id');
  const paymentRef  = params.get('payment_ref') || sessionId || localStorage.getItem('ds_last_payment_ref');
  const paymentPlan = params.get('plan') || localStorage.getItem('ds_last_payment_plan');
  const paymentOperator = params.get('operator') || localStorage.getItem('ds_last_payment_operator') || 'notchpay';

  if (status === 'success') {
    showToastPayment('Paiement reçu — activation du plan…', 'info');

    if (paymentRef) {
      try {
        const { fetchWithAuth } = await import('./utils.js');
        const res = await fetchWithAuth(`${API_BASE}/payment/verify-payment`, {
          method: 'POST',
          body: JSON.stringify({
            reference: paymentRef,
            operator: paymentOperator,
            plan: paymentPlan,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const normalized = String(data.status || '').toLowerCase();
          if (['complete', 'completed', 'success', 'accepted'].includes(normalized)) {
            showToastPayment(`🎉 Plan ${data.plan || paymentPlan || ''} activé !`, 'ok');
            localStorage.removeItem('ds_last_payment_ref');
            localStorage.removeItem('ds_last_payment_plan');
            localStorage.removeItem('ds_last_payment_operator');
          } else {
            showToastPayment(`Paiement en cours de confirmation (${data.status || 'statut inconnu'})`, 'warn');
          }
        } else {
          let detail = `HTTP ${res.status}`;
          try {
            const err = await res.json();
            detail = err.detail || detail;
          } catch (_) {}
          showToastPayment(`Paiement OK mais activation en attente : ${detail}`, 'warn');
        }
      } catch (e) {
        console.error('[Payment] verify-payment:', e);
        showToastPayment('Paiement reçu — actualisez dans quelques instants.', 'warn');
      }
    } else {
      showToastPayment('🎉 Paiement réussi !', 'ok');
    }

    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(() => window.location.reload(), 2000);
  } else if (status === 'cancelled') {
    showToastPayment('Paiement annulé.', 'warn');
    localStorage.removeItem('ds_last_payment_ref');
    localStorage.removeItem('ds_last_payment_plan');
    localStorage.removeItem('ds_last_payment_operator');
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
    // Fallback plans statiques synchronisés avec la landing page
    return {
      standard: { 
        name: 'Standard', 
        price: 25000, 
        currency: 'XAF',
        features: ['Score Doctor Smile 0–100', 'Moteur RF + XGBoost', 'Rapport SHAP Top 5', 'Export PDF complet'] 
      },
      premium:  { 
        name: 'Premium',  
        price: 50000, 
        currency: 'XAF',
        features: ['Tout Standard inclus', 'Moteur RF + XGB + LGBM', 'Simulateur What-If', 'Chat LLM Expert', 'Recommandations GPT-4'] 
      },
      extra:    { 
        name: 'Extra',    
        price: 100000, 
        currency: 'XAF',
        features: ['Tout Premium inclus', 'Stacking 4 modèles + Meta', 'Chat LLM illimité', 'API REST accès pro', 'Support prioritaire 24/7'] 
      },
    };
  }
}

// ── Rendu du modal de paiement ────────────────────────────────
export async function showPaymentModal(currentPlan = 'standard') {
  const plans = await loadPlans();
  let selectedOperator = 'notchpay';
  window.DS_PAYMENT = window.DS_PAYMENT || {};
  window.DS_PAYMENT.selectedOperator = selectedOperator;

  const operatorCard = (operator, emoji, title, subtitle, checked = false) => `
    <button type="button" class="operator-choice ${checked ? 'operator-selected' : ''}" data-operator="${operator}"
      style="cursor:pointer;position:relative;border:2px solid var(--border);border-radius:16px;padding:18px;background:rgba(255,255,255,0.04);transition:all 0.25s var(--ease);
             display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;text-align:center;color:#fff;">
      <span style="font-size:26px;display:block;">${emoji}</span>
      <span style="font-size:14px;font-weight:800;">${title}</span>
      <span style="font-size:10px;color:var(--muted-2);line-height:1.4;">${subtitle}</span>
    </button>
  `;

  const content = `
    <div style="margin-bottom:32px;">
      <div style="font-size:10px; font-weight:800; color:var(--ice); text-transform:uppercase; letter-spacing:0.15em; margin-bottom:16px; opacity:0.8;">Méthode de paiement</div>
      <div id="payment-operator-row" style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:440px; margin:0 auto;">
        ${operatorCard('notchpay', '📱', 'NotchPay', 'Mobile Money + cartes en XAF', true)}
        ${operatorCard('fapshi', '💰', 'Fapshi', 'Alternative locale en XAF', false)}
      </div>
    </div>
    
    <style>
      .operator-choice {
        outline: none;
      }
      .operator-choice.operator-selected {
        border-color: var(--ice) !important;
        background: rgba(139,127,240,0.18) !important;
        box-shadow: 0 0 24px rgba(139,127,240,0.22) !important;
        transform: translateY(-2px);
      }
      .payment-plan-card {
        transition: all 0.3s var(--ease);
      }
      .payment-plan-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      }
    </style>

    <div style="text-align:center; margin-bottom:32px;">
      <h3 style="font-family:'Syne',sans-serif;font-size:26px;font-weight:900;color:#fff;margin-bottom:8px;letter-spacing:-0.02em;">
        Élevez votre <span>Intelligence</span>
      </h3>
      <p style="font-size:13px;color:var(--muted-2);">
        Priorite au paiement africain via NotchPay · Tous les plans incluent un essai gratuit de 14 jours
      </p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">
      ${Object.entries(plans).map(([key, plan]) => {
        const isCurrent = key === currentPlan;
        const isPopular = key === 'premium';
        const isExtra = key === 'extra';
        const accentCol = isExtra ? 'var(--gold)' : isPopular ? 'var(--ice)' : 'var(--muted-2)';
        
        return `
          <div class="card payment-plan-card" style="
            border:1px solid ${isCurrent ? 'var(--ice)' : isExtra ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.08)'};
            background:${isCurrent ? 'rgba(139,127,240,0.05)' : isExtra ? 'rgba(255,215,0,0.02)' : 'rgba(255,255,255,0.02)'};
            padding:32px 24px;position:relative;border-radius:20px;overflow:hidden;
          ">
            ${isPopular ? `<div style="position:absolute;top:12px;right:-30px;background:var(--ice);color:var(--bg);font-size:9px;font-weight:900;padding:4px 35px;transform:rotate(45deg);box-shadow:0 2px 10px rgba(0,0,0,0.2);">POPULAIRE</div>` : ''}
            ${isCurrent ? `<div style="position:absolute;top:12px;left:12px;background:rgba(139,127,240,0.2);color:var(--ice);font-size:8px;font-weight:800;padding:3px 10px;border-radius:100px;letter-spacing:0.05em;">PLAN ACTUEL</div>` : ''}

            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#fff;margin-bottom:8px;margin-top:${isCurrent ? '20px' : '0'};">
              ${plan.name}
            </div>
            <div style="font-size:32px;font-weight:900;color:${accentCol};margin-bottom:4px;letter-spacing:-0.03em;">
              ${formatPrice(plan.price, plan.currency)}
            </div>
            <div style="font-size:10px;color:var(--muted-2);margin-bottom:24px;">Facturé mensuellement</div>
            
            <ul style="list-style:none;padding:0;margin:0 0 32px;font-size:12px;color:rgba(255,255,255,0.7);display:flex;flex-direction:column;gap:12px;">
              ${(plan.features || []).map(f => `
                <li style="display:flex;align-items:flex-start;gap:10px;line-height:1.4;">
                  <span style="color:${accentCol};flex-shrink:0;margin-top:2px;"><i class="fa-solid fa-circle-check"></i></span>
                  <span>${f}</span>
                </li>`).join('')}
            </ul>

            ${isCurrent
              ? `<button disabled class="btn btn-ghost" style="width:100%;border-color:rgba(255,255,255,0.1);color:rgba(255,255,255,0.3);cursor:not-allowed;">
                  Plan actuel
                </button>`
              : `<button data-payment-btn data-plan="${key}" onclick="window.DS_PAYMENT?.startCheckout('${key}')" 
                  class="btn" style="width:100%;padding:14px;border-radius:12px;font-weight:800;font-family:'Syne',sans-serif;font-size:13px;
                  background:${isExtra ? 'var(--gold)' : isPopular ? 'var(--ice)' : 'rgba(255,255,255,0.05)'};
                  color:${(isExtra || isPopular) ? 'var(--bg)' : '#fff'};
                  border:${(isExtra || isPopular) ? 'none' : '1px solid var(--border)'};">
                  Activer ${plan.name} →
                </button>`
            }
          </div>`;
      }).join('')}
    </div>

    <div style="margin-top:32px;text-align:center;font-size:11px;color:var(--muted-2);display:flex;align-items:center;justify-content:center;gap:20px;opacity:0.6;">
      <span><i class="fa-solid fa-shield-halved" style="margin-right:6px;"></i>Paiement sécurisé</span>
      <span><i class="fa-solid fa-rotate-left" style="margin-right:6px;"></i>Annulable à tout moment</span>
      <span><i class="fa-solid fa-lock" style="margin-right:6px;"></i>SSL Chiffré</span>
    </div>
  `;

  // Utiliser Modal si disponible
  if (window.Modal) {
    window.Modal.open(content, { size: 'large' });
  } else {
    // Fallback si Modal n'est pas chargé
    const modal = document.createElement('div');
    modal.id    = 'payment-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      display:flex;align-items:center;justify-content:center;
      background:rgba(2,4,11,.85);backdrop-filter:blur(12px);
      animation:mIn .28s ease;
    `;

    modal.innerHTML = `
      <div style="
        background:rgba(10,14,26,.95);border:1px solid rgba(139,127,240,.12);
        border-radius:20px;padding:40px;max-width:720px;width:90%;
        box-shadow:0 40px 80px rgba(0,0,0,.6);
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
          <div>
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:900;color:#fff;">
              Choisir un plan
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px;">
              Sélectionnez d'abord votre méthode de paiement (NotchPay ou Fapshi), puis le plan
            </div>
          </div>
          <button onclick="document.getElementById('payment-modal').remove()"
            style="background:rgba(255,255,255,.06);border:none;border-radius:8px;
            padding:8px 12px;color:rgba(255,255,255,.5);cursor:pointer;font-size:16px;">✕</button>
        </div>

        <div style="margin-bottom:32px;">
          <div style="font-size:10px; font-weight:800; color:rgba(255,255,255,.6); text-transform:uppercase; letter-spacing:0.15em; margin-bottom:16px; text-align:center;">Méthode de paiement</div>
          <div id="payment-operator-row" style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:440px; margin:0 auto;">
            <button type="button" class="operator-choice operator-selected" data-operator="notchpay"
              style="cursor:pointer;position:relative;border:2px solid var(--border);border-radius:16px;padding:18px;background:rgba(255,255,255,0.04);transition:all 0.25s ease;
                     display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;text-align:center;color:#fff;">
              <span style="font-size:26px;display:block;">📱</span>
              <span style="font-size:14px;font-weight:800;">NotchPay</span>
              <span style="font-size:10px;color:rgba(255,255,255,.5);line-height:1.4;">Mobile Money + cartes en XAF</span>
            </button>
            <button type="button" class="operator-choice" data-operator="fapshi"
              style="cursor:pointer;position:relative;border:2px solid var(--border);border-radius:16px;padding:18px;background:rgba(255,255,255,0.04);transition:all 0.25s ease;
                     display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;text-align:center;color:#fff;">
              <span style="font-size:26px;display:block;">💰</span>
              <span style="font-size:14px;font-weight:800;">Fapshi</span>
              <span style="font-size:10px;color:rgba(255,255,255,.5);line-height:1.4;">Alternative locale en XAF</span>
            </button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
          ${Object.entries(plans).map(([key, plan]) => {
            const isCurrent = key === currentPlan;
            const isPopular = key === 'premium';
            return `
              <div style="
                border:1px solid ${isCurrent ? 'rgba(139,127,240,.4)' : isPopular ? 'rgba(255,215,0,.3)' : 'rgba(255,255,255,.08)'};
                border-radius:14px;padding:24px;position:relative;
                background:${isCurrent ? 'rgba(139,127,240,.05)' : isPopular ? 'rgba(255,215,0,.03)' : 'rgba(255,255,255,.02)'};
              ">
                ${isPopular ? `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);
                  background:#FFD700;color:#000;font-size:9px;font-weight:800;padding:3px 12px;
                  border-radius:100px;letter-spacing:.08em;">POPULAIRE</div>` : ''}
                ${isCurrent ? `<div style="position:absolute;top:-10px;right:16px;
                  background:rgba(139,127,240,.2);color:#8B7FF0;font-size:9px;font-weight:800;
                  padding:3px 12px;border-radius:100px;letter-spacing:.08em;">ACTUEL</div>` : ''}

                <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#fff;margin-bottom:8px;">
                  ${plan.name}
                </div>
                <div style="font-size:28px;font-weight:900;color:${isPopular ? '#FFD700' : '#8B7FF0'};margin-bottom:16px;">
                  ${formatPrice(plan.price, plan.currency)}
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
                  : `<button data-payment-btn data-plan="${key}" onclick="window.DS_PAYMENT?.startCheckout('${key}')"
                      style="width:100%;padding:10px;border-radius:8px;border:none;
                      background:${isPopular ? '#FFD700' : '#8B7FF0'};
                      color:${isPopular ? '#000' : '#fff'};
                      font-weight:800;font-size:11px;cursor:pointer;transition:all .2s;">
                      Activer ${plan.name}
                    </button>`
                }
              </div>`;
          }).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Ajouter les gestionnaires d'événements pour le choix d'opérateur
    setTimeout(() => {
      const operatorChoices = modal.querySelectorAll('.operator-choice');
      operatorChoices.forEach(choice => {
        choice.addEventListener('click', () => {
          selectedOperator = choice.dataset.operator || 'notchpay';
          window.DS_PAYMENT = window.DS_PAYMENT || {};
          window.DS_PAYMENT.selectedOperator = selectedOperator;
          modal.querySelectorAll('.operator-choice').forEach(item => {
            item.classList.toggle('operator-selected', item === choice);
          });
        });
      });
    }, 100);
  }

  // Après que le modal soit rendu (que ce soit via Modal ou fallback),
  // ajouter les gestionnaires d'événements pour le choix d'opérateur
  requestAnimationFrame(() => {
    const operatorChoices = document.querySelectorAll('.operator-choice');
    operatorChoices.forEach(choice => {
      if (!choice.hasEventListener) {
        choice.addEventListener('click', () => {
          selectedOperator = choice.dataset.operator || 'notchpay';
          window.DS_PAYMENT = window.DS_PAYMENT || {};
          window.DS_PAYMENT.selectedOperator = selectedOperator;
          document.querySelectorAll('.operator-choice').forEach(item => {
            item.classList.toggle('operator-selected', item === choice);
          });
        });
        choice.hasEventListener = true;
      }
    });
  });
}

// ── Helpers UI ────────────────────────────────────────────────
function showPaymentLoading(show, plan) {
  document.querySelectorAll('[data-payment-btn]').forEach((btn) => {
    btn.disabled = show;
    if (show && plan && btn.dataset.plan === plan) {
      btn.dataset._origText = btn.textContent;
      btn.textContent = 'Redirection…';
    } else if (!show && btn.dataset._origText) {
      btn.textContent = btn.dataset._origText;
      delete btn.dataset._origText;
    }
  });
}

function showPaymentError(msg) {
  showToastPayment(msg, 'err');
}

function showToastPayment(msg, type = 'ok') {
  const typeMap = {
    'ok':   'success',
    'warn': 'warning',
    'err':  'error'
  };
  const dsType = typeMap[type] || 'info';
  if (window.Toast) {
    window.Toast.show(msg, { type: dsType });
  } else if (window.showToast) {
    window.showToast(msg, type);
  } else {
    console.log(`[Toast Fallback] ${type}: ${msg}`);
  }
}

// ── Exposition globale ─────────────────────────────────────────
window.DS_PAYMENT = { startCheckout, showPaymentModal, checkPaymentResult };
