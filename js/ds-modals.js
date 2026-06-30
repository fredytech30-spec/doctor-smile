// ════════════════════════════════════════════════════════════════
//  ds-modals.js — Doctor Smile Modals
//  Gestion des modales pour la landing page
// ════════════════════════════════════════════════════════════════

window.DS_MODALS = (function() {
  'use strict';

  let activeModal = null;

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'ds-modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(3, 6, 13, 0.85);
      backdrop-filter: blur(16px);
      opacity: 0;
      transition: opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
      padding: 20px;
    `;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function createModal(content, title) {
    const modal = document.createElement('div');
    modal.className = 'ds-modal';
    modal.style.cssText = `
      max-width: 560px; width: 100%;
      background: var(--surface, #0A1020);
      border: 1px solid rgba(125, 211, 252, 0.15);
      border-radius: 20px;
      padding: 40px 36px;
      box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(125, 211, 252, 0.05) inset;
      transform: translateY(30px) scale(0.96);
      transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease;
      opacity: 0;
      position: relative;
      max-height: 90vh;
      overflow-y: auto;
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeBtn.style.cssText = `
      position: absolute; top: 16px; right: 16px;
      width: 36px; height: 36px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.08);
                  background: rgba(255, 255, 255, 0.04);
      color: rgba(255, 255, 255, 0.5);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    closeBtn.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(255, 255, 255, 0.08)';
      this.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseleave', function() {
      this.style.background = 'rgba(255, 255, 255, 0.04)';
      this.style.color = 'rgba(255, 255, 255, 0.5)';
    });
    closeBtn.addEventListener('click', close);
    modal.appendChild(closeBtn);

    // Title
    if (title) {
      const titleEl = document.createElement('h2');
      titleEl.style.cssText = `
        font-family: 'Syne', sans-serif;
        font-size: 24px;
        font-weight: 800;
        color: #fff;
        margin-bottom: 12px;
        letter-spacing: -0.02em;
      `;
      titleEl.textContent = title;
      modal.appendChild(titleEl);
    }

    // Content
    const contentEl = document.createElement('div');
    contentEl.style.cssText = `
      color: rgba(255, 255, 255, 0.75);
      font-size: 14px;
      line-height: 1.7;
    `;
    if (typeof content === 'string') {
      contentEl.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      contentEl.appendChild(content);
    }
    modal.appendChild(contentEl);

    return modal;
  }

  function open(content, title) {
    close();
    const overlay = createOverlay();
    const modal = createModal(content, title);
    overlay.appendChild(modal);
    activeModal = { overlay, modal };

    // Animate in
    requestAnimationFrame(function() {
      overlay.style.pointerEvents = 'all';
      overlay.style.opacity = '1';
      modal.style.transform = 'translateY(0) scale(1)';
      modal.style.opacity = '1';
    });
  }

  function close() {
    if (activeModal) {
      const { overlay, modal } = activeModal;
      modal.style.transform = 'translateY(20px) scale(0.96)';
      modal.style.opacity = '0';
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        activeModal = null;
      }, 400);
    }
  }

  function openDemo() {
    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 12px;">🧪</div>
        <p style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px;">
          Essayez Doctor Smile gratuitement
        </p>
        <p style="font-size: 13px; color: rgba(255, 255, 255, 0.5);">
          14 jours d'essai · Aucune carte bancaire
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <a href="/auth.html?mode=signup&plan=standard" 
           style="display: flex; align-items: center; justify-content: center; gap: 10px;
                  padding: 14px; border-radius: 12px;
      background: var(--grad-perfect);
                  color: #03060D; font-weight: 800; text-decoration: none;
                  font-family: 'Syne', sans-serif; font-size: 14px;
                  transition: all 0.25s ease;">
          <i class="fa-solid fa-rocket"></i>
          Démarrer l'essai gratuit
        </a>
        <a href="/auth.html" 
           style="display: flex; align-items: center; justify-content: center; gap: 8px;
                  padding: 12px; border-radius: 12px;
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  color: rgba(255, 255, 255, 0.5); font-weight: 600; text-decoration: none;
                  font-size: 13px; transition: all 0.2s ease;">
          <i class="fa-solid fa-user"></i>
          J'ai déjà un compte
        </a>
      </div>
      <div style="margin-top: 20px; display: flex; gap: 16px; justify-content: center; font-size: 11px; color: rgba(255, 255, 255, 0.25);">
        <span><i class="fa-solid fa-shield-halved" style="margin-right: 4px;"></i>Sécurisé</span>
        <span><i class="fa-solid fa-rotate-left" style="margin-right: 4px;"></i>Annulable</span>
        <span><i class="fa-solid fa-clock" style="margin-right: 4px;"></i>14 jours</span>
      </div>
    `;
    open(content, 'Démo gratuite');
  }

  function openSignup() {
    window.location.href = '/auth.html?mode=signup';
  }

  return {
    open,
    close,
    openDemo,
    openSignup,
  };
})();

console.log('[Doctor Smile] Modals ready');
