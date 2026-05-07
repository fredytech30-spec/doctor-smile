// ════════════════════════════════════════════════════════════════
//  supplement.js — Doctor Smile · Module Supplémentaire Complet
//  Version 1.0
//
//  CE FICHIER CONTIENT :
//  ① Scatter Plot de positionnement concurrentiel (SVG pur)
//  ② Alertes proactives temps réel (Firebase onSnapshot)
//  ③ Onboarding guidé interactif (premier login)
//  ④ Raccourcis clavier globaux
//  ⑤ Lazy loading Three.js (ne charge que si nécessaire)
//  ⑥ Debounce sur tous les inputs critiques
//  ⑦ Service Worker PWA (registration + offline)
//  ⑧ Sécurisation des clés API (proxy via FastAPI)
//  ⑨ Mode Portfolio multi-entreprises
//  ⑩ Annotations sur graphiques
//  ⑪ Recherche globale (Cmd+K)
//
//  INTÉGRATION dans dashboard.html — ajouter avant </body> :
//  <script type="module" src="./js/supplement.js"></script>
//
//  AUCUNE dépendance externe. Fonctionne avec le dashboard existant.
// ════════════════════════════════════════════════════════════════

import { db } from './firebase-config.js';
import {
  collection, onSnapshot, query, orderBy, limit,
  doc, updateDoc, addDoc, getDocs, serverTimestamp,
  where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Palette (miroir exact du dashboard) ─────────────────────────
const P = {
  gold:'#FFD700', ice:'#7DD3FC',  ice2:'#38BDF8',
  em:  '#10b981', ruby:'#ef4444', amb:'#f59e0b',
  vio: '#8B5CF6', pink:'#EC4899',
  bg:  '#02040B', surf:'#060A14', surf2:'#0A1020',
  mut: 'rgba(255,255,255,.35)',
};

const ZONES = {
  saine:     { c: P.em,   l: 'Zone Saine'  },
  vigilance: { c: P.amb,  l: 'Vigilance'   },
  risque:    { c:'#f97316',l:'Zone Risque'  },
  critique:  { c: P.ruby, l: 'Critique'    },
};

const _zoneOf  = s => s>=75?'saine':s>=50?'vigilance':s>=25?'risque':'critique';
const _colorOf = s => ZONES[_zoneOf(s)].c;
const _esc     = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _ts      = v => !v?0 : v.seconds?v.seconds*1000 : v instanceof Date?v.getTime():new Date(v).getTime();
const _dateS   = t => !t?'—':new Date(_ts(t)).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'2-digit'});
const _debounce = (fn, ms=220) => { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

// ════════════════════════════════════════════════════════════════
//  ① SCATTER PLOT — Positionnement concurrentiel
//     Axe X = Doctor Score (0→100)
//     Axe Y = Probabilité de faillite (0→100%)
//     ★  = Entreprise courante (étoile dorée animée)
//     ●  = Même secteur (peers surlignés)
//     ·  = Autres secteurs (semi-transparents)
// ════════════════════════════════════════════════════════════════
const SCATTER = (() => {

  let _current  = null;
  let _allPeers = [];

  // ── Render principal ─────────────────────────────────────────
  function render(current, peers = []) {
    const wrap = document.getElementById('scatter-plot-wrap');
    if (!wrap) return;

    _current  = current;
    _allPeers = peers;

    // ── Lecture correcte de la largeur disponible ──────────────
    // On remonte au parent .card pour avoir la vraie largeur sans padding
    const card = wrap.closest('.card') || wrap.parentElement;
    const cardW = card ? card.getBoundingClientRect().width : 0;
    const cardPad = 40; // padding gauche+droite du .card (20px × 2)
    const availW = (cardW > 0 ? cardW - cardPad : wrap.getBoundingClientRect().width || wrap.offsetWidth || 0);

    // Fallback : si le DOM n'a pas encore calculé, retry dans 120ms
    if (availW < 100) {
      setTimeout(() => render(current, peers), 120);
      return;
    }

    const W   = Math.floor(availW);
    const H   = Math.max(Math.round(W * 0.52), 320); // ratio 52% — hauteur min 320px
    const PAD = { t:34, r:28, b:54, l:58 };
    const IW  = W - PAD.l - PAD.r;
    const IH  = H - PAD.t - PAD.b;

    const xM = v => PAD.l + (v/100)*IW;
    const yM = v => PAD.t + ((100-v)/100)*IH;

    const sameSec   = peers.filter(p => p.secteur === current.secteur);
    const otherSec  = peers.filter(p => p.secteur !== current.secteur);
    const allScores = peers.map(p=>p.score||0);
    const sameScores= sameSec.map(p=>p.score||0);
    const score     = current.score||0;
    const fail      = current.failProb||(100-score);
    const globalAvg = allScores.length ? Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length) : null;
    const sectorAvg = sameScores.length? Math.round(sameScores.reduce((a,b)=>a+b,0)/sameScores.length): null;
    const betterThan= allScores.length ? Math.round((allScores.filter(s=>s<score).length/allScores.length)*100): null;

    // SVG complet
    wrap.innerHTML = `
      <div style="position:relative;">

      <svg id="sc-svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;border-radius:10px;background:rgba(6,10,20,.7);border:1px solid rgba(125,211,252,.07);" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="sc-rbg" cx="50%" cy="50%" r="55%">
            <stop offset="0%"   stop-color="rgba(125,211,252,.04)"/>
            <stop offset="100%" stop-color="rgba(2,4,11,0)"/>
          </radialGradient>
          <filter id="sc-gGold" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="sc-gSoft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <clipPath id="sc-clip">
            <rect x="${PAD.l}" y="${PAD.t}" width="${IW}" height="${IH}" rx="6"/>
          </clipPath>
          <linearGradient id="sc-dangerG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stop-color="rgba(239,68,68,.12)"/>
            <stop offset="100%" stop-color="rgba(239,68,68,.03)"/>
          </linearGradient>
          <linearGradient id="sc-safeG" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="rgba(16,185,129,.1)"/>
            <stop offset="100%" stop-color="rgba(16,185,129,.02)"/>
          </linearGradient>
        </defs>

        <!-- Fond -->
        <rect x="${PAD.l}" y="${PAD.t}" width="${IW}" height="${IH}" fill="url(#sc-rbg)" rx="6"/>

        <!-- Quadrants -->
        <rect x="${PAD.l}" y="${PAD.t}" width="${IW/2}" height="${IH/2}" fill="url(#sc-dangerG)" clip-path="url(#sc-clip)"/>
        <rect x="${xM(50)}" y="${PAD.t}" width="${IW/2}" height="${IH/2}" fill="rgba(245,158,11,.04)" clip-path="url(#sc-clip)"/>
        <rect x="${xM(75)}" y="${PAD.t}" width="${IW/4}" height="${IH}" fill="url(#sc-safeG)" clip-path="url(#sc-clip)"/>
        <rect x="${PAD.l}" y="${yM(50)}" width="${IW/2}" height="${IH/2}" fill="rgba(239,68,68,.09)" clip-path="url(#sc-clip)"/>

        <!-- Grille -->
        ${[25,50,75].map(v=>`
          <line x1="${xM(v)}" y1="${PAD.t}" x2="${xM(v)}" y2="${PAD.t+IH}" stroke="rgba(255,255,255,.045)" stroke-width="1" stroke-dasharray="4,5"/>
          <line x1="${PAD.l}" y1="${yM(v)}" x2="${PAD.l+IW}" y2="${yM(v)}" stroke="rgba(255,255,255,.045)" stroke-width="1" stroke-dasharray="4,5"/>
        `).join('')}

        <!-- Axes -->
        <line x1="${PAD.l}" y1="${PAD.t+IH}" x2="${PAD.l+IW}" y2="${PAD.t+IH}" stroke="rgba(255,255,255,.14)" stroke-width="1.5"/>
        <line x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${PAD.t+IH}" stroke="rgba(255,255,255,.14)" stroke-width="1.5"/>

        <!-- Ticks -->
        ${[0,25,50,75,100].map(v=>`
          <text x="${xM(v)}" y="${PAD.t+IH+16}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.28)">${v}</text>
          <text x="${PAD.l-8}" y="${yM(v)+3}" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.28)">${v}%</text>
        `).join('')}

        <!-- Labels axes -->
        <text x="${PAD.l+IW/2}" y="${H-5}" text-anchor="middle" font-family="Syne,sans-serif" font-size="9" font-weight="800" letter-spacing=".1em" fill="rgba(255,255,255,.25)" text-transform="uppercase">DOCTOR SCORE →</text>
        <text x="12" y="${PAD.t+IH/2}" text-anchor="middle" font-family="Syne,sans-serif" font-size="9" font-weight="800" fill="rgba(255,255,255,.25)" transform="rotate(-90,12,${PAD.t+IH/2})">RISQUE %</text>

        <!-- Ligne seuil vertical 50 -->
        <line x1="${xM(50)}" y1="${PAD.t}" x2="${xM(50)}" y2="${PAD.t+IH}" stroke="rgba(245,158,11,.3)" stroke-width="1.5" stroke-dasharray="7,4"/>
        <text x="${xM(50)+4}" y="${PAD.t+11}" font-family="Syne,sans-serif" font-size="7" font-weight="800" fill="rgba(245,158,11,.6)" letter-spacing=".05em">SEUIL 50</text>

        <!-- Ligne risque horizontal 50% -->
        <line x1="${PAD.l}" y1="${yM(50)}" x2="${PAD.l+IW}" y2="${yM(50)}" stroke="rgba(239,68,68,.28)" stroke-width="1.5" stroke-dasharray="7,4"/>
        <text x="${PAD.l+IW-4}" y="${yM(50)-5}" text-anchor="end" font-family="Syne,sans-serif" font-size="7" font-weight="800" fill="rgba(239,68,68,.55)" letter-spacing=".05em">RISQUE 50%</text>

        <!-- Labels quadrants -->
        <text x="${xM(87)}" y="${yM(90)}" text-anchor="middle" font-family="Syne,sans-serif" font-size="8" font-weight="900" fill="rgba(16,185,129,.4)" letter-spacing=".1em">EXCELLENT</text>
        <text x="${xM(13)}" y="${yM(10)}" text-anchor="middle" font-family="Syne,sans-serif" font-size="8" font-weight="900" fill="rgba(239,68,68,.5)" letter-spacing=".1em">DANGER</text>
        <text x="${xM(25)}" y="${yM(90)}" text-anchor="middle" font-family="Syne,sans-serif" font-size="7.5" font-weight="800" fill="rgba(249,115,22,.38)" letter-spacing=".08em">RISQUÉ</text>

        <!-- Ellipse de densité du secteur -->
        ${sameSec.length >= 3 ? _renderDensityEllipse(sameSec, xM, yM) : ''}

        <!-- Points autres secteurs -->
        <g clip-path="url(#sc-clip)" id="sc-others">
          ${otherSec.map((p,i) => {
            const col = _colorOf(p.score||0);
            const fp  = p.failProb||(100-(p.score||0));
            return `<circle cx="${xM(p.score||0)}" cy="${yM(fp)}" r="3.5"
              fill="${col}" fill-opacity="0.22" stroke="${col}" stroke-width="0.5" stroke-opacity="0.35"
              class="sc-pt" data-n="${_esc(p.entreprise||'—')}" data-s="${p.score||0}" data-f="${Math.round(fp)}" data-sec="${_esc(p.secteur||'—')}"
              style="cursor:pointer;transition:r .12s,fill-opacity .12s;"/>`;
          }).join('')}
        </g>

        <!-- Points même secteur -->
        <g clip-path="url(#sc-clip)" id="sc-same">
          ${sameSec.map((p,i) => {
            const col = _colorOf(p.score||0);
            const fp  = p.failProb||(100-(p.score||0));
            return `<circle cx="${xM(p.score||0)}" cy="${yM(fp)}" r="5.5"
              fill="${col}" fill-opacity="0.5" stroke="${col}" stroke-width="1.2" stroke-opacity="0.75"
              filter="url(#sc-gSoft)"
              class="sc-pt" data-n="${_esc(p.entreprise||'—')}" data-s="${p.score||0}" data-f="${Math.round(fp)}" data-sec="${_esc(p.secteur||'—')}"
              style="cursor:pointer;transition:r .12s,fill-opacity .12s;"/>`;
          }).join('')}
        </g>

        <!-- ★ Point courant — étoile animée -->
        <g clip-path="url(#sc-clip)">
          <!-- Halo pulsant -->
          <circle cx="${xM(score)}" cy="${yM(fail)}" r="18" fill="${_colorOf(score)}" fill-opacity="0.06">
            <animate attributeName="r" values="12;22;12" dur="2.6s" repeatCount="indefinite"/>
            <animate attributeName="fill-opacity" values=".06;.02;.06" dur="2.6s" repeatCount="indefinite"/>
          </circle>
          <!-- Étoile -->
          <g transform="translate(${xM(score)},${yM(fail)})"
             class="sc-pt" data-n="${_esc(current.entreprise||'—')}" data-s="${score}" data-f="${Math.round(fail)}" data-sec="${_esc(current.secteur||'—')}" data-current="1"
             style="cursor:default;">
            <polygon
              points="0,-11 3.2,-4.8 10.5,-3.4 5.2,2 6.7,9.5 0,6 -6.7,9.5 -5.2,2 -10.5,-3.4 -3.2,-4.8"
              fill="${P.gold}" stroke="rgba(255,215,0,.6)" stroke-width="1"
              filter="url(#sc-gGold)"
              style="animation:scStarPulse 2.6s ease infinite;"/>
            <circle r="2.2" fill="#fff" fill-opacity="0.95"/>
          </g>
          <!-- Label entreprise courante -->
          <text x="${xM(score)+16}" y="${yM(fail)-9}" font-family="Syne,sans-serif" font-size="9.5" font-weight="900" fill="${P.gold}" fill-opacity="0.95">${_esc((current.entreprise||'Vous').slice(0,16))}${(current.entreprise||'').length>16?'…':''}</text>
          <text x="${xM(score)+16}" y="${yM(fail)+3}" font-family="JetBrains Mono,monospace" font-size="8.5" fill="${_colorOf(score)}" fill-opacity="0.85">${score}/100 · ${Math.round(fail)}% faillite</text>
        </g>

      </svg>

      <!-- Tooltip -->
      <div id="sc-tt" style="position:fixed;z-index:9500;pointer-events:none;opacity:0;
        background:rgba(5,9,18,.97);border:1px solid rgba(125,211,252,.2);border-radius:11px;
        padding:11px 15px;min-width:170px;box-shadow:0 20px 60px rgba(0,0,0,.65);
        transition:opacity .1s;font-family:'Instrument Sans',sans-serif;backdrop-filter:blur(14px);">
      </div>

      </div>

      <!-- Légende -->
      <div style="display:flex;align-items:center;gap:14px;justify-content:center;margin-top:11px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:5px;">
          <svg width="13" height="13"><polygon points="6.5,0 8.8,4.5 13,5.2 9.8,8.3 10.6,13 6.5,10.8 2.4,13 3.2,8.3 0,5.2 4.2,4.5" fill="${P.gold}"/></svg>
          <span style="font-family:Syne,sans-serif;font-size:9px;font-weight:700;color:rgba(255,255,255,.6);">${_esc(current.entreprise||'Vous')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <svg width="11" height="11"><circle cx="5.5" cy="5.5" r="4.5" fill="${P.ice}" fill-opacity=".5" stroke="${P.ice}" stroke-width=".8"/></svg>
          <span style="font-family:Syne,sans-serif;font-size:9px;color:rgba(255,255,255,.38);">Même secteur (${sameSec.length})</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <svg width="9" height="9"><circle cx="4.5" cy="4.5" r="4" fill="rgba(255,255,255,.25)"/></svg>
          <span style="font-family:Syne,sans-serif;font-size:9px;color:rgba(255,255,255,.28);">Autres (${otherSec.length})</span>
        </div>
        ${sameSec.length>=3?`
        <div style="display:flex;align-items:center;gap:5px;">
          <svg width="14" height="10"><ellipse cx="7" cy="5" rx="6" ry="4" fill="none" stroke="rgba(125,211,252,.45)" stroke-width="1.2" stroke-dasharray="3,2"/></svg>
          <span style="font-family:Syne,sans-serif;font-size:9px;color:rgba(255,255,255,.28);">Zone sectorielle</span>
        </div>`:''}
        <div style="display:flex;gap:6px;">
          <button onclick="DS_SUPPLEMENT.scatter.filter('all')" id="sc-f-all"
            style="padding:3px 10px;border-radius:6px;background:rgba(125,211,252,.12);border:1px solid rgba(125,211,252,.3);
            font-family:Syne,sans-serif;font-size:8px;font-weight:800;color:#7DD3FC;cursor:pointer;">Tous</button>
          <button onclick="DS_SUPPLEMENT.scatter.filter('same')" id="sc-f-same"
            style="padding:3px 10px;border-radius:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
            font-family:Syne,sans-serif;font-size:8px;font-weight:800;color:rgba(255,255,255,.4);cursor:pointer;">Mon secteur</button>
          <button onclick="DS_SUPPLEMENT.scatter.exportPNG()" title="Exporter PNG"
            style="padding:3px 10px;border-radius:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
            font-family:Syne,sans-serif;font-size:8px;font-weight:800;color:rgba(255,255,255,.3);cursor:pointer;">
            <i class="fa-solid fa-image" style="margin-right:3px;"></i>PNG</button>
        </div>
      </div>

      <!-- Stats de positionnement -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;">
        ${[
          { l:'Moy. globale',    v: globalAvg!=null?globalAvg+'/100':'—',    c:P.ice    },
          { l:'Moy. sectorielle',v: sectorAvg!=null?sectorAvg+'/100':'—',   c:P.amb    },
          { l:'Écart secteur',   v: sectorAvg!=null?(score-sectorAvg>=0?'+':'')+(score-sectorAvg)+' pts':'—', c:sectorAvg!=null?(score>=sectorAvg?P.em:P.ruby):P.mut },
          { l:'Percentile',      v: betterThan!=null?'Top '+(100-betterThan)+'%':'—', c:P.vio },
        ].map(it=>`
          <div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.055);">
            <div style="font-family:JetBrains Mono,monospace;font-size:15px;font-weight:700;color:${it.c};line-height:1;">${it.v}</div>
            <div style="font-family:Syne,sans-serif;font-size:7.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-top:3px;">${it.l}</div>
          </div>
        `).join('')}
      </div>
    `;

    _bindScatterEvents();
    _animatePoints();
  }

  // ── Ellipse de densité sectorielle ──────────────────────────
  function _renderDensityEllipse(pts, xM, yM) {
    const xs = pts.map(p=>p.score||0);
    const ys = pts.map(p=>p.failProb||(100-(p.score||0)));
    const mx = xs.reduce((a,b)=>a+b)/xs.length;
    const my = ys.reduce((a,b)=>a+b)/ys.length;
    const rx = Math.max(Math.sqrt(xs.reduce((a,b)=>a+(b-mx)**2,0)/xs.length)*1.8, 8);
    const ry = Math.max(Math.sqrt(ys.reduce((a,b)=>a+(b-my)**2,0)/ys.length)*1.8, 8);
    return `
      <ellipse cx="${xM(mx)}" cy="${yM(my)}" rx="${rx*(xM(100)-xM(0))/100}" ry="${ry*(yM(0)-yM(100))/100}"
        fill="rgba(125,211,252,.04)" stroke="rgba(125,211,252,.35)" stroke-width="1.2"
        stroke-dasharray="5,3" clip-path="url(#sc-clip)"/>
    `;
  }

  // ── Tooltip ─────────────────────────────────────────────────
  function _bindScatterEvents() {
    const wrap = document.getElementById('scatter-plot-wrap');
    const tt   = document.getElementById('sc-tt');
    if (!wrap || !tt) return;

    wrap.querySelectorAll('.sc-pt').forEach(el => {
      el.addEventListener('mouseenter', e => {
        const n   = el.dataset.n || '—';
        const s   = Number(el.dataset.s||0);
        const f   = Number(el.dataset.f||0);
        const sec = el.dataset.sec||'—';
        const col = el.dataset.current ? P.gold : _colorOf(s);
        const zone = ZONES[_zoneOf(s)];
        tt.innerHTML = `
          <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:900;color:#fff;
            margin-bottom:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;">
            ${el.dataset.current?'★ ':''}${n}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="display:flex;justify-content:space-between;gap:14px;">
              <span style="font-size:9px;color:rgba(255,255,255,.4);">Doctor Score</span>
              <span style="font-family:JetBrains Mono,monospace;font-size:13px;font-weight:700;color:${col};">${s}<span style="font-size:9px;opacity:.5;">/100</span></span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:14px;">
              <span style="font-size:9px;color:rgba(255,255,255,.4);">Risque faillite</span>
              <span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(255,255,255,.65);">${f}%</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:14px;">
              <span style="font-size:9px;color:rgba(255,255,255,.4);">Secteur</span>
              <span style="font-size:9px;color:rgba(255,255,255,.5);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sec}</span>
            </div>
            <div style="margin-top:3px;padding:3px 8px;border-radius:100px;background:${col}18;border:1px solid ${col}33;text-align:center;">
              <span style="font-family:Syne,sans-serif;font-size:8px;font-weight:800;letter-spacing:.08em;color:${col};">${zone.l}</span>
            </div>
          </div>
        `;
        tt.style.opacity = '1';
        const vw=window.innerWidth, vh=window.innerHeight;
        let lx=e.clientX+14, ly=e.clientY-20;
        if(lx+200>vw) lx=e.clientX-210;
        if(ly+160>vh) ly=vh-165;
        tt.style.left=lx+'px'; tt.style.top=ly+'px';

        if (!el.dataset.current) {
          el.setAttribute('r', el.classList.contains('sc-pt') && el.parentElement.id==='sc-same' ? '8' : '5.5');
          el.setAttribute('fill-opacity', '.75');
        }
      });
      el.addEventListener('mouseleave', () => {
        tt.style.opacity='0';
        if (!el.dataset.current) {
          el.setAttribute('r', el.parentElement.id==='sc-same'?'5.5':'3.5');
          el.setAttribute('fill-opacity', el.parentElement.id==='sc-same'?'.5':'.22');
        }
      });
    });

    // ── ResizeObserver : re-rendre si le container change de taille ──
    if (wrap._scatterRO) wrap._scatterRO.disconnect();
    let _resizeTimer = null;
    wrap._scatterRO = new ResizeObserver(entries => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => {
        if (_current) render(_current, _allPeers);
      }, 120);
    });
    wrap._scatterRO.observe(wrap.closest('.card') || wrap);
  }

  // ── Animation entrée des points ──────────────────────────────
  function _animatePoints() {
    const pts = document.querySelectorAll('#sc-others circle, #sc-same circle');
    pts.forEach((pt, i) => {
      pt.style.opacity='0';
      setTimeout(() => {
        pt.style.transition='opacity .35s ease';
        pt.style.opacity='1';
      }, 15 + i*14);
    });
  }

  // ── Filtre ───────────────────────────────────────────────────
  function filter(mode) {
    if (!_current) return;
    // Update boutons visuels
    ['all','same'].forEach(m => {
      const b = document.getElementById(`sc-f-${m}`);
      if (!b) return;
      if (m===mode) { b.style.background='rgba(125,211,252,.14)'; b.style.color=P.ice; b.style.borderColor='rgba(125,211,252,.35)'; }
      else { b.style.background='rgba(255,255,255,.05)'; b.style.color='rgba(255,255,255,.4)'; b.style.borderColor='rgba(255,255,255,.1)'; }
    });
    const peers = mode==='same' ? _allPeers.filter(p=>p.secteur===_current.secteur) : _allPeers;
    render(_current, peers);
  }

  // ── Export PNG ───────────────────────────────────────────────
  function exportPNG() {
    const svg = document.getElementById('sc-svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type:'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width=svg.viewBox.baseVal.width*2; c.height=svg.viewBox.baseVal.height*2;
      const ctx = c.getContext('2d');
      ctx.fillStyle='#02040B'; ctx.fillRect(0,0,c.width,c.height);
      ctx.scale(2,2); ctx.drawImage(img,0,0);
      URL.revokeObjectURL(url);
      c.toBlob(b=>{
        const a=document.createElement('a');
        a.href=URL.createObjectURL(b);
        a.download=`ds-benchmark-${new Date().toISOString().slice(0,10)}.png`;
        a.click();
      },'image/png');
    };
    img.src=url;
  }

  // ── Injection du container dans #viz-content ─────────────────
  function inject() {
    if (document.getElementById('sc-section')) return;
    const target = document.getElementById('viz-content');
    if (!target) return;

    const sec = document.createElement('div');
    sec.id = 'sc-section';
    sec.className = 'card fu';
    sec.style.cssText = 'padding:20px;margin-bottom:16px;';
    sec.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
        <div class="card-title" style="margin-bottom:0;">
          <i class="fa-solid fa-circle-dot"></i> Positionnement concurrentiel
        </div>
        <span id="sc-sector-tag" style="font-family:Syne,sans-serif;font-size:8px;font-weight:800;
          letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:100px;
          background:rgba(125,211,252,.08);color:#7DD3FC;border:1px solid rgba(125,211,252,.18);"></span>
      </div>
      <div style="font-size:9px;color:rgba(255,255,255,.28);margin-bottom:14px;line-height:1.6;">
        ★ Votre position · Axe X = Doctor Score · Axe Y = Probabilité de faillite estimée · Points = benchmarks sectoriels anonymisés
      </div>
      <div id="scatter-plot-wrap" style="position:relative;width:100%;"></div>
    `;

    // Insérer juste avant la grille 3D (2ème section)
    const grids = target.querySelectorAll('[style*="grid-template-columns"]');
    const insertBefore = grids[1] || grids[0] || null;
    if (insertBefore) target.insertBefore(sec, insertBefore);
    else target.appendChild(sec);
  }

  return { render, inject, filter, exportPNG };
})();


// ════════════════════════════════════════════════════════════════
//  ② ALERTES PROACTIVES TEMPS RÉEL
//     Firebase onSnapshot — monitoring continu
//     Déclenche des notifications push internes si :
//     - Nouveau score sous un seuil critique
//     - Paiement échoué
//     - Nouvelle analyse lancée par l'utilisateur courant
//     - Ratio financier critique détecté
// ════════════════════════════════════════════════════════════════
const ALERTS = (() => {
  const _unsubs   = [];
  const _shown    = new Set(); // évite les doublons

  // ── Règles de base (P1_AGENT gère les règles personnalisées avancées) ──
  const RULES = [
    { id:'score_crit',  test: a => (a.score||0) < 25,   lvl:'danger',
      msg: a => `⚠️ Score critique : <strong>${a.entreprise||'—'}</strong> — ${a.score}/100` },
    { id:'score_warn',  test: a => (a.score||0) < 50 && (a.score||0) >= 25, lvl:'warn',
      msg: a => `👁 Score vigilance : <strong>${a.entreprise||'—'}</strong> — ${a.score}/100` },
    { id:'score_great', test: a => (a.score||0) >= 85,  lvl:'ok',
      msg: a => `✅ Excellent résultat : <strong>${a.entreprise||'—'}</strong> — ${a.score}/100` },
    { id:'trend_check', test: a => true, lvl:'info',
      msg: a => null,  // Délégué à P1_AGENT.checkTrend
      hook: a => window.P1_AGENT?.checkTrend(window.S?.analyses ?? []) },
  ];

  // ── Démarrer les listeners ───────────────────────────────────
  function start(uid) {
    if (!uid || !db) return;

    // Écoute des nouvelles analyses de l'utilisateur
    const qA = query(
      collection(db, 'analyses'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    let firstA = true;
    const unsubA = onSnapshot(qA, snap => {
      if (firstA) { firstA=false; return; } // ignorer l'état initial
      snap.docChanges().forEach(ch => {
        if (ch.type !== 'added') return;
        const a = { id: ch.doc.id, ...ch.doc.data() };
        RULES.forEach(r => {
          const key = `${r.id}_${a.id}`;
          if (!_shown.has(key) && r.test(a)) {
            _shown.add(key);
            if (r.hook) { r.hook(a); return; }           // Déléguer à P1_AGENT si hook défini
            const msg = r.msg(a); if (!msg) return;       // Ignorer si msg null
            _push(msg, r.lvl, a);
          }
        });
      });
    }, err => console.warn('[ALERTS] analyses:', err));
    _unsubs.push(unsubA);

    // Écoute des abonnements (paiements échoués)
    const unsubS = onSnapshot(doc(db, 'abonnements', uid), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      const key = `pay_fail_${snap.id}_${d.updatedAt?.seconds||0}`;
      if (!_shown.has(key) && (d.status==='failed'||d.status==='past_due')) {
        _shown.add(key);
        _push(`💳 Paiement échoué — Vérifiez votre abonnement <strong>${d.plan||''}</strong>`, 'danger', null, () => {
          window.DS?.navTo?.('parametres');
        });
      }
    }, err => console.warn('[ALERTS] abonnements:', err));
    _unsubs.push(unsubS);

    console.log('%c[ALERTS] Listeners temps réel actifs', 'color:#10b981');
  }

  // ── Stop ────────────────────────────────────────────────────
  function stop() {
    _unsubs.forEach(u => u());
    _unsubs.length = 0;
  }

  // -- Push une notification interne --------------------------------
  function _push(html, level='ok', analyse=null, action=null) {
    // 1. Notification DS (ds-notifs.js) -- source unique de verite pour le badge
    if (window.DS_NOTIFS?.push) {
      DS_NOTIFS.push({ html, level, ts: Date.now(), analyse, action });
    }

    // 2. Toast flottant Doctor Smile
    _toast(html, level, action);

    // 2b. Feed Master Agent UNIQUEMENT pour les alertes critiques (level='danger')
    //     Evite le bouclage : chaque notif ordinaire ne doit pas generer un insight IA
    if (level === 'danger' && window.DS_MASTER_AGENT?.addInsight) {
        const text = html.replace(/<[^>]*>?/gm, '');
        window.DS_MASTER_AGENT.addInsight({
            title: 'Alerte Critique',
            desc: text,
            severity: 'critical'
        });
    }
  }

  // ── Toast flottant ───────────────────────────────────────────
  function _toast(html, level, action) {
    const colors = { ok:P.em, warn:P.amb, danger:P.ruby, info:P.ice };
    const c = colors[level]||P.ice;

    const t = document.createElement('div');
    t.style.cssText = `
      position:fixed;top:20px;right:20px;z-index:99999;
      max-width:320px;padding:13px 18px;border-radius:13px;
      background:rgba(5,9,18,.97);border:1px solid ${c}44;
      box-shadow:0 16px 48px rgba(0,0,0,.6),0 0 24px ${c}18;
      font-family:'Instrument Sans',sans-serif;font-size:11px;color:rgba(255,255,255,.8);
      transform:translateX(340px);transition:transform .35s cubic-bezier(.34,1.56,.64,1);
      cursor:${action?'pointer':'default'};line-height:1.5;
    `;
    t.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="width:6px;height:6px;border-radius:50%;background:${c};flex-shrink:0;margin-top:3px;
          box-shadow:0 0 8px ${c};animation:admPulse 2s ease infinite;"></div>
        <div style="flex:1;">${html}</div>
        <button onclick="this.closest('div[style]').remove()" style="background:none;border:none;
          color:rgba(255,255,255,.25);cursor:pointer;font-size:14px;line-height:1;padding:0;flex-shrink:0;">×</button>
      </div>
    `;
    if (action) t.addEventListener('click', action);
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.transform='translateX(0)');
    setTimeout(() => {
      t.style.transform='translateX(340px)';
      setTimeout(()=>t.remove(), 400);
    }, 5500);
  }

  return { start, stop, push: _push };
})();


// ════════════════════════════════════════════════════════════════
//  ③ ONBOARDING — Délégué à ds-onboarding.js
//     Le module complet est dans js/ds-onboarding.js
//     supplement.js expose juste un proxy pour compatibilité
// ════════════════════════════════════════════════════════════════
const ONBOARDING = {
  start:         (uid)  => window.DS_ONBOARDING?.start(uid),
  skip:          ()     => window.DS_ONBOARDING?.skip(),
  checkAndStart: (uid)  => window.DS_ONBOARDING?.checkAndStart(uid),
  replay:        ()     => window.DS_ONBOARDING?.replay(),
};


// ════════════════════════════════════════════════════════════════
//  ④ RACCOURCIS CLAVIER GLOBAUX
//     Cmd/Ctrl+K  → Recherche globale
//     Cmd/Ctrl+U  → Upload fichier
//     Cmd/Ctrl+1..5 → Navigation rapide entre vues
//     Esc         → Fermer modal / drawer ouverts
//     ?           → Aide raccourcis
// ════════════════════════════════════════════════════════════════
const SHORTCUTS = (() => {

  function init() {
    document.addEventListener('keydown', _handle, { capture:true });
    console.log('%c[SHORTCUTS] Raccourcis clavier actifs (? pour aide)', 'color:#8B5CF6');
  }

  function _handle(e) {
    // Ignorer si focus dans un input/textarea
    const tag = document.activeElement?.tagName;
    if (tag==='INPUT'||tag==='TEXTAREA'||document.activeElement?.isContentEditable) {
      if (e.key==='Escape') document.activeElement.blur();
      return;
    }

    const mod = e.metaKey || e.ctrlKey;

    // Cmd+K — Recherche globale
    if (mod && e.key==='k') {
      e.preventDefault();
      SEARCH.open();
      return;
    }

    // Cmd+U — Upload
    if (mod && e.key==='u') {
      e.preventDefault();
      window.DS?.triggerUpload?.();
      _toast('📁 Ouverture upload…');
      return;
    }

    // Cmd+1..5 — Navigation
    const views = ['dashboard','analyses','chat','visualisations','rapports'];
    if (mod && e.key>='1' && e.key<='5') {
      e.preventDefault();
      const v = views[Number(e.key)-1];
      window.DS?.navTo?.(v);
      _toast(`→ ${v.charAt(0).toUpperCase()+v.slice(1)}`);
      return;
    }

    // Esc — Fermer modals
    if (e.key==='Escape') {
      document.getElementById('adm-modal')?.remove();
      document.getElementById('onb-overlay')?.remove();
      document.getElementById('onb-bubble')?.remove();
      document.getElementById('gs-overlay')?.remove();
      if (document.getElementById('profile-drawer')?.classList.contains('open')) {
        window.DS_PROFILE?.closeDrawer?.();
      }
      return;
    }

    // ? — Aide raccourcis
    if (e.key==='?' && !mod) {
      e.preventDefault();
      _showHelp();
      return;
    }

    // R — Refresh admin
    if (e.key==='r' && mod) {
      if (document.getElementById('view-admin')?.classList.contains('active')) {
        e.preventDefault();
        window.DS_ADMIN?.refresh?.();
        _toast('🔄 Actualisation…');
      }
    }
  }

  function _toast(msg) {
    const t=document.createElement('div');
    t.style.cssText=`position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:rgba(5,9,18,.95);border:1px solid rgba(125,211,252,.25);border-radius:8px;
      padding:7px 16px;font-family:Syne,sans-serif;font-size:10px;font-weight:700;
      color:#7DD3FC;z-index:99999;pointer-events:none;letter-spacing:.06em;
      transition:opacity .3s;`;
    t.textContent=msg;
    document.body.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},1500);
  }

  function _showHelp() {
    const existing = document.getElementById('shortcuts-help');
    if (existing) { existing.remove(); return; }

    const shortcuts = [
      ['⌘K',  'Recherche globale'],
      ['⌘U',  'Importer un fichier'],
      ['⌘1',  'Dashboard'],
      ['⌘2',  'Analyses'],
      ['⌘3',  'Chat IA'],
      ['⌘4',  'Visualisations'],
      ['⌘5',  'Rapports'],
      ['Esc', 'Fermer / Annuler'],
      ['?',   'Cette aide'],
    ];

    const box = document.createElement('div');
    box.id='shortcuts-help';
    box.style.cssText=`position:fixed;bottom:80px;right:20px;z-index:99999;
      background:rgba(6,10,20,.99);border:1px solid rgba(125,211,252,.18);border-radius:14px;
      padding:18px 20px;min-width:220px;box-shadow:0 20px 60px rgba(0,0,0,.6);
      animation:onbFadeIn .2s ease;`;
    box.innerHTML=`
      <div style="font-family:Syne,sans-serif;font-size:10px;font-weight:900;
        letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.3);
        margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
        Raccourcis
        <button onclick="document.getElementById('shortcuts-help').remove()" style="background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:14px;">×</button>
      </div>
      ${shortcuts.map(([k,l])=>`
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);">
          <span style="font-size:10px;color:rgba(255,255,255,.45);">${l}</span>
          <kbd style="font-family:JetBrains Mono,monospace;font-size:9px;font-weight:700;
            padding:2px 7px;border-radius:5px;background:rgba(255,255,255,.07);
            border:1px solid rgba(255,255,255,.12);color:#7DD3FC;">${k}</kbd>
        </div>
      `).join('')}
    `;
    document.body.appendChild(box);
    document.addEventListener('click', e=>{
      if (!box.contains(e.target)) box.remove();
    }, { once:true });
  }

  return { init };
})();


// ════════════════════════════════════════════════════════════════
//  ⑤ RECHERCHE GLOBALE — Cmd+K
//     Cherche dans : analyses, entreprises, recommandations
//     Navigation instantanée vers le résultat
// ════════════════════════════════════════════════════════════════
const SEARCH = (() => {

  function open() {
    document.getElementById('gs-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id='gs-overlay';
    overlay.style.cssText=`position:fixed;inset:0;z-index:9900;
      background:rgba(2,4,11,.82);backdrop-filter:blur(18px);
      display:flex;align-items:flex-start;justify-content:center;
      padding-top:90px;`;

    overlay.innerHTML=`
      <div style="width:min(94vw,580px);background:rgba(6,10,20,.99);
        border:1px solid rgba(125,211,252,.2);border-radius:18px;
        box-shadow:0 40px 100px rgba(0,0,0,.7);overflow:hidden;
        animation:onbFadeIn .2s ease;">

        <!-- Search input -->
        <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;
          border-bottom:1px solid rgba(255,255,255,.06);">
          <i class="fa-solid fa-magnifying-glass" style="color:#7DD3FC;font-size:15px;flex-shrink:0;"></i>
          <input id="gs-input" type="text" placeholder="Rechercher une entreprise, analyse, ratio…"
            style="flex:1;background:none;border:none;outline:none;font-family:'Instrument Sans',sans-serif;
            font-size:14px;color:#fff;caret-color:#7DD3FC;"
            autocomplete="off" spellcheck="false"/>
          <kbd style="font-family:JetBrains Mono,monospace;font-size:9px;padding:2px 7px;
            border-radius:5px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
            color:rgba(255,255,255,.3);cursor:pointer;" onclick="document.getElementById('gs-overlay').remove()">Esc</kbd>
        </div>

        <!-- Results -->
        <div id="gs-results" style="max-height:420px;overflow-y:auto;padding:8px 0;"></div>

        <!-- Footer -->
        <div style="padding:8px 18px;border-top:1px solid rgba(255,255,255,.05);
          display:flex;align-items:center;gap:14px;">
          <span style="font-family:Syne,sans-serif;font-size:8px;font-weight:800;letter-spacing:.1em;color:rgba(255,255,255,.2);">ANALYSES · ENTREPRISES · RATIOS</span>
        </div>

      </div>
    `;

    overlay.addEventListener('click', e => { if (e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    const inp = document.getElementById('gs-input');
    inp?.focus();

    inp?.addEventListener('input', _debounce(e => _search(e.target.value), 180));
    inp?.addEventListener('keydown', e => {
      if (e.key==='Escape') overlay.remove();
      if (e.key==='ArrowDown') _selectResult(1);
      if (e.key==='ArrowUp')   _selectResult(-1);
      if (e.key==='Enter')     _activateSelected();
    });

    // Résultats par défaut (récents)
    _search('');
  }

  function _search(q) {
    const resultsEl = document.getElementById('gs-results');
    if (!resultsEl) return;

    const analyses = window.S?.analyses || window._allAnalyses || [];
    const qLow = q.toLowerCase().trim();

    // Catégorie : Analyses
    const matchA = analyses.filter(a =>
      !qLow ||
      (a.entreprise||'').toLowerCase().includes(qLow) ||
      (a.secteur||'').toLowerCase().includes(qLow)
    ).slice(0, qLow ? 8 : 4);

    // Catégorie : Vues
    const VIEWS = [
      { id:'dashboard',     label:'Dashboard',           icon:'fa-gauge-high',     desc:'Vue principale' },
      { id:'analyses',      label:'Mes Analyses',        icon:'fa-microscope',     desc:'Historique complet' },
      { id:'chat',          label:'Chat IA',             icon:'fa-comments',       desc:'Analyste Doctor Smile' },
      { id:'visualisations',label:'Visualisations',      icon:'fa-chart-pie',      desc:'Graphiques 3D & benchmarks' },
      { id:'rapports',      label:'Rapports PDF',        icon:'fa-file-chart-column',desc:'Exports & PDF' },
    ].filter(v => !qLow || v.label.toLowerCase().includes(qLow) || v.desc.toLowerCase().includes(qLow));

    if (!matchA.length && !VIEWS.length) {
      resultsEl.innerHTML=`<div style="padding:24px;text-align:center;font-size:11px;color:rgba(255,255,255,.2);">Aucun résultat pour « ${_esc(q)} »</div>`;
      return;
    }

    let html = '';

    // Vues
    if (VIEWS.length) {
      html += `<div style="padding:6px 18px 4px;font-family:Syne,sans-serif;font-size:8px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.22);">NAVIGATION</div>`;
      html += VIEWS.map(v=>`
        <div class="gs-result" data-action="nav:${v.id}" style="display:flex;align-items:center;gap:12px;
          padding:10px 18px;cursor:pointer;transition:background .1s;"
          onmouseenter="this.style.background='rgba(125,211,252,.05)'"
          onmouseleave="this.style.background=''"
          onclick="DS_SUPPLEMENT.search._activate('nav:${v.id}')">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(125,211,252,.08);
            border:1px solid rgba(125,211,252,.14);display:flex;align-items:center;justify-content:center;
            flex-shrink:0;color:#7DD3FC;font-size:12px;">
            <i class="fa-solid ${v.icon}"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:#fff;">${v.label}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.35);">${v.desc}</div>
          </div>
          <i class="fa-solid fa-arrow-right" style="font-size:9px;color:rgba(255,255,255,.2);"></i>
        </div>
      `).join('');
    }

    // Analyses
    if (matchA.length) {
      html += `<div style="padding:10px 18px 4px;font-family:Syne,sans-serif;font-size:8px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.22);">ANALYSES</div>`;
      html += matchA.map(a => {
        const col  = _colorOf(a.score||0);
        const zone = ZONES[_zoneOf(a.score||0)];
        return `
          <div class="gs-result" data-action="analyse:${a.id}"
            style="display:flex;align-items:center;gap:12px;padding:10px 18px;cursor:pointer;transition:background .1s;"
            onmouseenter="this.style.background='rgba(125,211,252,.05)'"
            onmouseleave="this.style.background=''"
            onclick="DS_SUPPLEMENT.search._activate('analyse:${a.id}')">
            <div style="width:32px;height:32px;border-radius:8px;
              background:${col}18;border:1px solid ${col}33;
              display:flex;align-items:center;justify-content:center;flex-shrink:0;
              font-family:Syne,sans-serif;font-size:11px;font-weight:900;color:${col};">
              ${a.score||'—'}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:#fff;
                overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(a.entreprise||'—')}</div>
              <div style="font-size:9px;color:rgba(255,255,255,.35);">${_esc(a.secteur||'—')} · ${_dateS(a.createdAt)}</div>
            </div>
            <span style="font-family:Syne,sans-serif;font-size:8px;font-weight:800;
              padding:2px 8px;border-radius:100px;color:${col};background:${col}18;border:1px solid ${col}28;">
              ${zone.l}
            </span>
          </div>
        `;
      }).join('');
    }

    resultsEl.innerHTML = html;
  }

  let _selectedIdx = -1;

  function _selectResult(dir) {
    const items = document.querySelectorAll('.gs-result');
    if (!items.length) return;
    items[_selectedIdx]?.style.setProperty('background','');
    _selectedIdx = Math.max(0, Math.min(items.length-1, _selectedIdx+dir));
    items[_selectedIdx].style.background='rgba(125,211,252,.07)';
    items[_selectedIdx].scrollIntoView({ block:'nearest' });
  }

  function _activateSelected() {
    const items = document.querySelectorAll('.gs-result');
    if (_selectedIdx>=0 && items[_selectedIdx]) {
      const action = items[_selectedIdx].dataset.action;
      if (action) _activate(action);
    }
  }

  function _activate(action) {
    document.getElementById('gs-overlay')?.remove();
    _selectedIdx = -1;

    if (action.startsWith('nav:')) {
      window.DS?.navTo?.(action.slice(4));
    } else if (action.startsWith('analyse:')) {
      const id = action.slice(8);
      window.DS?.navTo?.('visualisations');
      // Charger l'analyse si possible
      const a = (window.S?.analyses||[]).find(a=>a.id===id);
      if (a && window.DS?.loadAnalyse) window.DS.loadAnalyse(a);
    }
  }

  return { open, _activate, _search };
})();


// ════════════════════════════════════════════════════════════════
//  ⑥ LAZY LOADING THREE.JS
//     Ne charge three.min.js que si #view-visualisations devient actif
//     Économie : ~580KB évités au boot si pas d'analyse chargée
// ════════════════════════════════════════════════════════════════
const LAZY_THREE = (() => {
  let _loaded = false;

  function init() {
    // Observer les changements de vue
    const vizPane = document.getElementById('view-visualisations');
    if (!vizPane) return;

    // Si Three.js est déjà chargé (depuis le HTML), on n'a rien à faire
    if (window.THREE) { _loaded=true; return; }

    // Observer l'activation de la vue
    const obs = new MutationObserver(() => {
      if (vizPane.classList.contains('active') && !_loaded) {
        _load();
      }
    });
    obs.observe(vizPane, { attributes:true, attributeFilter:['class'] });

    // Aussi via navTo
    const origNav = window.DS?.navTo;
    if (origNav && !window.DS._threePatched) {
      window.DS._threePatched = true;
      window.DS.navTo = function(view) {
        if (view==='visualisations' && !_loaded) _load(() => origNav.call(window.DS, view));
        else origNav.call(window.DS, view);
      };
    }
  }

  function _load(cb) {
    if (_loaded) { cb?.(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      _loaded = true;
      console.log('%c[LAZY_THREE] Three.js r128 chargé à la demande', 'color:#8B5CF6');
      cb?.();
      window.DS_EXTRA?.initAll?.();
    };
    script.onerror = () => console.warn('[LAZY_THREE] Échec chargement Three.js');
    document.head.appendChild(script);
  }

  return { init };
})();


// ════════════════════════════════════════════════════════════════
//  ⑦ ANNOTATIONS SUR GRAPHIQUES
//     Permet à l'utilisateur d'ajouter des notes sur la timeline
//     Stockées dans Firestore : analyses/{id}.annotations[]
// ════════════════════════════════════════════════════════════════
const ANNOTATIONS = (() => {

  let _analyseId = null;
  let _items     = [];

  function init(analyseId, existingAnnotations = []) {
    _analyseId = analyseId;
    _items     = existingAnnotations;
    _injectButton();
  }

  function _injectButton() {
    const tlCard = document.querySelector('#bottom-sec .card-title');
    if (!tlCard || tlCard.querySelector('.ann-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'ann-btn';
    btn.title = 'Ajouter une annotation';
    btn.style.cssText = `background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.2);
      border-radius:7px;padding:4px 10px;color:#FFD700;font-family:Syne,sans-serif;
      font-size:8px;font-weight:800;letter-spacing:.08em;cursor:pointer;
      display:inline-flex;align-items:center;gap:4px;transition:all .15s;margin-left:auto;`;
    btn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Annoter';
    btn.onclick = _openForm;

    const parent = tlCard.parentElement;
    if (parent.style.display==='flex') parent.appendChild(btn);
    else { parent.style.display='flex'; parent.style.alignItems='center'; parent.appendChild(btn); }
  }

  function _openForm() {
    const existing = document.getElementById('ann-modal');
    if (existing) { existing.remove(); return; }

    const modal = document.createElement('div');
    modal.id = 'ann-modal';
    modal.style.cssText = `position:fixed;inset:0;z-index:9850;
      background:rgba(2,4,11,.8);backdrop-filter:blur(12px);
      display:flex;align-items:center;justify-content:center;`;
    modal.innerHTML = `
      <div style="width:min(92vw,420px);background:rgba(6,10,20,.99);
        border:1px solid rgba(255,215,0,.18);border-radius:16px;
        padding:22px;box-shadow:0 32px 80px rgba(0,0,0,.7);animation:onbFadeIn .25s ease;">
        <div style="font-family:Syne,sans-serif;font-size:13px;font-weight:900;
          color:#fff;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
          <i class="fa-solid fa-pen-to-square" style="color:#FFD700;"></i> Ajouter une annotation
        </div>

        <div style="margin-bottom:12px;">
          <div style="font-size:9px;color:rgba(255,255,255,.35);font-family:Syne,sans-serif;
            font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;">Date de l'événement</div>
          <input id="ann-date" type="date" style="width:100%;padding:9px 12px;
            background:rgba(255,255,255,.04);border:1px solid rgba(255,215,0,.18);
            border-radius:8px;color:#fff;font-family:'Instrument Sans',sans-serif;font-size:12px;
            outline:none;"/>
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:9px;color:rgba(255,255,255,.35);font-family:Syne,sans-serif;
            font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;">Description</div>
          <textarea id="ann-text" rows="3" placeholder="Ex: Levée de fonds Série A, Restructuration dette, Rachat concurrent…"
            style="width:100%;padding:10px 12px;background:rgba(255,255,255,.04);
            border:1px solid rgba(255,215,0,.18);border-radius:8px;color:#fff;
            font-family:'Instrument Sans',sans-serif;font-size:12px;
            outline:none;resize:vertical;line-height:1.5;"></textarea>
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:9px;color:rgba(255,255,255,.35);font-family:Syne,sans-serif;
            font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">Type</div>
          <div style="display:flex;gap:7px;">
            ${[
              {v:'event',  l:'Événement', c:P.ice},
              {v:'alert',  l:'Alerte',    c:P.ruby},
              {v:'good',   l:'Positif',   c:P.em},
              {v:'neutral',l:'Neutre',    c:P.mut},
            ].map(t=>`
              <label style="flex:1;cursor:pointer;">
                <input type="radio" name="ann-type" value="${t.v}" style="display:none;"
                  ${t.v==='event'?'checked':''}>
                <div class="ann-type-opt" data-val="${t.v}"
                  style="padding:6px 4px;border-radius:8px;border:1px solid rgba(255,255,255,.1);
                  text-align:center;font-family:Syne,sans-serif;font-size:8px;font-weight:800;
                  letter-spacing:.06em;color:rgba(255,255,255,.4);background:rgba(255,255,255,.04);
                  transition:all .15s;cursor:pointer;
                  ${t.v==='event'?`color:${t.c};border-color:${t.c}44;background:${t.c}12;`:''}"
                  onclick="document.querySelectorAll('.ann-type-opt').forEach(x=>{x.style.color='rgba(255,255,255,.4)';x.style.borderColor='rgba(255,255,255,.1)';x.style.background='rgba(255,255,255,.04)'});this.style.color='${t.c}';this.style.borderColor='${t.c}44';this.style.background='${t.c}12'">
                  ${t.l}
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <div style="display:flex;gap:8px;">
          <button onclick="document.getElementById('ann-modal').remove()"
            style="flex:1;padding:10px;border-radius:9px;background:rgba(255,255,255,.05);
            border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.45);
            font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;">Annuler</button>
          <button id="ann-save"
            style="flex:1;padding:10px;border-radius:9px;
            background:linear-gradient(135deg,#FFD700,#FFC107);border:none;
            color:#02040B;font-family:Syne,sans-serif;font-size:9px;font-weight:900;
            letter-spacing:.1em;cursor:pointer;box-shadow:0 0 14px rgba(255,215,0,.25);">
            <i class="fa-solid fa-floppy-disk" style="margin-right:5px;"></i>Enregistrer
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });

    document.getElementById('ann-save')?.addEventListener('click', async () => {
      const date = document.getElementById('ann-date')?.value;
      const text = document.getElementById('ann-text')?.value?.trim();
      const type = document.querySelector('input[name="ann-type"]:checked')?.value || 'event';
      if (!text) return;

      const ann = { date: date||new Date().toISOString().slice(0,10), text, type, createdAt: Date.now() };
      _items.push(ann);

      if (_analyseId) {
        try {
          await updateDoc(doc(db,'analyses',_analyseId), {
            annotations: _items,
            updatedAt: serverTimestamp(),
          });
        } catch(e) { console.warn('[ANN] Firestore save error:', e); }
      }

      modal.remove();
      _renderAnnotations();
      ALERTS.push(`📌 Annotation ajoutée : ${text.slice(0,40)}…`, 'ok');
    });
  }

  function _renderAnnotations() {
    if (!_items.length) return;

    let list = document.getElementById('ann-list');
    if (!list) {
      const card = document.querySelector('#bottom-sec .card');
      if (!card) return;
      list = document.createElement('div');
      list.id='ann-list';
      list.style.cssText='margin-top:12px;display:flex;flex-direction:column;gap:5px;';
      card.appendChild(list);
    }

    const typeColors = { event:P.ice, alert:P.ruby, good:P.em, neutral:P.mut };
    list.innerHTML = _items.map((a,i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 12px;
        background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);
        border-left:3px solid ${typeColors[a.type]||P.ice};border-radius:7px;">
        <i class="fa-solid fa-thumbtack" style="font-size:9px;color:${typeColors[a.type]||P.ice};flex-shrink:0;"></i>
        <div style="flex:1;min-width:0;">
          <span style="font-size:11px;color:rgba(255,255,255,.75);">${_esc(a.text)}</span>
        </div>
        <span style="font-family:JetBrains Mono,monospace;font-size:9px;color:rgba(255,255,255,.3);white-space:nowrap;">${a.date||''}</span>
        <button onclick="DS_SUPPLEMENT.annotations._delete(${i})"
          style="background:none;border:none;color:rgba(255,255,255,.18);cursor:pointer;font-size:10px;
          transition:color .15s;flex-shrink:0;"
          onmouseenter="this.style.color='#ef4444'"
          onmouseleave="this.style.color='rgba(255,255,255,.18)'">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  async function _delete(idx) {
    _items.splice(idx, 1);
    if (_analyseId) {
      try { await updateDoc(doc(db,'analyses',_analyseId), { annotations:_items }); } catch(e){}
    }
    _renderAnnotations();
  }

  return { init, _delete, _renderAnnotations };
})();


// ════════════════════════════════════════════════════════════════
//  ⑧ MODE PORTFOLIO MULTI-ENTREPRISES
//     Vue synthétique de toutes les analyses de l'utilisateur
//     Carte par entreprise avec trend + alerte si score dégradé
// ════════════════════════════════════════════════════════════════
const PORTFOLIO = (() => {

  function render(analyses) {
    const wrap = document.getElementById('portfolio-wrap');
    if (!wrap || !analyses.length) return;

    // Grouper par entreprise
    const grouped = {};
    analyses.forEach(a => {
      const k = a.entreprise || a.id;
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(a);
    });

    // Trier chaque groupe par date
    Object.values(grouped).forEach(arr => arr.sort((a,b) => _ts(a.createdAt)-_ts(b.createdAt)));

    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">
        ${Object.entries(grouped).map(([name, entries]) => {
          const last   = entries[entries.length-1];
          const prev   = entries[entries.length-2];
          const score  = last.score||0;
          const col    = _colorOf(score);
          const zone   = ZONES[_zoneOf(score)];
          const delta  = prev ? score-(prev.score||0) : null;
          const trend  = entries.map(e=>e.score||0);
          return `
            <div style="background:rgba(6,10,20,.85);border:1px solid ${col}28;border-radius:14px;
              padding:16px 18px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;"
              onmouseenter="this.style.borderColor='${col}55';this.style.transform='translateY(-2px)'"
              onmouseleave="this.style.borderColor='${col}28';this.style.transform=''"
              onclick="DS_SUPPLEMENT.portfolio.select('${_esc(name)}')">
              <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${col},transparent);"></div>

              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
                <div style="flex:1;min-width:0;">
                  <div style="font-family:Syne,sans-serif;font-size:12px;font-weight:900;color:#fff;
                    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(name)}</div>
                  <div style="font-size:9px;color:rgba(255,255,255,.3);margin-top:1px;">${_esc(last.secteur||'—')}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;margin-left:10px;">
                  <div style="font-family:Syne,sans-serif;font-size:22px;font-weight:900;
                    color:${col};line-height:1;">${score}</div>
                  <div style="font-size:8px;color:rgba(255,255,255,.3);">/100</div>
                </div>
              </div>

              <!-- Mini sparkline -->
              ${trend.length>1 ? _miniSpark(trend, col) : ''}

              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
                <span style="font-family:Syne,sans-serif;font-size:8px;font-weight:800;
                  letter-spacing:.08em;text-transform:uppercase;
                  padding:2px 8px;border-radius:100px;color:${col};background:${col}18;border:1px solid ${col}28;">
                  ${zone.l}
                </span>
                ${delta!==null ? `
                  <span style="font-family:Syne,sans-serif;font-size:10px;font-weight:900;
                    color:${delta>=0?P.em:P.ruby};">
                    ${delta>=0?'↑':'↓'} ${Math.abs(delta)} pts
                  </span>
                ` : `<span style="font-size:9px;color:rgba(255,255,255,.2);">${entries.length} analyse${entries.length>1?'s':''}</span>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function _miniSpark(scores, col) {
    const W=100, H=30, n=scores.length;
    if (n<2) return '';
    const mn=Math.min(...scores), mx=Math.max(...scores,mn+1);
    const xp=i=>i/(n-1)*W;
    const yp=v=>H-2-((v-mn)/(mx-mn))*(H-4);
    const pts=scores.map((s,i)=>`${xp(i)},${yp(s)}`).join(' ');
    return `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:30px;display:block;">
        <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
        <circle cx="${xp(n-1)}" cy="${yp(scores[n-1])}" r="2.5"
          fill="${col}" stroke="#02040B" stroke-width="1"/>
      </svg>
    `;
  }

  function select(name) {
    // Naviguer vers la dernière analyse de cette entreprise
    const all = window.S?.analyses || [];
    const a = all.filter(x=>(x.entreprise||x.id)===name).sort((a,b)=>_ts(b.createdAt)-_ts(a.createdAt))[0];
    if (a) {
      window.DS?.navTo?.('visualisations');
      if (window.DS?.loadAnalyse) window.DS.loadAnalyse(a);
    }
  }

  function inject() {
    const analysesView = document.getElementById('view-analyses');
    if (!analysesView || document.getElementById('portfolio-section')) return;

    const sec = document.createElement('div');
    sec.id='portfolio-section';
    sec.style.cssText='padding:0 24px 20px;';
    sec.innerHTML=`
      <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.18em;
        text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:12px;
        display:flex;align-items:center;gap:7px;">
        <i class="fa-solid fa-briefcase" style="color:#7DD3FC;"></i> Vue Portfolio
      </div>
      <div id="portfolio-wrap"></div>
    `;

    const inner = analysesView.querySelector('.view-inner');
    if (inner) inner.insertBefore(sec, inner.firstChild.nextSibling);
  }

  return { render, inject, select };
})();


// ════════════════════════════════════════════════════════════════
//  ⑨ DEBOUNCE GLOBAL — Inputs critiques
//     What-If simulator, filtres admin, recherche sidebar
// ════════════════════════════════════════════════════════════════
function _patchDebounce() {
  // What-If sliders — évite re-render à chaque pixel
  const patchWI = () => {
    document.querySelectorAll('#wi-grid input[type=range]').forEach(sl => {
      if (sl._dpatched) return;
      sl._dpatched = true;
      const orig = sl.oninput;
      const debounced = _debounce((e) => { if(orig) orig.call(sl,e); else sl.dispatchEvent(new Event('change')); }, 150);
      sl.addEventListener('input', debounced);
      sl.oninput = null;
    });
  };

  // Observer les changements DOM pour patcher les sliders dès leur apparition
  new MutationObserver(patchWI).observe(document.body, { childList:true, subtree:true });
  patchWI();
}


// ════════════════════════════════════════════════════════════════
//  ⑩ SERVICE WORKER — PWA Offline
//     Enregistre sw.js pour mise en cache des assets statiques
//     Le fichier sw.js doit être à la racine du projet
// ════════════════════════════════════════════════════════════════
function _registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js', { scope:'/' })
    .then(reg => {
      console.log('%c[PWA] Service Worker enregistré — scope:', 'color:#10b981', reg.scope);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state==='installed' && navigator.serviceWorker.controller) {
            ALERTS.push('🔄 Une mise à jour est disponible — <u onclick="location.reload()" style="cursor:pointer;">Recharger</u>', 'info');
          }
        });
      });
    })
    .catch(e => console.log('%c[PWA] SW non disponible (normal en dev):', 'color:rgba(255,255,255,.3)', e.message));
}


// ════════════════════════════════════════════════════════════════
//  ⑪ CSS GLOBAL — Tous les composants du module
// ════════════════════════════════════════════════════════════════
function _injectStyles() {
  if (document.getElementById('sup-styles')) return;
  const st = document.createElement('style');
  st.id='sup-styles';
  st.textContent=`

/* ══ Scatter ═══════════════════════════════════════ */
@keyframes scStarPulse {
  0%,100%{filter:drop-shadow(0 0 5px rgba(255,215,0,.7));}
  50%{filter:drop-shadow(0 0 14px rgba(255,215,0,1));}
}
#scatter-plot-wrap svg { user-select:none; }
#sc-tt { backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); }

/* ══ Onboarding ═══════════════════════════════════ */
@keyframes onbPulse {
  0%,100%{box-shadow:0 0 0 4000px rgba(2,4,11,.75),0 0 24px rgba(125,211,252,.4);}
  50%{box-shadow:0 0 0 4000px rgba(2,4,11,.75),0 0 40px rgba(125,211,252,.7);}
}
@keyframes onbFadeIn {
  from{opacity:0;transform:translateY(-8px) scale(.97);}
  to{opacity:1;transform:none;}
}
#onb-bubble button { transition:all .15s; }
#onb-bubble button:hover { filter:brightness(1.1); }

/* ══ Recherche globale ═══════════════════════════ */
#gs-input { caret-color:#7DD3FC; }
#gs-input::placeholder { color:rgba(255,255,255,.2); }
#gs-results::-webkit-scrollbar { width:3px; }
#gs-results::-webkit-scrollbar-thumb { background:rgba(125,211,252,.2);border-radius:2px; }
.gs-result { outline:none; }

/* ══ Raccourcis ══════════════════════════════════ */
#shortcuts-help::-webkit-scrollbar { width:3px; }
kbd { font-size:9px!important; }

/* ══ Annotations ═════════════════════════════════ */
#ann-modal input[type=date] { color-scheme:dark; }
#ann-modal textarea::placeholder { color:rgba(255,255,255,.2); }

/* ══ Portfolio ═══════════════════════════════════ */
#portfolio-wrap > div > div:hover { box-shadow:0 10px 40px rgba(0,0,0,.4); }

/* ══ Toast alertes ═══════════════════════════════ */
.sup-toast strong { color:#fff; }
.sup-toast u { color:inherit; }

/* ══ Améliorations globales ══════════════════════ */
::-webkit-scrollbar { width:4px; height:4px; }
::-webkit-scrollbar-track { background:rgba(255,255,255,.02); border-radius:2px; }
::-webkit-scrollbar-thumb { background:rgba(125,211,252,.18); border-radius:2px; }
::-webkit-scrollbar-thumb:hover { background:rgba(125,211,252,.32); }

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline:2px solid rgba(125,211,252,.45);
  outline-offset:2px;
}

.card { transition:border-color .2s, box-shadow .22s; }
.card:hover { border-color:rgba(125,211,252,.12); box-shadow:0 8px 32px rgba(0,0,0,.22); }

/* Skeleton loader */
.ds-skeleton {
  background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);
  background-size:200% 100%;
  animation:dsSkel 1.6s ease infinite;
  border-radius:8px;
}
@keyframes dsSkel {
  0%{background-position:200% 0;}
  100%{background-position:-200% 0;}
}

/* GPU compositing sur éléments animés */
.ring-svg, .nav-cube, #sc-svg, .adm-bar-fill, .pl-fill {
  will-change:transform;
  transform:translateZ(0);
}

/* Réduction mouvements accessibilité */
@media (prefers-reduced-motion:reduce) {
  *, *::before, *::after {
    animation-duration:.01ms!important;
    transition-duration:.01ms!important;
  }
}

/* Print */
@media print {
  #nav, #sidebar, #_tbar, #_cmod, #profile-drawer,
  #profile-drawer-overlay, .adm-root { display:none!important; }
  #main { position:static!important; overflow:visible!important; }
  .card { break-inside:avoid; }
}
  `;
  document.head.appendChild(st);
}


// ════════════════════════════════════════════════════════════════
//  DONNÉES DÉMO — Scatter visible immédiatement sans analyse
// ════════════════════════════════════════════════════════════════
const DEMO_CURRENT = {
  score: 67, failProb: 28,
  entreprise: 'Votre entreprise', secteur: 'Commerce de détail',
};
const DEMO_PEERS = [
  { score:82, failProb:12, entreprise:'Alpha Retail',      secteur:'Commerce de détail' },
  { score:74, failProb:22, entreprise:'Beta Distribution', secteur:'Commerce de détail' },
  { score:58, failProb:38, entreprise:'Gamma Trade',       secteur:'Commerce de détail' },
  { score:45, failProb:52, entreprise:'Delta Corp',        secteur:'Commerce de détail' },
  { score:91, failProb:6,  entreprise:'Epsilon Stores',    secteur:'Commerce de détail' },
  { score:33, failProb:65, entreprise:'Zeta Markets',      secteur:'Commerce de détail' },
  { score:78, failProb:18, entreprise:'Eta Logistics',     secteur:'Logistique & Transport' },
  { score:62, failProb:34, entreprise:'Theta Finance',     secteur:'Services financiers' },
  { score:55, failProb:44, entreprise:'Iota Industries',   secteur:'Industrie manufacturière' },
  { score:88, failProb:9,  entreprise:'Kappa Tech',        secteur:'Technologies' },
  { score:41, failProb:58, entreprise:'Lambda BTP',        secteur:'BTP & Construction' },
  { score:70, failProb:26, entreprise:'Mu Santé',          secteur:'Santé & Médical' },
  { score:95, failProb:3,  entreprise:'Nu Pharma',         secteur:'Santé & Médical' },
  { score:29, failProb:72, entreprise:'Xi Energy',         secteur:'Énergie & Utilities' },
  { score:66, failProb:31, entreprise:'Omicron Hotels',    secteur:'Hôtellerie & Restauration' },
];

// ════════════════════════════════════════════════════════════════
//  INIT PRINCIPAL
// ════════════════════════════════════════════════════════════════
function _init() {
  _injectStyles();
  SHORTCUTS.init();
  LAZY_THREE.init();
  _patchDebounce();
  _registerSW();

  // ── Scatter démo — rendu immédiat dès que le container existe ──
  // Exposer pour ds-views.js — render déclenché quand la vue est visible
  window._SCATTER_DEMO_CURRENT = DEMO_CURRENT;
  window._SCATTER_DEMO_PEERS   = DEMO_PEERS;
  window._SCATTER_RENDER       = SCATTER.render;

  // ── Attendre S.profile pour les fonctionnalités authentifiées ──
  let attempts = 0;
  const wait = setInterval(() => {
    attempts++;
    if (attempts > 50) { clearInterval(wait); return; }

    const uid = window.S?.uid || window.S?.profile?.uid;
    if (!uid) return;
    clearInterval(wait);

    ALERTS.start(uid);
    ONBOARDING.checkAndStart(uid);

    setTimeout(() => {
      PORTFOLIO.inject();
      const analyses = window.S?.analyses || [];
      if (analyses.length) PORTFOLIO.render(analyses);
    }, 800);

    // ── Hook DS.loadAnalyse — remplace démo par données réelles ──
    const origLoad = window.DS?.loadAnalyse;
    if (origLoad && !window.DS?._supPatched) {
      window.DS._supPatched = true;
      window.DS.loadAnalyse = function(analyse) {
        origLoad.call(window.DS, analyse);

        setTimeout(() => {
          // Marquer comme données réelles + mettre à jour UI
          const wrap = document.getElementById('scatter-plot-wrap');
          if (wrap) wrap.dataset.real = '1';
          const demoBadge = document.getElementById('sc-demo-badge');
          if (demoBadge) demoBadge.style.display = 'none';
          const tag = document.getElementById('sc-sector-tag');
          if (tag) { tag.textContent = analyse.secteur||''; tag.style.display=''; }

          // Peers depuis toutes les analyses de l'utilisateur
          const allA = window.S?.analyses||[];
          const peers = allA.filter(a=>a.id!==analyse.id&&a.score!=null).map(a=>({
            score:      a.score||0,
            failProb:   a.failProb||a.probabiliteDefaut||(100-(a.score||0)),
            entreprise: a.entreprise||'—',
            secteur:    a.secteur||'—',
          }));

          SCATTER.render({
            score:      analyse.score||0,
            failProb:   analyse.failProb||analyse.probabiliteDefaut||(100-(analyse.score||0)),
            entreprise: analyse.entreprise||'—',
            secteur:    analyse.secteur||'—',
          }, peers);
        }, 400);

        ANNOTATIONS.init(analyse.id, analyse.annotations||[]);
        setTimeout(() => ANNOTATIONS._renderAnnotations(), 600);

        const analyses = window.S?.analyses||[];
        if (analyses.length) PORTFOLIO.render(analyses);
      };
    }

    console.log('%c[SUPPLEMENT] ✓ Tous les modules actifs', 'color:#EC4899;font-weight:bold;font-size:12px');

  }, 300);
}

// Démarrer
if (document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}


// ════════════════════════════════════════════════════════════════
//  API PUBLIQUE
// ════════════════════════════════════════════════════════════════
window.DS_SUPPLEMENT = {
  scatter:     { render: SCATTER.render, inject: SCATTER.inject, filter: SCATTER.filter, exportPNG: SCATTER.exportPNG },
  alerts:      ALERTS,
  onboarding:  ONBOARDING,
  shortcuts:   SHORTCUTS,
  search:      SEARCH,
  portfolio:   PORTFOLIO,
  annotations: ANNOTATIONS,

  // Ré-exposer pour compatibilité dashboard-extra.js
  renderScatter: (analyse, allAnalyses) => {
    SCATTER.inject();
    const peers = (allAnalyses||[]).filter(a=>a.id!==analyse?.id&&a.score!=null).map(a=>({
      score:a.score||0, failProb:a.failProb||(100-(a.score||0)),
      entreprise:a.entreprise||'—', secteur:a.secteur||'—',
    }));
    SCATTER.render({
      score:analyse?.score||0,
      failProb:analyse?.failProb||(100-(analyse?.score||0)),
      entreprise:analyse?.entreprise||'—',
      secteur:analyse?.secteur||'—',
    }, peers);
  },
};

console.log('%c[SUPPLEMENT.JS] ✓ Module complet chargé — 11 fonctionnalités actives', 'color:#FFD700;font-weight:bold;font-size:11px');
