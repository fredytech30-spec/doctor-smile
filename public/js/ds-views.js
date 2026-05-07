// ════════════════════════════════════════════════════════════════
//  ds-views.js — Doctor Smile
//  Toutes les vues de navigation + renderViewVisualisations
//  Dépend de : ds-core.js, ds-notifs.js
// ════════════════════════════════════════════════════════════════

window.DS_VIEWS = {

  // ── Vues qui affichent la sidebar ────────────────────────────
  SIDEBAR_VIEWS: new Set(['dashboard','analyses']),

  navTo(view) {
    document.querySelectorAll('.nav-item[data-view]').forEach(el=>{
      el.classList.toggle('active', el.dataset.view===view);
    });
    document.querySelectorAll('.view-pane').forEach(el=>{
      el.classList.toggle('active', el.id===`view-${view}`);
    });
    const sidebar=document.getElementById('sidebar');
    if(sidebar) sidebar.style.display=this.SIDEBAR_VIEWS.has(view)?'':'none';

    if      (view==='analyses')       this.renderAnalyses();
    else if (view==='chat')           window.DS_CHAT?.renderViewChat();
    else if (view==='rapports')       this.renderRapports();
    else if (view==='parametres')     this.renderParametres();
    else if (view==='visualisations') this.renderVisualisations();
    else if (view==='alertes')        this.renderAlertes();
    else if (view==='benchmark')      this.renderBenchmark();
  },

  // ── VUE : Analyses ───────────────────────────────────────────
  renderAnalyses() {
    const container=document.getElementById('analyses-full-list');
    const counter=document.getElementById('analyses-count');
    if(!container) return;
    const list=S.analyses;
    if(counter) counter.textContent=list.length?`${list.length} analyse${list.length>1?'s':''} au total`:'Aucune analyse';
    if(!list.length){
      container.innerHTML=`<div class="analyses-empty">
        <i class="fa-solid fa-microscope"></i>
        Aucune analyse pour le moment.<br>
        <span style="margin-top:8px;display:inline-block;">Importez un fichier depuis le dashboard pour commencer.</span>
      </div>`; return;
    }
    container.innerHTML=list.map(a=>{
      const zone=a.zone??zoneFromScore(a.score??0), zc=ZC[zone];
      const date=window.DS_DASH?._tsToString(a.createdAt)??'';
      const model=(a.model||'ML').split('+')[0].trim();
      const prob=Math.round((100-(a.score??50))*({saine:.6,vigilance:1.0,risque:1.3,critique:1.6}[zone]||1)*.85);
      const pc=prob>60?'#ef4444':prob>35?'#f59e0b':'#10b981';
      return `<div class="an-card ${zone} fu" data-id="${a.id}" style="position:relative;">
        <div class="an-score-big" style="color:${zc.s}">${a.score??'—'}</div>
        <div class="an-info">
          <div class="an-name">${a.entreprise??a.company??'Sans nom'}</div>
          <div class="an-meta">
            <i class="fa-solid fa-calendar" style="font-size:9px;opacity:.5;"></i>${date}
            <i class="fa-solid fa-circle" style="font-size:3px;opacity:.3;"></i>${model}
            ${a.confidence?`<i class="fa-solid fa-circle" style="font-size:3px;opacity:.3;"></i>Confiance ${a.confidence}%`:''}
          </div>
          <div style="margin-top:5px;font-size:9px;">
            <span style="color:rgba(255,255,255,.3);">Risque faillite : </span>
            <span style="color:${pc};font-weight:800;">${prob}%</span>
          </div>
        </div>
        <div class="an-badges" style="gap:6px;">
          <div class="an-zone-badge" style="background:${zc.bg};color:${zc.t};border:1px solid ${zc.s}44;">${zc.l}</div>
          <div style="display:flex;gap:5px;">
            <button class="an-open-btn" style="font-size:8px;padding:5px 12px;">Ouvrir →</button>
            <button class="an-del-btn" data-did="${a.id}" data-dnom="${a.entreprise??''}"
              style="padding:5px 8px;border-radius:6px;border:1px solid rgba(239,68,68,.2);
              background:rgba(239,68,68,.06);color:rgba(239,68,68,.6);font-size:9px;cursor:pointer;
              font-family:'Syne',sans-serif;transition:background .15s;"
              onmouseover="this.style.background='rgba(239,68,68,.18)'"
              onmouseout="this.style.background='rgba(239,68,68,.06)'">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');
    container.querySelectorAll('.an-card[data-id]').forEach(el=>{
      el.addEventListener('click',(e)=>{
        if(e.target.closest('.an-del-btn')) return;
        const found=S.analyses.find(a=>a.id===el.dataset.id);
        if(found){window.DS_DASH?.loadAnalyse(found); this.navTo('dashboard');}
      });
    });
    container.querySelectorAll('.an-del-btn').forEach(btn=>{
      btn.addEventListener('click',(e)=>{e.stopPropagation(); window.DS_EXTRA?.deleteAnalyse(btn.dataset.did,btn.dataset.dnom);});
    });
    fu();
  },

  // ── VUE : Rapports ───────────────────────────────────────────
  renderRapports() {
    const container=document.getElementById('rapports-list'); if(!container) return;
    if(!S.analyses.length){
      container.innerHTML=`<div class="rapports-empty">
        <i class="fa-solid fa-file-chart-column"></i>
        Aucun rapport disponible.<br>Lancez d'abord une analyse.</div>`; return;
    }
    const rapportTypes=[
      {key:'analyse',  icon:'fa-file-chart-column',color:'var(--ice)',   bg:'rgba(125,211,252,.1)',label:"Rapport d'analyse complet",ready:true},
      {key:'risque',   icon:'fa-shield-halved',     color:'var(--amber)', bg:'rgba(245,158,11,.1)', label:'Rapport de risque détaillé',ready:true},
      {key:'exec',     icon:'fa-file-lines',        color:'var(--gold)',  bg:'rgba(255,215,0,.1)',  label:'Synthèse exécutive (1 page)',ready:false},
      {key:'benchmark',icon:'fa-chart-bar',         color:'var(--violet)',bg:'rgba(139,92,246,.1)',label:'Benchmark sectoriel',ready:false},
    ];
    container.innerHTML=S.analyses.slice(0,5).map(a=>{
      const zone=a.zone??zoneFromScore(a.score??0), zc=ZC[zone];
      const date=window.DS_DASH?._tsToString(a.createdAt)??'';
      return rapportTypes.map(rt=>`
        <div class="rapport-card fu">
          <div class="rapport-icon" style="background:${rt.bg};color:${rt.color};">
            <i class="fa-solid ${rt.icon}"></i></div>
          <div class="rapport-info">
            <div class="rapport-name">${rt.label}</div>
            <div class="rapport-meta">
              ${a.entreprise??'Analyse'} · Score ${a.score??'—'}/100
              <span style="background:${zc.bg};color:${zc.t};border:1px solid ${zc.s}44;font-family:var(--fd);font-size:7px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border-radius:100px;margin-left:6px;">${zc.l}</span>
              · ${date}
            </div>
          </div>
          <div style="display:flex;gap:6px;">
          ${rt.ready
            ?`<button class="rapport-dl ready" onclick="DS?.downloadReport('${a.id}','${rt.key}')"><i class="fa-solid fa-download" style="margin-right:5px;"></i>Télécharger</button>`
            :`<button class="rapport-dl soon" disabled><i class="fa-solid fa-clock" style="margin-right:5px;"></i>Bientôt</button>`}
          ${rt.ready
            ?`<button onclick="DS_SHARE?.open('${a.id}')"
              style="padding:8px 14px;border-radius:8px;border:1px solid rgba(125,211,252,.25);
              background:rgba(125,211,252,.08);color:#7DD3FC;font-family:var(--fd);font-size:8px;
              font-weight:800;letter-spacing:.06em;cursor:pointer;transition:all .15s;"
              onmouseover="this.style.background='rgba(125,211,252,.18)'"
              onmouseout="this.style.background='rgba(125,211,252,.08)'">
              <i class="fa-solid fa-share-nodes" style="margin-right:5px;"></i>Partager
            </button>`
            :''}
          </div>
        </div>`).join('');
    }).join('');
    fu();
  },

  // ── VUE : Paramètres ─────────────────────────────────────────
  renderParametres() {
    const container=document.getElementById('parametres-content'); if(!container) return;
    const plan=S.abonnement?.plan||S.profile?.plan||'standard';
    const prenom=S.profile?.prenom||S.user?.displayName?.split(' ')[0]||'';
    const nom=S.profile?.nom||'';
    const email=S.user?.email||'—';
    const planLabels={standard:'Standard',premium:'Premium',extra:'Extra'};
    const photoURL=S.profile?.photoURL||S.user?.photoURL||null;
    const initials=([prenom?.[0],nom?.[0]].filter(Boolean).join('').toUpperCase())||'?';
    const fullName=[prenom,nom].filter(Boolean).join(' ')||'—';

    container.innerHTML=`

      <!-- ══ BLOC PHOTO DE PROFIL ══════════════════════════════ -->
      <div class="param-section" style="align-items:center;gap:0;">
        <div class="param-section-title" style="width:100%;">
          <i class="fa-solid fa-circle-user" style="color:var(--ice);margin-right:8px;"></i>Photo de profil
        </div>

        <!-- Zone photo centrale -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px 0 8px;width:100%;">

          <!-- Avatar grand format cliquable -->
          <div id="param-avatar-wrap"
            onclick="document.getElementById('param-photo-input').click()"
            style="
              width:100px;height:100px;border-radius:50%;
              background:linear-gradient(135deg,var(--gold),var(--ice));
              border:3px solid rgba(255,215,0,.38);
              box-shadow:0 0 0 6px rgba(255,215,0,.07),0 10px 36px rgba(0,0,0,.45);
              display:flex;align-items:center;justify-content:center;
              font-family:var(--fd);font-size:32px;font-weight:900;color:var(--bg);
              cursor:pointer;position:relative;overflow:hidden;
              transition:all .28s cubic-bezier(.34,1.56,.64,1);"
            onmouseenter="this.style.borderColor='rgba(125,211,252,.6)';this.style.boxShadow='0 0 0 8px rgba(125,211,252,.08),0 10px 36px rgba(0,0,0,.55)';document.getElementById('param-avatar-overlay').style.opacity='1';"
            onmouseleave="this.style.borderColor='rgba(255,215,0,.38)';this.style.boxShadow='0 0 0 6px rgba(255,215,0,.07),0 10px 36px rgba(0,0,0,.45)';document.getElementById('param-avatar-overlay').style.opacity='0';">

            ${photoURL
              ? `<img id="param-avatar-img" src="${escHtml(photoURL)}" alt="Photo de profil"
                  style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
              : `<span id="param-avatar-initials"
                  style="font-family:'Syne',sans-serif;font-size:32px;font-weight:900;
                  color:var(--bg);user-select:none;">${escHtml(initials)}</span>`
            }

            <!-- Overlay caméra au hover -->
            <div id="param-avatar-overlay"
              style="position:absolute;inset:0;border-radius:50%;
                background:rgba(2,4,11,.72);
                display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:5px;opacity:0;transition:opacity .22s;pointer-events:none;">
              <i class="fa-solid fa-camera" style="font-size:20px;color:#fff;"></i>
              <span style="font-family:'Syne',sans-serif;font-size:7px;font-weight:800;
                letter-spacing:.12em;color:rgba(255,255,255,.85);text-transform:uppercase;">Modifier</span>
            </div>
          </div>

          <!-- Nom affiché sous l'avatar -->
          <div style="text-align:center;line-height:1.3;">
            <div id="param-avatar-name"
              style="font-family:'Syne',sans-serif;font-size:15px;font-weight:900;color:#fff;">
              ${escHtml(fullName)}
            </div>
            <div style="font-size:9.5px;color:rgba(255,255,255,.32);margin-top:2px;">
              ${escHtml(email)}
            </div>
          </div>

          <!-- Boutons actions photo -->
          <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap;justify-content:center;">
            <button onclick="document.getElementById('param-photo-input').click()"
              style="display:flex;align-items:center;gap:7px;padding:9px 20px;
                border-radius:10px;background:rgba(125,211,252,.08);
                border:1px solid rgba(125,211,252,.22);
                color:#7DD3FC;font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
                letter-spacing:.1em;text-transform:uppercase;cursor:pointer;
                transition:all .2s cubic-bezier(.34,1.56,.64,1);"
              onmouseenter="this.style.background='rgba(125,211,252,.16)';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(125,211,252,.14)'"
              onmouseleave="this.style.background='rgba(125,211,252,.08)';this.style.transform='none';this.style.boxShadow='none'">
              <i class="fa-solid fa-camera"></i>
              ${photoURL ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            ${photoURL ? `
            <button onclick="DS_PROFILE?.removePhoto?.()"
              id="param-remove-photo-btn"
              style="display:flex;align-items:center;gap:7px;padding:9px 18px;
                border-radius:10px;background:rgba(239,68,68,.07);
                border:1px solid rgba(239,68,68,.18);
                color:#ef4444;font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
                letter-spacing:.1em;text-transform:uppercase;cursor:pointer;
                transition:all .18s;"
              onmouseenter="this.style.background='rgba(239,68,68,.15)'"
              onmouseleave="this.style.background='rgba(239,68,68,.07)'">
              <i class="fa-solid fa-trash"></i>Supprimer
            </button>` : ''}
          </div>

          <!-- Info format accepté -->
          <div style="font-size:8px;color:rgba(255,255,255,.2);text-align:center;line-height:1.8;">
            <i class="fa-solid fa-circle-info" style="margin-right:4px;opacity:.6;"></i>
            JPG · PNG · WEBP · GIF · max 5 Mo · compressée automatiquement à 400px
          </div>

          <!-- Zone statut upload (spinner, erreur, succès) -->
          <div id="param-upload-status" style="min-height:18px;"></div>
        </div>

        <!-- Input file caché — déclenché par les boutons -->
        <input type="file" id="param-photo-input" accept="image/*" style="display:none;"
          onchange="window._paramHandlePhotoUpload(this.files[0])">
      </div>
      <!-- ════════════════════════════════════════════════════════ -->

      <div class="param-section">
        <div class="param-section-title">Profil utilisateur</div>
        <div class="param-row">
          <div class="param-label">Prénom<small>Affiché dans le dashboard</small></div>
          <input class="param-input" id="param-prenom" value="${escHtml(prenom)}" placeholder="Votre prénom"
            oninput="(()=>{const n=(this.value.trim()||'—')+' '+(document.getElementById('param-nom')?.value.trim()||'');const el=document.getElementById('param-avatar-name');if(el)el.textContent=n.trim()||'—';})()">
        </div>
        <div class="param-row">
          <div class="param-label">Nom<small>Nom de famille</small></div>
          <input class="param-input" id="param-nom" value="${escHtml(nom)}" placeholder="Votre nom"
            oninput="(()=>{const n=(document.getElementById('param-prenom')?.value.trim()||'—')+' '+this.value.trim();const el=document.getElementById('param-avatar-name');if(el)el.textContent=n.trim()||'—';})()">
        </div>
        <div class="param-row">
          <div class="param-label">Email<small>Adresse de connexion</small></div>
          <div class="param-value" style="color:var(--muted)">${escHtml(email)}</div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:4px;">
          <button class="param-btn primary" onclick="DS?.saveProfile()">
            <i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i>Enregistrer
          </button>
        </div>
      </div>

      <div class="param-section">
        <div class="param-section-title">Abonnement</div>
        <div class="param-row"><div class="param-label">Plan actuel<small>Détermine vos fonctionnalités</small></div><div class="param-value"><span class="badge ${plan}" style="font-size:9px;">${planLabels[plan]??plan}</span></div></div>
        <div class="param-row"><div class="param-label">Analyses ce mois<small>Quota selon votre plan</small></div><div class="param-value" style="color:var(--ice);">${S.analyses.length}</div></div>
        ${plan!=='extra'?`<div class="plan-upgrade-banner" style="margin-top:4px;">
          <div><div class="plan-upgrade-text">${plan==='standard'?'⚡ Passez Premium à 79€/mois':'🚀 Passez Extra à 159€/mois'}</div>
          <div class="plan-upgrade-text"><small>${plan==='standard'?'Débloquez le simulateur What-If, l\'historique illimité et les rapports PDF':'API accès direct, analyses illimitées, support prioritaire'}</small></div></div>
          <button class="param-btn primary" onclick="DS?.showToastUpgrade()">Upgrader →</button></div>`
        :`<div class="param-row"><div class="param-label">Statut<small>Votre compte est au niveau maximum</small></div><div class="param-value" style="color:#a78bfa;">✦ Extra — Accès complet</div></div>`}
      </div>

      <div class="param-section">
        <div class="param-section-title">Sécurité</div>
        <div class="param-row">
          <div class="param-label">Mot de passe<small>Connecté via ${S.user?.providerData?.[0]?.providerId==='google.com'?'Google OAuth':'Email/Mot de passe'}</small></div>
          ${S.user?.providerData?.[0]?.providerId==='google.com'
            ?'<div class="param-value" style="color:var(--muted);font-size:10px;">Géré par Google</div>'
            :'<button class="param-btn neutral" onclick="DS?.changePasswordFlow()"><i class="fa-solid fa-key" style="margin-right:6px;"></i>Modifier</button>'}
        </div>
        <div class="param-row">
          <div class="param-label">Déconnexion<small>Ferme la session sur cet appareil</small></div>
          <button class="param-btn danger" onclick="window.DS_LOGOUT?.()"><i class="fa-solid fa-right-from-bracket" style="margin-right:6px;"></i>Se déconnecter</button>
        </div>
      </div>

      <div class="param-section" style="border-color:rgba(255,255,255,.03);">
        <div class="param-section-title">À propos</div>
        <div class="param-row"><div class="param-label">Version</div><div class="param-value" style="color:var(--muted);font-family:var(--fm);font-size:10px;">v2.1.0 · Frontend</div></div>
        <div class="param-row"><div class="param-label">Modèle ML</div><div class="param-value" style="color:var(--muted);font-size:10px;">RF + XGBoost + LightGBM · Ensemble</div></div>
      </div>`;

    // ── Handler upload photo depuis la vue Paramètres ──────────
    window._paramHandlePhotoUpload = async (file) => {
      if (!file) return;
      const statusEl = document.getElementById('param-upload-status');
      const wrap     = document.getElementById('param-avatar-wrap');

      // Validation
      if (file.size > 5 * 1024 * 1024) { showToast('Photo trop lourde (max 5 Mo)', 'warn'); return; }
      if (!file.type.startsWith('image/')) { showToast('Format non supporté', 'err'); return; }

      // Prévisualisation immédiate locale (UX fluide)
      const localURL = URL.createObjectURL(file);
      if (wrap) {
        wrap.innerHTML = `
          <img src="${localURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">
          <div id="param-avatar-overlay" style="position:absolute;inset:0;border-radius:50%;background:rgba(2,4,11,.72);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;opacity:0;transition:opacity .22s;pointer-events:none;">
            <i class="fa-solid fa-camera" style="font-size:20px;color:#fff;"></i>
            <span style="font-family:'Syne',sans-serif;font-size:7px;font-weight:800;letter-spacing:.12em;color:rgba(255,255,255,.85);text-transform:uppercase;">Modifier</span>
          </div>`;
      }
      if (statusEl) statusEl.innerHTML = `<div style="display:flex;align-items:center;gap:6px;font-size:9px;color:var(--ice);font-family:'Syne',sans-serif;font-weight:700;"><i class="fa-solid fa-circle-notch fa-spin"></i>Envoi en cours…</div>`;

      // Déléguer à DS_PROFILE qui gère compression + Firestore + nav-avatar
      try {
        await window.DS_PROFILE?.handlePhotoUpload(file);
        if (statusEl) statusEl.innerHTML = `<div style="font-size:9px;color:#10b981;font-family:'Syne',sans-serif;font-weight:700;"><i class="fa-solid fa-circle-check" style="margin-right:5px;"></i>Photo mise à jour</div>`;
        setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
        // Rafraîchir le bouton Changer/Supprimer
        setTimeout(() => this.renderParametres(), 1200);
      } catch {
        if (statusEl) statusEl.innerHTML = `<div style="font-size:9px;color:#ef4444;font-family:'Syne',sans-serif;font-weight:700;"><i class="fa-solid fa-circle-xmark" style="margin-right:5px;"></i>Erreur upload</div>`;
        setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
      }
      URL.revokeObjectURL(localURL);
    };
  },

  // ── VUE : Alertes ────────────────────────────────────────────
  renderAlertes() {
    const container=document.getElementById('alertes-content'); if(!container) return;
    const a=S.currentAnalyse;
    const { normalizeRatios, normalizeRecos } = window.DS_RENDER;
    const ratios=a?normalizeRatios(a.ratios||[]):[];
    const recos=a?normalizeRecos(a.recommendations||[]):[];
    const alerts=[];
    if(a){
      const redRatios=ratios.filter(r=>r.c==='#ef4444');
      if(redRatios.length>=2) alerts.push({lvl:'err',icon:'fa-triangle-exclamation',title:`${redRatios.length} ratios critiques détectés`,detail:redRatios.map(r=>r.n).join(', ')});
      if(a.score<25) alerts.push({lvl:'err',icon:'fa-skull',title:'Score critique < 25 — Urgence absolue',detail:`Score actuel : ${a.score}/100`});
      else if(a.score<50) alerts.push({lvl:'warn',icon:'fa-triangle-exclamation',title:'Zone Risque — Action requise',detail:`Score ${a.score}/100 — en dessous du seuil de vigilance`});
      if((a.probabiliteDefaut??0)>60) alerts.push({lvl:'err',icon:'fa-circle-exclamation',title:`Probabilité de faillite élevée : ${a.probabiliteDefaut}%`,detail:'Dépassement du seuil critique 60%'});
      recos.filter(r=>r.lvl==='high').forEach(r=>alerts.push({lvl:'warn',icon:'fa-lightbulb',title:r.t,detail:r.d}));
      if(!alerts.length) alerts.push({lvl:'ok',icon:'fa-circle-check',title:'Aucune alerte critique',detail:`Score ${a.score}/100 — Situation financière satisfaisante`});
    }
    const notifs=window.DS_NOTIFS._state.list.slice(0,10);
    const C={err:'#ef4444',warn:'#f59e0b',ok:'#10b981',info:'#7DD3FC'};
    container.innerHTML=`
      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;margin-right:8px;"></i>Alertes analyse courante
          ${a?`<span style="font-size:9px;color:var(--muted);margin-left:8px;">${escHtml(a.entreprise??'')} · Score ${a.score}/100</span>`:''}
        </div>
        ${!a?`<div style="padding:20px;text-align:center;font-size:10px;color:var(--muted);">
          <i class="fa-solid fa-file-chart-column" style="display:block;font-size:24px;margin-bottom:10px;opacity:.2;"></i>
          Chargez une analyse pour voir les alertes</div>`
        :alerts.map(al=>`
          <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04);">
            <div style="width:34px;height:34px;border-radius:9px;background:${C[al.lvl]}18;color:${C[al.lvl]};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid ${al.icon}"></i></div>
            <div>
              <div style="font-family:var(--fd);font-size:10px;font-weight:800;color:#fff;margin-bottom:3px;">${escHtml(al.title)}</div>
              <div style="font-size:9px;color:var(--muted);">${escHtml(al.detail)}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-bell" style="color:#7DD3FC;margin-right:8px;"></i>Notifications système
          <span style="font-size:9px;color:var(--muted);margin-left:8px;">Synchronisées Firebase</span>
        </div>
        ${notifs.length?notifs.map(n=>{
          const dt=n.createdAt?.toDate?n.createdAt.toDate():new Date();
          const ago=msToHuman(Date.now()-dt);
          return `<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04);opacity:${n.read?'.55':'1'};">
            <div style="width:34px;height:34px;border-radius:9px;background:${n.color??'#7DD3FC'}18;color:${n.color??'#7DD3FC'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid ${n.icon??'fa-bell'}"></i></div>
            <div style="flex:1;">
              <div style="font-family:var(--fd);font-size:10px;font-weight:800;color:#fff;margin-bottom:2px;">${escHtml(n.title??'')}</div>
              <div style="font-size:9px;color:var(--muted);">${escHtml(n.body??'')}</div>
              <div style="font-size:8px;color:rgba(255,255,255,.2);margin-top:2px;">${ago}</div>
            </div>
            ${n.read?'':'<span style="width:7px;height:7px;background:#7DD3FC;border-radius:50%;flex-shrink:0;margin-top:6px;"></span>'}
          </div>`;}).join('')
        :`<div style="padding:20px;text-align:center;font-size:10px;color:var(--muted);">Aucune notification pour le moment</div>`}
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="param-btn neutral" onclick="DS_NOTIFS.markAllRead().then(()=>DS_VIEWS.navTo('alertes'))" style="flex:1;">
            <i class="fa-solid fa-check-double" style="margin-right:6px;"></i>Tout marquer lu
          </button>
        </div>
      </div>`;
  },

  // ── VUE : Benchmark ─────────────────────────────────────────
  renderBenchmark() {
    const container=document.getElementById('benchmark-content'); if(!container) return;
    const a=S.currentAnalyse;
    const { normalizeRatios } = window.DS_RENDER;
    const ratios=a?normalizeRatios(a.ratios||[]):[];
    const SECTORS={
      'Industrie':   {liquidite:1.45,marge:5.2, roe:9.8, endettement:0.72,rotation:1.1,bfr:18},
      'Commerce':    {liquidite:1.22,marge:3.1, roe:11.2,endettement:0.85,rotation:2.4,bfr:24},
      'Services':    {liquidite:1.68,marge:8.5, roe:14.5,endettement:0.55,rotation:0.9,bfr:12},
      'Tech / SaaS': {liquidite:2.1, marge:15.3,roe:18.2,endettement:0.38,rotation:0.7,bfr:8 },
      'BTP':         {liquidite:1.35,marge:4.1, roe:10.3,endettement:0.68,rotation:1.4,bfr:32},
      'Hôtellerie':  {liquidite:0.95,marge:6.8, roe:8.1, endettement:1.1, rotation:0.8,bfr:-5},
    };
    const plan=S.abonnement?.plan||'standard';
    const sel=S._benchmarkSector||'Services';
    const bench=SECTORS[sel]||SECTORS['Services'];
    const RATIO_MAP=[
      {key:'liquidite',   label:'Liquidité générale',unit:'', ratio:ratios.find(r=>r.n.toLowerCase().includes('liquid'))?.v},
      {key:'marge',       label:'Marge nette',       unit:'%',ratio:ratios.find(r=>r.n.toLowerCase().includes('marge'))?.v},
      {key:'roe',         label:'ROE',               unit:'%',ratio:ratios.find(r=>r.n.toLowerCase().includes('roe')||r.n.toLowerCase().includes('rentabilit'))?.v},
      {key:'endettement', label:'Endettement',       unit:'', ratio:ratios.find(r=>r.n.toLowerCase().includes('endet'))?.v},
      {key:'rotation',    label:'Rotation actifs',   unit:'', ratio:ratios.find(r=>r.n.toLowerCase().includes('rotation'))?.v},
      {key:'bfr',         label:'BFR / CA',          unit:'%',ratio:ratios.find(r=>r.n.toLowerCase().includes('bfr'))?.v},
    ];
    container.innerHTML=`
      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-chart-bar" style="color:#a78bfa;margin-right:8px;"></i>Benchmark sectoriel
          <span style="font-size:9px;color:var(--muted);margin-left:8px;">Source : Banque de France / INSEE 2024</span>
        </div>
        <div class="param-row">
          <div class="param-label">Secteur de référence<small>Choisissez votre secteur d'activité</small></div>
          <select id="bench-sector" class="param-input" style="max-width:180px;cursor:pointer;"
            onchange="window.S._benchmarkSector=this.value;DS_VIEWS.navTo('benchmark')">
            ${Object.keys(SECTORS).map(s=>`<option value="${s}" ${s===sel?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="param-section">
        <div class="param-section-title">Comparaison avec la médiane ${sel}</div>
        ${!a?`<div style="padding:20px;text-align:center;font-size:10px;color:var(--muted);">
          <i class="fa-solid fa-chart-bar" style="display:block;font-size:24px;margin-bottom:10px;opacity:.2;"></i>
          Chargez une analyse pour comparer</div>`
        :`<div style="overflow-x:auto;">
           <table style="width:100%;border-collapse:collapse;">
             <thead><tr>
               <th style="text-align:left;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);background:rgba(255,255,255,.02);">Ratio</th>
               <th style="text-align:center;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#7DD3FC;background:rgba(255,255,255,.02);">Votre valeur</th>
               <th style="text-align:center;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#FFD700;background:rgba(255,255,255,.02);">Médiane secteur</th>
               <th style="text-align:center;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);background:rgba(255,255,255,.02);">Écart</th>
               <th style="text-align:left;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);background:rgba(255,255,255,.02);">Position</th>
             </tr></thead>
             <tbody>
               ${RATIO_MAP.map(rm=>{
                 const yours=rm.ratio!=null?+rm.ratio:null, ref=bench[rm.key];
                 const diff=yours!=null?+(yours-ref).toFixed(2):null;
                 const inverse=rm.key==='endettement'||rm.key==='bfr';
                 const better=diff!=null?(inverse?diff<0:diff>0):null;
                 const col=better===null?'var(--muted)':better?'#10b981':'#ef4444';
                 const posLabel=better===null?'—':better?`<span style="color:#10b981;font-weight:800;">✓ Au-dessus</span>`:`<span style="color:#ef4444;font-weight:800;">↓ En dessous</span>`;
                 return `<tr style="border-bottom:1px solid rgba(255,255,255,.04);">
                   <td style="padding:10px;font-size:10px;color:rgba(255,255,255,.7);">${rm.label}</td>
                   <td style="text-align:center;padding:10px;font-family:var(--fd);font-size:12px;font-weight:800;color:${col};">${yours!=null?yours+rm.unit:'<span style="color:var(--muted);">—</span>'}</td>
                   <td style="text-align:center;padding:10px;font-family:var(--fd);font-size:12px;font-weight:800;color:#FFD700;">${ref}${rm.unit}</td>
                   <td style="text-align:center;padding:10px;font-family:var(--fd);font-size:11px;font-weight:800;color:${col};">${diff!=null?(diff>=0?'+':'')+diff+rm.unit:'—'}</td>
                   <td style="padding:10px;font-size:10px;">${posLabel}</td>
                 </tr>`;
               }).join('')}
             </tbody>
           </table></div>
         <div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.15);font-size:9px;color:rgba(255,255,255,.45);line-height:1.6;">
           <i class="fa-solid fa-circle-info" style="color:#a78bfa;margin-right:6px;"></i>
           Médianes calculées sur les entreprises françaises du secteur <strong style="color:#a78bfa;">${sel}</strong>.
           Sources : Banque de France FIBEN 2024, INSEE enquêtes sectorielles.
           ${plan==='standard'?'⚡ Passez <strong>Premium</strong> pour les benchmarks par tranche de CA et région.':''}
         </div>`}
      </div>
      ${a?`
      <div class="param-section">
        <div class="param-section-title">Positionnement global vs. secteur</div>
        ${(()=>{
          const betterCount=RATIO_MAP.filter(rm=>{if(rm.ratio==null)return false;const inv=rm.key==='endettement'||rm.key==='bfr';return inv?rm.ratio<bench[rm.key]:rm.ratio>bench[rm.key];}).length;
          const total=RATIO_MAP.filter(rm=>rm.ratio!=null).length;
          const pct=total?Math.round(betterCount/total*100):0;
          const col=pct>=60?'#10b981':pct>=40?'#f59e0b':'#ef4444';
          return `<div style="display:flex;align-items:center;gap:16px;padding:4px 0;">
            <div style="font-family:var(--fd);font-size:42px;font-weight:900;color:${col};">${pct}%</div>
            <div>
              <div style="font-size:11px;color:#fff;font-weight:700;margin-bottom:4px;">${betterCount} ratio${betterCount>1?'s':''} sur ${total} au-dessus de la médiane sectorielle</div>
              <div style="font-size:9px;color:var(--muted);">${pct>=60?'Profil financier supérieur à la médiane du secteur':pct>=40?'Profil dans la moyenne sectorielle':'Profil en dessous de la médiane — axes d\'amélioration identifiés'}</div>
            </div>
          </div>
          <div style="background:rgba(255,255,255,.06);border-radius:6px;height:8px;margin-top:12px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${col};border-radius:6px;transition:width .8s;"></div>
          </div>`;
        })()}
      </div>` : ''}`;
  },

  // ── VUE : Visualisations avancées ────────────────────────────
  renderVisualisations() {
    const X=window.DS_EXTRA;
    if(!X){setTimeout(()=>this.renderVisualisations(),200);return;}
    const analyse=window._lastAnalyse??S.currentAnalyse;
    const score=window._lastScore??S.currentAnalyse?.score??0;
    const zone=window._lastZone??(S.currentAnalyse?zoneFromScore(score):'vigilance');
    const { normalizeRatios, normalizeRadar } = window.DS_RENDER;
    const ratios=window._lastRatios??normalizeRatios(S.currentAnalyse?.ratios??[]);
    const radar=normalizeRadar(S.currentAnalyse?.radarDimensions??S.currentAnalyse?.radar??[]);
    const shap=S.currentAnalyse?.shapValues??[];
    const tl=window._lastTimeline??(score>0?[score]:[]);
    const ZM={saine:.6,vigilance:1.0,risque:1.3,critique:1.6};
    const prob=Math.round((100-score)*(ZM[zone]||1)*0.85);
    const ZC_col={saine:'#10b981',vigilance:'#f59e0b',risque:'#f97316',critique:'#ef4444'};
    const ZC_lbl={saine:'Zone Saine',vigilance:'Zone Vigilance',risque:'Zone Risque',critique:'Zone Critique'};
    const col=ZC_col[zone]||'#f59e0b';

    ['gauge-3d','globe-3d','bar-3d'].forEach(id=>{
      const el=document.getElementById(id);
      if(el?._dsCleanup){try{el._dsCleanup();}catch(e){}delete el._dsCleanup;}
      if(el) el.innerHTML='';
    });

    const empty=document.getElementById('viz-empty'), content=document.getElementById('viz-content'), sub=document.getElementById('viz-sub');
    if(!S.currentAnalyse){
      if(empty) empty.style.display='block';
      if(content) content.style.display='none';
      if(sub) sub.textContent='Chargez une analyse pour afficher les graphes';
      return;
    }
    if(empty) empty.style.display='none';
    if(content) content.style.display='block';
    if(sub) sub.textContent=(analyse?.entreprise??'—')+'  ·  Score '+score+'/100  ·  '+(ZC_lbl[zone]??zone);

    const fpBig=document.getElementById('fail-pct-big'), fpBadge=document.getElementById('fail-zone-badge');
    if(fpBig){fpBig.textContent=prob+'%'; fpBig.style.color=prob>60?'#ef4444':prob>35?'#f97316':prob>20?'#f59e0b':'#10b981';}
    if(fpBadge){fpBadge.textContent=ZC_lbl[zone]??zone; fpBadge.style.color=col; fpBadge.style.background=col+'18'; fpBadge.style.borderColor=col+'44';}

    const tlBtn=document.getElementById('tl-chat-btn');
    if(tlBtn) tlBtn.onclick=()=>window.DS_CHAT?._sendToChat(`Explique l'évolution du score ${tl.join(', ')} sur ${tl.length} période${tl.length>1?'s':''}. Quelles tendances observes-tu ?`);

    requestAnimationFrame(()=>{
      X.renderTimelineFixed(tl.length>=1?tl:[score],'tl-svg-extra');
      X.renderHeatmap('heatmap-ratios',ratios);
      X.renderFailureForecast('forecast-chart',score,zone);
      setTimeout(()=>X.renderScoreDonut('score-donut',score,zone),60);
      setTimeout(()=>X.renderRadarChart('radar-chart',radar.length?radar:normalizeRadar(S.currentAnalyse?.radarDimensions??[])),120);
      setTimeout(()=>X.renderWaterfallChart('waterfall-chart',shap),180);
      setTimeout(()=>X.renderBulletRatios('bullet-chart',ratios),240);
      if(window.THREE){
        setTimeout(()=>X.render3DGauge('gauge-3d',prob,zone),350);
        setTimeout(()=>X.render3DGlobe('globe-3d',score,zone),500);
        setTimeout(()=>X.render3DBarChart('bar-3d',ratios),650);
      }
      setTimeout(()=>X.initAlerts(analyse),900);
    });
  },
};

console.log('[ds-views] ✓ Chargé');