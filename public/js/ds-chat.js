// ════════════════════════════════════════════════════════════════
//  ds-chat.js — Doctor Smile  v4
//  ✅ Suppression conversation (avec confirmation)
//  ✅ Tri : récent / ancien / meilleur score
//  ✅ Chargement complet des messages Firestore au clic
//  ✅ Heure d'envoi sur chaque message (format humain)
//  ✅ Icône animée Doctor Smile — visage souriant bleu flottant
//  Dépend de : ds-core.js, firebase-firestore.js
// ════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//  ICÔNE ANIMÉE — Doctor Smile Face (SVG pur, zéro dépendance)
// ═══════════════════════════════════════════════════════════════
(function _injectSmileCSS() {
  if (document.getElementById('_dsface_css')) return;
  const s = document.createElement('style');
  s.id = '_dsface_css';
  s.textContent = `

/* ──────────────────────────────────────────────
   DOCTOR SMILE FACE — icône flottante animée
   ────────────────────────────────────────────── */

.dsf-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

/* Flottement vertical doux */
@keyframes dsf-float {
  0%,100% { transform: translateY(0px) rotate(0deg); }
  30%      { transform: translateY(-4px) rotate(1.5deg); }
  70%      { transform: translateY(-2px) rotate(-1deg); }
}

/* Pulse du halo externe */
@keyframes dsf-halo {
  0%,100% { opacity:.18; transform:scale(1); }
  50%      { opacity:.55; transform:scale(1.18); }
}

/* Orbite de la particule */
@keyframes dsf-orbit {
  from { transform: rotate(0deg) translateX(var(--or)) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(var(--or)) rotate(-360deg); }
}

/* Clignement des yeux */
@keyframes dsf-blink {
  0%,88%,100% { transform: scaleY(1); }
  93%          { transform: scaleY(0.06); }
}

/* Sourire qui s'élargit */
@keyframes dsf-smile {
  0%,100% { d: path("M8,13 Q14,19 20,13"); }
  45%,55% { d: path("M6,12 Q14,21 22,12"); }
}

/* Étoiles scintillantes */
@keyframes dsf-star {
  0%,100% { opacity:0; transform:scale(.4) rotate(0deg); }
  50%      { opacity:1; transform:scale(1.3) rotate(45deg); }
}

/* Anneau gradient tournant */
@keyframes dsf-ring {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Lueur dorée sur le sourire */
@keyframes dsf-glow-smile {
  0%,100% { filter: drop-shadow(0 0 2px #7DD3FC); }
  50%      { filter: drop-shadow(0 0 7px #7DD3FC) drop-shadow(0 0 14px rgba(125,211,252,.5)); }
}

.dsf-float   { animation: dsf-float 3.6s ease-in-out infinite; }
.dsf-halo    { animation: dsf-halo 2.4s ease-in-out infinite; }
.dsf-blink   { animation: dsf-blink 5s ease-in-out infinite; }
.dsf-smile   { animation: dsf-glow-smile 2.8s ease-in-out infinite; }
.dsf-ring    { animation: dsf-ring 5s linear infinite; transform-origin: center; }
.dsf-star-1  { animation: dsf-star 2.0s ease-in-out infinite 0.0s; }
.dsf-star-2  { animation: dsf-star 2.2s ease-in-out infinite 0.6s; }
.dsf-star-3  { animation: dsf-star 1.8s ease-in-out infinite 1.1s; }
.dsf-star-4  { animation: dsf-star 2.5s ease-in-out infinite 1.7s; }
.dsf-orb     { --or: 20px; animation: dsf-orbit 3.2s linear infinite; transform-origin: center; }
.dsf-orb-2   { --or: 18px; animation: dsf-orbit 4.8s linear infinite reverse; transform-origin: center; }

.dsf-wrap:hover .dsf-float {
  animation-duration: 1.8s;
}
.dsf-wrap:hover .dsf-halo {
  animation-duration: 1.0s;
}

/* Taille mini pour le .mn du chat */
.dsf-mini svg { display:block; }
  `;
  document.head.appendChild(s);
})();

// ── Fabrique l'icône SVG Doctor Smile Face ───────────────────
function _buildDsIcon(px = 42) {
  const r = px / 2;
  const wrap = document.createElement('span');
  wrap.className = 'dsf-wrap';
  wrap.style.width  = px + 'px';
  wrap.style.height = px + 'px';

  wrap.innerHTML = `
  <svg width="${px}" height="${px}" viewBox="0 0 44 44"
       fill="none" xmlns="http://www.w3.org/2000/svg"
       style="overflow:visible;">

    <!-- ── Halo externe pulsant ── -->
    <circle class="dsf-halo" cx="22" cy="22" r="20"
      fill="rgba(125,211,252,.06)"
      stroke="rgba(125,211,252,.22)" stroke-width="1"/>

    <!-- ── Anneau gradient tournant ── -->
    <circle class="dsf-ring" cx="22" cy="22" r="18"
      fill="none"
      stroke="url(#dsf-grad-ring)" stroke-width="1.5"
      stroke-dasharray="28 84" stroke-linecap="round"/>

    <!-- ── Particule orbitale 1 ── -->
    <g class="dsf-orb" style="transform-origin:22px 22px">
      <circle cx="22" cy="4" r="2.2"
        fill="#7DD3FC"
        style="filter:drop-shadow(0 0 4px #7DD3FC)"/>
    </g>

    <!-- ── Particule orbitale 2 ── -->
    <g class="dsf-orb-2" style="transform-origin:22px 22px">
      <circle cx="22" cy="6" r="1.5"
        fill="#FFD700"
        style="filter:drop-shadow(0 0 3px #FFD700)"/>
    </g>

    <!-- ── Face principale ── -->
    <g class="dsf-float">

      <!-- Corps face -->
      <circle cx="22" cy="22" r="14"
        fill="url(#dsf-grad-face)"
        stroke="rgba(125,211,252,.45)" stroke-width="1.5"
        style="filter:drop-shadow(0 2px 8px rgba(0,0,0,.4))"/>

      <!-- Reflet gloss -->
      <ellipse cx="17.5" cy="16.5" rx="4" ry="2.5"
        fill="rgba(255,255,255,.13)" transform="rotate(-25,17.5,16.5)"/>

      <!-- ── Sourcil gauche (expression vivace) ── -->
      <path d="M14,14.5 Q16.5,13 19,14" stroke="rgba(125,211,252,.55)"
        stroke-width="1.2" stroke-linecap="round"/>
      <!-- ── Sourcil droit ── -->
      <path d="M25,14 Q27.5,13 30,14.5" stroke="rgba(125,211,252,.55)"
        stroke-width="1.2" stroke-linecap="round"/>

      <!-- ── Œil gauche ── -->
      <g class="dsf-blink" style="transform-origin:17px 20px">
        <ellipse cx="17" cy="20" rx="2.5" ry="2.8"
          fill="url(#dsf-grad-eye)"
          style="filter:drop-shadow(0 0 5px rgba(125,211,252,.8))"/>
        <circle cx="17.9" cy="19.1" r="0.9" fill="rgba(255,255,255,.9)"/>
      </g>

      <!-- ── Œil droit ── -->
      <g class="dsf-blink" style="transform-origin:27px 20px;animation-delay:.15s">
        <ellipse cx="27" cy="20" rx="2.5" ry="2.8"
          fill="url(#dsf-grad-eye)"
          style="filter:drop-shadow(0 0 5px rgba(125,211,252,.8))"/>
        <circle cx="27.9" cy="19.1" r="0.9" fill="rgba(255,255,255,.9)"/>
      </g>

      <!-- ── Joues rosées ── -->
      <ellipse cx="13.5" cy="25" rx="3" ry="1.8" fill="rgba(255,160,160,.18)"/>
      <ellipse cx="30.5" cy="25" rx="3" ry="1.8" fill="rgba(255,160,160,.18)"/>

      <!-- ── Sourire ── -->
      <path class="dsf-smile"
        d="M14,26 Q22,33 30,26"
        stroke="#7DD3FC" stroke-width="2.2"
        stroke-linecap="round" fill="none"/>

      <!-- Dents (trait blanc subtil) -->
      <path d="M16.5,27.5 Q22,31.5 27.5,27.5"
        stroke="rgba(255,255,255,.18)" stroke-width="1.5"
        stroke-linecap="round" fill="none"/>

    </g><!-- /float -->

    <!-- ── Étoiles scintillantes autour ── -->
    <g class="dsf-star-1" style="transform-origin:6px 8px">
      <path d="M6,5 L6.8,7.2 L9,8 L6.8,8.8 L6,11 L5.2,8.8 L3,8 L5.2,7.2 Z"
        fill="#FFD700" opacity=".9"/>
    </g>
    <g class="dsf-star-2" style="transform-origin:38px 10px">
      <path d="M38,7 L38.6,8.8 L40.4,9.4 L38.6,10 L38,11.8 L37.4,10 L35.6,9.4 L37.4,8.8 Z"
        fill="#7DD3FC" opacity=".9"/>
    </g>
    <g class="dsf-star-3" style="transform-origin:5px 36px">
      <circle cx="5" cy="36" r="1.8" fill="#a78bfa" opacity=".85"/>
    </g>
    <g class="dsf-star-4" style="transform-origin:40px 34px">
      <path d="M40,31 L40.5,33 L42.5,33.5 L40.5,34 L40,36 L39.5,34 L37.5,33.5 L39.5,33 Z"
        fill="#FFD700" opacity=".8"/>
    </g>

    <!-- ── Dégradés ── -->
    <defs>
      <radialGradient id="dsf-grad-face" cx="40%" cy="35%" r="65%">
        <stop offset="0%"   stop-color="#1a4a8a"/>
        <stop offset="60%"  stop-color="#0d2550"/>
        <stop offset="100%" stop-color="#060e1e"/>
      </radialGradient>
      <radialGradient id="dsf-grad-eye" cx="35%" cy="35%" r="65%">
        <stop offset="0%"   stop-color="#a0e4ff"/>
        <stop offset="100%" stop-color="#38bdf8"/>
      </radialGradient>
      <linearGradient id="dsf-grad-ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#7DD3FC" stop-opacity=".9"/>
        <stop offset="40%"  stop-color="#FFD700" stop-opacity=".7"/>
        <stop offset="70%"  stop-color="#a78bfa" stop-opacity=".6"/>
        <stop offset="100%" stop-color="#7DD3FC" stop-opacity=".9"/>
      </linearGradient>
    </defs>
  </svg>`;

  return wrap;
}

// ── Patcher les zones "Doctor Smile IA" dans le DOM ──────────
function _patchDsIconInDOM() {
  // 1. Chat head du mini-chat (dashboard)
  const chatHead = document.querySelector('#chat-sec .chat-head-title');
  if (chatHead && !chatHead.querySelector('.dsf-wrap')) {
    const oldI = chatHead.querySelector('i'); if (oldI) oldI.remove();
    chatHead.style.gap = '9px';
    chatHead.insertBefore(_buildDsIcon(30), chatHead.firstChild);
  }

  // 2. Titre "Chat IA" dans la vue plein écran
  const viewTitle = document.querySelector('#view-chat .view-title');
  if (viewTitle && !viewTitle.querySelector('.dsf-wrap')) {
    viewTitle.style.cssText += ';display:flex;align-items:center;gap:12px;';
    viewTitle.insertBefore(_buildDsIcon(40), viewTitle.firstChild);
  }

  // 3. Bulle .mn dans chaque message IA (injection ponctuelle)
  document.querySelectorAll('.msg.ai .mn:not(:has(.dsf-wrap))').forEach(mn => {
    mn.innerHTML = '';
    mn.style.cssText += ';display:flex;align-items:center;gap:6px;';
    mn.appendChild(_buildDsIcon(18));
    const lbl = document.createElement('span');
    lbl.textContent = 'Doctor Smile IA';
    mn.appendChild(lbl);
  });
}


// ════════════════════════════════════════════════════════════════
//  DS_CHAT
// ════════════════════════════════════════════════════════════════
window.DS_CHAT = {

  _sortMode: 'recent',   // 'recent' | 'old' | 'score'
  _msgCache: {},         // analyseId → messages[]

  // ════ INIT ══════════════════════════════════════════════════
  async initChat(analyse, zone) {
    S.convId      = analyse.id;
    S.chatHistory = [];
    const box = document.getElementById('chat-msgs');
    if (box) box.innerHTML = '';

    try {
      const { createConversation } = await import('./firebase-firestore.js');
      const res = await createConversation(S.user.uid, analyse.id);
      S.firestoreConvId = res?.convId ?? null;
    } catch { /* pas bloquant */ }

    const nom  = analyse.entreprise ?? S.profile?.entreprise?.nom ?? 'votre entreprise';
    const top  = window.DS_RENDER.normalizeShap(analyse.shapValues || analyse.shap || [])[0];
    const intro =
      `Bonjour ${S.profile?.prenom ?? ''} 👋 ` +
      `Votre score de <strong>${analyse.score}/100</strong> pour <strong>${escHtml(nom)}</strong> ` +
      `indique une <strong>${ZC[zone]?.l ?? zone}</strong>.` +
      (top ? ` Le facteur principal est <strong>${top.n}</strong>.` : '') +
      ` Je suis disponible pour approfondir n'importe quel aspect.`;

    this._appendMsg('chat-msgs', 'ai', intro, new Date());
    // Invalider le cache DOM du plein-écran pour forcer rechargement au prochain renderViewChat
    const fullMsgs = document.getElementById('chat-msgs-full');
    if (fullMsgs) delete fullMsgs.dataset.loadedFor;
    setTimeout(_patchDsIconInDOM, 60);
  },

  // ════ ENVOI mini-chat ═══════════════════════════════════════
  async sendChat() {
    const inp = document.getElementById('chat-inp');
    const msg = inp?.value.trim(); if (!msg) return;
    const now = new Date();
    this._appendMsg('chat-msgs', 'user', msg, now);
    inp.value = ''; inp.style.height = 'auto';
    S.chatHistory.push({ role: 'user', content: msg });
    this._saveToFirestore(msg, 'user');
    const typing = this._addTyping('chat-msgs');
    try {
      const { auth } = await import('./firebase-config.js');
      const user  = auth.currentUser; if (!user) throw new Error('nc');
      const token = await user.getIdToken(true);
      const res   = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: msg, analyseId: S.currentAnalyse?.id ?? null,
          history: S.chatHistory.slice(-8), userId: user.uid }),
      });
      if (!res.ok) throw new Error(res.status);
      const data  = await res.json();
      typing.remove();
      const reply = data.message || data.content || 'Pas de réponse générée.';
      S.chatHistory.push({ role: 'assistant', content: reply });
      this._appendMsg('chat-msgs', 'ai', reply, new Date());
      this._saveToFirestore(reply, 'assistant');
    } catch {
      typing.remove();
      const fb = this._localReply(msg);
      S.chatHistory.push({ role: 'assistant', content: fb });
      this._appendMsg('chat-msgs', 'ai', fb, new Date());
      this._saveToFirestore(fb, 'assistant');
    }
    setTimeout(_patchDsIconInDOM, 60);
  },

  // ════ ENVOI chat plein écran ═════════════════════════════════
  async sendChatFull() {
    const inp  = document.getElementById('chat-inp-full');
    const msg  = inp?.value.trim(); if (!msg) return;
    const msgs = document.getElementById('chat-msgs-full');
    this._appendMsg('chat-msgs-full', 'user', msg, new Date());
    inp.value = ''; inp.style.height = 'auto';
    S.chatHistory.push({ role: 'user', content: msg });
    this._saveToFirestore(msg, 'user');
    const t = document.createElement('div');
    t.className = 'typing'; t.id = 'tp-full';
    t.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(t); msgs.scrollTop = msgs.scrollHeight;
    try {
      const { fetchWithAuth } = await import('./utils.js');
      const res = await fetchWithAuth(`${API_BASE}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: msg, analyseId: S.currentAnalyse?.id,
          history: S.chatHistory.slice(-8), userId: S.user?.uid }),
      });
      t.remove();
      if (!res.ok) throw new Error(res.status);
      const data  = await res.json();
      const reply = data.message ?? data.content ?? 'Pas de réponse.';
      S.chatHistory.push({ role: 'assistant', content: reply });
      this._appendMsg('chat-msgs-full', 'ai', reply, new Date());
      this._saveToFirestore(reply, 'assistant');
    } catch {
      t.remove();
      const fb = this._localReply(msg);
      S.chatHistory.push({ role: 'assistant', content: fb });
      this._appendMsg('chat-msgs-full', 'ai', fb, new Date());
      this._saveToFirestore(fb, 'assistant');
    }
    msgs.scrollTop = msgs.scrollHeight;
    setTimeout(_patchDsIconInDOM, 60);
  },

  // ════ RENDER vue chat plein écran ════════════════════════════
  // Appelé à chaque navigation vers la vue Chat.
  // TOUJOURS recharge les messages depuis le cache ou Firestore.
  renderViewChat() {
    this.renderChatHistoryPanel();
    const sub = document.getElementById('chat-sub-title');
    if (sub && S.currentAnalyse)
      sub.textContent = (S.currentAnalyse.entreprise ?? '—') + ' · Score ' + (S.currentAnalyse.score ?? '?') + '/100';

    if (S.currentAnalyse) {
      // Si on a déjà chargé cette conv dans la session → réafficher depuis le cache DOM
      const msgs = document.getElementById('chat-msgs-full');
      const alreadyLoaded = msgs && msgs.dataset.loadedFor === S.currentAnalyse.id;
      if (!alreadyLoaded) {
        // Recharger depuis Firestore/cache
        this._openConversation(S.currentAnalyse);
      }
    } else {
      const msgs = document.getElementById('chat-msgs-full');
      if (msgs && !msgs.children.length) {
        this._appendMsg('chat-msgs-full', 'ai',
          'Bonjour 👋 Importez une analyse depuis le Dashboard pour commencer.', new Date());
      }
    }
    setTimeout(_patchDsIconInDOM, 80);
  },

  // ════ HISTORIQUE PANNEAU ═════════════════════════════════════
  renderChatHistoryPanel() {
    const list = document.getElementById('chat-history-list'); if (!list) return;
    this._renderSortBar();

    if (!S.analyses?.length) {
      list.innerHTML = `
        <div style="padding:32px 16px;text-align:center;">
          <div style="font-size:28px;margin-bottom:12px;opacity:.18;">💬</div>
          <div style="font-size:10px;color:rgba(255,255,255,.2);">Aucune conversation</div>
          <div style="font-size:9px;color:rgba(255,255,255,.12);margin-top:4px;">Lancez une analyse pour commencer</div>
        </div>`;
      return;
    }

    const sorted = this._sortedAnalyses();
    list.innerHTML = sorted.map(a => {
      const zone = a.zone ?? zoneFromScore(a.score ?? 0);
      const zc   = ZC[zone] ?? ZC.vigilance;
      const date = this._fmtDate(a.createdAt);
      const cur  = S.currentAnalyse?.id === a.id;
      const cached = this._msgCache[a.id];
      const lastMsg = cached?.length ? cached[cached.length - 1] : null;
      const preview = lastMsg
        ? (lastMsg.role === 'user' ? '↑ ' : '↓ ') + lastMsg.content.replace(/<[^>]+>/g,'').slice(0, 55) + '…'
        : '…';

      return `
      <div class="_chi" data-aid="${a.id}"
        style="padding:11px 14px 10px;cursor:pointer;position:relative;
          border-bottom:1px solid rgba(255,255,255,.04);
          background:${cur ? 'rgba(125,211,252,.07)' : 'transparent'};
          border-left:3px solid ${cur ? '#7DD3FC' : 'transparent'};
          transition:all .15s;">

        <!-- Btn supprimer -->
        <button class="_chi_del" data-aid="${a.id}"
          title="Supprimer cette conversation"
          style="position:absolute;top:9px;right:9px;
            width:22px;height:22px;border-radius:6px;
            background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.18);
            color:rgba(239,68,68,.5);font-size:9px;cursor:pointer;
            display:none;align-items:center;justify-content:center;
            transition:all .15s;">
          <i class="fa-solid fa-trash-can"></i>
        </button>

        <!-- Ligne 1 : entreprise + date -->
        <div style="display:flex;justify-content:space-between;align-items:center;
          gap:6px;margin-bottom:4px;padding-right:26px;">
          <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;
            color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;">
            ${escHtml(a.entreprise ?? 'Sans nom')}
          </div>
          <div style="font-size:7.5px;color:rgba(255,255,255,.22);flex-shrink:0;">${date}</div>
        </div>

        <!-- Ligne 2 : badge + score -->
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px;">
          <span style="font-size:7.5px;font-weight:800;color:${zc.t};
            background:${zc.bg};border:1px solid ${zc.s}33;
            padding:2px 7px;border-radius:4px;">${zc.l}</span>
          <span style="font-size:8px;color:rgba(255,255,255,.28);">${a.score ?? '—'}/100</span>
          ${cached?.length
            ? `<span style="margin-left:auto;font-size:7.5px;color:rgba(125,211,252,.35);">
                <i class="fa-regular fa-message" style="font-size:7px;"></i> ${cached.length}
               </span>`
            : ''}
        </div>

        <!-- Ligne 3 : aperçu dernier message -->
        <div class="_chi_prev" data-aid="${a.id}"
          style="font-size:8.5px;color:rgba(255,255,255,.22);
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
            max-width:195px;line-height:1.5;font-style:italic;">
          ${escHtml(preview)}
        </div>
      </div>`;
    }).join('');

    // Interactions
    list.querySelectorAll('._chi[data-aid]').forEach(el => {
      const btn = el.querySelector('._chi_del');
      el.addEventListener('mouseenter', () => {
        if (S.currentAnalyse?.id !== el.dataset.aid) el.style.background = 'rgba(125,211,252,.04)';
        if (btn) btn.style.display = 'flex';
      });
      el.addEventListener('mouseleave', () => {
        el.style.background = S.currentAnalyse?.id === el.dataset.aid ? 'rgba(125,211,252,.07)' : 'transparent';
        if (btn) btn.style.display = 'none';
      });
      el.addEventListener('click', e => {
        if (e.target.closest('._chi_del')) return;
        const found = S.analyses.find(a => a.id === el.dataset.aid);
        if (found) this._openConversation(found);
      });
      if (btn) btn.addEventListener('click', e => {
        e.stopPropagation();
        this._deleteConversation(el.dataset.aid);
      });
    });

    // Charger les aperçus async
    sorted.forEach(a => this._loadPreview(a.id));
  },

  // ════ OUVRIR UNE CONVERSATION ════════════════════════════════
  async _openConversation(analyse) {
    const msgs = document.getElementById('chat-msgs-full'); if (!msgs) return;

    // Marquer l'analyse active SANS appeler loadAnalyse (qui appellerait initChat
    // et écraserait firestoreConvId avec une nouvelle conversation vide)
    S.currentAnalyse = analyse;
    const sub = document.getElementById('chat-sub-title');
    if (sub) sub.textContent = (analyse.entreprise ?? '—') + ' · Score ' + (analyse.score ?? '?') + '/100';

    // Spinner
    msgs.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'height:100%;gap:14px;">' +
      '<i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px;color:#7DD3FC;opacity:.5;"></i>' +
      '<div style="font-size:10px;color:rgba(255,255,255,.28);">Chargement des messages…</div>' +
      '</div>';

    S.chatHistory = [];

    try {
      const { getUserConversations, getMessages } = await import('./firebase-firestore.js');
      const convs = await getUserConversations(S.user.uid);
      const conv  = convs.find(c => c.analyseId === analyse.id);

      msgs.innerHTML = '';

      if (conv?.id) {
        // Stocker l'ID de la conv — les prochains envois sauvegarderont dans cette conv
        S.firestoreConvId = conv.id;
        const history = await getMessages(conv.id);
        this._msgCache[analyse.id] = history;

        if (history.length) {
          history.forEach(m => {
            let ts;
            if (m._localTs instanceof Date)        ts = m._localTs;
            else if (m.createdAt?.toDate)          ts = m.createdAt.toDate();
            else if (m.createdAt?.seconds)         ts = new Date(m.createdAt.seconds * 1000);
            else                                   ts = new Date();
            this._appendMsg('chat-msgs-full', m.role === 'user' ? 'user' : 'ai', m.content, ts);
            S.chatHistory.push({ role: m.role, content: m.content });
          });
        } else {
          // Conv existe mais aucun message sauvegardé → message d'intro
          this._introMsg('chat-msgs-full', analyse);
        }
      } else {
        // Aucune conv Firestore trouvée → créer une nouvelle pour cette analyse
        S.firestoreConvId = null;
        try {
          const { createConversation } = await import('./firebase-firestore.js');
          const res = await createConversation(S.user.uid, analyse.id);
          S.firestoreConvId = res?.convId ?? null;
        } catch { /* pas bloquant */ }
        this._introMsg('chat-msgs-full', analyse);
      }
    } catch (err) {
      console.warn('[chat] erreur chargement messages:', err);
      msgs.innerHTML = '';
      this._introMsg('chat-msgs-full', analyse);
    }

    msgs.scrollTop = msgs.scrollHeight;
    // Marquer le container pour éviter un double-rechargement dans renderViewChat
    msgs.dataset.loadedFor = analyse.id;
    this.renderChatHistoryPanel(); // refresh pour surligner la conv active
    setTimeout(_patchDsIconInDOM, 80);
  },

  _introMsg(containerId, analyse) {
    const z     = analyse.zone ?? zoneFromScore(analyse.score ?? 0);
    const nom   = escHtml(analyse.entreprise ?? 'votre entreprise');
    const now   = new Date();
    const intro = 'Bonjour ' + (S.profile?.prenom ?? '') + ' 👋 ' +
      '<strong>' + nom + '</strong> · Score <strong>' + (analyse.score ?? '?') + '/100</strong>' +
      ' · ' + (ZC[z]?.l ?? z) + '. Que voulez-vous approfondir ?';
    this._appendMsg(containerId, 'ai', intro, now);
    // Sauvegarder ce message d'intro dans Firestore + cache
    if (S.firestoreConvId) this._saveToFirestore(intro, 'assistant');
    if (!this._msgCache[analyse.id]) this._msgCache[analyse.id] = [];
    if (!this._msgCache[analyse.id].length)
      this._msgCache[analyse.id].push({ role: 'assistant', content: intro, _localTs: now });
  },

  // ════ SUPPRESSION CONVERSATION ═══════════════════════════════
  async _deleteConversation(analyseId) {
    const ok = await this._confirm(
      'Supprimer cette conversation ?',
      "Les messages seront effacés. L'analyse reste disponible."
    );
    if (!ok) return;

    // ── 1. Retirer l'item du DOM IMMÉDIATEMENT — feedback instantané
    const domItem = document.querySelector('._chi[data-aid="' + analyseId + '"]');
    if (domItem) {
      const h = domItem.offsetHeight;
      domItem.style.cssText += ';transition:opacity .18s,max-height .24s,padding .24s;' +
        'overflow:hidden;opacity:0;max-height:' + h + 'px;';
      setTimeout(() => {
        domItem.style.maxHeight  = '0';
        domItem.style.paddingTop = '0';
        domItem.style.paddingBottom = '0';
        setTimeout(() => domItem.remove(), 260);
      }, 150);
    }

    // ── 2. Vider le cache mémoire
    delete this._msgCache[analyseId];

    // ── 3. Si conv active → vider le chat
    if (S.currentAnalyse?.id === analyseId) {
      S.chatHistory     = [];
      S.firestoreConvId = null;
      const m = document.getElementById('chat-msgs-full');
      if (m) {
        m.innerHTML = '';
        this._appendMsg('chat-msgs-full', 'ai',
          "Conversation supprimée. Sélectionnez une analyse dans l'historique pour continuer.",
          new Date());
      }
    }

    showToast('Conversation supprimée ✓', 'ok');

    // ── 4. Suppression Firestore en arrière-plan (non bloquant)
    (async () => {
      try {
        const { db }  = await import('./firebase-config.js');
        const { doc, deleteDoc, collection, getDocs }
          = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getUserConversations } = await import('./firebase-firestore.js');
        const convs = await getUserConversations(S.user.uid);
        const conv  = convs.find(c => c.analyseId === analyseId);
        if (conv?.id) {
          const snap = await getDocs(collection(db, 'conversations', conv.id, 'messages'));
          await Promise.all(snap.docs.map(d =>
            deleteDoc(doc(db, 'conversations', conv.id, 'messages', d.id))
          ));
          await deleteDoc(doc(db, 'conversations', conv.id));
        }
      } catch (e) { console.warn('[chat] Firestore delete bg:', e); }
    })();
  },

  // ════ BARRE DE TRI ═══════════════════════════════════════════
  _renderSortBar() {
    const panel = document.getElementById('chat-history-panel'); if (!panel) return;
    let bar = document.getElementById('_chi_sortbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = '_chi_sortbar';
      bar.style.cssText = `
        padding:7px 12px;border-bottom:1px solid rgba(255,255,255,.05);
        display:flex;align-items:center;gap:5px;flex-shrink:0;`;
      const listEl = document.getElementById('chat-history-list');
      if (listEl) panel.insertBefore(bar, listEl);
    }
    const opts = [
      { k: 'recent', l: '↓ Récent'  },
      { k: 'old',    l: '↑ Ancien'  },
      { k: 'score',  l: '★ Score'   },
    ];
    bar.innerHTML = opts.map(o => `
      <button onclick="window.DS_CHAT._setSort('${o.k}')"
        style="padding:3px 9px;border-radius:5px;
          font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
          cursor:pointer;transition:all .15s;letter-spacing:.04em;
          background:${this._sortMode === o.k ? 'rgba(125,211,252,.14)' : 'transparent'};
          border:1px solid ${this._sortMode === o.k ? 'rgba(125,211,252,.35)' : 'rgba(255,255,255,.08)'};
          color:${this._sortMode === o.k ? '#7DD3FC' : 'rgba(255,255,255,.3)'};">
        ${o.l}
      </button>`).join('');
  },

  _setSort(mode) { this._sortMode = mode; this.renderChatHistoryPanel(); },

  _sortedAnalyses() {
    const list = [...(S.analyses ?? [])];
    if (this._sortMode === 'recent') return list.sort((a,b) => _tsMs(b.createdAt) - _tsMs(a.createdAt));
    if (this._sortMode === 'old')    return list.sort((a,b) => _tsMs(a.createdAt) - _tsMs(b.createdAt));
    if (this._sortMode === 'score')  return list.sort((a,b) => (b.score ?? 0) - (a.score ?? 0));
    return list;
  },

  // ════ APERÇU DERNIER MESSAGE ═════════════════════════════════
  async _loadPreview(analyseId) {
    if (this._msgCache[analyseId]) {
      this._updatePreviewEl(analyseId); return;
    }
    try {
      const { getUserConversations, getMessages } = await import('./firebase-firestore.js');
      const convs = await getUserConversations(S.user.uid);
      const conv  = convs.find(c => c.analyseId === analyseId);
      if (!conv?.id) return;
      const msgs = await getMessages(conv.id);
      this._msgCache[analyseId] = msgs;
      this._updatePreviewEl(analyseId);
    } catch { /* pas bloquant */ }
  },

  _updatePreviewEl(analyseId) {
    const msgs = this._msgCache[analyseId] ?? [];
    if (!msgs.length) return;
    const last = msgs[msgs.length - 1];
    const el   = document.querySelector(`._chi_prev[data-aid="${analyseId}"]`);
    if (el) {
      const clean = last.content.replace(/<[^>]+>/g, '').slice(0, 58);
      el.textContent = (last.role === 'user' ? '↑ ' : '↓ ') + clean + (clean.length >= 58 ? '…' : '');
    }
    // Mettre à jour le compteur badge (refresh partiel)
    const countEl = document.querySelector(`._chi[data-aid="${analyseId}"] [data-count]`);
    if (countEl) countEl.textContent = msgs.length;
  },

  // ════ SAUVEGARDER DANS FIRESTORE ═════════════════════════════
  async _saveToFirestore(content, role) {
    if (!S.firestoreConvId) return;
    try {
      const { addMessage } = await import('./firebase-firestore.js');
      await addMessage(S.firestoreConvId, { role, content });
      // Mise à jour cache local
      const aid = S.currentAnalyse?.id;
      if (aid) {
        if (!this._msgCache[aid]) this._msgCache[aid] = [];
        this._msgCache[aid].push({ role, content, _localTs: new Date() });
      }
    } catch { /* pas bloquant */ }
  },

  // ════ DOM HELPERS ════════════════════════════════════════════

  // Créer + appender un message avec timestamp
  _appendMsg(containerId, role, content, ts) {
    const box = document.getElementById(containerId); if (!box) return;
    const div = document.createElement('div');
    div.className = 'msg ' + role;

    // Normaliser ts en Date JS
    let tsDate = null;
    if (ts instanceof Date)        tsDate = ts;
    else if (ts?.toDate)           tsDate = ts.toDate();
    else if (ts?.seconds)          tsDate = new Date(ts.seconds * 1000);
    else if (ts)                   tsDate = new Date(ts);

    const timeStr = tsDate ? this._fmtTime(tsDate) : '';
    const align   = role === 'user' ? 'right' : 'left';

    if (role === 'ai') {
      div.innerHTML =
        '<div class="mn" style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
        'Doctor Smile IA</div>' +
        '<div class="_msg_body">' + content + '</div>' +
        (timeStr ? '<div class="_msg_ts" style="font-size:7.5px;color:rgba(255,255,255,.2);' +
          'margin-top:5px;text-align:' + align + ';font-family:"Syne",sans-serif;' +
          'letter-spacing:.04em;opacity:.7;">' + timeStr + '</div>' : '');
    } else {
      div.innerHTML =
        '<div class="_msg_body">' + escHtml(content) + '</div>' +
        (timeStr ? '<div class="_msg_ts" style="font-size:7.5px;color:rgba(255,255,255,.2);' +
          'margin-top:5px;text-align:' + align + ';font-family:"Syne",sans-serif;' +
          'letter-spacing:.04em;opacity:.7;">' + timeStr + '</div>' : '');
    }

    // Stocker le timestamp ISO sur le div pour le ticker
    if (tsDate) div.dataset.msgTs = tsDate.toISOString();

    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
  },

  _addTyping(containerId) {
    const box = document.getElementById(containerId);
    if (!box) return { remove: () => {} };
    const t = document.createElement('div');
    t.className = 'typing'; t.id = 'tp';
    t.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(t); box.scrollTop = box.scrollHeight;
    return t;
  },

  // ════ FORMAT DATE / HEURE ════════════════════════════════════
  _fmtDate(ts) {
    if (!ts) return '—';
    const d = ts?.toDate?.() ?? (ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  },

  _fmtTime(d) {
    // d doit être un objet Date JS
    if (!d || !(d instanceof Date) || isNaN(d)) return '';
    const now  = new Date();
    const diff = now - d;  // ms
    if (diff < 0)           return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff < 60000)       return "à l'instant";
    if (diff < 3600000)     return 'il y a ' + Math.floor(diff / 60000) + ' min';
    if (diff < 86400000)    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString())
      return 'hier · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  },

  // ── Timer qui rafraîchit les labels "à l'instant / il y a X min" ──
  _startTimeTicker() {
    if (this._timeTicker) return; // déjà démarré
    this._timeTicker = setInterval(() => {
      // data-msg-ts est mis sur chaque .msg via div.dataset.msgTs = iso
      document.querySelectorAll('.msg[data-msg-ts]').forEach(msgDiv => {
        const iso  = msgDiv.dataset.msgTs;
        if (!iso) return;
        const d    = new Date(iso);
        const tsEl = msgDiv.querySelector('._msg_ts');
        if (tsEl) tsEl.textContent = this._fmtTime(d);
      });
    }, 30000); // rafraîchir toutes les 30 secondes
  },

  // ════ RÉPONSE LOCALE (fallback hors-ligne) ═══════════════════
  _localReply(msg) {
    const a  = S.currentAnalyse;
    const lc = msg.toLowerCase();
    if (!a) return "Chargez d'abord une analyse pour que je puisse vous répondre.";
    const { normalizeRatios, normalizeShap, normalizeRecos } = window.DS_RENDER;
    const ratios = normalizeRatios(a.ratios ?? a.financialRatios ?? []);
    if (lc.includes('liquid')) {
      const r = ratios.find(x => x.n.toLowerCase().includes('liquid'));
      return r
        ? `Ratio de liquidité : <strong>${r.v}</strong> (référence : ${r.b}). ${r.p < 65 ? 'Inférieur à la norme.' : 'Satisfaisant.'}`
        : 'Ratio de liquidité absent des données.';
    }
    if (lc.includes('score') || lc.includes('résult'))
      return `Doctor Score™ : <strong>${a.score}/100</strong> — ${ZC[a.zone ?? zoneFromScore(a.score)]?.l}.`;
    if (lc.includes('shap') || lc.includes('facteur')) {
      const top = normalizeShap(a.shapValues ?? a.shap ?? [])[0];
      return top
        ? `Facteur principal : <strong>${top.n}</strong>, impact ${top.pos ? '+' : ''}${top.v} pts.`
        : 'Valeurs SHAP non disponibles.';
    }
    if (lc.includes('recomm') || lc.includes('amélio')) {
      const u = normalizeRecos(a.recommendations ?? a.recos ?? []).find(r => r.lvl === 'high');
      return u ? `Priorité urgente : <strong>${u.t}</strong>. ${u.d}` : 'Aucune recommandation urgente.';
    }
    return `Score actuel : <strong>${a.score}/100</strong>. Posez une question sur la liquidité, l'endettement, ou les recommandations IA.`;
  },

  // ════ KEYBOARD ═══════════════════════════════════════════════
  chatKeydown(e)     { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChat(); } },
  chatKeydownFull(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChatFull(); } },
  autoResize(el)     { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 90) + 'px'; },

  // ════ CONFIRM MODAL ══════════════════════════════════════════
  _confirm(title, body) {
    return new Promise(resolve => {
      const o = document.createElement('div');
      o.style.cssText = `position:fixed;inset:0;z-index:99999;
        display:flex;align-items:center;justify-content:center;
        background:rgba(0,0,0,.78);backdrop-filter:blur(12px);`;
      o.innerHTML = `
        <div style="background:rgba(8,12,22,.99);border:1px solid rgba(239,68,68,.2);
          border-radius:18px;padding:30px;max-width:380px;width:90%;
          box-shadow:0 24px 60px rgba(0,0,0,.7);">
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;
            color:#fff;margin-bottom:9px;">${title}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.4);line-height:1.7;
            margin-bottom:24px;white-space:pre-line;">${body}</div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="_cc" style="padding:9px 22px;border-radius:9px;
              border:1px solid rgba(255,255,255,.1);background:transparent;
              color:rgba(255,255,255,.4);font-family:'Syne',sans-serif;
              font-size:10px;cursor:pointer;">Annuler</button>
            <button id="_ck" style="padding:9px 22px;border-radius:9px;border:none;
              background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;
              font-family:'Syne',sans-serif;font-size:10px;font-weight:800;cursor:pointer;">
              Supprimer</button>
          </div>
        </div>`;
      document.body.appendChild(o);
      o.querySelector('#_cc').onclick = () => { o.remove(); resolve(false); };
      o.querySelector('#_ck').onclick = () => { o.remove(); resolve(true);  };
      o.onclick = e => { if (e.target === o) { o.remove(); resolve(false); } };
    });
  },

  // ════ API EXTERNE ════════════════════════════════════════════
  _sendToChat(msg) {
    const inp = document.getElementById('chat-inp-full');
    if (inp) { inp.value = msg; inp.focus(); this.sendChatFull(); }
  },
};

// ── Helper timestamp → ms ────────────────────────────────────
function _tsMs(ts) {
  if (!ts) return 0;
  if (ts?.toDate) return ts.toDate().getTime();
  if (ts?.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || 0;
}

// ── Compat window ────────────────────────────────────────────
window._DS_renderChatHistoryPanel = () => window.DS_CHAT.renderChatHistoryPanel();

// ── Init ─────────────────────────────────────────────────────
(function () {
  function init() {
    _patchDsIconInDOM();
    window.DS_CHAT._startTimeTicker(); // démarrer le rafraîchissement des timestamps
    // Re-patch à chaque navigation vers 'chat'
    const origNavTo = window.DS_VIEWS?.navTo;
    if (origNavTo) {
      window.DS_VIEWS.navTo = function (view) {
        origNavTo.call(this, view);
        if (view === 'chat') setTimeout(_patchDsIconInDOM, 120);
      };
    }
    console.log('[ds-chat] ✓ v5 chargé — timestamps live + persistance conv');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();