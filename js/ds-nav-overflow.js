// ════════════════════════════════════════════════════════════════
//  ds-nav-overflow.js — Doctor Smile
//  ─────────────────────────────────────────────────────────────
//  Remplace les 8 items nav Phase 2 & 3 par un seul bouton ···
//  qui ouvre un panneau latéral élégant organisé en sections.
//
//  Intégration :
//    <script type="module" src="./js/ds-nav-overflow.js"></script>
//    (après phase3.js dans dashboard.html)
//
//  Fonctionnement :
//    • Cache les groupes Phase 2 (#p2-nav-group) et Phase 3 (#p3-nav-group)
//    • Injecte un bouton ··· dans la nav existante
//    • Ouvre un drawer latéral avec toutes les fonctionnalités
//      organisées en 3 catégories : Analyse, Intelligence, Intégration
// ════════════════════════════════════════════════════════════════

(function _initNavOverflow() {

  // ── CSS ────────────────────────────────────────────────────
  const st = document.createElement('style');
  st.textContent = `

/* Cacher les groupes Phase 2 & 3 de la nav (gérés par ce panneau) */
#p2-nav-group, #p3-nav-group { display:none !important; }

/* ══ Bouton ··· dans la nav ═══════════════════════════════════ */
#ds-more-btn {
  width:44px;height:44px;border-radius:11px;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;position:relative;color:rgba(255,255,255,.3);
  font-size:18px;transition:all .22s cubic-bezier(.34,1.56,.64,1);
  flex-shrink:0;letter-spacing:.12em;font-weight:900;
  font-family:'Syne',sans-serif;user-select:none;
}
#ds-more-btn:hover {
  color:#8B7FF0;background:rgba(139,127,240,.08);
}
#ds-more-btn.open {
  color:#FFD700;background:rgba(255,215,0,.1);
  box-shadow:0 0 16px rgba(255,215,0,.12);
}
#ds-more-btn.has-active {
  color:#FFD700 !important;
}
#ds-more-btn .nav-tip {
  position:absolute;left:calc(100% + 10px);background:#0E1628;
  border:1px solid rgba(139,127,240,.18);border-radius:6px;
  padding:5px 10px;font-family:'Syne',sans-serif;font-size:9px;
  font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  color:#fff;white-space:nowrap;pointer-events:none;opacity:0;
  transform:translateX(-4px);transition:all .18s ease;z-index:100;
}
#ds-more-btn:hover .nav-tip { opacity:1;transform:translateX(0); }

/* ══ Overlay ════════════════════════════════════════════════════ */
#ds-more-overlay {
  position:fixed;inset:0;z-index:8990;
  background:rgba(2,4,11,.5);
  opacity:0;pointer-events:none;
  transition:opacity .25s ease;
  backdrop-filter:blur(2px);
}
#ds-more-overlay.show { opacity:1;pointer-events:all; }

/* ══ Panneau principal ══════════════════════════════════════════ */
#ds-more-panel {
  position:fixed;left:64px;top:0;bottom:0;
  width:300px;z-index:9000;
  background:linear-gradient(180deg,rgba(8,12,22,.99),rgba(10,16,28,.99));
  border-right:1px solid rgba(139,127,240,.1);
  transform:translateX(-12px);opacity:0;pointer-events:none;
  transition:transform .3s cubic-bezier(.16,1,.3,1), opacity .25s ease;
  display:flex;flex-direction:column;overflow:hidden;
}
#ds-more-panel.show {
  transform:translateX(0);opacity:1;pointer-events:all;
}

/* En-tête panneau */
#ds-more-panel-head {
  padding:20px 20px 14px;
  border-bottom:1px solid rgba(255,255,255,.05);
  flex-shrink:0;
}
.ds-more-head-title {
  font-family:'Syne',sans-serif;font-size:13px;font-weight:900;
  color:#fff;letter-spacing:-.01em;margin-bottom:3px;
}
.ds-more-head-sub {
  font-size:9px;color:rgba(255,255,255,.3);letter-spacing:.04em;
}

/* Scroll zone */
#ds-more-panel-body {
  flex:1;overflow-y:auto;padding:12px 12px 20px;
  scrollbar-width:thin;
  scrollbar-color:rgba(139,127,240,.15) transparent;
}
#ds-more-panel-body::-webkit-scrollbar { width:3px; }
#ds-more-panel-body::-webkit-scrollbar-thumb {
  background:rgba(139,127,240,.15);border-radius:3px;
}

/* Sections */
.ds-more-section { margin-bottom:18px; }
.ds-more-section-label {
  font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
  letter-spacing:.18em;text-transform:uppercase;
  color:rgba(255,255,255,.2);padding:0 8px;margin-bottom:6px;
  display:flex;align-items:center;gap:8px;
}
.ds-more-section-label::after {
  content:'';flex:1;height:1px;
  background:rgba(255,255,255,.05);
}

/* Items du panneau */
.ds-more-item {
  display:flex;align-items:center;gap:12px;
  padding:10px 10px;border-radius:11px;cursor:pointer;
  transition:all .18s cubic-bezier(.16,1,.3,1);
  position:relative;margin-bottom:2px;
  border:1px solid transparent;
}
.ds-more-item:hover {
  background:rgba(139,127,240,.05);
  border-color:rgba(139,127,240,.08);
  transform:translateX(3px);
}
.ds-more-item.active {
  border-color:rgba(255,215,0,.2);
  background:rgba(255,215,0,.06);
}
.ds-more-item.active::before {
  content:'';position:absolute;left:0;top:25%;bottom:25%;
  width:3px;border-radius:0 3px 3px 0;
  background:#FFD700;box-shadow:0 0 8px rgba(255,215,0,.4);
}
.ds-more-icon {
  width:34px;height:34px;border-radius:9px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;transition:all .18s;
}
.ds-more-item:hover .ds-more-icon { transform:scale(1.08); }
.ds-more-item.active .ds-more-icon { transform:scale(1.05); }
.ds-more-info { flex:1;min-width:0; }
.ds-more-name {
  font-family:'Syne',sans-serif;font-size:10.5px;font-weight:800;
  color:rgba(255,255,255,.75);margin-bottom:2px;
  transition:color .15s;
}
.ds-more-item:hover .ds-more-name,
.ds-more-item.active .ds-more-name { color:#fff; }
.ds-more-desc {
  font-size:8.5px;color:rgba(255,255,255,.28);
  line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.ds-more-badge {
  font-family:'Syne',sans-serif;font-size:7px;font-weight:800;
  letter-spacing:.08em;padding:2px 7px;border-radius:100px;
  flex-shrink:0;
}
.ds-more-badge-new {
  background:rgba(45,212,191,.12);border:1px solid rgba(45,212,191,.25);
  color:#2DD4BF;
}
.ds-more-badge-ai {
  background:rgba(167,139,250,.12);border:1px solid rgba(167,139,250,.25);
  color:#A78BFA;
}
.ds-more-badge-pro {
  background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.22);
  color:#FFD700;
}

/* Pied du panneau */
#ds-more-panel-foot {
  padding:12px 16px;
  border-top:1px solid rgba(255,255,255,.05);
  flex-shrink:0;
}
.ds-more-foot-hint {
  font-size:8.5px;color:rgba(255,255,255,.18);
  text-align:center;line-height:1.6;
}

/* ══ Point actif sur le bouton ··· ══════════════════════════════ */
#ds-more-active-dot {
  position:absolute;top:7px;right:7px;
  width:6px;height:6px;border-radius:50%;
  background:#FFD700;box-shadow:0 0 6px rgba(255,215,0,.6);
  opacity:0;transition:opacity .2s;
}
#ds-more-btn.has-active #ds-more-active-dot { opacity:1; }

  `;
  document.head.appendChild(st);

  // ── Catalogue complet des fonctionnalités overflow ─────────
  const FEATURES = [
    // ── Analyse avancée ──────────────────────────────────────
    {
      section: '📊 Analyse avancée',
      items: [
        {
          view:  'forecast',
          icon:  'fa-money-bill-trend-up',
          name:  'Trésorerie IA',
          desc:  'Projection 12 mois · 3 scénarios',
          color: '#2DD4BF',
          bg:    'rgba(45,212,191,.1)',
          badge: { label:'NOUVEAU', cls:'ds-more-badge-new' },
        },
        {
          view:  'early',
          icon:  'fa-bell',
          name:  'Alertes Précoces',
          desc:  'Signaux faibles · Trajectoire score',
          color: '#F59E0B',
          bg:    'rgba(245,158,11,.1)',
        },
        {
          view:  'visualisations',
          icon:  'fa-chart-pie',
          name:  'Visuels 3D',
          desc:  'Radar · SHAP · Graphes interactifs',
          color: '#8B7FF0',
          bg:    'rgba(139,127,240,.1)',
        },
        {
          view:  'benchmark',
          icon:  'fa-chart-bar',
          name:  'Benchmark Sectoriel',
          desc:  'Comparez vos ratios vs le marché',
          color: '#A78BFA',
          bg:    'rgba(167,139,250,.1)',
        },
      ],
    },
    // ── Intelligence ─────────────────────────────────────────
    {
      section: '🤖 Intelligence IA',
      items: [
        {
          view:  'agent',
          icon:  'fa-robot',
          name:  'Agent IA Autonome',
          desc:  'Surveillance continue · Actions auto',
          color: '#A78BFA',
          bg:    'rgba(167,139,250,.12)',
          badge: { label:'IA', cls:'ds-more-badge-ai' },
        },
        {
          view:  'chat',
          icon:  'fa-comments',
          name:  'Chat IA',
          desc:  'Analyste IA · Doctor Smile',
          color: '#60A5FA',
          bg:    'rgba(96,165,250,.1)',
        },
      ],
    },
    // ── Intégrations & Exports ────────────────────────────────
    {
      section: '🔗 Intégrations & Pro',
      items: [
        {
          view:  'credit',
          icon:  'fa-landmark',
          name:  'Crédit Bankable',
          desc:  'Dossier banque BICEC/Afriland',
          color: '#F59E0B',
          bg:    'rgba(245,158,11,.1)',
          badge: { label:'PRO', cls:'ds-more-badge-pro' },
        },
        {
          view:  'peers',
          icon:  'fa-users',
          name:  'Réseau de Pairs',
          desc:  'Benchmark vivant anonymisé',
          color: '#34D399',
          bg:    'rgba(52,211,153,.1)',
          badge: { label:'NOUVEAU', cls:'ds-more-badge-new' },
        },
        {
          view:  'cosign',
          icon:  'fa-file-signature',
          name:  'Co-signature Expert',
          desc:  'Réseau partenaires · eIDAS',
          color: '#60A5FA',
          bg:    'rgba(96,165,250,.1)',
        },
        {
          view:  'whatsapp',
          icon:  'fa-brands fa-whatsapp',
          name:  'WhatsApp Business',
          desc:  'Alertes & analyses via WhatsApp',
          color: '#25D366',
          bg:    'rgba(37,211,102,.1)',
          badge: { label:'NOUVEAU', cls:'ds-more-badge-new' },
        },
        {
          view:  'cabinet',
          icon:  'fa-briefcase',
          name:  'Cabinet Comptable',
          desc:  'Workspace multi-entreprises',
          color: '#8B7FF0',
          bg:    'rgba(139,127,240,.1)',
          badge: { label:'PRO', cls:'ds-more-badge-pro' },
        },
        {
          view:  'rapports',
          icon:  'fa-chart-column',
          name:  'Rapports PDF',
          desc:  'Exportez vos analyses',
          color: '#8B7FF0',
          bg:    'rgba(139,127,240,.1)',
        },
      ],
    },
  ];

  // Toutes les vues gérées par ce panneau
  const OVERFLOW_VIEWS = FEATURES.flatMap(s => s.items.map(i => i.view));
  let _currentView = null;
  let _open = false;

  // ── Créer le bouton ··· ────────────────────────────────────
  function _createMoreBtn() {
    const btn = document.createElement('div');
    btn.id = 'ds-more-btn';
    btn.className = 'nav-item';
    btn.innerHTML = `
      <i class="fa-solid fa-ellipsis"></i>
      <span class="nav-label">Plus de fonctions</span>
      <div id="ds-more-active-dot"></div>
    `;
    btn.onclick = togglePanel;
    return btn;
  }

  // ── Créer le panneau ───────────────────────────────────────
  function _createPanel() {
    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'ds-more-overlay';
    overlay.onclick = closePanel;
    document.body.appendChild(overlay);

    // Panneau
    const panel = document.createElement('div');
    panel.id = 'ds-more-panel';

    // En-tête
    panel.innerHTML = `
      <div id="ds-more-panel-head">
        <div class="ds-more-head-title">
          Fonctionnalités
        </div>
        <div class="ds-more-head-sub">Phase 2 · Phase 3 · Toutes les fonctionnalités</div>
      </div>
      <div id="ds-more-panel-body">
        ${FEATURES.map(section => `
          <div class="ds-more-section">
            <div class="ds-more-section-label">${section.section}</div>
            ${section.items.map(item => `
              <div class="ds-more-item" data-view="${item.view}"
                onclick="window._dsMoreNavTo('${item.view}')">
                <div class="ds-more-icon"
                  style="background:${item.bg};color:${item.color};">
                  <i class="${item.icon.startsWith('fa-brands') ? item.icon : 'fa-solid ' + item.icon}"></i>
                </div>
                <div class="ds-more-info">
                  <div class="ds-more-name">${item.name}</div>
                  <div class="ds-more-desc">${item.desc}</div>
                </div>
                ${item.badge ? `
                  <span class="ds-more-badge ${item.badge.cls}">${item.badge.label}</span>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
      <div id="ds-more-panel-foot">
        <div class="ds-more-foot-hint">
          Appuyez sur <kbd style="background:rgba(255,255,255,.07);padding:1px 5px;border-radius:4px;font-size:8px;">Échap</kbd> pour fermer
        </div>
      </div>
    `;

    document.body.appendChild(panel);
  }

  // ── Navigation depuis le panneau ───────────────────────────
  window._dsMoreNavTo = function(view) {
    _currentView = view;

    // Mettre à jour l'état actif dans le panneau
    document.querySelectorAll('.ds-more-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    // Point actif sur le bouton ···
    const btn = document.getElementById('ds-more-btn');
    if (btn) btn.classList.add('has-active');

    // Naviguer vers la vue
    const navFns = [
      window.DS_VIEWS?.navTo,
      window.DS_PHASE3?.navTo,
      window.DS_PHASE2?.navTo,
    ];

    let navigated = false;
    for (const fn of navFns) {
      if (typeof fn === 'function') {
        try { fn(view); navigated = true; break; } catch {}
      }
    }

    if (!navigated) {
      // Fallback manuel
      document.querySelectorAll('.view-pane').forEach(p => {
        p.classList.toggle('active', p.id === `view-${view}`);
      });
      document.querySelectorAll('.nav-item, .p2-nav-item, .p3-nav-item').forEach(el => {
        el.classList.remove('active');
      });
    }

    closePanel();
  };

  // ── Toggle panneau ─────────────────────────────────────────
  function togglePanel() {
    if (_open) closePanel(); else openPanel();
  }

  function openPanel() {
    _open = true;
    document.getElementById('ds-more-panel')?.classList.add('show');
    document.getElementById('ds-more-overlay')?.classList.add('show');
    document.getElementById('ds-more-btn')?.classList.add('open');
  }

  function closePanel() {
    _open = false;
    document.getElementById('ds-more-panel')?.classList.remove('show');
    document.getElementById('ds-more-overlay')?.classList.remove('show');
    document.getElementById('ds-more-btn')?.classList.remove('open');
  }

  // Fermer avec Échap
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _open) closePanel();
  });

  // ── Masquer les groupes Phase 2 & 3 de la nav ─────────────
  function _hidePhaseGroups() {
    const p2 = document.getElementById('p2-nav-group');
    const p3 = document.getElementById('p3-nav-group');
    if (p2) p2.style.display = 'none';
    if (p3) p3.style.display = 'none';
    
    // Aussi masquer les items individuels s'ils ne sont pas groupés
    document.querySelectorAll('.p3-nav-item, .p2-nav-item').forEach(el => {
      el.style.display = 'none';
    });
  }

  // ── Détecter si une vue overflow est active (point jaune) ──
  function _watchActiveView() {
    const observer = new MutationObserver(() => {
      const activePane = document.querySelector('.view-pane.active');
      const activeView = activePane?.id?.replace('view-', '');
      const isOverflow = OVERFLOW_VIEWS.includes(activeView);
      const btn = document.getElementById('ds-more-btn');
      if (btn) btn.classList.toggle('has-active', isOverflow);

      // Sync l'item actif dans le panneau
      document.querySelectorAll('.ds-more-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === activeView);
      });
    });

    const main = document.getElementById('main');
    if (main) observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // ── Injection dans la nav ──────────────────────────────────
  function _inject() {
    const nav = document.querySelector('nav');
    if (!nav || document.getElementById('ds-more-btn')) return;

    // Cacher les groupes P2 & P3
    _hidePhaseGroups();

    // Créer et insérer le bouton ··· avant le nav-spacer
    const btn     = _createMoreBtn();
    const spacer  = nav.querySelector('.nav-spacer');

    if (spacer) nav.insertBefore(btn, spacer);
    else nav.appendChild(btn);

    // Créer le panneau
    _createPanel();

    // Observer les changements de vue active
    _watchActiveView();
  }

  // ── Init ───────────────────────────────────────────────────
  function _boot() {
    // Attendre que les groupes P2/P3 soient injectés
    let _tries = 0;
    const _w = setInterval(() => {
      _tries++;
      const p2ready = !!document.getElementById('p2-nav-group');
      const p3ready = !!document.getElementById('p3-nav-group');

      if (p2ready && p3ready) {
        clearInterval(_w);
        _inject();
      } else if (_tries > 30) {
        // Injecter quand même si P2/P3 pas trouvés (mode sans phases)
        clearInterval(_w);
        _inject();
      }
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  // API publique
  window.DS_NAV_MORE = { open: openPanel, close: closePanel, toggle: togglePanel };

  console.log('%c[ds-nav-overflow.js] ✓ Chargé — Bouton ··· injecté', 'color:#8B7FF0;font-weight:bold');

})();
