// ════════════════════════════════════════════════════════════════
//  ds-smile.js — Doctor Smile Network Canvas
//  Réseau de particules interactif pour la landing page
// ════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const canvas = document.getElementById('smile-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H;
  const nodes = [];
  const NODES_COUNT = 120;
  const CONNECT_DIST = 140;
  // Récupération dynamique des couleurs depuis les variables CSS
  function getCSSColor(varName) {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (val) {
      const temp = document.createElement('div');
      temp.style.color = val;
      document.body.appendChild(temp);
      const rgb = getComputedStyle(temp).color;
      document.body.removeChild(temp);
      const match = rgb.match(/\d+/g);
      if (match) return match.slice(0,3).join(',');
    }
    return '';
  }

  const GOLD = getCSSColor('--color-gold') || '255,215,0';
  const ICE = getCSSColor('--color-ice') || '139,127,240';
  const VIOLET = getCSSColor('--color-violet') || '139,127,240';

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function initNodes() {
    nodes.length = 0;
    for (let i = 0; i < NODES_COUNT; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2.5 + 0.8,
        col: Math.random() < 0.15 ? GOLD : Math.random() < 0.3 ? VIOLET : ICE,
        alpha: Math.random() * 0.4 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.4 + 0.1,
      });
    }
  }

  let mouseX = -9999, mouseY = -9999;
  let mouseActive = false;
  let mouseTimeout;

  document.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseActive = true;
    clearTimeout(mouseTimeout);
    mouseTimeout = setTimeout(function() { mouseActive = false; }, 2000);
  });

  function draw(timestamp) {
    ctx.clearRect(0, 0, W, H);

    // Update nodes
    const cx = mouseActive ? mouseX : W / 2;
    const cy = mouseActive ? mouseY : H / 2;

    nodes.forEach(function(p) {
      // Mouse attraction
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = mouseActive ? Math.min(120 / (dist + 1), 0.8) * 0.005 : 0.001;

      // Natural movement
      p.vx += Math.sin(timestamp * 0.0003 + p.phase) * 0.003;
      p.vy += Math.cos(timestamp * 0.0004 + p.phase * 1.3) * 0.003;
      p.vx += dx * force;
      p.vy += dy * force;

      // Damping
      p.vx *= 0.995;
      p.vy *= 0.995;

      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;
    });

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CONNECT_DIST * CONNECT_DIST) {
          const alpha = (1 - Math.sqrt(d2) / CONNECT_DIST) * 0.12;
          // Use average color
          const col = nodes[i].col === GOLD || nodes[j].col === GOLD ? GOLD :
                      nodes[i].col === VIOLET || nodes[j].col === VIOLET ? VIOLET : ICE;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = 'rgba(' + col + ',' + alpha + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    const time = timestamp / 1000;
    nodes.forEach(function(p) {
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.5 + p.phase);
      const radius = p.r * pulse;

      // Glow
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 6);
      glow.addColorStop(0, 'rgba(' + p.col + ',' + (0.04 * pulse) + ')');
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 6, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.col + ',' + (p.alpha * pulse) + ')';
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', function() {
    resize();
    initNodes();
  });

  resize();
  initNodes();
  requestAnimationFrame(draw);

  console.log('[Doctor Smile] Network canvas ready');
})();
