// ════════════════════════════════════════════════════════════════
//  dashboard-charts-advanced.js  —  Doctor Smile  v1
//  6 graphes analytiques haute crédibilité  —  Three.js r128
//
//  ① render3DSpeedometer      Compteur vitesse 3D (score santé)
//  ② render3DFRBFR            Fonds Roulement / BFR / Trésorerie
//  ③ render3DScoreCard        Score Card multi-piliers pondéré
//  ④ render3DRiskMatrix       Matrice Probabilité × Impact
//  ⑤ render3DTornado          Analyse de sensibilité (Tornado)
//  ⑥ render3DAltmanZ          Décomposition Altman Z (5 variables)
//
//  Dépend de : window.THREE (r128)  ·  helpers _cleanEl / _chatBtn
//              importés depuis dashboard-extra.js
// ════════════════════════════════════════════════════════════════

// ── Palette centrale Doctor Smile ──────────────────────────────
var _AC = {
  bg:      0x02040B, navy:   0x0C1628, blue:   0x0369A1,
  ice:     0x7DD3FC, gold:   0xFFD700, amber:  0xF59E0B,
  green:   0x10B981, teal:   0x0F766E, red:    0xEF4444,
  orange:  0xF97316, violet:0x8B5CF6, purple: 0xA78BFA,
  white:   0xFFFFFF, gray:   0x334155,
};
var _ZC = { saine:0x10B981, vigilance:0xF59E0B, risque:0xF97316, critique:0xEF4444 };
var _ZN = { saine:'#10b981', vigilance:'#f59e0b', risque:'#f97316', critique:'#ef4444' };

// Helpers internes (évite de dépendre de dashboard-extra au moment de l'exécution)
function _adv_clean(id) {
  var el = document.getElementById(id); if (!el) return null;
  if (el._dsCleanup) { try { el._dsCleanup(); } catch(e) {} delete el._dsCleanup; }
  el.innerHTML = ''; return el;
}
function _adv_chat(el, prompt) {
  if (window._chatBtn) { _chatBtn(el, prompt); return; }
  if (window.DS_EXTRA && window.DS_EXTRA._chatBtn) window.DS_EXTRA._chatBtn(el, prompt);
}
function _adv_retry(fn, args, ms) {
  setTimeout(function() { fn.apply(null, args); }, ms || 300);
}
function _adv_initScene(el, fov, near, far) {
  var T = window.THREE; if (!T) return null;
  var W = el.clientWidth || 300, H = el.clientHeight || 220;
  if (W < 10) return null;
  var sc  = new T.Scene();
  var cam = new T.PerspectiveCamera(fov || 45, W / H, near || 0.1, far || 200);
  var ren = new T.WebGLRenderer({ antialias: true, alpha: true });
  ren.setSize(W, H);
  ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  ren.setClearColor(0, 0);
  ren.shadowMap.enabled = true;
  el.appendChild(ren.domElement);
  return { T: T, sc: sc, cam: cam, ren: ren, W: W, H: H };
}


// ════════════════════════════════════════════════════════════════
//  ①  COMPTEUR VITESSE 3D  — Speedometer
//     Score santé 0→100 avec aiguille animée, zones colorées,
//     halo lumineux, particules orbitales
// ════════════════════════════════════════════════════════════════
function render3DSpeedometer(cid, score, zone, label) {
  var T = window.THREE;
  if (!T) { _adv_retry(render3DSpeedometer, [cid, score, zone, label]); return; }
  var el = _adv_clean(cid); if (!el) return;
  var W = el.clientWidth || 300, H = el.clientHeight || 240;
  if (W < 10) { _adv_retry(render3DSpeedometer, [cid, score, zone, label]); return; }

  var s = _adv_initScene(el, 50, 0.1, 100); if (!s) return;
  var sc = s.sc, cam = s.cam, ren = s.ren;

  cam.position.set(0, 0.8, 5.5);
  cam.lookAt(0, 0, 0);

  // Lumières
  sc.add(new T.AmbientLight(0xffffff, 0.4));
  var sun = new T.DirectionalLight(0x7DD3FC, 2.2); sun.position.set(4, 8, 5); sc.add(sun);
  var fill = new T.PointLight(0xFFD700, 1.8, 14); fill.position.set(-3, 2, 3); sc.add(fill);
  var rim  = new T.PointLight(_ZC[zone] || 0xF59E0B, 3.0, 10); rim.position.set(0, -1, -3); sc.add(rim);

  var zoneCol = _ZC[zone] || 0xF59E0B;

  // ── Arc de fond (demi-cercle complet) ──────────────────────
  function makeArc(r, thick, a0, a1, col, opacity) {
    var pts = [], seg = 80;
    for (var i = 0; i <= seg; i++) {
      var a = a0 + (a1 - a0) * (i / seg);
      pts.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    var g = new T.TubeGeometry(new T.CatmullRomCurve3(pts), seg, thick, 12, false);
    var m = new T.MeshPhongMaterial({ color: col, shininess: 160,
      transparent: opacity < 1, opacity: opacity || 1 });
    return new T.Mesh(g, m);
  }

  // Zones colorées : critique→risque→vigilance→saine
  var PI = Math.PI;
  var zones_arcs = [
    { a0: PI,        a1: PI*1.25, col: 0xEF4444, label: '0' },   // Critique
    { a0: PI*1.25,   a1: PI*1.50, col: 0xF97316, label: '25' },  // Risque
    { a0: PI*1.50,   a1: PI*1.75, col: 0xF59E0B, label: '50' },  // Vigilance
    { a0: PI*1.75,   a1: PI*2.0,  col: 0x10B981, label: '75' },  // Saine
  ];
  zones_arcs.forEach(function(z) { sc.add(makeArc(1.6, 0.13, z.a0, z.a1, z.col, 0.85)); });

  // Arc de fond sombre
  sc.add(makeArc(1.6, 0.13, PI, PI * 2, 0x0D1A2E, 0.9));
  // Contour lumineux selon zone
  sc.add(makeArc(1.62, 0.016, PI, PI + (score / 100) * PI, zoneCol, 1.0));

  // ── Ticks (graduations) ────────────────────────────────────
  for (var t = 0; t <= 10; t++) {
    var ang = PI + (t / 10) * PI;
    var isMajor = t % 5 === 0;
    var len = isMajor ? 0.22 : 0.12;
    var thick2 = isMajor ? 0.025 : 0.012;
    var r0 = 1.45, r1 = r0 - len;
    var pts2 = [
      new T.Vector3(Math.cos(ang) * r0, Math.sin(ang) * r0, 0),
      new T.Vector3(Math.cos(ang) * r1, Math.sin(ang) * r1, 0),
    ];
    var tg = new T.TubeGeometry(new T.CatmullRomCurve3(pts2), 2, thick2, 6, false);
    var col2 = isMajor ? 0xFFFFFF : 0x334155;
    sc.add(new T.Mesh(tg, new T.MeshPhongMaterial({ color: col2, shininess: 80 })));
  }

  // ── Corps central (disque) ─────────────────────────────────
  var diskG = new T.CylinderGeometry(0.52, 0.52, 0.12, 48);
  var diskM = new T.MeshPhongMaterial({ color: 0x0C1628, shininess: 220,
    specular: new T.Color(0x7DD3FC) });
  var disk = new T.Mesh(diskG, diskM);
  disk.rotation.x = PI / 2; sc.add(disk);

  // ── Aiguille ───────────────────────────────────────────────
  var needleAngle = PI + (score / 100) * PI;
  var needleLen = 1.25;
  var nPts = [
    new T.Vector3(0, 0, 0.07),
    new T.Vector3(Math.cos(needleAngle) * needleLen, Math.sin(needleAngle) * needleLen, 0.07),
  ];
  var nG = new T.TubeGeometry(new T.CatmullRomCurve3(nPts), 8, 0.038, 8, false);
  var nM = new T.MeshPhongMaterial({ color: 0xFFFFFF, shininess: 400,
    emissive: new T.Color(zoneCol), emissiveIntensity: 0.6 });
  var needle = new T.Mesh(nG, nM); sc.add(needle);

  // Bulbe de l'aiguille
  var bulb = new T.Mesh(new T.SphereGeometry(0.10, 20, 20),
    new T.MeshPhongMaterial({ color: zoneCol, shininess: 300,
      emissive: new T.Color(zoneCol), emissiveIntensity: 0.5 }));
  bulb.position.z = 0.07; sc.add(bulb);

  // ── Halo lumineux pulsant ──────────────────────────────────
  var haloG = new T.SphereGeometry(0.38, 24, 24);
  var haloM = new T.MeshBasicMaterial({ color: zoneCol, transparent: true, opacity: 0.08,
    side: T.BackSide });
  var halo = new T.Mesh(haloG, haloM); sc.add(halo);

  // ── Particules orbitales ───────────────────────────────────
  var parts = [], nPart = 14;
  for (var i = 0; i < nPart; i++) {
    var pG = new T.SphereGeometry(0.028, 6, 6);
    var pM = new T.MeshBasicMaterial({ color: i % 2 === 0 ? _AC.gold : _AC.ice,
      transparent: true, opacity: 0.7 });
    var p = new T.Mesh(pG, pM);
    p._angle  = (i / nPart) * PI * 2;
    p._radius = 1.85 + (i % 3) * 0.14;
    p._speed  = 0.008 + i * 0.001;
    p._z      = (Math.random() - 0.5) * 0.5;
    sc.add(p); parts.push(p);
  }

  // ── Animation ──────────────────────────────────────────────
  var frame, t = 0, targetAngle = needleAngle;
  var currentAngle = PI; // Démarrer à 0
  function anim() {
    frame = requestAnimationFrame(anim); t += 0.016;
    // Aiguille animée du 0 vers la valeur cible
    currentAngle += (targetAngle - currentAngle) * 0.04;
    needle.rotation.z = currentAngle - needleAngle;

    // Halo pulsant
    var pulse = 0.08 + Math.sin(t * 2.2) * 0.04;
    haloM.opacity = pulse;
    var hs = 1.0 + Math.sin(t * 1.8) * 0.08;
    halo.scale.set(hs, hs, hs);

    // Particules
    parts.forEach(function(p) {
      p._angle += p._speed;
      p.position.set(
        Math.cos(p._angle) * p._radius,
        Math.sin(p._angle) * p._radius * 0.5,
        p._z + Math.sin(t + p._angle) * 0.12
      );
      p.material.opacity = 0.4 + Math.sin(t * 2 + p._angle) * 0.3;
    });

    // Légère oscillation caméra
    cam.position.x = Math.sin(t * 0.18) * 0.25;
    cam.position.y = 0.8 + Math.cos(t * 0.14) * 0.1;
    cam.lookAt(0, 0, 0);
    ren.render(sc, cam);
  }
  anim();

  // Label HTML superposé
  var lbl = document.createElement('div');
  lbl.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);' +
    'text-align:center;pointer-events:none;';
  lbl.innerHTML =
    '<div style="font-family:Syne,sans-serif;font-size:28px;font-weight:900;' +
      'color:' + (_ZN[zone] || '#f59e0b') + ';line-height:1;">' + score + '</div>' +
    '<div style="font-size:8px;color:rgba(255,255,255,.35);letter-spacing:.12em;margin-top:2px;">' +
      (label || '/100 · SANTÉ FINANCIÈRE') + '</div>';
  el.style.position = 'relative';
  el.appendChild(lbl);

  el._dsCleanup = function() { cancelAnimationFrame(frame); ren.dispose(); };
  _adv_chat(el, 'Compteur de santé financière : score ' + score + '/100 en zone ' + zone +
    '. Explique ce niveau global et les 3 priorités immédiates.');
}


// ════════════════════════════════════════════════════════════════
//  ②  FR / BFR / TRÉSORERIE  — Blocs empilés 3D flottants
//     Fonds de Roulement · Besoin en Fonds de Roulement · TN
//     avec halo, label, flèches de flux et annotation
// ════════════════════════════════════════════════════════════════
function render3DFRBFR(cid, ratios, score, zone) {
  var T = window.THREE;
  if (!T) { _adv_retry(render3DFRBFR, [cid, ratios, score, zone]); return; }
  var el = _adv_clean(cid); if (!el) return;
  var W = el.clientWidth || 340, H = el.clientHeight || 230;
  if (W < 10) { _adv_retry(render3DFRBFR, [cid, ratios, score, zone]); return; }

  // ── Extraire les valeurs depuis les ratios ─────────────────
  function getVal(names, defaultVal) {
    if (!ratios) return defaultVal;
    for (var i = 0; i < ratios.length; i++) {
      var n = (ratios[i].n || ratios[i].name || '').toLowerCase();
      for (var j = 0; j < names.length; j++) {
        if (n.indexOf(names[j].toLowerCase()) > -1) {
          return parseFloat(ratios[i].v || ratios[i].value || defaultVal);
        }
      }
    }
    return defaultVal;
  }

  var liq    = getVal(['liquidité générale', 'current ratio', 'liquidite'], 1.2);
  var bfrRaw = getVal(['bfr', 'working capital', 'bfr / ca'], 25);
  var treso  = getVal(['trésorerie', 'cash ratio', 'ratio trésorerie'], 0.15);

  // Normaliser en hauteurs relatives (0.3 → 2.5)
  var frH  = Math.max(0.3, Math.min(2.8, liq    * 0.9));
  var bfrH = Math.max(0.2, Math.min(2.4, bfrRaw * 0.035));
  var tnH  = Math.max(0.2, Math.min(2.2, treso  * 4.5));

  var s = _adv_initScene(el, 42, 0.1, 200); if (!s) return;
  var sc = s.sc, cam = s.cam, ren = s.ren;

  cam.position.set(-1.5, 3.5, 8);
  cam.lookAt(0, 0.5, 0);

  // Lumières
  sc.add(new T.AmbientLight(0xffffff, 0.45));
  var d1 = new T.DirectionalLight(0x7DD3FC, 2.0); d1.position.set(5, 8, 5); sc.add(d1);
  var d2 = new T.DirectionalLight(0xFFD700, 1.2); d2.position.set(-5, 4, -3); sc.add(d2);
  var d3 = new T.PointLight(0xA78BFA, 1.5, 15); d3.position.set(0, 5, 2); sc.add(d3);

  // Sol réflecteur
  var floor = new T.Mesh(
    new T.PlaneGeometry(12, 10),
    new T.MeshPhongMaterial({ color: 0x020812, shininess: 30,
      transparent: true, opacity: 0.5 })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.05;
  sc.add(floor);

  // ── Fonction bloc 3D avec halo et reflet ──────────────────
  function makeBlock(x, height, color, emColor, label) {
    var grp = new T.Group();
    var depth = 1.1, width = 1.5;

    // Corps principal
    var bG = new T.BoxGeometry(width, height, depth);
    var bM = new T.MeshPhongMaterial({
      color: color, shininess: 120,
      emissive: new T.Color(emColor), emissiveIntensity: 0.15,
      transparent: true, opacity: 0.92,
    });
    var box = new T.Mesh(bG, bM);
    box.position.set(0, height / 2, 0);
    box.castShadow = true;
    grp.add(box);

    // Cap brillant supérieur
    var capG = new T.BoxGeometry(width, 0.06, depth);
    var capM = new T.MeshPhongMaterial({ color: 0xffffff, shininess: 400,
      transparent: true, opacity: 0.35 });
    var cap = new T.Mesh(capG, capM);
    cap.position.set(0, height + 0.03, 0);
    grp.add(cap);

    // Halo lumineux
    var hG = new T.BoxGeometry(width + 0.25, height + 0.25, depth + 0.25);
    var hM = new T.MeshBasicMaterial({ color: color,
      transparent: true, opacity: 0.06, side: T.BackSide });
    var h = new T.Mesh(hG, hM);
    h.position.set(0, height / 2, 0);
    grp.add(h);

    // Lignes de bord lumineux
    var edgeG = new T.EdgesGeometry(new T.BoxGeometry(width + 0.01, height + 0.01, depth + 0.01));
    var edgeM = new T.LineBasicMaterial({ color: color, transparent: true, opacity: 0.4 });
    var edges = new T.LineSegments(edgeG, edgeM);
    edges.position.set(0, height / 2, 0);
    grp.add(edges);

    grp.position.x = x;
    return { grp: grp, box: box, h: h, height: height, color: color };
  }

  var GAP = 2.2;
  var fr  = makeBlock(-GAP, frH,  0x0EA5E9, 0x38BDF8, 'FR');
  var bfr = makeBlock(0,    bfrH, 0xF59E0B, 0xFBBF24, 'BFR');
  var tn  = makeBlock(GAP,  tnH,  0x10B981, 0x34D399, 'TN');

  [fr, bfr, tn].forEach(function(b) { sc.add(b.grp); });

  // ── HTML overlay avec labels et valeurs ───────────────────
  el.style.position = 'relative';
  var info = document.createElement('div');
  info.style.cssText = 'position:absolute;bottom:10px;left:0;right:0;' +
    'display:flex;justify-content:space-around;pointer-events:none;padding:0 8px;';
  var labels = [
    { name: 'Fonds de Roulement', val: liq.toFixed(2),  col: '#38BDF8', unit: 'x' },
    { name: 'Besoin FR',          val: bfrRaw.toFixed(1),col: '#F59E0B', unit: '%CA' },
    { name: 'Trésorerie Nette',   val: treso.toFixed(2), col: '#10B981', unit: 'x' },
  ];
  info.innerHTML = labels.map(function(l) {
    return '<div style="text-align:center;">' +
      '<div style="font-family:Syne,sans-serif;font-size:9px;font-weight:900;color:' +
        l.col + ';">' + l.val + l.unit + '</div>' +
      '<div style="font-size:7.5px;color:rgba(255,255,255,.3);letter-spacing:.04em;">' +
        l.name.toUpperCase() + '</div></div>';
  }).join('');
  el.appendChild(info);

  // ── Animation ──────────────────────────────────────────────
  var frame, t = 0;
  function anim() {
    frame = requestAnimationFrame(anim); t += 0.014;
    // Flottement doux des blocs
    fr.grp.position.y  = Math.sin(t * 0.8)  * 0.06;
    bfr.grp.position.y = Math.sin(t * 0.9 + 1) * 0.06;
    tn.grp.position.y  = Math.sin(t * 0.7 + 2) * 0.06;
    // Halo pulsant
    [fr, bfr, tn].forEach(function(b, i) {
      b.h.material.opacity = 0.05 + Math.sin(t * 1.5 + i) * 0.03;
    });
    // Rotation caméra lente
    var cx = Math.sin(t * 0.12) * 1.5 - 1.5;
    cam.position.x = cx;
    cam.lookAt(0, 0.5, 0);
    ren.render(sc, cam);
  }
  anim();

  el._dsCleanup = function() { cancelAnimationFrame(frame); ren.dispose(); };
  _adv_chat(el, 'FR=' + liq.toFixed(2) + ' · BFR/CA=' + bfrRaw.toFixed(1) + '% · TN=' +
    treso.toFixed(2) + '. Explique l\'équilibre du cycle d\'exploitation et les risques de liquidité.');
}


// ════════════════════════════════════════════════════════════════
//  ③  SCORE CARD 3D  — Piliers pondérés extrudés
//     5 piliers : Liquidité · Rentabilité · Solvabilité
//                 Activité · Structure
//     Colonnes hexagonales extrudées, hauteur = score pondéré
// ════════════════════════════════════════════════════════════════
function render3DScoreCard(cid, ratios, score, zone) {
  var T = window.THREE;
  if (!T) { _adv_retry(render3DScoreCard, [cid, ratios, score, zone]); return; }
  var el = _adv_clean(cid); if (!el) return;
  var W = el.clientWidth || 340, H = el.clientHeight || 230;
  if (W < 10) { _adv_retry(render3DScoreCard, [cid, ratios, score, zone]); return; }

  // ── Calculer les piliers depuis les ratios ─────────────────
  var r = ratios || [];
  function pilier(names) {
    var sum = 0, count = 0;
    r.forEach(function(rt) {
      var n = (rt.n || rt.name || '').toLowerCase();
      names.forEach(function(nm) {
        if (n.indexOf(nm) > -1) { sum += parseFloat(rt.p || rt.score || 50); count++; }
      });
    });
    return count > 0 ? Math.min(100, sum / count) : score || 50;
  }

  var pillars = [
    { name: 'Liquidité',    score: pilier(['liquid', 'trésor', 'cash']),    col: 0x0EA5E9, em: 0x38BDF8 },
    { name: 'Rentabilité',  score: pilier(['roa', 'roe', 'marge', 'ebitda']),col: 0xF59E0B, em: 0xFBBF24 },
    { name: 'Solvabilité',  score: pilier(['solvab', 'endett', 'debt']),     col: 0x8B5CF6, em: 0xA78BFA },
    { name: 'Activité',     score: pilier(['rotation', 'bfr', 'couvert']),   col: 0x10B981, em: 0x34D399 },
    { name: 'Structure',    score: pilier(['altman', 'retained', 'capital']),col: 0xF97316, em: 0xFB923C },
  ];

  var s = _adv_initScene(el, 40, 0.1, 200); if (!s) return;
  var sc = s.sc, cam = s.cam, ren = s.ren;

  cam.position.set(0, 4.5, 9.5);
  cam.lookAt(0, 0.5, 0);

  // Lumières
  sc.add(new T.AmbientLight(0xffffff, 0.4));
  var d1 = new T.DirectionalLight(0x7DD3FC, 2.0); d1.position.set(6, 10, 6); sc.add(d1);
  var d2 = new T.DirectionalLight(0xFFD700, 1.0); d2.position.set(-6, 5, -3); sc.add(d2);

  // Grille de fond
  var gridHelper = new T.GridHelper(12, 12, 0x0D1A2E, 0x0D1A2E);
  gridHelper.position.y = 0; sc.add(gridHelper);

  // Sol
  sc.add(new T.Mesh(
    new T.PlaneGeometry(14, 8),
    new T.MeshPhongMaterial({ color: 0x020812, shininess: 20, transparent: true, opacity: 0.6 })
  ));

  var GAP = 2.4, startX = -(pillars.length - 1) * GAP / 2;

  // Ligne objectif (75)
  var lineG = new T.BoxGeometry(pillars.length * GAP + 0.5, 0.05, 0.8);
  var lineM = new T.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.7 });
  var line = new T.Mesh(lineG, lineM);
  line.position.set(0, 2.6, 0); sc.add(line); // 75/100 * 3.5 max ≈ 2.62

  pillars.forEach(function(p, i) {
    var x = startX + i * GAP;
    var h = Math.max(0.15, (p.score / 100) * 3.5);

    // Colonne hexagonale extrudée
    var shape = new T.Shape();
    var R = 0.72, sides = 6;
    for (var k = 0; k < sides; k++) {
      var a = (k / sides) * Math.PI * 2;
      if (k === 0) shape.moveTo(Math.cos(a) * R, Math.sin(a) * R);
      else          shape.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    shape.closePath();

    var extrudeSettings = { depth: h, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 };
    var geo = new T.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(-Math.PI / 2);

    var mat = new T.MeshPhongMaterial({
      color: p.col, shininess: 140,
      emissive: new T.Color(p.em), emissiveIntensity: 0.15,
      transparent: true, opacity: 0.9,
    });
    var mesh = new T.Mesh(geo, mat);
    mesh.position.set(x, 0, 0.55); sc.add(mesh);

    // Cap
    var capShape = shape.clone();
    var capGeo = new T.ExtrudeGeometry(capShape, { depth: 0.05, bevelEnabled: false });
    capGeo.rotateX(-Math.PI / 2);
    var capMat = new T.MeshPhongMaterial({ color: 0xffffff, shininess: 500,
      transparent: true, opacity: 0.35 });
    var capMesh = new T.Mesh(capGeo, capMat);
    capMesh.position.set(x, h, 0.55); sc.add(capMesh);

    // Halo
    var hGeo = new T.BoxGeometry(1.6, h + 0.3, 1.6);
    var hMat = new T.MeshBasicMaterial({ color: p.col,
      transparent: true, opacity: 0.05, side: T.BackSide });
    var hMesh = new T.Mesh(hGeo, hMat);
    hMesh.position.set(x, h / 2, 0); sc.add(hMesh);

    // Indicateur score
    var ptLight = new T.PointLight(p.col, 1.2, 4);
    ptLight.position.set(x, h + 0.5, 0); sc.add(ptLight);
  });

  // ── HTML labels bas ───────────────────────────────────────
  el.style.position = 'relative';
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;bottom:8px;left:0;right:0;' +
    'display:flex;justify-content:space-around;pointer-events:none;';
  overlay.innerHTML = pillars.map(function(p) {
    var col = _ZN[p.score >= 75 ? 'saine' : p.score >= 50 ? 'vigilance' : p.score >= 25 ? 'risque' : 'critique'];
    return '<div style="text-align:center;">' +
      '<div style="font-family:Syne,sans-serif;font-size:10px;font-weight:900;color:' + col + ';">' +
        Math.round(p.score) + '</div>' +
      '<div style="font-size:7px;color:rgba(255,255,255,.28);letter-spacing:.04em;">' +
        p.name.toUpperCase() + '</div></div>';
  }).join('');
  el.appendChild(overlay);

  // ── Animation ──────────────────────────────────────────────
  var frame, t = 0;
  function anim() {
    frame = requestAnimationFrame(anim); t += 0.012;
    var cx = Math.sin(t * 0.15) * 2.5;
    var cz = 9.5 + Math.cos(t * 0.10) * 0.8;
    cam.position.set(cx, 4.5, cz);
    cam.lookAt(0, 0.5, 0);
    line.position.y = 2.6 + Math.sin(t * 2) * 0.015;
    ren.render(sc, cam);
  }
  anim();

  el._dsCleanup = function() { cancelAnimationFrame(frame); ren.dispose(); };
  _adv_chat(el, 'Score Card 5 piliers : ' +
    pillars.map(function(p) { return p.name + '=' + Math.round(p.score) + '/100'; }).join(', ') +
    '. Ligne dorée = objectif 75. Quels piliers sont sous la cible et comment les améliorer ?');
}


// ════════════════════════════════════════════════════════════════
//  ④  MATRICE DE RISQUE 3D  — Grille Probabilité × Impact
//     4×4 cubes colorés en intensité, avec ratios positionnés
//     Rotation douce, labels HTML, cubes lumineux
// ════════════════════════════════════════════════════════════════
function render3DRiskMatrix(cid, ratios, score, zone) {
  var T = window.THREE;
  if (!T) { _adv_retry(render3DRiskMatrix, [cid, ratios, score, zone]); return; }
  var el = _adv_clean(cid); if (!el) return;
  var W = el.clientWidth || 340, H = el.clientHeight || 230;
  if (W < 10) { _adv_retry(render3DRiskMatrix, [cid, ratios, score, zone]); return; }

  var s = _adv_initScene(el, 42, 0.1, 200); if (!s) return;
  var sc = s.sc, cam = s.cam, ren = s.ren;

  cam.position.set(3.5, 5.5, 8.5);
  cam.lookAt(1.5, 0, 1.5);

  // Lumières
  sc.add(new T.AmbientLight(0xffffff, 0.4));
  var d1 = new T.DirectionalLight(0x7DD3FC, 1.8); d1.position.set(8, 12, 8); sc.add(d1);
  var d2 = new T.DirectionalLight(0xFFD700, 0.8); d2.position.set(-5, 4, -3); sc.add(d2);

  // ── Matrice 4×4 : probabilité (x) × impact (z) ────────────
  var SIZE = 4;
  var RISK_COLOR = function(prob, impact) {
    var score = prob * impact;
    if (score >= 12) return 0xEF4444;      // Critique
    if (score >= 8)  return 0xF97316;      // Risque
    if (score >= 4)  return 0xF59E0B;      // Vigilance
    return 0x10B981;                        // Saine
  };

  var group = new T.Group();
  var GAP = 1.05;

  for (var px = 0; px < SIZE; px++) {
    for (var iz = 0; iz < SIZE; iz++) {
      var prob = px + 1, impact = iz + 1;
      var col = RISK_COLOR(prob, impact);
      var cellH = 0.08 + (prob * impact / 20) * 0.35;

      var g = new T.BoxGeometry(0.88, cellH, 0.88);
      var m = new T.MeshPhongMaterial({
        color: col, shininess: 120,
        emissive: new T.Color(col), emissiveIntensity: 0.12,
        transparent: true, opacity: 0.85,
      });
      var cube = new T.Mesh(g, m);
      cube.position.set(px * GAP, cellH / 2, iz * GAP);
      group.add(cube);

      // Cap brillant
      var cg = new T.BoxGeometry(0.88, 0.04, 0.88);
      var cm = new T.MeshPhongMaterial({ color: 0xffffff, shininess: 400,
        transparent: true, opacity: 0.28 });
      var cap = new T.Mesh(cg, cm);
      cap.position.set(px * GAP, cellH + 0.02, iz * GAP);
      group.add(cap);
    }
  }
  sc.add(group);

  // ── Positionner les ratios comme points 3D ────────────────
  var r = ratios || [];
  var positioned = [];
  r.slice(0, 6).forEach(function(rt, i) {
    var sc_r = parseFloat(rt.p || rt.score || 50);
    var prob   = Math.min(3.9, Math.max(0.1, (100 - sc_r) / 28));
    var impact = Math.min(3.9, Math.max(0.1, (100 - sc_r) / 22 + i * 0.3));

    var pG = new T.SphereGeometry(0.16, 12, 12);
    var pM = new T.MeshPhongMaterial({ color: 0xFFFFFF, shininess: 400,
      emissive: new T.Color(0xFFD700), emissiveIntensity: 0.6 });
    var pt = new T.Mesh(pG, pM);
    var px2 = prob * GAP, iz2 = impact * GAP;
    var h = 0.08 + (prob * impact / 20) * 0.35 + 0.25;
    pt.position.set(px2, h, iz2);
    sc.add(pt);
    positioned.push({ mesh: pt, px: px2, iz: iz2, h: h, name: (rt.n || '').slice(0, 8), i: i });
  });

  // ── Sol avec grille ────────────────────────────────────────
  var grid = new T.GridHelper(SIZE * GAP + 0.5, SIZE, 0x1E3A5F, 0x0D1A2E);
  grid.position.set((SIZE - 1) * GAP / 2, -0.01, (SIZE - 1) * GAP / 2);
  sc.add(grid);

  // ── Animation ──────────────────────────────────────────────
  var frame, t = 0;
  function anim() {
    frame = requestAnimationFrame(anim); t += 0.013;
    // Rotation lente autour du centre
    group.rotation.y = Math.sin(t * 0.08) * 0.15;
    // Points clignotants
    positioned.forEach(function(p, i) {
      var sc2 = 1.0 + Math.sin(t * 2.5 + i) * 0.15;
      p.mesh.scale.set(sc2, sc2, sc2);
      p.mesh.material.emissiveIntensity = 0.4 + Math.sin(t * 2 + i) * 0.3;
    });
    // Caméra orbitale
    cam.position.x = 3.5 + Math.sin(t * 0.1) * 1.0;
    cam.position.z = 8.5 + Math.cos(t * 0.08) * 0.8;
    cam.lookAt(1.5, 0, 1.5);
    ren.render(sc, cam);
  }
  anim();

  // Labels HTML axe X/Z
  el.style.position = 'relative';
  var axeX = document.createElement('div');
  axeX.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);' +
    'font-family:Syne,sans-serif;font-size:7.5px;color:rgba(255,255,255,.3);letter-spacing:.08em;';
  axeX.textContent = '← PROBABILITÉ FAIBLE · · · · PROBABILITÉ ÉLEVÉE →';
  el.appendChild(axeX);

  el._dsCleanup = function() { cancelAnimationFrame(frame); ren.dispose(); };
  _adv_chat(el, 'Matrice de risque 4×4 (probabilité × impact). Score global ' + score +
    '/100. Les points blancs = vos ratios positionnés. Quels risques sont en zone critique ?');
}


// ════════════════════════════════════════════════════════════════
//  ⑤  TORNADO CHART 3D  — Sensibilité du score
//     Barres 3D bidirectionnelles : impact +10% / -10% de chaque ratio
//     Dégradé vert→rouge selon l'impact
// ════════════════════════════════════════════════════════════════
function render3DTornado(cid, ratios, score, zone) {
  var T = window.THREE;
  if (!T) { _adv_retry(render3DTornado, [cid, ratios, score, zone]); return; }
  var el = _adv_clean(cid); if (!el) return;
  var W = el.clientWidth || 340, H = el.clientHeight || 240;
  if (W < 10) { _adv_retry(render3DTornado, [cid, ratios, score, zone]); return; }

  var r = ratios || [];
  if (!r.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.2);">Ratios insuffisants</div>';
    return;
  }

  // Calculer la sensibilité : score pondéré du ratio × facteur d'importance
  var FACTORS = {
    'liquid': 1.35, 'current': 1.35, 'trésor': 1.2,
    'dette': 1.4, 'debt': 1.4, 'endett': 1.4, 'solvab': 1.3,
    'roa': 1.25, 'roe': 1.2, 'marge': 1.15, 'ebitda': 1.2,
    'rotation': 1.0, 'altman': 1.5, 'bfr': 1.1, 'couvert': 1.1,
  };

  var items = r.slice(0, 7).map(function(rt) {
    var n = (rt.n || rt.name || '').toLowerCase();
    var factor = 1.0;
    Object.keys(FACTORS).forEach(function(k) { if (n.indexOf(k) > -1) factor = FACTORS[k]; });
    var sc_r = parseFloat(rt.p || rt.score || 50);
    var impact = ((100 - sc_r) / 100) * factor * 18; // points de score gagnables
    return { name: (rt.n || rt.name || 'Ratio').slice(0, 14), impact: Math.round(impact * 10) / 10, sc: sc_r };
  });
  // Trier par impact décroissant (les plus influents en premier = Tornado shape)
  items.sort(function(a, b) { return b.impact - a.impact; });

  var s = _adv_initScene(el, 40, 0.1, 200); if (!s) return;
  var sc = s.sc, cam = s.cam, ren = s.ren;

  cam.position.set(0, 2.5, 9);
  cam.lookAt(0, 0, 0);

  sc.add(new T.AmbientLight(0xffffff, 0.4));
  var d1 = new T.DirectionalLight(0x7DD3FC, 2.0); d1.position.set(5, 8, 5); sc.add(d1);
  var d2 = new T.DirectionalLight(0xFFD700, 1.0); d2.position.set(-5, 4, 2); sc.add(d2);

  var GAP_Y = 0.9, maxImpact = items[0] ? items[0].impact : 1;
  var maxW = 3.8; // largeur max de la barre la plus large

  items.forEach(function(item, i) {
    var y = -(i - items.length / 2 + 0.5) * GAP_Y;
    var wPos = (item.impact / maxImpact) * maxW; // barre droite (gain si amélioration)
    var wNeg = wPos * 0.62;                       // barre gauche (perte si dégradation)
    var col   = item.sc >= 75 ? 0x10B981 : item.sc >= 50 ? 0xF59E0B : item.sc >= 25 ? 0xF97316 : 0xEF4444;
    var depth = 0.48, height = 0.48;

    // Barre positive (droite) — amélioration
    var pgeo = new T.BoxGeometry(wPos, height, depth);
    var pmat = new T.MeshPhongMaterial({ color: 0x10B981, shininess: 120,
      emissive: new T.Color(0x10B981), emissiveIntensity: 0.15,
      transparent: true, opacity: 0.88 });
    var pmesh = new T.Mesh(pgeo, pmat);
    pmesh.position.set(wPos / 2, y, 0); sc.add(pmesh);

    // Cap positif
    var pcap = new T.Mesh(new T.BoxGeometry(wPos, 0.05, depth),
      new T.MeshPhongMaterial({ color: 0xffffff, shininess: 400, transparent: true, opacity: 0.3 }));
    pcap.position.set(wPos / 2, y + height / 2 + 0.025, 0); sc.add(pcap);

    // Barre négative (gauche) — dégradation
    var ngeo = new T.BoxGeometry(wNeg, height, depth);
    var nmat = new T.MeshPhongMaterial({ color: 0xEF4444, shininess: 120,
      emissive: new T.Color(0xEF4444), emissiveIntensity: 0.15,
      transparent: true, opacity: 0.88 });
    var nmesh = new T.Mesh(ngeo, nmat);
    nmesh.position.set(-wNeg / 2, y, 0); sc.add(nmesh);

    // Ligne de centre
    var cg = new T.BoxGeometry(0.03, height * 0.8, depth + 0.1);
    var cm = new T.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.25 });
    sc.add(new T.Mesh(cg, cm)).position ? null : null;
    var cMesh = new T.Mesh(cg, cm); cMesh.position.set(0, y, 0.01); sc.add(cMesh);

    // Point lumineux au sommet de chaque barre
    var ptL = new T.PointLight(col, 0.8, 2.5);
    ptL.position.set(wPos + 0.2, y, 0); sc.add(ptL);
  });

  // Axe central vertical
  var axisG = new T.BoxGeometry(0.04, items.length * GAP_Y + 0.5, 0.04);
  var axisM = new T.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.8 });
  sc.add(new T.Mesh(axisG, axisM));

  // Labels HTML
  el.style.position = 'relative';
  var labelsDiv = document.createElement('div');
  labelsDiv.style.cssText = 'position:absolute;left:8px;top:50%;transform:translateY(-50%);' +
    'display:flex;flex-direction:column;gap:' + (GAP_Y * 28) + 'px;pointer-events:none;';
  // Approximation du positionnement vertical
  labelsDiv.innerHTML = items.map(function(item) {
    var c = item.sc >= 75 ? '#10b981' : item.sc >= 50 ? '#f59e0b' : item.sc >= 25 ? '#f97316' : '#ef4444';
    return '<div style="font-family:Syne,sans-serif;font-size:7.5px;font-weight:700;' +
      'color:' + c + ';white-space:nowrap;">▸ ' + item.name + '</div>';
  }).join('');
  el.appendChild(labelsDiv);

  // ── Animation ──────────────────────────────────────────────
  var frame, t = 0;
  function anim() {
    frame = requestAnimationFrame(anim); t += 0.012;
    cam.position.x = Math.sin(t * 0.1) * 0.8;
    cam.position.y = 2.5 + Math.cos(t * 0.08) * 0.3;
    cam.lookAt(0, 0, 0);
    ren.render(sc, cam);
  }
  anim();

  el._dsCleanup = function() { cancelAnimationFrame(frame); ren.dispose(); };
  _adv_chat(el, 'Tornado chart : sensibilité du score à chaque ratio. Les barres vertes = gain potentiel si amélioration de ±10%, rouges = perte si dégradation. Quel ratio mérite le plus d\'attention ?');
}


// ════════════════════════════════════════════════════════════════
//  ⑥  ALTMAN Z  3D  — Décomposition 5 variables
//     Cylindres segmentés X1→X5 empilés, seuils Danger/Grise/Saine
//     Caméra orbitale, lumières colorées, labels dégradés
// ════════════════════════════════════════════════════════════════
function render3DAltmanZ(cid, ratios, score, zone) {
  var T = window.THREE;
  if (!T) { _adv_retry(render3DAltmanZ, [cid, ratios, score, zone]); return; }
  var el = _adv_clean(cid); if (!el) return;
  var W = el.clientWidth || 340, H = el.clientHeight || 240;
  if (W < 10) { _adv_retry(render3DAltmanZ, [cid, ratios, score, zone]); return; }

  // ── Calculer les 5 variables Altman depuis les ratios ──────
  var r = ratios || [];
  function getScoreVal(names, def) {
    for (var i = 0; i < r.length; i++) {
      var n = (r[i].n || r[i].name || '').toLowerCase();
      for (var j = 0; j < names.length; j++) {
        if (n.indexOf(names[j]) > -1) return parseFloat(r[i].v || r[i].value || def);
      }
    }
    return def;
  }

  var x1 = getScoreVal(['bfr', 'working capital', 'bfr/ca'], 0.1);  // BFR/Actif
  var x2 = getScoreVal(['retained', 'résultats reportés'], 0.05);    // RE/Actif
  var x3 = getScoreVal(['ebit', 'exploitation'], 0.06);              // EBIT/Actif (proxy)
  var x4 = getScoreVal(['capitaux propres', 'equity', 'solvab'], 0.3);// CP/Dettes
  var x5 = getScoreVal(['rotation', 'ca/actif'], 0.7);              // CA/Actif

  // Formule Altman Z (cœfficients originaux)
  var altmanZ = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;
  var contrib = [
    { name: 'X1 · BFR/Actif',      val: 1.2 * x1, color: 0x0EA5E9, raw: x1, coef: 1.2 },
    { name: 'X2 · RE/Actif',       val: 1.4 * x2, color: 0x8B5CF6, raw: x2, coef: 1.4 },
    { name: 'X3 · EBIT/Actif',     val: 3.3 * x3, color: 0xF59E0B, raw: x3, coef: 3.3 },
    { name: 'X4 · CP/Dettes',      val: 0.6 * x4, color: 0x10B981, raw: x4, coef: 0.6 },
    { name: 'X5 · CA/Actif',       val: 1.0 * x5, color: 0xF97316, raw: x5, coef: 1.0 },
  ];
  var total = contrib.reduce(function(s, c) { return s + Math.max(0, c.val); }, 0) || 1;

  var s = _adv_initScene(el, 42, 0.1, 200); if (!s) return;
  var sc = s.sc, cam = s.cam, ren = s.ren;

  cam.position.set(0, 2, 7);
  cam.lookAt(0, 1.5, 0);

  sc.add(new T.AmbientLight(0xffffff, 0.35));
  var d1 = new T.DirectionalLight(0x7DD3FC, 2.2); d1.position.set(5, 10, 5); sc.add(d1);
  var d2 = new T.DirectionalLight(0xFFD700, 1.0); d2.position.set(-5, 3, -3); sc.add(d2);

  // ── Cylindre principal empilé ──────────────────────────────
  var totalH = 5.0, R = 0.7, segments = 48;
  var yOffset = 0;

  contrib.forEach(function(c, i) {
    var h = Math.max(0.12, (Math.max(0, c.val) / total) * totalH);

    var cG = new T.CylinderGeometry(R, R, h, segments);
    var cM = new T.MeshPhongMaterial({
      color: c.color, shininess: 150,
      emissive: new T.Color(c.color), emissiveIntensity: 0.18,
      transparent: true, opacity: 0.90,
    });
    var cMesh = new T.Mesh(cG, cM);
    cMesh.position.set(0, yOffset + h / 2, 0);
    sc.add(cMesh);

    // Séparateur brillant
    var sepG = new T.CylinderGeometry(R + 0.04, R + 0.04, 0.04, segments);
    var sepM = new T.MeshPhongMaterial({ color: 0xffffff, shininess: 400,
      transparent: true, opacity: 0.35 });
    var sep = new T.Mesh(sepG, sepM);
    sep.position.set(0, yOffset + h, 0);
    sc.add(sep);

    // Halo latéral
    var hG = new T.CylinderGeometry(R + 0.2, R + 0.2, h, segments);
    var hM = new T.MeshBasicMaterial({ color: c.color, transparent: true,
      opacity: 0.05, side: T.BackSide });
    var hMesh = new T.Mesh(hG, hM);
    hMesh.position.set(0, yOffset + h / 2, 0);
    sc.add(hMesh);

    // Lumière colorée à chaque niveau
    var ptL = new T.PointLight(c.color, 1.0, 3.5);
    ptL.position.set(1.2, yOffset + h / 2, 0.5);
    sc.add(ptL);

    yOffset += h;
  });

  // ── Seuils Altman (lignes horizontales) ────────────────────
  var THRESHOLDS = [
    { z: 1.23, col: 0xEF4444, label: 'Danger' },   // < 1.23
    { z: 1.81, col: 0xF97316, label: 'Zone grise' },
    { z: 2.99, col: 0x10B981, label: 'Zone saine' },
  ];
  var maxZ = 4.0; // Altman Z max pour normalisation
  THRESHOLDS.forEach(function(th) {
    var yPos = Math.min(totalH, (th.z / maxZ) * totalH);
    var ringG = new T.TorusGeometry(R + 0.18, 0.025, 8, 64);
    var ringM = new T.MeshBasicMaterial({ color: th.col, transparent: true, opacity: 0.7 });
    var ring = new T.Mesh(ringG, ringM);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, yPos, 0);
    sc.add(ring);
  });

  // ── Cap supérieur (score Z) ────────────────────────────────
  var zoneCapColor = altmanZ < 1.23 ? 0xEF4444 : altmanZ < 1.81 ? 0xF97316 :
                     altmanZ < 2.99 ? 0xF59E0B : 0x10B981;
  var capFull = new T.Mesh(
    new T.CylinderGeometry(R + 0.08, R + 0.08, 0.08, 48),
    new T.MeshPhongMaterial({ color: zoneCapColor, shininess: 500,
      emissive: new T.Color(zoneCapColor), emissiveIntensity: 0.6 })
  );
  capFull.position.set(0, totalH + 0.04, 0); sc.add(capFull);

  // Label Z
  el.style.position = 'relative';
  var zLabel = document.createElement('div');
  zLabel.style.cssText = 'position:absolute;top:10px;right:12px;text-align:right;pointer-events:none;';
  var zCol = altmanZ < 1.23 ? '#ef4444' : altmanZ < 1.81 ? '#f97316' : altmanZ < 2.99 ? '#f59e0b' : '#10b981';
  var zTxt = altmanZ < 1.23 ? 'Zone Danger' : altmanZ < 1.81 ? 'Zone Critique' : altmanZ < 2.99 ? 'Zone Grise' : 'Zone Saine';
  zLabel.innerHTML =
    '<div style="font-family:Syne,sans-serif;font-size:20px;font-weight:900;color:' + zCol + ';">' +
      altmanZ.toFixed(2) + '</div>' +
    '<div style="font-size:8px;color:rgba(255,255,255,.35);letter-spacing:.06em;">ALTMAN Z</div>' +
    '<div style="font-size:7.5px;color:' + zCol + ';margin-top:2px;">' + zTxt + '</div>';
  el.appendChild(zLabel);

  // Labels des variables à gauche
  var varLabels = document.createElement('div');
  varLabels.style.cssText = 'position:absolute;left:8px;bottom:10px;pointer-events:none;';
  varLabels.innerHTML = contrib.map(function(c) {
    var cc = 'rgba(' +
      [(c.color >> 16 & 255), (c.color >> 8 & 255), (c.color & 255)].join(',') +
      ',0.9)';
    return '<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">' +
      '<div style="width:7px;height:7px;border-radius:2px;background:' + cc + ';flex-shrink:0;"></div>' +
      '<span style="font-family:Syne,sans-serif;font-size:7px;color:rgba(255,255,255,.45);">' +
        c.name.split('·')[0].trim() + '</span></div>';
  }).join('');
  el.appendChild(varLabels);

  // ── Animation ──────────────────────────────────────────────
  var frame, t = 0;
  function anim() {
    frame = requestAnimationFrame(anim); t += 0.013;
    cam.position.x = Math.sin(t * 0.15) * 2.5;
    cam.position.z = 7 + Math.cos(t * 0.12) * 0.5;
    cam.lookAt(0, 1.5, 0);
    capFull.rotation.y += 0.02;
    capFull.material.emissiveIntensity = 0.4 + Math.sin(t * 2.5) * 0.3;
    ren.render(sc, cam);
  }
  anim();

  el._dsCleanup = function() { cancelAnimationFrame(frame); ren.dispose(); };
  _adv_chat(el, 'Altman Z = ' + altmanZ.toFixed(2) + ' (' + zTxt + '). ' +
    'X1-X5 = ' + contrib.map(function(c) { return c.name.split('·')[0].trim() + '=' + c.raw.toFixed(3); }).join(', ') +
    '. Décompose ce score Altman et recommande les actions prioritaires.');
}


// ════════════════════════════════════════════════════════════════
//  EXPORT DS_EXTRA_ADVANCED
//  Intégré dans le pipeline renderVisualisations de ds-views.js
// ════════════════════════════════════════════════════════════════
window.DS_EXTRA_ADVANCED = {
  render3DSpeedometer: render3DSpeedometer,
  render3DFRBFR:       render3DFRBFR,
  render3DScoreCard:   render3DScoreCard,
  render3DRiskMatrix:  render3DRiskMatrix,
  render3DTornado:     render3DTornado,
  render3DAltmanZ:     render3DAltmanZ,
};

// Enrichir DS_EXTRA s'il est déjà chargé
if (window.DS_EXTRA) {
  Object.assign(window.DS_EXTRA, window.DS_EXTRA_ADVANCED);
}

(function() {
  console.log('%c[DS Charts Advanced v1] ✅ 6 graphes chargés',
    'color:#a78bfa;font-weight:bold;background:rgba(139,92,246,.1);padding:3px 8px;border-radius:4px;');
})();
