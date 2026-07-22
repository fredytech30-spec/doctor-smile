// ════════════════════════════════════════════════════════════════
//  DOCTOR SMILE — UI COMPONENTS LIBRARY v1.0
//  Composants unifiés : Toasts, Modals, Loaders
//  ════════════════════════════════════════════════════════════════

/* ─────────────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
   ───────────────────────────────────────────────────────────────── */

window.Toast = {
  // Configuration par défaut
  defaults: {
    duration: 3000,
    position: 'bottom-center',
    type: 'info',
    showClose: true,
    autoClose: true
  },

  // Palette de couleurs par type
  colors: {
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#F59E0B' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#3B82F6' },
    primary: { bg: 'rgba(125, 211, 252, 0.15)', border: 'rgba(125, 211, 252, 0.3)', text: '#8B7FF0' }
  },

  // Icônes par type
  icons: {
    success: 'fa-solid fa-check-circle',
    error: 'fa-solid fa-circle-xmark',
    warning: 'fa-solid fa-triangle-exclamation',
    info: 'fa-solid fa-circle-info',
    primary: 'fa-solid fa-bell'
  },

  // Container pour les toasts
  container: null,

  // Initialiser le container
  initContainer() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.id = 'ds-toast-container';
    this.container.className = 'toast-container';
    
    // Positionnement via classes CSS
    const positions = {
      'top-left': 'toast-container-top-left',
      'top-center': 'toast-container-top-center',
      'top-right': 'toast-container-top-right',
      'bottom-left': 'toast-container-bottom-left',
      'bottom-center': 'toast-container-bottom-center',
      'bottom-right': 'toast-container-bottom-right'
    };
    
    this.container.classList.add(positions[this.defaults.position] || positions['bottom-right']);
    document.body.appendChild(this.container);
  },

  // Afficher un toast
  show(message, options = {}) {
    this.initContainer();
    
    const config = { ...this.defaults, ...options };
    const colors = this.colors[config.type] || this.colors.info;
    const icon = this.icons[config.type] || this.icons.info;
    
    // Créer l'élément toast avec classes CSS
    const toast = document.createElement('div');
    toast.className = `toast ${config.type}`;
    
    toast.innerHTML = `
      <div class="toast-icon"><i class="${icon}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${message}</div>
      </div>
      ${config.showClose ? '<button class="toast-close" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>' : ''}
    `;
    
    // Bouton close
    if (config.showClose) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.dismiss(toast));
    }
    
    // Ajouter au container
    this.container.appendChild(toast);
    
    // Auto-close
    if (config.autoClose) {
      setTimeout(() => this.dismiss(toast), config.duration);
    }
    
    return toast;
  },

  // Supprimer un toast
  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.add('toast-dismissing');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  // Méthodes raccourcis
  success(message, options) { return this.show(message, { ...options, type: 'success' }); },
  error(message, options) { return this.show(message, { ...options, type: 'error' }); },
  warning(message, options) { return this.show(message, { ...options, type: 'warning' }); },
  info(message, options) { return this.show(message, { ...options, type: 'info' }); },
  primary(message, options) { return this.show(message, { ...options, type: 'primary' }); }
};

/* ─────────────────────────────────────────────────────────────────
   MODAL DIALOGS
   ───────────────────────────────────────────────────────────────── */

window.Modal = {
  // Configuration par défaut
  defaults: {
    closeOnOverlay: true,
    closeOnEscape: true,
    showClose: true,
    size: 'medium', // small, medium, large, full
    animation: 'scale'
  },

  // Modal actif
  activeModal: null,

  // Tailles
  sizes: {
    small: 'max-width: 400px;',
    medium: 'max-width: 520px;',
    large: 'max-width: 800px;',
    full: 'max-width: 95vw; width: 95vw;'
  },

  // Ouvrir un modal
  open(content, options = {}) {
    const config = { ...this.defaults, ...options };

    // Fermer le modal actif s'il y en a un
    if (this.activeModal) {
      this.close();
    }

    // Créer l'overlay avec classes CSS
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    // Créer le modal avec classes CSS
    const modal = document.createElement('div');
    modal.className = `modal-box modal-${config.size || 'medium'}`;
    modal.setAttribute('tabindex', '-1');

    // Contenu
    if (typeof content === 'string') {
      modal.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      modal.appendChild(content);
    }

    // Bouton close
    if (config.showClose) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      closeBtn.setAttribute('aria-label', 'Fermer');
      closeBtn.addEventListener('click', () => this.close());
      modal.appendChild(closeBtn);
    }

    // Assembler
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Stocker la référence
    this.activeModal = { overlay, modal, config };

    // Animation d'entrée
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    // Focus trap implementation
    this._setupFocusTrap(modal, overlay);

    // Focus sur le modal
    setTimeout(() => modal.focus(), 100);

    // Fermeture sur overlay
    if (config.closeOnOverlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
    }

    // Fermeture sur Escape
    if (config.closeOnEscape) {
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.close();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
      this.activeModal.escapeHandler = escapeHandler;
    }

    // Empêcher le scroll du body
    document.body.style.overflow = 'hidden';

    return { overlay, modal };
  },

  // Focus trap premium implementation
  _setupFocusTrap(modal, overlay) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const trapFocus = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modal.addEventListener('keydown', trapFocus);
    this.activeModal.trapFocusHandler = trapFocus;
  },

  // Fermer le modal actif
  close() {
    if (!this.activeModal) return;

    const { overlay, modal, escapeHandler, trapFocusHandler } = this.activeModal;

    // Nettoyer les event listeners
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
    }
    if (trapFocusHandler) {
      modal.removeEventListener('keydown', trapFocusHandler);
    }

    // Animation de sortie
    overlay.classList.remove('active');

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 320);

    // Rétablir le scroll
    document.body.style.overflow = '';

    this.activeModal = null;
  },

  // Méthodes raccourcis pour les modals courants
  confirm(title, message, options = {}) {
    const content = `
      <div class="modal-confirm-content">
        <h3 class="modal-confirm-title">${title}</h3>
        <p class="modal-confirm-message">${message}</p>
        <div class="modal-confirm-actions">
          <button class="btn btn-ghost modal-cancel">Annuler</button>
          <button class="btn btn-danger modal-confirm">Confirmer</button>
        </div>
      </div>
    `;

    const { modal } = this.open(content, { ...options, size: 'small' });

    return new Promise((resolve) => {
      modal.querySelector('.modal-cancel').addEventListener('click', () => {
        this.close();
        resolve(false);
      });

      modal.querySelector('.modal-confirm').addEventListener('click', () => {
        this.close();
        resolve(true);
      });
    });
  },

  alert(title, message, options = {}) {
    const content = `
      <div class="modal-alert-content">
        <h3 class="modal-alert-title">${title}</h3>
        <p class="modal-alert-message">${message}</p>
        <button class="btn btn-primary modal-ok">OK</button>
      </div>
    `;

    const { modal } = this.open(content, { ...options, size: 'small' });

    return new Promise((resolve) => {
      modal.querySelector('.modal-ok').addEventListener('click', () => {
        this.close();
        resolve();
      });
    });
  }
};

/* ─────────────────────────────────────────────────────────────────
   LOADERS
   ───────────────────────────────────────────────────────────────── */

window.Loader = {
  // Loader actif
  activeLoader: null,

  // Afficher un loader
  show(options = {}) {
    const config = {
      text: 'Chargement...',
      size: 'medium', // small, medium, large
      overlay: true,
      ...options
    };

    // Fermer le loader actif s'il y en a un
    if (this.activeLoader) {
      this.hide();
    }

    // Créer l'overlay avec classes CSS
    const overlay = document.createElement('div');
    overlay.className = `loader-overlay ${config.overlay ? 'loader-overlay-with-backdrop' : 'loader-overlay-transparent'}`;

    // Spinner avec classes CSS
    const spinner = document.createElement('div');
    spinner.className = `loader-spinner loader-${config.size || 'medium'}`;

    // Texte avec classes CSS
    const text = document.createElement('div');
    text.className = 'loader-text';
    text.textContent = config.text;

    // Assembler
    overlay.appendChild(spinner);
    if (config.text) {
      overlay.appendChild(text);
    }
    document.body.appendChild(overlay);

    // Stocker la référence
    this.activeLoader = overlay;

    // Animation d'entrée
    requestAnimationFrame(() => {
      overlay.classList.add('loader-active');
    });

    return overlay;
  },

  // Cacher le loader actif
  hide() {
    if (!this.activeLoader) return;

    const overlay = this.activeLoader;

    // Animation de sortie
    overlay.classList.remove('loader-active');

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 280);

    this.activeLoader = null;
  },

  // Loader avec promesse
  async withPromise(promise, options = {}) {
    this.show(options);
    try {
      const result = await promise;
      this.hide();
      return result;
    } catch (error) {
      this.hide();
      throw error;
    }
  }
};

/* ─────────────────────────────────────────────────────────────────
   EXPORT GLOBAL
   ───────────────────────────────────────────────────────────────── */

window.DS_UI = {
  Toast: window.Toast,
  Modal: window.Modal,
  Loader: window.Loader
};

// Les objets sont déjà exposés globalement via window.DS_UI
