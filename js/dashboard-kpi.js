// ════════════════════════════════════════════════════════════════
//  dashboard-kpi.js — Doctor Smile (module KPI)
//  Fonctions d'affichage des KPIs et animations
//  Extrait de dashboard.js pour modularisation
// ════════════════════════════════════════════════════════════════

import { S } from './dashboard-core.js';

// ── Exposition des fonctions KPI ───────────────────────────────────
window.DS_DASH_KPI = {
  updateKPIs,
  drawSparks,
  anim,
};

// ════════════════════════════════════════════════════════════════
//  KPI
// ════════════════════════════════════════════════════════════════
function updateKPIs() {
  const { analyses } = S;
  if (!analyses.length) return;
  
  const latest = analyses[0];
  const now = new Date();
  
  const ceJour = analyses.filter(a => {
    const d = new Date(a.createdAt?.toDate?.() || a.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  
  const avgConf = Math.round(analyses.reduce((s, a) => s + (a.confidence || 94), 0) / analyses.length);
  const lastMs = latest?.processingMs || 340;
  
  anim('kv-score', 0, latest?.score ?? 0, 1000);
  anim('kv-nb', 0, ceJour || analyses.length, 800);
  anim('kv-conf', 0, avgConf, 1200);

  const planNow = S.abonnement?.plan || 'standard';
  const maxAnalyses = { standard: 10, premium: 50, extra: Infinity }[planNow] ?? 10;
  const analysesLeft = Math.max(0, maxAnalyses - (S.analyses?.length || 0));
  
  const quotaEl = document.getElementById('kv-quota');
  if (quotaEl) {
    quotaEl.textContent = maxAnalyses === Infinity ? '∞' : analysesLeft;
    quotaEl.title = `${S.analyses?.length || 0}/${maxAnalyses === Infinity ? '∞' : maxAnalyses} analyses utilisées`;
  }
  
  const kvTime = document.getElementById('kv-time');
  if (kvTime) kvTime.textContent = lastMs;
  
  const hist = analyses.slice(0, 6).reverse();
  drawSparks(
    hist.map(a => a.score || 0),
    hist.map((_, i) => i + 1),
    hist.map(a => a.confidence || 90),
    hist.map(a => a.processingMs || 340)
  );
}

// ── Animation de compteur ─────────────────────────────────────────
function anim(id, start, end, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const startTime = performance.now();
  const diff = end - start;
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    
    const current = start + (diff * ease);
    el.textContent = Math.round(current);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

// ── Sparklines ─────────────────────────────────────────────────────
function drawSparks(scores, indices, confs, times) {
  const svg = document.getElementById('sparks-svg');
  if (!svg || !scores.length) return;
  
  const width = 200;
  const height = 50;
  const padding = 5;
  
  // Normaliser les scores
  const maxScore = Math.max(...scores, 100);
  const minScore = Math.min(...scores, 0);
  const scoreRange = maxScore - minScore || 1;
  
  // Générer le path
  const points = scores.map((score, i) => {
    const x = padding + (i / (scores.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((score - minScore) / scoreRange) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');
  
  // Créer le polyline
  svg.innerHTML = `
    <polyline
      points="${points}"
      fill="none"
      stroke="var(--violet-600)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  `;
  
  // Ajouter les points
  scores.forEach((score, i) => {
    const x = padding + (i / (scores.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((score - minScore) / scoreRange) * (height - 2 * padding);
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 3);
    circle.setAttribute('fill', 'var(--violet-600)');
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', 2);
    circle.style.cursor = 'pointer';
    circle.title = `Score: ${score}`;
    
    svg.appendChild(circle);
  });
}

export { updateKPIs, drawSparks, anim };
