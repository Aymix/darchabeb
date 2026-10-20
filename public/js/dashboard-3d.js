/* ═══════════════════════════════════════════════════════════
   dashboard-3d.js — Hyper-Premium Dashboard Animations
   Uses GSAP + ScrollTrigger
═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // Wait for GSAP to be available
    if (typeof gsap === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    /* ─── PERSPECTIVE on root container ─── */
    const page = document.querySelector('.db3-page');
    if (page) page.style.perspective = '1200px';

    /* ─────────────────────────────────────────
       1. HEADER — Z-axis entrance
    ───────────────────────────────────────── */
    const header = document.querySelector('.db3-header');
    if (header) {
        gsap.from(header, {
            duration: 1,
            opacity: 0,
            y: -40,
            z: -120,
            rotateX: 15,
            ease: 'expo.out',
            delay: 0.1,
        });
    }

    /* ─────────────────────────────────────────
       2. STAT CARDS — staggered Z-axis reveal
    ───────────────────────────────────────── */
    const statCards = document.querySelectorAll('.db3-stat-card');
    if (statCards.length) {
        gsap.from(statCards, {
            duration: 0.9,
            opacity: 0,
            y: 50,
            z: -100,
            rotateX: 20,
            stagger: 0.12,
            ease: 'back.out(1.5)',
            delay: 0.25,
        });

        /* Counter animation for stat values */
        document.querySelectorAll('.db3-stat-value[data-count]').forEach(el => {
            const target = parseInt(el.getAttribute('data-count'), 10);
            if (isNaN(target)) return;
            const obj = { val: 0 };
            ScrollTrigger.create({
                trigger: el,
                once: true,
                onEnter: () => {
                    gsap.to(obj, {
                        val: target,
                        duration: 1.5,
                        ease: 'power2.out',
                        onUpdate: () => { el.textContent = Math.round(obj.val); }
                    });
                }
            });
        });
    }

    /* ─────────────────────────────────────────
       3. GAM BAR items
    ───────────────────────────────────────── */
    gsap.from('.db3-gam-item', {
        duration: 0.7,
        opacity: 0,
        y: 20,
        stagger: 0.07,
        ease: 'power3.out',
        delay: 0.4,
    });

    /* ─────────────────────────────────────────
       4. SCROLL REVEALS — generic
    ───────────────────────────────────────── */
    document.querySelectorAll('.db3-reveal').forEach((el, i) => {
        gsap.to(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                toggleActions: 'play none none none',
            },
            duration: 0.85,
            opacity: 1,
            y: 0,
            z: 0,
            rotateX: 0,
            ease: 'back.out(1.4)',
            delay: (i % 4) * 0.08,
        });
    });

    document.querySelectorAll('.db3-reveal-left').forEach(el => {
        gsap.to(el, {
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
            duration: 0.8,
            opacity: 1,
            x: 0,
            z: 0,
            ease: 'power3.out',
        });
    });

    document.querySelectorAll('.db3-reveal-right').forEach(el => {
        gsap.to(el, {
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
            duration: 0.8,
            opacity: 1,
            x: 0,
            z: 0,
            ease: 'power3.out',
        });
    });

    /* ─────────────────────────────────────────
       5. TABLE ROWS — staggered slide-in
    ───────────────────────────────────────── */
    document.querySelectorAll('.db3-table tbody').forEach(tbody => {
        const rows = tbody.querySelectorAll('tr');
        if (!rows.length) return;
        gsap.from(rows, {
            scrollTrigger: {
                trigger: tbody,
                start: 'top 90%',
                toggleActions: 'play none none none',
            },
            duration: 0.5,
            opacity: 0,
            x: -24,
            stagger: 0.05,
            ease: 'power2.out',
        });
    });

    /* ─────────────────────────────────────────
       6. BENTO CARDS — cascading Z-reveal
    ───────────────────────────────────────── */
    document.querySelectorAll('.db3-bento-grid').forEach(grid => {
        const cards = grid.querySelectorAll('.db3-bento-card');
        gsap.from(cards, {
            scrollTrigger: { trigger: grid, start: 'top 85%', toggleActions: 'play none none none' },
            duration: 0.7,
            opacity: 0,
            y: 30,
            z: -60,
            rotateX: 12,
            stagger: 0.08,
            ease: 'back.out(1.6)',
        });
    });

    /* ─────────────────────────────────────────
       7. MODULE CARDS
    ───────────────────────────────────────── */
    document.querySelectorAll('.db3-module-grid').forEach(grid => {
        const cards = grid.querySelectorAll('.db3-module-card');
        gsap.from(cards, {
            scrollTrigger: { trigger: grid, start: 'top 86%', toggleActions: 'play none none none' },
            duration: 0.75,
            opacity: 0,
            y: 40,
            z: -80,
            rotateX: 15,
            stagger: 0.09,
            ease: 'back.out(1.5)',
        });
    });

    /* ─────────────────────────────────────────
       8. SUBMISSION CARDS
    ───────────────────────────────────────── */
    document.querySelectorAll('.db3-sub-card').forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none none' },
            duration: 0.6,
            opacity: 0,
            x: -30,
            ease: 'power3.out',
            delay: i * 0.06,
        });
    });

    /* ─────────────────────────────────────────
       9. PARALLAX BACKGROUND
    ───────────────────────────────────────── */
    const bg = document.querySelector('.db3-bg');
    if (bg) {
        gsap.to(bg, {
            scrollTrigger: {
                scrub: 1.5,
                start: 'top top',
                end: 'bottom bottom',
            },
            backgroundPositionY: '25%',
            ease: 'none',
        });
    }

    /* ─────────────────────────────────────────
       10. CURSOR TRACKING — glass-slab light
    ───────────────────────────────────────── */
    function initCursorTracking(selector) {
        document.querySelectorAll(selector).forEach(card => {
            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
                const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
                card.style.setProperty('--mx', x + '%');
                card.style.setProperty('--my', y + '%');
            });
            card.addEventListener('mouseleave', () => {
                card.style.setProperty('--mx', '50%');
                card.style.setProperty('--my', '50%');
            });
        });
    }
    initCursorTracking('.db3-stat-card');
    initCursorTracking('.db3-bento-card');
    initCursorTracking('.db3-module-card');

    /* ─────────────────────────────────────────
       11. MAGNETIC BUTTONS
    ───────────────────────────────────────── */
    document.querySelectorAll('.db3-btn').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            const dx = (e.clientX - rect.left - rect.width  / 2) * 0.25;
            const dy = (e.clientY - rect.top  - rect.height / 2) * 0.25;
            gsap.to(btn, { x: dx, y: dy, duration: 0.3, ease: 'power2.out' });
        });
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,0.5)' });
        });
    });

    /* ─────────────────────────────────────────
       12. 3D TILT on glass cards (subtle)
    ───────────────────────────────────────── */
    function initTilt(selector, intensity) {
        document.querySelectorAll(selector).forEach(card => {
            card.style.transformStyle = 'preserve-3d';
            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                const cx = rect.left + rect.width  / 2;
                const cy = rect.top  + rect.height / 2;
                const rx = ((e.clientY - cy) / rect.height) *  intensity;
                const ry = ((e.clientX - cx) / rect.width ) * -intensity;
                gsap.to(card, { rotateX: rx, rotateY: ry, duration: 0.4, ease: 'power2.out' });
            });
            card.addEventListener('mouseleave', () => {
                gsap.to(card, { rotateX: 0, rotateY: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1,0.5)' });
            });
            card.addEventListener('mouseenter', () => {
                gsap.to(card, { scale: 1.02, duration: 0.3, ease: 'power2.out' });
            });
        });
    }
    initTilt('.db3-stat-card', 8);
    initTilt('.db3-bento-card', 6);
    initTilt('.db3-module-card', 5);

    /* ─────────────────────────────────────────
       13. FORM CARD entrance
    ───────────────────────────────────────── */
    gsap.from('.db3-form-card', {
        scrollTrigger: { trigger: '.db3-form-card', start: 'top 88%', toggleActions: 'play none none none' },
        duration: 0.8,
        opacity: 0,
        y: 40,
        z: -80,
        rotateX: 10,
        ease: 'back.out(1.4)',
    });

    /* ─────────────────────────────────────────
       14. FLASH MESSAGES auto-dismiss
    ───────────────────────────────────────── */
    document.querySelectorAll('.db3-flash').forEach(flash => {
        setTimeout(() => {
            gsap.to(flash, {
                duration: 0.5,
                opacity: 0,
                x: 20,
                ease: 'power2.in',
                onComplete: () => flash.remove(),
            });
        }, 5000);
    });

})();
