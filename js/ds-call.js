// ════════════════════════════════════════════════════════════════
//  ds-call.js — Doctor Smile · Appel vocal IA + TTS + STT
//  Extrait pour dashboard.html (hors dossier public)
// ════════════════════════════════════════════════════════════════

(function(){
'use strict';

// ── CONFIG ELEVENLABS ───────────────────────────────────────────
// Charlotte (XB0fDUnXU5powFXDhCwa) — voix FR naturelle
var EL_KEY   = '';
var EL_MODEL = 'eleven_multilingual_v2';   // meilleure qualité vocale FR
var EL_VOICE = 'XB0fDUnXU5powFXDhCwa';    // Charlotte
var EL_OPTS  = {stability:0.50, similarity_boost:0.85, style:0.40, use_speaker_boost:true};

// ── ÉTAT GLOBAL ────────────────────────────────────────────────
var SS      = window.speechSynthesis;
var _gen    = 0;          // génération TTS — invalide tout fetch précédent
var _audio  = null;       // HTMLAudioElement courant
var _utt    = null;       // SpeechSynthesisUtterance fallback
var playing = false;
var paused  = false;
var auto    = false;
var call    = false;
var muted   = false;
var onHold  = false;
var sec     = 0;
var _timer  = null;
var _wdog   = null;       // watchdog sttBlocked

// STT
var sttBlocked = false;
var sttActive  = false;
var _rec       = null;

// 3D
var _vidMode   = false;
var _3scene    = null;
var _3renderer = null;
var _3jaw      = null;    // mesh mâchoire 3D
var _3raf      = null;
var _analyser  = null;
var _audioCtx  = null;

// ── AUDIO UNLOCK — Chrome bloque l'autoplay sans geste utilisateur ─
var _audioUnlocked = false;
function _unlockAudio(){
  if(_audioUnlocked) return;
  _audioUnlocked = true;
  try{
    if(!_audioCtx || _audioCtx.state==='closed')
      _audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(_audioCtx.state==='suspended') _audioCtx.resume();
    var buf = _audioCtx.createBuffer(1,1,22050);
    var src0 = _audioCtx.createBufferSource();
    src0.buffer=buf; src0.connect(_audioCtx.destination); src0.start(0);
    console.log('[Audio] Déverrouillé');
  }catch(e){ console.warn('[Audio unlock]',e); }
}
document.addEventListener('click', _unlockAudio, {once:true, capture:true});
document.addEventListener('touchstart', _unlockAudio, {once:true, capture:true});

// ── UTILITAIRES ────────────────────────────────────────────────
function _txt(html){
  var d=document.createElement('div'); d.innerHTML=html||'';
  return (d.textContent||d.innerText||'')
    .replace(/Doctor Score™/gi,'')
    .replace(/Doctor Smile IA/gi,'')
    .replace(/https?:\/\/\S+/g,'')
    .replace(/[*_`#>]/g,'')
    .replace(/\s{2,}/g,' ')
    .trim().slice(0,1000);
}
function _el(id){ return document.getElementById(id); }
function _status(t){ var e=_el('_cst'); if(e) e.textContent=t; }
function _micst(t){ var e=_el('_mic_status'); if(e) e.textContent=t; }
function _waves(on){
  var w=_el('_cw_ai'); if(!w) return;
  w.classList.toggle('on',!!on);
}
function _sttUI(on){
  var z=_el('_stt-zone'); if(z) z.classList.toggle('on',!!on);
  if(!on){ var l=_el('_stt-live'); if(l) l.textContent=''; }
}
function _cavState(s){
  var av=_el('_cav'); if(!av) return;
  av.classList.remove('talking','listening');
  if(s) av.classList.add(s);
  // Sync label vidéo
  var lbl=_el('_expr');
  if(lbl) lbl.textContent = s==='talking'?'Parle': s==='listening'?'Écoute':'Prêt';
}
function _bar(on,paused){
  var b=_el('_tbar'); if(!b) return;
  b.classList.toggle('vis',!!on);
  b.querySelectorAll('._tw span').forEach(function(w){
    w.style.animationPlayState = paused?'paused':'running';
  });
}
function _resetBtn(btn){
  if(!btn) return;
  btn.innerHTML='<i class="fa-solid fa-volume-high"></i>';
  btn.style.color='';
}

// ── LIP-SYNC SVG — anime la mâchoire sur l'audio ───────────────
var _lipRaf = null;

function _startLip(audioEl){
  _stopLip();
  try{
    if(!_audioCtx || _audioCtx.state==='closed'){
      _audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    }
    if(_audioCtx.state==='suspended') _audioCtx.resume();
    var src = _audioCtx.createMediaElementSource(audioEl);
    _analyser = _audioCtx.createAnalyser();
    _analyser.fftSize = 128;
    src.connect(_analyser);
    src.connect(_audioCtx.destination);
    _animLip();
  } catch(e){ console.warn('[LipSync]',e); }
}

function _animLip(){
  if(!_analyser){ _lipRaf=null; return; }
  var buf = new Uint8Array(_analyser.fftSize);
  function tick(){
    _lipRaf = requestAnimationFrame(tick);
    _analyser.getByteTimeDomainData(buf);
    var sum=0;
    for(var i=0;i<buf.length;i++){ var v=(buf[i]-128)/128; sum+=v*v; }
    var rms = Math.sqrt(sum/buf.length);
    var amp = Math.min(rms*5, 1);
    _applyJaw(amp);
  }
  tick();
}

function _applyJaw(amp){
  // SVG jaw (mode vocal)
  var jaw = document.getElementById('_jaw');
  if(jaw){
    var open = amp * 10;
    jaw.setAttribute('d','M17 32 Q26 '+(36+open)+' 35 32');
  }
  // Three.js jaw (mode vidéo)
  if(_3jaw){
    _3jaw.rotation.x = amp * 0.45;
  }
}

function _stopLip(){
  if(_lipRaf){ cancelAnimationFrame(_lipRaf); _lipRaf=null; }
  _analyser = null;
  _applyJaw(0); // remettre mâchoire fermée
}

// ── CLIGNEMENT DES YEUX (SVG) ───────────────────────────────────
function _blinkLoop(){
  var el=document.getElementById('_el');
  var er=document.getElementById('_er');
  if(!el||!er) return;
  function doBlink(){
    if(!call&&!auto) return;
    el.setAttribute('ry','0.4'); er.setAttribute('ry','0.4');
    setTimeout(function(){
      el.setAttribute('ry','3.4'); er.setAttribute('ry','3.4');
    },90);
    setTimeout(doBlink, 2000+Math.random()*2500);
  }
  setTimeout(doBlink, 1500);
}

// ── TTS PRINCIPAL — ElevenLabs → Fallback natif ───────────────
function speak(html, opts){
  opts = opts||{};
  var txt = _txt(typeof html==='string'?html:'');
  if(!txt){ if(opts.onEnd) opts.onEnd(); return; }
  if(onHold){ if(opts.onEnd) opts.onEnd(); return; }

  // Invalider génération précédente
  var myGen = ++_gen;
  _stopMedia();

  playing=true; _bar(true);
  if(opts.btn){
    opts.btn.innerHTML='<i class="fa-solid fa-circle-notch fa-spin" style="color:var(--cyan)"></i>';
  }

  var apiBase = window.API_BASE || 'http://127.0.0.1:8000';
  var apiUrl = apiBase + '/api/speech/synthesize?text=' + encodeURIComponent(txt) + '&voice_id=' + encodeURIComponent(EL_VOICE);
  fetch(apiUrl)
  .then(function(r){
    if(myGen!==_gen) return null;
    if(!r.ok) throw new Error('EL '+r.status);
    return r.blob();
  })
  .then(function(blob){
    if(!blob||myGen!==_gen) return;
    var url = URL.createObjectURL(blob);
    var audio = new Audio(url);
    _audio = audio;
    if(opts.btn) opts.btn.innerHTML='<i class="fa-solid fa-stop" style="color:var(--error)"></i>';

    audio.oncanplay = function(){
      if(myGen!==_gen){ URL.revokeObjectURL(url); return; }
      _startLip(audio); // démarrer lip-sync
      audio.play().catch(function(){
        _stopLip();
        _native(txt, myGen, opts);
      });
    };
    audio.onended = function(){
      if(myGen!==_gen) return;
      _stopLip();
      URL.revokeObjectURL(url);
      _audio=null; playing=false; paused=false;
      _bar(false); _resetBtn(opts.btn);
      if(opts.onEnd) opts.onEnd();
    };
    audio.onerror = function(){
      if(myGen!==_gen) return;
      _stopLip();
      _audio=null;
      _native(txt, myGen, opts);
    };
  })
  .catch(function(err){
    if(myGen!==_gen) return;
    console.warn('[EL fallback]',err.message);
    _native(txt, myGen, opts);
  });
}

// Fallback Web Speech API — voix FR la plus naturelle disponible
function _native(txt, myGen, opts){
  if(!SS){ _onSpeakEnd(myGen,opts); return; }
  SS.cancel();
  _utt = new SpeechSynthesisUtterance(txt);
  _utt.lang='fr-FR'; _utt.rate=0.92; _utt.pitch=1.02; _utt.volume=1;
  var vv = SS.getVoices();
  // Choisir la meilleure voix française disponible
  var best = (vv||[]).find(function(v){ return v.lang==='fr-FR'&&/google/i.test(v.name); })
          || (vv||[]).find(function(v){ return v.lang==='fr-FR'; })
          || (vv||[]).find(function(v){ return v.lang.startsWith('fr'); });
  if(best){ _utt.voice=best; console.log('[TTS native] Voix:',best.name,best.lang); }
  else { console.log('[TTS native] Aucune voix FR — utilisation voix système'); }
  if(opts&&opts.btn) opts.btn.innerHTML='<i class="fa-solid fa-stop" style="color:var(--error)"></i>';
  _utt.onend  = function(){ if(myGen!==_gen) return; _onSpeakEnd(myGen,opts); };
  _utt.onerror= function(e){ if(e.error==='interrupted') return; _onSpeakEnd(myGen,opts); };
  playing=true; _bar(true);
  // Assurer que l'AudioContext est déverrouillé
  if(_audioCtx&&_audioCtx.state==='suspended') _audioCtx.resume();
  SS.speak(_utt);
}

function _onSpeakEnd(myGen,opts){
  if(myGen!==_gen) return;
  _stopLip();
  _audio=null; playing=false; paused=false;
  _bar(false); _resetBtn(opts&&opts.btn);
  if(opts&&opts.onEnd) opts.onEnd();
}

function _stopMedia(){
  if(_audio){
    try{ _audio.pause(); _audio.src=''; }catch(e){}
    _audio=null;
  }
  try{ SS&&SS.cancel(); }catch(e){}
  _stopLip();
}

function stop(){
  _gen++;
  _stopMedia();
  playing=false; paused=false;
  _bar(false);
}

function pauseToggle(){
  if(!playing) return;
  if(_audio){
    if(paused){ _audio.play(); paused=false; _bar(true,false); }
    else { _audio.pause(); paused=true; _bar(true,true); }
  } else if(SS){
    if(paused){ SS.resume(); paused=false; _bar(true,false); }
    else { SS.pause(); paused=true; _bar(true,true); }
  }
  var pb=_el('_tpause');
  if(pb) pb.innerHTML=paused
    ?'<i class="fa-solid fa-play"></i>'
    :'<i class="fa-solid fa-pause"></i>';
}

// ── WATCHDOG — protège contre sttBlocked bloqué indéfiniment ─────
function _armWdog(ms){
  _clrWdog();
  _wdog = setTimeout(function(){
    console.warn('[Watchdog] sttBlocked débloqué auto');
    sttBlocked=false; _cavState('');
    _waves(false); _micst('');
    if(call) _startListen();
  }, ms||16000);
}
function _clrWdog(){
  if(_wdog){ clearTimeout(_wdog); _wdog=null; }
}

// ── STT — SpeechRecognition ────────────────────────────────────
function _makeRec(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR) return null;
  var r=new SR();
  r.lang='fr-FR'; r.continuous=false; r.interimResults=true; r.maxAlternatives=1;

  r.onstart=function(){
    sttActive=true; _sttUI(true); _cavState('listening');
    _micst('Micro actif — Parlez maintenant…');
  };
  r.onresult=function(e){
    var fin='',int='';
    for(var i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal) fin+=e.results[i][0].transcript;
      else int+=e.results[i][0].transcript;
    }
    var lv=_el('_stt-live'); if(lv) lv.textContent=int||fin;
    if(fin.trim()) _sendMsg(fin.trim());
  };
  r.onend=function(){
    sttActive=false; _sttUI(false);
    if(call&&!sttBlocked&&!onHold&&!muted)
      setTimeout(function(){ _startListen(); },500);
    else _cavState('');
  };
  r.onerror=function(e){
    sttActive=false; _sttUI(false);
    if(e.error==='not-allowed'){
      _micst('Microphone refusé'); return;
    }
    if(call&&!sttBlocked&&!onHold&&!muted)
      setTimeout(function(){ _startListen(); },900);
  };
  return r;
}

function _startListen(){
  if(!call||sttBlocked||sttActive||onHold||muted) return;
  _rec=_makeRec();
  if(!_rec){ _micst('Micro non disponible'); return; }
  try{ _rec.start(); } catch(e){}
}
function _stopListen(){
  sttActive=false; _sttUI(false);
  if(_rec){ try{ _rec.abort(); }catch(e){} _rec=null; }
  _cavState('');
}

// ── ATTENTE RÉPONSE IA — ROBUSTE ───────────────────────────────
// Gère le streaming : bulle ajoutée vide, texte injecté ensuite
function _waitAI(){
  var box = _el('chat-msgs-full');
  if(!box) return;

  var _done=false, _target=null, _stable=null, _max=null, _obs=null;

  function _finish(bodyEl){
    if(_done) return; _done=true;
    if(_obs){ _obs.disconnect(); _obs=null; }
    if(_stable){ clearTimeout(_stable); _stable=null; }
    if(_max){ clearTimeout(_max); _max=null; }

    var txt=(bodyEl.textContent||'').trim();
    if(!txt){
      // texte encore vide — attendre 600ms de plus
      setTimeout(function(){
        var t2=(bodyEl.textContent||'').trim();
        if(t2) _read(bodyEl); else _resume();
      },600);
      return;
    }
    _read(bodyEl);
  }

  function _read(bodyEl){
    var txt=(bodyEl.textContent||'').trim();
    _addTranscript(txt,'ai');
    _micst('Doctor Smile répond…');
    _cavState('talking'); _waves(true);
    speak(bodyEl.innerHTML,{
      onEnd:function(){
        sttBlocked=false; _clrWdog();
        _cavState(''); _waves(false); _micst('');
        if(call) setTimeout(_startListen,400);
      }
    });
  }

  function _resume(){
    sttBlocked=false; _clrWdog();
    _cavState(''); _waves(false); _micst('');
    if(call) setTimeout(_startListen,300);
  }

  // Observer : nouvelles bulles IA + mutations texte dans bulle existante
  _obs=new MutationObserver(function(muts){
    muts.forEach(function(m){
      // Nouvelle bulle ajoutée
      m.addedNodes.forEach(function(n){
        if(n.nodeType!==1) return;
        if(n.classList.contains('typing')) return;
        if(!n.classList.contains('ai')) return;
        var body=n.querySelector('._msg_body');
        if(!body) return;
        _target=body;
        _schedule(body);
      });
      // Texte modifié dans la bulle cible (streaming)
      if(_target && (m.type==='characterData'||m.type==='childList'))
        _schedule(_target);
    });
  });
  _obs.observe(box,{childList:true,subtree:true,characterData:true});

  // _schedule : attend 280ms de stabilité (fin du streaming)
  function _schedule(bodyEl){
    if(_stable) clearTimeout(_stable);
    _stable=setTimeout(function(){
      var txt=(bodyEl.textContent||'').trim();
      // Vérifier qu'il n'y a plus de curseur de streaming
      if(txt && !bodyEl.querySelector('.stream-cursor,.typing-cursor')){
        _finish(bodyEl);
      } else if(txt){
        _schedule(bodyEl); // encore en streaming
      }
    },280);
  }

  // Timeout max 35s
  _max=setTimeout(function(){
    if(!_done){ console.warn('[_waitAI] timeout'); _resume(); }
  },35000);
}

// ── TRANSCRIPT ──────────────────────────────────────────────────
function _addTranscript(txt,who){
  var tc=_el('_call_transcript'); if(!tc) return;
  var b=document.createElement('div');
  b.className='_ctbbl '+who;
  b.textContent=(who==='user'?'Vous : ':'')+txt;
  tc.appendChild(b);
  tc.scrollTop=tc.scrollHeight;
}

// ── ENVOI MESSAGE ───────────────────────────────────────────────
function _sendMsg(txt){
  if(!txt||!call||onHold) return;
  _addTranscript(txt,'user');
  _micst('Réflexion en cours…');
  _cavState(''); _waves(false); _sttUI(false);
  sttBlocked=true; _stopListen();
  _armWdog(20000);

  var inp=_el('chat-inp-full');
  if(inp){
    inp.value=txt;
    // Essayer toutes les méthodes d'envoi possibles
    if(window.DS_CHAT&&typeof window.DS_CHAT._sendMsg==='function'){
      window.DS_CHAT._sendMsg('chat-msgs-full');
    } else if(window.DS&&typeof window.DS.sendChatFull==='function'){
      window.DS.sendChatFull();
    } else {
      var ev=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true,cancelable:true});
      inp.dispatchEvent(ev);
    }
  }
  _waitAI();
}

// ── DÉMARRER APPEL ──────────────────────────────────────────────
function startCall(){
  if(call) return;
  call=true; auto=true; muted=false; onHold=false;

  var btn=_el('tts-call');
  if(btn){btn.innerHTML='<i class="fa-solid fa-phone-slash"></i> En appel';btn.classList.add('call-on');}
  var m=_el('_cmod'); if(m) m.classList.add('show');
  var tc=_el('_call_transcript'); if(tc) tc.innerHTML='';
  var lv=_el('_stt-live'); if(lv) lv.textContent='';
  _micst(''); _status('Connexion…');

  // Chrono
  sec=0;
  _timer=setInterval(function(){
    sec++;
    var el=_el('_ctm');
    if(el) el.textContent=
      String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  },1000);

  // Message d'accueil
  var prenom=(window.S&&window.S.profile&&window.S.profile.prenom)||'';
  var nom=(window.S&&window.S.currentAnalyse&&window.S.currentAnalyse.entreprise)||'';
  var score=(window.S&&window.S.currentAnalyse&&window.S.currentAnalyse.score!=null)
    ?window.S.currentAnalyse.score:null;
  var g='Bonjour'+(prenom?' '+prenom:'')+'. Je suis Doctor Smile, votre analyste financier IA.';
  if(score!==null) g+=' Votre entreprise '+(nom?nom+' ':'')+'obtient un score de '+score+' sur cent. Je suis à votre écoute.';
  else g+=' Comment puis-je vous aider ?';

  sttBlocked=true;
  _armWdog(20000);
  _unlockAudio(); // déverrouiller audio via clic bouton
  setTimeout(function(){
    _status('En communication · Doctor Smile IA');
    _cavState('talking'); _waves(true);
    _addTranscript(g,'ai');
    speak(g,{
      onEnd:function(){
        sttBlocked=false; _clrWdog();
        _cavState(''); _waves(false); _micst('');
        setTimeout(_startListen,400);
      }
    });
  },600);
}

// ── RACCROCHER ──────────────────────────────────────────────────
function endCall(){
  if(!call) return;
  call=false; auto=false; sttBlocked=false;
  _stopListen(); stop(); _clrWdog();
  clearInterval(_timer); _timer=null; sec=0;

  var m=_el('_cmod'); if(m) m.classList.remove('show');
  var btn=_el('tts-call');
  if(btn){btn.innerHTML='<i class="fa-solid fa-phone"></i> Appel IA';btn.classList.remove('call-on','on');}
  var ba=_el('tts-auto'); if(ba) ba.classList.remove('on');
  _cavState(''); _waves(false); _sttUI(false);
  var ctm=_el('_ctm'); if(ctm) ctm.textContent='00:00';
  _status(''); _micst('');
  if(_vidMode) _toggleVideo();
}

// ── MUTE / HOLD / VIDEO ────────────────────────────────────────
function _toggleMute(){
  muted=!muted;
  var btn=_el('_btn-mute'); if(!btn) return;
  btn.classList.toggle('on',muted);
  btn.innerHTML=muted
    ?'<i class="fa-solid fa-microphone-slash"></i>'
    :'<i class="fa-solid fa-microphone"></i>';
  if(muted){ _stopListen(); _micst('Micro désactivé'); }
  else { _micst(''); if(call&&!sttBlocked&&!onHold) setTimeout(_startListen,200); }
}

function _toggleHold(){
  onHold=!onHold;
  var btn=_el('_btn-hold'); if(!btn) return;
  btn.classList.toggle('on',onHold);
  btn.innerHTML=onHold
    ?'<i class="fa-solid fa-play"></i>'
    :'<i class="fa-solid fa-pause"></i>';
  if(onHold){
    stop(); _stopListen();
    _status('En attente…'); _micst('Appel en attente');
  } else {
    _status('En communication · Doctor Smile IA'); _micst('');
    if(call&&!sttBlocked) setTimeout(_startListen,200);
  }
}

function _toggleVideo(){
  _vidMode=!_vidMode;
  var box=_el('_cbox');
  var wrap=_el('_vid-wrap');
  var btn=_el('_vid-toggle');
  var cav=_el('_cav');
  if(!box||!wrap) return;

  if(_vidMode){
    box.classList.add('vid');
    wrap.classList.add('on');
    if(cav) cav.style.display='none';
    if(btn) btn.innerHTML='<i class="fa-solid fa-phone" style="margin-right:3px;"></i>Vocal';
    _init3D();
  } else {
    box.classList.remove('vid');
    wrap.classList.remove('on');
    if(cav) cav.style.display='';
    if(btn) btn.innerHTML='<i class="fa-solid fa-video" style="margin-right:3px;"></i>Vidéo';
    _stop3D();
  }
}

// ── AVATAR 3D THREE.JS ─────────────────────────────────────────
function _init3D(){
  if(!window.THREE){ console.warn('Three.js absent'); return; }
  var canvas=_el('_vid-canvas'); if(!canvas) return;
  var W=canvas.offsetWidth||400, H=canvas.offsetHeight||220;

  var scene=new THREE.Scene();
  scene.background=new THREE.Color(0x02040B);
  _3scene=scene;

  var cam=new THREE.PerspectiveCamera(42,W/H,0.1,50);
  cam.position.set(0,0.1,3.8);

  var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
  renderer.setSize(W,H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  _3renderer=renderer;

  // Lumières
  scene.add(new THREE.AmbientLight(0x7DD3FC,0.5));
  var sun=new THREE.DirectionalLight(0xffffff,1.4);
  sun.position.set(3,4,5); sun.castShadow=true;
  scene.add(sun);
  var rim=new THREE.DirectionalLight(0x38BDF8,0.7);
  rim.position.set(-4,1,-3); scene.add(rim);
  var gold=new THREE.PointLight(0xFFD700,0.9,10);
  gold.position.set(0,2.5,2); scene.add(gold);

  // Groupe principal
  var root=new THREE.Group(); scene.add(root);

  // Tête
  var headGeo=new THREE.SphereGeometry(1,56,56);
  headGeo.scale(1,1.12,0.94);
  var headMat=new THREE.MeshPhysicalMaterial({
    color:0x1B3F60,metalness:0.18,roughness:0.38,
    emissive:0x0A1828,emissiveIntensity:0.25,
    clearcoat:0.7,clearcoatRoughness:0.15,
  });
  var head=new THREE.Mesh(headGeo,headMat);
  root.add(head);

  // Visor
  var visorGeo=new THREE.SphereGeometry(0.84,32,32);
  visorGeo.scale(1.02,0.72,0.82);
  var visorMat=new THREE.MeshPhysicalMaterial({
    color:0x7DD3FC,transmission:0.72,opacity:0.38,transparent:true,
    roughness:0,metalness:0,emissive:0x3B8BD4,emissiveIntensity:0.18,
  });
  var visor=new THREE.Mesh(visorGeo,visorMat);
  visor.position.set(0,0.02,0.24); head.add(visor);

  // Yeux
  var eyeMat=new THREE.MeshPhysicalMaterial({
    color:0x7DD3FC,emissive:0x3B8BD4,emissiveIntensity:0.9,
    metalness:0.1,roughness:0.05,
  });
  var pupMat=new THREE.MeshBasicMaterial({color:0x020814});
  var refMat=new THREE.MeshBasicMaterial({color:0xffffff});

  function mkEye(x){
    var eg=new THREE.SphereGeometry(0.13,24,24);
    var e=new THREE.Mesh(eg,eyeMat); e.position.set(x,0.2,0.74); head.add(e);
    var p=new THREE.Mesh(new THREE.SphereGeometry(0.065,14,14),pupMat);
    p.position.set(0,0,0.075); e.add(p);
    var r=new THREE.Mesh(new THREE.SphereGeometry(0.025,8,8),refMat);
    r.position.set(0.04,0.04,0.085); e.add(r);
    return e;
  }
  mkEye(-0.33); mkEye(0.33);

  // Mâchoire
  var jawGeo=new THREE.SphereGeometry(0.7,32,16,0,Math.PI*2,Math.PI/2,Math.PI/2);
  jawGeo.scale(1.02,0.52,0.88);
  var jawMat=new THREE.MeshPhysicalMaterial({
    color:0x0E2A40,metalness:0.22,roughness:0.48,
    emissive:0x061420,emissiveIntensity:0.12,
  });
  var jaw=new THREE.Mesh(jawGeo,jawMat);
  jaw.position.set(0,-0.37,0.06); head.add(jaw); _3jaw=jaw;

  // Dents
  var toothMat=new THREE.MeshPhysicalMaterial({color:0xf0f0f0,roughness:0.12});
  for(var t=0;t<5;t++){
    var tooth=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.065,0.04),toothMat);
    tooth.position.set(-0.2+t*0.1,0.04,0.58); jaw.add(tooth);
  }

  // Antenne
  var antMat=new THREE.MeshPhysicalMaterial({
    color:0xFFD700,metalness:0.95,roughness:0.08,
    emissive:0xFFD700,emissiveIntensity:0.4,
  });
  var ant=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.02,0.56,12),antMat);
  ant.position.set(0,1.22,0.08); head.add(ant);
  var antBall=new THREE.Mesh(new THREE.SphereGeometry(0.09,16,16),antMat);
  antBall.position.set(0,0.32,0); ant.add(antBall);

  // Oreilles
  [-1,1].forEach(function(s){
    var earMat=new THREE.MeshPhysicalMaterial({color:0x1B3F60,metalness:0.28,roughness:0.42});
    var ear=new THREE.Mesh(new THREE.TorusGeometry(0.17,0.055,10,20),earMat);
    ear.position.set(s*1.04,0,0);
    ear.rotation.y=s*Math.PI/2; head.add(ear);
  });

  // Boucle rendu
  var t0=0;
  function _loop(){
    _3raf=requestAnimationFrame(_loop);
    t0+=0.016;
    // Rotation idle douce
    root.rotation.y=Math.sin(t0*0.38)*0.14;
    root.rotation.x=Math.sin(t0*0.27)*0.05;
    // Lip-sync Three.js via _analyser
    if(_analyser&&_3jaw){
      var buf=new Uint8Array(_analyser.fftSize);
      _analyser.getByteTimeDomainData(buf);
      var s2=0; for(var i=0;i<buf.length;i++){var v=(buf[i]-128)/128;s2+=v*v;}
      var amp=Math.min(Math.sqrt(s2/buf.length)*5,1);
      _3jaw.rotation.x += (amp*0.45 - _3jaw.rotation.x)*0.35;
    } else if(_3jaw){
      _3jaw.rotation.x *= 0.82; // fermeture douce
    }
    // Pulsation antenne
    antMat.emissiveIntensity=0.35+Math.sin(t0*2.8)*0.2;
    renderer.render(scene,cam);
  }
  _loop();
}

function _stop3D(){
  if(_3raf){ cancelAnimationFrame(_3raf); _3raf=null; }
  if(_3renderer){ _3renderer.dispose(); _3renderer=null; }
  _3scene=null; _3jaw=null;
}

// ── LECTURE AUTO (hors appel) ──────────────────────────────────
function _initAutoRead(){
  var ba=_el('tts-auto');
  if(ba&&!ba._b){
    ba._b=1;
    ba.addEventListener('click',function(){
      _unlockAudio();
      auto=!auto; ba.classList.toggle('on',auto);
      if(!auto) stop();
      var t=document.createElement('div');
      t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'+
        'background:var(--bg-elevated);border:1px solid var(--cyan-border);border-radius:10px;'+
        'padding:6px 16px;font-family:Syne,sans-serif;font-size:11px;color:var(--cyan);'+
        'z-index:9999;pointer-events:none;';
      t.textContent=auto?'Lecture auto activée':'Lecture auto désactivée';
      document.body.appendChild(t);
      setTimeout(function(){t.remove();},1800);
    });
  }
}

// ── OBSERVER bulles IA — bouton écouter + lecture auto ─────────
function _observe(){
  ['chat-msgs','chat-msgs-full'].forEach(function(id){
    var box=_el(id); if(!box||box._obs2) return;
    box._obs2=true;
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(n){
          if(n.nodeType!==1||!n.classList.contains('ai')||n.classList.contains('typing')) return;
          _attachPlayBtn(n);
          // Lecture auto uniquement hors appel (l'appel gère lui-même)
          if(auto && !call){
            var body=n.querySelector('._msg_body');
            if(!body) return;
            // Attendre stabilisation streaming
            var st=null;
            function watch(){
              if(st) clearTimeout(st);
              st=setTimeout(function(){
                if(body.querySelector('.stream-cursor,.typing-cursor')){ watch(); return; }
                var txt=(body.textContent||'').trim();
                if(txt) speak(body.innerHTML);
              },300);
            }
            var wo=new MutationObserver(watch);
            wo.observe(body,{childList:true,subtree:true,characterData:true});
            watch();
            setTimeout(function(){ wo.disconnect(); },30000);
          }
        });
      });
    }).observe(box,{childList:true});
  });
  document.querySelectorAll('.msg.ai').forEach(_attachPlayBtn);
}

function _attachPlayBtn(div){
  if(!div||div.querySelector('._tmb')) return;
  var body=div.querySelector('._msg_body'); if(!body) return;
  var btn=document.createElement('button');
  btn.className='_tmb'; btn.title='Écouter';
  btn.innerHTML='<i class="fa-solid fa-volume-high"></i>';
  btn.addEventListener('click',function(){
    if(playing){ stop(); _resetBtn(btn); return; }
    speak(body.innerHTML,{btn:btn});
  });
  var mn=div.querySelector('.mn');
  if(mn) mn.appendChild(btn); else div.insertBefore(btn,body);
}

// ── DRAG MODAL ──────────────────────────────────────────────────
function _initDrag(){
  var hdr=_el('_chdr');
  var box=_el('_cbox');
  if(!hdr||!box) return;
  var dx=0,dy=0,drag=false;
  hdr.addEventListener('mousedown',function(e){
    drag=true;
    var r=box.getBoundingClientRect();
    dx=e.clientX-r.left; dy=e.clientY-r.top;
    box.style.transition='none';
    // Sortir du flow normal pour drag libre
    var mod=_el('_cmod');
    if(mod){
      mod.style.alignItems='flex-start';
      mod.style.justifyContent='flex-start';
    }
  });
  document.addEventListener('mousemove',function(e){
    if(!drag) return;
    box.style.position='relative';
    box.style.left=(e.clientX-dx-window.innerWidth/2+box.offsetWidth/2)+'px';
    box.style.top=(e.clientY-dy-window.innerHeight/2+box.offsetHeight/2)+'px';
  });
  document.addEventListener('mouseup',function(){ drag=false; });
}

// ── INIT ────────────────────────────────────────────────────────
function _init(){
  // Pause / Stop barre
  var bp=_el('_tpause'); var bs=_el('_tstop');
  if(bp&&!bp._b){ bp._b=1; bp.addEventListener('click',pauseToggle); }
  if(bs&&!bs._b){ bs._b=1; bs.addEventListener('click',stop); }

  // Bouton appel
  var bc=_el('tts-call');
  if(bc&&!bc._b){ bc._b=1; bc.addEventListener('click',function(){ call?endCall():startCall(); }); }

  // Raccrocher
  var ce=_el('_cend');
  if(ce&&!ce._b){ ce._b=1; ce.addEventListener('click',endCall); }

  _initAutoRead();
  _observe();
  _initDrag();
  _blinkLoop();
}

// Exposer l'API publique
window._DS_CALL = {
  start:startCall, end:endCall,
  toggleMute:_toggleMute, toggleHold:_toggleHold, toggleVideo:_toggleVideo,
  speak:speak, stop:stop,
};

// Init au chargement
if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',_init);
else {
  _init();
  setTimeout(function(){ _observe(); },1200);
}

// Précharger les voix natifs (nécessaire sur Chrome)
if(SS){
  SS.getVoices(); // déclenche le chargement
  if(SS.onvoiceschanged!==undefined){
    SS.onvoiceschanged=function(){
      var vv=SS.getVoices();
      var fr=vv.filter(function(v){return v.lang.startsWith('fr');});
      console.log('[TTS] Voix FR chargées:',fr.length,'—',fr.slice(0,3).map(function(v){return v.name;}).join(', '));
    };
  }
}

})();
