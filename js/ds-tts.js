// ════════════════════════════════════════════════════════════════
//  DS_TTS — Moteur Text-to-Speech Doctor Smile
//  Web Speech API (natif, gratuit, aucune clé API)
//  Voix naturelle FR + contrôles lecture + mode "appel assistant"
// ════════════════════════════════════════════════════════════════

window.DS_TTS = (() => {

  // ── État ────────────────────────────────────────────────────
  let _synth      = window.speechSynthesis;
  let _voices     = [];
  let _bestVoice  = null;
  let _utterance  = null;
  let _playing    = false;
  let _paused     = false;
  let _callMode   = false;       // mode "appel assistant vocal"
  let _autoRead   = false;       // lecture auto des nouvelles réponses IA
  let _queue      = [];          // file de textes à lire
  let _currentBtn = null;        // bouton play actif (pour reset icône)

  // ── Charger les voix disponibles ────────────────────────────
  function _loadVoices() {
    _voices = _synth.getVoices();
    _bestVoice = _pickBestVoice();
  }
  _synth.onvoiceschanged = _loadVoices;
  _loadVoices();

  // ── Choisir la meilleure voix française disponible ───────────
  // Priorité : Google français > Microsoft français > toute voix FR
  function _pickBestVoice() {
    const all = _synth.getVoices();
    if (!all.length) return null;

    const priority = [
      v => v.name.includes('Google') && v.lang.startsWith('fr'),
      v => v.name.includes('Microsoft') && v.lang.startsWith('fr') && v.name.includes('Amélie'),
      v => v.name.includes('Microsoft') && v.lang.startsWith('fr') && v.name.includes('Julie'),
      v => v.name.includes('Microsoft') && v.lang.startsWith('fr') && v.name.includes('Hortense'),
      v => v.name.includes('Microsoft') && v.lang.startsWith('fr'),
      v => v.lang === 'fr-FR',
      v => v.lang.startsWith('fr'),
      v => v.lang.startsWith('en') && v.name.includes('Google'),
      v => true,  // fallback absolu
    ];
    for (const test of priority) {
      const match = all.find(test);
      if (match) return match;
    }
    return all[0];
  }

  // ── Nettoyer le texte HTML avant lecture ─────────────────────
  function _cleanText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    let text = tmp.textContent || tmp.innerText || '';
    // Supprimer les URLs, les chiffres isolés, "Doctor Smile IA"
    text = text
      .replace(/Doctor Smile IA/gi, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    // Limiter à 1500 chars pour éviter les très longs textes
    if (text.length > 1500) text = text.slice(0, 1500) + '…';
    return text;
  }

  // ── Lire un texte ────────────────────────────────────────────
  function speak(text, opts = {}) {
    if (!_synth) return;
    const cleaned = _cleanText(text);
    if (!cleaned) return;

    stop(); // stopper ce qui est en cours

    if (!_bestVoice) _bestVoice = _pickBestVoice();

    _utterance = new SpeechSynthesisUtterance(cleaned);
    _utterance.voice  = _bestVoice;
    _utterance.lang   = _bestVoice?.lang || 'fr-FR';
    _utterance.rate   = opts.rate  ?? (_callMode ? 0.92 : 0.95);
    _utterance.pitch  = opts.pitch ?? (_callMode ? 1.05 : 1.0);
    _utterance.volume = opts.volume ?? 1.0;

    _utterance.onstart = () => {
      _playing = true; _paused = false;
      _updateBar(true);
      opts.onStart?.();
    };
    _utterance.onend = () => {
      _playing = false; _paused = false;
      _resetBtn(opts.btn);
      _updateBar(false);
      opts.onEnd?.();
      _processQueue();
    };
    _utterance.onerror = (e) => {
      if (e.error === 'interrupted') return;
      _playing = false;
      _resetBtn(opts.btn);
      _updateBar(false);
    };

    if (opts.btn) {
      _currentBtn = opts.btn;
      opts.btn.innerHTML = '<i class="fa-solid fa-stop"></i>';
      opts.btn.style.color = '#ef4444';
    }

    _synth.speak(_utterance);
  }

  // ── Pause / Resume ───────────────────────────────────────────
  function pause() {
    if (!_synth.speaking) return;
    if (_paused) { _synth.resume(); _paused = false; _updateBar(true); }
    else         { _synth.pause();  _paused = true;  _updateBar(false, true); }
  }

  // ── Stop ─────────────────────────────────────────────────────
  function stop() {
    _synth.cancel();
    _playing = false; _paused = false;
    _queue   = [];
    _resetBtn(_currentBtn);
    _currentBtn = null;
    _updateBar(false);
  }

  // ── Toggle lecture d'un bouton ───────────────────────────────
  // Appelé depuis le bouton 🔊 de chaque bulle IA
  function toggleMsg(btn, html) {
    if (_playing && _currentBtn === btn) { stop(); return; }
    if (_playing) stop();
    speak(html, { btn });
  }

  // ── File d'attente ───────────────────────────────────────────
  function enqueue(text) {
    _queue.push(text);
    if (!_playing) _processQueue();
  }
  function _processQueue() {
    if (!_queue.length) return;
    const next = _queue.shift();
    speak(next);
  }

  // ── Reset bouton icône ────────────────────────────────────────
  function _resetBtn(btn) {
    if (!btn) return;
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    btn.style.color = '';
  }

  // ── Barre TTS flottante (affichée pendant la lecture) ────────
  function _updateBar(active, paused = false) {
    const bar = document.getElementById('_tts_bar');
    if (!bar) return;
    if (active) {
      bar.style.opacity    = '1';
      bar.style.transform  = 'translateY(0)';
      bar.style.pointerEvents = 'all';
      const waves = bar.querySelectorAll('._tts_wave');
      waves.forEach(w => w.style.animationPlayState = paused ? 'paused' : 'running');
      bar.querySelector('#_tts_pause_btn').innerHTML =
        paused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
    } else {
      bar.style.opacity    = '0';
      bar.style.transform  = 'translateY(12px)';
      bar.style.pointerEvents = 'none';
    }
  }

  // ── Injecter la barre TTS + boutons dans le DOM ──────────────
  function _injectUI() {
    if (document.getElementById('_tts_bar')) return;

    // ── CSS ──────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
/* ── Barre TTS flottante ── */
#_tts_bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(12px);
  z-index: 8000;
  background: rgba(6,10,20,.96);
  border: 1px solid rgba(125,211,252,.25);
  border-radius: 50px;
  padding: 9px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  opacity: 0;
  pointer-events: none;
  transition: opacity .28s ease, transform .28s cubic-bezier(.34,1.56,.64,1);
  box-shadow: 0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(125,211,252,.07);
  backdrop-filter: blur(20px);
  min-width: 240px;
}
#_tts_bar ._tts_label {
  font-family: 'Syne', sans-serif;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgba(255,255,255,.4);
}
#_tts_bar ._tts_waves {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 18px;
}
._tts_wave {
  width: 2.5px;
  border-radius: 2px;
  background: linear-gradient(180deg, #7DD3FC, #38BDF8);
  animation: _tts_wave_anim .7s ease-in-out infinite alternate;
}
._tts_wave:nth-child(1){height:6px;  animation-delay:0s;}
._tts_wave:nth-child(2){height:14px; animation-delay:.1s;}
._tts_wave:nth-child(3){height:18px; animation-delay:.2s;}
._tts_wave:nth-child(4){height:10px; animation-delay:.15s;}
._tts_wave:nth-child(5){height:6px;  animation-delay:.05s;}
@keyframes _tts_wave_anim {
  from { transform: scaleY(.3); opacity:.6; }
  to   { transform: scaleY(1);  opacity:1; }
}
#_tts_bar ._tts_ctrl {
  width: 26px; height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(125,211,252,.2);
  background: rgba(125,211,252,.06);
  color: #7DD3FC;
  font-size: 10px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
#_tts_bar ._tts_ctrl:hover {
  background: rgba(125,211,252,.15);
  border-color: rgba(125,211,252,.4);
}
#_tts_bar ._tts_ctrl.stop { color: #ef4444; border-color: rgba(239,68,68,.3); }
#_tts_bar ._tts_ctrl.stop:hover { background: rgba(239,68,68,.1); }

/* ── Bouton 🔊 sur chaque bulle IA ── */
._tts_msg_btn {
  background: transparent;
  border: none;
  color: rgba(125,211,252,.35);
  font-size: 10px;
  cursor: pointer;
  padding: 3px 5px;
  border-radius: 5px;
  transition: color .15s, background .15s;
  margin-left: auto;
  flex-shrink: 0;
}
._tts_msg_btn:hover { color: #7DD3FC; background: rgba(125,211,252,.08); }

/* ── Toolbar TTS dans le header chat ── */
#_tts_toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
}
._tts_tool_btn {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid rgba(125,211,252,.15);
  background: rgba(125,211,252,.04);
  color: rgba(255,255,255,.5);
  font-family: 'Syne', sans-serif;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: .06em;
  cursor: pointer;
  transition: all .18s;
  white-space: nowrap;
}
._tts_tool_btn:hover, ._tts_tool_btn.active {
  background: rgba(125,211,252,.12);
  border-color: rgba(125,211,252,.35);
  color: #7DD3FC;
}
._tts_tool_btn.active._call_mode {
  background: rgba(16,185,129,.1);
  border-color: rgba(16,185,129,.4);
  color: #10b981;
  animation: _call_pulse 1.5s ease-in-out infinite;
}
@keyframes _call_pulse {
  0%,100%{ box-shadow: 0 0 0 0 rgba(16,185,129,.3); }
  50%    { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
}

/* ── Modal appel vocal ── */
#_tts_call_modal {
  position: fixed; inset: 0; z-index: 9500;
  display: flex; align-items: center; justify-content: center;
  background: rgba(2,4,11,.9);
  backdrop-filter: blur(24px);
  opacity: 0; pointer-events: none;
  transition: opacity .3s ease;
}
#_tts_call_modal.show { opacity: 1; pointer-events: all; }
#_tts_call_box {
  width: min(90vw, 360px);
  background: rgba(6,10,20,.98);
  border: 1px solid rgba(125,211,252,.2);
  border-radius: 24px;
  padding: 36px 28px;
  text-align: center;
  transform: scale(.92);
  transition: transform .35s cubic-bezier(.34,1.56,.64,1);
}
#_tts_call_modal.show #_tts_call_box { transform: scale(1); }
._call_avatar {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg,rgba(125,211,252,.15),rgba(16,185,129,.1));
  border: 2px solid rgba(125,211,252,.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 36px;
  margin: 0 auto 16px;
  animation: _call_ring 2s ease-in-out infinite;
}
@keyframes _call_ring {
  0%,100%{ box-shadow: 0 0 0 0 rgba(125,211,252,.4), 0 0 0 0 rgba(125,211,252,.2); }
  50%    { box-shadow: 0 0 0 12px rgba(125,211,252,.1), 0 0 0 24px rgba(125,211,252,.05); }
}
._call_name {
  font-family: 'Syne', sans-serif;
  font-size: 18px; font-weight: 900;
  color: #fff; margin-bottom: 4px;
}
._call_status {
  font-size: 11px; color: rgba(255,255,255,.4);
  margin-bottom: 28px;
}
._call_timer {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px; font-weight: 700;
  color: #7DD3FC; margin-bottom: 28px;
  letter-spacing: .05em;
}
._call_waves {
  display: flex; align-items: center; justify-content: center;
  gap: 3px; height: 28px; margin-bottom: 28px;
}
._call_wave {
  width: 3px; border-radius: 2px;
  background: linear-gradient(180deg,#7DD3FC,#10b981);
  animation: _tts_wave_anim .6s ease-in-out infinite alternate;
}
._call_wave:nth-child(1){height:8px; animation-delay:0s;}
._call_wave:nth-child(2){height:20px;animation-delay:.08s;}
._call_wave:nth-child(3){height:28px;animation-delay:.16s;}
._call_wave:nth-child(4){height:20px;animation-delay:.12s;}
._call_wave:nth-child(5){height:14px;animation-delay:.04s;}
._call_wave:nth-child(6){height:8px; animation-delay:.2s;}
._call_wave:nth-child(7){height:20px;animation-delay:.1s;}
._call_end_btn {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg,#ef4444,#dc2626);
  border: none; cursor: pointer;
  color: #fff; font-size: 20px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto;
  box-shadow: 0 4px 20px rgba(239,68,68,.4);
  transition: transform .15s, box-shadow .15s;
}
._call_end_btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(239,68,68,.6);
}
    `;
    document.head.appendChild(style);

    // ── Barre flottante ───────────────────────────────────────
    const bar = document.createElement('div');
    bar.id = '_tts_bar';
    bar.innerHTML = `
      <div class="_tts_label">
        <i class="fa-solid fa-waveform-lines" style="color:#7DD3FC;margin-right:5px;"></i>
        Lecture IA
      </div>
      <div class="_tts_waves">
        <div class="_tts_wave"></div><div class="_tts_wave"></div>
        <div class="_tts_wave"></div><div class="_tts_wave"></div>
        <div class="_tts_wave"></div>
      </div>
      <button class="_tts_ctrl" id="_tts_pause_btn" title="Pause / Reprendre" onclick="DS_TTS.pause()">
        <i class="fa-solid fa-pause"></i>
      </button>
      <button class="_tts_ctrl stop" title="Arrêter" onclick="DS_TTS.stop()">
        <i class="fa-solid fa-stop"></i>
      </button>
    `;
    document.body.appendChild(bar);

    // ── Modal appel vocal ─────────────────────────────────────
    const modal = document.createElement('div');
    modal.id = '_tts_call_modal';
    modal.innerHTML = `
      <div id="_tts_call_box">
        <div class="_call_avatar">💊</div>
        <div class="_call_name">Doctor Smile IA</div>
        <div class="_call_status" id="_call_status">Connexion en cours…</div>
        <div class="_call_timer" id="_call_timer">00:00</div>
        <div class="_call_waves">
          <div class="_call_wave"></div><div class="_call_wave"></div>
          <div class="_call_wave"></div><div class="_call_wave"></div>
          <div class="_call_wave"></div><div class="_call_wave"></div>
          <div class="_call_wave"></div>
        </div>
        <button class="_call_end_btn" onclick="DS_TTS.endCall()" title="Raccrocher">
          <i class="fa-solid fa-phone-slash"></i>
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // ── Injecter toolbar TTS dans le header du chat ──────────────
  function injectToolbar() {
    if (document.getElementById('_tts_toolbar')) return;

    // Trouver le header du chat plein écran
    const header = document.querySelector('#view-chat .view-header > div:first-child');
    if (!header) return;

    const toolbar = document.createElement('div');
    toolbar.id = '_tts_toolbar';

    // Bouton lecture auto
    const btnAuto = document.createElement('button');
    btnAuto.className = '_tts_tool_btn';
    btnAuto.id = '_tts_auto_btn';
    btnAuto.title = 'Lire automatiquement les réponses IA';
    btnAuto.innerHTML = '<i class="fa-solid fa-volume-high"></i> Auto';
    btnAuto.addEventListener('click', () => {
      _autoRead = !_autoRead;
      btnAuto.classList.toggle('active', _autoRead);
      showToast(_autoRead ? '🔊 Lecture auto activée' : '🔇 Lecture auto désactivée', 'ok');
    });

    // Bouton appel vocal
    const btnCall = document.createElement('button');
    btnCall.className = '_tts_tool_btn';
    btnCall.id = '_tts_call_btn';
    btnCall.title = "Mode appel — l'IA vous parle comme un assistant vocal";
    btnCall.innerHTML = '<i class="fa-solid fa-phone"></i> Appel IA';
    btnCall.addEventListener('click', () => startCall());

    toolbar.appendChild(btnAuto);
    toolbar.appendChild(btnCall);

    // Insérer dans le header
    const headerRow = document.querySelector('#view-chat .view-header');
    if (headerRow) headerRow.appendChild(toolbar);
  }

  // ── Ajouter bouton 🔊 sur une bulle IA ───────────────────────
  function attachToMsg(msgDiv) {
    if (!msgDiv || msgDiv.querySelector('._tts_msg_btn')) return;
    const html = msgDiv.querySelector('._msg_body')?.innerHTML
              || msgDiv.innerHTML;
    if (!html) return;

    const btn = document.createElement('button');
    btn.className = '_tts_msg_btn';
    btn.title = 'Écouter ce message';
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    btn.addEventListener('click', () => toggleMsg(btn, html));

    // Insérer après .mn (le label "Doctor Smile IA")
    const mn = msgDiv.querySelector('.mn');
    if (mn) mn.appendChild(btn);
    else     msgDiv.appendChild(btn);
  }

  // ── Observer les nouvelles bulles IA ajoutées au DOM ─────────
  function _observeMessages() {
    const targets = ['chat-msgs', 'chat-msgs-full'];
    targets.forEach(id => {
      const container = document.getElementById(id);
      if (!container) return;
      const obs = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.classList?.contains('ai')) {
              attachToMsg(node);
              if (_autoRead || _callMode) {
                const body = node.querySelector('._msg_body')?.innerHTML || node.innerHTML;
                if (body) {
                  // Petit délai pour laisser l'animation de la bulle se terminer
                  setTimeout(() => speak(body), 300);
                }
              }
            }
          });
        });
      });
      obs.observe(container, { childList: true });
    });
  }

  // ════════════════════════════════════════════════════════════
  //  MODE APPEL VOCAL
  // ════════════════════════════════════════════════════════════
  let _callTimer   = null;
  let _callSeconds = 0;

  function startCall() {
    if (_callMode) { endCall(); return; }
    _callMode = true;
    _autoRead = true;

    // Mettre à jour le bouton
    const btn = document.getElementById('_tts_call_btn');
    if (btn) { btn.classList.add('active', '_call_mode');
      btn.innerHTML = '<i class="fa-solid fa-phone-slash"></i> En appel'; }

    // Ouvrir la modal
    const modal = document.getElementById('_tts_call_modal');
    if (modal) modal.classList.add('show');

    // Démarrer le timer
    _callSeconds = 0;
    _callTimer = setInterval(() => {
      _callSeconds++;
      const m = String(Math.floor(_callSeconds / 60)).padStart(2,'0');
      const s = String(_callSeconds % 60).padStart(2,'0');
      const timerEl = document.getElementById('_call_timer');
      if (timerEl) timerEl.textContent = m + ':' + s;
    }, 1000);

    // Statut → "En communication"
    setTimeout(() => {
      const st = document.getElementById('_call_status');
      if (st) st.textContent = 'En communication · Doctor Smile IA';
    }, 600);

    // Message d'accueil vocal
    const prenom = window.S?.profile?.prenom ?? '';
    const nom    = window.S?.currentAnalyse?.entreprise ?? '';
    const score  = window.S?.currentAnalyse?.score ?? null;
    let greeting = `Bonjour ${prenom}. Je suis Doctor Smile, votre analyste financier intelligent.`;
    if (score !== null) greeting += ` Nous allons examiner ensemble les résultats de ${nom}, avec un score de ${score} sur 100.`;
    else greeting += ` Comment puis-je vous aider aujourd'hui ?`;
    setTimeout(() => speak(greeting), 700);
  }

  function endCall() {
    if (!_callMode) return;
    _callMode = false;
    _autoRead = false;
    stop();

    if (_callTimer) { clearInterval(_callTimer); _callTimer = null; }

    // Fermer la modal
    const modal = document.getElementById('_tts_call_modal');
    if (modal) modal.classList.remove('show');

    // Reset bouton
    const btn = document.getElementById('_tts_call_btn');
    if (btn) {
      btn.classList.remove('active','_call_mode');
      btn.innerHTML = '<i class="fa-solid fa-phone"></i> Appel IA';
    }
    const btnAuto = document.getElementById('_tts_auto_btn');
    if (btnAuto) btnAuto.classList.remove('active');
  }

  // ── Init global ──────────────────────────────────────────────
  function init() {
    if (!window.speechSynthesis) {
      console.warn('[DS_TTS] Web Speech API non disponible dans ce navigateur');
      return;
    }
    _injectUI();
    _observeMessages();

    // Attacher aux bulles déjà présentes dans le DOM
    document.querySelectorAll('.msg.ai').forEach(attachToMsg);

    // Ré-attacher quand on navigue vers la vue chat
    const origNavTo = window.DS_VIEWS?.navTo;
    if (origNavTo) {
      window.DS_VIEWS.navTo = function(view) {
        origNavTo.call(this, view);
        if (view === 'chat') {
          setTimeout(() => {
            injectToolbar();
            document.querySelectorAll('.msg.ai').forEach(attachToMsg);
          }, 200);
        }
      };
    }

    injectToolbar();
    console.log('[DS_TTS] ✓ TTS initialisé — voix:', _bestVoice?.name || 'par défaut');
  }

  // API publique
  return { init, speak, stop, pause, toggleMsg, startCall, endCall, attachToMsg, injectToolbar };

})();

// ── Démarrer après chargement ────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DS_TTS.init());
} else {
  DS_TTS.init();
}
