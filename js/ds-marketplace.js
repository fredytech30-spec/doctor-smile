// ════════════════════════════════════════════════════════════════
//  ds-marketplace.js — Doctor Smile v4.0
//  Marketplace Experts ONECCA - Smart Matching IA
//  Dépend de : ds-core.js
// ════════════════════════════════════════════════════════════════

const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';

// ── Marketplace State ───────────────────────────────────────────────
window.MARKETPLACE = {
  experts: [],
  matchedExperts: [],
  currentBooking: null,
  loading: false,
  error: null
};

// ─── Lister les experts disponibles ───────────────────────────────
window.listExperts = async function() {
  try {
    window.MARKETPLACE.loading = true;
    window.MARKETPLACE.error = null;
    
    const response = await fetch(`${API_BASE}/marketplace/experts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      }
    });
    
    if (!response.ok) throw new Error('Erreur lors de la récupération des experts');
    
    window.MARKETPLACE.experts = await response.json();
    window.MARKETPLACE.loading = false;
    
    renderExpertsList();
    
  } catch (error) {
    console.error('[Marketplace] Erreur listing experts:', error);
    window.MARKETPLACE.error = error.message;
    window.MARKETPLACE.loading = false;
  }
};

// ─── Smart Matching IA ─────────────────────────────────────────────
window.matchExpert = async function(analyseId, riskLevel, sector, companySize, budgetRange) {
  try {
    window.MARKETPLACE.loading = true;
    window.MARKETPLACE.error = null;
    
    const response = await fetch(`${API_BASE}/marketplace/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      },
      body: JSON.stringify({
        userId: window.S.uid,
        analyseId: analyseId,
        riskLevel: riskLevel,
        sector: sector,
        companySize: companySize,
        budgetRange: budgetRange
      })
    });
    
    if (!response.ok) throw new Error('Erreur lors du matching expert');
    
    const result = await response.json();
    window.MARKETPLACE.matchedExperts = result.matched_experts;
    window.MARKETPLACE.loading = false;
    
    renderMatchedExperts(result);
    
    // Déclenchement automatique si score critique
    if (riskLevel === 'CRITIQUE' && result.matched_experts.length > 0) {
      showCriticalMatchAlert(result);
    }
    
  } catch (error) {
    console.error('[Marketplace] Erreur matching expert:', error);
    window.MARKETPLACE.error = error.message;
    window.MARKETPLACE.loading = false;
  }
};

// ─── Contacter un expert ───────────────────────────────────────────
window.contactExpert = async function(expertId, message, analyseId) {
  try {
    const response = await fetch(`${API_BASE}/marketplace/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      },
      body: JSON.stringify({
        userId: window.S.uid,
        expertId: expertId,
        message: message,
        analyseId: analyseId
      })
    });
    
    if (!response.ok) throw new Error('Erreur lors de l\'envoi du message');
    
    const result = await response.json();
    showContactSuccess(result);
    
  } catch (error) {
    console.error('[Marketplace] Erreur contact expert:', error);
    showContactError(error.message);
  }
};

// ─── Réserver un expert ───────────────────────────────────────────
window.bookExpert = async function(expertId, date, durationHours, serviceType, budget) {
  try {
    window.MARKETPLACE.loading = true;
    
    const response = await fetch(`${API_BASE}/marketplace/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      },
      body: JSON.stringify({
        userId: window.S.uid,
        expertId: expertId,
        date: date,
        duration_hours: durationHours,
        service_type: serviceType,
        budget: budget
      })
    });
    
    if (!response.ok) throw new Error('Erreur lors de la réservation');
    
    const result = await response.json();
    window.MARKETPLACE.currentBooking = result;
    window.MARKETPLACE.loading = false;
    
    showBookingSuccess(result);
    
  } catch (error) {
    console.error('[Marketplace] Erreur réservation:', error);
    window.MARKETPLACE.error = error.message;
    window.MARKETPLACE.loading = false;
    showBookingError(error.message);
  }
};

// ─── Rendu liste experts ──────────────────────────────────────────
function renderExpertsList() {
  const container = document.getElementById('experts-list');
  if (!container) return;
  
  container.innerHTML = window.MARKETPLACE.experts.map(expert => `
    <div class="expert-card card">
      <div class="expert-header">
        <h3>${expert.name}</h3>
        <span class="expert-certification">${expert.certification}</span>
      </div>
      <div class="expert-rating">
        <span class="rating-stars">${'★'.repeat(Math.floor(expert.rating))}${'☆'.repeat(5 - Math.floor(expert.rating))}</span>
        <span class="rating-value">${expert.rating}/5</span>
      </div>
      <div class="expert-specializations">
        ${expert.specializations.map(spec => `<span class="spec-tag">${spec}</span>`).join('')}
      </div>
      <div class="expert-details">
        <p><strong>Expérience :</strong> ${expert.experience_years} ans</p>
        <p><strong>Tarif :</strong> ${expert.hourly_rate.toLocaleString()} FCFA/h</p>
        <p><strong>Localisation :</strong> ${expert.location}</p>
        <p><strong>Langues :</strong> ${expert.languages.join(', ')}</p>
      </div>
      <div class="expert-bio">${expert.bio}</div>
      <div class="expert-actions">
        <button class="btn btn-primary" onclick="showContactModal('${expert.id}')">Contacter</button>
        <button class="btn btn-secondary" onclick="showBookingModal('${expert.id}')">Réserver</button>
      </div>
    </div>
  `).join('');
}

// ─── Rendu experts matchés ─────────────────────────────────────────
function renderMatchedExperts(result) {
  const container = document.getElementById('matched-experts');
  if (!container) return;
  
  container.innerHTML = `
    <div class="match-summary">
      <h3>🎯 Smart Matching IA</h3>
      <p class="match-reasoning">${result.reasoning}</p>
      <p class="match-score">Score de matching : ${Math.round(result.match_score * 100)}%</p>
    </div>
    ${result.matched_experts.map(expert => `
      <div class="expert-card card matched">
        <div class="expert-header">
          <h3>${expert.name}</h3>
          <span class="match-badge">${Math.round(expert.match_score * 100)}% match</span>
        </div>
        <div class="expert-rating">
          <span class="rating-stars">${'★'.repeat(Math.floor(expert.rating))}${'☆'.repeat(5 - Math.floor(expert.rating))}</span>
          <span class="rating-value">${expert.rating}/5</span>
        </div>
        <div class="expert-specializations">
          ${expert.specializations.map(spec => `<span class="spec-tag">${spec}</span>`).join('')}
        </div>
        <div class="expert-actions">
          <button class="btn btn-primary" onclick="showContactModal('${expert.id}')">Contacter</button>
          <button class="btn btn-gold" onclick="showBookingModal('${expert.id}')">Réserver</button>
        </div>
      </div>
    `).join('')}
  `;
}

// ─── Alertes matching critique ─────────────────────────────────────
function showCriticalMatchAlert(result) {
  const container = document.getElementById('critical-match-alert');
  if (!container) return;
  
  container.innerHTML = `
    <div class="alert alert-critical">
      <h3>⚠️ Score Critique - Expert Recommandé</h3>
      <p>${result.reasoning}</p>
      <button class="btn btn-gold" onclick="showBookingModal('${result.matched_experts[0].id}')">
        Réserver ${result.matched_experts[0].name}
      </button>
    </div>
  `;
  container.style.display = 'block';
}

// ─── Modals ───────────────────────────────────────────────────────
window.showContactModal = function(expertId) {
  const modal = document.getElementById('contact-modal');
  if (!modal) return;
  
  modal.style.display = 'block';
  modal.dataset.expertId = expertId;
};

window.showBookingModal = function(expertId) {
  const modal = document.getElementById('booking-modal');
  if (!modal) return;
  
  modal.style.display = 'block';
  modal.dataset.expertId = expertId;
};

// ─── Success/Error handlers ────────────────────────────────────────
function showContactSuccess(result) {
  alert('✅ Message envoyé à l\'expert !');
}

function showContactError(error) {
  alert(`❌ Erreur : ${error}`);
}

function showBookingSuccess(result) {
  alert(`✅ Réservation créée ! Suivez le lien de paiement : ${result.payment_link}`);
}

function showBookingError(error) {
  alert(`❌ Erreur de réservation : ${error}`);
}

// ─── Initialisation ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Auto-load experts si sur page marketplace
  if (document.getElementById('experts-list')) {
    listExperts();
  }
  
  // Auto-match si score critique détecté
  if (window.S.currentAnalyse && window.S.currentAnalyse.score >= 70) {
    matchExpert(
      window.S.currentAnalyse.id,
      'CRITIQUE',
      window.S.currentAnalyse.secteur,
      null,
      null
    );
  }
});
