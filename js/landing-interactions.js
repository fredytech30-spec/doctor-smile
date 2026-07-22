// ════════════════════════════════════════════════════════════════
//  landing-interactions.js — Doctor Smile (Landing Page Interactions)
//  Micro-interactions utiles et animations performantes
// ════════════════════════════════════════════════════════════════

// ── Smooth Scroll ─────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ── Scroll Reveal Animation ───────────────────────────────────────
const revealElements = document.querySelectorAll('.reveal, .feature-card, .step-card, .stat-card');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(el => {
  if (!el.classList.contains('reveal')) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  }
  revealObserver.observe(el);
});

// ── Counter Animation for Stats ───────────────────────────────────
const statValues = document.querySelectorAll('.stat-value, .hero-stat-value');

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const text = el.textContent;
      const hasPercent = text.includes('%');
      const hasPlus = text.includes('+');
      const hasS = text.includes('s');
      const hasDecimal = text.includes('.');
      
      let target = parseFloat(text.replace(/[^0-9.]/g, ''));
      const suffix = hasPercent ? '%' : (hasS ? 's' : '');
      const prefix = hasPlus ? '+' : '';
      
      const duration = 2000;
      const startTime = performance.now();
      
      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        const current = target * easeOut;
        
        if (hasDecimal) {
          el.textContent = prefix + current.toFixed(1) + suffix;
        } else {
          el.textContent = prefix + Math.floor(current) + suffix;
        }
        
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        }
      }
      
      requestAnimationFrame(updateCounter);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

statValues.forEach(el => counterObserver.observe(el));

// ── Navigation Scroll Effect ─────────────────────────────────────
const nav = document.querySelector('.landing-nav');
if (nav) {
  window.addEventListener('scroll', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
      if (isDark) {
        nav.style.background = 'rgba(28, 26, 34, 0.85)';
      } else {
        nav.style.background = 'rgba(255, 255, 255, 0.85)';
      }
      nav.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
      nav.classList.remove('scrolled');
      if (isDark) {
        nav.style.background = 'rgba(28, 26, 34, 0.95)';
      } else {
        nav.style.background = 'rgba(255, 255, 255, 0.95)';
      }
      nav.style.boxShadow = 'none';
    }
  });
}

// ── Parallax Effect on Hero Visual ───────────────────────────────
const heroVisual = document.querySelector('.hero-visual');
if (heroVisual) {
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const parallax = scrolled * 0.3;
    heroVisual.style.transform = `translateY(${parallax}px)`;
  });
}

// ── Parallax Effect on Dashboard Preview ─────────────────────────
const dashboardPreview = document.querySelector('.dashboard-frame');
if (dashboardPreview) {
  window.addEventListener('scroll', () => {
    const rect = dashboardPreview.getBoundingClientRect();
    const scrolled = window.scrollY;
    const elementTop = rect.top + scrolled;
    const parallax = (scrolled - elementTop) * 0.05;
    
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      dashboardPreview.style.transform = `translateY(${parallax}px)`;
    }
  });
}

// ── Float Cards Parallax ─────────────────────────────────────────
const floatCards = document.querySelectorAll('.float-card');
if (floatCards.length > 0) {
  window.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;
    
    floatCards.forEach((card, index) => {
      const speed = (index + 1) * 10;
      const x = mouseX * speed;
      const y = mouseY * speed;
      card.style.transform = `translate(${x}px, ${y}px)`;
    });
  });
}

// ── Feature Cards Hover Effect ─────────────────────────────────────
const featureCards = document.querySelectorAll('.feature-card');
featureCards.forEach(card => {
  card.addEventListener('mouseenter', () => {
    const icon = card.querySelector('.feature-icon');
    if (icon) {
      icon.style.transform = 'scale(1.1) rotate(5deg)';
      icon.style.background = 'rgba(139, 92, 246, 0.2)';
    }
  });
  
  card.addEventListener('mouseleave', () => {
    const icon = card.querySelector('.feature-icon');
    if (icon) {
      icon.style.transform = 'scale(1) rotate(0deg)';
      icon.style.background = 'rgba(139, 92, 246, 0.1)';
    }
  });
});

// ── Step Cards Hover Effect ───────────────────────────────────────
const stepCards = document.querySelectorAll('.step-card');
stepCards.forEach(card => {
  card.addEventListener('mouseenter', () => {
    const number = card.querySelector('.step-number');
    if (number) {
      number.style.transform = 'scale(1.2)';
      number.style.background = 'var(--violet-500)';
    }
  });
  
  card.addEventListener('mouseleave', () => {
    const number = card.querySelector('.step-number');
    if (number) {
      number.style.transform = 'scale(1)';
      number.style.background = 'var(--violet-600)';
    }
  });
});

// ── Dashboard Score Ring Animation ─────────────────────────────
const scoreRing = document.querySelector('.score-ring');
if (scoreRing) {
  const scoreRingInner = scoreRing.querySelector('.score-ring-inner');
  if (scoreRingInner) {
    const score = parseInt(scoreRingInner.textContent);
    const percentage = (score / 100) * 360;
    
    // Animate the ring
    scoreRing.style.background = `conic-gradient(var(--violet-500) 0deg, var(--violet-500) ${percentage}deg, transparent ${percentage}deg)`;
    scoreRing.style.transition = 'background 1.5s ease-out';
    
    // Animate the number
    let currentScore = 0;
    const duration = 1500;
    const startTime = performance.now();
    
    function animateScore(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      currentScore = Math.floor(score * easeOut);
      scoreRingInner.textContent = currentScore;
      
      if (progress < 1) {
        requestAnimationFrame(animateScore);
      }
    }
    
    requestAnimationFrame(animateScore);
  }
}

// ── Metric Cards Animation ───────────────────────────────────────
const metricCards = document.querySelectorAll('.metric-card');
metricCards.forEach((card, index) => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 500 + index * 150);
});

// ── Spotlight Effect on Cards ─────────────────────────────────────
const spotlightCards = document.querySelectorAll('.spotlight-card');

spotlightCards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  });
});

// ── Interactive Simulation ───────────────────────────────────────
const revenueSlider = document.getElementById('revenue-slider');
const marginSlider = document.getElementById('margin-slider');
const cashSlider = document.getElementById('cash-slider');
const debtSlider = document.getElementById('debt-slider');

const revenueValue = document.getElementById('revenue-value');
const marginValue = document.getElementById('margin-value');
const cashValue = document.getElementById('cash-value');
const debtValue = document.getElementById('debt-value');

const scoreCircle = document.getElementById('score-circle');
const scoreNumber = document.getElementById('score-number');
const scoreStatus = document.getElementById('score-status');

function calculateScore() {
  const revenue = parseInt(revenueSlider.value);
  const margin = parseInt(marginSlider.value);
  const cash = parseInt(cashSlider.value);
  const debt = parseInt(debtSlider.value);
  
  // Update display values
  revenueValue.textContent = `${revenue * 10}K€`;
  marginValue.textContent = `${margin}%`;
  cashValue.textContent = `${cash}%`;
  debtValue.textContent = `${debt}%`;
  
  // Calculate weighted score
  const score = Math.round(
    (revenue * 0.3) +
    (margin * 0.25) +
    (cash * 0.3) +
    ((100 - debt) * 0.15)
  );
  
  // Update score display
  scoreNumber.textContent = score;
  
  // Update circle stroke
  const circumference = 283;
  const offset = circumference - (score / 100) * circumference;
  scoreCircle.style.strokeDashoffset = offset;
  
  // Update color based on score
  if (score >= 80) {
    scoreCircle.style.stroke = '#22c55e';
    scoreStatus.textContent = 'Santé financière excellente';
  } else if (score >= 60) {
    scoreCircle.style.stroke = 'var(--violet-500)';
    scoreStatus.textContent = 'Santé financière solide';
  } else if (score >= 40) {
    scoreCircle.style.stroke = 'var(--gold-500)';
    scoreStatus.textContent = 'Santé financière moyenne';
  } else {
    scoreCircle.style.stroke = '#ef4444';
    scoreStatus.textContent = 'Santé financière fragile';
  }
}

if (revenueSlider && marginSlider && cashSlider && debtSlider) {
  [revenueSlider, marginSlider, cashSlider, debtSlider].forEach(slider => {
    slider.addEventListener('input', calculateScore);
  });
  
  // Initial calculation
  calculateScore();
}

// ── Export functions ───────────────────────────────────────────────
window.LANDING_INTERACTIONS = {
  init: () => {
    console.log('[Landing Interactions] Initialized');
  }
};

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.LANDING_INTERACTIONS.init());
} else {
  window.LANDING_INTERACTIONS.init();
}
