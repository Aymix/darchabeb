/* ═══════════════════════════════════════════════════
   VirtuArts — Ultra-Premium 3D Home Page Engine
   GSAP + ScrollTrigger + Mouse Parallax + Magnetic
   ═══════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Wait for GSAP ──
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // ═══════════════════════════════════════
    // 1. GRADIENT MESH BACKGROUND (scroll-reactive)
    // ═══════════════════════════════════════
    const meshBg = document.getElementById('gradientMesh');
    if (meshBg) {
        window.addEventListener('scroll', () => {
            const scrollPct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
            const hue1 = 25 + scrollPct * 40;   // amber → gold
            const hue2 = 0 + scrollPct * 30;    // red → orange
            meshBg.style.background = `
                radial-gradient(ellipse at 20% 50%, hsla(${hue1}, 95%, 55%, 0.12) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, hsla(${hue2}, 90%, 50%, 0.08) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 80%, hsla(45, 100%, 50%, 0.06) 0%, transparent 50%)
            `;
        });
    }

    // ═══════════════════════════════════════
    // 2. HERO Z-AXIS ENTRANCE
    // ═══════════════════════════════════════
    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    heroTl
        .from('.hero-3d-title', {
            duration: 1.4,
            z: -800,
            opacity: 0,
            rotateX: 25,
            scale: 0.5,
            transformOrigin: 'center center',
        })
        .from('.hero-subtitle-3d', {
            duration: 1,
            y: 60,
            opacity: 0,
        }, '-=0.6')
        .from('.hero-cta-group .btn', {
            duration: 0.8,
            y: 40,
            opacity: 0,
            stagger: 0.15,
        }, '-=0.5')
        .from('.hero-floating-item', {
            duration: 1.2,
            z: -400,
            opacity: 0,
            scale: 0.3,
            stagger: { each: 0.2, from: 'random' },
            ease: 'back.out(1.7)',
        }, '-=0.8')
        .from('.hero-badge-3d', {
            duration: 0.6,
            y: -30,
            opacity: 0,
        }, '-=0.6')
        .from('.scroll-hint', {
            duration: 0.6,
            y: 20,
            opacity: 0,
        }, '-=0.3');

    // ═══════════════════════════════════════
    // 3. MOUSE PARALLAX ON FLOATING ITEMS
    // ═══════════════════════════════════════
    const floatingItems = document.querySelectorAll('.hero-floating-item');
    const heroSection = document.getElementById('heroSection');

    if (heroSection && floatingItems.length) {
        heroSection.addEventListener('mousemove', (e) => {
            const rect = heroSection.getBoundingClientRect();
            const cx = (e.clientX - rect.left) / rect.width - 0.5;    // -0.5 to 0.5
            const cy = (e.clientY - rect.top) / rect.height - 0.5;

            floatingItems.forEach((item, i) => {
                const depth = parseFloat(item.dataset.depth) || (1 + i * 0.5);
                gsap.to(item, {
                    x: cx * depth * 60,
                    y: cy * depth * 40,
                    rotateY: cx * depth * 8,
                    rotateX: -cy * depth * 8,
                    duration: 1.2,
                    ease: 'power2.out',
                });
            });
        });
    }

    // ═══════════════════════════════════════
    // 4. SCROLL-TRIGGERED 3D SECTION REVEALS
    // ═══════════════════════════════════════
    // Video Section — fly in from Z-axis
    gsap.from('#videoSection', {
        scrollTrigger: {
            trigger: '#videoSection',
            start: 'top 85%',
            end: 'top 40%',
            scrub: 1,
        },
        z: -300,
        opacity: 0,
        rotateX: 8,
        scale: 0.92,
    });

    // Cinema frame tilt animation
    gsap.from('.cinema-frame', {
        scrollTrigger: {
            trigger: '.cinema-frame',
            start: 'top 80%',
            end: 'top 30%',
            scrub: 1.5,
        },
        rotateY: -15,
        rotateX: 8,
        scale: 0.85,
        opacity: 0,
    });

    // Neon floor reflection
    gsap.from('.cinema-reflection', {
        scrollTrigger: {
            trigger: '.cinema-frame',
            start: 'top 70%',
            end: 'top 30%',
            scrub: 2,
        },
        opacity: 0,
        scaleY: 0,
        transformOrigin: 'top center',
    });

    // ═══════════════════════════════════════
    // 5. BENTO GRID — staggered 3D card entries
    // ═══════════════════════════════════════
    gsap.utils.toArray('.bento-card').forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 88%',
                toggleActions: 'play none none reverse',
            },
            duration: 0.9,
            y: 80,
            z: -200,
            rotateX: 12,
            opacity: 0,
            delay: i * 0.1,
            ease: 'power3.out',
        });
    });

    // ═══════════════════════════════════════
    // 6. GLASSMORPHIC CARD — cursor light + pump
    // ═══════════════════════════════════════
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);

            // Tilt
            const cx = (x / rect.width - 0.5) * 2;
            const cy = (y / rect.height - 0.5) * 2;
            gsap.to(card, {
                rotateY: cx * 12,
                rotateX: -cy * 12,
                duration: 0.4,
                ease: 'power2.out',
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                rotateY: 0,
                rotateX: 0,
                duration: 0.6,
                ease: 'elastic.out(1, 0.5)',
            });
        });
    });

    // ═══════════════════════════════════════
    // 7. ABOUT US — 3D fold/stack reveal
    // ═══════════════════════════════════════
    gsap.utils.toArray('.about-reveal').forEach((el, i) => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
            },
            duration: 1,
            y: 60,
            z: -150,
            rotateX: 10,
            opacity: 0,
            delay: i * 0.15,
            ease: 'power3.out',
        });
    });

    // ═══════════════════════════════════════
    // 8. SCHEDULE CARDS — staggered pop
    // ═══════════════════════════════════════
    gsap.utils.toArray('.day-card').forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 90%',
                toggleActions: 'play none none reverse',
            },
            duration: 0.7,
            y: 50,
            scale: 0.85,
            opacity: 0,
            delay: i * 0.08,
            ease: 'back.out(1.7)',
        });
    });

    // ═══════════════════════════════════════
    // 9. MAGNETIC HOVER BUTTONS
    // ═══════════════════════════════════════
    document.querySelectorAll('.btn-magnetic').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            gsap.to(btn, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.3,
                ease: 'power2.out',
            });
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.6,
                ease: 'elastic.out(1, 0.4)',
            });
        });
    });

    // ═══════════════════════════════════════
    // 10. SMOOTH SCROLL for anchor links
    // ═══════════════════════════════════════
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                gsap.to(window, {
                    scrollTo: { y: target, offsetY: 80 },
                    duration: 1.2,
                    ease: 'power3.inOut',
                });
            }
        });
    });

    // ═══════════════════════════════════════
    // 11. COUNTER ANIMATION (stats)
    // ═══════════════════════════════════════
    document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count, 10);
        ScrollTrigger.create({
            trigger: el,
            start: 'top 85%',
            onEnter: () => {
                gsap.to(el, {
                    innerText: target,
                    duration: 2,
                    snap: { innerText: 1 },
                    ease: 'power2.out',
                });
            },
            once: true,
        });
    });

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') { lucide.createIcons(); }

    console.log('🚀 VirtuArts 3D Engine loaded');
})();
