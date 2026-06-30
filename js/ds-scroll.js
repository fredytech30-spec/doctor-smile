// ════════════════════════════════════════════════════════════════
//  ds-scroll.js — Doctor Smile Scroll Progress
//  Barre de progression et animations au scroll
// ════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const scrollBar = document.getElementById('scroll-bar');
  if (!scrollBar) return;

  function updateScrollBar() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollBar.style.width = progress + '%';
  }

  // Fade-in des sections au scroll
  function handleIntersection() {
    const sections = document.querySelectorAll('section, .animate-on-scroll');
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    sections.forEach(function(section) {
      observer.observe(section);
    });
  }

  window.addEventListener('scroll', function() {
    requestAnimationFrame(updateScrollBar);
  });

  window.addEventListener('resize', updateScrollBar);
  updateScrollBar();
  handleIntersection();

  console.log('[Doctor Smile] Scroll progress ready');
})();
