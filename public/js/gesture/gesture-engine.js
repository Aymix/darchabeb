/**
 * VirtuArts — Hand Gesture Engine
 * ------------------------------------------------------------------
 * Webcam hand tracking with Google MediaPipe Hand Landmarker (runs fully
 * in the browser; video never leaves the device). Turns raw landmarks into
 * high-level gestures that module adapters (gesture-modules.js) consume.
 *
 * Gestures / events emitted:
 *   hands      every frame: [{ id, pose, pinch, cursor:{x,y}, tips:{thumb,index,middle,ring,pinky}, landmarks, size }]
 *   pose       { hand, pose, prev }                 stable pose change
 *   pinchstart / pinchmove / pinchend { hand, x, y } (pinchend has .tap = quick pinch)
 *   swipe      { hand, dir: left|right|up|down }    fast open-palm sweep
 *   strike     { hand, x, y, dir: down|up, speed }  fast whole-hand chop (drums, strum)
 *   fingertap  { hand, finger, x, y }               single fingertip dips (air piano)
 *   handlost   { hand }
 *
 * Public API: window.VAGesture
 *   register(adapter)  adapter = { id, match:RegExp|fn, title, help:[[icon,text]], cursor:'index'|'tips', init(api), destroy() }
 *   start() / stop() / toggle() / isRunning()
 *   feed(hands)        inject landmark frames (same format as MediaPipe result.landmarks, plus optional handedness) — used by tests
 */
(function () {
    'use strict';
    if (window.VAGesture) return;

    const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '/js/gesture/gesture-engine.js';
    const ROOT = new URL('../../', SCRIPT_SRC).pathname.replace(/\/$/, '');          // app public root
    // MediaPipe runtime: self-hosted copy in public/vendor/mediapipe if present (npm @mediapipe/tasks-vision@1.1.1:
    // vision_bundle.mjs + wasm/), otherwise the official npm build via jsDelivr. Model: self-hosted or Google's CDN.
    const MP_VERSION = '1.1.1';
    const MP_BASES = [ROOT + '/vendor/mediapipe', `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`];
    const MODEL_URLS = [
        ROOT + '/vendor/mediapipe/hand_landmarker.task',
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    ];
    const STORE_KEY = 'va-gestures-on';

    /* ───────────────────────── event bus ───────────────────────── */
    const listeners = {};
    function on(evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); return () => off(evt, cb); }
    function off(evt, cb) { listeners[evt] = (listeners[evt] || []).filter(f => f !== cb); }
    function emit(evt, data) {
        (listeners[evt] || []).slice().forEach(cb => { try { cb(data); } catch (e) { console.error('[gesture]', evt, e); } });
        if (window.__vaGestureLog) window.__vaGestureLog.push({ evt, data: summarize(data) });
    }
    function summarize(d) { if (!d || typeof d !== 'object') return d; const o = {}; for (const k in d) if (typeof d[k] !== 'object') o[k] = d[k]; return o; }

    /* ───────────────────────── geometry helpers ───────────────────────── */
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const TIP = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
    const PIP = { index: 6, middle: 10, ring: 14, pinky: 18 };
    const MCP = { thumb: 2, index: 5, middle: 9, ring: 13, pinky: 17 };
    const now = () => performance.now();

    // camera space (0..1, mirrored like a selfie) → viewport pixels, with a margin so the edges are reachable
    const MARGIN = 0.12;
    function toScreen(p) {
        const nx = Math.min(1, Math.max(0, (p.x - MARGIN) / (1 - 2 * MARGIN)));
        const ny = Math.min(1, Math.max(0, (p.y - MARGIN) / (1 - 2 * MARGIN)));
        return { x: nx * window.innerWidth, y: ny * window.innerHeight };
    }

    /* ───────────────────────── per-hand tracker ───────────────────────── */
    const POSE_FRAMES = 3;            // frames a pose must persist before it becomes "stable"
    const tracks = [];                // persistent hand tracks across frames
    let nextId = 1;

    function newTrack(wrist) {
        return {
            id: nextId++, wrist, pose: 'none', candidate: 'none', candCount: 0,
            pinching: false, pinchStartT: 0, pinchStartPos: null, cursor: null,
            hist: [], tipHist: { thumb: [], index: [], middle: [], ring: [], pinky: [] },
            lastSwipe: 0, lastStrike: 0, strikePeak: null, tipState: {}, seen: now(),
        };
    }

    function classify(lm, size) {
        const ext = {};
        for (const f of ['index', 'middle', 'ring', 'pinky']) {
            ext[f] = dist(lm[TIP[f]], lm[0]) > dist(lm[PIP[f]], lm[0]) * 1.15;
        }
        ext.thumb = dist(lm[4], lm[17]) / size > 0.95 && dist(lm[4], lm[5]) / size > 0.45;
        const n = ext.index + ext.middle + ext.ring + ext.pinky;
        const pinchRatio = dist(lm[4], lm[8]) / size;
        const thumbUp = ext.thumb && n === 0 && lm[4].y < lm[3].y && lm[4].y < lm[5].y - 0.35 * size;
        let pose;
        if (thumbUp) pose = 'thumbsup';
        else if (n === 4 && pinchRatio > 0.5) pose = 'palm';            // thumb position varies a lot on real open hands
        else if (n === 0) pose = 'fist';
        else if (ext.index && n === 1) pose = 'point';
        else if (ext.index && ext.middle && n === 2) pose = 'victory';
        else pose = 'other';
        return { ext, pose, pinchRatio };
    }

    function matchTracks(hands) {
        const used = new Set();
        const assigned = hands.map(lm => {
            let best = null, bestD = 0.25;
            tracks.forEach(t => { if (used.has(t)) return; const d = dist(t.wrist, lm[0]); if (d < bestD) { bestD = d; best = t; } });
            if (!best) { best = newTrack(lm[0]); tracks.push(best); }
            used.add(best);
            return best;
        });
        for (let i = tracks.length - 1; i >= 0; i--) {
            if (!used.has(tracks[i])) { emitLost(tracks[i]); tracks.splice(i, 1); }
        }
        return assigned;
    }

    function emitLost(t) {
        if (t.pinching) emit('pinchend', { hand: t.id, x: t.cursor?.x ?? 0, y: t.cursor?.y ?? 0, tap: false });
        if (t.pose !== 'none') emit('pose', { hand: t.id, pose: 'none', prev: t.pose });
        emit('handlost', { hand: t.id });
    }

    function pushHist(arr, item, ms) { arr.push(item); while (arr.length && item.t - arr[0].t > ms) arr.shift(); }

    function processFrame(rawHands, t) {
        t = t ?? now();
        const hands = rawHands.map(lm => lm.map(p => ({ x: 1 - p.x, y: p.y, z: p.z || 0 })));   // mirror → selfie view
        const ts = matchTracks(hands);
        const out = [];

        hands.forEach((lm, i) => {
            const tr = ts[i];
            tr.wrist = lm[0];
            const size = Math.max(0.02, dist(lm[0], lm[9]));
            const { pose, pinchRatio } = classify(lm, size);
            const indexOut = dist(lm[8], lm[0]) / size > 1.15;     // a closed fist is not a pinch

            // pinch with hysteresis
            const wasPinching = tr.pinching;
            if (!tr.pinching && pinchRatio < 0.32 && indexOut) tr.pinching = true;
            else if (tr.pinching && pinchRatio > 0.48) tr.pinching = false;

            // cursor: index tip (or pinch midpoint while pinching), smoothed
            const raw = tr.pinching ? { x: (lm[4].x + lm[8].x) / 2, y: (lm[4].y + lm[8].y) / 2 } : lm[8];
            const sp = toScreen(raw);
            tr.cursor = tr.cursor ? { x: tr.cursor.x * 0.45 + sp.x * 0.55, y: tr.cursor.y * 0.45 + sp.y * 0.55 } : sp;

            // stable pose
            const effPose = tr.pinching ? 'pinch' : pose;
            if (effPose === tr.candidate) tr.candCount++; else { tr.candidate = effPose; tr.candCount = 1; }
            if (tr.candCount >= POSE_FRAMES && tr.pose !== tr.candidate) {
                const prev = tr.pose; tr.pose = tr.candidate;
                tr.hist.length = 0; tr.strikePeak = null;         // motion gestures are measured within one pose
                emit('pose', { hand: tr.id, pose: tr.pose, prev, x: tr.cursor.x, y: tr.cursor.y });
            }

            // pinch events
            if (tr.pinching && !wasPinching) {
                tr.pinchStartT = t; tr.pinchStartPos = { ...tr.cursor };
                emit('pinchstart', { hand: tr.id, x: tr.cursor.x, y: tr.cursor.y });
            } else if (tr.pinching) {
                emit('pinchmove', { hand: tr.id, x: tr.cursor.x, y: tr.cursor.y });
            } else if (!tr.pinching && wasPinching) {
                const moved = tr.pinchStartPos ? dist(tr.pinchStartPos, tr.cursor) : 0;
                emit('pinchend', { hand: tr.id, x: tr.cursor.x, y: tr.cursor.y, tap: t - tr.pinchStartT < 600 && moved < 60 });
            }

            // motion history (palm centre = landmark 9), normalized units
            const palm = lm[9];
            pushHist(tr.hist, { t, x: palm.x, y: palm.y }, 450);
            detectSwipe(tr, pose, t);
            detectStrike(tr, t, lm);
            detectFingerTaps(tr, lm, size, t);

            const tips = {};
            for (const f in TIP) tips[f] = toScreen(lm[TIP[f]]);
            out.push({ id: tr.id, pose: tr.pose, rawPose: pose, pinch: tr.pinching, cursor: { ...tr.cursor }, tips, landmarks: lm, size });
        });

        state.hands = out;
        emit('hands', out);
        renderOverlay(out);
    }

    function detectSwipe(tr, pose, t) {
        if (pose !== 'palm' || t - tr.lastSwipe < 750 || tr.hist.length < 3) return;
        const a = tr.hist[0], b = tr.hist[tr.hist.length - 1];
        const dt = (b.t - a.t) / 1000; if (dt <= 0.05) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        let dir = null;
        if (Math.abs(dx) > 0.22 && Math.abs(dy) < Math.abs(dx) * 0.7) dir = dx < 0 ? 'left' : 'right';
        else if (Math.abs(dy) > 0.22 && Math.abs(dx) < Math.abs(dy) * 0.7) dir = dy < 0 ? 'up' : 'down';
        if (!dir) return;
        tr.lastSwipe = t; tr.hist.length = 0;
        emit('swipe', { hand: tr.id, dir });
    }

    // whole-hand chop: vertical speed peaks above threshold then drops → strike at peak
    function detectStrike(tr, t, lm) {
        const h = tr.hist; if (h.length < 3) return;
        const p = h[h.length - 1], q = h[h.length - 3];
        const dt = (p.t - q.t) / 1000; if (dt <= 0) return;
        const vy = (p.y - q.y) / dt;                       // normalized units / s (positive = down)
        const speed = Math.abs(vy);
        if (speed > 1.4) {
            if (!tr.strikePeak || speed > tr.strikePeak.speed) tr.strikePeak = { speed, dir: vy > 0 ? 'down' : 'up', x: tr.cursor.x, y: tr.cursor.y };
        } else if (tr.strikePeak && speed < tr.strikePeak.speed * 0.45) {
            if (t - tr.lastStrike > 160) {
                tr.lastStrike = t;
                // the hit lands where the motion stops (bottom of a chop), like a real drumstick
                emit('strike', { hand: tr.id, ...tr.strikePeak, x: tr.cursor.x, y: tr.cursor.y });
            }
            tr.strikePeak = null;
        }
    }

    // a fingertip moving quickly down relative to its knuckle → fingertap (air piano)
    function detectFingerTaps(tr, lm, size, t) {
        for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
            const rel = (lm[TIP[f]].y - lm[MCP[f]].y) / size;   // grows when the finger bends down
            const hist = tr.tipHist[f];
            pushHist(hist, { t, rel }, 300);
            const st = tr.tipState[f] || (tr.tipState[f] = { down: false, last: 0 });
            if (hist.length < 2) continue;
            const a = hist[0];
            const drop = rel - a.rel;                             // positive = moved down
            if (!st.down && drop > 0.35 && t - st.last > 140) {
                st.down = true; st.last = t;
                const sp = toScreen(lm[TIP[f]]);
                emit('fingertap', { hand: tr.id, finger: f, x: sp.x, y: sp.y });
                hist.length = 0;
            } else if (st.down && drop < 0.05) {
                st.down = false;
            }
        }
    }

    /* ───────────────────────── MediaPipe runtime ───────────────────────── */
    let landmarker = null, video = null, stream = null, rafId = 0, lastVideoTime = -1, running = false, starting = false;

    async function loadLandmarker() {
        let vision = null, base = null;
        for (const b of MP_BASES) {
            try {
                if (b.startsWith('/')) { const h = await fetch(b + '/vision_bundle.mjs', { method: 'HEAD' }); if (!h.ok) continue; }
                vision = await import(b + '/vision_bundle.mjs'); base = b; break;
            } catch (e) { console.warn('[gesture] MediaPipe not available from', b, e); }
        }
        if (!vision) throw new Error('Could not load MediaPipe');
        const fileset = await vision.FilesetResolver.forVisionTasks(base + '/wasm');
        let lastErr;
        for (const url of MODEL_URLS) {
            try {
                if (url.startsWith('/')) { const h = await fetch(url, { method: 'HEAD' }); if (!h.ok) continue; }
                for (const delegate of ['GPU', 'CPU']) {
                    try {
                        return await vision.HandLandmarker.createFromOptions(fileset, {
                            baseOptions: { modelAssetPath: url, delegate },
                            runningMode: 'VIDEO', numHands: 2,
                            minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.5,
                        });
                    } catch (e) { lastErr = e; }
                }
            } catch (e) { lastErr = e; }
        }
        throw lastErr || new Error('Hand model unavailable');
    }

    async function start() {
        if (running || starting) return;
        starting = true; setStatus('loading', 'Starting camera…');
        try {
            if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported in this browser');
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
            video = ui.video; video.srcObject = stream; await video.play();
            setStatus('loading', 'Loading hand model…');
            landmarker = landmarker || await loadLandmarker();
            running = true; starting = false;
            store(true);
            ui.root.classList.add('va-g-on');
            setStatus('on', 'Show your hand to the camera');
            loop();
            activateAdapter();
        } catch (e) {
            starting = false;
            console.error('[gesture] start failed', e);
            setStatus('error', e.name === 'NotAllowedError' ? 'Camera permission denied' : (e.message || 'Could not start'));
            cleanupStream();
        }
    }

    function loop() {
        if (!running) return;
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            try {
                const res = landmarker.detectForVideo(video, now());
                processFrame(res.landmarks || []);
                if ((res.landmarks || []).length) setStatus('on', state.adapterTitle || 'Tracking');
            } catch (e) { console.error('[gesture] detect', e); }
        }
        rafId = requestAnimationFrame(loop);
    }

    function cleanupStream() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; if (video) video.srcObject = null; }

    function stop() {
        running = false; cancelAnimationFrame(rafId); cleanupStream();
        tracks.splice(0).forEach(emitLost);
        state.hands = []; renderOverlay([]);
        ui.root.classList.remove('va-g-on');
        store(false); setStatus('off', 'Gestures off');
        deactivateAdapter();
    }

    function store(v) { try { sessionStorage.setItem(STORE_KEY, v ? '1' : '0'); } catch (e) { /* storage unavailable */ } }
    function stored() { try { return sessionStorage.getItem(STORE_KEY) === '1'; } catch (e) { return false; } }

    /* ───────────────────────── adapters ───────────────────────── */
    const adapters = [];
    let active = null, adapterOffs = [];
    const state = { hands: [], adapterId: null, adapterTitle: '' };

    function register(adapter) { adapters.push(adapter); renderHelp(); }

    function pickAdapter() {
        const path = location.pathname;
        return adapters.find(a => a.match && (a.match instanceof RegExp ? a.match.test(path) : a.match(path)))
            || adapters.find(a => a.id === 'generic') || null;
    }

    const api = {
        on(evt, cb) { const o = on(evt, cb); adapterOffs.push(o); return o; },
        toScreen,
        state,
        elementAt(x, y) {
            // ignore the gesture overlay (preview panel, cursors) so controls underneath stay reachable
            return document.elementsFromPoint(x, y).find(el => !el.closest('.va-g-ui')) || null;
        },
        mouse(el, type, x, y, extra) {
            if (!el) return;
            const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0, buttons: type === 'mouseup' ? 0 : 1, ...(extra || {}) };
            el.dispatchEvent(new MouseEvent(type, opts));
        },
        press(el, x, y) {           // full click sequence: mousedown → mouseup → click
            if (!el || !api.isSafe(el)) return false;
            const r = el.getBoundingClientRect();
            x = x ?? r.left + r.width / 2; y = y ?? r.top + r.height / 2;
            api.mouse(el, 'mousedown', x, y); api.mouse(el, 'mouseup', x, y);
            el.click();
            api.flash(el);
            return true;
        },
        isSafe(el) {
            // never trigger payments, deletions or destructive confirms by gesture
            if (el.closest('#paymentModal, [data-gesture-ignore]')) return false;
            const handler = el.closest('[onclick]');
            if (handler && /openPayment|processPayment|confirm\(/.test(handler.getAttribute('onclick') || '')) return false;
            const form = el.closest('form');
            if (form && /delete|remove/i.test(form.getAttribute('action') || '')) return false;
            if (/delete|remove|logout/i.test((el.className || '') + ' ' + (el.getAttribute('href') || ''))) return false;
            return true;
        },
        flash(el) { el.classList.add('va-g-flash'); setTimeout(() => el.classList.remove('va-g-flash'), 220); },
        hover(handId, el) {
            const prev = hoverEls.get(handId);
            if (prev === el) return;
            if (prev) prev.classList.remove('va-g-hover');
            if (el) el.classList.add('va-g-hover');
            hoverEls.set(handId, el);
        },
        clearHover() { hoverEls.forEach(el => el && el.classList.remove('va-g-hover')); hoverEls.clear(); },
        toast(msg) { showToast(msg); },
        nearest(selector, x, y, maxDist) {
            let best = null, bd = maxDist ?? Infinity;
            document.querySelectorAll(selector).forEach(el => {
                const r = el.getBoundingClientRect(); if (!r.width) return;
                const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
                const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = el; }
            });
            return best;
        },
    };
    const hoverEls = new Map();

    function activateAdapter() {
        deactivateAdapter();
        active = pickAdapter(); if (!active) return;
        state.adapterId = active.id; state.adapterTitle = active.title || '';
        ui.root.dataset.cursor = active.cursor || 'index';
        try { active.init && active.init(api); } catch (e) { console.error('[gesture] adapter init', e); }
        renderHelp();
    }
    function deactivateAdapter() {
        adapterOffs.splice(0).forEach(o => o()); api.clearHover();
        if (active && active.destroy) { try { active.destroy(); } catch (e) { console.error(e); } }
        active = null;
    }

    /* ───────────────────────── UI ───────────────────────── */
    const ui = {};
    function buildUI() {
        const root = document.createElement('div');
        root.className = 'va-g-ui';
        root.innerHTML = `
            <button type="button" class="va-g-toggle" aria-pressed="false" title="Hand gesture control (webcam)">
                <span class="va-g-icon">✋</span><span class="va-g-label">Gestures</span><span class="va-g-dot"></span>
            </button>
            <div class="va-g-panel" role="dialog" aria-label="Gesture control">
                <div class="va-g-video-wrap"><video class="va-g-video" playsinline muted></video><canvas class="va-g-skel"></canvas></div>
                <div class="va-g-status">Gestures off</div>
                <div class="va-g-help"></div>
                <div class="va-g-privacy">Processed on your device — video is never uploaded.</div>
            </div>
            <canvas class="va-g-cursors"></canvas>
            <div class="va-g-toast"></div>`;
        document.body.appendChild(root);
        Object.assign(ui, {
            root, btn: root.querySelector('.va-g-toggle'), panel: root.querySelector('.va-g-panel'),
            video: root.querySelector('.va-g-video'), skel: root.querySelector('.va-g-skel'),
            status: root.querySelector('.va-g-status'), help: root.querySelector('.va-g-help'),
            cursors: root.querySelector('.va-g-cursors'), toast: root.querySelector('.va-g-toast'),
        });
        ui.btn.addEventListener('click', () => toggle());
        const fit = () => { ui.cursors.width = innerWidth; ui.cursors.height = innerHeight; };
        fit(); addEventListener('resize', fit);
        renderHelp();
    }

    function setStatus(kind, text) {
        if (!ui.root) return;
        ui.root.dataset.status = kind; ui.status.textContent = text;
        ui.btn.setAttribute('aria-pressed', kind === 'on' ? 'true' : 'false');
    }

    function renderHelp() {
        if (!ui.help) return;
        const a = active || pickAdapter();
        if (!a) { ui.help.innerHTML = ''; return; }
        const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        ui.help.innerHTML = `<div class="va-g-help-title">${esc(a.title || 'Gestures')}</div>` +
            (a.help || []).map(([i, t]) => `<div class="va-g-help-row"><span>${esc(i)}</span><span>${esc(t)}</span></div>`).join('');
    }

    let toastTimer = 0;
    function showToast(msg) {
        if (!ui.toast) return;
        ui.toast.textContent = msg; ui.toast.classList.add('show');
        clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1100);
    }

    const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
    const POSE_ICON = { point: '☝️', pinch: '🤏', palm: '🖐️', fist: '✊', victory: '✌️', thumbsup: '👍', other: '', none: '' };

    function renderOverlay(hands) {
        if (!ui.cursors) return;
        // cursors over the page
        const c = ui.cursors.getContext('2d');
        c.clearRect(0, 0, ui.cursors.width, ui.cursors.height);
        const mode = ui.root.dataset.cursor;
        hands.forEach(h => {
            const pts = mode === 'tips' ? Object.values(h.tips) : [h.cursor];
            pts.forEach((p, i) => {
                c.beginPath(); c.arc(p.x, p.y, mode === 'tips' ? 9 : (h.pinch ? 10 : 14), 0, Math.PI * 2);
                c.fillStyle = h.pinch ? 'rgba(249,115,22,0.85)' : 'rgba(249,115,22,0.35)';
                c.strokeStyle = '#fff'; c.lineWidth = 2; c.fill(); c.stroke();
            });
            const icon = POSE_ICON[h.pose];
            if (icon) { c.font = '18px system-ui'; c.fillText(icon, h.cursor.x + 14, h.cursor.y - 12); }
        });
        // skeleton over preview
        if (ui.skel && ui.video && ui.root.classList.contains('va-g-on')) {
            const w = ui.skel.width = ui.skel.clientWidth, hgt = ui.skel.height = ui.skel.clientHeight;
            const s = ui.skel.getContext('2d');
            s.clearRect(0, 0, w, hgt); s.strokeStyle = '#f97316'; s.lineWidth = 2; s.fillStyle = '#fff';
            hands.forEach(h => {
                BONES.forEach(([a, b]) => { s.beginPath(); s.moveTo(h.landmarks[a].x * w, h.landmarks[a].y * hgt); s.lineTo(h.landmarks[b].x * w, h.landmarks[b].y * hgt); s.stroke(); });
                h.landmarks.forEach(p => { s.beginPath(); s.arc(p.x * w, p.y * hgt, 2, 0, 7); s.fill(); });
            });
        }
    }

    function toggle() { running || starting ? stop() : start(); }

    /* ───────────────────────── test / automation hook ───────────────────────── */
    function feed(hands, t) {
        if (!running) {                        // allow driving adapters without a camera (automated tests)
            running = true; ui.root.classList.add('va-g-on'); setStatus('on', 'Simulated input'); activateAdapter();
            running = 'sim';
        }
        processFrame(hands, t);
    }

    /* ───────────────────────── boot ───────────────────────── */
    function boot() {
        buildUI();
        if (stored()) start();
    }
    window.VAGesture = { register, start, stop, toggle, feed, on, isRunning: () => !!running, get state() { return state; }, _api: api };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
