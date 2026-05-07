// ════════════════════════════════════════════════════════════════
//  ds-export.js — Doctor Smile
//  Moteur d'export multi-format : PDF · CSV · XLSX · JSON · API
//  Dépend de : ds-core.js, SheetJS (window.XLSX)
//  Chargé après dashboard.js
// ════════════════════════════════════════════════════════════════

window.DS_EXPORT = {

  // ── Ouvrir le modal d'export ─────────────────────────────────
  openModal(analyse) {
    const a = analyse || S.currentAnalyse;
    if (!a) { showToast('Aucune analyse chargée', 'warn'); return; }
    this._current = a;

    let modal = document.getElementById('export-modal');
    if (!modal) { modal = this._buildModal(); document.body.appendChild(modal); }

    // Mise à jour du nom entreprise
    const nameEl = modal.querySelector('#exp-company-name');
    if (nameEl) nameEl.textContent = a.entreprise || 'Analyse';

    // Générer le token API
    this._apiToken = this._genToken(a.id);
    const apiEl = modal.querySelector('#exp-api-token');
    if (apiEl) apiEl.textContent = this._apiToken;

    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
  },

  closeModal() {
    const m = document.getElementById('export-modal');
    if (!m) return;
    m.classList.remove('show');
    setTimeout(() => { m.style.display = 'none'; }, 280);
  },

  // ── Construction du modal ────────────────────────────────────
  _buildModal() {
    const m = document.createElement('div');
    m.id = 'export-modal';
    m.style.cssText = `
      display:none;position:fixed;inset:0;z-index:9000;
      align-items:center;justify-content:center;
      background:rgba(0,0,0,.72);backdrop-filter:blur(14px);
      opacity:0;transition:opacity .28s;`;
    m.classList.add('_export-overlay');
    m.addEventListener('click', e => { if (e.target === m) this.closeModal(); });

    m.innerHTML = `
    <div style="
      background:linear-gradient(160deg,rgba(10,14,26,.98),rgba(15,25,41,.98));
      border:1px solid rgba(125,211,252,.14);border-radius:20px;
      padding:32px;width:min(600px,94vw);max-height:90vh;overflow-y:auto;
      box-shadow:0 32px 80px rgba(0,0,0,.7);position:relative;">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:900;color:#fff;margin-bottom:4px;">
            <i class="fa-solid fa-arrow-up-from-bracket" style="color:#7DD3FC;margin-right:10px;"></i>Exporter l'analyse
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,.35);">
            <span id="exp-company-name" style="color:var(--ice);font-weight:700;"></span>
            · Choisissez un ou plusieurs formats
          </div>
        </div>
        <button onclick="DS_EXPORT.closeModal()"
          style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
          border-radius:8px;width:32px;height:32px;color:rgba(255,255,255,.5);
          cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Grille formats -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">

        <!-- PDF -->
        <div class="_exp-card" data-fmt="pdf" onclick="DS_EXPORT._selectFmt(this)"
          style="padding:18px;border-radius:14px;border:2px solid rgba(239,68,68,.2);
          background:rgba(239,68,68,.05);cursor:pointer;transition:all .2s;position:relative;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(239,68,68,.15);
              color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:16px;">
              <i class="fa-solid fa-file-pdf"></i></div>
            <div>
              <div style="font-family:'Syne',sans-serif;font-size:12px;font-weight:900;color:#fff;">PDF Rapport</div>
              <div style="font-size:9px;color:rgba(255,255,255,.35);">Branded · Imprimable</div>
            </div>
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,.45);line-height:1.65;">
            Rapport complet : score, ratios, SHAP, recommandations IA, graphiques. Idéal pour votre banquier.
          </div>
          <div class="_exp-check" style="position:absolute;top:12px;right:12px;width:18px;height:18px;
            border-radius:50%;background:#ef4444;color:#fff;font-size:9px;
            display:none;align-items:center;justify-content:center;">
            <i class="fa-solid fa-check"></i></div>
        </div>

        <!-- CSV -->
        <div class="_exp-card" data-fmt="csv" onclick="DS_EXPORT._selectFmt(this)"
          style="padding:18px;border-radius:14px;border:2px solid rgba(16,185,129,.2);
          background:rgba(16,185,129,.05);cursor:pointer;transition:all .2s;position:relative;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(16,185,129,.15);
              color:#10b981;display:flex;align-items:center;justify-content:center;font-size:16px;">
              <i class="fa-solid fa-file-csv"></i></div>
            <div>
              <div style="font-family:'Syne',sans-serif;font-size:12px;font-weight:900;color:#fff;">CSV</div>
              <div style="font-size:9px;color:rgba(255,255,255,.35);">Données brutes · Excel</div>
            </div>
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,.45);line-height:1.65;">
            Ratios + scores exportés. Importable directement dans Excel, Google Sheets, Power BI.
          </div>
          <div class="_exp-check" style="position:absolute;top:12px;right:12px;width:18px;height:18px;
            border-radius:50%;background:#10b981;color:#fff;font-size:9px;
            display:none;align-items:center;justify-content:center;">
            <i class="fa-solid fa-check"></i></div>
        </div>

        <!-- XLSX -->
        <div class="_exp-card" data-fmt="xlsx" onclick="DS_EXPORT._selectFmt(this)"
          style="padding:18px;border-radius:14px;border:2px solid rgba(34,197,94,.2);
          background:rgba(34,197,94,.05);cursor:pointer;transition:all .2s;position:relative;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(34,197,94,.15);
              color:#22c55e;display:flex;align-items:center;justify-content:center;font-size:16px;">
              <i class="fa-solid fa-file-excel"></i></div>
            <div>
              <div style="font-family:'Syne',sans-serif;font-size:12px;font-weight:900;color:#fff;">Excel XLSX</div>
              <div style="font-size:9px;color:rgba(255,255,255,.35);">Multi-onglets · Mise en forme</div>
            </div>
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,.45);line-height:1.65;">
            4 onglets : Synthèse · Ratios détaillés · Recommandations · Données brutes avec couleurs.
          </div>
          <div class="_exp-check" style="position:absolute;top:12px;right:12px;width:18px;height:18px;
            border-radius:50%;background:#22c55e;color:#fff;font-size:9px;
            display:none;align-items:center;justify-content:center;">
            <i class="fa-solid fa-check"></i></div>
        </div>

        <!-- JSON -->
        <div class="_exp-card" data-fmt="json" onclick="DS_EXPORT._selectFmt(this)"
          style="padding:18px;border-radius:14px;border:2px solid rgba(245,158,11,.2);
          background:rgba(245,158,11,.05);cursor:pointer;transition:all .2s;position:relative;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(245,158,11,.15);
              color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:16px;">
              <i class="fa-solid fa-code"></i></div>
            <div>
              <div style="font-family:'Syne',sans-serif;font-size:12px;font-weight:900;color:#fff;">JSON</div>
              <div style="font-size:9px;color:rgba(255,255,255,.35);">API · Intégration</div>
            </div>
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,.45);line-height:1.65;">
            Payload complet de l'analyse. Prêt à intégrer dans votre SI, ERP ou outil comptable.
          </div>
          <div class="_exp-check" style="position:absolute;top:12px;right:12px;width:18px;height:18px;
            border-radius:50%;background:#f59e0b;color:#fff;font-size:9px;
            display:none;align-items:center;justify-content:center;">
            <i class="fa-solid fa-check"></i></div>
        </div>
      </div>

      <!-- API Access -->
      <div style="padding:16px;border-radius:12px;background:rgba(139,92,246,.06);
        border:1px solid rgba(139,92,246,.2);margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:800;color:#a78bfa;">
            <i class="fa-solid fa-plug" style="margin-right:7px;"></i>Accès API direct
          </div>
          ${(S.abonnement?.plan||'standard')==='extra'
            ? `<span style="font-size:8px;background:rgba(167,139,250,.15);color:#a78bfa;
                border:1px solid rgba(167,139,250,.3);padding:2px 9px;border-radius:20px;font-weight:800;">
                ✦ EXTRA</span>`
            : `<span style="font-size:8px;background:rgba(255,215,0,.08);color:#FFD700;
                border:1px solid rgba(255,215,0,.2);padding:2px 9px;border-radius:20px;font-weight:800;cursor:pointer;"
                onclick="DS?.showToastUpgrade()">🔒 Extra requis</span>`
          }
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,.35);margin-bottom:8px;">
          Endpoint GET sécurisé · Réponse JSON · Token valable 30 jours
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div style="flex:1;font-family:monospace;font-size:9px;
            background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);
            border-radius:7px;padding:8px 12px;color:rgba(255,255,255,.55);
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            GET ${window.API_BASE||'http://127.0.0.1:8000'}/analyses/export/<span id="exp-api-token" style="color:#a78bfa;">—</span>
          </div>
          <button onclick="DS_EXPORT._copyApiUrl()"
            style="padding:8px 14px;border-radius:8px;background:rgba(139,92,246,.12);
            border:1px solid rgba(139,92,246,.25);color:#a78bfa;font-family:'Syne',sans-serif;
            font-size:9px;font-weight:800;cursor:pointer;white-space:nowrap;transition:background .15s;"
            onmouseenter="this.style.background='rgba(139,92,246,.22)'"
            onmouseleave="this.style.background='rgba(139,92,246,.12)'">
            <i class="fa-solid fa-copy"></i> Copier
          </button>
        </div>
      </div>

      <!-- Options supplémentaires -->
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:9px;color:rgba(255,255,255,.5);">
          <input type="checkbox" id="exp-opt-shap" checked style="accent-color:#7DD3FC;">
          Inclure SHAP
        </label>
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:9px;color:rgba(255,255,255,.5);">
          <input type="checkbox" id="exp-opt-recos" checked style="accent-color:#7DD3FC;">
          Recommandations IA
        </label>
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:9px;color:rgba(255,255,255,.5);">
          <input type="checkbox" id="exp-opt-history" style="accent-color:#7DD3FC;">
          Historique scores
        </label>
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:9px;color:rgba(255,255,255,.5);">
          <input type="checkbox" id="exp-opt-raw" style="accent-color:#7DD3FC;">
          Données brutes
        </label>
      </div>

      <!-- Bouton principal -->
      <div id="exp-status" style="min-height:14px;margin-bottom:12px;text-align:center;font-size:9px;"></div>
      <button onclick="DS_EXPORT.exportAll()"
        id="exp-launch-btn"
        style="width:100%;padding:14px;border-radius:12px;
        background:linear-gradient(135deg,rgba(125,211,252,.15),rgba(255,215,0,.1));
        border:1px solid rgba(125,211,252,.3);
        color:#fff;font-family:'Syne',sans-serif;font-size:12px;font-weight:900;
        letter-spacing:.06em;cursor:pointer;transition:all .22s;
        display:flex;align-items:center;justify-content:center;gap:10px;"
        onmouseenter="this.style.background='linear-gradient(135deg,rgba(125,211,252,.25),rgba(255,215,0,.18))'"
        onmouseleave="this.style.background='linear-gradient(135deg,rgba(125,211,252,.15),rgba(255,215,0,.1))'">
        <i class="fa-solid fa-arrow-up-from-bracket"></i>
        Exporter les formats sélectionnés
      </button>
    </div>`;

    // Ajouter CSS transition
    const style = document.createElement('style');
    style.textContent = `
      #export-modal.show { opacity:1 !important; }
      ._exp-card { user-select:none; }
      ._exp-card.selected {
        border-color:rgba(125,211,252,.6) !important;
        background:rgba(125,211,252,.08) !important;
        box-shadow:0 0 0 3px rgba(125,211,252,.08);
      }
      ._exp-card.selected ._exp-check { display:flex !important; }
      ._exp-card:hover:not(.selected) { transform:translateY(-2px); }
    `;
    if (!document.getElementById('_export-css')) {
      style.id = '_export-css';
      document.head.appendChild(style);
    }

    return m;
  },

  // ── Sélection format ─────────────────────────────────────────
  _selectFmt(card) {
    card.classList.toggle('selected');
  },

  _selectedFmts() {
    return [...document.querySelectorAll('._exp-card.selected')].map(c => c.dataset.fmt);
  },

  // ── Export principal ─────────────────────────────────────────
  async exportAll() {
    const fmts = this._selectedFmts();
    if (!fmts.length) { showToast('Sélectionnez au moins un format', 'warn'); return; }
    const a = this._current;
    if (!a) return;

    const statusEl = document.getElementById('exp-status');
    const btn = document.getElementById('exp-launch-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Génération en cours…'; }

    const opts = {
      shap:    document.getElementById('exp-opt-shap')?.checked    ?? true,
      recos:   document.getElementById('exp-opt-recos')?.checked   ?? true,
      history: document.getElementById('exp-opt-history')?.checked ?? false,
      raw:     document.getElementById('exp-opt-raw')?.checked     ?? false,
    };

    let done = 0;
    for (const fmt of fmts) {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--ice)"><i class="fa-solid fa-circle-notch fa-spin" style="margin-right:5px;"></i>Génération ${fmt.toUpperCase()}…</span>`;
      await this._delay(120);
      try {
        if (fmt === 'pdf')  this.exportPDF(a, opts);
        if (fmt === 'csv')  this.exportCSV(a, opts);
        if (fmt === 'xlsx') this.exportXLSX(a, opts);
        if (fmt === 'json') this.exportJSON(a, opts);
        done++;
      } catch(e) {
        showToast(`Erreur ${fmt}: ${e.message}`, 'err');
      }
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-arrow-up-from-bracket"></i> Exporter les formats sélectionnés'; }
    if (statusEl) statusEl.innerHTML = `<span style="color:#10b981"><i class="fa-solid fa-circle-check" style="margin-right:5px;"></i>${done} fichier${done>1?'s':''} exporté${done>1?'s':''} avec succès</span>`;
    showToast(`${done} export${done>1?'s':''} réussi${done>1?'s':''}  ✓`, 'ok');
    setTimeout(() => { if(statusEl) statusEl.innerHTML=''; }, 4000);
  },

  // ════════════════════════════════════════════════════════════
  //  FORMAT : PDF
  // ════════════════════════════════════════════════════════════
  exportPDF(a, opts = {}) {
    const zone   = a.zone || 'vigilance';
    const ZL     = { saine:'Zone Saine', vigilance:'Zone Vigilance', risque:'Zone Risque', critique:'Zone Critique' };
    const ZBG    = { saine:'#d1fae5', vigilance:'#fef3c7', risque:'#fed7aa', critique:'#fee2e2' };
    const ZTX    = { saine:'#065f46', vigilance:'#92400e', risque:'#9a3412', critique:'#991b1b' };
    const ZBD    = { saine:'#10b981', vigilance:'#f59e0b', risque:'#f97316', critique:'#ef4444' };
    const score  = a.score || 0;
    const date   = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
    const ZM     = { saine:.6, vigilance:1.0, risque:1.3, critique:1.6 };
    const prob   = Math.round((100 - score) * (ZM[zone] || 1) * .85);

    const ratiosHtml = (a.ratios || []).slice(0, 8).map(r => {
      const sc = (r.status || r.s) === 'green' ? '#065f46' : (r.status || r.s) === 'red' ? '#991b1b' : '#92400e';
      const bar = Math.round(r.score || 50);
      return `<tr>
        <td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #f1f5f9;">${r.name || r.n}</td>
        <td style="padding:7px 10px;font-size:11px;font-weight:800;color:${sc};border-bottom:1px solid #f1f5f9;">${r.value ?? r.v}${r.unit || r.u || ''}</td>
        <td style="padding:7px 10px;font-size:10px;color:#64748b;border-bottom:1px solid #f1f5f9;">${r.benchmark || '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">
          <div style="background:#f1f5f9;border-radius:4px;height:6px;width:80px;overflow:hidden;">
            <div style="width:${bar}%;height:100%;background:${sc};border-radius:4px;"></div>
          </div>
        </td>
      </tr>`;
    }).join('');

    const shapHtml = opts.shap !== false ? (a.shapValues || []).slice(0, 6).map(s => {
      const col = s.direction === 'positive' ? '#065f46' : '#991b1b';
      const bar = Math.min(100, Math.round(s.pct || 50));
      return `<div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;">
          <span>${s.feature}</span><span style="color:${col};font-weight:700;">${s.direction==='positive'?'+':''}${s.value?.toFixed?.(2) || s.value}</span>
        </div>
        <div style="background:#f1f5f9;border-radius:4px;height:7px;overflow:hidden;">
          <div style="width:${bar}%;height:100%;background:${col};border-radius:4px;"></div>
        </div>
      </div>`;
    }).join('') : '';

    const recoHtml = opts.recos !== false ? (a.recommendations || []).slice(0, 4).map(r => {
      const lc = (r.level||r.lvl) === 'high' ? '#991b1b' : (r.level||r.lvl) === 'medium' ? '#92400e' : '#065f46';
      const lb = (r.level||r.lvl) === 'high' ? '#fee2e2' : (r.level||r.lvl) === 'medium' ? '#fef3c7' : '#d1fae5';
      return `<div style="padding:10px 14px;border-radius:8px;background:${lb};margin-bottom:8px;">
        <div style="font-size:11px;font-weight:800;color:${lc};margin-bottom:3px;">${r.title || r.t}</div>
        <div style="font-size:10px;color:#475569;">${r.description || r.d || ''}</div>
      </div>`;
    }).join('') : '';

    const histHtml = opts.history && (a.scoreHistory || []).length > 1
      ? `<div class="card"><h3>Historique des scores</h3>
          <div style="display:flex;align-items:flex-end;gap:8px;height:60px;">
            ${(a.scoreHistory || []).map((s,i,arr) => {
              const h = Math.round(s * 0.6);
              const c = s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : s >= 25 ? '#f97316' : '#ef4444';
              return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;">
                <div style="height:${h}px;background:${c};border-radius:4px 4px 0 0;width:100%;"></div>
                <div style="font-size:8px;color:#64748b;">P${i+1}</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : '';

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Doctor Smile™ — Rapport ${escHtml(a.entreprise || 'Analyse')}</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:'Segoe UI',Helvetica,Arial,sans-serif; background:#f8fafc; color:#1e293b; }
      .page { max-width:860px; margin:0 auto; background:#fff; padding:40px; }
      .header { background:linear-gradient(135deg,#0a0e1a 0%,#0f1929 60%,#1a1040 100%);
        color:#fff; padding:32px 36px; border-radius:16px; margin-bottom:28px; }
      .header-logo { font-size:13px; font-weight:700; color:#7DD3FC; letter-spacing:.15em;
        text-transform:uppercase; margin-bottom:10px; }
      .header-title { font-size:28px; font-weight:900; margin-bottom:4px; }
      .header-sub { font-size:10px; color:rgba(255,255,255,.4); }
      .score-big { font-size:72px; font-weight:900; color:${ZBD[zone]}; line-height:1; }
      .badge { display:inline-block; padding:5px 14px; border-radius:20px; font-size:11px;
        font-weight:800; background:${ZBG[zone]}; color:${ZTX[zone]}; }
      .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin:20px 0; }
      .grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin:20px 0; }
      .card { border:1px solid #e2e8f0; border-radius:12px; padding:18px; }
      .card h3 { font-size:10px; font-weight:800; text-transform:uppercase;
        letter-spacing:.1em; color:#94a3b8; margin-bottom:12px; }
      .kpi-val { font-size:28px; font-weight:900; margin-bottom:2px; }
      .kpi-lbl { font-size:9px; color:#94a3b8; }
      table { width:100%; border-collapse:collapse; }
      th { text-align:left; padding:7px 10px; font-size:9px; font-weight:700;
        text-transform:uppercase; letter-spacing:.08em; color:#94a3b8; background:#f8fafc; }
      .footer { margin-top:28px; padding-top:16px; border-top:1px solid #e2e8f0;
        font-size:8px; color:#94a3b8; display:flex; justify-content:space-between; }
      @media print { body { background:#fff; } .page { padding:24px; max-width:100%; } }
    </style></head>
    <body><div class="page">

      <!-- Header -->
      <div class="header">
        <div class="header-logo">Doctor Smile™ · Intelligence Artificielle Financière</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div class="header-title">${escHtml(a.entreprise || 'Entreprise')}</div>
            <div class="header-sub">Rapport généré le ${date} · Plan ${(a.plan||'Standard').charAt(0).toUpperCase()+(a.plan||'Standard').slice(1)}</div>
          </div>
          <div style="text-align:right;">
            <div class="score-big">${score}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.4);">Doctor Score™ / 100</div>
          </div>
        </div>
      </div>

      <!-- Zone + KPIs -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <span class="badge">${ZL[zone]}</span>
        <span style="font-size:11px;color:#64748b;">·</span>
        <span style="font-size:11px;color:#64748b;">Probabilité de défaut : <strong style="color:${ZBD[zone]}">${prob}%</strong></span>
        <span style="font-size:11px;color:#64748b;">·</span>
        <span style="font-size:11px;color:#64748b;">Confiance modèle : <strong>${a.confidence || '—'}%</strong></span>
        <span style="font-size:11px;color:#64748b;">·</span>
        <span style="font-size:11px;color:#64748b;">Modèle : <strong>${a.model || 'ML Ensemble'}</strong></span>
      </div>

      <!-- KPI Cards -->
      <div class="grid-3">
        <div class="card" style="border-color:${ZBD[zone]}22;background:${ZBG[zone]}44;">
          <h3>Doctor Score™</h3>
          <div class="kpi-val" style="color:${ZBD[zone]}">${score}/100</div>
          <div class="kpi-lbl">${ZL[zone]}</div>
        </div>
        <div class="card">
          <h3>Risque de faillite</h3>
          <div class="kpi-val" style="color:${prob>60?'#ef4444':prob>35?'#f97316':'#10b981'}">${prob}%</div>
          <div class="kpi-lbl">Probabilité estimée</div>
        </div>
        <div class="card">
          <h3>AUC ROC</h3>
          <div class="kpi-val" style="color:#7DD3FC">${a.auc || '—'}</div>
          <div class="kpi-lbl">Précision du modèle</div>
        </div>
      </div>

      <!-- Ratios -->
      <div class="card" style="margin-bottom:20px;">
        <h3>Ratios financiers clés</h3>
        <table>
          <thead><tr>
            <th>Indicateur</th><th>Valeur</th><th>Benchmark</th><th>Score</th>
          </tr></thead>
          <tbody>${ratiosHtml}</tbody>
        </table>
      </div>

      <!-- SHAP -->
      ${shapHtml ? `<div class="card" style="margin-bottom:20px;"><h3>Facteurs d'influence (SHAP)</h3>${shapHtml}</div>` : ''}

      <!-- Recommandations -->
      ${recoHtml ? `<div style="margin-bottom:20px;"><h3 style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:12px;">Recommandations IA</h3>${recoHtml}</div>` : ''}

      <!-- Historique -->
      ${histHtml}

      <!-- Footer -->
      <div class="footer">
        <span>Doctor Smile™ · Analyse IA · ${date}</span>
        <span>Ce rapport ne constitue pas un conseil financier réglementé · ID: ${a.id?.slice(0,8) || '—'}</span>
      </div>
    </div></body></html>`;

    const w = window.open('', '_blank', 'width=960,height=750');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 650);
    } else {
      // Fallback blob download
      this._downloadBlob(new Blob([html], { type:'text/html' }), `DoctorSmile_${a.entreprise||'analyse'}_${Date.now()}.html`);
    }
    showToast('PDF prêt ✓', 'ok');
  },

  // ════════════════════════════════════════════════════════════
  //  FORMAT : CSV
  // ════════════════════════════════════════════════════════════
  exportCSV(a, opts = {}) {
    const rows = [];
    // En-tête méta
    rows.push(['# Doctor Smile™ — Export CSV']);
    rows.push(['Entreprise', a.entreprise || '—']);
    rows.push(['Date export', new Date().toLocaleDateString('fr-FR')]);
    rows.push(['Score', a.score]);
    rows.push(['Zone', a.zone]);
    rows.push(['Probabilité défaut %', a.probabiliteDefaut]);
    rows.push(['Confiance modèle %', a.confidence]);
    rows.push(['Modèle', a.model]);
    rows.push([]);

    // Ratios
    rows.push(['=== RATIOS FINANCIERS ===']);
    rows.push(['Indicateur', 'Valeur', 'Unité', 'Benchmark', 'Statut', 'Score/100']);
    (a.ratios || []).forEach(r => {
      rows.push([r.name||r.n, r.value??r.v, r.unit||r.u||'', r.benchmark||'—', r.status||r.s, r.score||'—']);
    });
    rows.push([]);

    // SHAP
    if (opts.shap !== false && (a.shapValues || []).length) {
      rows.push(['=== FACTEURS SHAP ===']);
      rows.push(['Feature', 'Valeur SHAP', 'Impact %', 'Direction']);
      (a.shapValues || []).forEach(s => {
        rows.push([s.feature, s.value, s.pct, s.direction]);
      });
      rows.push([]);
    }

    // Recommandations
    if (opts.recos !== false && (a.recommendations || []).length) {
      rows.push(['=== RECOMMANDATIONS IA ===']);
      rows.push(['Niveau', 'Titre', 'Description']);
      (a.recommendations || []).forEach(r => {
        rows.push([r.level||r.lvl, r.title||r.t, r.description||r.d||'']);
      });
      rows.push([]);
    }

    // Historique
    if (opts.history && (a.scoreHistory || []).length) {
      rows.push(['=== HISTORIQUE SCORES ===']);
      rows.push(['Période', 'Score']);
      (a.scoreHistory || []).forEach((s, i) => rows.push([`P${i+1}`, s]));
    }

    const csv = rows.map(r =>
      r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    this._downloadBlob(
      new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
      `DoctorSmile_${a.entreprise||'analyse'}_${this._dateStr()}.csv`
    );
    showToast('CSV téléchargé ✓', 'ok');
  },

  // ════════════════════════════════════════════════════════════
  //  FORMAT : XLSX (4 onglets)
  // ════════════════════════════════════════════════════════════
  exportXLSX(a, opts = {}) {
    if (!window.XLSX) { showToast('SheetJS non chargé', 'err'); return; }
    const XL = window.XLSX;
    const wb = XL.utils.book_new();

    // ── Onglet 1 : Synthèse ──
    const synthData = [
      ['Doctor Smile™ — Rapport de synthèse', '', '', ''],
      ['', '', '', ''],
      ['Entreprise',             a.entreprise || '—', '', ''],
      ['Date analyse',           new Date().toLocaleDateString('fr-FR'), '', ''],
      ['Doctor Score™',          a.score, '/100', ''],
      ['Zone de risque',         a.zone?.toUpperCase() || '—', '', ''],
      ['Probabilité de défaut',  (a.probabiliteDefaut || 0) + '%', '', ''],
      ['Confiance modèle',       (a.confidence || 0) + '%', '', ''],
      ['AUC ROC',                a.auc || '—', '', ''],
      ['Modèle ML',              a.model || '—', '', ''],
      ['Temps de traitement',    (a.processingMs || 0) + ' ms', '', ''],
    ];
    const ws1 = XL.utils.aoa_to_sheet(synthData);
    ws1['!cols'] = [{ wch:30 }, { wch:20 }, { wch:10 }, { wch:10 }];
    XL.utils.book_append_sheet(wb, ws1, 'Synthèse');

    // ── Onglet 2 : Ratios détaillés ──
    const ratiosHeader = ['Indicateur', 'Valeur', 'Unité', 'Benchmark', 'Statut', 'Score /100', 'Couleur'];
    const ratiosRows = (a.ratios || []).map(r => [
      r.name || r.n,
      r.value ?? r.v,
      r.unit || r.u || '',
      r.benchmark || '—',
      r.status || r.s || '—',
      r.score || 0,
      r.color || ''
    ]);
    const ws2 = XL.utils.aoa_to_sheet([ratiosHeader, ...ratiosRows]);
    ws2['!cols'] = [{ wch:28 }, { wch:12 }, { wch:8 }, { wch:14 }, { wch:10 }, { wch:12 }, { wch:12 }];
    XL.utils.book_append_sheet(wb, ws2, 'Ratios');

    // ── Onglet 3 : Recommandations ──
    if (opts.recos !== false) {
      const recoHeader = ['Niveau', 'Titre', 'Description', 'Icône'];
      const recoRows = (a.recommendations || []).map(r => [
        r.level || r.lvl || '',
        r.title || r.t || '',
        r.description || r.d || '',
        r.icon || ''
      ]);
      const ws3 = XL.utils.aoa_to_sheet([recoHeader, ...recoRows]);
      ws3['!cols'] = [{ wch:12 }, { wch:36 }, { wch:60 }, { wch:14 }];
      XL.utils.book_append_sheet(wb, ws3, 'Recommandations');
    }

    // ── Onglet 4 : SHAP / Facteurs ──
    if (opts.shap !== false) {
      const shapHeader = ['Feature', 'Valeur SHAP', 'Impact %', 'Direction', 'Clé feature'];
      const shapRows = (a.shapValues || []).map(s => [
        s.feature, s.value, s.pct, s.direction, s.feature_key || ''
      ]);
      const ws4 = XL.utils.aoa_to_sheet([shapHeader, ...shapRows]);
      ws4['!cols'] = [{ wch:28 }, { wch:14 }, { wch:12 }, { wch:12 }, { wch:24 }];
      XL.utils.book_append_sheet(wb, ws4, 'Facteurs SHAP');
    }

    // ── Onglet 5 : Historique (si demandé) ──
    if (opts.history && (a.scoreHistory || []).length) {
      const histHeader = ['Période', 'Score', 'Zone'];
      const histRows = (a.scoreHistory || []).map((s, i) => [
        `P${i + 1}`, s, s >= 75 ? 'Saine' : s >= 50 ? 'Vigilance' : s >= 25 ? 'Risque' : 'Critique'
      ]);
      const ws5 = XL.utils.aoa_to_sheet([histHeader, ...histRows]);
      ws5['!cols'] = [{ wch:10 }, { wch:10 }, { wch:14 }];
      XL.utils.book_append_sheet(wb, ws5, 'Historique');
    }

    XL.writeFile(wb, `DoctorSmile_${a.entreprise || 'analyse'}_${this._dateStr()}.xlsx`);
    showToast('Excel téléchargé ✓', 'ok');
  },

  // ════════════════════════════════════════════════════════════
  //  FORMAT : JSON
  // ════════════════════════════════════════════════════════════
  exportJSON(a, opts = {}) {
    const payload = {
      _meta: {
        source:    'Doctor Smile™',
        exported:  new Date().toISOString(),
        version:   'v2.1.0',
        analyseId: a.id,
      },
      entreprise:        a.entreprise,
      score:             a.score,
      zone:              a.zone,
      probabiliteDefaut: a.probabiliteDefaut,
      confidence:        a.confidence,
      model:             a.model,
      auc:               a.auc,
      plan:              a.plan,
      ratios:            a.ratios,
    };
    if (opts.shap    !== false) payload.shapValues      = a.shapValues;
    if (opts.recos   !== false) payload.recommendations = a.recommendations;
    if (opts.history)           payload.scoreHistory    = a.scoreHistory;
    if (opts.raw)               payload.radarDimensions = a.radarDimensions;

    this._downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      `DoctorSmile_${a.entreprise || 'analyse'}_${this._dateStr()}.json`
    );
    showToast('JSON téléchargé ✓', 'ok');
  },

  // ════════════════════════════════════════════════════════════
  //  API TOKEN + COPIE URL
  // ════════════════════════════════════════════════════════════
  _genToken(id) {
    // Token déterministe court lisible (non cryptographique, juste pour l'URL)
    const b = btoa(`ds:${id}:${Date.now().toString(36)}`).replace(/=/g, '').slice(0, 24);
    return b;
  },

  _copyApiUrl() {
    const token = this._apiToken;
    const url   = `${window.API_BASE || 'http://127.0.0.1:8000'}/analyses/export/${token}`;
    navigator.clipboard?.writeText(url).then(
      () => showToast('URL copiée ✓', 'ok'),
      () => showToast('Copie manuelle : ' + url, 'info')
    );
  },

  // ── Helpers ──────────────────────────────────────────────────
  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  _dateStr() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  },

  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  },
};

// ── Bouton export flottant injecté après loadAnalyse ─────────
window._DS_injectExportBtn = function() {
  if (document.getElementById('_export-fab')) return;
  const fab = document.createElement('button');
  fab.id = '_export-fab';
  fab.title = 'Exporter l\'analyse';
  fab.innerHTML = '<i class="fa-solid fa-arrow-up-from-bracket"></i>';
  fab.style.cssText = `
    position:fixed;bottom:28px;right:28px;z-index:8000;
    width:48px;height:48px;border-radius:14px;
    background:linear-gradient(135deg,rgba(125,211,252,.18),rgba(255,215,0,.12));
    border:1px solid rgba(125,211,252,.3);
    color:#7DD3FC;font-size:16px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 8px 28px rgba(0,0,0,.5);
    transition:all .22s cubic-bezier(.34,1.56,.64,1);
    backdrop-filter:blur(12px);`;
  fab.addEventListener('mouseenter', () => {
    fab.style.transform = 'translateY(-3px) scale(1.08)';
    fab.style.boxShadow = '0 14px 36px rgba(125,211,252,.18)';
  });
  fab.addEventListener('mouseleave', () => {
    fab.style.transform = 'none';
    fab.style.boxShadow = '0 8px 28px rgba(0,0,0,.5)';
  });
  fab.addEventListener('click', () => window.DS_EXPORT?.openModal());
  document.body.appendChild(fab);
};

console.log('[ds-export] ✓ Chargé');
