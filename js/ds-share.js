// ════════════════════════════════════════════════════════════════
//  ds-share.js — Doctor Smile
//  Partage rapport : modal 8 plateformes + WiFi + Bluetooth
//  + bouton injecté dans score card + vue rapports
//  Dépend de : ds-core.js
// ════════════════════════════════════════════════════════════════

window.DS_SHARE = {

  // ── Point d'entrée ───────────────────────────────────────────
  async open(analyseId) {
    const a = analyseId
      ? S.analyses.find(x => x.id === analyseId) || S.currentAnalyse
      : S.currentAnalyse;
    if (!a) { showToast('Aucune analyse à partager', 'warn'); return; }

    const zone  = a.zone ?? zoneFromScore(a.score ?? 0);
    const zc    = ZC[zone];
    const score = a.score ?? 0;
    const ZM    = { saine:.6, vigilance:1, risque:1.3, critique:1.6 };
    const prob  = Math.round((100 - score) * (ZM[zone] || 1) * .85);
    const date  = new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
    const titre = 'Doctor Smile — ' + (a.entreprise ?? 'Analyse financière');
    const texte = 'Score ' + score + '/100 · ' + zc.l + ' · Risque défaut ' + prob + '% · ' + (a.model ?? 'ML') + ' · ' + date;
    const url   = window.location.href;

    const { normalizeRatios, normalizeRecos } = window.DS_RENDER;
    const ratios     = normalizeRatios(a.ratios || a.financialRatios || []);
    const recos      = normalizeRecos(a.recommendations || a.recos || []);
    const shap       = a.shapValues || a.shap || [];
    const reportHTML = this._buildHTML(a, score, zone, zc, date, prob, ratios, recos, shap);
    const blob       = new Blob([reportHTML], { type: 'text/html' });
    const blobURL    = URL.createObjectURL(blob);

    this._renderModal(a, score, zc, titre, texte, url, blob, blobURL, reportHTML);
  },

  // ── Construire le modal ──────────────────────────────────────
  _renderModal(a, score, zc, titre, texte, url, blob, blobURL, reportHTML) {
    document.getElementById('_share_modal')?.remove();

    const PLATFORMS = [
      { id:'whatsapp', label:'WhatsApp',    icon:'fa-whatsapp',  brand:true,  color:'#25D366',
        url:'https://wa.me/?text=' + encodeURIComponent(titre + '\n' + texte + '\n' + url) },
      { id:'telegram', label:'Telegram',    icon:'fa-telegram',  brand:true,  color:'#2CA5E0',
        url:'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(titre + '\n' + texte) },
      { id:'linkedin', label:'LinkedIn',    icon:'fa-linkedin',  brand:true,  color:'#0A66C2',
        url:'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url) + '&summary=' + encodeURIComponent(texte) },
      { id:'twitter',  label:'X / Twitter', icon:'fa-x-twitter', brand:true,  color:'#e2e8f0',
        url:'https://twitter.com/intent/tweet?text=' + encodeURIComponent(titre + ' — ' + texte) + '&url=' + encodeURIComponent(url) },
      { id:'facebook', label:'Facebook',    icon:'fa-facebook',  brand:true,  color:'#1877F2',
        url:'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '&quote=' + encodeURIComponent(texte) },
      { id:'email',    label:'Email',        icon:'fa-envelope',  brand:false, color:'#7DD3FC',
        url:'mailto:?subject=' + encodeURIComponent(titre) + '&body=' + encodeURIComponent(texte + '\n\n' + url) },
      { id:'slack',    label:'Slack',        icon:'fa-slack',     brand:true,  color:'#E01E5A',
        url:'https://slack.com/intl/share?text=' + encodeURIComponent(titre + '\n' + texte) },
      { id:'copy',     label:'Copier lien',  icon:'fa-link',      brand:false, color:'#a78bfa', url:null },
    ];

    const fname = 'rapport-' + (a.entreprise ?? 'analyse').replace(/\s+/g,'-').toLowerCase() + '.html';

    const modal = document.createElement('div');
    modal.id = '_share_modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:center;'
      + 'justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(16px);padding:16px;';

    modal.innerHTML = '<div id="_share_box" style="background:rgba(6,10,20,.99);border:1px solid rgba(125,211,252,.15);'
      + 'border-radius:20px;padding:26px;max-width:500px;width:100%;'
      + 'animation:mIn .24s cubic-bezier(.16,1,.3,1);max-height:92vh;overflow-y:auto;">'

      // En-tête
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">'
      + '<div>'
      + '<div style="font-family:Syne,sans-serif;font-size:15px;font-weight:900;color:#fff;margin-bottom:6px;">'
      + '<i class="fa-solid fa-share-nodes" style="color:#7DD3FC;margin-right:9px;"></i>Partager le rapport</div>'
      + '<div style="font-size:10px;color:rgba(255,255,255,.38);">'
      + '<span style="background:' + zc.bg + ';color:' + zc.t + ';border:1px solid ' + zc.s + '44;padding:2px 9px;border-radius:6px;font-family:Syne,sans-serif;font-size:8px;font-weight:800;margin-right:8px;">' + zc.l + '</span>'
      + escHtml(a.entreprise ?? 'Analyse') + ' · Score <strong style="color:' + zc.s + '">' + score + '</strong>/100'
      + '</div></div>'
      + '<button id="_share_close" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:7px 13px;color:rgba(255,255,255,.5);cursor:pointer;font-size:12px;flex-shrink:0;">✕</button>'
      + '</div>'

      // Titre section
      + '<div style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:10px;">Partager sur</div>'

      // Grille plateformes
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px;">'
      + PLATFORMS.map(p =>
          '<button data-pid="' + p.id + '" data-purl="' + (p.url ?? '') + '"'
          + ' style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 6px;'
          + 'border-radius:13px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);'
          + 'cursor:pointer;font-family:Syne,sans-serif;transition:all .15s;"'
          + ' onmouseenter="this.style.background=\'rgba(255,255,255,.09)\';this.style.borderColor=\'' + p.color + '55\';this.style.transform=\'translateY(-2px)\'"'
          + ' onmouseleave="this.style.background=\'rgba(255,255,255,.03)\';this.style.borderColor=\'rgba(255,255,255,.07)\';this.style.transform=\'none\'">'
          + '<i class="fa-' + (p.brand?'brands':'solid') + ' ' + p.icon + '" style="font-size:20px;color:' + p.color + ';"></i>'
          + '<span style="font-size:8px;color:rgba(255,255,255,.5);font-weight:700;text-align:center;line-height:1.2;">' + p.label + '</span>'
          + '</button>'
        ).join('')
      + '</div>'

      // Séparateur
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">'
      + '<div style="flex:1;height:1px;background:rgba(255,255,255,.07);"></div>'
      + '<span style="font-size:8px;color:rgba(255,255,255,.2);letter-spacing:.1em;">EXPORT & TRANSFERT</span>'
      + '<div style="flex:1;height:1px;background:rgba(255,255,255,.07);"></div>'
      + '</div>'

      // Export / WiFi / Bluetooth
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;">'

      + '<a id="_share_dl" href="' + blobURL + '" download="' + fname + '"'
      + ' style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 6px;'
      + 'border-radius:13px;border:1px solid rgba(255,215,0,.2);background:rgba(255,215,0,.05);'
      + 'cursor:pointer;text-decoration:none;transition:all .15s;"'
      + ' onmouseenter="this.style.background=\'rgba(255,215,0,.13)\';this.style.transform=\'translateY(-2px)\'"'
      + ' onmouseleave="this.style.background=\'rgba(255,215,0,.05)\';this.style.transform=\'none\'">'
      + '<i class="fa-solid fa-file-arrow-down" style="font-size:20px;color:#FFD700;"></i>'
      + '<span style="font-size:8px;color:rgba(255,255,255,.5);font-weight:700;text-align:center;line-height:1.2;">Télécharger HTML</span>'
      + '</a>'

      + '<button id="_share_wifi" style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 6px;'
      + 'border-radius:13px;border:1px solid rgba(34,197,94,.2);background:rgba(34,197,94,.05);'
      + 'cursor:pointer;font-family:Syne,sans-serif;transition:all .15s;"'
      + ' onmouseenter="this.style.background=\'rgba(34,197,94,.13)\';this.style.transform=\'translateY(-2px)\'"'
      + ' onmouseleave="this.style.background=\'rgba(34,197,94,.05)\';this.style.transform=\'none\'">'
      + '<i class="fa-solid fa-wifi" style="font-size:20px;color:#22c55e;"></i>'
      + '<span style="font-size:8px;color:rgba(255,255,255,.5);font-weight:700;text-align:center;line-height:1.2;">WiFi / AirDrop</span>'
      + '</button>'

      + '<button id="_share_bt" style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 6px;'
      + 'border-radius:13px;border:1px solid rgba(59,130,246,.2);background:rgba(59,130,246,.05);'
      + 'cursor:pointer;font-family:Syne,sans-serif;transition:all .15s;"'
      + ' onmouseenter="this.style.background=\'rgba(59,130,246,.13)\';this.style.transform=\'translateY(-2px)\'"'
      + ' onmouseleave="this.style.background=\'rgba(59,130,246,.05)\';this.style.transform=\'none\'">'
      + '<i class="fa-solid fa-bluetooth-b" style="font-size:20px;color:#3b82f6;"></i>'
      + '<span style="font-size:8px;color:rgba(255,255,255,.5);font-weight:700;text-align:center;line-height:1.2;">Bluetooth</span>'
      + '</button>'
      + '</div>'

      // Aperçu texte
      + '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px 14px;">'
      + '<div style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:6px;">Aperçu du message</div>'
      + '<div style="font-size:10px;color:rgba(255,255,255,.5);line-height:1.6;">' + escHtml(texte) + '</div>'
      + '</div>'

      + '</div>';

    document.body.appendChild(modal);

    // Fermer
    modal.addEventListener('click', e => { if (e.target === modal) this._close(modal, blobURL); });
    document.getElementById('_share_close').addEventListener('click', () => this._close(modal, blobURL));

    // Plateformes
    modal.querySelectorAll('[data-pid]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid  = btn.dataset.pid;
        const purl = btn.dataset.purl;
        if (pid === 'copy') {
          try   { await navigator.clipboard.writeText(url); showToast('Lien copié ✓', 'ok'); }
          catch { showToast('Impossible de copier', 'warn'); }
          this._close(modal, blobURL); return;
        }
        if (purl) { window.open(purl, '_blank', 'noopener'); this._close(modal, blobURL); }
      });
    });

    // WiFi / AirDrop
    document.getElementById('_share_wifi').addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: titre, text: texte, url,
            files: [new File([blob], fname, { type:'text/html' })],
          });
          showToast('Partagé ✓', 'ok'); this._close(modal, blobURL);
        } catch (err) {
          if (err.name !== 'AbortError') {
            try { await navigator.share({ title: titre, text: texte, url }); this._close(modal, blobURL); } catch {}
          }
        }
      } else {
        showToast('Partagez via votre navigateur ou utilisez "Télécharger"', 'info');
      }
    });

    // Bluetooth
    document.getElementById('_share_bt').addEventListener('click', async () => {
      if (navigator.bluetooth) {
        showToast("Recherche d'appareils Bluetooth…", 'info');
        try {
          const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
          showToast('Appareil : ' + (device.name ?? 'inconnu') + ' — rapport ouvert pour transfert', 'info');
          const w = window.open('', '_blank');
          if (w) { w.document.write(reportHTML); w.document.close(); }
        } catch (err) {
          if (err.name !== 'NotFoundError' && err.name !== 'SecurityError')
            showToast('Bluetooth non disponible dans ce navigateur', 'warn');
        }
      } else {
        showToast('Téléchargez le rapport puis envoyez-le via vos fichiers', 'info');
        const link = document.createElement('a');
        link.href = blobURL; link.download = fname; link.click();
      }
    });

    // Libérer l'URL blob après DL
    document.getElementById('_share_dl')?.addEventListener('click', () => {
      setTimeout(() => URL.revokeObjectURL(blobURL), 4000);
    });
  },

  _close(modal, blobURL) {
    modal?.remove();
    if (blobURL) setTimeout(() => URL.revokeObjectURL(blobURL), 600);
  },

  // ── Injecter le bouton dans la score-hero card ───────────────
  injectScoreButton() {
    if (document.getElementById('_share_score_btn')) return;
    const hero = document.querySelector('.score-hero') || document.querySelector('.card.score-hero');
    if (!hero) return;
    hero.style.position = 'relative';
    const btn = document.createElement('button');
    btn.id = '_share_score_btn';
    btn.title = 'Partager ce rapport';
    btn.style.cssText = 'position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:9px;'
      + 'background:rgba(125,211,252,.1);border:1px solid rgba(125,211,252,.2);color:#7DD3FC;'
      + 'display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;'
      + 'transition:all .18s var(--spring);z-index:2;';
    btn.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
    btn.addEventListener('click', () => window.DS_SHARE.open());
    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(125,211,252,.22)'; btn.style.transform = 'scale(1.1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(125,211,252,.1)';  btn.style.transform = 'none'; });
    hero.appendChild(btn);
  },

  // ── HTML du rapport exporté ───────────────────────────────────
  _buildHTML(a, score, zone, zc, date, prob, ratios, recos, shap) {
    const shapTop = (shap || []).slice(0, 5).map(s => ({
      n:   s.feature ?? s.n ?? '—',
      v:   +(+(s.value ?? s.v ?? 0)).toFixed(2),
      pos: (s.direction === 'positive') || ((+(s.value ?? s.v ?? 0)) > 0),
      p:   Math.min(Math.abs(+(s.value ?? s.v ?? 0)) * 10, 100),
    }));

    return '<!DOCTYPE html><html lang="fr"><head>'
      + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>Doctor Smile™ — ' + escHtml(a.entreprise ?? 'Rapport') + '</title>'
      + '<style>'
      + '*{box-sizing:border-box;margin:0;padding:0;}'
      + 'body{font-family:"Segoe UI",system-ui,sans-serif;background:#f8fafc;color:#0f172a;}'
      + '@media print{body{background:#fff;}.no-print{display:none!important;}}'
      + '.page{max-width:860px;margin:0 auto;padding:40px 32px;}'
      + '@media(max-width:600px){.page{padding:20px 16px;}.g2{grid-template-columns:1fr!important;}}'
      + '.hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e2e8f0;}'
      + '.logo{font-size:20px;font-weight:900;} .logo em{color:' + zc.s + ';font-style:normal;}'
      + '.gen{font-size:10px;color:#94a3b8;text-align:right;}'
      + '.hero{display:flex;align-items:center;gap:24px;padding:22px 26px;border-radius:16px;'
      +   'background:' + zc.bg.replace('.1)', ',0.07)') + ';border:1px solid ' + zc.s + '33;margin-bottom:26px;}'
      + '.circle{width:86px;height:86px;border-radius:50%;background:' + zc.bg + ';border:3px solid ' + zc.s + '55;'
      +   'display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;}'
      + '.circle .n{font-size:30px;font-weight:900;color:' + zc.s + ';line-height:1;}'
      + '.circle .d{font-size:10px;color:' + zc.s + ';opacity:.6;}'
      + '.hero h1{font-size:20px;font-weight:800;margin-bottom:6px;}'
      + '.pill{display:inline-block;padding:3px 12px;border-radius:100px;font-size:10px;font-weight:800;'
      +   'background:' + zc.bg + ';color:' + zc.s + ';text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;}'
      + '.metas{display:flex;gap:18px;flex-wrap:wrap;}'
      + '.meta{font-size:11px;color:#64748b;} .meta strong{color:#0f172a;}'
      + '.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}'
      + '.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;}'
      + '.ct{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:12px;}'
      + '.ri{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;}'
      + '.ri:last-child{border-bottom:none;}'
      + '.rn{font-size:10px;color:#475569;} .rv{font-size:12px;font-weight:800;} .rr{font-size:9px;color:#94a3b8;margin-left:5px;}'
      + '.rb{height:4px;background:#f1f5f9;border-radius:2px;margin-top:3px;overflow:hidden;}'
      + '.rbf{height:100%;border-radius:2px;}'
      + '.si{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;}'
      + '.si:last-child{border-bottom:none;}'
      + '.sn{font-size:10px;color:#475569;flex:1;} .sv{font-size:11px;font-weight:800;}'
      + '.sp{color:#10b981;} .sng{color:#ef4444;}'
      + '.sbw{width:65px;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden;}'
      + '.sbf{height:100%;border-radius:3px;}'
      + '.reco{padding:11px 14px;border-radius:10px;margin-bottom:9px;border-left:4px solid;}'
      + '.reco:last-child{margin-bottom:0;}'
      + '.reco.high{background:#fff5f5;border-color:#ef4444;}'
      + '.reco.medium{background:#fffbf0;border-color:#f59e0b;}'
      + '.reco.low{background:#f0fdf4;border-color:#10b981;}'
      + '.tag{display:inline-block;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:100px;margin-bottom:4px;}'
      + '.reco.high .tag{background:#fee2e2;color:#dc2626;}'
      + '.reco.medium .tag{background:#fef3c7;color:#d97706;}'
      + '.reco.low .tag{background:#dcfce7;color:#16a34a;}'
      + '.rt{font-weight:700;font-size:11px;margin-bottom:3px;}'
      + '.rd{font-size:10px;color:#64748b;line-height:1.5;}'
      + '.ftr{margin-top:32px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}'
      + '.flogo{font-size:12px;font-weight:900;} .flogo em{color:' + zc.s + ';font-style:normal;}'
      + '.fdisc{font-size:9px;color:#cbd5e1;max-width:460px;}'
      + '.pbar{background:#0f172a;color:#fff;padding:11px 28px;display:flex;align-items:center;justify-content:center;gap:14px;position:sticky;top:0;z-index:10;}'
      + '.pbtn{background:' + zc.s + ';color:#0f172a;border:none;border-radius:7px;padding:6px 16px;font-weight:800;font-size:11px;cursor:pointer;}'
      + '</style></head><body>'

      // Barre impression
      + '<div class="pbar no-print">'
      + '<span>📄 Doctor Smile™ — ' + escHtml(a.entreprise ?? '') + ' · Score ' + score + '/100</span>'
      + '<button class="pbtn" onclick="window.print()">🖨️ Imprimer / PDF</button>'
      + '</div>'

      + '<div class="page">'

      // Header
      + '<div class="hdr">'
      + '<div class="logo">Doctor <em>Smile™</em></div>'
      + '<div class="gen">Généré le ' + date + '<br>' + escHtml(a.model ?? 'RF + XGBoost + LightGBM') + '</div>'
      + '</div>'

      // Score hero
      + '<div class="hero">'
      + '<div class="circle"><div class="n">' + score + '</div><div class="d">/100</div></div>'
      + '<div><h1>' + escHtml(a.entreprise ?? 'Analyse financière') + '</h1>'
      + '<div class="pill">' + zc.l + '</div>'
      + '<div class="metas">'
      + '<div class="meta">Risque défaut : <strong style="color:' + (prob>60?'#dc2626':prob>35?'#d97706':'#16a34a') + '">' + prob + '%</strong></div>'
      + '<div class="meta">Confiance : <strong>' + (a.confidence ?? '—') + '%</strong></div>'
      + '<div class="meta">AUC : <strong>' + (a.auc ?? '—') + '</strong></div>'
      + (a.processingMs ? '<div class="meta">Durée : <strong>' + a.processingMs + 'ms</strong></div>' : '')
      + '</div></div></div>'

      // Ratios + SHAP
      + '<div class="g2">'
      + (ratios.length ? '<div class="card"><div class="ct">Ratios financiers</div>'
        + ratios.map(r =>
            '<div class="ri"><div style="flex:1"><div class="rn">' + escHtml(r.n) + '</div>'
            + '<div class="rb"><div class="rbf" style="width:' + r.p + '%;background:' + r.c + '"></div></div></div>'
            + '<div style="text-align:right;margin-left:12px;"><span class="rv" style="color:' + r.c + '">' + r.v + r.u + '</span>'
            + '<span class="rr">réf ' + r.b + '</span></div></div>'
          ).join('')
        + '</div>' : '')
      + (shapTop.length ? '<div class="card"><div class="ct">Facteurs SHAP</div>'
        + shapTop.map(s =>
            '<div class="si"><div class="sn">' + escHtml(s.n) + '</div>'
            + '<div class="sbw"><div class="sbf" style="width:' + s.p + '%;background:' + (s.pos?'#10b981':'#ef4444') + '"></div></div>'
            + '<span class="sv ' + (s.pos?'sp':'sng') + '">' + (s.pos?'+':'') + s.v + '</span></div>'
          ).join('')
        + '</div>' : '')
      + '</div>'

      // Recommandations
      + (recos.length ? '<div class="card" style="margin-bottom:16px;"><div class="ct">Recommandations IA</div>'
        + recos.map(r =>
            '<div class="reco ' + r.lvl + '"><div class="tag">' + (r.lvl==='high'?'Urgent':r.lvl==='medium'?'Important':'Info') + '</div>'
            + '<div class="rt">' + escHtml(r.t) + '</div><div class="rd">' + escHtml(r.d) + '</div></div>'
          ).join('')
        + '</div>' : '')

      // Footer
      + '<div class="ftr">'
      + '<div class="flogo">Doctor <em>Smile™</em></div>'
      + '<div class="fdisc">Rapport automatisé — ne constitue pas un conseil financier réglementé.</div>'
      + '</div>'

      + '</div></body></html>';
  },
};

// Alias pour compatibilité
window.DS.shareReport = (id) => window.DS_SHARE.open(id);

console.log('[ds-share] ✓ Chargé');
