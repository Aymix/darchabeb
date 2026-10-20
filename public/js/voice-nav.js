/**
 * VirtuArts — Global Voice Navigation
 * Speak "Hey VirtuAi" or click the mic to activate, then say commands like:
 *   "go to dashboard", "open piano", "open stories", "go to profile", etc.
 */
(function () {
    'use strict';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // Unsupported browser — silently skip

    /* ═══════════════════════════════════════
       ROUTE MAP — voice phrases → URLs
    ═══════════════════════════════════════ */
    const ROUTES = [
        /* ── Dashboard ── */
        { phrases: ['dashboard', 'go to dashboard', 'open dashboard', 'main page'], path: '/dashboard' },

        /* ── Music module (specific pages BEFORE generic "music") ── */
        { phrases: ['piano', 'open piano', 'play piano', 'go to piano'], path: '/music/piano' },
        { phrases: ['guitar', 'open guitar', 'play guitar', 'go to guitar'], path: '/music/guitar' },
        { phrases: ['drums', 'open drums', 'play drums', 'go to drums'], path: '/music/drums' },
        { phrases: ['beat maker', 'open beat maker', 'beats', 'make a beat', 'go to beat maker', 'beat'], path: '/music/beat-maker' },
        { phrases: ['harmony', 'open harmony', 'chord harmony', 'go to harmony'], path: '/music/harmony' },
        { phrases: ['rhythm training', 'open rhythm', 'rhythm', 'go to rhythm', 'rhythm trainer'], path: '/music/rhythm-training' },
        { phrases: ['recordings', 'open recordings', 'my recordings', 'go to recordings'], path: '/music/recordings' },
        { phrases: ['tracks', 'open tracks', 'music tracks', 'go to tracks', 'my tracks'], path: '/music/tracks' },
        { phrases: ['music', 'open music', 'music studio', 'go to music', 'acoustic'], path: '/music' },

        /* ── Story module ── */
        { phrases: ['new story', 'create story', 'write new story', 'start a story'], path: '/story/new' },
        { phrases: ['stories', 'open stories', 'story workshop', 'go to stories', 'my stories', 'write a story', 'story'], path: '/story' },

        /* ── Drawing module ── */
        { phrases: ['drawing gallery', 'my drawings', 'go to drawing gallery'], path: '/drawing/gallery' },
        { phrases: ['drawing', 'open drawing', 'draw', 'canvas', 'go to drawing', 'drawing studio'], path: '/drawing' },

        /* ── Pixel Art module (CORRECT: /pixelart, NOT /pixel-art) ── */
        { phrases: ['pixel art gallery', 'pixel gallery', 'my pixel art'], path: '/pixelart/gallery' },
        { phrases: ['pixel art', 'open pixel art', 'pixel', 'go to pixel art', 'pixel editor', 'pixelart'], path: '/pixelart' },

        /* ── 3D module (CORRECT: /shapes3d, NOT /shapes-3d) ── */
        { phrases: ['3d gallery', 'three d gallery', 'my 3d models', '3d models'], path: '/shapes3d/gallery' },
        { phrases: ['3d', 'open 3d', '3d studio', '3d builder', 'shapes', 'go to 3d', 'three d', 'shape builder'], path: '/shapes3d' },

        /* ── AI ── */
        { phrases: ['aura', 'open aura', 'ai chat', 'talk to aura', 'go to aura', 'open ai', 'chat'], path: '/ai/chat' },

        /* ── Community ── */
        { phrases: ['feed', 'open feed', 'community', 'social feed', 'go to feed'], path: '/feed' },
        { phrases: ['submit to museum', 'museum submit', 'submit art', 'submit artwork'], path: '/museum/submit' },
        { phrases: ['my submissions', 'museum submissions', 'go to submissions'], path: '/museum/my-submissions' },
        { phrases: ['museum', 'open museum', 'gallery', 'go to museum'], path: '/museum' },

        /* ── Account ── */
        { phrases: ['profile', 'open profile', 'my profile', 'settings', 'go to profile', 'account'], path: '/profile' },
        { phrases: ['logout', 'log out', 'sign out', 'go to logout'], path: '/logout' },

        /* ── Public pages ── */
        { phrases: ['about', 'about us', 'go to about', 'about page'], path: '/about' },
        { phrases: ['services', 'our services', 'go to services'], path: '/services' },
        { phrases: ['contact', 'contact us', 'go to contact', 'contact page'], path: '/contact' },

        /* ── Navigation ── */
        { phrases: ['go home', 'home', 'go to home', 'home page', 'main'], path: '/' },
        { phrases: ['go back', 'back', 'previous page'], action: 'back' },
    ];

    /* ═══════════════════════════════════════
       STATE
    ═══════════════════════════════════════ */
    let recognition = null;
    let isListening = false;
    let feedbackTimeout = null;

    /* ═══════════════════════════════════════
       CREATE UI
    ═══════════════════════════════════════ */
    // Floating mic button
    const micBtn = document.createElement('button');
    micBtn.id = 'voiceNavBtn';
    micBtn.title = 'Voice Navigation — click or say "Hey VirtuAi"';
    micBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;
    document.body.appendChild(micBtn);

    // Feedback tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'voiceNavTooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    /* ═══════════════════════════════════════
       STYLES (injected once)
    ═══════════════════════════════════════ */
    const style = document.createElement('style');
    style.textContent = `
        #voiceNavBtn {
            position: fixed;
            bottom: 24px;
            left: 24px;
            z-index: 9998;
            width: 48px; height: 48px;
            border-radius: 50%;
            background: rgba(139, 92, 246, 0.15);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(139, 92, 246, 0.25);
            color: rgba(139, 92, 246, 0.7);
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.3s;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        #voiceNavBtn:hover {
            background: rgba(139, 92, 246, 0.25);
            color: #a78bfa;
            transform: scale(1.08);
        }
        #voiceNavBtn.listening {
            background: rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.4);
            color: #ef4444;
            animation: voiceNavPulse 1.2s ease-in-out infinite;
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3);
        }
        #voiceNavBtn.success {
            background: rgba(34, 197, 94, 0.2);
            border-color: rgba(34, 197, 94, 0.4);
            color: #22c55e;
            animation: none;
        }
        @keyframes voiceNavPulse {
            0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
            70%  { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
            100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }

        #voiceNavTooltip {
            position: fixed;
            bottom: 80px;
            left: 24px;
            z-index: 9998;
            background: rgba(15, 15, 20, 0.9);
            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 10px 16px;
            font-size: 0.82rem;
            font-weight: 600;
            color: rgba(255,255,255,0.8);
            max-width: 280px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
            animation: tooltipIn 0.2s ease-out;
            font-family: 'Inter', sans-serif;
        }
        #voiceNavTooltip.error { color: #f87171; border-color: rgba(239,68,68,0.2); }
        #voiceNavTooltip.success { color: #22c55e; border-color: rgba(34,197,94,0.2); }
        @keyframes tooltipIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    /* ═══════════════════════════════════════
       TOOLTIP HELPER
    ═══════════════════════════════════════ */
    function showTooltip(text, type, duration) {
        clearTimeout(feedbackTimeout);
        tooltip.textContent = text;
        tooltip.className = type || '';
        tooltip.style.display = 'block';
        if (duration) {
            feedbackTimeout = setTimeout(() => { tooltip.style.display = 'none'; }, duration);
        }
    }

    function hideTooltip() {
        clearTimeout(feedbackTimeout);
        tooltip.style.display = 'none';
    }

    /* ═══════════════════════════════════════
       MATCH COMMAND → ROUTE
    ═══════════════════════════════════════ */
    function matchCommand(spoken) {
        const lower = spoken.toLowerCase().trim()
            .replace(/go to the /g, 'go to ')
            .replace(/open the /g, 'open ')
            .replace(/take me to /g, 'go to ');

        for (const route of ROUTES) {
            for (const phrase of route.phrases) {
                if (lower.includes(phrase)) {
                    return route;
                }
            }
        }
        return null;
    }

    /* ═══════════════════════════════════════
       SPEECH RECOGNITION
    ═══════════════════════════════════════ */
    function startListening() {
        if (isListening) { stopListening(); return; }

        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 3;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            showTooltip('🎤 Listening… say a command like "open piano"');
        };

        recognition.onresult = (event) => {
            let final = '';
            let interim = '';

            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            if (interim) {
                showTooltip('🎤 "' + interim + '"');
            }

            if (final) {
                const route = matchCommand(final);
                if (route) {
                    if (route.action === 'back') {
                        micBtn.classList.remove('listening');
                        micBtn.classList.add('success');
                        showTooltip('✅ Going back…', 'success', 2000);
                        setTimeout(() => { window.history.back(); }, 500);
                    } else {
                        micBtn.classList.remove('listening');
                        micBtn.classList.add('success');
                        showTooltip('✅ Navigating to ' + route.path + '…', 'success', 2000);
                        setTimeout(() => { window.location.href = route.path; }, 500);
                    }
                    recognition.stop();
                } else {
                    showTooltip('❓ Didn\'t understand: "' + final + '"', 'error', 3000);
                }
            }
        };

        recognition.onerror = (event) => {
            if (event.error === 'no-speech') {
                showTooltip('🔇 No speech detected. Try again.', 'error', 2500);
            } else if (event.error !== 'aborted') {
                showTooltip('⚠️ ' + event.error, 'error', 3000);
            }
            stopListening();
        };

        recognition.onend = () => {
            stopListening();
        };

        recognition.start();
    }

    function stopListening() {
        isListening = false;
        micBtn.classList.remove('listening', 'success');
        if (recognition) {
            try { recognition.stop(); } catch (e) {}
            recognition = null;
        }
    }

    /* ═══════════════════════════════════════
       EVENT LISTENERS
    ═══════════════════════════════════════ */
    micBtn.addEventListener('click', startListening);

    // Keyboard shortcut: Ctrl+Shift+V to toggle voice nav
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
            e.preventDefault();
            startListening();
        }
    });

})();
