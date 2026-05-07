// ════════════════════════════════════════════════════════════════
//  ui.js — Doctor Smile
//  Code JS UI exact du fichier source original
//  Cursor · Scroll · Nav · Hamburger · Theme · Reveal · Counter
//  Tilt · Magnetic · Ripple · Typewriter · Ticker · Chat
// ════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════
// CURSOR
// ══════════════════════════════════════════
(function(){
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let mx=0,my=0,rx=0,ry=0;

  document.addEventListener('mousemove', e=>{mx=e.clientX;my=e.clientY;});

  (function animCursor(){
    rx += (mx-rx)*0.1; ry += (my-ry)*0.1;
    dot.style.left=mx+'px'; dot.style.top=my+'px';
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(animCursor);
  })();

  document.querySelectorAll('a,button,.feat-card,.testi-card,.tech-cat,.metric-box').forEach(el=>{
    el.addEventListener('mouseenter',()=>{ring.style.width='64px';ring.style.height='64px';ring.style.borderColor='rgba(255,215,0,0.6)';});
    el.addEventListener('mouseleave',()=>{ring.style.width='40px';ring.style.height='40px';ring.style.borderColor='rgba(125,211,252,0.5)';});
  });
})();

// ══════════════════════════════════════════
// SCROLL PROGRESS
// ══════════════════════════════════════════
const scrollBar = document.getElementById('scroll-bar');
window.addEventListener('scroll',()=>{
  const pct=(window.scrollY/(document.documentElement.scrollHeight-window.innerHeight))*100;
  scrollBar.style.width=Math.min(100,pct)+'%';
});

// ══════════════════════════════════════════
// NAV SCROLL + 3D TILT
// ══════════════════════════════════════════
const nav = document.getElementById('nav');
const navCapsule = document.getElementById('navCapsule');

window.addEventListener('scroll',()=>{
  if(window.scrollY>30){
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// Subtle 3D tilt on nav capsule
navCapsule.addEventListener('mousemove',e=>{
  const rect=navCapsule.getBoundingClientRect();
  const x=(e.clientX-rect.left-rect.width/2)/rect.width;
  const y=(e.clientY-rect.top-rect.height/2)/rect.height;
  navCapsule.style.transform=`perspective(1000px) rotateX(${-y*2}deg) rotateY(${x*2}deg)`;
  navCapsule.style.transition='transform 0.1s';
});
navCapsule.addEventListener('mouseleave',()=>{
  navCapsule.style.transform='';
  navCapsule.style.transition='transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
});

// Active nav links
(function(){
  const sections=document.querySelectorAll('section[id]');
  const links=document.querySelectorAll('.nav-links a');
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        links.forEach(l=>l.classList.remove('active'));
        const match=document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if(match) match.classList.add('active');
      }
    });
  },{threshold:0.4});
  sections.forEach(s=>observer.observe(s));
})();

// ══════════════════════════════════════════
// HAMBURGER TOGGLE
// ══════════════════════════════════════════
const navToggle=document.getElementById('navToggle');
const mobileMenu=document.getElementById('mobileMenu');

navToggle.addEventListener('click',()=>{
  navToggle.classList.toggle('open');
  mobileMenu.classList.toggle('open');
  document.body.style.overflow=mobileMenu.classList.contains('open')?'hidden':'';
});

function closeMobile(){
  navToggle.classList.remove('open');
  mobileMenu.classList.remove('open');
  document.body.style.overflow='';
}

// ══════════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════════
const themeToggle=document.getElementById('themeToggle');
const thumb=themeToggle.querySelector('.toggle-thumb');
let isDark=true;
themeToggle.addEventListener('click',()=>{
  isDark=!isDark;
  document.body.classList.toggle('light-mode',!isDark);
  thumb.innerHTML=isDark?'<i class="fa-solid fa-moon" style="font-size:12px;line-height:1;"></i>':'<i class="fa-solid fa-sun" style="font-size:12px;line-height:1;"></i>';
});

// ══════════════════════════════════════════
// INTERSECTION OBSERVER — REVEAL
// ══════════════════════════════════════════
const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add('vis');}
  });
},{threshold:0.12,rootMargin:'0px 0px -60px 0px'});

document.querySelectorAll('.reveal,.reveal-l,.reveal-r').forEach(el=>observer.observe(el));

// ══════════════════════════════════════════
// COUNTER ANIMATION
// ══════════════════════════════════════════
function animateCounter(el){
  const target=parseFloat(el.dataset.target);
  const suffix=el.dataset.suffix||'';
  const isFloat=String(target).includes('.');
  const duration=2200;
  const start=performance.now();
  (function step(now){
    const t=Math.min((now-start)/duration,1);
    const ease=1-Math.pow(1-t,4);
    const val=target*ease;
    el.textContent=(isFloat?val.toFixed(1):Math.round(val))+suffix;
    if(t<1) requestAnimationFrame(step);
  })(performance.now());
}

const counterObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      animateCounter(e.target);
      counterObs.unobserve(e.target);
    }
  });
},{threshold:0.5});
document.querySelectorAll('.metric-num').forEach(el=>counterObs.observe(el));

// ══════════════════════════════════════════
// 3D CARD HOVER — DASHBOARD
// ══════════════════════════════════════════
const dashCard=document.getElementById('dashCard');
if(dashCard){
  dashCard.addEventListener('mousemove',e=>{
    const rect=dashCard.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width-0.5;
    const y=(e.clientY-rect.top)/rect.height-0.5;
    dashCard.style.animation='none';
    dashCard.style.transform=`perspective(800px) translateY(-10px) rotateX(${-y*12}deg) rotateY(${x*12}deg)`;
    dashCard.style.transition='transform 0.08s';
  });
  dashCard.addEventListener('mouseleave',()=>{
    dashCard.style.animation='floatCard 6s ease-in-out infinite';
    dashCard.style.transform='';
  });
}

// 3D tilt all feature cards
document.querySelectorAll('.feat-card,.step-card,.metric-box,.testi-card').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    const rect=card.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width-0.5;
    const y=(e.clientY-rect.top)/rect.height-0.5;
    card.style.transform=`perspective(600px) translateY(-6px) rotateX(${-y*8}deg) rotateY(${x*8}deg)`;
    card.style.transition='transform 0.08s';
  });
  card.addEventListener('mouseleave',()=>{
    card.style.transform='';
    card.style.transition='transform 0.5s var(--ease-spring)';
  });
});

// ══════════════════════════════════════════
// MAGNETIC BUTTONS
// ══════════════════════════════════════════
document.querySelectorAll('.btn-gold,.btn-glass').forEach(btn=>{
  btn.addEventListener('mousemove',e=>{
    const rect=btn.getBoundingClientRect();
    const x=(e.clientX-rect.left-rect.width/2)*0.22;
    const y=(e.clientY-rect.top-rect.height/2)*0.22;
    btn.style.transform=`translate(${x}px,${y}px) scale(1.04)`;
    btn.style.transition='transform 0.12s';
  });
  btn.addEventListener('mouseleave',()=>{
    btn.style.transform='';
    btn.style.transition='transform 0.4s var(--ease-spring)';
  });
});

// ══════════════════════════════════════════
// RIPPLE on btn-gold
// ══════════════════════════════════════════
document.querySelectorAll('.btn-gold').forEach(btn=>{
  btn.addEventListener('click',function(e){
    const ripple=document.createElement('span');
    const rect=btn.getBoundingClientRect();
    const size=Math.max(rect.width,rect.height)*2;
    Object.assign(ripple.style,{
      position:'absolute',width:size+'px',height:size+'px',borderRadius:'50%',
      background:'rgba(255,255,255,0.3)',
      top:(e.clientY-rect.top-size/2)+'px',left:(e.clientX-rect.left-size/2)+'px',
      transform:'scale(0)',pointerEvents:'none',animation:'ripple 0.6s ease-out forwards'
    });
    btn.style.position='relative';btn.style.overflow='hidden';
    btn.appendChild(ripple);
    setTimeout(()=>ripple.remove(),700);
  });
});
const rs=document.createElement('style');
rs.textContent='@keyframes ripple{to{transform:scale(1);opacity:0;}}';
document.head.appendChild(rs);

// ══════════════════════════════════════════
// TYPEWRITER
// ══════════════════════════════════════════
(function(){
  const el=document.querySelector('#typewriter-line');
  if(!el) return;
  const phrases=['Avant la faillite.','Avec 95%+ de précision.','En 0.3 seconde.','Votre médecin IA 24h/24.','Grâce à XGBoost + GPT-4.'];
  let pi=0,ci=0,deleting=false;
  el.textContent='';
  function type(){
    const ph=phrases[pi];
    if(!deleting){
      el.textContent=ph.slice(0,++ci);
      if(ci===ph.length){deleting=true;setTimeout(type,2400);return;}
    } else {
      el.textContent=ph.slice(0,--ci);
      if(ci===0){deleting=false;pi=(pi+1)%phrases.length;}
    }
    setTimeout(type,deleting?35:65);
  }
  setTimeout(type,1600);
})();

// ══════════════════════════════════════════
// LIVE SCORE TICKER
// ══════════════════════════════════════════
(function(){
  const el=document.getElementById('score-val');
  if(!el) return;
  const scores=['23.7 / 100','41.2 / 100','18.5 / 100','67.3 / 100','31.0 / 100'];
  let idx=0;
  setInterval(()=>{
    idx=(idx+1)%scores.length;
    el.style.opacity='0';
    setTimeout(()=>{el.textContent=scores[idx];el.style.opacity='1';el.style.transition='opacity 0.4s';},300);
  },3500);
})();

// ══════════════════════════════════════════
// CHAT TYPEWRITER
// ══════════════════════════════════════════
(function(){
  const inp=document.getElementById('chatInput');
  if(!inp) return;
  const qs=['Quels sont les points de vigilance ?','Comparez avec le secteur tech.','Générez le rapport PDF.','Quel est le score sur 3 ans ?'];
  let qi=0;
  setInterval(()=>{
    qi=(qi+1)%qs.length;
    inp.placeholder='';let ci=0;
    const ph=qs[qi];
    const t=setInterval(()=>{
      inp.placeholder=ph.slice(0,++ci)+'|';
      if(ci>=ph.length){clearInterval(t);setTimeout(()=>{inp.placeholder=ph;},900);}
    },50);
  },4200);
})();

// ══════════════════════════════════════════
// BILLING TOGGLE
// ══════════════════════════════════════════
// Billing toggle
let isAnnual = true;
function toggleBilling(){
  isAnnual = !isAnnual;
  const pill = document.getElementById('billingToggle');
  pill.classList.toggle('on', isAnnual);
  document.querySelectorAll('.p-price-num').forEach(el => {
    const monthly = parseInt(el.dataset.monthly);
    const annual  = parseInt(el.dataset.annual);
    el.textContent = isAnnual ? annual : monthly;
  });
  document.querySelectorAll('.p-price-annual').forEach((el, i) => {
    const saves = [120, 240, 480];
    const annuals = [468, 948, 1908];
    el.style.opacity = isAnnual ? '1' : '0.3';
    el.textContent = isAnnual
      ? `Soit ${annuals[i]}€/an — économisez ${saves[i]}€`
      : 'Facturation mensuelle sans engagement';
  });
}
window.toggleBilling = toggleBilling;
window.closeMobile   = closeMobile; 