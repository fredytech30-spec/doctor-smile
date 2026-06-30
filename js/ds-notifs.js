// ════════════════════════════════════════════════════════════════
//  ds-notifs.js — Doctor Smile  v2
//  Notifications Firebase temps réel + Suppression + Réponse + Vue complète
//  Dépend de : ds-core.js
// ════════════════════════════════════════════════════════════════

window.DS_NOTIFS = {

  _state: {
    list:       [],
    _unsub:     null,
    _badgeEl:   null,
    _panelOpen: false,
    _db:        null,
    _uid:       null,
    _fs:        null,   // modules Firestore mis en cache
    _deletedIds: new Set(), // IDs supprimés localement — exclus des snapshots
    _lastSeenAt: 0,         // timestamp dernier snapshot traité (anti-réapparition)
  },

  // ════════════════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════════════════

  async init(uid) {
    this._state._uid = uid;
    try {
      const { db } = await import('./firebase-config.js');
      const fs = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      this._state._db = db;
      this._state._fs = fs;
      const { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } = fs;

      const q = query(
        collection(db, 'notifications', uid, 'items'),
        orderBy('createdAt', 'desc'),
        limit(50),
      );

      if (this._state._unsub) this._state._unsub();
      this._state._unsub = onSnapshot(q, (snap) => {
        // 1. Conserver les read-states locaux
        const localReadIds = new Set(
          this._state.list.filter(n => n.read).map(n => n.id)
        );
        // 2. Exclure les IDs supprimés localement (anti-réapparition)
        const del = this._state._deletedIds;
        const fresh = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(n => !del.has(n.id));
        this._state.list = fresh.map(n =>
          localReadIds.has(n.id) ? { ...n, read: true } : n
        );
        this._state._lastSeenAt = Date.now();
        this._updateBadge();
        if (this._state._panelOpen) this._renderPanel();
        if (document.getElementById('notifs-full-list')) this._renderFullView();
      }, (err) => {
        if (err.code === 'failed-precondition')
          this._seedWelcome(uid, db, collection, addDoc, serverTimestamp);
      });

      window._DS_notifyAnalyseDone = async (analyse) => {
        try {
          const rawF = analyse.filename || analyse.sourceFile || '';
          const fLbl = rawF ? rawF.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ').slice(0,30) : '';
          const notifTitle = analyse.entreprise || fLbl || ('Analyse ' + (analyse.id||'').slice(-5));
          await addDoc(collection(db, 'notifications', uid, 'items'), {
            type: 'analyse',
            title: `Analyse terminée — ${notifTitle}`,
            body: `Score ${analyse.score}/100 · Zone ${analyse.zone ?? '—'} · Modèle ${analyse.model ?? 'ML'}`,
            icon: 'fa-circle-check',
            color: analyse.score >= 75 ? 'var(--success)' : analyse.score >= 50 ? 'var(--amber)' : 'var(--error)',
            analyseId: analyse.id, read: false, createdAt: serverTimestamp(),
          });
        } catch {}
      };

    } catch(e) {
      console.warn('[Notifications] Firestore indisponible — mode local', e);
      this._localFallback();
    }
  },

  async _seedWelcome(uid, db, collection, addDoc, serverTimestamp) {
    try {
      await addDoc(collection(db, 'notifications', uid, 'items'), {
        type: 'system', title: 'Bienvenue sur Doctor Smile',
        body: 'Chargez votre premier bilan pour obtenir votre Doctor Score™.',
        icon: 'fa-wand-magic-sparkles', color: 'var(--cyan)', read: false, createdAt: serverTimestamp(),
      });
    } catch {}
  },

  _localFallback() {
    const a = S.currentAnalyse; if (!a) return;
    if (a.score < 50)
      this._state.list = [{ id: 'l1', title: 'Zone risque détectée', body: `Score ${a.score}/100`, icon: 'fa-triangle-exclamation', color: 'var(--error)', read: false, createdAt: new Date() }];
    this._updateBadge();
  },

  // ════════════════════════════════════════════════════════════
  //  BADGE
  // ════════════════════════════════════════════════════════════

  _updateBadge() {
    const unread = this._state.list.filter(n => !n.read).length;
    let badge = document.getElementById('notif-badge');
    if (!badge) {
      const bell = document.getElementById('notif-bell'); if (!bell) return;
      badge = document.createElement('span');
      badge.id = 'notif-badge';
      badge.style.cssText = 'position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;' +
        'background:var(--error);border-radius:8px;font-size:8px;font-weight:900;color:var(--text);' +
        'display:flex;align-items:center;justify-content:center;padding:0 3px;' +
        'border:2px solid var(--bg-base);z-index:3;pointer-events:none;transition:transform .2s;';
      bell.appendChild(badge);
    }
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.style.display = 'flex'; badge.style.transform = 'scale(1)';
    } else {
      badge.style.transform = 'scale(0)';
      setTimeout(() => { badge.style.display = 'none'; }, 200);
    }
    this._state._badgeEl = badge;
  },

  // ════════════════════════════════════════════════════════════
  //  PANEL FLOTTANT
  // ════════════════════════════════════════════════════════════

  async togglePanel() {
    const existing = document.getElementById('_notif_panel');
    if (existing) { existing.remove(); this._state._panelOpen = false; return; }
    this._state._panelOpen = true;
    this._renderPanel();
    setTimeout(() => this.markAllRead(), 1500);
  },

  _renderPanel() {
    const old = document.getElementById('_notif_panel'); if (old) old.remove();
    const panel = document.createElement('div');
    panel.id = '_notif_panel';
    panel.style.cssText =
      'position:fixed;top:56px;right:16px;width:340px;max-height:500px;' +
      'z-index:9500;background:var(--bg-elevated);border:1px solid var(--border-v);' +
      'border-radius:14px;box-shadow:var(--shadow-lg);backdrop-filter:blur(20px);' +
      'display:flex;flex-direction:column;animation:mIn .22s cubic-bezier(.16,1,.3,1);overflow:hidden;';

    const unreadCount = this._state.list.filter(n => !n.read).length;
    const preview = this._state.list.slice(0, 8);

    panel.innerHTML = `
      <div style="padding:14px 16px 10px;border-bottom:1px solid var(--border);
        display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <div style="font-family:Syne,sans-serif;font-size:12px;font-weight:900;color:var(--text);">
          <i class="fa-solid fa-bell" style="color:var(--cyan);margin-right:7px;"></i>Notifications
          ${this._state.list.length ? `<span style="font-size:9px;color:var(--text-hint);font-weight:400;margin-left:4px;">${this._state.list.length}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${unreadCount ? `<button id="_np_markread" style="font-size:8px;color:var(--cyan);background:var(--cyan-hover);border:1px solid var(--cyan-border);border-radius:6px;padding:3px 8px;cursor:pointer;font-family:Syne,sans-serif;">Tout lire</button>` : ''}
          ${this._state.list.length ? `<button id="_np_delall" style="font-size:8px;color:var(--error);background:var(--error-bg);border:1px solid var(--error-border);border-radius:6px;padding:3px 8px;cursor:pointer;font-family:Syne,sans-serif;">Tout supprimer</button>` : ''}
          <button id="_np_close" style="background:var(--surface-3);border:none;border-radius:6px;padding:4px 8px;color:var(--text-hint);cursor:pointer;">✕</button>
        </div>
      </div>
      <div id="_ni_list" style="overflow-y:auto;flex:1;">
        ${preview.length
          ? preview.map(n => this._renderItem(n)).join('')
          : `<div style="padding:32px;text-align:center;">
               <i class="fa-solid fa-bell-slash" style="font-size:22px;color:var(--text-hint);display:block;margin-bottom:10px;opacity:.3;"></i>
               <div style="font-size:10px;color:var(--text-muted);">Aucune notification</div>
             </div>`}
      </div>
      ${this._state.list.length > 8 ? `
      <div style="padding:10px 16px;border-top:1px solid var(--border);flex-shrink:0;text-align:center;">
        <button id="_np_viewall" style="font-size:9px;color:var(--cyan);background:var(--cyan-hover);
          border:1px solid var(--cyan-border);border-radius:8px;padding:7px 0;
          cursor:pointer;font-family:Syne,sans-serif;font-weight:800;width:100%;transition:background .15s;"
          onmouseenter="this.style.background='var(--cyan-glow)'"
          onmouseleave="this.style.background='var(--cyan-hover)'">
          Voir toutes les notifications (${this._state.list.length})
        </button>
      </div>` : ''}`;

    document.body.appendChild(panel);

    // Events
    panel.querySelector('#_np_close')?.addEventListener('click', () => { panel.remove(); this._state._panelOpen = false; });
    panel.querySelector('#_np_markread')?.addEventListener('click', () => this.markAllRead());
    panel.querySelector('#_np_delall')?.addEventListener('click', () => this.deleteAll());
    panel.querySelector('#_np_viewall')?.addEventListener('click', () => {
      panel.remove(); this._state._panelOpen = false;
      window.DS?.navTo?.('notifications');
    });

    // Clic extérieur
    setTimeout(() => {
      document.addEventListener('click', function _h(e) {
        const bell = document.getElementById('notif-bell');
        if (!panel.contains(e.target) && !bell?.contains(e.target)) {
          panel.remove(); window.DS_NOTIFS._state._panelOpen = false;
          document.removeEventListener('click', _h);
        }
      });
    }, 150);
  },

  // ── Item HTML (partagé panel + vue complète) ─────────────────
  _renderItem(n) {
    const dt = n.createdAt?.toDate ? n.createdAt.toDate() : (n.createdAt ? new Date(n.createdAt) : new Date());
    const ago = (typeof window.msToHuman === 'function')
      ? window.msToHuman(Date.now() - dt)
      : (function(ms){
          const s = Math.floor(ms/1000); if (isNaN(s)) return '';
          if (s < 60) return s + 's';
          const m = Math.floor(s/60); if (m < 60) return m + 'm';
          const h = Math.floor(m/60); if (h < 24) return h + 'h';
          const d = Math.floor(h/24); return d + 'j';
        })(Date.now() - dt);
    const canReply = n.type === 'message' || n.fromUid || n.isAdmin;
    const dot = !n.read
      ? `<span style="width:7px;height:7px;background:var(--cyan);border-radius:50%;flex-shrink:0;margin-top:4px;align-self:flex-start;"></span>`
      : '<span style="width:7px;flex-shrink:0;"></span>';

    return `<div class="_ni" data-nid="${n.id}"
      style="display:flex;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border);
        background:${n.read ? 'transparent' : 'var(--surface-2)'};transition:background .15s;position:relative;"
      onmouseenter="this.querySelector('._nia').style.opacity='1';this.style.background='var(--cyan-glow)'"
      onmouseleave="this.querySelector('._nia').style.opacity='0';this.style.background='${n.read ? 'transparent' : 'var(--surface-2)'}'">

      <div style="width:34px;height:34px;border-radius:9px;flex-shrink:0;
        background:${n.color?.startsWith('var') ? n.color : (n.color ?? 'var(--cyan)')}18;color:${n.color?.startsWith('var') ? n.color : (n.color ?? 'var(--cyan)')};
        display:flex;align-items:center;justify-content:center;font-size:13px;">
        <i class="fa-solid ${n.icon ?? 'fa-bell'}"></i>
      </div>

      <div style="flex:1;min-width:0;cursor:pointer;padding-right:58px;"
        onclick="window.DS_NOTIFS._onItemClick('${n.id}')">
        <div style="font-family:Syne,sans-serif;font-size:10px;font-weight:800;color:var(--text);
          margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escHtml(n.title ?? '')}</div>
        <div style="font-size:9px;color:var(--text-2);line-height:1.4;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
          ${escHtml(n.body ?? '')}</div>
        ${n.fromName ? `<div style="font-size:8px;color:var(--text-muted);margin-top:2px;">
          <i class="fa-solid fa-user" style="margin-right:3px;font-size:7px;"></i>${escHtml(n.fromName)}</div>` : ''}
        <div style="font-size:8px;color:var(--text-hint);margin-top:3px;">${ago}</div>
      </div>

      ${dot}

      <!-- Actions (hover) -->
      <div class="_nia" style="position:absolute;top:50%;right:12px;transform:translateY(-50%);
        display:flex;gap:5px;opacity:0;transition:opacity .15s;">
        ${canReply ? `<button title="Répondre"
          onclick="event.stopPropagation();window.DS_NOTIFS._openReply('${n.id}')"
          style="width:28px;height:28px;border-radius:8px;border:1px solid var(--cyan-border);
          background:var(--cyan-hover);color:var(--cyan);font-size:10px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;transition:background .15s;"
          onmouseenter="this.style.background='var(--cyan-glow)'"
          onmouseleave="this.style.background='var(--cyan-hover)'">
          <i class="fa-solid fa-reply"></i></button>` : ''}
        <button title="Supprimer"
          onclick="event.stopPropagation();window.DS_NOTIFS.deleteNotif('${n.id}')"
          style="width:28px;height:28px;border-radius:8px;border:1px solid var(--error-border);
          background:var(--error-bg);color:var(--error);font-size:10px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;transition:all .15s;"
          onmouseenter="this.style.background='var(--error-bg)';this.style.opacity='1'"
          onmouseleave="this.style.background='var(--error-bg)';this.style.opacity='.7'">
          <i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  },

  _onItemClick(nid) {
    const notif = this._state.list.find(n => n.id === nid);
    if (notif?.analyseId) {
      const a = S.analyses.find(x => x.id === notif.analyseId);
      if (a) { window.DS?.navTo?.('dashboard'); window.DS_DASH?.loadAnalyse(a); }
    }
    document.getElementById('_notif_panel')?.remove();
    this._state._panelOpen = false;
  },

  // ════════════════════════════════════════════════════════════
  //  VUE COMPLÈTE — rendu dans #notifs-full-list
  // ════════════════════════════════════════════════════════════

  _renderFullView() {
    const container = document.getElementById('notifs-full-list');
    const counter   = document.getElementById('notifs-count');
    if (!container) return;

    const list   = this._state.list;
    const unread = list.filter(n => !n.read).length;

    if (counter) counter.textContent = list.length
      ? `${list.length} notification${list.length > 1 ? 's' : ''} · ${unread} non lue${unread > 1 ? 's' : ''}`
      : 'Aucune notification';

    if (!list.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:80px 20px;">
          <i class="fa-solid fa-bell-slash" style="font-size:40px;color:var(--text-hint);display:block;margin-bottom:16px;opacity:.1;"></i>
          <div style="font-size:13px;font-weight:700;color:var(--text-hint);margin-bottom:6px;">Aucune notification</div>
          <div style="font-size:10px;color:var(--text-muted);">Les analyses terminées et les messages apparaîtront ici.</div>
        </div>`;
      return;
    }

    // Grouper par date
    const groups = {};
    list.forEach(n => {
      const dt  = n.createdAt?.toDate ? n.createdAt.toDate() : (n.createdAt ? new Date(n.createdAt) : new Date());
      const key = _notifDateKey(dt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    container.innerHTML = Object.entries(groups).map(([label, notifs]) => `
      <div style="margin-bottom:8px;">
        <div style="font-family:Syne,sans-serif;font-size:8px;font-weight:800;letter-spacing:.14em;
          text-transform:uppercase;color:var(--text-hint);padding:10px 2px 6px;">${label}</div>
        <div style="background:var(--surface-1);border:1px solid var(--border);border-radius:14px;overflow:hidden;">
          ${notifs.map(n => this._renderItem(n)).join('')}
        </div>
      </div>`
    ).join('');
  },

  // ════════════════════════════════════════════════════════════
  //  ACTIONS
  // ════════════════════════════════════════════════════════════

  async markAllRead() {
    const uid = this._state._uid || S.user?.uid; if (!uid) return;

    // ── Mise à jour OPTIMISTE immédiate — badge disparaît tout de suite ──
    this._state.list.forEach(n => n.read = true);
    this._updateBadge();
    if (this._state._panelOpen) this._renderPanel();
    if (document.getElementById('notifs-full-list')) this._renderFullView();

    // ── Puis persister dans Firestore en arrière-plan ──
    try {
      if (this._state._fs && this._state._db) {
        const { doc, updateDoc } = this._state._fs;
        await Promise.all(
          this._state.list.map(n =>
            updateDoc(doc(this._state._db, 'notifications', uid, 'items', n.id), { read: true })
          )
        );
      }
    } catch(e) {
      console.warn('[markAllRead] Firestore error (state already updated locally)', e);
    }
  },

  async deleteNotif(nid) {
    const uid = this._state._uid || S.user?.uid; if (!uid) return;

    // ── 1. Marquer immédiatement comme supprimé localement ────
    this._state._deletedIds.add(nid);
    this._state.list = this._state.list.filter(n => n.id !== nid);
    this._updateBadge();
    if (this._state._panelOpen) this._renderPanel();
    if (document.getElementById('notifs-full-list')) this._renderFullView();

    // ── 2. Animation de sortie ────────────────────────────────
    const el = document.querySelector(`._ni[data-nid="${nid}"]`);
    if (el) {
      el.style.transition = 'opacity .2s,transform .2s';
      el.style.opacity = '0'; el.style.transform = 'translateX(10px)';
    }

    // ── 3. Persister dans Firestore en arrière-plan ───────────
    setTimeout(async () => {
      try {
        if (this._state._fs && this._state._db) {
          const { doc, deleteDoc } = this._state._fs;
          await deleteDoc(doc(this._state._db, 'notifications', uid, 'items', nid));
          // Nettoyer _deletedIds après 60s (GC léger)
          setTimeout(() => this._state._deletedIds.delete(nid), 60000);
        }
      } catch(e) {
        // Firestore indisponible : la suppression locale persiste en mémoire
        console.warn('[deleteNotif] Firestore error — suppression locale conservée', e);
      }
    }, 250);
  },

  async deleteAll() {
    const uid = this._state._uid || S.user?.uid; if (!uid) return;
    if (!this._state.list.length) return;
    if (!confirm(`Supprimer les ${this._state.list.length} notification${this._state.list.length > 1 ? 's' : ''} ?`)) return;

    // ── 1. Suppression locale immédiate (anti-réapparition) ───
    const idsToDelete = this._state.list.map(n => n.id);
    idsToDelete.forEach(id => this._state._deletedIds.add(id));
    this._state.list = [];
    this._updateBadge();
    if (this._state._panelOpen) this._renderPanel();
    if (document.getElementById('notifs-full-list')) this._renderFullView();
    showToast('Toutes les notifications supprimées', 'ok');

    // ── 2. Persister dans Firestore en arrière-plan ───────────
    if (this._state._fs && this._state._db) {
      const { doc, deleteDoc } = this._state._fs;
      Promise.all(
        idsToDelete.map(id =>
          deleteDoc(doc(this._state._db, 'notifications', uid, 'items', id))
            .catch(e => console.warn('[deleteAll] id=' + id, e))
        )
      ).then(() => {
        // Nettoyer _deletedIds après 60s
        setTimeout(() => idsToDelete.forEach(id => this._state._deletedIds.delete(id)), 60000);
      });
    }
  },

  // ════════════════════════════════════════════════════════════
  //  MODAL RÉPONSE
  // ════════════════════════════════════════════════════════════

  _openReply(nid) {
    const notif = this._state.list.find(n => n.id === nid);
    if (!notif) return;

    document.getElementById('_reply_modal')?.remove();
    const modal = document.createElement('div');
    modal.id = '_reply_modal';
    modal.style.cssText =
      'position:fixed;inset:0;z-index:99995;display:flex;align-items:center;' +
      'justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(16px);' +
      'animation:mIn .2s cubic-bezier(.16,1,.3,1);';

    const senderName  = notif.fromName || 'Doctor Smile';
    const senderIcon  = notif.icon     || 'fa-bell';
    const senderColor = notif.color    || 'var(--cyan)';

    modal.innerHTML = `
      <div style="background:var(--bg-elevated);border:1px solid var(--border-v);
        border-radius:18px;padding:28px;max-width:500px;width:92%;
        box-shadow:var(--shadow-lg);">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
          <div style="display:flex;gap:12px;align-items:center;">
            <div style="width:40px;height:40px;border-radius:10px;flex-shrink:0;
              background:${senderColor.startsWith('var')?senderColor:senderColor}18;color:${senderColor};
              display:flex;align-items:center;justify-content:center;font-size:16px;">
              <i class="fa-solid ${senderIcon}"></i></div>
            <div>
              <div style="font-family:Syne,sans-serif;font-size:13px;font-weight:900;color:var(--text);margin-bottom:2px;">
                Répondre à ${escHtml(senderName)}</div>
              <div style="font-size:9px;color:var(--text-hint);">
                <i class="fa-solid fa-reply" style="margin-right:4px;"></i>
                En réponse à : ${escHtml((notif.title ?? '').slice(0, 52))}${(notif.title ?? '').length > 52 ? '…' : ''}</div>
            </div>
          </div>
          <button id="_rm_close" style="background:var(--surface-3);border:none;border-radius:8px;
            padding:6px 10px;color:var(--text-hint);cursor:pointer;font-size:13px;">✕</button>
        </div>

        <!-- Message original -->
        <div style="padding:12px 14px;border-radius:10px;background:var(--surface-2);
          border:1px solid var(--border);margin-bottom:16px;">
          <div style="font-size:9px;font-weight:800;color:var(--text-hint);
            letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px;">Message reçu</div>
          <div style="font-size:10px;color:var(--text-2);line-height:1.6;">${escHtml(notif.body ?? '')}</div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;
            letter-spacing:.1em;text-transform:uppercase;color:var(--text-hint);
            display:block;margin-bottom:8px;">Votre réponse</label>
          <textarea id="_rm_body" rows="4" placeholder="Écrivez votre réponse… (Ctrl+Entrée pour envoyer)"
            style="width:100%;padding:12px 14px;background:var(--surface-1);
              border:1px solid var(--cyan-border);border-radius:10px;
              color:var(--text);font-family:'Instrument Sans',sans-serif;font-size:11px;
              resize:none;outline:none;transition:border-color .18s,box-shadow .18s;box-sizing:border-box;"
            onfocus="this.style.borderColor='var(--cyan)';this.style.boxShadow='0 0 0 3px var(--cyan-glow)'"
            onfocusout="this.style.borderColor='var(--cyan-border)';this.style.boxShadow='none'"></textarea>
          <div style="font-size:8px;color:var(--text-hint);margin-top:5px;text-align:right;">
            <span id="_rm_cc">0</span>/500</div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="_rm_cancel"
            style="padding:10px 20px;border-radius:10px;border:1px solid var(--border);
            background:var(--surface-2);color:var(--text-hint);
            font-family:Syne,sans-serif;font-size:9px;font-weight:800;
            letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .15s;"
            onmouseenter="this.style.background='var(--surface-3)'"
            onmouseleave="this.style.background='var(--surface-2)'">Annuler</button>
          <button id="_rm_send"
            style="padding:10px 24px;border-radius:10px;border:none;
            background:var(--cyan);color:var(--bg-base);
            font-family:Syne,sans-serif;font-size:9px;font-weight:900;
            letter-spacing:.08em;text-transform:uppercase;cursor:pointer;
            box-shadow:var(--shadow-md);transition:all .18s;"
            onmouseenter="this.style.transform='translateY(-1px)';this.style.boxShadow='var(--shadow-lg)'"
            onmouseleave="this.style.transform='none';this.style.boxShadow='var(--shadow-md)'">
            <i class="fa-solid fa-paper-plane" style="margin-right:6px;"></i>Envoyer
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const ta = modal.querySelector('#_rm_body');
    const cc = modal.querySelector('#_rm_cc');
    ta.addEventListener('input', () => { const l = ta.value.length; cc.textContent = l; if (l > 500) ta.value = ta.value.slice(0, 500); });
    ta.focus();

    modal.querySelector('#_rm_close')?.addEventListener('click',  () => modal.remove());
    modal.querySelector('#_rm_cancel')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#_rm_send')?.addEventListener('click',   () => { const b = ta.value.trim(); if (b) this._sendReply(notif, b, modal); });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { const b = ta.value.trim(); if (b) this._sendReply(notif, b, modal); } });
  },

  async _sendReply(notif, body, modal) {
    const uid = this._state._uid || S.user?.uid; if (!uid) return;
    const btn = modal.querySelector('#_rm_send');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>'; }

    try {
      if (this._state._fs && this._state._db) {
        const { collection, addDoc, serverTimestamp } = this._state._fs;
        const p = S.profile;
        const senderName = [p?.prenom, p?.nom].filter(Boolean).join(' ') || S.user?.displayName || 'Utilisateur';

        if (notif.fromUid) {
          await addDoc(collection(this._state._db, 'notifications', notif.fromUid, 'items'), {
            type: 'message', title: `Réponse de ${senderName}`, body,
            icon: 'fa-reply', color: 'var(--cyan)', read: false,
            fromUid: uid, fromName: senderName,
            replyToId: notif.id, replyToTitle: notif.title,
            createdAt: serverTimestamp(),
          });
        }

        await addDoc(collection(this._state._db, 'messages_sent', uid, 'items'), {
          to: notif.fromUid || 'admin', toName: notif.fromName || 'Doctor Smile',
          body, replyToId: notif.id, replyToTitle: notif.title,
          sentAt: serverTimestamp(),
        });
      }

      modal.remove();
      showToast('Réponse envoyée', 'ok');
    } catch(e) {
      console.error('[Reply]', e);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right:6px;"></i>Envoyer'; }
      showToast("Erreur lors de l'envoi", 'warn');
    }
  },

  // ════════════════════════════════════════════════════════════
  //  PARTAGE RAPPORT
  // ════════════════════════════════════════════════════════════

  async shareReport(analyseId) {
    const a = analyseId ? S.analyses.find(x => x.id === analyseId) || S.currentAnalyse : S.currentAnalyse;
    if (!a) { showToast('Aucune analyse à partager', 'warn'); return; }

    const zone = a.zone ?? zoneFromScore(a.score ?? 0);
    const zc = ZC[zone], score = a.score ?? 0;
    const prob = Math.round((100 - score) * ({ saine: .6, vigilance: 1, risque: 1.3, critique: 1.6 }[zone] || 1) * .85);
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const titre = `Doctor Smile — ${a.entreprise ?? 'Analyse financière'}`;
    const texte = `Score ${score}/100 · ${zc.l} · Prob. défaut ${prob}% · Modèle ${a.model ?? 'ML'} · ${date}`;
    const url = window.location.href;

    const { normalizeRatios, normalizeRecos } = window.DS_RENDER;
    const ratios = normalizeRatios(a.ratios || a.financialRatios || []);
    const recos  = normalizeRecos(a.recommendations || a.recos || []);
    const reportHTML = this._buildReportHTML(a, score, zone, zc, date, prob, ratios, recos);
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const blobURL = URL.createObjectURL(blob);

    const modal = document.createElement('div');
    modal.id = '_share_modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(14px);';

    const PLATFORMS = [
      { id:'whatsapp', label:'WhatsApp',   icon:'fa-whatsapp',  brand:true,  color:'#25D366', url:`https://wa.me/?text=${encodeURIComponent(titre+'\n'+texte+'\n'+url)}` },
      { id:'telegram', label:'Telegram',   icon:'fa-telegram',  brand:true,  color:'#2CA5E0', url:`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(titre+'\n'+texte)}` },
      { id:'linkedin', label:'LinkedIn',   icon:'fa-linkedin',  brand:true,  color:'#0A66C2', url:`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(texte)}` },
      { id:'email',    label:'Email',      icon:'fa-envelope',  brand:false, color:'var(--cyan)', url:`mailto:?subject=${encodeURIComponent(titre)}&body=${encodeURIComponent(texte+'\n\n'+url)}` },
      { id:'twitter',  label:'X / Twitter',icon:'fa-x-twitter', brand:true,  color:'#e2e8f0', url:`https://twitter.com/intent/tweet?text=${encodeURIComponent(titre+' — '+texte)}&url=${encodeURIComponent(url)}` },
      { id:'facebook', label:'Facebook',   icon:'fa-facebook',  brand:true,  color:'#1877F2', url:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(texte)}` },
      { id:'slack',    label:'Slack',      icon:'fa-slack',     brand:true,  color:'#4A154B', url:`https://slack.com/intl/share?text=${encodeURIComponent(titre+'\n'+texte)}` },
      { id:'copy',     label:'Copier lien',icon:'fa-link',      brand:false, color:'var(--violet-2)', url:null },
    ];

    modal.innerHTML = `
      <div style="background:var(--bg-elevated);border:1px solid var(--border-v);border-radius:18px;padding:28px;max-width:480px;width:92%;animation:mIn .24s cubic-bezier(.16,1,.3,1);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
          <div>
            <div style="font-family:Syne,sans-serif;font-size:15px;font-weight:900;color:var(--text);margin-bottom:4px;">
              <i class="fa-solid fa-share-nodes" style="color:var(--cyan);margin-right:8px;"></i>Partager le rapport</div>
            <div style="font-size:9px;color:var(--text-hint);">${escHtml(a.entreprise ?? 'Analyse')} · Score ${score}/100</div>
          </div>
          <button onclick="document.getElementById('_share_modal')?.remove();URL.revokeObjectURL('${blobURL}')"
            style="background:var(--surface-3);border:none;border-radius:8px;padding:6px 12px;color:var(--text-hint);cursor:pointer;">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
          ${PLATFORMS.map(p=>`
            <button data-pid="${p.id}" data-url="${p.url??''}"
              style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);cursor:pointer;transition:all .15s;font-family:Syne,sans-serif;"
              onmouseenter="this.style.background='var(--surface-3)';this.style.borderColor='${p.color.startsWith('var')?p.color:p.color}44'"
              onmouseleave="this.style.background='var(--surface-2)';this.style.borderColor='var(--border)'">
              <i class="fa-${p.brand?'brands':'solid'} ${p.icon}" style="font-size:18px;color:${p.color};"></i>
              <span style="font-size:8px;color:var(--text-hint);font-weight:700;">${p.label}</span>
            </button>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <div style="flex:1;height:1px;background:var(--border);"></div>
          <span style="font-size:9px;color:var(--text-hint);">OU VIA APPAREIL</span>
          <div style="flex:1;height:1px;background:var(--border);"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <button id="_share_wifi" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;border:1px solid var(--success-border);background:var(--success-bg);cursor:pointer;font-family:Syne,sans-serif;" onmouseenter="this.style.background='var(--success-glow)'" onmouseleave="this.style.background='var(--success-bg)'">
            <i class="fa-solid fa-wifi" style="font-size:18px;color:var(--success);"></i>
            <span style="font-size:8px;color:var(--text-hint);font-weight:700;">WiFi / AirDrop</span>
          </button>
          <button id="_share_bt" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;border:1px solid var(--cyan-border);background:var(--cyan-hover);cursor:pointer;font-family:Syne,sans-serif;" onmouseenter="this.style.background='var(--cyan-glow)'" onmouseleave="this.style.background='var(--cyan-hover)'">
            <i class="fa-solid fa-bluetooth-b" style="font-size:18px;color:var(--cyan);"></i>
            <span style="font-size:8px;color:var(--text-hint);font-weight:700;">Bluetooth</span>
          </button>
          <a href="${blobURL}" download="rapport-${(a.entreprise??'analyse').replace(/\s/g,'-')}.html"
            style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;border:1px solid var(--amber-border);background:var(--amber-bg);cursor:pointer;font-family:Syne,sans-serif;text-decoration:none;" onmouseenter="this.style.background='var(--amber-glow)'" onmouseleave="this.style.background='var(--amber-bg)'">
            <i class="fa-solid fa-download" style="font-size:18px;color:var(--amber);"></i>
            <span style="font-size:8px;color:var(--text-hint);font-weight:700;">Télécharger</span>
          </a>
        </div>
      </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    modal.querySelectorAll('[data-pid]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid = btn.dataset.pid, purl = btn.dataset.url;
        if (pid === 'copy') {
          try { await navigator.clipboard.writeText(url); showToast('Lien copié','ok'); }
          catch { showToast('Impossible de copier','warn'); }
          modal.remove(); return;
        }
        if (purl) { window.open(purl,'_blank','noopener'); modal.remove(); }
      });
    });

    document.getElementById('_share_wifi')?.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title:titre, text:texte, url, files:[new File([blob],`rapport-${a.entreprise??'analyse'}.html`,{type:'text/html'})] });
          showToast('Partagé via WiFi/AirDrop','ok'); modal.remove();
        } catch(err) { if (err.name!=='AbortError') { try { await navigator.share({title:titre,text:texte,url}); modal.remove(); } catch {} } }
      } else { showToast('Partagez via votre navigateur (F12 → Share)','info'); }
    });

    document.getElementById('_share_bt')?.addEventListener('click', async () => {
      if (navigator.bluetooth) {
        showToast('Ouverture Bluetooth…','info');
        try {
          const device = await navigator.bluetooth.requestDevice({acceptAllDevices:true});
          showToast(`Appareil trouvé : ${device.name??'inconnu'} — transfert en cours…`,'info');
          const w = window.open('','_blank'); if (w) { w.document.write(reportHTML); w.document.close(); }
          showToast('Rapport ouvert — imprimez ou partagez depuis cet appareil','ok');
        } catch(err) { if (err.name!=='NotFoundError'&&err.name!=='SecurityError') showToast('Bluetooth non disponible','warn'); }
      } else {
        showToast('Bluetooth : activez via Paramètres système puis partagez le fichier téléchargé','info');
        const a2 = document.createElement('a'); a2.href=blobURL; a2.download=`rapport-${(a.entreprise??'analyse').replace(/\s/g,'-')}.html`; a2.click();
      }
    });
  },

  _buildReportHTML(a, score, zone, zc, date, prob, ratios, recos) {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Doctor Smile — Rapport ${escHtml(a.entreprise??'')}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      *{box-sizing:border-box;}body{font-family:'Segoe UI',system-ui,sans-serif;color:#1a1a2e;margin:0;padding:40px;background:#fff;}
      @media print{body{padding:20px;}}h1{font-size:24px;font-weight:900;margin-bottom:2px;}
      .sub{color:#666;font-size:11px;margin-bottom:28px;}
      .score-row{display:flex;align-items:center;gap:20px;padding:20px;border-radius:12px;background:${zc.bg.replace('.1)',',0.08)')};border:1px solid ${zc.s}44;margin-bottom:24px;}
      .score-big{font-size:60px;font-weight:900;line-height:1;color:${zc.s};}
      .zone{display:inline-block;padding:4px 14px;border-radius:100px;font-size:10px;font-weight:800;background:${zc.bg};color:${zc.s};letter-spacing:.08em;text-transform:uppercase;}
      table{width:100%;border-collapse:collapse;}th{text-align:left;padding:7px 10px;background:#f9fafb;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;}
      td{padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:10px;}
      .reco{padding:10px 14px;border-radius:8px;margin-bottom:8px;border-left:4px solid;}
      .reco.high{background:#fff5f5;border-color:#ef4444;}.reco.medium{background:#fffbf0;border-color:#f59e0b;}.reco.low{background:#f0fdf4;border-color:#10b981;}
      .reco-t{font-weight:700;font-size:11px;margin-bottom:3px;}.reco-d{font-size:10px;color:#6b7280;}
      h3{font-size:13px;font-weight:800;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #f3f4f6;}
      .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:8px;color:#9ca3af;text-align:center;}
    </style></head><body>
    <h1>Doctor Smile™</h1>
    <div class="sub">Rapport généré le ${date} · ${escHtml(a.model??'Modèle ML')}</div>
    <div class="score-row">
      <div class="score-big">${score}</div>
      <div>
        <div style="font-size:18px;font-weight:800;margin-bottom:6px;">${escHtml(a.entreprise??'Analyse financière')}</div>
        <div class="zone">${zc.l}</div>
        <div style="margin-top:8px;font-size:11px;color:#6b7280;">
          Probabilité défaut <strong>${prob}%</strong> · Confiance <strong>${a.confidence??'—'}%</strong> · AUC <strong>${a.auc??'—'}</strong></div>
      </div>
    </div>
    ${ratios.length?`<h3>Ratios financiers</h3><table><thead><tr><th>Ratio</th><th>Valeur</th><th>Référence</th><th>Score</th></tr></thead><tbody>${ratios.map(r=>`<tr><td>${escHtml(r.n)}</td><td><strong style="color:${r.c}">${r.v}${r.u}</strong></td><td style="color:#6b7280;">${r.b}</td><td><strong style="color:${r.c}">${r.p}/100</strong></td></tr>`).join('')}</tbody></table>`:''}
    ${recos.length?`<h3>Recommandations IA</h3>${recos.map(r=>`<div class="reco ${r.lvl}"><div class="reco-t">${escHtml(r.t)}</div><div class="reco-d">${escHtml(r.d)}</div></div>`).join('')}`:''}
    <div class="footer">Doctor Smile™ · Rapport automatisé · Ne constitue pas un conseil financier réglementé</div>
    </body></html>`;
  },
};

// ── Helper date grouping ───────────────────────────────────────
function _notifDateKey(dt) {
  const diff = Math.floor((Date.now() - dt) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7)  return 'Cette semaine';
  if (diff < 30) return 'Ce mois-ci';
  return 'Plus ancien';
}

console.log('[ds-notifs] ✓ v2 chargé');
