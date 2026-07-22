// ════════════════════════════════════════════════════════════════
//  ds-notifications.js — Doctor Smile v4.0
//  Gestion des notifications multi-canal (In-app, WhatsApp, SMS, Email)
//  Notifications proactives basées sur événements financiers
//  Dépend de : ds-core.js
// ════════════════════════════════════════════════════════════════

const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';

// ── Notifications State ────────────────────────────────────────────
window.NOTIFICATIONS = {
  history: [],
  unreadCount: 0,
  preferences: {
    whatsapp_enabled: true,
    sms_enabled: false,
    email_enabled: true,
    in_app_enabled: true,
    proactive_alerts: true,
    daily_digest: false,
    weekly_report: true
  }
};

// ─── Charger les préférences ───────────────────────────────────────
window.loadNotificationPreferences = async function() {
  try {
    const response = await fetch(`${API_BASE}/settings/notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      window.NOTIFICATIONS.preferences = data.preferences || window.NOTIFICATIONS.preferences;
      updatePreferencesUI();
    }
  } catch (error) {
    console.error('[Notifications] Erreur chargement préférences:', error);
  }
};

// ─── Mettre à jour les préférences ─────────────────────────────────
window.updateNotificationPreferences = async function(preferences) {
  try {
    const response = await fetch(`${API_BASE}/settings/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      },
      body: JSON.stringify({
        userId: window.S.uid,
        preferences: preferences
      })
    });
    
    if (response.ok) {
      window.NOTIFICATIONS.preferences = { ...window.NOTIFICATIONS.preferences, ...preferences };
      updatePreferencesUI();
      showPreferencesSuccess();
    }
  } catch (error) {
    console.error('[Notifications] Erreur mise à jour préférences:', error);
    showPreferencesError();
  }
};

// ─── Charger l'historique des notifications ─────────────────────────
window.loadNotificationHistory = async function() {
  try {
    const response = await fetch(`${API_BASE}/notifications/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      window.NOTIFICATIONS.history = data.notifications || [];
      window.NOTIFICATIONS.unreadCount = data.unread_count || 0;
      renderNotificationsList();
      updateUnreadBadge();
    }
  } catch (error) {
    console.error('[Notifications] Erreur chargement historique:', error);
  }
};

// ─── Marquer comme lu ─────────────────────────────────────────────
window.markNotificationAsRead = async function(notificationId) {
  try {
    await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      }
    });
    
    // Mise à jour locale
    const notification = window.NOTIFICATIONS.history.find(n => n.notification_id === notificationId);
    if (notification) {
      notification.read = true;
      window.NOTIFICATIONS.unreadCount = Math.max(0, window.NOTIFICATIONS.unreadCount - 1);
      updateUnreadBadge();
      renderNotificationsList();
    }
  } catch (error) {
    console.error('[Notifications] Erreur marquer comme lu:', error);
  }
};

// ─── Marquer tout comme lu ─────────────────────────────────────────
window.markAllAsRead = async function() {
  try {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      }
    });
    
    window.NOTIFICATIONS.history.forEach(n => n.read = true);
    window.NOTIFICATIONS.unreadCount = 0;
    updateUnreadBadge();
    renderNotificationsList();
  } catch (error) {
    console.error('[Notifications] Erreur marquer tout comme lu:', error);
  }
};

// ─── Rendu liste notifications ──────────────────────────────────────
function renderNotificationsList() {
  const container = document.getElementById('notifications-list');
  if (!container) return;
  
  if (window.NOTIFICATIONS.history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Aucune notification</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = window.NOTIFICATIONS.history.map(notification => `
    <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
         onclick="markNotificationAsRead('${notification.notification_id}')">
      <div class="notification-header">
        <span class="notification-channel ${notification.channel}">${getChannelIcon(notification.channel)}</span>
        <span class="notification-time">${formatNotificationTime(notification.sent_at)}</span>
      </div>
      <div class="notification-content">
        <p class="notification-message">${notification.message}</p>
        ${notification.metadata?.event_type ? `<span class="notification-event">${notification.metadata.event_type}</span>` : ''}
      </div>
      <div class="notification-priority ${notification.priority}">${notification.priority}</div>
    </div>
  `).join('');
}

// ─── Mise à jour badge non-lu ───────────────────────────────────────
function updateUnreadBadge() {
  const badge = document.getElementById('notification-badge');
  if (badge) {
    badge.textContent = window.NOTIFICATIONS.unreadCount;
    badge.style.display = window.NOTIFICATIONS.unreadCount > 0 ? 'block' : 'none';
  }
}

// ─── Mise à jour UI préférences ─────────────────────────────────────
function updatePreferencesUI() {
  const toggles = {
    'whatsapp-toggle': window.NOTIFICATIONS.preferences.whatsapp_enabled,
    'sms-toggle': window.NOTIFICATIONS.preferences.sms_enabled,
    'email-toggle': window.NOTIFICATIONS.preferences.email_enabled,
    'in-app-toggle': window.NOTIFICATIONS.preferences.in_app_enabled,
    'proactive-toggle': window.NOTIFICATIONS.preferences.proactive_alerts,
    'daily-digest-toggle': window.NOTIFICATIONS.preferences.daily_digest,
    'weekly-report-toggle': window.NOTIFICATIONS.preferences.weekly_report
  };
  
  Object.entries(toggles).forEach(([id, enabled]) => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.checked = enabled;
    }
  });
}

// ─── Helpers ───────────────────────────────────────────────────────
function getChannelIcon(channel) {
  const icons = {
    'whatsapp': '📱',
    'sms': '💬',
    'email': '📧',
    'in_app': '🔔'
  };
  return icons[channel] || '📢';
}

function formatNotificationTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return date.toLocaleDateString('fr-FR');
}

function showPreferencesSuccess() {
  alert('✅ Préférences mises à jour');
}

function showPreferencesError() {
  alert('❌ Erreur lors de la mise à jour des préférences');
}

// ─── Écouteurs d'événements ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Charger les préférences au démarrage
  loadNotificationPreferences();
  
  // Charger l'historique des notifications
  loadNotificationHistory();
  
  // Écouteurs de toggles
  const toggleIds = ['whatsapp-toggle', 'sms-toggle', 'email-toggle', 'in-app-toggle', 
                     'proactive-toggle', 'daily-digest-toggle', 'weekly-report-toggle'];
  
  toggleIds.forEach(id => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        const preferenceName = id.replace('-toggle', '_enabled');
        updateNotificationPreferences({
          [preferenceName]: e.target.checked
        });
      });
    }
  });
  
  // Bouton marquer tout comme lu
  const markAllBtn = document.getElementById('mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', markAllAsRead);
  }
});
