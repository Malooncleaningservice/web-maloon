/**
 * hero-new.js
 * Handles: sticky bar scroll behaviour, hero injection, transform strip injection.
 * Load this AFTER main.js.
 */

(function () {
    'use strict';

    const STICKY_THRESHOLD = 300; // px from top before bar appears

    /* ─────────────────────────────────────────
       Sticky Bar
    ───────────────────────────────────────── */
    async function initStickyBar() {
        const placeholder = document.getElementById('sticky-bar-placeholder');
        if (!placeholder) return;

        try {
            const res  = await fetch('assets/components/sticky-bar.html');
            const html = await res.text();
            placeholder.outerHTML = html;

            const bar = document.getElementById('sticky-bar');
            if (!bar) return;

            let ticking = false;

            function onScroll() {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        const past = window.scrollY > STICKY_THRESHOLD;
                        bar.classList.toggle('is-visible', past);
                        bar.setAttribute('aria-hidden', String(!past));
                        ticking = false;
                    });
                    ticking = true;
                }
            }

            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll(); // run once on load
        } catch (err) {
            console.warn('Sticky bar failed to load:', err);
        }
    }

    /* ─────────────────────────────────────────
       Home Hero
    ───────────────────────────────────────── */
    async function initHomeHero() {
        const placeholder = document.getElementById('home-hero-placeholder');
        if (!placeholder) return;

        try {
            const res  = await fetch('assets/components/hero-home.html');
            const html = await res.text();
            placeholder.outerHTML = html;
        } catch (err) {
            console.warn('Home hero failed to load:', err);
        }
    }

    /* ─────────────────────────────────────────
       Transformation Strip
    ───────────────────────────────────────── */
    async function initTransformStrip() {
        const placeholder = document.getElementById('transform-strip-placeholder');
        if (!placeholder) return;

        try {
            const res  = await fetch('assets/components/transform-strip.html');
            const html = await res.text();
            placeholder.outerHTML = html;
        } catch (err) {
            console.warn('Transform strip failed to load:', err);
        }
    }

    /* ─────────────────────────────────────────
       Boot
    ───────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', async () => {
        await Promise.all([
            initStickyBar(),
            initHomeHero(),
            initTransformStrip(),
        ]);
    });

})();
