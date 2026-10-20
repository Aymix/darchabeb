/* ══════════════════════════════════════════════════
   VirtuArts — GSAP Cinematic Animation Controller
   ScrollTrigger, magnetic buttons, cursor glow
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // ══════════════════════════════════
  // 1. HERO TITLE REVEAL
  // ══════════════════════════════════
  const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 2 });

  heroTl
    .to('.cin-hero-badge', { opacity: 1, y: 0, duration: 0.8 })
    .to('.cin-hero-title .word', {
      opacity: 1, y: 0, rotateX: 0,
      duration: 1.2, stagger: 0.2, ease: 'expo.out'
    }, '-=0.3')
    .to('.cin-hero-sub', { opacity: 1, y: 0, duration: 0.9 }, '-=0.5')
    .from('.cin-hero-cta .cin-btn', {
      y: 30, opacity: 0, duration: 0.7, stagger: 0.15, ease: 'back.out(1.7)'
    }, '-=0.4')
    .to('.cin-scroll-hint', { opacity: 1, duration: 0.6 }, '-=0.2');

  // ══════════════════════════════════
  // 2. STUDIOS PORTAL CARDS — scroll reveal
  // ══════════════════════════════════
  gsap.utils.toArray('.cin-portal-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 90%',
        toggleActions: 'play none none reverse'
      },
      y: 80, opacity: 0, scale: 0.9, rotateY: -15,
      duration: 0.9, delay: i * 0.12,
      ease: 'power3.out'
    });
  });

  // ══════════════════════════════════
  // 3. AURA AI SECTION — orchestrated reveal
  // ══════════════════════════════════
  const auraTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.cin-aura',
      start: 'top 70%',
      toggleActions: 'play none none reverse'
    }
  });

  auraTl
    .from('.cin-aura-orb', {
      scale: 0, opacity: 0, duration: 1.2, ease: 'elastic.out(1, 0.5)'
    })
    .from('.cin-aura-ring', {
      scale: 0, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out'
    }, '-=0.6')
    .from('.cin-aura-info > *', {
      x: 40, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out'
    }, '-=0.5')
    .from('.cin-aura-feat', {
      x: 30, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out'
    }, '-=0.3');

  // ══════════════════════════════════
  // 4. GALLERY ITEMS — staggered pop-in
  // ══════════════════════════════════
  gsap.utils.toArray('.cin-gallery-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 92%',
        toggleActions: 'play none none reverse'
      },
      y: 60, opacity: 0, scale: 0.85,
      duration: 0.8, delay: i * 0.08,
      ease: 'back.out(1.4)'
    });
  });

  // ══════════════════════════════════
  // 5. FINAL CTA — epic entrance
  // ══════════════════════════════════
  const ctaTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.cin-cta',
      start: 'top 65%',
      toggleActions: 'play none none reverse'
    }
  });

  ctaTl
    .from('.cin-cta-tagline', {
      y: 60, opacity: 0, scale: 0.9, duration: 1.2, ease: 'power4.out'
    })
    .from('.cin-cta-btn', {
      y: 40, opacity: 0, scale: 0.8, duration: 0.8, ease: 'back.out(2)'
    }, '-=0.4');

  // ══════════════════════════════════
  // 6. SECTION LABELS — slide in
  // ══════════════════════════════════
  gsap.utils.toArray('.cin-section-label').forEach(label => {
    gsap.from(label, {
      scrollTrigger: {
        trigger: label,
        start: 'top 88%',
        toggleActions: 'play none none reverse'
      },
      y: 20, opacity: 0, duration: 0.6, ease: 'power2.out'
    });
  });

  gsap.utils.toArray('.cin-section-title').forEach(title => {
    gsap.from(title, {
      scrollTrigger: {
        trigger: title,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      },
      y: 40, opacity: 0, duration: 0.9, ease: 'power3.out'
    });
  });

  // ══════════════════════════════════
  // 7. MAGNETIC BUTTONS
  // ══════════════════════════════════
  document.querySelectorAll('.cin-btn, .cin-cta-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.3, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });

  // ══════════════════════════════════
  // 8. CURSOR GLOW TRAIL
  // ══════════════════════════════════
  const cursorGlow = document.querySelector('.cin-cursor-glow');
  if (cursorGlow) {
    document.addEventListener('mousemove', e => {
      gsap.to(cursorGlow, {
        x: e.clientX, y: e.clientY,
        duration: 0.8, ease: 'power2.out'
      });
    });
  }

  // ══════════════════════════════════
  // 9. PORTAL CARD TILT ON HOVER
  // ══════════════════════════════════
  document.querySelectorAll('.cin-portal-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width - 0.5;
      const cy = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateY: cx * 15, rotateX: -cy * 10,
        duration: 0.4, ease: 'power2.out'
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateY: 0, rotateX: 0,
        duration: 0.6, ease: 'elastic.out(1, 0.5)'
      });
    });
  });

  // ══════════════════════════════════
  // 10. SMOOTH SCROLL ANCHORS
  // ══════════════════════════════════
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        gsap.to(window, {
          scrollTo: { y: target, offsetY: 80 },
          duration: 1.4, ease: 'power3.inOut'
        });
      }
    });
  });

  // Init Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  console.log('✨ VirtuArts Cinematic Animations loaded');
})();
