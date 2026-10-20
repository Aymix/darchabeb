/**
 * VirtuArts — Container Scroll Animation
 * Vanilla JS port of Aceternity's ContainerScroll React component.
 * Uses IntersectionObserver + scroll events for 3D perspective card effect.
 *
 * Usage: <div data-scroll-container> wrapping a <div data-scroll-header> and <div data-scroll-card>
 */

(function () {
  'use strict';

  function initScrollAnimation(container) {
    const header = container.querySelector('[data-scroll-header]');
    const card = container.querySelector('[data-scroll-card]');
    if (!header || !card) return;

    const isMobile = () => window.innerWidth <= 768;

    function getProgress() {
      const rect = container.getBoundingClientRect();
      const viewH = window.innerHeight;
      const containerH = rect.height;
      // Progress: 0 when container top enters viewport, 1 when container bottom passes
      const raw = (viewH - rect.top) / (viewH + containerH);
      return Math.max(0, Math.min(1, raw));
    }

    function lerp(start, end, t) {
      return start + (end - start) * t;
    }

    function update() {
      const p = getProgress();

      // Header: translate Y from 0 to -100px
      const translateY = lerp(0, -100, p);
      header.style.transform = `translateY(${translateY}px)`;

      // Card: rotateX from 20deg to 0, scale from 1.05 to 1 (mobile: 0.7 to 0.9)
      const rotate = lerp(20, 0, p);
      const scaleRange = isMobile() ? [0.7, 0.9] : [1.05, 1];
      const scale = lerp(scaleRange[0], scaleRange[1], p);

      card.style.transform = `perspective(1000px) rotateX(${rotate}deg) scale(${scale})`;

      // Shadow intensity based on progress
      const shadowOpacity = lerp(0.3, 0.05, p);
      card.style.boxShadow = `0 ${lerp(37, 9, p)}px ${lerp(50, 20, p)}px rgba(249, 115, 22, ${shadowOpacity})`;
    }

    // Initial state
    card.style.transformOrigin = 'center top';
    card.style.willChange = 'transform';
    header.style.willChange = 'transform';

    // Use requestAnimationFrame for smooth updates
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Initial call
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }

  function boot() {
    document.querySelectorAll('[data-scroll-container]').forEach(initScrollAnimation);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
