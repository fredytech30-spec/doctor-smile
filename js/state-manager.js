// ════════════════════════════════════════════════════════════════
//  DOCTOR SMILE — STATE MANAGER v1.0
//  Gestion d'état centralisée et réactive
//  ════════════════════════════════════════════════════════════════

class StateManager {
  constructor(initialState = {}) {
    // État global
    this.state = {
      // Utilisateur
      user: null,
      profile: null,
      
      // Authentification
      isAuthenticated: false,
      isLoading: false,
      
      // Abonnement
      subscription: null,
      plan: 'standard',
      isTrial: false,
      
      // Navigation
      currentView: 'dashboard',
      sidebarOpen: true,
      
      // Analyses
      analyses: [],
      currentAnalysis: null,
      
      // Notifications
      notifications: [],
      unreadCount: 0,
      
      // UI
      theme: 'dark',
      language: 'fr',
      
      // Admin
      isAdmin: false,
      adminData: null,
      
      // Fusionner avec l'état initial
      ...initialState
    };
    
    // Listeners pour les changements d'état
    this.listeners = new Map();
    
    // Middleware pour les actions
    this.middleware = [];
    
    // Historique pour undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
  }

  // ─────────────────────────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────────────────────────

  // Obtenir une valeur de l'état
  get(path) {
    if (!path) return this.state;
    
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  // Obtenir tout l'état
  getState() {
    return { ...this.state };
  }

  // ─────────────────────────────────────────────────────────────
  // SETTERS
  // ─────────────────────────────────────────────────────────────

  // Définir une valeur de l'état
  set(path, value) {
    const oldValue = this.get(path);
    
    // Créer une copie de l'état
    const newState = this._deepClone(this.state);
    
    // Mettre à jour la valeur
    this._setNestedValue(newState, path, value);
    
    // Appliquer le middleware
    const processedState = this._applyMiddleware(newState, { path, value, oldValue });
    
    // Sauvegarder dans l'historique
    this._saveToHistory(this.state);
    
    // Mettre à jour l'état
    this.state = processedState;
    
    // Notifier les listeners
    this._notify(path, value, oldValue);
    
    return this;
  }

  // Mettre à jour plusieurs valeurs à la fois
  setMultiple(updates) {
    const oldState = this._deepClone(this.state);
    const newState = this._deepClone(this.state);
    
    for (const [path, value] of Object.entries(updates)) {
      this._setNestedValue(newState, path, value);
    }
    
    // Appliquer le middleware
    const processedState = this._applyMiddleware(newState, { updates, oldState });
    
    // Sauvegarder dans l'historique
    this._saveToHistory(this.state);
    
    // Mettre à jour l'état
    this.state = processedState;
    
    // Notifier les listeners pour chaque path modifié
    for (const path of Object.keys(updates)) {
      this._notify(path, this.get(path), oldState);
    }
    
    return this;
  }

  // Fusionner un objet dans l'état
  merge(path, value) {
    const current = this.get(path) || {};
    const merged = this._deepMerge(current, value);
    return this.set(path, merged);
  }

  // ─────────────────────────────────────────────────────────────
  // LISTENERS
  // ─────────────────────────────────────────────────────────────

  // S'abonner aux changements
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path).add(callback);
    
    // Retourner une fonction de désabonnement
    return () => {
      this.listeners.get(path)?.delete(callback);
      if (this.listeners.get(path)?.size === 0) {
        this.listeners.delete(path);
      }
    };
  }

  // S'abonner à tous les changements
  subscribeAll(callback) {
    return this.subscribe('*', callback);
  }

  // Notifier les listeners
  _notify(path, newValue, oldValue) {
    // Notifier les listeners spécifiques au path
    if (this.listeners.has(path)) {
      this.listeners.get(path).forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error(`[StateManager] Error in listener for path "${path}":`, error);
        }
      });
    }
    
    // Notifier les listeners globaux
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error('[StateManager] Error in global listener:', error);
        }
      });
    }
    
    // Notifier les listeners des paths parents
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (this.listeners.has(parentPath)) {
        this.listeners.get(parentPath).forEach(callback => {
          try {
            callback(this.get(parentPath), oldValue, parentPath);
          } catch (error) {
            console.error(`[StateManager] Error in parent listener for path "${parentPath}":`, error);
          }
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────

  // Actions prédéfinies pour les opérations courantes
  actions = {
    // Authentification
    login: (user, profile) => {
      return this.setMultiple({
        'user': user,
        'profile': profile,
        'isAuthenticated': true,
        'isLoading': false
      });
    },
    
    logout: () => {
      return this.setMultiple({
        'user': null,
        'profile': null,
        'isAuthenticated': false,
        'subscription': null,
        'currentAnalysis': null
      });
    },
    
    // Navigation
    navigate: (view) => {
      return this.set('currentView', view);
    },
    
    toggleSidebar: () => {
      return this.set('sidebarOpen', !this.get('sidebarOpen'));
    },
    
    // Analyses
    setCurrentAnalysis: (analysis) => {
      return this.set('currentAnalysis', analysis);
    },
    
    addAnalysis: (analysis) => {
      const analyses = this.get('analyses') || [];
      return this.set('analyses', [analysis, ...analyses]);
    },
    
    updateAnalysis: (id, updates) => {
      const analyses = this.get('analyses') || [];
      const updated = analyses.map(a => 
        a.id === id ? { ...a, ...updates } : a
      );
      return this.set('analyses', updated);
    },
    
    removeAnalysis: (id) => {
      const analyses = this.get('analyses') || [];
      return this.set('analyses', analyses.filter(a => a.id !== id));
    },
    
    // Notifications
    addNotification: (notification) => {
      const notifications = this.get('notifications') || [];
      const unreadCount = this.get('unreadCount') || 0;
      return this.setMultiple({
        'notifications': [notification, ...notifications],
        'unreadCount': unreadCount + (notification.read ? 0 : 1)
      });
    },
    
    markNotificationAsRead: (id) => {
      const notifications = this.get('notifications') || [];
      const updated = notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = updated.filter(n => !n.read).length;
      return this.setMultiple({
        'notifications': updated,
        'unreadCount': unreadCount
      });
    },
    
    clearNotifications: () => {
      return this.setMultiple({
        'notifications': [],
        'unreadCount': 0
      });
    },
    
    // Abonnement
    setSubscription: (subscription) => {
      return this.setMultiple({
        'subscription': subscription,
        'plan': subscription?.plan || 'standard',
        'isTrial': subscription?.isTrial || false
      });
    },
    
    // UI
    setTheme: (theme) => {
      return this.set('theme', theme);
    },
    
    setLanguage: (language) => {
      return this.set('language', language);
    },
    
    setLoading: (isLoading) => {
      return this.set('isLoading', isLoading);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // MIDDLEWARE
  // ─────────────────────────────────────────────────────────────

  // Ajouter un middleware
  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  // Appliquer le middleware
  _applyMiddleware(state, action) {
    let processedState = state;
    
    for (const middleware of this.middleware) {
      try {
        const result = middleware(processedState, action);
        if (result) {
          processedState = result;
        }
      } catch (error) {
        console.error('[StateManager] Middleware error:', error);
      }
    }
    
    return processedState;
  }

  // ─────────────────────────────────────────────────────────────
  // HISTORY (UNDO/REDO)
  // ─────────────────────────────────────────────────────────────

  // Sauvegarder dans l'historique
  _saveToHistory(state) {
    // Supprimer l'historique futur si on n'est pas à la fin
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    // Ajouter le nouvel état
    this.history.push(this._deepClone(state));
    
    // Limiter la taille de l'historique
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  // Annuler la dernière action
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const previousState = this._deepClone(this.history[this.historyIndex]);
      this.state = previousState;
      this._notify('*', previousState, this.state);
      return true;
    }
    return false;
  }

  // Rétablir la dernière action annulée
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const nextState = this._deepClone(this.history[this.historyIndex]);
      this.state = nextState;
      this._notify('*', nextState, this.state);
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITAIRES
  // ─────────────────────────────────────────────────────────────

  // Définir une valeur imbriquée
  _setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  // Clone profond
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this._deepClone(item));
    
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = this._deepClone(obj[key]);
      }
    }
    
    return clonedObj;
  }

  // Fusion profonde
  _deepMerge(target, source) {
    const output = { ...target };
    
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  // Vérifier si c'est un objet
  _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  // Réinitialiser l'état
  reset() {
    const initialState = {
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      subscription: null,
      plan: 'standard',
      isTrial: false,
      currentView: 'dashboard',
      sidebarOpen: true,
      analyses: [],
      currentAnalysis: null,
      notifications: [],
      unreadCount: 0,
      theme: 'dark',
      language: 'fr',
      isAdmin: false,
      adminData: null
    };
    
    this.state = initialState;
    this.history = [];
    this.historyIndex = -1;
    
    this._notify('*', initialState, this.state);
    
    return this;
  }

  // Sérialiser l'état (pour localStorage)
  serialize() {
    return JSON.stringify(this.state);
  }

  // Désérialiser l'état
  deserialize(serialized) {
    try {
      const state = JSON.parse(serialized);
      this.state = state;
      this._notify('*', state, this.state);
      return true;
    } catch (error) {
      console.error('[StateManager] Deserialization error:', error);
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// INSTANCE GLOBALE
// ─────────────────────────────────────────────────────────────────

// Créer l'instance globale
const store = new StateManager();

// Middleware pour la persistance dans localStorage
const localStorageMiddleware = (state, action) => {
  // Sauvegarder dans localStorage sauf pour les actions de lecture
  if (action.path && !action.path.startsWith('isLoading')) {
    try {
      localStorage.setItem('ds_state', JSON.stringify(state));
    } catch (error) {
      console.error('[StateManager] localStorage error:', error);
    }
  }
  return state;
};

// Appliquer le middleware
store.use(localStorageMiddleware);

// Charger l'état depuis localStorage au démarrage
try {
  const savedState = localStorage.getItem('ds_state');
  if (savedState) {
    store.deserialize(savedState);
  }
} catch (error) {
  console.error('[StateManager] Failed to load state from localStorage:', error);
}

// Exporter l'instance
window.DS_STORE = store;

// Export pour les modules ES6
export default store;
export { StateManager };
