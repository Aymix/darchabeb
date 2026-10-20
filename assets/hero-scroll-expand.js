/*
 * VirtuArts — Signature Hero controller
 * --------------------------------------
 * Two behaviours only (intentionally minimal, no scroll-locking):
 *   1. Gooey text morph — cycles through the words in
 *      [data-hero-se-words] using an SVG threshold filter.
 *   2. Subtle parallax on the ambient glow orb so the hero
 *      feels alive when the user scrolls.
 *
 * Imported from assets/app.js → included on every page; safely
 * exits when the hero section isn't present.
 */

import { scroll } from 'motion';

const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ────────────────────────────────────────────────────────
   Gooey text morph
   ──────────────────────────────────────────────────────── */
function initGooeyMorph(hero) {
    const wordA = hero.querySelector('[data-hero-se-word-a]');
    const wordB = hero.querySelector('[data-hero-se-word-b]');
    const wordsEl = hero.querySelector('[data-hero-se-words]');
    if (!wordA || !wordB || !wordsEl) return;

    let words;
    try { words = JSON.parse(wordsEl.textContent || '[]'); }
    catch { words = []; }
    if (!Array.isArray(words) || words.length < 2) return;

    // Graceful fallback: fade through the list instead of blurring
    if (reducedMotion) {
        let idx = 0;
        wordA.textContent = words[idx];
        wordB.textContent = '';
        wordA.style.opacity = '1';
        wordB.style.opacity = '0';
        setInterval(() => {
            idx = (idx + 1) % words.length;
            wordA.style.transition = 'opacity .4s';
            wordA.style.opacity = '0';
            setTimeout(() => {
                wordA.textContent = words[idx];
                wordA.style.opacity = '1';
            }, 400);
        }, 2400);
        return;
    }

    const morphTime = 1.0;      // seconds to complete a blur→sharp morph
    const cooldownTime = 0.55;  // seconds the word holds still before morphing again

    let textIndex = words.length - 1;
    let time = performance.now();
    let morph = 0;
    let cooldown = cooldownTime;

    wordA.textContent = words[textIndex % words.length];
    wordB.textContent = words[(textIndex + 1) % words.length];

    function setMorph(fraction) {
        wordB.style.filter  = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
        wordB.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
        const inv = 1 - fraction;
        wordA.style.filter  = `blur(${Math.min(8 / inv - 8, 100)}px)`;
        wordA.style.opacity = `${Math.pow(inv, 0.4) * 100}%`;
    }

    function doCooldown() {
        morph = 0;
        wordB.style.filter = '';
        wordB.style.opacity = '100%';
        wordA.style.filter = '';
        wordA.style.opacity = '0%';
    }

    function doMorph() {
        morph -= cooldown;
        cooldown = 0;
        let fraction = morph / morphTime;
        if (fraction > 1) {
            cooldown = cooldownTime;
            fraction = 1;
        }
        setMorph(fraction);
    }

    function tick(now) {
        requestAnimationFrame(tick);
        const shouldIncrement = cooldown > 0;
        const dt = (now - time) / 1000;
        time = now;
        cooldown -= dt;
        if (cooldown <= 0) {
            if (shouldIncrement) {
                textIndex = (textIndex + 1) % words.length;
                wordA.textContent = words[textIndex % words.length];
                wordB.textContent = words[(textIndex + 1) % words.length];
            }
            morph += dt;
            doMorph();
        } else {
            doCooldown();
        }
    }
    requestAnimationFrame(tick);
}

/* ────────────────────────────────────────────────────────
   Ambient glow parallax (opt-in, disabled for reduced-motion)
   ──────────────────────────────────────────────────────── */
function initGlowParallax(hero) {
    if (reducedMotion) return;
    const orb = hero.querySelector('[data-hero-se-orb]');
    if (!orb) return;

    // Motion's `scroll` API links scroll progress (0 at top, 1 at bottom of
    // the target) to a callback. We drive a CSS var so the CSS transform
    // stays the single source of truth for positioning.
    scroll(({ y }) => {
        const progress = y.progress || 0;
        // Drift the orb 80px down as the hero scrolls off screen
        hero.style.setProperty('--va-hero-parallax', `${(progress * 80).toFixed(1)}px`);
    }, { target: hero });
}

/* ────────────────────────────────────────────────────────
   Bootstrap
   ──────────────────────────────────────────────────────── */
function boot() {
    const hero = document.querySelector('[data-hero-scroll-expand]');
    if (!hero) return;
    initGooeyMorph(hero);
    initGlowParallax(hero);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}
