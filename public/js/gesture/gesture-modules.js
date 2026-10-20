/**
 * VirtuArts — Gesture adapters per module
 * Each adapter maps engine gestures (gesture-engine.js) onto the existing
 * page controls, by dispatching the same mouse events the pages already
 * listen to — so recording, AI feedback, saving etc. keep working unchanged.
 */
(function () {
    'use strict';
    const G = window.VAGesture;
    if (!G) return;

    const CLICKABLE = 'a[href], button, [role="button"], [onclick], label, select, summary, ' +
        'input[type="checkbox"], input[type="radio"], input[type="button"], input[type="submit"], ' +
        '.beat-cell, .harm-chip, .prog-step, .chord-btn, .drum-pad, .key-white, .key-black, [data-tool], [data-color], [data-px-color], [data-px-tool], .swatch, .gallery-card';

    /* ── shared building blocks ─────────────────────────────── */

    // hover highlight + quick pinch = click, for any page UI
    function pointerClick(api, opts = {}) {
        const sel = opts.selector || CLICKABLE;
        const skip = opts.skip || (() => false);
        api.on('hands', hands => hands.forEach(h => {
            if (skip(h)) return api.hover(h.id, null);
            const el = api.elementAt(h.cursor.x, h.cursor.y);
            api.hover(h.id, el ? el.closest(sel) : null);
        }));
        api.on('pinchend', e => {
            if (!e.tap || (opts.skipTap && opts.skipTap(e))) return;
            const el = api.elementAt(e.x, e.y);
            const target = el && el.closest(sel);
            if (target && api.press(target, e.x, e.y)) api.toast('Click');
        });
        api.on('handlost', e => api.hover(e.hand, null));
    }

    // open-palm swipe up/down scrolls the page (touch-like: swipe up → content moves up)
    function swipeScroll(api) {
        api.on('swipe', e => {
            if (e.dir === 'up') window.scrollBy({ top: innerHeight * 0.7, behavior: 'smooth' });
            if (e.dir === 'down') window.scrollBy({ top: -innerHeight * 0.7, behavior: 'smooth' });
        });
    }

    function inside(el, x, y) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    // "air pen": pointing with the index finger draws on a canvas, any other pose lifts the pen
    function airPen(api, canvas, { onPose } = {}) {
        let penHand = null, last = null;
        const up = () => {
            if (penHand === null) return;
            api.mouse(canvas, 'mouseup', last?.x ?? 0, last?.y ?? 0);
            penHand = null; last = null;
        };
        api.on('pose', e => {
            if (e.pose === 'point' && penHand === null && inside(canvas, e.x, e.y)) {
                penHand = e.hand; last = { x: e.x, y: e.y };
                api.mouse(canvas, 'mousedown', e.x, e.y);
            } else if (e.hand === penHand && e.pose !== 'point') {
                up();
            }
            onPose && onPose(e);
        });
        api.on('hands', hands => {
            const h = hands.find(x => x.id === penHand);
            if (!h) return;
            last = { ...h.cursor };
            api.mouse(canvas, 'mousemove', h.cursor.x, h.cursor.y);
        });
        api.on('handlost', e => { if (e.hand === penHand) up(); });
        return { up };
    }

    const press = (api, el, x, y, type = 'mousedown') => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        api.mouse(el, type, x ?? r.left + r.width / 2, y ?? r.top + r.height / 2);
        api.flash(el);
        return true;
    };

    /* ── generic (every other page) ─────────────────────────── */
    G.register({
        id: 'generic', title: 'Gesture navigation',
        help: [['☝️', 'Point to move the cursor'], ['🤏', 'Quick pinch to click'], ['🖐️', 'Swipe up / down to scroll']],
        init(api) { pointerClick(api); swipeScroll(api); },
    });

    /* ── 🎹 Air Piano ───────────────────────────────────────── */
    G.register({
        id: 'piano', match: /^\/music\/piano\/?$/, title: 'Air Piano', cursor: 'tips',
        help: [['🖐️', 'Hold your hands over the keys'], ['👇', 'Dip a finger to play the key under it'], ['🤏', 'Pinch to press buttons (Record, Play…)']],
        init(api) {
            const KEYS = '.key-black, .key-white';
            api.on('hands', hands => hands.forEach(h => {
                const el = api.elementAt(h.tips.index.x, h.tips.index.y);
                api.hover(h.id, el ? el.closest(KEYS) : null);
            }));
            api.on('fingertap', e => {
                const el = api.elementAt(e.x, e.y);
                const key = (el && el.closest(KEYS)) || api.nearest(KEYS, e.x, e.y, 40);
                if (key) press(api, key, e.x, e.y);
            });
            pointerClick(api, { selector: 'button, a[href]' });
        },
    });

    /* ── 🥁 Air Drums ───────────────────────────────────────── */
    G.register({
        id: 'drums', match: /^\/music\/drums\/?$/, title: 'Air Drums',
        help: [['✋', 'Move a hand over a pad'], ['⬇️', 'Chop down quickly to hit it'], ['🤏', 'Pinch to press buttons']],
        init(api) {
            api.on('hands', hands => hands.forEach(h => {
                const el = api.elementAt(h.cursor.x, h.cursor.y);
                api.hover(h.id, (el && el.closest('.drum-pad')) || api.nearest('.drum-pad', h.cursor.x, h.cursor.y, 120));
            }));
            api.on('strike', e => {
                if (e.dir !== 'down') return;
                const el = api.elementAt(e.x, e.y);
                const pad = (el && el.closest('.drum-pad')) || api.nearest('.drum-pad', e.x, e.y, 160);
                if (pad) press(api, pad, e.x, e.y);
            });
            pointerClick(api, { selector: 'button:not(.drum-pad), a[href]' });
        },
    });

    /* ── 🎸 Air Guitar ──────────────────────────────────────── */
    G.register({
        id: 'guitar', match: /^\/music\/guitar\/?$/, title: 'Air Guitar',
        help: [['🫲', 'Left hand: hover a chord to select it'], ['🫱', 'Right hand: strum up or down to play'], ['🤏', 'One hand: pinch a chord to strum it']],
        init(api) {
            let selected = null, fretId = null, hands = [];
            const select = el => {
                if (el === selected) return;
                if (selected) selected.classList.remove('va-g-selected');
                selected = el; if (el) el.classList.add('va-g-selected');
            };
            api.on('hands', hs => {
                hands = hs;
                if (!hs.length) return;
                const fret = hs.length > 1 ? hs.reduce((a, b) => (a.cursor.x < b.cursor.x ? a : b)) : hs[0];
                fretId = hs.length > 1 ? fret.id : null;
                const el = api.elementAt(fret.cursor.x, fret.cursor.y);
                const chord = (el && el.closest('.chord-btn')) || api.nearest('.chord-btn', fret.cursor.x, fret.cursor.y, 60);
                if (chord) select(chord);
            });
            api.on('strike', e => {
                if (fretId !== null && e.hand === fretId) return;        // the fretting hand never strums
                if (selected) press(api, selected);
            });
            api.on('pinchend', e => {
                if (!e.tap) return;
                const el = api.elementAt(e.x, e.y);
                const chord = el && el.closest('.chord-btn');
                if (chord) { select(chord); press(api, chord, e.x, e.y); }
                else if (el && el.closest('button, a[href]')) api.press(el.closest('button, a[href]'), e.x, e.y);
            });
            this._cleanup = () => select(null);
        },
        destroy() { this._cleanup && this._cleanup(); },
    });

    /* ── 🎼 Harmony ─────────────────────────────────────────── */
    G.register({
        id: 'harmony', match: /^\/music\/harmony\/?$/, title: 'Harmony gestures',
        help: [['☝️', 'Point at a chord'], ['🤏', 'Pinch to play it / press buttons'], ['👉', 'Palm swipe right: play progression'], ['👈', 'Palm swipe left: analyze melody']],
        init(api) {
            pointerClick(api);
            api.on('swipe', e => {
                if (e.dir === 'right') { const b = document.getElementById('btnPlayProg'); if (b && b.offsetParent) { api.press(b); api.toast('▶ Progression'); } }
                if (e.dir === 'left') { const b = document.getElementById('btnAnalyze'); if (b) { api.press(b); api.toast('Analyze'); } }
            });
        },
    });

    /* ── 🥢 Rhythm training ─────────────────────────────────── */
    G.register({
        id: 'rhythm', match: /^\/music\/rhythm-training\/?$/, title: 'Rhythm training',
        help: [['⬇️', 'Chop down on the beat to tap'], ['👉', 'Palm swipe right: start / stop'], ['🤏', 'Pinch to press buttons']],
        init(api) {
            const zone = document.getElementById('tapZone');
            api.on('strike', e => { if (e.dir === 'down' && zone) press(api, zone); });
            api.on('swipe', e => { if (e.dir === 'right') { const b = document.getElementById('btnStart'); if (b) api.press(b); } });
            pointerClick(api, { selector: 'button, a[href], .rt-mode-btn' });
        },
    });

    /* ── 🎛️ Beat maker ──────────────────────────────────────── */
    G.register({
        id: 'beatmaker', match: /^\/music\/beat-maker\/?$/, title: 'Beat maker',
        help: [['☝️', 'Point at a step'], ['🤏', 'Pinch to toggle — pinch & drag to paint steps'], ['👉', 'Palm swipe right: play / pause'], ['👈', 'Palm swipe left: stop']],
        init(api) {
            let painted = new Set(), painting = false;
            const cellAt = (x, y) => { const el = api.elementAt(x, y); return el && el.closest('.beat-cell'); };
            api.on('pinchstart', e => {
                const c = cellAt(e.x, e.y);
                painting = !!c; painted = new Set();
                if (c) { c.click(); api.flash(c); painted.add(c); }
            });
            api.on('pinchmove', e => {
                if (!painting) return;
                const c = cellAt(e.x, e.y);
                if (c && !painted.has(c)) { c.click(); api.flash(c); painted.add(c); }
            });
            api.on('pinchend', () => { painting = false; });
            pointerClick(api, { selector: CLICKABLE, skipTap: e => !!cellAt(e.x, e.y) });
            api.on('swipe', e => {
                if (e.dir === 'right') { const b = document.getElementById('btnPlay'); if (b) { b.click(); api.toast('Play / pause'); } }
                if (e.dir === 'left') { const b = document.getElementById('btnStop'); if (b) { b.click(); api.toast('Stop'); } }
            });
        },
    });

    /* ── 🖌️ Air Paint (drawing studio) ──────────────────────── */
    G.register({
        id: 'drawing', match: /^\/drawing\/?$/, title: 'Air Paint',
        help: [['☝️', 'Point (index only) to paint'], ['✊', 'Fist: eraser'], ['🖐️', 'Open palm: brush'], ['✌️', 'Spread two fingers: brush size'], ['👈', 'Palm swipe left: undo · right: redo'], ['🤏', 'Pinch to pick colours & tools']],
        init(api) {
            const canvas = document.getElementById('drawingCanvas');
            if (!canvas) return;
            const tool = name => { const b = document.querySelector(`[data-tool="${name}"]`); if (b && !b.classList.contains('active')) { b.click(); api.toast(name === 'eraser' ? 'Eraser' : 'Brush'); } };
            airPen(api, canvas, {
                onPose: e => { if (e.pose === 'fist') tool('eraser'); if (e.pose === 'palm') tool('brush'); },
            });
            api.on('hands', hands => hands.forEach(h => {
                if (h.pose !== 'victory') return;
                const slider = document.getElementById('brushSize'); if (!slider) return;
                const spread = Math.hypot(h.tips.index.x - h.tips.middle.x, h.tips.index.y - h.tips.middle.y);
                const v = Math.round(Math.min(40, Math.max(1, spread / 4)));
                if (String(v) !== slider.value) { slider.value = v; slider.dispatchEvent(new Event('input', { bubbles: true })); }
            }));
            api.on('swipe', e => {
                if (e.dir === 'left') { const b = document.getElementById('btnUndo'); if (b) { b.click(); api.toast('Undo'); } }
                if (e.dir === 'right') { const b = document.getElementById('btnRedo'); if (b) { b.click(); api.toast('Redo'); } }
            });
            pointerClick(api, { skip: h => h.pose === 'point' && inside(canvas, h.cursor.x, h.cursor.y) });
        },
    });

    /* ── 🟪 Pixel art ───────────────────────────────────────── */
    G.register({
        id: 'pixelart', match: /^\/pixelart\/?$/, title: 'Air Pixel art',
        help: [['☝️', 'Point (index only) to paint cells'], ['🤏', 'Pinch a swatch or tool to select it'], ['🖐️', 'Swipe up / down to scroll']],
        init(api) {
            const canvas = document.getElementById('pixelCanvas');
            if (!canvas) return;
            airPen(api, canvas);
            pointerClick(api, { skip: h => h.pose === 'point' && inside(canvas, h.cursor.x, h.cursor.y) });
            swipeScroll(api);
        },
    });

    /* ── 🧊 3D shape builder ────────────────────────────────── */
    G.register({
        id: 'shapes3d', match: /^\/shapes3d(\/edit\/\d+)?\/?$/, title: '3D gestures',
        help: [['🤏', 'Pinch & drag: orbit the camera'], ['🤏🤏', 'Two-hand pinch apart / together: zoom'], ['👆', 'Quick pinch on a shape: select it'], ['✊', 'Fist: deselect'], ['👈', 'Palm swipe left: undo · right: redo'], ['✌️', 'Victory: focus selected shape']],
        init(api) {
            const sb = () => window.VAShapeBuilder;
            const pinches = new Map();            // hand → last cursor
            let lastTwoDist = null;
            const viewport = document.getElementById('sb-viewport');
            api.on('pinchstart', e => pinches.set(e.hand, { x: e.x, y: e.y }));
            api.on('pinchmove', e => {
                const prev = pinches.get(e.hand); if (!prev || !sb()) return;
                if (pinches.size >= 2) {
                    const pts = [...pinches.entries()].map(([k, v]) => (k === e.hand ? { x: e.x, y: e.y } : v));
                    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                    if (lastTwoDist) sb().zoom(lastTwoDist / Math.max(20, d));
                    lastTwoDist = d;
                } else if (inside(viewport, prev.x, prev.y)) {
                    sb().orbit((e.x - prev.x) * 0.008, (e.y - prev.y) * 0.008);
                }
                pinches.set(e.hand, { x: e.x, y: e.y });
            });
            api.on('pinchend', e => {
                pinches.delete(e.hand); if (pinches.size < 2) lastTwoDist = null;
                if (!e.tap) return;
                if (inside(viewport, e.x, e.y) && sb()) {
                    const name = sb().pickAt(e.x, e.y);
                    if (name) api.toast('Selected ' + name);
                } else {
                    const el = api.elementAt(e.x, e.y);
                    const t = el && el.closest(CLICKABLE);
                    if (t) api.press(t, e.x, e.y);
                }
            });
            api.on('pose', e => {
                if (!sb()) return;
                if (e.pose === 'fist' && sb().selectedName) { sb().deselect(); api.toast('Deselected'); }
                if (e.pose === 'victory' && sb().selectedName) { sb().focusSelected(); api.toast('Focus'); }
            });
            api.on('swipe', e => {
                if (!sb()) return;
                if (e.dir === 'left') sb().undo();
                if (e.dir === 'right') sb().redo();
            });
            api.on('hands', hands => hands.forEach(h => {
                const el = !inside(viewport, h.cursor.x, h.cursor.y) && api.elementAt(h.cursor.x, h.cursor.y);
                api.hover(h.id, el ? el.closest(CLICKABLE) : null);
            }));
            api.on('handlost', e => { pinches.delete(e.hand); lastTwoDist = null; api.hover(e.hand, null); });
        },
    });

    /* ── 🏛️ Museum ──────────────────────────────────────────── */
    G.register({
        id: 'museum', match: /^\/museum\/?$/, title: 'Museum gestures',
        help: [['🤏', 'Pinch an artwork to open it'], ['👈', 'Palm swipe left / right: next / previous artwork'], ['🤏🤏', 'Two-hand pinch: zoom the artwork'], ['✊', 'Fist: close'], ['🖐️', 'Swipe up / down to scroll']],
        init(api) {
            const modal = () => document.getElementById('artworkModal');
            const isOpen = () => modal() && modal().style.display !== 'none';
            const ids = () => [...new Set([...document.querySelectorAll('[onclick*="openArtwork("]')]
                .map(el => (el.getAttribute('onclick').match(/openArtwork\((\d+)\)/) || [])[1]).filter(Boolean).map(Number))];
            let current = null, zoom = 1, lastTwo = null;
            const pinches = new Map();
            const orig = window.openArtwork;
            if (typeof orig === 'function') {
                window.openArtwork = function (id) { current = Number(id); zoom = 1; return orig.apply(this, arguments); };
                this._restore = () => { window.openArtwork = orig; };
            }
            const step = d => {
                const list = ids(); if (!list.length) return;
                const i = list.indexOf(current);
                const next = list[(i + d + list.length) % list.length];
                window.openArtwork(next); api.toast(d > 0 ? 'Next ▶' : '◀ Previous');
            };
            pointerClick(api, { skipTap: () => pinches.size > 1 });
            api.on('swipe', e => {
                if (isOpen()) { if (e.dir === 'left') step(1); if (e.dir === 'right') step(-1); return; }
                if (e.dir === 'up') window.scrollBy({ top: innerHeight * 0.7, behavior: 'smooth' });
                if (e.dir === 'down') window.scrollBy({ top: -innerHeight * 0.7, behavior: 'smooth' });
            });
            api.on('pose', e => { if (e.pose === 'fist' && isOpen() && typeof window.closeArtwork === 'function') { window.closeArtwork(); api.toast('Closed'); } });
            api.on('pinchstart', e => pinches.set(e.hand, e));
            api.on('pinchmove', e => {
                pinches.set(e.hand, e);
                if (pinches.size < 2 || !isOpen()) return;
                const [a, b] = [...pinches.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (lastTwo) {
                    zoom = Math.min(4, Math.max(1, zoom * d / lastTwo));
                    const img = modal().querySelector('#modalContent img');
                    if (img) { img.style.transform = `scale(${zoom})`; img.style.transition = 'transform .05s'; }
                }
                lastTwo = d;
            });
            api.on('pinchend', e => { pinches.delete(e.hand); lastTwo = null; });
        },
        destroy() { this._restore && this._restore(); },
    });

    /* ── 📖 Story reader ────────────────────────────────────── */
    G.register({
        id: 'story', match: /^\/story\/\d+\/?$/, title: 'Story reader',
        help: [['👈', 'Palm swipe left: next chapter'], ['👉', 'Palm swipe right: previous chapter'], ['🖐️', 'Swipe up / down to scroll'], ['🤏', 'Pinch to press buttons']],
        init(api) {
            const go = d => {
                const blocks = [...document.querySelectorAll('.chapter-block')]; if (!blocks.length) return;
                const tops = blocks.map(b => b.getBoundingClientRect().top);
                let idx = tops.findIndex(t => t > 120);                // first chapter below the reading line
                idx = idx === -1 ? blocks.length : idx;
                const cur = idx - 1;                                   // chapter currently being read
                const target = d > 0 ? Math.min(blocks.length - 1, idx) : Math.max(0, cur - (tops[Math.max(cur, 0)] > -40 ? 1 : 0));
                blocks[target].scrollIntoView({ behavior: 'smooth', block: 'start' });
                api.toast(`Chapter ${target + 1} / ${blocks.length}`);
            };
            pointerClick(api);
            api.on('swipe', e => {
                if (e.dir === 'left') go(1);
                if (e.dir === 'right') go(-1);
                if (e.dir === 'up') window.scrollBy({ top: innerHeight * 0.7, behavior: 'smooth' });
                if (e.dir === 'down') window.scrollBy({ top: -innerHeight * 0.7, behavior: 'smooth' });
            });
        },
    });

    /* ── 📰 Feed ────────────────────────────────────────────── */
    G.register({
        id: 'feed', match: /^\/feed\/?$/, title: 'Feed gestures',
        help: [['🖐️', 'Swipe up: next post · down: previous'], ['👍', 'Thumbs-up: like the post in view'], ['🤏', 'Pinch to press buttons']],
        init(api) {
            const posts = () => [...document.querySelectorAll('.like-btn')].map(b => b.closest('.feed-card, .card, article') || b.parentElement.parentElement);
            const centered = () => {
                const mid = innerHeight / 2; let best = null, bd = Infinity;
                document.querySelectorAll('.like-btn').forEach(b => {
                    const card = b.closest('.feed-card, .card, article') || b.parentElement.parentElement;
                    const r = card.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
                    const d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = b; }
                });
                return best;
            };
            const scrollPost = d => {
                const list = posts(); if (!list.length) return;
                const tops = list.map(p => p.getBoundingClientRect().top);
                let i = d > 0 ? tops.findIndex(t => t > 90) : tops.map((t, k) => (t < 70 ? k : -1)).filter(k => k >= 0).pop();
                if (i === undefined || i < 0) i = d > 0 ? list.length - 1 : 0;
                window.scrollTo({ top: window.scrollY + list[i].getBoundingClientRect().top - 80, behavior: 'smooth' });
            };
            let lastLike = -Infinity;
            api.on('pose', e => {
                if (e.pose !== 'thumbsup' || performance.now() - lastLike < 1500) return;
                const btn = centered(); if (!btn) return;
                lastLike = performance.now(); btn.click(); api.flash(btn); api.toast('👍 Liked');
            });
            api.on('swipe', e => { if (e.dir === 'up') scrollPost(1); if (e.dir === 'down') scrollPost(-1); });
            pointerClick(api);
        },
    });
})();
