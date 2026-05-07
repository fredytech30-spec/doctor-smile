// ════════════════════════════════════════════════════════════════
//  ds-notifs.js — Doctor Smile
//  Notifications Firebase temps réel + Messagerie inter-utilisateurs
// ════════════════════════════════════════════════════════════════

window.DS_NOTIFS = {

  _state: { list:[], _unsub:null, _badgeEl:null, _panelOpen:false },
  _msg:   { recipients:[], searchTimer:null, history:[], _sentUnsub:null },

  // ── Init notifications Firebase ──────────────────────────────
  async init(uid) {
    try {
      const { db } = await import('./firebase-config.js');
      const { collection, query, orderBy, limit, onSnapshot,
              addDoc, serverTimestamp } = await import(
                'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

      const q = query(collection(db,'notifications',uid,'items'), orderBy('createdAt','desc'), limit(30));
      if (this._state._unsub) this._state._unsub();
      this._state._unsub = onSnapshot(q, (snap) => {
        this._state.list = snap.docs.map(d=>({id:d.id,...d.data()}));
        this._updateBadge();
        if (this._state._panelOpen) this._renderPanel();
      }, (err) => {
        if (err.code==='failed-precondition') this._seedWelcome(uid,db,collection,addDoc,serverTimestamp);
      });

      window._DS_notifyAnalyseDone = async (analyse) => {
        try {
          await addDoc(collection(db,'notifications',uid,'items'),{
            type:'analyse', title:`Analyse terminée — ${analyse.entreprise??'Entreprise'}`,
            body:`Score ${analyse.score}/100 · Zone ${analyse.zone??'—'} · Modèle ${analyse.model??'ML'}`,
            icon:'fa-circle-check',
            color:analyse.score>=75?'#10b981':analyse.score>=50?'#f59e0b':'#ef4444',
            analyseId:analyse.id, read:false, createdAt:serverTimestamp(),
          });
        } catch {}
      };

      this._loadSentHistory(uid,db,collection,query,orderBy,limit,onSnapshot);

    } catch(e) {
      console.warn('[Notifications] Firestore indisponible',e);
      this._localFallback();
    }
  },

  async _seedWelcome(uid,db,collection,addDoc,serverTimestamp) {
    try { await addDoc(collection(db,'notifications',uid,'items'),{ type:'system',
      title:'Bienvenue sur Doctor Smile ✦', body:'Chargez votre premier bilan pour obtenir votre Doctor Score™.',
      icon:'fa-sparkles', color:'#7DD3FC', read:false, createdAt:serverTimestamp() }); } catch {}
  },

  _localFallback() {
    const a=S.currentAnalyse; if(!a) return;
    if(a.score<50) this._state.list=[{id:'l1',title:'Zone risque détectée',
      body:`Score ${a.score}/100`,icon:'fa-triangle-exclamation',color:'#f97316',read:false,createdAt:new Date()}];
    this._updateBadge();
  },

  // ── Badge ────────────────────────────────────────────────────
  _updateBadge() {
    const unread=this._state.list.filter(n=>!n.read).length;
    let badge=document.getElementById('notif-badge');
    if(!badge){
      const bell=document.getElementById('notif-bell'); if(!bell) return;
      badge=document.createElement('span'); badge.id='notif-badge';
      badge.style.cssText='position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;'+
        'background:#ef4444;border-radius:8px;font-size:8px;font-weight:900;color:#fff;'+
        'display:flex;align-items:center;justify-content:center;padding:0 3px;'+
        'border:2px solid rgba(8,12,22,.9);z-index:3;pointer-events:none;transition:transform .2s;';
      bell.appendChild(badge);
    }
    if(unread>0){ badge.textContent=unread>9?'9+':unread; badge.style.display='flex'; badge.style.transform='scale(1)'; }
    else { badge.style.transform='scale(0)'; setTimeout(()=>{badge.style.display='none';},200); }
    this._state._badgeEl=badge;
  },

  // ── Panel notifications ──────────────────────────────────────
  async togglePanel() {
    const existing=document.getElementById('_notif_panel');
    if(existing){existing.remove();this._state._panelOpen=false;return;}
    this._state._panelOpen=true; this._renderPanel();
    setTimeout(()=>this.markAllRead(),1500);
  },

  _renderPanel() {
    const old=document.getElementById('_notif_panel'); if(old) old.remove();
    const panel=document.createElement('div'); panel.id='_notif_panel';
    panel.style.cssText='position:fixed;top:56px;right:16px;width:320px;max-height:480px;overflow-y:auto;'+
      'z-index:9500;background:rgba(6,10,20,.98);border:1px solid rgba(125,211,252,.15);'+
      'border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.7);backdrop-filter:blur(20px);'+
      'animation:mIn .22s cubic-bezier(.16,1,.3,1);';

    const items=this._state.list.length
      ? this._state.list.map(n=>{
          const dt=n.createdAt?.toDate?n.createdAt.toDate():(n.createdAt?new Date(n.createdAt):new Date());
          const ago=msToHuman(Date.now()-dt);
          const dot=!n.read?`<span style="width:7px;height:7px;background:#7DD3FC;border-radius:50%;flex-shrink:0;margin-top:3px;"></span>`:'';
          return `<div class="_ni" data-nid="${n.id}" style="display:flex;gap:10px;padding:12px 16px;
            border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;
            background:${n.read?'transparent':'rgba(125,211,252,.04)'};transition:background .15s;"
            onmouseenter="this.style.background='rgba(125,211,252,.07)'"
            onmouseleave="this.style.background='${n.read?'transparent':'rgba(125,211,252,.04)'}'">
            <div style="width:32px;height:32px;border-radius:8px;background:${n.color??'#7DD3FC'}18;
              color:${n.color??'#7DD3FC'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;">
              <i class="fa-solid ${n.icon??'fa-bell'}"></i></div>
            <div style="flex:1;min-width:0;">
              <div style="font-family:Syne,sans-serif;font-size:10px;font-weight:800;color:#fff;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${escHtml(n.title??'')}</div>
              <div style="font-size:9px;color:rgba(255,255,255,.4);line-height:1.4;">${escHtml(n.body??'')}</div>
              <div style="font-size:8px;color:rgba(255,255,255,.2);margin-top:3px;">${ago}</div>
            </div>${dot}</div>`;
        }).join('')
      : `<div style="padding:32px;text-align:center;">
           <i class="fa-solid fa-bell-slash" style="font-size:22px;color:rgba(255,255,255,.1);display:block;margin-bottom:10px;"></i>
           <div style="font-size:10px;color:rgba(255,255,255,.2);">Aucune notification</div>
         </div>`;

    const unreadCount=this._state.list.filter(n=>!n.read).length;
    panel.innerHTML=`
      <div style="padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,.06);
        display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;
        background:rgba(6,10,20,.98);z-index:2;">
        <div style="font-family:Syne,sans-serif;font-size:12px;font-weight:900;color:#fff;">
          <i class="fa-solid fa-bell" style="color:#7DD3FC;margin-right:7px;"></i>Notifications
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${unreadCount?`<button onclick="DS_NOTIFS.markAllRead()" style="font-size:8px;color:#7DD3FC;
              background:rgba(125,211,252,.08);border:1px solid rgba(125,211,252,.2);
              border-radius:6px;padding:3px 8px;cursor:pointer;font-family:Syne,sans-serif;">Tout lire</button>`:''}
          <button onclick="document.getElementById('_notif_panel')?.remove()"
            style="background:rgba(255,255,255,.07);border:none;border-radius:6px;padding:4px 8px;color:rgba(255,255,255,.4);cursor:pointer;">✕</button>
        </div>
      </div>
      <div id="_ni_list">${items}</div>`;

    document.body.appendChild(panel);
    panel.querySelectorAll('._ni[data-nid]').forEach(el=>{
      el.addEventListener('click',()=>{
        const notif=this._state.list.find(n=>n.id===el.dataset.nid);
        if(notif?.analyseId){ const a=S.analyses.find(x=>x.id===notif.analyseId);
          if(a){window.DS_DASH?.navTo('dashboard');window.DS_DASH?.loadAnalyse(a);} }
        panel.remove(); this._state._panelOpen=false;
      });
    });
    setTimeout(()=>{
      document.addEventListener('click',function _h(e){
        const bell=document.getElementById('notif-bell');
        if(!panel.contains(e.target)&&!bell?.contains(e.target)){
          panel.remove(); window.DS_NOTIFS._state._panelOpen=false; document.removeEventListener('click',_h); }
      });
    },150);
  },

  async markAllRead() {
    try {
      const {db}=await import('./firebase-config.js');
      const {doc,updateDoc}=await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const uid=S.user?.uid; if(!uid) return;
      await Promise.all(this._state.list.filter(n=>!n.read).map(n=>updateDoc(doc(db,'notifications',uid,'items',n.id),{read:true})));
    } catch {
      this._state.list.forEach(n=>n.read=true);
      this._updateBadge();
      if(this._state._panelOpen) this._renderPanel();
    }
  },

  // ════════════════════════════════════════════════════════════
  //  MESSAGERIE — Recherche utilisateurs
  // ════════════════════════════════════════════════════════════
  searchUsers(q) {
    const resultsEl=document.getElementById('msg-search-results');
    if(!resultsEl) return;
    if(!q||q.trim().length<2){ resultsEl.style.display='none'; return; }

    clearTimeout(this._msg.searchTimer);
    this._msg.searchTimer=setTimeout(async ()=>{
      resultsEl.style.display='block';
      resultsEl.innerHTML=`<div style="padding:14px;text-align:center;">
        <i class="fa-solid fa-spinner fa-spin" style="color:#7DD3FC;font-size:14px;"></i></div>`;
      try {
        const {db}=await import('./firebase-config.js');
        const {collection,getDocs,query:fbQ,orderBy,limit}=
          await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const myUid=S.user?.uid||S.uid;
        const qLow=q.trim().toLowerCase();
        const snap=await getDocs(fbQ(collection(db,'users'),orderBy('displayName'),limit(30)));
        const found=snap.docs.map(d=>({uid:d.id,...d.data()}))
          .filter(u=>u.uid!==myUid&&(
            (u.displayName||'').toLowerCase().includes(qLow)||
            (u.email||'').toLowerCase().includes(qLow)
          ));

        if(!found.length){
          resultsEl.innerHTML=`<div style="padding:14px;text-align:center;font-size:10px;color:rgba(255,255,255,.3);">
            Aucun utilisateur trouvé pour « ${escHtml(q.trim())} »</div>`; return; }

        resultsEl.innerHTML=found.map(u=>{
          const sel=this._msg.recipients.some(r=>r.uid===u.uid);
          const ini=(u.displayName||u.email||'?').charAt(0).toUpperCase();
          return `<div data-uid="${u.uid}"
            style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;
            transition:background .12s;${sel?'opacity:.4;pointer-events:none;':''}"
            onmouseenter="this.style.background='rgba(125,211,252,.07)'"
            onmouseleave="this.style.background=''"
            onclick="DS_NOTIFS.addRecipient('${u.uid}','${(u.displayName||'').replace(/'/g,"\\'")}','${(u.email||'').replace(/'/g,"\\'")}','${(u.photoURL||'').replace(/'/g,"\\'")}')">
            <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;overflow:hidden;
              background:rgba(125,211,252,.12);border:1px solid rgba(125,211,252,.2);
              display:flex;align-items:center;justify-content:center;
              font-family:'Syne',sans-serif;font-size:12px;font-weight:900;color:#7DD3FC;">
              ${u.photoURL?`<img src="${escHtml(u.photoURL)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`:ini}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;color:#fff;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${escHtml(u.displayName||'(Sans nom)')}
                ${sel?'<span style="color:#10b981;font-size:8px;margin-left:5px;">✓</span>':''}
              </div>
              <div style="font-size:9px;color:rgba(255,255,255,.35);
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(u.email||'')}</div>
            </div>
            ${!sel?'<i class="fa-solid fa-plus" style="font-size:10px;color:rgba(125,211,252,.5);flex-shrink:0;"></i>':''}
          </div>`;
        }).join('');

      } catch(e) {
        console.warn('[MSG] searchUsers error:',e);
        resultsEl.innerHTML=`<div style="padding:14px;text-align:center;font-size:10px;color:rgba(239,68,68,.6);">
          Erreur de chargement</div>`;
      }
    },280);
  },

  addRecipient(uid,displayName,email,photoURL) {
    if(this._msg.recipients.some(r=>r.uid===uid)) return;
    this._msg.recipients.push({uid,displayName,email,photoURL});
    const r=document.getElementById('msg-search-results');
    if(r) r.style.display='none';
    const s=document.getElementById('msg-search');
    if(s) s.value='';
    this._renderRecipients();
    this._showComposeArea();
  },

  removeRecipient(uid) {
    this._msg.recipients=this._msg.recipients.filter(r=>r.uid!==uid);
    this._renderRecipients();
    if(!this._msg.recipients.length) this._hideComposeArea();
  },

  _renderRecipients() {
    const c=document.getElementById('msg-recipients');
    const cnt=document.getElementById('msg-recipients-count');
    if(!c) return;
    const n=this._msg.recipients.length;
    if(!n){ c.innerHTML=''; c.style.marginBottom='0'; if(cnt) cnt.textContent=''; return; }
    c.style.marginBottom='10px';
    c.innerHTML=this._msg.recipients.map(r=>`
      <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 6px;
        border-radius:100px;background:rgba(125,211,252,.1);border:1px solid rgba(125,211,252,.22);">
        <div style="width:20px;height:20px;border-radius:50%;overflow:hidden;
          background:rgba(125,211,252,.15);display:flex;align-items:center;justify-content:center;
          font-family:'Syne',sans-serif;font-size:9px;font-weight:900;color:#7DD3FC;flex-shrink:0;">
          ${r.photoURL?`<img src="${escHtml(r.photoURL)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`:(r.displayName||r.email||'?').charAt(0).toUpperCase()}
        </div>
        <span style="font-family:'Syne',sans-serif;font-size:9px;font-weight:700;color:#7DD3FC;
          max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${escHtml(r.displayName||r.email)}</span>
        <button onclick="DS_NOTIFS.removeRecipient('${r.uid}')"
          style="background:none;border:none;color:rgba(125,211,252,.5);cursor:pointer;font-size:12px;
          line-height:1;padding:0;transition:color .12s;"
          onmouseenter="this.style.color='#ef4444'"
          onmouseleave="this.style.color='rgba(125,211,252,.5)'">×</button>
      </div>`).join('');
    if(cnt) cnt.textContent=n===1?'1 destinataire':`${n} destinataires`;
  },

  _showComposeArea() {
    const a=document.getElementById('msg-compose-area');
    if(a&&a.style.display==='none'){
      a.style.display='block'; a.style.animation='mIn .2s cubic-bezier(.16,1,.3,1)';
      setTimeout(()=>document.getElementById('msg-subject')?.focus(),50);
    }
  },

  _hideComposeArea() {
    const a=document.getElementById('msg-compose-area'); if(a) a.style.display='none';
  },

  openMessaging() {
    const s=document.getElementById('msg-search');
    if(s){ s.focus(); s.scrollIntoView({behavior:'smooth',block:'center'}); }
  },

  // ════════════════════════════════════════════════════════════
  //  MESSAGERIE — Envoi
  // ════════════════════════════════════════════════════════════
  async sendMessage() {
    const recs=this._msg.recipients;
    if(!recs.length){ showToast('Ajoutez au moins un destinataire','warn'); return; }

    const subject=document.getElementById('msg-subject')?.value?.trim();
    const body   =document.getElementById('msg-body')?.value?.trim();
    const type   =document.getElementById('msg-type')?.value||'info';
    const prio   =document.getElementById('msg-priority')?.value||'normal';

    if(!subject&&!body){ showToast('Écrivez un message avant d\'envoyer','warn'); return; }

    const TYPE_CFG={
      info:   {icon:'fa-message',           color:'#7DD3FC'},
      alert:  {icon:'fa-triangle-exclamation',color:'#ef4444'},
      success:{icon:'fa-circle-check',      color:'#10b981'},
      system: {icon:'fa-bell',              color:'#8B5CF6'},
      rapport:{icon:'fa-file-chart-column', color:'#FFD700'},
    };
    const PRIO_CFG={high:{pfx:'🔴 ',color:'#ef4444'},normal:{pfx:'',color:null},low:{pfx:'',color:null}};
    const cfg=TYPE_CFG[type]||TYPE_CFG.info;
    const pri=PRIO_CFG[prio]||PRIO_CFG.normal;

    const btn=document.getElementById('msg-send-btn');
    if(btn){ btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin" style="margin-right:5px;"></i>Envoi…'; }

    try {
      const {db}=await import('./firebase-config.js');
      const {collection,addDoc,serverTimestamp}=
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

      const sUid =S.user?.uid||S.uid;
      const sName=S.profile?.displayName||S.user?.displayName||'Doctor Smile';

      const results=await Promise.allSettled(recs.map(async r=>{
        await addDoc(collection(db,'notifications',r.uid,'items'),{
          type, title:pri.pfx+(subject||`Message de ${sName}`),
          body:body||'', icon:cfg.icon, color:pri.color||cfg.color,
          priority:prio, read:false, fromUid:sUid, fromName:sName, createdAt:serverTimestamp(),
        }); return r;
      }));

      const ok  =results.filter(r=>r.status==='fulfilled').length;
      const fail=results.filter(r=>r.status==='rejected').length;

      const entry={
        id:Date.now().toString(), subject:subject||'(Sans objet)', body:body||'',
        type, priority:prio, recipients:[...recs], sentAt:new Date(), succeeded:ok, failed:fail,
      };
      this._msg.history.unshift(entry);

      // Sauvegarder côté expéditeur
      try { await addDoc(collection(db,'messages_sent',sUid,'items'),{
        ...entry, recipients:recs.map(r=>({uid:r.uid,name:r.displayName,email:r.email})),
        sentAt:serverTimestamp() }); } catch {}

      if(fail===0) showToast(`✉️ Message envoyé à ${ok} destinataire${ok>1?'s':''}`, 'ok');
      else         showToast(`⚠️ ${ok} envoyé(s), ${fail} échec(s)`, 'warn');

      const badge=document.getElementById('msg-sent-count');
      if(badge){
        const total=this._msg.history.reduce((a,h)=>a+h.succeeded,0);
        badge.textContent=`${total} envoyé${total>1?'s':''}`;
        badge.style.display='';
      }

      this.clearMessage();
      this._renderSentHistory();

    } catch(e) {
      console.error('[MSG] Erreur envoi:',e);
      showToast('Erreur lors de l\'envoi — '+(e.message||'vérifiez votre connexion'),'warn');
    } finally {
      if(btn){ btn.disabled=false;
        btn.innerHTML='<i class="fa-solid fa-paper-plane" style="margin-right:5px;"></i>Envoyer'; }
    }
  },

  clearMessage() {
    this._msg.recipients=[]; this._renderRecipients(); this._hideComposeArea();
    ['msg-subject','msg-body','msg-search'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const r=document.getElementById('msg-search-results'); if(r) r.style.display='none';
  },

  // ── Historique envois ─────────────────────────────────────
  async _loadSentHistory(uid,db,collection,query,orderBy,limit,onSnapshot) {
    try {
      const q=query(collection(db,'messages_sent',uid,'items'),orderBy('sentAt','desc'),limit(10));
      if(this._msg._sentUnsub) this._msg._sentUnsub();
      this._msg._sentUnsub=onSnapshot(q,(snap)=>{
        this._msg.history=snap.docs.map(d=>({id:d.id,...d.data()}));
        this._renderSentHistory();
      },()=>{});
    } catch {}
  },

  _renderSentHistory() {
    const c=document.getElementById('msg-history-list'); if(!c) return;
    if(!this._msg.history.length){
      c.innerHTML=`<div style="font-size:10px;color:rgba(255,255,255,.18);padding:12px 0;">Aucun message envoyé pour l'instant.</div>`;
      return;
    }
    const COLS={info:'#7DD3FC',alert:'#ef4444',success:'#10b981',system:'#8B5CF6',rapport:'#FFD700'};
    const ICONS={info:'fa-message',alert:'fa-triangle-exclamation',success:'fa-circle-check',system:'fa-bell',rapport:'fa-file-chart-column'};
    c.innerHTML=this._msg.history.slice(0,8).map(h=>{
      const col=COLS[h.type]||'#7DD3FC';
      const ico=ICONS[h.type]||'fa-message';
      const dt=h.sentAt?.toDate?h.sentAt.toDate():(h.sentAt instanceof Date?h.sentAt:new Date());
      const ago=msToHuman(Date.now()-dt);
      const recs=(h.recipients||[]);
      const names=recs.slice(0,3).map(r=>escHtml(r.displayName||r.name||r.email||r.uid)).join(', ');
      const more=recs.length-3;
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <div style="width:30px;height:30px;border-radius:8px;flex-shrink:0;
          background:${col}15;border:1px solid ${col}25;
          display:flex;align-items:center;justify-content:center;color:${col};font-size:11px;">
          <i class="fa-solid ${ico}"></i></div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;color:rgba(255,255,255,.8);
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;">
            ${escHtml(h.subject||'(Sans objet)')}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.35);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px;">
            → ${names}${more>0?` +${more}`:''}</div>
          <div style="font-size:8px;color:rgba(255,255,255,.2);">
            ${ago}
            ${h.succeeded?`· <span style="color:rgba(16,185,129,.6);">✓ ${h.succeeded}</span>`:''}
            ${h.failed?`· <span style="color:rgba(239,68,68,.6);">✗ ${h.failed}</span>`:''}
          </div>
        </div>
      </div>`;
    }).join('');
  },

  // ════════════════════════════════════════════════════════════
  //  PARTAGE RAPPORT (inchangé)
  // ════════════════════════════════════════════════════════════
  async shareReport(analyseId) {
    const a=analyseId?S.analyses.find(x=>x.id===analyseId)||S.currentAnalyse:S.currentAnalyse;
    if(!a){showToast('Aucune analyse à partager','warn');return;}
    const zone=a.zone??zoneFromScore(a.score??0);
    const zc=ZC[zone],score=a.score??0;
    const prob=Math.round((100-score)*({saine:.6,vigilance:1,risque:1.3,critique:1.6}[zone]||1)*.85);
    const date=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
    const titre=`Doctor Smile — ${a.entreprise??'Analyse financière'}`;
    const texte=`Score ${score}/100 · ${zc.l} · Prob. défaut ${prob}% · Modèle ${a.model??'ML'} · ${date}`;
    const url=window.location.href;
    const {normalizeRatios,normalizeRecos}=window.DS_RENDER;
    const ratios=normalizeRatios(a.ratios||a.financialRatios||[]);
    const recos=normalizeRecos(a.recommendations||a.recos||[]);
    const reportHTML=this._buildReportHTML(a,score,zone,zc,date,prob,ratios,recos);
    const blob=new Blob([reportHTML],{type:'text/html'});
    const blobURL=URL.createObjectURL(blob);
    const modal=document.createElement('div'); modal.id='_share_modal';
    modal.style.cssText='position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(14px);';
    const PLATFORMS=[
      {id:'whatsapp',label:'WhatsApp',icon:'fa-whatsapp',brand:true,color:'#25D366',url:`https://wa.me/?text=${encodeURIComponent(titre+'\n'+texte+'\n'+url)}`},
      {id:'telegram',label:'Telegram',icon:'fa-telegram',brand:true,color:'#2CA5E0',url:`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(titre+'\n'+texte)}`},
      {id:'linkedin',label:'LinkedIn',icon:'fa-linkedin',brand:true,color:'#0A66C2',url:`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(texte)}`},
      {id:'email',label:'Email',icon:'fa-envelope',brand:false,color:'#7DD3FC',url:`mailto:?subject=${encodeURIComponent(titre)}&body=${encodeURIComponent(texte+'\n\n'+url)}`},
      {id:'twitter',label:'X / Twitter',icon:'fa-x-twitter',brand:true,color:'#e2e8f0',url:`https://twitter.com/intent/tweet?text=${encodeURIComponent(titre+' — '+texte)}&url=${encodeURIComponent(url)}`},
      {id:'facebook',label:'Facebook',icon:'fa-facebook',brand:true,color:'#1877F2',url:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(texte)}`},
      {id:'slack',label:'Slack',icon:'fa-slack',brand:true,color:'#4A154B',url:`https://slack.com/intl/share?text=${encodeURIComponent(titre+'\n'+texte)}`},
      {id:'copy',label:'Copier lien',icon:'fa-link',brand:false,color:'#a78bfa',url:null},
    ];
    modal.innerHTML=`<div style="background:rgba(8,12,22,.99);border:1px solid rgba(125,211,252,.15);border-radius:18px;padding:28px;max-width:480px;width:92%;animation:mIn .24s cubic-bezier(.16,1,.3,1);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div><div style="font-family:Syne,sans-serif;font-size:15px;font-weight:900;color:#fff;margin-bottom:4px;">
          <i class="fa-solid fa-share-nodes" style="color:#7DD3FC;margin-right:8px;"></i>Partager le rapport</div>
          <div style="font-size:9px;color:rgba(255,255,255,.35);">${escHtml(a.entreprise??'Analyse')} · Score ${score}/100</div></div>
        <button onclick="document.getElementById('_share_modal')?.remove();URL.revokeObjectURL('${blobURL}')"
          style="background:rgba(255,255,255,.08);border:none;border-radius:8px;padding:6px 12px;color:rgba(255,255,255,.45);cursor:pointer;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
        ${PLATFORMS.map(p=>`<button data-pid="${p.id}" data-url="${p.url??''}"
          style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;
          border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);
          cursor:pointer;transition:background .15s,border-color .15s;font-family:Syne,sans-serif;"
          onmouseenter="this.style.background='rgba(255,255,255,.08)';this.style.borderColor='${p.color}44'"
          onmouseleave="this.style.background='rgba(255,255,255,.03)';this.style.borderColor='rgba(255,255,255,.07)'">
          <i class="fa-${p.brand?'brands':'solid'} ${p.icon}" style="font-size:18px;color:${p.color};"></i>
          <span style="font-size:8px;color:rgba(255,255,255,.55);font-weight:700;">${p.label}</span>
        </button>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="flex:1;height:1px;background:rgba(255,255,255,.07);"></div>
        <span style="font-size:9px;color:rgba(255,255,255,.25);">OU VIA APPAREIL</span>
        <div style="flex:1;height:1px;background:rgba(255,255,255,.07);"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <button id="_share_wifi" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;border:1px solid rgba(34,197,94,.2);background:rgba(34,197,94,.05);cursor:pointer;font-family:Syne,sans-serif;" onmouseenter="this.style.background='rgba(34,197,94,.12)'" onmouseleave="this.style.background='rgba(34,197,94,.05)'">
          <i class="fa-solid fa-wifi" style="font-size:18px;color:#22c55e;"></i>
          <span style="font-size:8px;color:rgba(255,255,255,.55);font-weight:700;">WiFi / AirDrop</span></button>
        <button id="_share_bt" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;border:1px solid rgba(59,130,246,.2);background:rgba(59,130,246,.05);cursor:pointer;font-family:Syne,sans-serif;" onmouseenter="this.style.background='rgba(59,130,246,.12)'" onmouseleave="this.style.background='rgba(59,130,246,.05)'">
          <i class="fa-solid fa-bluetooth-b" style="font-size:18px;color:#3b82f6;"></i>
          <span style="font-size:8px;color:rgba(255,255,255,.55);font-weight:700;">Bluetooth</span></button>
        <a href="${blobURL}" download="rapport-${(a.entreprise??'analyse').replace(/\s/g,'-')}.html"
          style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;border:1px solid rgba(255,215,0,.2);background:rgba(255,215,0,.05);cursor:pointer;font-family:Syne,sans-serif;text-decoration:none;" onmouseenter="this.style.background='rgba(255,215,0,.12)'" onmouseleave="this.style.background='rgba(255,215,0,.05)'">
          <i class="fa-solid fa-download" style="font-size:18px;color:#FFD700;"></i>
          <span style="font-size:8px;color:rgba(255,255,255,.55);font-weight:700;">Télécharger</span></a>
      </div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
    modal.querySelectorAll('[data-pid]').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const pid=btn.dataset.pid,purl=btn.dataset.url;
        if(pid==='copy'){try{await navigator.clipboard.writeText(url);showToast('Lien copié ✓','ok');}catch{showToast('Impossible de copier','warn');}modal.remove();return;}
        if(purl){window.open(purl,'_blank','noopener');modal.remove();}
      });
    });
    document.getElementById('_share_wifi')?.addEventListener('click',async()=>{
      if(navigator.share){try{await navigator.share({title:titre,text:texte,url,files:[new File([blob],`rapport-${a.entreprise??'analyse'}.html`,{type:'text/html'})]});showToast('Partagé via WiFi/AirDrop ✓','ok');modal.remove();}catch(err){if(err.name!=='AbortError'){try{await navigator.share({title:titre,text:texte,url});modal.remove();}catch{}}}}else{showToast('Partagez via votre navigateur (F12 → Share)','info');}
    });
    document.getElementById('_share_bt')?.addEventListener('click',async()=>{
      if(navigator.bluetooth){showToast('Ouverture Bluetooth…','info');try{const device=await navigator.bluetooth.requestDevice({acceptAllDevices:true});showToast(`Appareil trouvé : ${device.name??'inconnu'} — transfert en cours…`,'info');const w=window.open('','_blank');if(w){w.document.write(reportHTML);w.document.close();}showToast('Rapport ouvert — imprimez ou partagez depuis cet appareil','ok');}catch(err){if(err.name!=='NotFoundError'&&err.name!=='SecurityError')showToast('Bluetooth non disponible','warn');}}else{showToast('Bluetooth : activez via Paramètres système puis partagez le fichier téléchargé','info');const a2=document.createElement('a');a2.href=blobURL;a2.download=`rapport-${(a.entreprise??'analyse').replace(/\s/g,'-')}.html`;a2.click();}
    });
  },

  _buildReportHTML(a,score,zone,zc,date,prob,ratios,recos){
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Doctor Smile — Rapport ${escHtml(a.entreprise??'')}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>*{box-sizing:border-box;}body{font-family:'Segoe UI',system-ui,sans-serif;color:#1a1a2e;margin:0;padding:40px;background:#fff;}@media print{body{padding:20px;}}h1{font-size:24px;font-weight:900;margin-bottom:2px;}.sub{color:#666;font-size:11px;margin-bottom:28px;}.score-row{display:flex;align-items:center;gap:20px;padding:20px;border-radius:12px;background:${zc.bg.replace('.1)',',0.08)')};border:1px solid ${zc.s}44;margin-bottom:24px;}.score-big{font-size:60px;font-weight:900;line-height:1;color:${zc.s};}.zone{display:inline-block;padding:4px 14px;border-radius:100px;font-size:10px;font-weight:800;background:${zc.bg};color:${zc.s};letter-spacing:.08em;text-transform:uppercase;}table{width:100%;border-collapse:collapse;}th{text-align:left;padding:7px 10px;background:#f9fafb;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;}td{padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:10px;}.reco{padding:10px 14px;border-radius:8px;margin-bottom:8px;border-left:4px solid;}.reco.high{background:#fff5f5;border-color:#ef4444;}.reco.medium{background:#fffbf0;border-color:#f59e0b;}.reco.low{background:#f0fdf4;border-color:#10b981;}.reco-t{font-weight:700;font-size:11px;margin-bottom:3px;}.reco-d{font-size:10px;color:#6b7280;}h3{font-size:13px;font-weight:800;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #f3f4f6;}.footer{margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:8px;color:#9ca3af;text-align:center;}</style></head><body>
    <h1>Doctor Smile™</h1><div class="sub">Rapport généré le ${date} · ${escHtml(a.model??'Modèle ML')}</div>
    <div class="score-row"><div class="score-big">${score}</div><div>
      <div style="font-size:18px;font-weight:800;margin-bottom:6px;">${escHtml(a.entreprise??'Analyse financière')}</div>
      <div class="zone">${zc.l}</div>
      <div style="margin-top:8px;font-size:11px;color:#6b7280;">Probabilité défaut <strong>${prob}%</strong> · Confiance <strong>${a.confidence??'—'}%</strong> · AUC <strong>${a.auc??'—'}</strong></div>
    </div></div>
    ${ratios.length?`<h3>Ratios financiers</h3><table><thead><tr><th>Ratio</th><th>Valeur</th><th>Référence</th><th>Score</th></tr></thead><tbody>${ratios.map(r=>`<tr><td>${escHtml(r.n)}</td><td><strong style="color:${r.c}">${r.v}${r.u}</strong></td><td style="color:#6b7280;">${r.b}</td><td><strong style="color:${r.c}">${r.p}/100</strong></td></tr>`).join('')}</tbody></table>`:''}
    ${recos.length?`<h3>Recommandations IA</h3>${recos.map(r=>`<div class="reco ${r.lvl}"><div class="reco-t">${escHtml(r.t)}</div><div class="reco-d">${escHtml(r.d)}</div></div>`).join('')}`:''}
    <div class="footer">Doctor Smile™ · Rapport automatisé · Ne constitue pas un conseil financier réglementé</div>
    </body></html>`;
  },
};

console.log('[ds-notifs] ✓ Chargé — Notifications + Messagerie utilisateurs');