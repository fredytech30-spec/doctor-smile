// ════════════════════════════════════════════════════════════════
//  ds-settings.js — Doctor Smile v4.0
//  Gestion des paramètres utilisateur (thème, langue, intégrations)
//  Dépend de : ds-core.js
// ════════════════════════════════════════════════════════════════

const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';

// ── Settings State ───────────────────────────────────────────────────
window.SETTINGS = {
  theme: 'dark',
  language: 'fr',
  display: {
    currency: 'FCFA',
    date_format: 'DD/MM/YYYY',
    number_format: 'fr_FR'
  },
  automation: {
    auto_reminders: true,
    auto_sync: false,
    auto_backup: true
  },
  integrations: {
    quickbooks: false,
    sage: false,
    cegid: false
  }
};

// ─── Charger les paramètres ─────────────────────────────────────────
window.loadSettings = async function() {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      window.SETTINGS = { ...window.SETTINGS, ...data.settings };
      applySettings();
      updateSettingsUI();
    }
  } catch (error) {
    console.error('[Settings] Erreur chargement paramètres:', error);
  }
};

// ─── Mettre à jour les paramètres ───────────────────────────────────
window.updateSettings = async function(settings) {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      },
      body: JSON.stringify({
        userId: window.S.uid,
        settings: settings
      })
    });
    
    if (response.ok) {
      window.SETTINGS = { ...window.SETTINGS, ...settings };
      applySettings();
      updateSettingsUI();
      showSettingsSuccess();
    }
  } catch (error) {
    console.error('[Settings] Erreur mise à jour paramètres:', error);
    showSettingsError();
  }
};

// ─── Réinitialiser les paramètres ───────────────────────────────────
window.resetSettings = async function() {
  if (!confirm('Voulez-vous vraiment réinitialiser tous les paramètres ?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/settings/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      },
      body: JSON.stringify({
        userId: window.S.uid
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      window.SETTINGS = data.settings;
      applySettings();
      updateSettingsUI();
      showSettingsSuccess('Paramètres réinitialisés');
    }
  } catch (error) {
    console.error('[Settings] Erreur réinitialisation:', error);
    showSettingsError();
  }
};

// ─── Appliquer les paramètres ───────────────────────────────────────
function applySettings() {
  // Thème
  document.documentElement.setAttribute('data-theme', window.SETTINGS.theme);
  localStorage.setItem('theme', window.SETTINGS.theme);
  
  // Langue
  document.documentElement.setAttribute('lang', window.SETTINGS.language);
  localStorage.setItem('language', window.SETTINGS.language);
  
  // Devise
  localStorage.setItem('currency', window.SETTINGS.display.currency);
  
  // Format date
  localStorage.setItem('date_format', window.SETTINGS.display.date_format);
}

// ─── Mise à jour UI paramètres ───────────────────────────────────────
function updateSettingsUI() {
  // Thème
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.value = window.SETTINGS.theme;
  }
  
  // Langue
  const langSelect = document.getElementById('language-select');
  if (langSelect) {
    langSelect.value = window.SETTINGS.language;
  }
  
  // Devise
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.value = window.SETTINGS.display.currency;
  }
  
  // Format date
  const dateFormatSelect = document.getElementById('date-format-select');
  if (dateFormatSelect) {
    dateFormatSelect.value = window.SETTINGS.display.date_format;
  }
  
  // Automatisation
  const autoRemindersToggle = document.getElementById('auto-reminders-toggle');
  if (autoRemindersToggle) {
    autoRemindersToggle.checked = window.SETTINGS.automation.auto_reminders;
  }
  
  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  if (autoSyncToggle) {
    autoSyncToggle.checked = window.SETTINGS.automation.auto_sync;
  }
  
  const autoBackupToggle = document.getElementById('auto-backup-toggle');
  if (autoBackupToggle) {
    autoBackupToggle.checked = window.SETTINGS.automation.auto_backup;
  }
  
  // Intégrations
  const quickbooksToggle = document.getElementById('quickbooks-toggle');
  if (quickbooksToggle) {
    quickbooksToggle.checked = window.SETTINGS.integrations.quickbooks;
  }
  
  const sageToggle = document.getElementById('sage-toggle');
  if (sageToggle) {
    sageToggle.checked = window.SETTINGS.integrations.sage;
  }
  
  const cegidToggle = document.getElementById('cegid-toggle');
  if (cegidToggle) {
    cegidToggle.checked = window.SETTINGS.integrations.cegid;
  }
}

// ─── Configurer une intégration ───────────────────────────────────
window.configureIntegration = async function(integration, config) {
  try {
    const response = await fetch(`${API_BASE}/settings/integrations/${integration}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
      },
      body: JSON.stringify({
        userId: window.S.uid,
        config: config
      })
    });
    
    if (response.ok) {
      window.SETTINGS.integrations[integration] = true;
      updateSettingsUI();
      showIntegrationSuccess(integration);
    }
  } catch (error) {
    console.error('[Settings] Erreur configuration intégration:', error);
    showIntegrationError(integration);
  }
};

// ─── Helpers ───────────────────────────────────────────────────────
function showSettingsSuccess(message = 'Paramètres mis à jour') {
  alert(`✅ ${message}`);
}

function showSettingsError() {
  alert('❌ Erreur lors de la mise à jour des paramètres');
}

function showIntegrationSuccess(integration) {
  alert(`✅ Intégration ${integration} configurée`);
}

function showIntegrationError(integration) {
  alert(`❌ Erreur lors de la configuration de ${integration}`);
}

// ─── Écouteurs d'événements ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Charger les paramètres au démarrage
  loadSettings();
  
  // Écouteurs de selects
  const selects = ['theme-select', 'language-select', 'currency-select', 'date-format-select'];
  selects.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.addEventListener('change', (e) => {
        const settingName = id.replace('-select', '');
        updateSettings({
          [settingName]: e.target.value
        });
      });
    }
  });
  
  // Écouteurs de toggles automatisation
  const autoToggles = ['auto-reminders-toggle', 'auto-sync-toggle', 'auto-backup-toggle'];
  autoToggles.forEach(id => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        const settingName = id.replace('-toggle', '');
        updateSettings({
          automation: {
            ...window.SETTINGS.automation,
            [settingName]: e.target.checked
          }
        });
      });
    }
  });
  
  // Écouteurs de toggles intégrations
  const integrationToggles = ['quickbooks-toggle', 'sage-toggle', 'cegid-toggle'];
  integrationToggles.forEach(id => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        const integration = id.replace('-toggle', '');
        if (e.target.checked) {
          // Ouvrir modal de configuration
          showIntegrationConfigModal(integration);
        } else {
          updateSettings({
            integrations: {
              ...window.SETTINGS.integrations,
              [integration]: false
            }
          });
        }
      });
    }
  });
  
  // Bouton réinitialiser
  const resetBtn = document.getElementById('reset-settings-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSettings);
  }
});

// ─── Modal configuration intégration ─────────────────────────────────
function showIntegrationConfigModal(integration) {
  const modal = document.getElementById('integration-config-modal');
  if (!modal) return;
  
  modal.style.display = 'block';
  modal.dataset.integration = integration;
}
