/* ════════════════════════════════════════════════════════════════
   theme-toggle.js — Doctor Smile
   Logique centralisée de bascule Clair ↔ Sombre
   - Persistance en localStorage
   - Anti-flash (appelé aussi inline dans <head>)
   - Icône animée soleil ↔ lune
   - Dispatch d'un événement custom pour les composants abonnés
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const STORAGE_KEY = 'ds-theme';

  /**
   * Applique le thème sur le document et met à jour les icônes
   * @param {'light'|'dark'} theme
   * @param {boolean} [animate=false] — si true, ajoute une rotation à l'icône
   */
  function applyTheme(theme, animate) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Rétrocompatibilité : supprimer l'ancien attribut dashboard-mode
    document.documentElement.removeAttribute('data-dashboard-mode');

    // Mettre à jour toutes les icônes de toggle sur la page
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      var icon = btn.querySelector('i');
      if (!icon) return;

      if (animate) {
        icon.style.transition = 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease';
        icon.style.transform = 'rotate(180deg) scale(0.5)';
        icon.style.opacity = '0';

        setTimeout(function () {
          icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
          icon.style.transform = 'rotate(0deg) scale(1)';
          icon.style.opacity = '1';
        }, 200);
      } else {
        icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }

      // ARIA
      btn.setAttribute('aria-label',
        theme === 'dark' ? 'Basculer en mode clair' : 'Basculer en mode sombre'
      );
    });

    // Dispatch event pour les composants abonnés (graphiques, Three.js, etc.)
    window.dispatchEvent(new CustomEvent('ds-theme-change', {
      detail: { theme: theme }
    }));
  }

  /**
   * Bascule le thème
   */
  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  }

  /**
   * Initialisation — appelé au chargement du DOM
   * Le thème est déjà appliqué via le script inline <head>,
   * mais on met à jour les icônes ici.
   */
  function init() {
    var saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    applyTheme(saved, false);
  }

  // Exposer globalement
  window.toggleTheme = toggleTheme;
  window.applyTheme = applyTheme;

  // Initialiser quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
