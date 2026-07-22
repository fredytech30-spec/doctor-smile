// ════════════════════════════════════════════════════════════════
//  ds-v4.js — Doctor Smile v4.0 Extensions
//  Extensions pour nouvelles fonctionnalités v4.0
//  Dépend de : ds-core.js
// ════════════════════════════════════════════════════════════════

// ── Extensions window.DS pour v4.0 ───────────────────────────────────
window.DS_V4 = {
  // Navigation vers nouvelles pages v4.0
  openMarketplace: () => {
    window.location.href = 'marketplace.html';
  },
  
  openChatbot: () => {
    window.location.href = 'chatbot.html';
  },
  
  openNotifications: () => {
    window.location.href = 'notifications.html';
  },
  
  openSettings: () => {
    window.location.href = 'settings.html';
  },
  
  // Smart Matching automatique
  triggerSmartMatch: () => {
    if (window.S.currentAnalyse && window.matchExpert) {
      const riskLevel = window.S.currentAnalyse.score >= 70 ? 'CRITIQUE' : 
                       window.S.currentAnalyse.score >= 50 ? 'ÉLEVÉ' : 
                       window.S.currentAnalyse.score >= 30 ? 'MOYEN' : 'FAIBLE';
      
      window.matchExpert(
        window.S.currentAnalyse.id,
        riskLevel,
        window.S.currentAnalyse.secteur,
        window.S.currentAnalyse.taille,
        null
      );
    } else {
      console.warn('[DS_V4] Pas d\'analyse courante pour Smart Match');
    }
  },
  
  // Notification proactive sur score critique
  checkCriticalScore: () => {
    if (window.S.currentAnalyse && window.S.currentAnalyse.score >= 70) {
      // Afficher alerte et proposer Smart Match
      const alertContainer = document.getElementById('critical-score-alert');
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-critical">
            <h3>⚠️ Score Critique Détecté</h3>
            <p>Votre score de vulnérabilité est critique (${window.S.currentAnalyse.score}/100).</p>
            <button class="btn btn-gold" onclick="window.DS_V4.triggerSmartMatch()">
              Trouver un Expert ONECCA
            </button>
          </div>
        `;
        alertContainer.style.display = 'block';
      }
    }
  },
  
  // Intégration chatbot flottant
  initChatbotWidget: () => {
    // Créer bouton chatbot flottant si non existant
    if (!document.getElementById('chatbot-widget')) {
      const widget = document.createElement('div');
      widget.id = 'chatbot-widget';
      widget.innerHTML = `
        <button onclick="window.DS_V4.openChatbot()" class="chatbot-fab">
          <i class="fa-solid fa-robot"></i>
        </button>
      `;
      document.body.appendChild(widget);
    }
  },
  
  // Badge notifications
  updateNotificationBadge: (count) => {
    const badge = document.getElementById('notification-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'block' : 'none';
    }
  }
};

// ── Extension window.DS existant ──────────────────────────────────────
if (window.DS) {
  window.DS.openMarketplace = window.DS_V4.openMarketplace;
  window.DS.openChatbot = window.DS_V4.openChatbot;
  window.DS.openNotifications = window.DS_V4.openNotifications;
  window.DS.openSettings = window.DS_V4.openSettings;
  window.DS.triggerSmartMatch = window.DS_V4.triggerSmartMatch;
}

// ── Initialisation automatique ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier score critique
  setTimeout(() => {
    window.DS_V4.checkCriticalScore();
  }, 2000);
  
  // Initialiser chatbot widget
  window.DS_V4.initChatbotWidget();
  
  console.log('[DS_V4] Extensions v4.0 chargées');
});
