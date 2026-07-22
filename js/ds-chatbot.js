// ════════════════════════════════════════════════════════════════
//  ds-chatbot.js — Doctor Smile v4.0
//  Chatbot financier focalisé sur diagnostic
//  Réponses concises et actionnables
//  Dépend de : ds-core.js
// ════════════════════════════════════════════════════════════════

const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';

// ── Chatbot State ───────────────────────────────────────────────────
window.CHATBOT = {
  messages: [],
  isTyping: false,
  isOpen: false
};

// ─── Ouvrir/Fermer chatbot ───────────────────────────────────────────
window.toggleChatbot = function() {
  const chatbot = document.getElementById('chatbot-container');
  if (!chatbot) return;
  
  window.CHATBOT.isOpen = !window.CHATBOT.isOpen;
  chatbot.classList.toggle('open', window.CHATBOT.isOpen);
};

// ─── Envoyer message ───────────────────────────────────────────────
window.sendChatbotMessage = async function(query) {
  if (!query || !query.trim()) return;
  
  // Ajouter message utilisateur
  addMessage('user', query);
  
  // Afficher indicateur de frappe
  window.CHATBOT.isTyping = true;
  showTypingIndicator();
  
  try {
    const response = await fetch(`${API_BASE}/chatbot/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      },
      body: JSON.stringify({
        userId: window.S.uid,
        query: query,
        analysisData: window.S.currentAnalyse || null
      })
    });
    
    if (!response.ok) throw new Error('Erreur chatbot');
    
    const result = await response.json();
    
    // Masquer indicateur de frappe
    window.CHATBOT.isTyping = false;
    hideTypingIndicator();
    
    // Ajouter réponse chatbot
    addMessage('bot', result.response);
    
  } catch (error) {
    console.error('[Chatbot] Erreur:', error);
    window.CHATBOT.isTyping = false;
    hideTypingIndicator();
    
    // Fallback réponse locale
    const fallbackResponse = generateFallbackResponse(query);
    addMessage('bot', fallbackResponse);
  }
};

// ─── Ajouter message ───────────────────────────────────────────────
function addMessage(sender, text) {
  const container = document.getElementById('chatbot-messages');
  if (!container) return;
  
  const message = {
    sender: sender,
    text: text,
    timestamp: new Date()
  };
  
  window.CHATBOT.messages.push(message);
  
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${sender}`;
  messageEl.innerHTML = `
    <div class="message-content">${text}</div>
    <div class="message-time">${formatTime(message.timestamp)}</div>
  `;
  
  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
}

// ─── Indicateur de frappe ───────────────────────────────────────────
function showTypingIndicator() {
  const container = document.getElementById('chatbot-messages');
  if (!container) return;
  
  const typingEl = document.createElement('div');
  typingEl.id = 'typing-indicator';
  typingEl.className = 'chat-message bot typing';
  typingEl.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  
  container.appendChild(typingEl);
  container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
  const typingEl = document.getElementById('typing-indicator');
  if (typingEl) typingEl.remove();
}

// ─── Réponse fallback locale ───────────────────────────────────────
function generateFallbackResponse(query) {
  const queryLower = query.toLowerCase();
  const ratios = window.S.currentAnalyse?.ratios || [];
  const score = window.S.currentAnalyse?.score || 0;
  
  // Recherche de ratio correspondant
  const currentRatio = ratios.find(r => 
    queryLower.includes(r.name.toLowerCase()) || 
    queryLower.includes(r.compte?.toLowerCase())
  );
  
  if (currentRatio) {
    if (currentRatio.status === 'red') {
      return `⚠️ ${currentRatio.name} critique (${currentRatio.value}${currentRatio.unit}). ${currentRatio.action || 'Prenez des mesures correctives.'}`;
    } else if (currentRatio.status === 'yellow') {
      return `⚡ ${currentRatio.name} fragile (${currentRatio.value}${currentRatio.unit}). Surveillez cet indicateur.`;
    } else {
      return `✅ ${currentRatio.name} sain (${currentRatio.value}${currentRatio.unit}). Continuez ainsi.`;
    }
  }
  
  // Réponses génériques
  if (queryLower.includes('score') || queryLower.includes('risque')) {
    if (score >= 70) return `⚠️ Score critique (${score}/100). Contactez un expert ONECCA immédiatement.`;
    if (score >= 50) return `⚡ Score fragile (${score}/100). Prenez des actions correctives rapides.`;
    if (score >= 30) return `✅ Score acceptable (${score}/100). Surveillez les indicateurs clés.`;
    return `✅ Score sain (${score}/100). Continuez ainsi.`;
  }
  
  if (queryLower.includes('liquidité') || queryLower.includes('trésorerie')) {
    return `Consultez l'onglet Trésorerie pour votre liquidité générale et immédiate.`;
  }
  
  if (queryLower.includes('dette') || queryLower.includes('endettement')) {
    return `Consultez l'onglet Solvabilité pour votre ratio d'endettement.`;
  }
  
  if (queryLower.includes('client') || queryLower.includes('créance')) {
    return `Consultez l'onglet Recouvrement pour vos délais clients.`;
  }
  
  if (queryLower.includes('fournisseur')) {
    return `Consultez l'onglet Fournisseurs pour vos délais de paiement.`;
  }
  
  return "Posez une question sur votre liquidité, endettement, rentabilité ou score de vulnérabilité.";
}

// ─── Formatage temps ───────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Suggestions rapides ───────────────────────────────────────────
window.showQuickSuggestions = function() {
  const container = document.getElementById('quick-suggestions');
  if (!container) return;
  
  const suggestions = [
    "Quel est mon score de risque ?",
    "Comment améliorer ma trésorerie ?",
    "Pourquoi mes clients paient-ils si lentement ?",
    "Mon endettement est-il trop élevé ?"
  ];
  
  container.innerHTML = suggestions.map(s => `
    <button class="suggestion-btn" onclick="sendChatbotMessage('${s}')">
      ${s}
    </button>
  `).join('');
};

// ─── Initialisation ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Initialiser suggestions
  showQuickSuggestions();
  
  // Focus input sur ouverture
  const chatbotToggle = document.getElementById('chatbot-toggle');
  if (chatbotToggle) {
    chatbotToggle.addEventListener('click', () => {
      setTimeout(() => {
        const input = document.getElementById('chatbot-input');
        if (input) input.focus();
      }, 300);
    });
  }
  
  // Soumission formulaire
  const form = document.getElementById('chatbot-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chatbot-input');
      if (input) {
        sendChatbotMessage(input.value);
        input.value = '';
      }
    });
  }
});
