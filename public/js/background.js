// ════════════════════════════════════════════════════════════════
//  background.js — Doctor Smile
//  Animation canvas : réseau de points + smileys flottants
//  Code exact extrait du fichier source original
// ════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════
// SMILE NETWORK BACKGROUND — Points + Têtes souriantes bleues
// ══════════════════════════════════════════
(function() {
  const canvas = document.getElementById('smile-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Points flottants
  const N = 90;
  const pts = [];
  for(let i=0;i<N;i++){
    pts.push({
      x: Math.random()*W,
      y: Math.random()*H,
      vx: (Math.random()-0.5)*0.3,
      vy: (Math.random()-0.5)*0.3,
      r: Math.random()*2+0.8
    });
  }

  // Têtes souriantes (smiley icons) en bleu rayonnant
  // On crée 6 smileys qui se déplacent lentement
  const smileys = [];
  for(let i=0;i<6;i++){
    smileys.push({
      x: Math.random()*W,
      y: Math.random()*H,
      vx: (Math.random()-0.5)*0.18,
      vy: (Math.random()-0.5)*0.18,
      radius: Math.random()*18+14,
      phase: Math.random()*Math.PI*2, // pour le rayonnement pulsé
      birthTime: Date.now() - Math.random()*3000
    });
  }

  // Gestion du cycle de 3 secondes : toutes les 3s, un nouveau smiley apparaît à la place du plus vieux
  let lastCycleTime = Date.now();

  function drawSmiley(x, y, r, glowOpacity) {
    const cx = x, cy = y;
    
    // Glow rayonnant bleu autour de la tête
    const grd = ctx.createRadialGradient(cx, cy, r*0.5, cx, cy, r*3.5);
    grd.addColorStop(0, `rgba(56,189,248,${glowOpacity*0.4})`);
    grd.addColorStop(0.5, `rgba(125,211,252,${glowOpacity*0.15})`);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, r*3.5, 0, Math.PI*2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Cercle tête
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(125,211,252,${glowOpacity*0.9})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Remplissage léger
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(14,165,233,${glowOpacity*0.07})`;
    ctx.fill();

    // Yeux
    const eyeR = r * 0.12;
    const eyeY = cy - r * 0.25;
    ctx.beginPath();
    ctx.arc(cx - r*0.28, eyeY, eyeR, 0, Math.PI*2);
    ctx.fillStyle = `rgba(125,211,252,${glowOpacity})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r*0.28, eyeY, eyeR, 0, Math.PI*2);
    ctx.fill();

    // Sourire
    ctx.beginPath();
    ctx.arc(cx, cy + r*0.05, r*0.45, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = `rgba(125,211,252,${glowOpacity})`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function draw(){
    ctx.clearRect(0, 0, W, H);

    const now = Date.now();

    // Renouvellement toutes les 3 secondes
    if(now - lastCycleTime > 3000){
      lastCycleTime = now;
      // Trouver le smiley le plus vieux et le replacer aléatoirement
      let oldest = smileys[0], oldestIdx = 0;
      for(let i=1;i<smileys.length;i++){
        if(smileys[i].birthTime < oldest.birthTime){ oldest=smileys[i]; oldestIdx=i; }
      }
      smileys[oldestIdx] = {
        x: Math.random()*W, y: Math.random()*H,
        vx: (Math.random()-0.5)*0.18, vy: (Math.random()-0.5)*0.18,
        radius: Math.random()*18+14,
        phase: Math.random()*Math.PI*2,
        birthTime: now
      };
    }

    // Dessiner les connexions entre points
    for(let i=0;i<pts.length;i++){
      for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<130){
          const a=(1-d/130)*0.18;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle=`rgba(125,211,252,${a})`;
          ctx.lineWidth=0.7;
          ctx.stroke();
        }
      }
    }

    // Connexions entre smileys et points proches
    for(let s of smileys){
      for(let p of pts){
        const dx=s.x-p.x, dy=s.y-p.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<160 && d>s.radius+2){
          const a=(1-d/160)*0.12;
          ctx.beginPath();
          ctx.moveTo(s.x,s.y);
          ctx.lineTo(p.x,p.y);
          ctx.strokeStyle=`rgba(56,189,248,${a})`;
          ctx.lineWidth=0.6;
          ctx.stroke();
        }
      }
    }

    // Dessiner les points
    for(let p of pts){
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle='rgba(125,211,252,0.55)';
      ctx.fill();

      // Micro-glow
      const gg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*5);
      gg.addColorStop(0,'rgba(125,211,252,0.12)');
      gg.addColorStop(1,'transparent');
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r*5,0,Math.PI*2);
      ctx.fillStyle=gg;
      ctx.fill();
    }

    // Dessiner les smileys
    for(let s of smileys){
      s.x+=s.vx; s.y+=s.vy;
      if(s.x<-80)s.x=W+80; if(s.x>W+80)s.x=-80;
      if(s.y<-80)s.y=H+80; if(s.y>H+80)s.y=-80;

      // Pulsation du glow
      const pulse = 0.5 + 0.5*Math.sin(now/900 + s.phase);
      const age = (now - s.birthTime)/1000;
      // Fondu entrant sur 0.5s, fondu sortant après 2.5s
      const fadeIn = Math.min(1, age/0.5);
      const fadeOut = age < 2.5 ? 1 : Math.max(0, 1-(age-2.5)/0.5);
      const opacity = fadeIn * fadeOut * (0.6 + 0.4*pulse);

      drawSmiley(s.x, s.y, s.radius, opacity);
    }

    requestAnimationFrame(draw);
  }
  draw();
})();