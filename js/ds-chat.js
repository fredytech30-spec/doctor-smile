// ════════════════════════════════════════════════════════════════
//  ds-chat.js — Doctor Smile  v6
//  Streaming SSE · Markdown · Suggestions · Copier · Régénérer
//  Abort controller · Import Firebase cached · XSS safe · Race-free
//  Dépend de : ds-core.js, firebase-firestore.js
// ════════════════════════════════════════════════════════════════

const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';

// ════════ SYNTHÈSE VOCALE (TTS) ══════════════════════════════
const TTS_SETTINGS = {
  voice_name: 'Microsoft Denise Online (Natural) - French (France)', 
  lang: 'fr-FR',
  rate: 1.05,
  pitch: 1.0,
  volume: 1.0,
  enabled: true
};

function _speak(text) {
  if (!TTS_SETTINGS.enabled || !window.speechSynthesis) return;
  const cleanText = text.replace(/<[^>]+>/g, '').replace(/[\*\#\_]/g, '').trim();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = TTS_SETTINGS.lang;
  utterance.rate = TTS_SETTINGS.rate;
  utterance.pitch = TTS_SETTINGS.pitch;
  utterance.volume = TTS_SETTINGS.volume;

  const voices = window.speechSynthesis.getVoices();
  const bestVoice = voices.find(v => v.name.includes('Natural') && v.lang.startsWith('fr')) 
                 || voices.find(v => v.lang.startsWith('fr'))
                 || voices[0];
  if (bestVoice) utterance.voice = bestVoice;
  window.speechSynthesis.speak(utterance);
}

// ── Fonction pour configurer la voix ──
window.DS_CHAT_VOICE = {
  setRate:   (v) => { TTS_SETTINGS.rate = v; },
  setPitch:  (v) => { TTS_SETTINGS.pitch = v; },
  setVolume: (v) => { TTS_SETTINGS.volume = v; },
  getSettings: () => ({...TTS_SETTINGS})
};

// ═══════════════════════════════════════════════════════════════
//  ICÔNE ANIMÉE — Doctor Smile Face (SVG pur, zéro dépendance)
// ═══════════════════════════════════════════════════════════════
(function _injectSmileCSS() {
  if (document.getElementById('_dsface_css')) return;
  const s = document.createElement('style');
  s.id = '_dsface_css';
  s.textContent = `
.dsf-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;}
@keyframes dsf-float{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-4px) rotate(1.5deg)}70%{transform:translateY(-2px) rotate(-1deg)}}
@keyframes dsf-halo{0%,100%{opacity:.18;transform:scale(1)}50%{opacity:.55;transform:scale(1.18)}}
@keyframes dsf-orbit{from{transform:rotate(0deg) translateX(var(--or)) rotate(0deg)}to{transform:rotate(360deg) translateX(var(--or)) rotate(-360deg)}}
@keyframes dsf-blink{0%,88%,100%{transform:scaleY(1)}93%{transform:scaleY(.06)}}
@keyframes dsf-star{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1.3) rotate(45deg)}}
@keyframes dsf-ring{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes dsf-glow-smile{0%,100%{filter:drop-shadow(0 0 2px var(--cyan))}50%{filter:drop-shadow(0 0 7px var(--cyan)) drop-shadow(0 0 14px var(--cyan-glow))}}
.dsf-float{animation:dsf-float 3.6s ease-in-out infinite}
.dsf-halo{animation:dsf-halo 2.4s ease-in-out infinite}
.dsf-blink{animation:dsf-blink 5s ease-in-out infinite}
.dsf-smile{animation:dsf-glow-smile 2.8s ease-in-out infinite}
.dsf-ring{animation:dsf-ring 5s linear infinite;transform-origin:center}
.dsf-star-1{animation:dsf-star 2.0s ease-in-out infinite 0.0s}
.dsf-star-2{animation:dsf-star 2.2s ease-in-out infinite 0.6s}
.dsf-star-3{animation:dsf-star 1.8s ease-in-out infinite 1.1s}
.dsf-star-4{animation:dsf-star 2.5s ease-in-out infinite 1.7s}
.dsf-orb{--or:20px;animation:dsf-orbit 3.2s linear infinite;transform-origin:center}
.dsf-orb-2{--or:18px;animation:dsf-orbit 4.8s linear infinite reverse;transform-origin:center}
.dsf-wrap:hover .dsf-float{animation-duration:1.8s}
.dsf-wrap:hover .dsf-halo{animation-duration:1s}
.dsf-mini svg{display:block}

/* ── Messages v6 ── */
.msg-actions{
  display:none;gap:4px;margin-top:6px;
}
.msg.ai:hover .msg-actions,.msg.user:hover .msg-actions{display:flex;}
.msg-act-btn{
  display:flex;align-items:center;gap:4px;
  padding:3px 9px;border-radius:6px;
  font-family:'Syne',sans-serif;font-size:7.5px;font-weight:800;
  letter-spacing:.06em;text-transform:uppercase;
  cursor:pointer;background:var(--surface-3);border:1px solid var(--border);
  color:var(--text-2);transition:all 0.15s;
}
.msg-act-btn:hover{background:var(--violet-bg);color:var(--text);transform:translateY(-1px);}
.msg-act-btn i{font-size:9px;}

/* ── Suggestions ── */
.chat-suggestions{
  display:flex;flex-wrap:wrap;gap:7px;
  padding:10px 14px 4px;
}
.chat-sug-btn{
  display:flex;align-items:center;gap:6px;
  padding:7px 13px;border-radius:20px;
  font-family:'Syne',sans-serif;font-size:9px;font-weight:700;
  background:var(--cyan-hover);
  border:1px solid var(--cyan-border);
  color:var(--cyan);cursor:pointer;
  transition:all .2s cubic-bezier(.34,1.56,.64,1);
  white-space:nowrap;
}
.chat-sug-btn:hover{
  background:var(--cyan-glow);
  border-color:var(--cyan-2);
  transform:translateY(-1px);
  box-shadow:0 4px 12px var(--cyan-glow);
}
.chat-sug-btn i{font-size:10px;opacity:.7;}

/* ── Streaming cursor ── */
.stream-cursor{
  display:inline-block;width:2px;height:1em;
  background:var(--cyan);margin-left:2px;vertical-align:text-bottom;
  animation:blink-cur .6s step-end infinite;
}
@keyframes blink-cur{0%,100%{opacity:1}50%{opacity:0}}

/* ── Stop button ── */
.chat-stop-btn{
  display:none;align-items:center;gap:6px;
  padding:7px 16px;border-radius:9px;
  font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
  letter-spacing:.08em;text-transform:uppercase;
  background:var(--error-bg);border:1px solid var(--error-border);
  color:var(--error);cursor:pointer;
  transition:all .2s cubic-bezier(.34,1.56,.64,1);
  margin:6px auto 0;
}
.chat-stop-btn:hover{
  background:var(--error-bg);border-color:var(--error);
  transform:scale(1.04);box-shadow:0 4px 16px var(--error-bg);
}
.chat-stop-btn:active{transform:scale(.97);}
.chat-stop-btn.visible{display:flex;}

/* ── Édition message ── */
.msg-edit-wrap{
  margin-top:6px;display:none;flex-direction:column;gap:6px;
}
.msg-edit-wrap.active{display:flex;}
.msg-edit-ta{
  width:100%;min-height:60px;max-height:180px;
  padding:9px 12px;border-radius:9px;resize:vertical;
  background:var(--surface-2);border:1px solid var(--cyan-border);
  color:var(--text);font-family:'Instrument Sans',sans-serif;font-size:11px;
  outline:none;line-height:1.55;box-sizing:border-box;
  transition:border-color .15s;
}
.msg-edit-ta:focus{border-color:var(--cyan);}
.msg-edit-actions{display:flex;gap:6px;justify-content:flex-end;}
.msg-edit-ok{
  padding:5px 14px;border-radius:7px;font-family:'Syne',sans-serif;
  font-size:8px;font-weight:800;letter-spacing:.06em;cursor:pointer;
  background:var(--cyan-hover);border:1px solid var(--cyan-border);
  color:var(--cyan);transition:all .15s;
}
.msg-edit-ok:hover{background:var(--cyan-glow);}
.msg-edit-cancel{
  padding:5px 12px;border-radius:7px;font-family:'Syne',sans-serif;
  font-size:8px;font-weight:800;letter-spacing:.06em;cursor:pointer;
  background:transparent;border:1px solid var(--border);
  color:var(--text-hint);transition:all .15s;
}
.msg-edit-cancel:hover{border-color:var(--text-2);color:var(--text-2);}
/* Indicateur message édité */
.msg-edited-badge{
  font-size:7px;color:var(--text-hint);
  font-family:'Syne',sans-serif;font-style:italic;
  margin-top:3px;display:inline-block;
}

/* ════ Messages IA — rendu premium v7 ════ */
@keyframes md-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@keyframes md-slide{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@keyframes md-pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.msg.ai .md-p{margin:0 0 11px;line-height:1.82;font-size:11.5px;color:var(--text-2);animation:md-in .35s ease both;}
.msg.ai .md-p:last-child{margin-bottom:0;}
.msg.ai .md-h2{display:flex;align-items:center;gap:8px;font-family:'Syne',sans-serif;font-size:10px;font-weight:900;color:var(--text);margin:16px 0 8px;letter-spacing:.1em;text-transform:uppercase;animation:md-slide .3s ease both;}
.msg.ai .md-h2::before{content:'';flex-shrink:0;display:block;width:3px;height:13px;background:linear-gradient(180deg,var(--cyan),var(--cyan-glow));border-radius:2px;}
.msg.ai .md-h3{font-family:'Syne',sans-serif;font-size:10.5px;font-weight:800;color:var(--violet-3);margin:10px 0 5px;animation:md-slide .3s ease both;}
.msg.ai .md-ul,.msg.ai .md-ol{margin:6px 0 12px;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px;}
.msg.ai .md-li{display:flex;align-items:flex-start;gap:9px;padding:8px 12px;border-radius:9px;background:var(--glass);border:1px solid var(--border);font-size:11px;color:var(--text-2);line-height:1.68;animation:md-in .32s ease both;transition:background .18s,border-color .18s;}
.msg.ai .md-li:hover{background:var(--cyan-hover);border-color:var(--cyan-border);}
.msg.ai .md-ul .md-li::before{content:'';width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px;background:linear-gradient(135deg,var(--cyan),var(--cyan-glow));}
.msg.ai .md-ol{counter-reset:li-c;}.msg.ai .md-ol .md-li{counter-increment:li-c;}
.msg.ai .md-ol .md-li::before{content:counter(li-c);width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--cyan-hover);border:1px solid var(--cyan-border);color:var(--cyan);font-family:'Syne',sans-serif;font-size:9px;font-weight:900;}
.msg.ai .md-alert{display:flex;align-items:flex-start;gap:10px;padding:10px 13px;border-radius:10px;margin:7px 0;font-size:11px;line-height:1.68;animation:md-pop .35s ease both;}
.msg.ai .md-alert-danger{background:var(--error-bg);border:1px solid var(--error-border);color:var(--color-error);}
.msg.ai .md-alert-success{background:var(--success-bg);border:1px solid var(--success-border);color:var(--color-success);}
.msg.ai .md-alert-info{background:var(--cyan-hover);border:1px solid var(--cyan-border);color:var(--cyan);}
.msg.ai .md-alert-icon{font-size:14px;flex-shrink:0;margin-top:1px;}
.msg.ai .md-pill{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:100px;font-size:9px;font-family:'Syne',sans-serif;font-weight:800;letter-spacing:.06em;vertical-align:middle;margin:0 2px;}
.msg.ai .md-pill-red{background:var(--error-bg);border:1px solid var(--error-border);color:var(--color-error);}
.msg.ai .md-pill-amber{background:var(--amber-hover);border:1px solid var(--amber-border);color:var(--amber);}
.msg.ai .md-pill-green{background:var(--success-bg);border:1px solid var(--success-border);color:var(--color-success);}
.msg.ai .md-pill-blue{background:var(--cyan-hover);border:1px solid var(--cyan-border);color:var(--cyan);}
.msg.ai .md-hr{border:none;margin:12px 0;height:1px;background:linear-gradient(90deg,transparent,var(--border),transparent);}
.msg.ai .md-code{font-family:'JetBrains Mono',monospace;font-size:10px;background:var(--cyan-hover);border:1px solid var(--cyan-border);padding:1px 6px;border-radius:5px;color:var(--cyan);}
.msg.ai .md-pre{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin:8px 0;overflow-x:auto;animation:md-in .4s ease both;}
.msg.ai .md-pre code{background:none;padding:0;color:var(--text-2);font-size:10px;line-height:1.72;}
.msg.ai .md-table{width:100%;border-collapse:separate;border-spacing:0;font-size:10px;margin:8px 0;border-radius:10px;overflow:hidden;}
.msg.ai .md-table th{padding:8px 12px;background:var(--cyan-hover);color:var(--cyan);font-family:'Syne',sans-serif;font-weight:800;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;text-align:left;}
.msg.ai .md-table td{padding:7px 12px;border-bottom:1px solid var(--border);color:var(--text-2);}
.msg.ai .md-table tr:last-child td{border-bottom:none;}.msg.ai .md-table tr:hover td{background:var(--glass);}
.msg.ai .md-d0{animation-delay:.00s}.msg.ai .md-d1{animation-delay:.07s}.msg.ai .md-d2{animation-delay:.14s}.msg.ai .md-d3{animation-delay:.21s}.msg.ai .md-d4{animation-delay:.28s}.msg.ai .md-d5{animation-delay:.35s}.msg.ai .md-d6{animation-delay:.42s}.msg.ai .md-d7{animation-delay:.49s}

/* ── Footer compteur ── */
.chat-footer-info{
  padding:4px 14px 6px;
  font-size:8px;color:var(--text-hint);
  display:flex;justify-content:space-between;align-items:center;
  font-family:'Syne',sans-serif;letter-spacing:.06em;
  border-top:1px solid var(--border);
}
.chat-footer-quota{color:var(--cyan);opacity:0.4;}
  `;
  document.head.appendChild(s);
})();

// ── Fabrique l'icône SVG Doctor Smile Face ───────────────────
function _buildDsIcon(px = 42) {
  const wrap = document.createElement('span');
  wrap.className = 'dsf-wrap';
  wrap.style.width  = px + 'px';
  wrap.style.height = px + 'px';
  wrap.innerHTML = `
  <svg width="${px}" height="${px}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
    <circle class="dsf-halo" cx="22" cy="22" r="20" fill="var(--cyan-hover)" stroke="var(--cyan-border)" stroke-width="1" style="opacity:0.3;"/>
    <circle class="dsf-ring" cx="22" cy="22" r="18" fill="none" stroke="url(#dsf-grad-ring)" stroke-width="1.5" stroke-dasharray="28 84" stroke-linecap="round"/>
    <g class="dsf-orb" style="transform-origin:22px 22px"><circle cx="22" cy="4" r="2.2" fill="var(--cyan)" style="filter:drop-shadow(0 0 4px var(--cyan))"/></g>
    <g class="dsf-orb-2" style="transform-origin:22px 22px"><circle cx="22" cy="6" r="1.5" fill="var(--amber)" style="filter:drop-shadow(0 0 3px var(--amber))"/></g>
    <g class="dsf-float">
      <circle cx="22" cy="22" r="14" fill="url(#dsf-grad-face)" stroke="var(--cyan-border)" stroke-width="1.5" style="filter:drop-shadow(0 2px 8px rgba(0,0,0,.4))"/>
      <ellipse cx="17.5" cy="16.5" rx="4" ry="2.5" fill="rgba(255,255,255,.13)" transform="rotate(-25,17.5,16.5)"/>
      <path d="M14,14.5 Q16.5,13 19,14" stroke="var(--cyan-border)" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M25,14 Q27.5,13 30,14.5" stroke="var(--cyan-border)" stroke-width="1.2" stroke-linecap="round"/>
      <g class="dsf-blink" style="transform-origin:17px 20px">
        <ellipse cx="17" cy="20" rx="2.5" ry="2.8" fill="url(#dsf-grad-eye)" style="filter:drop-shadow(0 0 5px var(--cyan-glow))"/>
        <circle cx="17.9" cy="19.1" r="0.9" fill="rgba(255,255,255,.9)"/>
      </g>
      <g class="dsf-blink" style="transform-origin:27px 20px;animation-delay:.15s">
        <ellipse cx="27" cy="20" rx="2.5" ry="2.8" fill="url(#dsf-grad-eye)" style="filter:drop-shadow(0 0 5px var(--cyan-glow))"/>
        <circle cx="27.9" cy="19.1" r="0.9" fill="rgba(255,255,255,.9)"/>
      </g>
      <ellipse cx="13.5" cy="25" rx="3" ry="1.8" fill="rgba(255,160,160,.18)"/>
      <ellipse cx="30.5" cy="25" rx="3" ry="1.8" fill="rgba(255,160,160,.18)"/>
      <path class="dsf-smile" d="M14,26 Q22,33 30,26" stroke="var(--cyan)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M16.5,27.5 Q22,31.5 27.5,27.5" stroke="rgba(255,255,255,.18)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    </g>
    <g class="dsf-star-1" style="transform-origin:6px 8px"><path d="M6,5 L6.8,7.2 L9,8 L6.8,8.8 L6,11 L5.2,8.8 L3,8 L5.2,7.2 Z" fill="var(--amber)" opacity=".9"/></g>
    <g class="dsf-star-2" style="transform-origin:38px 10px"><path d="M38,7 L38.6,8.8 L40.4,9.4 L38.6,10 L38,11.8 L37.4,10 L35.6,9.4 L37.4,8.8 Z" fill="var(--cyan)" opacity=".9"/></g>
    <g class="dsf-star-3" style="transform-origin:5px 36px"><circle cx="5" cy="36" r="1.8" fill="var(--violet-3)" opacity=".85"/></g>
    <g class="dsf-star-4" style="transform-origin:40px 34px"><path d="M40,31 L40.5,33 L42.5,33.5 L40.5,34 L40,36 L39.5,34 L37.5,33.5 L39.5,33 Z" fill="var(--amber)" opacity=".8"/></g>
    <defs>
      <radialGradient id="dsf-grad-face" cx="40%" cy="35%" r="65%">
        <stop offset="0%"   stop-color="var(--surface-2)"/>
        <stop offset="60%"  stop-color="var(--surface)"/>
        <stop offset="100%" stop-color="var(--bg)"/>
      </radialGradient>
      <radialGradient id="dsf-grad-eye" cx="35%" cy="35%" r="65%">
        <stop offset="0%"  stop-color="var(--cyan)"/>
        <stop offset="100%" stop-color="var(--cyan-2)"/>
      </radialGradient>
      <linearGradient id="dsf-grad-ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="var(--cyan)" stop-opacity=".9"/>
        <stop offset="40%"  stop-color="var(--amber)" stop-opacity=".7"/>
        <stop offset="70%"  stop-color="var(--violet-3)" stop-opacity=".6"/>
        <stop offset="100%" stop-color="var(--cyan)" stop-opacity=".9"/>
      </linearGradient>
    </defs>
  </svg>`;
  return wrap;
}

// ── Patcher les zones Doctor Smile IA dans le DOM ────────────
function _patchDsIconInDOM() {
  const chatHead = document.querySelector('#chat-sec .chat-head-title');
  if (chatHead && !chatHead.querySelector('.dsf-wrap')) {
    const oldI = chatHead.querySelector('i'); if (oldI) oldI.remove();
    chatHead.style.gap = '9px';
    chatHead.insertBefore(_buildDsIcon(30), chatHead.firstChild);
  }
  const viewTitle = document.querySelector('#view-chat .view-title');
  if (viewTitle && !viewTitle.querySelector('.dsf-wrap')) {
    viewTitle.style.cssText += ';display:flex;align-items:center;gap:12px;';
    viewTitle.insertBefore(_buildDsIcon(40), viewTitle.firstChild);
  }
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
//  MARKDOWN RENDERER — léger, sans dépendance
// ════════════════════════════════════════════════════════════════
function _renderMarkdown(text) {
  if (!text) return '';
  let s = text
    .replace(/<script[\s\S]*?<\/script>/gi,'')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi,'')
    .replace(/on\w+="[^"]*"/gi,'')
    .replace(/javascript:/gi,'');

  const codes = [];
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,code) => {
    const ph = `\x00C${codes.length}\x00`;
    const lb = lang?`<span style="font-size:8px;color:rgba(139,127,240,.4);font-family:'Syne',sans-serif;font-weight:800;letter-spacing:.1em;text-transform:uppercase;display:block;margin-bottom:8px;">${lang}</span>`:'';
    codes.push(`<pre class="md-pre">${lb}<code class="md-code">${escHtml(code.trim())}</code></pre>`);
    return ph;
  });

  // Titres numérotés "1. DIAGNOSTIC" → section
  s = s.replace(/^(\d+)\.\s+([A-ZÀÂÄÉÈÊË][A-Za-zÀ-ÿ\s™\-]{2,50})\s*$/gm,
    (_,_n,t)=>`<div class="md-h2">${t.trim()}</div>`);
  s = s.replace(/^## (.+)$/gm,  '<div class="md-h2">$1</div>');
  s = s.replace(/^### (.+)$/gm, '<div class="md-h3">$1</div>');
  s = s.replace(/^# (.+)$/gm,   '<div class="md-h2">$1</div>');

  s = s.replace(/^(?:# ALERT-DANGER #|ALERT-DANGER)\s*(.+)$/gm,
    '<div class="md-alert md-alert-danger"><i class="fa-solid fa-triangle-exclamation md-alert-icon"></i><span>$1</span></div>');
  s = s.replace(/^(?:# ALERT-SUCCESS #|ALERT-SUCCESS)\s*(.+)$/gm,
    '<div class="md-alert md-alert-success"><i class="fa-solid fa-circle-check md-alert-icon"></i><span>$1</span></div>');
  s = s.replace(/^(?:# ALERT-INFO #|ALERT-INFO)\s*(.+)$/gm,
    '<div class="md-alert md-alert-info"><i class="fa-solid fa-lightbulb md-alert-icon"></i><span>$1</span></div>');

  s = s.replace(/\bZone Critique\b/g,'<span class="md-pill md-pill-red">Zone Critique</span>');
  s = s.replace(/\bZone Risque\b/g,'<span class="md-pill md-pill-amber">Zone Risque</span>');
  s = s.replace(/\bZone Vigilance\b/g,'<span class="md-pill md-pill-amber">Zone Vigilance</span>');
  s = s.replace(/\bZone Saine\b/g,'<span class="md-pill md-pill-green">Zone Saine</span>');
  s = s.replace(/\bDoctor Score™?\b/g,'<span class="md-pill md-pill-blue">Doctor Score™</span>');

  s = s.replace(/\*\*([^*\n]+)\*\*/g,'<strong style="color:var(--text);font-weight:800;">$1</strong>');
  s = s.replace(/__([^_\n]+)__/g,'<strong style="color:var(--text);font-weight:800;">$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g,'<em style="color:var(--text-2);">$1</em>');
  s = s.replace(/`([^`]+)`/g,'<code class="md-code">$1</code>');
  s = s.replace(/^[-*]{3,}$/gm,'<hr class="md-hr">');

  s = s.replace(/((?:\|.+\|\n?)+)/g, m => {
    const rows = m.trim().split('\n').filter(r=>r.trim()&&!/^\|[-:| ]+\|$/.test(r));
    if(!rows.length) return m;
    const p = r=>r.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
    const th=p(rows[0]).map(h=>`<th>${h}</th>`).join('');
    const tb=rows.slice(1).map(r=>`<tr>${p(r).map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
    return `<table class="md-table"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`;
  });

  s = s.replace(/((?:^[*\-] .+\n?)+)/gm, b => {
    const items=b.trim().split('\n').filter(Boolean).map((l,i)=>
      `<li class="md-li md-d${Math.min(i,7)}">${l.replace(/^[*\-] /,'').trim()}</li>`).join('');
    return `<ul class="md-ul">${items}</ul>`;
  });
  s = s.replace(/((?:^\d+\. .+\n?)+)/gm, b => {
    if(/<div class="md-h/.test(b)) return b;
    const items=b.trim().split('\n').filter(Boolean).map((l,i)=>
      `<li class="md-li md-d${Math.min(i,7)}">${l.replace(/^\d+\. /,'').trim()}</li>`).join('');
    return `<ol class="md-ol">${items}</ol>`;
  });

  let di=0;
  s = s.split(/\n{2,}/).map(chunk=>{
    chunk=chunk.replace(/\n/g,' ').trim();
    if(!chunk) return '';
    if(/^<(ul|ol|pre|table|div|hr)/.test(chunk)||chunk.includes('\x00C')) return chunk;
    return `<p class="md-p md-d${Math.min(di++,7)}">${chunk}</p>`;
  }).filter(Boolean).join('\n');

  codes.forEach((b,i)=>{s=s.replace(`\x00C${i}\x00`,b);});
  return s;
}

// ════════════════════════════════════════════════════════════════
//  DS_CHAT v6
// ════════════════════════════════════════════════════════════════
window.DS_CHAT = {

  _sortMode:       'recent',
  _msgCache:       {},
  _pendingPreviews: new Set(),   // guard race condition
  _abortCtrl:      null,         // AbortController courant
  _isStreaming:    false,
  _fsModules:      null,         // cache import Firebase
  _convCache:      null,         // cache getUserConversations
  _lastUserMsg:    '',           // pour régénérer
  _searchQuery:    '',           // filtre recherche historique
  _activeAnalyseId: null,        // analyse affichée actuellement

  // ════ COLLAPSIBLE CHAT HISTORY PANEL ═════════════════════════
  toggleHistory(forceOpen) {
    const panel = document.getElementById('chat-history-panel');
    const toggleBtn = document.getElementById('chat-sidebar-toggle-btn');
    if (!panel) return;

    const currentlyCollapsed = panel.classList.contains('collapsed');
    const shouldCollapse = forceOpen === true  ? false
                         : forceOpen === false ? true
                         : !currentlyCollapsed;

    panel.classList.toggle('collapsed', shouldCollapse);
    if (toggleBtn) {
      toggleBtn.classList.toggle('is-collapsed', shouldCollapse);
      toggleBtn.title = shouldCollapse ? "Afficher l'historique" : "Masquer l'historique";
    }

    try { localStorage.setItem('ds_chat_history_collapsed', shouldCollapse ? '1' : '0'); } catch(_) {}
    setTimeout(() => window.dispatchEvent(new Event('resize')), 340);
  },

  restoreHistoryState() {
    try {
      const pref = localStorage.getItem('ds_chat_history_collapsed');
      if (pref === '1') {
        const panel = document.getElementById('chat-history-panel');
        const toggleBtn = document.getElementById('chat-sidebar-toggle-btn');
        if (panel) panel.classList.add('collapsed');
        if (toggleBtn) toggleBtn.classList.add('is-collapsed');
      }
    } catch(_) {}
  },

  // ════ IMPORT FIREBASE CACHED ════════════════════════════════
  async _getFs() {
    if (this._fsModules) return this._fsModules;
    this._fsModules = await import('./firebase-firestore.js');
    return this._fsModules;
  },

  // ════ INIT AU DÉMARRAGE ══════════════════════════════════════
  _initDone: false,
  async _initOnAuth() {
    if (this._initDone) return;
    this._initDone = true;
    try {
      const uid = S.user?.uid; if (!uid) return;
      const fs  = await this._getFs();
      const convs = await fs.getUserConversations(uid);
      this._convCache = convs;
      console.info('[chat] Démarrage: ' + convs.length + ' conversations chargées');
      if (document.getElementById('view-chat')?.classList.contains('active'))
        this.renderChatHistoryPanel();
    } catch(e) { console.warn('[chat] _initOnAuth:', e); }
  },

  // ════ NOUVELLE CONVERSATION ════════════════════════════════════
  newConversation() { this._showNewConvModal(); },

  _showNewConvModal() {
    const existing = document.getElementById('_ncm'); if (existing) { existing.remove(); return; }
    const now      = new Date();
    const defName  = 'Conversation du ' + now.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
    const modal    = document.createElement('div');
    modal.id       = '_ncm';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(2,4,11,.82);backdrop-filter:blur(14px);';
    modal.innerHTML = `
      <div style="background:var(--bg-elevated);border:1px solid var(--border-v);border-radius:18px;padding:28px;width:min(90vw,400px);box-shadow:var(--shadow-lg);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
          <div style="width:36px;height:36px;border-radius:10px;background:var(--cyan-hover);border:1px solid var(--cyan-border);display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--cyan);flex-shrink:0;"><i class="fa-solid fa-plus"></i></div>
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:900;color:var(--text);">Nouvelle conversation</div>
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block;font-family:'Syne',sans-serif;font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text-hint);margin-bottom:7px;">Nom</label>
          <input id="_ncm_name" type="text" value="${defName}" style="width:100%;padding:10px 14px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'Instrument Sans',sans-serif;font-size:12px;outline:none;box-sizing:border-box;"/>
        </div>
        <div style="margin-bottom:24px;">
          <label style="display:block;font-family:'Syne',sans-serif;font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text-hint);margin-bottom:7px;">Analyse associée (optionnel)</label>
          <select id="_ncm_analyse" style="width:100%;padding:10px 14px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;color:var(--text-2);font-family:'Instrument Sans',sans-serif;font-size:11px;outline:none;appearance:none;cursor:pointer;box-sizing:border-box;">
            <option value="">— Aucune analyse liée —</option>
            ${(window.S?.analyses||[]).map(a=>`<option value="${a.id}">${a.entreprise||'Sans nom'} · ${a.score||'—'}/100</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:10px;">
          <button onclick="document.getElementById('_ncm').remove()" style="flex:1;padding:11px;border-radius:10px;background:transparent;border:1px solid var(--border);color:var(--text-hint);font-family:'Syne',sans-serif;font-size:9px;font-weight:800;cursor:pointer;">Annuler</button>
          <button id="_ncm_ok" style="flex:2;padding:11px;border-radius:10px;background:var(--cyan-hover);border:1px solid var(--cyan-border);color:var(--cyan);font-family:'Syne',sans-serif;font-size:9px;font-weight:900;letter-spacing:.08em;cursor:pointer;"><i class="fa-solid fa-plus" style="margin-right:6px;"></i>Créer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    const inp = modal.querySelector('#_ncm_name');
    setTimeout(() => { inp?.focus(); inp?.select(); }, 80);
    inp?.addEventListener('keydown', e => { if(e.key==='Enter') modal.querySelector('#_ncm_ok')?.click(); });
    modal.querySelector('#_ncm_ok').addEventListener('click', () => {
      const name      = modal.querySelector('#_ncm_name')?.value.trim() || defName;
      const analyseId = modal.querySelector('#_ncm_analyse')?.value || null;
      modal.remove();
      this._createNewConv(name, analyseId);
    });
  },

  _createNewConv(name, analyseId) {
    const msgs = document.getElementById('chat-msgs-full');
    this._activeAnalyseId = analyseId || null;
    S.firestoreConvId     = null;
    S.chatHistory         = [];

    if (analyseId) {
      const analyse = (S.analyses||[]).find(a=>a.id===analyseId);
      if (analyse) {
        S.currentAnalyse = analyse;
        const sub = document.getElementById('chat-sub-title');
        if (sub) sub.textContent = name + ' · ' + (analyse.entreprise||'') + ' · ' + (analyse.score||'?') + '/100';
      }
    } else {
      S.currentAnalyse = null;
      const sub = document.getElementById('chat-sub-title');
      if (sub) sub.textContent = name;
    }

    if (msgs) { delete msgs.dataset.loadedFor; msgs.innerHTML = ''; }

    const greeting = S.currentAnalyse
      ? 'Bonjour ' + (S.profile?.prenom || '') + ' ! Je suis votre <strong>Agent Autonome Doctor Smile</strong>. <i class="fa-solid fa-robot" style="color:var(--cyan);"></i> ' +
        'J\'ai analysé les données de <strong>' + escHtml(S.currentAnalyse.entreprise||'votre entreprise') + '</strong>. ' +
        'Mon diagnostic est prêt. Que souhaitez-vous approfondir ?'
      : 'Bonjour ! Je suis votre <strong>Agent Financier</strong>. <i class="fa-solid fa-robot" style="color:var(--cyan);"></i> ' +
        'Importez une analyse pour que je puisse devenir votre conseiller stratégique autonome.';

    this._appendMsg('chat-msgs-full', 'ai', greeting, new Date());
    if (S.currentAnalyse) this._injectSuggestions('chat-msgs-full', S.currentAnalyse);
    document.querySelectorAll('._chi').forEach(el => { el.style.background='transparent'; el.style.borderLeft='3px solid transparent'; });

    // ── Persistance Firestore ──────────────────────────────────
    (async () => {
      try {
        const fs  = await this._getFs();
        const uid = S.user?.uid; if (!uid) return;
        const res = await fs.createConversation(uid, analyseId, name);
        if (res?.convId) {
          S.firestoreConvId = res.convId;
          await fs.addMessage(res.convId, { role: 'assistant', content: greeting });
          this._convCache = null; // forcer rechargement
          console.info('[chat] Conv persistée:', res.convId, '—', name);
          // Rafraîchir la liste après persistance
          const newConvs = await fs.getUserConversations(uid);
          this._convCache = newConvs;
          this.renderChatHistoryPanel();
        }
      } catch(e) { console.warn('[chat] Persistance conv:', e); }
    })();

    this._updateFooter('chat-msgs-full');
    setTimeout(_patchDsIconInDOM, 60);
  },

  // ════ INIT ══════════════════════════════════════════════════
  async initChat(analyse, zone) {
    S.convId      = analyse.id;
    S.chatHistory = [];
    const box = document.getElementById('chat-msgs');
    if (box) box.innerHTML = '';

    try {
      const fs  = await this._getFs();
      const res = await fs.createConversation(S.user.uid, analyse.id);
      S.firestoreConvId = res?.convId ?? null;
    } catch { /* pas bloquant */ }

    const nom  = analyse.entreprise ?? S.profile?.entreprise?.nom ?? 'votre entreprise';
    const top  = window.DS_RENDER?.normalizeShap(analyse.shapValues || analyse.shap || [])[0];
    const intro =
      `Bonjour ${S.profile?.prenom ?? ''} <i class="fa-solid fa-hand-wave" style="color:var(--amber);font-size:12px;"></i> ` +
      `Votre score de <strong>${analyse.score}/100</strong> pour <strong>${escHtml(nom)}</strong> ` +
      `indique une <strong>${ZC[zone]?.l ?? zone}</strong>.` +
      (top ? ` Le facteur principal est <strong>${top.n}</strong>.` : '') +
      `<br><br><i class="fa-solid fa-heart-pulse" style="color:var(--violet-3);margin-right:6px;"></i>Mon système <strong>Agent IA</strong> surveille activement vos flux en arrière-plan.` +
      ` Je suis disponible pour approfondir n'importe quel aspect.`;

    this._appendMsg('chat-msgs', 'ai', intro, new Date());
    this._injectSuggestions('chat-msgs', analyse);
    const fullMsgs = document.getElementById('chat-msgs-full');
    if (fullMsgs) delete fullMsgs.dataset.loadedFor;
    this._updateFooter('chat-msgs');
    setTimeout(_patchDsIconInDOM, 60);
  },

  // ════ ENVOI — fonction unifiée ═══════════════════════════════
  async _sendMsg(containerId, forcedMsg) {
    const inpId = containerId === 'chat-msgs' ? 'chat-inp' : 'chat-inp-full';
    const inp   = document.getElementById(inpId);
    const msg   = forcedMsg || inp?.value.trim(); if (!msg) return;
    if (this._isStreaming) return;

    // Supprimer les suggestions
    document.querySelectorAll(`#${containerId} ~ .chat-suggestions, #${containerId} .chat-suggestions`).forEach(el => el.remove());
    const sugWrap = document.getElementById(`${containerId}-sug`);
    if (sugWrap) sugWrap.remove();

    this._lastUserMsg = msg;
    const now = new Date();
    this._appendMsg(containerId, 'user', msg, now);
    inp.value = ''; inp.style.height = 'auto';
    S.chatHistory.push({ role: 'user', content: msg });
    this._saveToFirestore(msg, 'user');
    this._updateFooter(containerId);

    // Afficher stop button
    this._lastContainerId = containerId;
    this._setStreaming(true, containerId);

    // Créer div message IA vide pour streaming
    const aiDiv = this._appendMsg(containerId, 'ai', '', now);
    const bodyEl = aiDiv?.querySelector('._msg_body');
    if (bodyEl) {
      const cursor = document.createElement('span');
      cursor.className = 'stream-cursor';
      bodyEl.appendChild(cursor);
    }

    this._abortCtrl = new AbortController();
    let fullReply   = '';

    try {
      const { auth } = await import('./firebase-config.js');
      const user  = auth.currentUser; if (!user) throw new Error('nc');
      const token = await user.getIdToken(true);

      const res = await fetch(`${API_BASE}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({
          message:       msg,
          analyseId:     S.currentAnalyse?.id ?? null,
          history:       S.chatHistory.slice(-10),
          userId:        user.uid,
          llmProvider:   window.DS_CHAT_SETTINGS?.llmProvider || null,
          voiceProvider: window.DS_CHAT_SETTINGS?.voiceProvider || null,
          voiceId:       window.DS_CHAT_SETTINGS?.voiceId || null,
        }),
        signal: this._abortCtrl.signal,
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          detail = err.detail || err.message || detail;
        } catch (_) {}
        throw new Error(detail);
      }

      // ── Détecter JSON vs SSE avant de lire ───────────────
      const ct = res.headers.get('content-type') || '';

      if (ct.includes('application/json')) {
        // ── Réponse JSON standard (notre backend FastAPI) ────
        const data = await res.json();
        fullReply = data.message ?? data.content ?? data.reply ?? '';
        if (typeof data === 'string') fullReply = data;
        if (!fullReply) fullReply = 'Pas de réponse générée.';
        if (bodyEl) bodyEl.innerHTML = _renderMarkdown(fullReply);

      } else {
        // ── Streaming SSE ou text/plain ──────────────────────
        const reader  = res.body?.getReader();
        const decoder = new TextDecoder();
        let   buf     = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            buf += chunk;

            // Si le buffer entier est du JSON valide → extraire directement
            const trimmed = buf.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                const j = JSON.parse(trimmed);
                const extracted = j.message ?? j.content ?? j.reply ?? '';
                if (extracted) {
                  fullReply = extracted;
                  if (bodyEl) bodyEl.innerHTML = _renderMarkdown(fullReply);
                  buf = '\x00done';
                  break;
                }
              } catch { /* JSON incomplet — continuer */ }
            }

            // Traiter ligne par ligne (SSE)
            const lines = chunk.split('\n');
            for (const line of lines) {
              let token = '';
              if (line.startsWith('data: ')) {
                const raw = line.slice(6).trim();
                if (raw === '[DONE]') continue;
                try {
                  const j = JSON.parse(raw);
                  token = j.token ?? j.content ?? j.delta?.content
                        ?? j.choices?.[0]?.delta?.content ?? '';
                } catch { token = raw; }
              } else if (line.trim() && !line.startsWith(':')
                      && !line.trim().startsWith('{')) {
                token = line;
              }
              if (token && bodyEl) {
                fullReply += token;
                const cur = bodyEl.querySelector('.stream-cursor');
                if (cur) cur.remove();
                bodyEl.innerHTML = _renderMarkdown(fullReply);
                const nc = document.createElement('span');
                nc.className = 'stream-cursor';
                bodyEl.appendChild(nc);
                const box = document.getElementById(containerId);
                if (box) box.scrollTop = box.scrollHeight;
              }
            }
          }
        } else {
          fullReply = 'Pas de réponse générée.';
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        fullReply = fullReply || '(Génération interrompue)';
      } else {
        console.error('[ds-chat] Erreur API:', err);
        window.showToast?.(`Chat IA indisponible — ${err.message}`, 'warn');
        fullReply = this._localReply(msg);
      }
    }

    // Finaliser le message — supprimer curseur, afficher contenu final
    if (bodyEl) {
      const cur = bodyEl.querySelector('.stream-cursor');
      if (cur) cur.remove();
      bodyEl.innerHTML = _renderMarkdown(fullReply);
    }

    // Stocker le timestamp
    if (aiDiv) aiDiv.dataset.msgTs = new Date().toISOString();

    S.chatHistory.push({ role: 'assistant', content: fullReply });
    this._saveToFirestore(fullReply, 'assistant');
    this._setStreaming(false, containerId);
    this._updateFooter(containerId);
    this._injectSuggestions(containerId, S.currentAnalyse, true);

    const box = document.getElementById(containerId);
    if (box) box.scrollTop = box.scrollHeight;
    setTimeout(_patchDsIconInDOM, 60);
  },

  // ── Wrappers publics (compatibilité dashboard.html) ──────────
  sendChat()     { this._sendMsg('chat-msgs'); },
  sendChatFull() { this._sendMsg('chat-msgs-full'); },

  // ── Stop génération ──────────────────────────────────────────
  // Arrête le streaming ET conserve le texte déjà généré (comme Claude)
  stopGeneration() {
    if (!this._abortCtrl) return;
    this._abortCtrl.abort();
    this._abortCtrl = null;

    // Supprimer le curseur clignotant
    document.querySelectorAll('.stream-cursor').forEach(c => c.remove());

    // Débloquer l'input et masquer le bouton stop (les deux zones)
    ['chat-msgs', 'chat-msgs-full'].forEach(cid => {
      this._setStreaming(false, cid);
    });

    // Ajouter badge "interrompu" sur le dernier message IA
    const lastAiMsgs = document.querySelectorAll('.msg.ai');
    const lastMsg    = lastAiMsgs[lastAiMsgs.length - 1];
    if (lastMsg) {
      const body = lastMsg.querySelector('._msg_body');
      if (body && body.textContent.trim()) {
        if (!lastMsg.querySelector('.msg-stopped-badge')) {
          const badge = document.createElement('span');
          badge.className = 'msg-stopped-badge';
          badge.style.cssText = 'font-size:7px;color:rgba(255,255,255,.2);font-family:"Syne",sans-serif;font-style:italic;margin-top:3px;display:block;';
          badge.textContent = '— génération interrompue';
          lastMsg.appendChild(badge);
        }
        // Attacher les actions (copier, modifier, régénérer) sur le message arrêté
        if (!lastMsg.querySelector('.msg-actions')) {
          const rawContent = body.innerHTML;
          this._attachMsgActions(lastMsg, this._lastContainerId || 'chat-msgs-full', 'ai', rawContent);
        }
      }
    }
  },

  _setStreaming(active, containerId) {
    this._isStreaming = active;
    // Bouton send
    const inpId  = containerId === 'chat-msgs' ? 'chat-inp' : 'chat-inp-full';
    const sendId = containerId === 'chat-msgs' ? 'chat-send-main' : 'chat-send-full';
    const stopId = containerId === 'chat-msgs' ? 'chat-stop-main' : 'chat-stop-full';
    const inp  = document.getElementById(inpId);
    if (inp) inp.disabled = active;
    const stopBtn = document.getElementById(stopId);
    if (stopBtn) stopBtn.classList.toggle('visible', active);
  },

  // ════ RENDER vue chat plein écran ════════════════════════════
  renderViewChat() {
    const sub = document.getElementById('chat-sub-title');
    if (sub && S.currentAnalyse)
      sub.textContent = (S.currentAnalyse.entreprise ?? '—') + ' · Score ' + (S.currentAnalyse.score ?? '?') + '/100';

    // Cache vide (ex: après actualisation) → recharger Firestore d'abord
    if (!this._convCache && S.user?.uid) {
      this._loadConvCacheThenRender(); return;
    }

    this.renderChatHistoryPanel();
    if (S.currentAnalyse) {
      const msgs = document.getElementById('chat-msgs-full');
      if (!msgs || msgs.dataset.loadedFor !== S.currentAnalyse.id)
        this._openConversation(S.currentAnalyse);
    } else {
      const msgs = document.getElementById('chat-msgs-full');
      if (msgs && !msgs.children.length)
        this._appendMsg('chat-msgs-full', 'ai',
          'Bonjour <i class="fa-solid fa-hand-wave" style="color:var(--amber);"></i> Importez une analyse depuis le Dashboard pour commencer.', new Date());
    }
    setTimeout(_patchDsIconInDOM, 80);
  },

  async _loadConvCacheThenRender() {
    try {
      const convs = await (await this._getFs()).getUserConversations(S.user.uid);
      this._convCache = convs;
    } catch(e) { this._convCache = []; console.warn('[chat] reload cache:', e); }
    this.renderChatHistoryPanel();
    if (S.currentAnalyse) {
      const msgs = document.getElementById('chat-msgs-full');
      if (!msgs || msgs.dataset.loadedFor !== S.currentAnalyse.id)
        this._openConversation(S.currentAnalyse);
    } else {
      const msgs = document.getElementById('chat-msgs-full');
      if (msgs && !msgs.children.length)
        this._appendMsg('chat-msgs-full', 'ai',
          'Bonjour <i class="fa-solid fa-hand-wave" style="color:var(--amber);"></i> Importez une analyse depuis le Dashboard pour commencer.', new Date());
    }
    setTimeout(_patchDsIconInDOM, 80);
  },

  // ════ QUESTIONS SUGGÉRÉES ════════════════════════════════════
  _injectSuggestions(containerId, analyse, isFollowUp = false) {
    if (!analyse) return;
    const box = document.getElementById(containerId); if (!box) return;

    // Supprimer suggestions précédentes
    const old = document.getElementById(`${containerId}-sug`);
    if (old) old.remove();

    const score       = analyse.score ?? 0;
    const zone        = analyse.zone ?? zoneFromScore(score);
    const recos       = analyse.recommendations ?? [];
    const riskFactors = analyse.risk_factors ?? [];
    const ratios      = window.DS_RENDER?.normalizeRatios?.(analyse.ratios || []) ?? [];

    // Extraire DSO depuis les ratios ou risk_factors
    const dsoRatio    = ratios.find(r => r.n && r.n.toLowerCase().includes('dso'));
    const dsoVal      = dsoRatio?.v ?? null;
    const hasDSO      = dsoVal !== null && dsoVal > 60;

    // Extraire la première recommandation urgente
    const urgentReco  = recos.find(r => r.urgency === 'immediate' || r.level === 'high');
    const critFactor  = riskFactors.find(f => f.severity === 'critical');

    // Pool de suggestions contextuelles SYSCOHADA
    const all = [
      // Questions universelles
      { icon: 'fa-circle-question',       text: `Pourquoi mon score est-il ${score}/100 ?` },
      { icon: 'fa-shield-halved',         text: `Quel est mon risque de faillite selon SYSCOHADA ?` },
      { icon: 'fa-lightbulb',             text: `Quelles sont mes 3 actions prioritaires ?` },
      { icon: 'fa-building',              text: `Synthèse pour mon banquier (BICEC, Afriland, Ecobank)` },
      { icon: 'fa-arrow-trend-up',        text: `Plan d'amélioration sur 90 jours` },
      { icon: 'fa-chart-bar',             text: `Comparer mes ratios aux normes CEMAC` },
      // SYSCOHADA-specific
      { icon: 'fa-hourglass-half',        text: hasDSO ? `Mon DSO est de ${dsoVal}j — comment l'améliorer ?` : `Comment optimiser mon délai client (DSO) ?` },
      { icon: 'fa-money-bill-transfer',   text: `Optimiser ma TVA sur encaissements (compte 441)` },
      { icon: 'fa-wallet',                text: `Analyser ma trésorerie (compte 512/571)` },
      { icon: 'fa-handshake',             text: urgentReco ? `Comment mettre en œuvre : "${urgentReco.title}" ?` : `Stratégie de recouvrement clients` },
      { icon: 'fa-triangle-exclamation',  text: critFactor ? `Expliquer le risque : "${critFactor.name}"` : `Quels sont mes risques cachés ?` },
      { icon: 'fa-calculator',            text: `Simuler : et si je réduis mon DSO à 60 jours ?` },
    ];

    // Choisir 4 suggestions contextuelles selon la zone
    let picks;
    if (isFollowUp) {
      picks = [all[2], all[6], all[11], all[4]];
    } else if (zone === 'critique' || score < 25) {
      picks = [all[0], all[10], all[6], all[8]];
    } else if (zone === 'risque' || score < 50) {
      picks = [all[0], all[9], all[6], all[3]];
    } else if (zone === 'vigilance' || score < 75) {
      picks = [all[0], all[2], all[6], all[5]];
    } else {
      picks = [all[4], all[3], all[5], all[11]];
    }

    const wrap = document.createElement('div');
    wrap.id = `${containerId}-sug`;
    wrap.className = 'chat-suggestions';
    wrap.innerHTML = picks.slice(0, 4).map(s =>
      `<button class="chat-sug-btn" onclick="document.getElementById('${
        containerId === 'chat-msgs' ? 'chat-inp' : 'chat-inp-full'
      }').value=${JSON.stringify(s.text)};DS_CHAT._sendMsg('${containerId}')">
        <i class="fa-solid ${s.icon}"></i>${escHtml(s.text)}
      </button>`
    ).join('');

    box.after(wrap);
  },

  // ════ ACTIONS MESSAGES (copier, régénérer) ══════════════════
  _attachMsgActions(div, containerId, role, content) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    if (role === 'ai') {
      // ── Actions messages IA ──
      const btnSpeak = document.createElement('button');
      btnSpeak.className = 'msg-act-btn';
      btnSpeak.title = 'Écouter';
      btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i>Écouter';
      btnSpeak.addEventListener('click', () => window.DS_TTS?.speak(content));

      const btnCopy = document.createElement('button');
      btnCopy.className = 'msg-act-btn';
      btnCopy.title = 'Copier';
      btnCopy.innerHTML = '<i class="fa-regular fa-copy"></i>Copier';
      btnCopy.addEventListener('click', () => DS_CHAT._copyMsg(btnCopy, content));

      const btnEdit = document.createElement('button');
      btnEdit.className = 'msg-act-btn';
      btnEdit.title = 'Modifier';
      btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i>Modifier';
      btnEdit.addEventListener('click', () => DS_CHAT._editMsg(div, role, containerId));

      const btnRegen = document.createElement('button');
      btnRegen.className = 'msg-act-btn';
      btnRegen.title = 'Régénérer';
      btnRegen.innerHTML = '<i class="fa-solid fa-rotate-right"></i>Régénérer';
      btnRegen.addEventListener('click', () => DS_CHAT._regenerate(containerId));

      actions.append(btnSpeak, btnCopy, btnEdit, btnRegen);

    } else {
      // ── Actions messages USER ──
      const btnEdit = document.createElement('button');
      btnEdit.className = 'msg-act-btn';
      btnEdit.title = 'Modifier et renvoyer';
      btnEdit.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>Modifier';
      btnEdit.addEventListener('click', () => DS_CHAT._editMsg(div, role, containerId));
      actions.append(btnEdit);
    }

    div.appendChild(actions);
  },

  async _copyMsg(btn, content) {
    const plain = content.replace(/<[^>]+>/g, '');
    try {
      await navigator.clipboard.writeText(plain);
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i>Copié !';
      btn.style.color = 'var(--color-success)';
      setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
    } catch {
      showToast('Impossible de copier', 'warn');
    }
  },

  _regenerate(containerId) {
    if (!this._lastUserMsg) return;
    const inpId = containerId === 'chat-msgs' ? 'chat-inp' : 'chat-inp-full';
    const inp = document.getElementById(inpId); if (!inp) return;
    // Retirer le dernier message IA du DOM
    const box = document.getElementById(containerId); if (!box) return;
    const msgs = [...box.querySelectorAll('.msg.ai')];
    const last = msgs[msgs.length - 1];
    if (last) last.remove();
    // Retirer le dernier message IA de l'historique
    if (S.chatHistory.length && S.chatHistory[S.chatHistory.length - 1].role === 'assistant')
      S.chatHistory.pop();
    // Retirer aussi le dernier user msg de l'historique (sera renvoyé)
    if (S.chatHistory.length && S.chatHistory[S.chatHistory.length - 1].role === 'user')
      S.chatHistory.pop();
    inp.value = this._lastUserMsg;
    this._sendMsg(containerId);
  },

  // ── Édition d'un message ─────────────────────────────────────
  _editMsg(msgDiv, role, containerId) {
    // Si une édition est déjà ouverte sur ce message → la fermer
    const existingWrap = msgDiv.querySelector('.msg-edit-wrap');
    if (existingWrap) {
      existingWrap.classList.remove('active');
      setTimeout(() => existingWrap.remove(), 150);
      return;
    }

    // Récupérer le contenu actuel (texte brut)
    const bodyEl = msgDiv.querySelector('._msg_body');
    if (!bodyEl) return;
    const currentText = bodyEl.innerText || bodyEl.textContent || '';

    // Construire le bloc d'édition
    const wrap = document.createElement('div');
    wrap.className = 'msg-edit-wrap';

    const ta = document.createElement('textarea');
    ta.className = 'msg-edit-ta';
    ta.value = currentText.trim();
    ta.rows  = Math.min(8, Math.max(2, currentText.split('\n').length + 1));

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'msg-edit-actions';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'msg-edit-cancel';
    btnCancel.textContent = 'Annuler';
    btnCancel.addEventListener('click', () => {
      wrap.classList.remove('active');
      setTimeout(() => wrap.remove(), 150);
    });

    const btnOk = document.createElement('button');
    btnOk.className = 'msg-edit-ok';

    if (role === 'user') {
      // Message utilisateur → modifier ET renvoyer
      btnOk.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right:4px;"></i>Modifier & Renvoyer';
      btnOk.addEventListener('click', () => {
        const newText = ta.value.trim();
        if (!newText || newText === currentText.trim()) {
          wrap.classList.remove('active'); setTimeout(() => wrap.remove(), 150); return;
        }
        // Mettre à jour visuellement
        bodyEl.textContent = newText;
        // Ajouter badge "modifié"
        if (!msgDiv.querySelector('.msg-edited-badge')) {
          const badge = document.createElement('span');
          badge.className = 'msg-edited-badge';
          badge.textContent = '(modifié)';
          msgDiv.appendChild(badge);
        }
        wrap.classList.remove('active'); setTimeout(() => wrap.remove(), 150);
        // Renvoyer comme nouveau message
        const inpId = containerId === 'chat-msgs' ? 'chat-inp' : 'chat-inp-full';
        const inp   = document.getElementById(inpId);
        if (inp) { inp.value = newText; this._sendMsg(containerId); }
      });
    } else {
      // Message IA → modifier le contenu affiché seulement (sans renvoyer)
      btnOk.innerHTML = '<i class="fa-solid fa-check" style="margin-right:4px;"></i>Enregistrer';
      btnOk.addEventListener('click', () => {
        const newText = ta.value.trim();
        if (!newText) { wrap.classList.remove('active'); setTimeout(() => wrap.remove(), 150); return; }
        // Mettre à jour le DOM avec le texte édité (en markdown)
        bodyEl.innerHTML = _renderMarkdown(newText);
        // Mettre à jour l'historique en mémoire
        const idx = S.chatHistory.findLastIndex(m => m.role === 'assistant');
        if (idx >= 0) S.chatHistory[idx].content = newText;
        // Badge modifié
        if (!msgDiv.querySelector('.msg-edited-badge')) {
          const badge = document.createElement('span');
          badge.className = 'msg-edited-badge';
          badge.textContent = '(modifié)';
          msgDiv.appendChild(badge);
        }
        wrap.classList.remove('active'); setTimeout(() => wrap.remove(), 150);
      });
    }

    actionsDiv.append(btnCancel, btnOk);
    wrap.append(ta, actionsDiv);
    msgDiv.appendChild(wrap);

    // Animer l'ouverture
    requestAnimationFrame(() => {
      wrap.classList.add('active');
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });

    // Ctrl+Enter pour valider, Escape pour annuler
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); btnOk.click(); }
      if (e.key === 'Escape') { e.preventDefault(); btnCancel.click(); }
    });
  },

  // ════ FOOTER COMPTEUR ════════════════════════════════════════
  _updateFooter(containerId) {
    const footerId = containerId === 'chat-msgs' ? 'chat-footer-main' : 'chat-footer-full';
    let footer = document.getElementById(footerId);
    if (!footer) {
      const cardEl = document.getElementById(containerId)?.closest('.chat-card');
      if (!cardEl) return;
      footer = document.createElement('div');
      footer.id = footerId;
      footer.className = 'chat-footer-info';
      cardEl.appendChild(footer);
    }
    const plan = S.abonnement?.plan || S.profile?.plan || 'standard';
    const count = S.chatHistory.filter(m => m.role === 'user').length;
    const limits = { standard: 20, premium: 100, extra: '∞' };
    const limit  = limits[plan] ?? 20;
    const quota  = typeof limit === 'number' ? `${count}/${limit} messages` : `${count} messages · illimité`;
    const planLabel = { standard:'Standard', premium:'Premium', extra:'Extra' }[plan] ?? plan;
    footer.innerHTML = `
      <span>${count} message${count > 1 ? 's' : ''} dans cette session</span>
      <span class="chat-footer-quota">
        <i class="fa-solid fa-chart-simple" style="font-size:7px;margin-right:3px;"></i>
        Plan ${planLabel} · ${quota}
      </span>`;
  },

  // ════ HISTORIQUE PANNEAU ═════════════════════════════════════
  renderChatHistoryPanel() {
    const list = document.getElementById('chat-history-list'); if (!list) return;
    this._renderSortBar();
    this._renderSearchBar();

    // ── Construire la liste unifiée : analyses + conversations libres ──
    // On fusionne S.analyses ET this._convCache pour ne rien manquer
    const items = this._buildConvItems();

    if (!items.length) {
      list.innerHTML = `
        <div style="padding:32px 16px;text-align:center;">
          <div style="font-size:28px;margin-bottom:12px;opacity:.18;">💬</div>
          <div style="font-size:10px;color:rgba(255,255,255,.2);">Aucune conversation</div>
          <div style="font-size:9px;color:rgba(255,255,255,.12);margin-top:4px;">Lancez une analyse ou créez une conversation</div>
        </div>`;
      return;
    }

    const q   = (this._searchQuery || '').toLowerCase().trim();
    const cur = this._activeAnalyseId || S.currentAnalyse?.id;

    list.innerHTML = items.map(item => {
      const zone = item.zone ?? zoneFromScore(item.score ?? 0);
      const zc   = ZC[zone] ?? ZC.vigilance;
      const date = this._fmtDate(item.createdAt);
      const isCur = cur === item.id;

      // Preview du dernier message
      const cached  = this._msgCache[item.id];
      const lastMsg = cached?.length ? cached[cached.length - 1] : null;
      const preview = lastMsg
        ? (lastMsg.role === 'user' ? '↑ ' : '↓ ') +
          lastMsg.content.replace(/<[^>]+>/g, '').slice(0, 55) + '…'
        : item.lastMsg
          ? (item.lastRole === 'user' ? '↑ ' : '↓ ') + item.lastMsg.slice(0, 55) + '…'
          : '…';

      // Filtre recherche
      const nomLc = item.name.toLowerCase();
      const hidden = q && !nomLc.includes(q) && !preview.toLowerCase().includes(q);

      // Highlight du terme recherché dans le nom
      const nomHl = q && nomLc.includes(q)
        ? escHtml(item.name).replace(
            new RegExp('(' + escHtml(q).replace(/[.*+?^${}()|[\\]]/g, '\\$&') + ')', 'gi'),
            '<mark style="background:var(--cyan-hover);color:var(--cyan);border-radius:2px;">$1</mark>'
          )
        : escHtml(item.name);

      // Badge score ou type
      const badge = item.isLibre
        ? `<span style="font-size:7px;font-weight:800;color:var(--cyan);background:var(--cyan-hover);border:1px solid var(--cyan-border);padding:2px 6px;border-radius:4px;">Libre</span>`
        : `<span style="font-size:7.5px;font-weight:800;color:${zc.t};background:${zc.bg};border:1px solid ${zc.s}33;padding:2px 7px;border-radius:4px;">${zc.l}</span>`;

      const scoreStr = item.isLibre ? '' : `<span style="font-size:8px;color:var(--text-hint);">${item.score ?? '—'}/100</span>`;

      return `
      <div class="_chi${hidden ? ' search-hidden' : ''}" data-aid="${item.id}" data-convid="${item.convId || ''}"
        style="padding:11px 14px 10px;cursor:pointer;position:relative;
          border-bottom:1px solid var(--border);
          background:${isCur ? 'var(--cyan-hover)' : 'transparent'};
          border-left:3px solid ${isCur ? 'var(--cyan)' : 'transparent'};
          transition:all .15s;">
        <button class="_chi_del" data-aid="${item.id}" data-convid="${item.convId || ''}" title="Supprimer"
          style="position:absolute;top:9px;right:9px;width:22px;height:22px;border-radius:6px;
            background:var(--error-bg);border:1px solid var(--error-border);
            color:var(--error);font-size:9px;cursor:pointer;
            display:none;align-items:center;justify-content:center;transition:all .15s;">
          <i class="fa-solid fa-trash-can"></i></button>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;padding-right:26px;">
          <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;color:var(--text);
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;">
            ${nomHl}</div>
          <div style="font-size:7.5px;color:var(--text-hint);flex-shrink:0;">${date}</div>
        </div>
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px;">
          ${badge}
          ${scoreStr}
          ${cached?.length || item.msgCount
            ? `<span style="margin-left:auto;font-size:7.5px;color:var(--cyan);">
                <i class="fa-regular fa-message" style="font-size:7px;"></i> ${cached?.length || item.msgCount || ''}
               </span>` : ''}
        </div>
        <div class="_chi_prev" data-aid="${item.id}"
          style="font-size:8.5px;color:var(--text-hint);white-space:nowrap;overflow:hidden;
            text-overflow:ellipsis;max-width:195px;line-height:1.5;font-style:italic;">
          ${escHtml(preview)}</div>
      </div>`;
    }).join('');

    // ── Event listeners ──────────────────────────────────────
    list.querySelectorAll('._chi[data-aid]').forEach(el => {
      const btn = el.querySelector('._chi_del');
      el.addEventListener('mouseenter', () => {
        if (cur !== el.dataset.aid) el.style.background = 'var(--surface-2)';
        if (btn) btn.style.display = 'flex';
      });
      el.addEventListener('mouseleave', () => {
        el.style.background = cur === el.dataset.aid ? 'var(--cyan-hover)' : 'transparent';
        if (btn) btn.style.display = 'none';
      });
      el.addEventListener('click', e => {
        if (e.target.closest('._chi_del')) return;
        // Trouver l'item correspondant
        const item = items.find(i => i.id === el.dataset.aid);
        if (item) {
          if (item.isLibre) {
            // Conversation libre → ouvrir directement par convId
            this._openConversationById(item.convId, item.name);
          } else {
            // Conversation liée à une analyse
            const found = S.analyses.find(a => a.id === el.dataset.aid);
            if (found) this._openConversation(found);
          }
        }
      });
      if (btn) btn.addEventListener('click', e => {
        e.stopPropagation();
        const convId = btn.dataset.convid || null;
        this._deleteConversation(el.dataset.aid, convId);
      });
    });

    this._updateSearchEmpty();
    items.forEach(item => {
      if (!item.isLibre) this._loadPreview(item.id);
    });
  },

  // ── Construire la liste unifiée analyses + convs libres ──────
  _buildConvItems() {
    const items = [];
    const usedAnalyseIds = new Set();

    // 1. Analyses ML (ont toujours une conversation associée ou peuvent en avoir)
    (S.analyses ?? []).forEach(a => {
      usedAnalyseIds.add(a.id);
      // Trouver la conv Firestore liée si dispo
      const conv = this._convCache?.find(c => c.analyseId === a.id);
      items.push({
        id:        a.id,
        convId:    conv?.id || null,
        name:      a.entreprise ?? a.company ?? 'Sans nom',
        score:     a.score,
        zone:      a.zone,
        createdAt: conv?.updatedAt || a.createdAt,
        msgCount:  conv?.msgCount || 0,
        lastMsg:   conv?.lastMsg || null,
        lastRole:  conv?.lastRole || null,
        isLibre:   false,
      });
    });

    // 2. Conversations libres (sans analyseId, ou analyseId non présent dans S.analyses)
    (this._convCache ?? []).forEach(conv => {
      if (!conv.analyseId || !usedAnalyseIds.has(conv.analyseId)) {
        items.push({
          id:        conv.id,   // l'id de la conv elle-même
          convId:    conv.id,
          name:      conv.name || 'Conversation',
          score:     null,
          zone:      'vigilance',
          createdAt: conv.updatedAt || conv.createdAt,
          msgCount:  conv.msgCount || 0,
          lastMsg:   conv.lastMsg || null,
          lastRole:  conv.lastRole || null,
          isLibre:   true,
        });
      }
    });

    // Trier selon le mode actif
    if (this._sortMode === 'score') {
      items.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    } else if (this._sortMode === 'old') {
      items.sort((a, b) => _tsMs(a.createdAt) - _tsMs(b.createdAt));
    } else {
      // recent (défaut)
      items.sort((a, b) => _tsMs(b.createdAt) - _tsMs(a.createdAt));
    }

    return items;
  },


  // ════ OUVRIR UNE CONVERSATION ════════════════════════════════
  async _openConversation(analyse) {
    const msgs = document.getElementById('chat-msgs-full'); if (!msgs) return;

    S.currentAnalyse      = analyse;
    this._activeAnalyseId = analyse.id;
    const sub = document.getElementById('chat-sub-title');
    if (sub) sub.textContent = (analyse.entreprise ?? '—') + ' · Score ' + (analyse.score ?? '?') + '/100';

    msgs.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;">' +
      '<i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px;color:var(--color-ice);opacity:.5;"></i>' +
      '<div style="font-size:10px;color:rgba(255,255,255,.28);">Chargement des messages…</div></div>';

    S.chatHistory = [];

    try {
      const fs = await this._getFs();

      // Charger les conversations — toujours recharger si cache vide ou stale
      if (!this._convCache || !this._convCache.length) {
        this._convCache = await fs.getUserConversations(S.user.uid);
      }
      let conv = this._convCache.find(c => c.analyseId === analyse.id);

      // Si non trouvé dans le cache, forcer un rechargement frais
      if (!conv) {
        console.info('[chat] Conv non trouvée dans le cache, rechargement Firestore...');
        this._convCache = await fs.getUserConversations(S.user.uid);
        conv = this._convCache.find(c => c.analyseId === analyse.id);
      }

      msgs.innerHTML = '';

      if (conv?.id) {
        S.firestoreConvId = conv.id;
        console.info('[chat] Conv trouvée:', conv.id, '— chargement messages...');

        const history = await fs.getMessages(conv.id);
        this._msgCache[analyse.id] = history;
        console.info('[chat] Messages chargés:', history.length);

        if (history.length) {
          history.forEach(m => {
            let ts;
            if (m._localTs instanceof Date)   ts = m._localTs;
            else if (m.createdAt?.toDate)     ts = m.createdAt.toDate();
            else if (m.createdAt?.seconds)    ts = new Date(m.createdAt.seconds * 1000);
            else                              ts = new Date();
            const role = m.role === 'user' ? 'user' : 'ai';
            this._appendMsg('chat-msgs-full', role, m.content, ts);
            S.chatHistory.push({ role: m.role, content: m.content });
          });
        } else {
          // Conv existe mais aucun message → message d'intro
          console.info('[chat] Conv vide, affichage intro');
          this._introMsg('chat-msgs-full', analyse);
        }
      } else {
        // Aucune conv pour cette analyse → en créer une nouvelle
        console.info('[chat] Aucune conv pour analyseId:', analyse.id, '— création...');
        S.firestoreConvId = null;
        try {
          const res = await fs.createConversation(S.user.uid, analyse.id);
          S.firestoreConvId = res?.convId ?? null;
          this._convCache = null; // invalider le cache pour le prochain accès
          console.info('[chat] Nouvelle conv créée:', S.firestoreConvId);
        } catch (createErr) {
          console.warn('[chat] Création conv échouée:', createErr);
        }
        this._introMsg('chat-msgs-full', analyse);
      }
    } catch (err) {
      console.error('[chat] erreur chargement conversation:', err);
      msgs.innerHTML = '';
      this._introMsg('chat-msgs-full', analyse);
    }

    msgs.scrollTop = msgs.scrollHeight;
    msgs.dataset.loadedFor = analyse.id;
    this._updateFooter('chat-msgs-full');
    this.renderChatHistoryPanel();
    setTimeout(_patchDsIconInDOM, 80);
  },

  _introMsg(containerId, analyse) {
    const z    = analyse.zone ?? zoneFromScore(analyse.score ?? 0);
    const nom  = escHtml(analyse.entreprise ?? 'votre entreprise');
    const now  = new Date();
    const intro = `Bonjour ${S.profile?.prenom ?? ''} <i class="fa-solid fa-hand-wave" style="color:var(--amber);"></i> ` +
      `<strong>${nom}</strong> · Score <strong>${analyse.score ?? '?'}/100</strong>` +
      ` · ${ZC[z]?.l ?? z}.` +
      `<br><br><i class="fa-solid fa-brain" style="color:var(--violet-3);margin-right:6px;"></i>Mon <strong>Master Agent</strong> a déjà identifié ${window.DS_MASTER_AGENT?.getInsights().length || 0} insights stratégiques.` +
      ` Que voulez-vous approfondir ?`;
    this._appendMsg(containerId, 'ai', intro, now);
    this._injectSuggestions(containerId, analyse);
    if (S.firestoreConvId) this._saveToFirestore(intro, 'assistant');
    if (!this._msgCache[analyse.id]) this._msgCache[analyse.id] = [];
    if (!this._msgCache[analyse.id].length)
      this._msgCache[analyse.id].push({ role: 'assistant', content: intro, _localTs: now });
  },

  // ── Ouvrir une conversation libre (sans analyse liée) ────────
  async _openConversationById(convId, name) {
    const msgs = document.getElementById('chat-msgs-full'); if (!msgs) return;

    this._activeAnalyseId = convId;
    S.currentAnalyse      = null;
    S.firestoreConvId     = convId;
    S.chatHistory         = [];

    const sub = document.getElementById('chat-sub-title');
    if (sub) sub.textContent = name || 'Conversation';

    msgs.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;">' +
      '<i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px;color:var(--cyan);opacity:.5;"></i>' +
      '<div style="font-size:10px;color:var(--text-hint);">Chargement…</div></div>';

    try {
      const fs   = await this._getFs();
      const hist = await fs.getMessages(convId);
      msgs.innerHTML = '';

      if (hist.length) {
        hist.forEach(m => {
          const ts = m.createdAt?.toDate?.() ?? new Date();
          this._appendMsg('chat-msgs-full', m.role === 'user' ? 'user' : 'ai', m.content, ts);
          S.chatHistory.push({ role: m.role, content: m.content });
        });
      } else {
        this._appendMsg('chat-msgs-full', 'ai',
          `Conversation <strong>${escHtml(name)}</strong> — prête à être utilisée.`, new Date());
      }
    } catch (e) {
      console.warn('[chat] _openConversationById:', e);
      msgs.innerHTML = '';
      this._appendMsg('chat-msgs-full', 'ai',
        `Conversation <strong>${escHtml(name)}</strong> — prête à être utilisée.`, new Date());
    }

    msgs.scrollTop = msgs.scrollHeight;
    msgs.dataset.loadedFor = convId;
    this._updateFooter('chat-msgs-full');
    this.renderChatHistoryPanel();
    setTimeout(_patchDsIconInDOM, 80);
  },


  // ════ SUPPRESSION CONVERSATION ═══════════════════════════════
  async _deleteConversation(analyseId, explicitConvId = null) {
    const ok = await this._confirm(
      'Supprimer cette conversation ?',
      "Les messages seront effacés. L'analyse reste disponible."
    );
    if (!ok) return;

    const domItem = document.querySelector(`._chi[data-aid="${analyseId}"]`);
    if (domItem) {
      const h = domItem.offsetHeight;
      domItem.style.cssText += ';transition:opacity .18s,max-height .24s,padding .24s;overflow:hidden;opacity:0;max-height:' + h + 'px;';
      setTimeout(() => { domItem.style.maxHeight = '0'; domItem.style.paddingTop = '0'; domItem.style.paddingBottom = '0'; setTimeout(() => domItem.remove(), 260); }, 150);
    }

    delete this._msgCache[analyseId];
    this._convCache = null; // invalider le cache

    if (S.currentAnalyse?.id === analyseId || this._activeAnalyseId === analyseId) {
      S.chatHistory = []; S.firestoreConvId = null; this._activeAnalyseId = null;
      const m = document.getElementById('chat-msgs-full');
      if (m) {
        m.innerHTML = '';
        this._appendMsg('chat-msgs-full', 'ai',
          "Conversation supprimée. Sélectionnez une conversation dans l'historique pour continuer.", new Date());
      }
    }

    showToast('Conversation supprimée ✓', 'ok');

    (async () => {
      try {
        const fs = await this._getFs();
        // Utiliser le convId explicite s'il est fourni (convs libres)
        let targetConvId = explicitConvId;
        if (!targetConvId) {
          let convs = this._convCache;
          if (!convs) convs = await fs.getUserConversations(S.user.uid);
          const conv = convs?.find(c => c.analyseId === analyseId || c.id === analyseId);
          targetConvId = conv?.id || null;
        }
        if (targetConvId) {
          await fs.deleteConversation(targetConvId);
          console.info('[chat] Conv supprimée:', targetConvId);
        }
        this._convCache = null; // invalider cache
      } catch (e) { console.warn('[chat] Firestore delete bg:', e); }
    })();
  },

  // ════ BARRE DE RECHERCHE ═════════════════════════════════════
  _renderSearchBar() {
    const panel = document.getElementById('chat-history-panel'); if (!panel) return;
    if (document.getElementById('chat-search-wrap')) return; // déjà injectée

    const wrap = document.createElement('div');
    wrap.id = 'chat-search-wrap';
    wrap.innerHTML = `
      <i class="fa-solid fa-magnifying-glass search-icon"></i>
      <input
        id="chat-search-inp"
        type="text"
        placeholder="Rechercher une conversation…"
        autocomplete="off"
        value="${escHtml(this._searchQuery || '')}"
      />`;

    // Insérer après le header du panneau (avant la liste)
    const listEl = document.getElementById('chat-history-list');
    const sortBar = document.getElementById('_chi_sortbar');
    const insertAfter = sortBar || panel.firstElementChild;
    if (insertAfter && insertAfter.nextSibling) {
      panel.insertBefore(wrap, insertAfter.nextSibling);
    } else {
      panel.insertBefore(wrap, listEl);
    }

    // Binder l'événement input
    const inp = wrap.querySelector('#chat-search-inp');
    if (inp) {
      inp.addEventListener('input', () => {
        this._searchQuery = inp.value;
        this._applySearch();
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          this._searchQuery = '';
          inp.value = '';
          this._applySearch();
        }
      });
    }
  },

  _applySearch() {
    const q = (this._searchQuery || '').toLowerCase().trim();
    let visibleCount = 0;

    document.querySelectorAll('._chi[data-aid]').forEach(el => {
      const aid  = el.dataset.aid;
      const a    = S.analyses?.find(x => x.id === aid);
      const nom  = (a?.entreprise ?? '').toLowerCase();
      const prev = el.querySelector('._chi_prev')?.textContent?.toLowerCase() ?? '';

      const matches = !q || nom.includes(q) || prev.includes(q);
      el.classList.toggle('search-hidden', !matches);
      if (matches) {
        visibleCount++;
        // Highlight dans le nom
        const nomEl = el.querySelector('[data-nom]') || el.querySelector('div > div:first-child');
        
      }
    });

    this._updateSearchEmpty(visibleCount);
  },

  _updateSearchEmpty(visibleCount) {
    const panel = document.getElementById('chat-history-panel'); if (!panel) return;
    let emptyEl = document.getElementById('chat-search-empty');
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.id = 'chat-search-empty';
      emptyEl.innerHTML = `<i class="fa-solid fa-magnifying-glass" style="display:block;font-size:20px;opacity:.15;margin-bottom:8px;"></i>Aucune conversation trouvée`;
      panel.querySelector('#chat-history-list')?.after(emptyEl);
    }
    const q = (this._searchQuery || '').trim();
    const count = visibleCount ?? document.querySelectorAll('._chi:not(.search-hidden)').length;
    emptyEl.style.display = (q && count === 0) ? 'block' : 'none';
  },

  // ════ BARRE DE TRI ═══════════════════════════════════════════
  _renderSortBar() {
    const panel = document.getElementById('chat-history-panel'); if (!panel) return;
    let bar = document.getElementById('_chi_sortbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = '_chi_sortbar';
      bar.style.cssText = 'padding:7px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:5px;flex-shrink:0;';
      const listEl = document.getElementById('chat-history-list');
      if (listEl) panel.insertBefore(bar, listEl);
    }
    bar.innerHTML = [
      { k:'recent', l:'↓ Récent' },
      { k:'old',    l:'↑ Ancien' },
      { k:'score',  l:'★ Score'  },
    ].map(o => `
      <button onclick="window.DS_CHAT._setSort('${o.k}')"
        style="padding:3px 9px;border-radius:5px;font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
          cursor:pointer;transition:all .15s;letter-spacing:.04em;
          background:${this._sortMode === o.k ? 'var(--cyan-hover)' : 'transparent'};
          border:1px solid ${this._sortMode === o.k ? 'var(--cyan-border)' : 'var(--border)'};
          color:${this._sortMode === o.k ? 'var(--cyan)' : 'var(--text-hint)'};">
        ${o.l}
      </button>`).join('');
  },

  _setSort(mode)  { this._sortMode = mode; this.renderChatHistoryPanel(); },

  _sortedAnalyses() {
    const list = [...(S.analyses ?? [])];
    if (this._sortMode === 'recent') return list.sort((a, b) => _tsMs(b.createdAt) - _tsMs(a.createdAt));
    if (this._sortMode === 'old')    return list.sort((a, b) => _tsMs(a.createdAt) - _tsMs(b.createdAt));
    if (this._sortMode === 'score')  return list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return list;
  },

  // ════ APERÇU DERNIER MESSAGE ═════════════════════════════════
  async _loadPreview(analyseId) {
    if (this._msgCache[analyseId] || this._pendingPreviews.has(analyseId)) return;
    this._pendingPreviews.add(analyseId);
    try {
      const fs = await this._getFs();
      if (!this._convCache) this._convCache = await fs.getUserConversations(S.user.uid);
      const conv = this._convCache.find(c => c.analyseId === analyseId);
      if (!conv?.id) return;
      const msgs = await fs.getMessages(conv.id);
      this._msgCache[analyseId] = msgs;
      this._updatePreviewEl(analyseId);
    } catch { /* pas bloquant */ }
    finally { this._pendingPreviews.delete(analyseId); }
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
  },

  // ════ SAUVEGARDER FIRESTORE ══════════════════════════════════
  async _saveToFirestore(content, role) {
    if (!S.firestoreConvId) return;
    try {
      const fs = await this._getFs();
      await fs.addMessage(S.firestoreConvId, { role, content });
      const aid = S.currentAnalyse?.id;
      if (aid) {
        if (!this._msgCache[aid]) this._msgCache[aid] = [];
        this._msgCache[aid].push({ role, content, _localTs: new Date() });
      }
    } catch { /* pas bloquant */ }
  },

  // ════ DOM HELPERS ════════════════════════════════════════════
  _appendMsg(containerId, role, content, ts) {
    const box = document.getElementById(containerId); if (!box) return null;
    const div = document.createElement('div');
    div.className = 'msg ' + role;

    let tsDate = null;
    if (ts instanceof Date)      tsDate = ts;
    else if (ts?.toDate)         tsDate = ts.toDate();
    else if (ts?.seconds)        tsDate = new Date(ts.seconds * 1000);
    else if (ts)                 tsDate = new Date(ts);

    const timeStr = tsDate ? this._fmtTime(tsDate) : '';
    const align   = role === 'user' ? 'right' : 'left';

    if (role === 'ai') {
      const body  = content ? _renderMarkdown(content) : '';
      const words = content ? content.replace(/<[^>]+>/g,'').split(/\s+/).filter(Boolean).length : 0;
      const secs  = Math.max(5, Math.ceil(words / 3.8));
      const readLbl = words > 30 ? (secs < 60 ? secs+'s' : Math.ceil(secs/60)+' min') : '';
      div.innerHTML =
        `<div class="mn" style="display:flex;align-items:center;justify-content:space-between;
           gap:8px;margin-bottom:12px;padding-bottom:9px;border-bottom:1px solid var(--border);">
           <span style="font-family:'Syne',sans-serif;font-size:8px;font-weight:900;
             letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);
             display:flex;align-items:center;gap:6px;">
             <i class="fa-solid fa-brain" style="font-size:10px;opacity:.65;"></i>Doctor Smile IA
           </span>
           ${readLbl?`<span style="font-size:8px;color:var(--text-hint);font-family:'JetBrains Mono',monospace;">${readLbl} de lecture</span>`:''}
        </div>` +
        `<div class="_msg_body">${body}</div>` +
        (timeStr?`<div class="_msg_ts" style="font-size:8px;color:var(--text-hint);margin-top:10px;text-align:${align};font-family:'Syne',sans-serif;letter-spacing:.04em;padding-top:7px;border-top:1px solid var(--border);">${timeStr}</div>`:'');
      this._attachMsgActions(div, containerId, role, content);
    } else {
      div.innerHTML =
        `<div class="_msg_body" style="white-space:pre-wrap;word-break:break-word;">${escHtml(content)}</div>` +
        (timeStr?`<div class="_msg_ts" style="font-size:8px;color:var(--text-hint);margin-top:6px;text-align:${align};font-family:'Syne',sans-serif;letter-spacing:.04em;">${timeStr}</div>`:'');
      this._attachMsgActions(div, containerId, role, content);
    }

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
    if (!d || !(d instanceof Date) || isNaN(d)) return '';
    const now  = new Date();
    const diff = now - d;
    if (diff < 0)        return d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    if (diff < 60000)    return "à l'instant";
    if (diff < 3600000)  return 'il y a ' + Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString())
      return 'hier · ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }) +
      ' · ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  },

  _startTimeTicker() {
    if (this._timeTicker) return;
    this._timeTicker = setInterval(() => {
      document.querySelectorAll('.msg[data-msg-ts]').forEach(msgDiv => {
        const d = new Date(msgDiv.dataset.msgTs);
        const tsEl = msgDiv.querySelector('._msg_ts');
        if (tsEl) tsEl.textContent = this._fmtTime(d);
      });
    }, 30000);
  },

  // ════ FALLBACK LOCAL ════════════════════════════════════════
  _localReply(msg) {
    const a  = S.currentAnalyse;
    const lc = msg.toLowerCase();
    if (!a) return "Chargez d'abord une analyse pour que je puisse vous répondre.";
    const { normalizeRatios, normalizeShap, normalizeRecos } = window.DS_RENDER;
    const ratios = normalizeRatios(a.ratios ?? a.financialRatios ?? []);
    if (lc.includes('liquid')) {
      const r = ratios.find(x => x.n.toLowerCase().includes('liquid'));
      return r
        ? `Ratio de liquidité : **${r.v}** (référence : ${r.b}). ${r.p < 65 ? 'Inférieur à la norme.' : 'Satisfaisant.'}`
        : 'Ratio de liquidité absent des données.';
    }
    if (lc.includes('score') || lc.includes('résult'))
      return `Doctor Score™ : **${a.score}/100** — ${ZC[a.zone ?? zoneFromScore(a.score)]?.l}.`;
    if (lc.includes('shap') || lc.includes('facteur')) {
      const top = normalizeShap(a.shapValues ?? a.shap ?? [])[0];
      return top
        ? `Facteur principal : **${top.n}**, impact ${top.pos ? '+' : ''}${top.v} pts.`
        : 'Valeurs SHAP non disponibles.';
    }
    if (lc.includes('recomm') || lc.includes('amélio')) {
      const u = normalizeRecos(a.recommendations ?? a.recos ?? []).find(r => r.lvl === 'high');
      return u ? `Priorité urgente : **${u.t}**. ${u.d}` : 'Aucune recommandation urgente.';
    }
    return `Score actuel : **${a.score}/100**. Posez une question sur la liquidité, l'endettement, ou les recommandations IA.`;
  },

  // ════ KEYBOARD ═══════════════════════════════════════════════
  chatKeydown(e)     { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendMsg('chat-msgs'); } },
  chatKeydownFull(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendMsg('chat-msgs-full'); } },
  autoResize(el)     { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; },

  // ════ CONFIRM MODAL ══════════════════════════════════════════
  _confirm(title, body) {
    return new Promise(resolve => {
      const o = document.createElement('div');
      o.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.78);backdrop-filter:blur(12px);';
      o.innerHTML = `
        <div style="background:var(--bg-elevated);border:1px solid var(--error-border);border-radius:18px;padding:30px;max-width:380px;width:90%;box-shadow:var(--shadow-lg);">
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;color:var(--text);margin-bottom:9px;">${title}</div>
          <div style="font-size:10px;color:var(--text-hint);line-height:1.7;margin-bottom:24px;white-space:pre-line;">${body}</div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="_cc" style="padding:9px 22px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--text-hint);font-family:'Syne',sans-serif;font-size:10px;cursor:pointer;">Annuler</button>
            <button id="_ck" style="padding:9px 22px;border-radius:9px;border:none;background:var(--error-bg);color:var(--error);font-family:'Syne',sans-serif;font-size:10px;font-weight:800;cursor:pointer;">Supprimer</button>
          </div>
        </div>`;
      document.body.appendChild(o);
      o.querySelector('#_cc').onclick = () => { o.remove(); resolve(false); };
      o.querySelector('#_ck').onclick = () => { o.remove(); resolve(true); };
      o.onclick = e => { if (e.target === o) { o.remove(); resolve(false); } };
    });
  },

  // ════ API EXTERNE ════════════════════════════════════════════
  _sendToChat(msg) {
    const inp = document.getElementById('chat-inp');
    if (inp) { inp.value = msg; this.sendChat(); }
  },

  _sendToChatFull(msg) {
    if (this._sendMsg) {
        this._sendMsg('chat-msgs-full', msg);
    }
  },
};

// ── Helper timestamp ─────────────────────────────────────────
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
  // Garantir une référence `S` locale même si `ds-core.js` n'a pas encore défini window.S
  if (!window.S) window.S = {};
  var S = window.S;
  function init() {
    _patchDsIconInDOM();
    window.DS_CHAT._startTimeTicker();
    window.DS_CHAT.restoreHistoryState?.();

    // ── Déclencher _initOnAuth dès que l'utilisateur est authentifié ──
    let _authWait = setInterval(() => {
      if (window.S?.user?.uid) {
        clearInterval(_authWait);
        window.DS_CHAT._initOnAuth();
      }
    }, 400);
    setTimeout(() => clearInterval(_authWait), 30000);

    // Injecter les boutons Stop dans les deux zones de chat
    ['chat-msgs', 'chat-msgs-full'].forEach(cid => {
      const box = document.getElementById(cid);
      if (!box) return;
      const card = box.closest('.chat-card'); if (!card) return;
      const stopId = cid === 'chat-msgs' ? 'chat-stop-main' : 'chat-stop-full';
      if (!document.getElementById(stopId)) {
        const btn = document.createElement('button');
        btn.id = stopId;
        btn.className = 'chat-stop-btn';
        btn.innerHTML = '<i class="fa-solid fa-stop"></i>Arrêter la génération';
        btn.onclick = () => DS_CHAT.stopGeneration();
        const inputWrap = card.querySelector('.chat-input-wrap');
        if (inputWrap) card.insertBefore(btn, inputWrap);
      }
    });

    const origNavTo = window.DS_VIEWS?.navTo;
    if (origNavTo && !window.DS_VIEWS._chatPatched) {
      window.DS_VIEWS._chatPatched = true;
      window.DS_VIEWS.navTo = function (view) {
        origNavTo.call(this, view);
        if (view === 'chat') setTimeout(_patchDsIconInDOM, 120);
      };
    }
    console.log('[ds-chat] ✓ v6 — Streaming · Markdown · Suggestions · Abort · Race-free');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();