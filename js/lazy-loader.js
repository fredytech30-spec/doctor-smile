/* ═══════════════════════════════════════════════════════════════
   LAZY-LOADER.JS — Doctor Smile
   Système de lazy loading pour optimiser les performances
   Chargement différé des modules, images et composants
   ═══════════════════════════════════════════════════════════════ */

/**
 * LazyLoader — Gestionnaire de chargement différé
 * Permet de charger les modules et ressources uniquement quand nécessaire
 */
class LazyLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadedScripts = new Map();
    this.loadedStyles = new Map();
    this.observers = new Map();
  }

  /**
   * Charge un module JavaScript de manière asynchrone
   * @param {string} src - URL du module
   * @param {Object} options - Options de chargement
   * @returns {Promise<void>}
   */
  async loadModule(src, options = {}) {
    if (this.loadedModules.has(src)) {
      return this.loadedModules.get(src);
    }

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      
      if (options.defer) script.defer = true;
      if (options.async) script.async = true;
      
      script.onload = () => {
        this.loadedModules.set(src, promise);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load module: ${src}`));
      };
      
      document.head.appendChild(script);
    });

    this.loadedModules.set(src, promise);
    return promise;
  }

  /**
   * Charge un script JavaScript classique
   * @param {string} src - URL du script
   * @param {Object} options - Options de chargement
   * @returns {Promise<void>}
   */
  async loadScript(src, options = {}) {
    if (this.loadedScripts.has(src)) {
      return this.loadedScripts.get(src);
    }

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      
      if (options.defer) script.defer = true;
      if (options.async) script.async = true;
      if (options.crossorigin) script.crossOrigin = options.crossorigin;
      
      script.onload = () => {
        this.loadedScripts.set(src, promise);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.head.appendChild(script);
    });

    this.loadedScripts.set(src, promise);
    return promise;
  }

  /**
   * Charge une feuille de style CSS
   * @param {string} href - URL de la feuille de style
   * @param {Object} options - Options de chargement
   * @returns {Promise<void>}
   */
  async loadStyle(href, options = {}) {
    if (this.loadedStyles.has(href)) {
      return this.loadedStyles.get(href);
    }

    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      
      if (options.media) link.media = options.media;
      if (options.crossorigin) link.crossOrigin = options.crossorigin;
      
      link.onload = () => {
        this.loadedStyles.set(href, promise);
        resolve();
      };
      
      link.onerror = () => {
        reject(new Error(`Failed to load style: ${href}`));
      };
      
      document.head.appendChild(link);
    });

    this.loadedStyles.set(href, promise);
    return promise;
  }

  /**
   * Charge plusieurs ressources en parallèle
   * @param {Array} resources - Liste des ressources à charger
   * @returns {Promise<void>}
   */
  async loadResources(resources) {
    const promises = resources.map(resource => {
      if (resource.type === 'module') {
        return this.loadModule(resource.src, resource.options);
      } else if (resource.type === 'script') {
        return this.loadScript(resource.src, resource.options);
      } else if (resource.type === 'style') {
        return this.loadStyle(resource.href, resource.options);
      }
    });
    
    return Promise.all(promises);
  }

  /**
   * Intersection Observer pour le lazy loading d'éléments
   * @param {string} selector - Sélecteur CSS des éléments à observer
   * @param {Function} callback - Fonction appelée quand l'élément est visible
   * @param {Object} options - Options de l'observer
   */
  observeElements(selector, callback, options = {}) {
    if (this.observers.has(selector)) {
      return this.observers.get(selector);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: options.rootMargin || '50px',
      threshold: options.threshold || 0.1
    });

    document.querySelectorAll(selector).forEach(el => {
      observer.observe(el);
    });

    this.observers.set(selector, observer);
    return observer;
  }

  /**
   * Lazy loading d'images avec data-src
   * @param {string} selector - Sélecteur CSS des images
   */
  lazyLoadImages(selector = 'img[data-src]') {
    this.observeElements(selector, (img) => {
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
      }
    });
  }

  /**
   * Précharge une ressource
   * @param {string} url - URL de la ressource
   * @param {string} type - Type de ressource ('script', 'style', 'image', 'font')
   */
  preload(url, type = 'script') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    switch (type) {
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'image':
        link.as = 'image';
        break;
      case 'font':
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        break;
    }
    
    document.head.appendChild(link);
  }

  /**
   * Nettoie les observers et les ressources chargées
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Instance globale
const lazyLoader = new LazyLoader();

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LazyLoader;
}

// Exposition globale pour les scripts non-modulaires
window.LazyLoader = LazyLoader;
window.lazyLoader = lazyLoader;

/* ═══════════════════════════════════════════════════════════════
   CONFIGURATION DU LAZY LOADING — Doctor Smile
   Définition des modules et ressources à charger à la demande
   ═══════════════════════════════════════════════════════════════ */

/**
 * Configuration des modules du dashboard
 * Charge les modules uniquement quand la vue correspondante est active
 */
const DASHBOARD_MODULES = {
  // Modules principaux
  core: {
    src: './js/ds-core.js',
    type: 'module',
    priority: 'high',
    preload: true
  },
  upload: {
    src: './js/ds-upload.js',
    type: 'module',
    priority: 'high',
    preload: true
  },
  
  // Modules de vues (chargés à la demande)
  views: {
    src: './js/ds-views.js',
    type: 'module',
    priority: 'medium',
    preload: false
  },
  profile: {
    src: './js/ds-profile.js',
    type: 'module',
    priority: 'low',
    preload: false
  },
  chat: {
    src: './js/ds-chat.js',
    type: 'module',
    priority: 'low',
    preload: false
  },
  share: {
    src: './js/ds-share.js',
    type: 'module',
    priority: 'low',
    preload: false
  },
  export: {
    src: './js/ds-export.js',
    type: 'module',
    priority: 'low',
    preload: false
  },
  onboarding: {
    src: './js/ds-onboarding.js',
    type: 'module',
    priority: 'low',
    preload: false
  },
  
  // Modules admin (chargés uniquement pour les admins)
  admin: {
    src: './js/ds-admin.js',
    type: 'module',
    priority: 'low',
    preload: false,
    adminOnly: true
  }
};

/**
 * Configuration des styles CSS
 * Charge les styles critiques immédiatement, les autres à la demande
 */
const CSS_RESOURCES = {
  // Styles critiques (chargés immédiatement)
  critical: [
    { href: 'assets/css/variables.css', type: 'style' },
    { href: 'assets/css/components.css', type: 'style' }
  ],
  
  // Styles de pages (chargés à la demande)
  pages: {
    dashboard: { href: 'assets/css/dashboard.css', type: 'style' },
    auth: { href: 'assets/css/auth.css', type: 'style' },
    otp: { href: 'assets/css/otp-verify.css', type: 'style' }
  },
  
  // Styles premium (chargés à la demande)
  premium: {
    ui: { href: 'assets/css/ui-components.css', type: 'style' },
    animations: { href: 'assets/css/animations.css', type: 'style' },
    dashboard: { href: 'assets/css/dashboard-premium.css', type: 'style' },
    responsive: { href: 'assets/css/responsive.css', type: 'style' }
  }
};

/**
 * Fonction utilitaire pour charger les modules du dashboard
 * @param {string} moduleName - Nom du module à charger
 * @returns {Promise<void>}
 */
async function loadDashboardModule(moduleName) {
  const module = DASHBOARD_MODULES[moduleName];
  if (!module) {
    throw new Error(`Module not found: ${moduleName}`);
  }
  
  // Vérifier si le module est admin-only
  if (module.adminOnly && !window.S?.profile?.isAdmin) {
    console.warn(`Admin-only module ${moduleName} skipped - user is not admin`);
    return;
  }
  
  return lazyLoader.loadModule(module.src, { async: true });
}

/**
 * Fonction utilitaire pour charger les styles CSS
 * @param {string} styleName - Nom du style à charger
 * @returns {Promise<void>}
 */
async function loadCSS(styleName) {
  // Chercher dans pages
  if (CSS_RESOURCES.pages[styleName]) {
    return lazyLoader.loadStyle(CSS_RESOURCES.pages[styleName].href);
  }
  
  // Chercher dans premium
  if (CSS_RESOURCES.premium[styleName]) {
    return lazyLoader.loadStyle(CSS_RESOURCES.premium[styleName].href);
  }
  
  throw new Error(`CSS not found: ${styleName}`);
}

/**
 * Initialisation du lazy loading
 * Charge les ressources critiques et précharge les ressources prioritaires
 */
async function initLazyLoading() {
  // Charger les styles critiques
  await lazyLoader.loadResources(CSS_RESOURCES.critical);
  
  // Charger les modules principaux
  await loadDashboardModule('core');
  await loadDashboardModule('upload');
  
  // Précharger les modules de haute priorité
  Object.values(DASHBOARD_MODULES)
    .filter(mod => mod.priority === 'high' && mod.preload)
    .forEach(mod => lazyLoader.preload(mod.src, 'script'));
  
  // Initialiser le lazy loading des images
  lazyLoader.lazyLoadImages('img[data-src]');
  
  // Observer les sections pour le lazy loading des modules
  lazyLoader.observeElements('[data-lazy-module]', (el) => {
    const moduleName = el.dataset.lazyModule;
    loadDashboardModule(moduleName);
  });
}

/**
 * Chargement conditionnel des modules admin
 */
async function maybeLoadAdminModules() {
  if (window.S?.profile?.isAdmin) {
    try {
      await loadDashboardModule('admin');
    } catch (error) {
      console.warn('Failed to load admin modules:', error);
    }
  }
}

/**
 * Chargement des styles premium (optionnel)
 */
async function loadPremiumStyles() {
  try {
    await Promise.all([
      loadCSS('ui'),
      loadCSS('animations'),
      loadCSS('dashboard'),
      loadCSS('responsive')
    ]);
  } catch (error) {
    console.warn('Failed to load premium styles:', error);
  }
}

// Exposition des fonctions utilitaires
window.loadDashboardModule = loadDashboardModule;
window.loadCSS = loadCSS;
window.initLazyLoading = initLazyLoading;
window.maybeLoadAdminModules = maybeLoadAdminModules;
window.loadPremiumStyles = loadPremiumStyles;

// Auto-initialisation si le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLazyLoading);
} else {
  initLazyLoading();
}
