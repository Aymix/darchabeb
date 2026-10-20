/**
 * VirtuArts — Face ID (webcam face match) client
 * ------------------------------------------------------------------
 * Uses face-api.js (@vladmandic/face-api) in the browser to turn camera frames into
 * a 128-number face template. Photos/video are never uploaded — only the template.
 * The match decision is made on the server (FaceAuthService).
 *
 * A blink is required before a template is accepted, so a printed photo can't be used.
 *
 *   VAFaceAuth.capture({ video, samples, onStatus, timeoutMs }) → Promise<number[][]>
 *   VAFaceAuth.stop()
 *   VAFaceAuth.createBlinkDetector()  (pure state machine, exported for tests)
 */
(function () {
    'use strict';
    if (window.VAFaceAuth) return;

    const VERSION = '1.7.15';
    const SOURCES = [
        { lib: '/vendor/face-api/face-api.esm.js', models: '/vendor/face-api/model' },                // optional self-hosted copy
        { lib: `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}/dist/face-api.esm.js`,
          models: `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}/model` },
    ];

    let faceapi = null, loading = null, stream = null;

    async function load() {
        if (faceapi) return faceapi;
        if (loading) return loading;
        loading = (async () => {
            let lastErr;
            for (const src of SOURCES) {
                try {
                    if (src.lib.startsWith('/')) { const h = await fetch(src.lib, { method: 'HEAD' }); if (!h.ok) continue; }
                    const api = await import(src.lib);
                    await api.tf.ready();
                    await Promise.all([
                        api.nets.tinyFaceDetector.loadFromUri(src.models),
                        api.nets.faceLandmark68Net.loadFromUri(src.models),
                        api.nets.faceRecognitionNet.loadFromUri(src.models),
                    ]);
                    faceapi = api;
                    return api;
                } catch (e) { lastErr = e; console.warn('[face-auth] source failed', src.lib, e); }
            }
            loading = null;
            throw lastErr || new Error('Face recognition could not be loaded');
        })();
        return loading;
    }

    async function startCamera(video) {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use the camera.');
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
        video.srcObject = stream;
        video.muted = true; video.playsInline = true;
        await video.play();
    }

    function stop() {
        if (stream) stream.getTracks().forEach(t => t.stop());
        stream = null;
    }

    /* ── liveness: blink detection on eye aspect ratio (EAR) ───────────── */
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    function eyeAspectRatio(eye) {           // 6 points, p1..p6 (dlib order)
        return (d(eye[1], eye[5]) + d(eye[2], eye[4])) / (2 * d(eye[0], eye[3]));
    }

    function createBlinkDetector() {
        // baseline = typical open-eye EAR for this face; only learned while the eyes are open
        let baseline = 0, state = 'open', closedAt = 0, openFrames = 0;
        return {
            /** feed one EAR sample; returns true once when a full open → closed → open blink is seen */
            update(ear, t) {
                if (state === 'open') {
                    if (openFrames > 3 && ear < baseline * 0.75) { state = 'closed'; closedAt = t; return false; }
                    baseline = baseline ? baseline * 0.9 + ear * 0.1 : ear;
                    openFrames++;
                    return false;
                }
                const reopened = ear > baseline * 0.85;
                if (state === 'closed' && t - closedAt > 2000) state = 'reset';          // eyes closed too long → not a blink
                if (state === 'reset') { if (reopened) { state = 'open'; openFrames = 0; } return false; }
                if (reopened) { state = 'open'; openFrames = 0; return true; }
                return false;
            },
            get baseline() { return baseline; },
        };
    }

    /**
     * Capture `samples` face templates from the camera after a blink.
     * Rejects if no single, clear face is seen in time.
     */
    async function capture({ video, samples = 1, onStatus = () => {}, timeoutMs = 30000 } = {}) {
        onStatus('loading', 'Loading face recognition…');
        const api = await load();
        if (!video.srcObject) { onStatus('loading', 'Starting camera…'); await startCamera(video); }
        const opts = new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
        const blink = createBlinkDetector();
        const start = performance.now();
        let blinked = false, lastSample = 0;
        const out = [];
        onStatus('scan', 'Look at the camera and blink');

        while (performance.now() - start < timeoutMs) {
            const faces = await api.detectAllFaces(video, opts).withFaceLandmarks().withFaceDescriptors();
            const t = performance.now();
            if (faces.length === 0) { onStatus('scan', 'No face found — move into the frame'); await frame(); continue; }
            if (faces.length > 1) { onStatus('scan', 'Only one person in front of the camera, please'); await frame(); continue; }
            const f = faces[0];
            if (f.detection.box.width < video.videoWidth * 0.18) { onStatus('scan', 'Come a little closer'); await frame(); continue; }
            if (f.detection.score < 0.6) { onStatus('scan', 'Improve the lighting on your face'); await frame(); continue; }

            const ear = (eyeAspectRatio(f.landmarks.getLeftEye()) + eyeAspectRatio(f.landmarks.getRightEye())) / 2;
            if (!blinked) {
                if (blink.update(ear, t)) { blinked = true; onStatus('scan', 'Got it — hold still…'); }
                else onStatus('scan', 'Look at the camera and blink');
            } else if (ear > blink.baseline * 0.8 && t - lastSample > 150) {     // eyes open, spaced samples
                out.push(Array.from(f.descriptor));
                lastSample = t;
                onStatus('scan', samples > 1 ? `Capturing… ${out.length}/${samples}` : 'Checking…');
                if (out.length >= samples) { onStatus('done', 'Face captured'); return out; }
            }
            await frame();
        }
        throw new Error('Timed out — make sure your face is well lit and blink once.');
    }

    const frame = () => new Promise(r => requestAnimationFrame(() => r()));

    window.VAFaceAuth = { load, capture, stop, startCamera, createBlinkDetector, eyeAspectRatio };
})();
