/**
 * VirtuAi — VirtuArts Creative Assistant (Frontend Widget)
 * Context-aware, streaming, glassmorphic chat panel.
 */
(function () {
    'use strict';

    /* ═══════════════════════════════════════
       MODULE DETECTION
    ═══════════════════════════════════════ */
    const MODULE_MAP = {
        '/shapes3d':     '3d_studio',
        '/drawing':      'drawing',
        '/pixelart':     'pixel_art',
        '/music':        'music',
        '/story':        'story',
    };

    const MODULE_LABELS = {
        '3d_studio': '🧊 3D Creation Studio',
        'drawing':   '🎨 Drawing Studio',
        'pixel_art': '🕹️ Pixel Art Editor',
        'music':     '🎵 Music World',
        'story':     '✍️ Story Workshop',
        'general':   '✨ General Creative',
    };

    const MODULE_SUGGESTIONS = {
        '3d_studio': [
            'Suggest a cool 3D scene idea',
            'Best lighting for dramatic look?',
            'How to build a castle from shapes?',
            'Recommend a color palette',
        ],
        'drawing': [
            'Give me a drawing prompt',
            'Suggest a warm color palette',
            'Tips for shading techniques',
            'How to draw in perspective?',
        ],
        'pixel_art': [
            'Best pixel art color palette?',
            'How to do dithering?',
            'Suggest a sprite to draw',
            'Tips for 16×16 canvas',
        ],
        'music': [
            'Suggest a chord progression',
            'Good BPM for lo-fi?',
            'Explain time signatures',
            'Help me build a beat',
        ],
        'story': [
            'Give me a story prompt',
            'Suggest a plot twist',
            'Help with character building',
            'Tips for strong dialogue',
        ],
        'general': [
            'What modules do you have?',
            'Help me get started',
            'Suggest a creative project',
            'Tell me about VirtuArts',
        ],
    };

    /* ═══════════════════════════════════════
       DETECT CURRENT MODULE
    ═══════════════════════════════════════ */
    function detectModule() {
        const path = window.location.pathname;
        for (const [prefix, mod] of Object.entries(MODULE_MAP)) {
            if (path.startsWith(prefix)) return mod;
        }
        return 'general';
    }

    const currentModule = detectModule();

    /* ═══════════════════════════════════════
       BUILD DOM
    ═══════════════════════════════════════ */
    function buildWidget() {
        // Toggle button (floating orb)
        const toggle = document.createElement('button');
        toggle.className = 'aura-toggle';
        toggle.id = 'auraToggle';
        toggle.setAttribute('aria-label', 'Open VirtuAi Assistant');
        toggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                <path d="M8 12h.01M12 12h.01M16 12h.01"/>
            </svg>
            <span class="aura-notif"></span>
        `;

        // Label under orb
        const label = document.createElement('div');
        label.className = 'aura-toggle-label';
        label.textContent = 'VirtuAi';

        // Chat panel
        const panel = document.createElement('div');
        panel.className = 'aura-panel';
        panel.id = 'auraPanel';
        panel.innerHTML = `
            <div class="aura-header">
                <div class="aura-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                </div>
                <div class="aura-header-info">
                    <div class="aura-header-name">
                        VirtuAi <span class="aura-ai-badge">AI</span>
                        <span class="aura-module-badge" data-module="${currentModule}">${MODULE_LABELS[currentModule]}</span>
                    </div>
                    <div class="aura-header-context">Your creative AI mentor — ask me anything</div>
                </div>
                <button class="aura-close-btn" id="auraClose" aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="aura-messages" id="auraMessages">
                <div class="aura-welcome">
                    <span class="aura-welcome-icon">✨</span>
                    <h4>Hey! I'm VirtuAi</h4>
                    <p>Your AI creative mentor. I'm tuned to help you with <strong>${MODULE_LABELS[currentModule]}</strong>. Ask me anything!</p>
                    <div class="aura-suggestions" id="auraSuggestions">
                        ${(MODULE_SUGGESTIONS[currentModule] || []).map(s =>
                            `<button class="aura-suggest-chip" data-suggest="${s}">${s}</button>`
                        ).join('')}
                    </div>
                </div>
            </div>
            <div class="aura-input-area">
                <textarea class="aura-input" id="auraInput" placeholder="Ask VirtuAi..." rows="1"></textarea>
                <button class="aura-send-btn" id="auraSend" aria-label="Send">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(toggle);
        document.body.appendChild(label);
        document.body.appendChild(panel);

        return { toggle, label, panel };
    }

    const { toggle, label, panel } = buildWidget();
    const messagesEl = document.getElementById('auraMessages');
    const inputEl    = document.getElementById('auraInput');
    const sendBtn    = document.getElementById('auraSend');

    /* ═══════════════════════════════════════
       STATE
    ═══════════════════════════════════════ */
    let isOpen = false;
    let isStreaming = false;
    const history = [];   // { role, content } array for conversation context

    /* ═══════════════════════════════════════
       TOGGLE PANEL
    ═══════════════════════════════════════ */
    function openPanel() {
        isOpen = true;
        panel.classList.add('visible');
        toggle.classList.add('active');
        // Hide notification dot after first open
        const notif = toggle.querySelector('.aura-notif');
        if (notif) notif.style.display = 'none';
        setTimeout(() => inputEl.focus(), 300);
    }

    function closePanel() {
        isOpen = false;
        panel.classList.remove('visible');
        toggle.classList.remove('active');
    }

    toggle.addEventListener('click', () => {
        if (isOpen) closePanel();
        else openPanel();
    });

    document.getElementById('auraClose').addEventListener('click', closePanel);

    // Close on Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) closePanel();
    });

    /* ═══════════════════════════════════════
       SUGGESTION CHIPS
    ═══════════════════════════════════════ */
    panel.querySelectorAll('.aura-suggest-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.dataset.suggest;
            inputEl.value = text;
            sendMessage();
        });
    });

    /* ═══════════════════════════════════════
       SIMPLE MARKDOWN PARSER
    ═══════════════════════════════════════ */
    function parseMarkdown(text) {
        return text
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Unordered list items
            .replace(/^[-•]\s+(.+)/gm, '<li>$1</li>')
            // Numbered list items
            .replace(/^\d+\.\s+(.+)/gm, '<li>$1</li>')
            // Wrap consecutive <li> in <ul>
            .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
            // Line breaks
            .replace(/\n/g, '<br>');
    }

    /* ═══════════════════════════════════════
       ADD MESSAGE TO UI
    ═══════════════════════════════════════ */
    function addMessage(role, content) {
        // Remove welcome message on first interaction
        const welcome = messagesEl.querySelector('.aura-welcome');
        if (welcome) welcome.remove();

        const bubble = document.createElement('div');
        bubble.className = `aura-msg ${role}`;
        if (role === 'ai') {
            bubble.innerHTML = parseMarkdown(content);
        } else {
            bubble.textContent = content;
        }
        messagesEl.appendChild(bubble);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return bubble;
    }

    function addTypingIndicator() {
        const el = document.createElement('div');
        el.className = 'aura-typing';
        el.id = 'auraTyping';
        el.innerHTML = '<span class="aura-typing-dot"></span><span class="aura-typing-dot"></span><span class="aura-typing-dot"></span>';
        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return el;
    }

    function removeTypingIndicator() {
        const el = document.getElementById('auraTyping');
        if (el) el.remove();
    }

    /* ═══════════════════════════════════════
       RENDER ACTION RESULT
    ═══════════════════════════════════════ */
    function renderActionResult(data) {
        const result = data.result || {};
        let html = `<div class="aura-action-result">`;

        if (result.type === 'palette' && result.colors) {
            html += `<div style="font-weight:700;margin-bottom:8px;">🎨 ${result.theme || 'Color Palette'}</div>`;
            html += `<div style="display:flex;gap:4px;margin-bottom:8px;">`;
            result.colors.forEach(c => {
                html += `<div style="width:32px;height:32px;border-radius:6px;background:${c};border:1px solid rgba(255,255,255,0.1);cursor:pointer;" title="${c}" onclick="navigator.clipboard.writeText('${c}')"></div>`;
            });
            html += `</div>`;
            html += `<small style="color:#78716c;">Click a color to copy its hex code</small>`;
        } else if (result.type === 'progression' && result.chords) {
            html += `<div style="font-weight:700;margin-bottom:8px;">🎵 ${result.genre || 'Chord Progression'} · ${result.bpm || 120} BPM</div>`;
            html += `<div style="display:flex;gap:6px;margin-bottom:8px;">`;
            result.chords.forEach(ch => {
                html += `<span style="padding:4px 10px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.2);border-radius:6px;font-weight:700;font-size:0.82rem;color:#f97316;">${ch}</span>`;
            });
            html += `</div>`;
            if (result.description) html += `<p style="font-size:0.82rem;color:#a8a29e;margin:0;">${result.description}</p>`;
        } else if (result.type === 'story_created') {
            html += `<div style="font-weight:700;margin-bottom:4px;">✨ Story Created!</div>`;
            html += `<a href="/story/${result.story_id}" style="color:#f97316;font-weight:600;text-decoration:underline;">"${result.title}" → Go to story</a>`;
        } else if (result.type === 'chapter_added') {
            html += `<div style="font-weight:700;margin-bottom:4px;">📖 Chapter Added</div>`;
            html += `<a href="/story/${result.story_id}" style="color:#f97316;font-weight:600;text-decoration:underline;">"${result.title}" → View in story</a>`;
        } else if (result.type === 'scene_added') {
            html += `<div style="font-weight:700;margin-bottom:4px;">🎬 Scene Added</div>`;
            html += `<p style="font-size:0.82rem;color:#a8a29e;margin:0;">"${result.title}"</p>`;
        }

        html += `</div>`;
        return html;
    }

    /* ═══════════════════════════════════════
       SMART NAVIGATION
    ═══════════════════════════════════════ */
    const NAV_ROUTES = [
        { keywords: ['drawing studio', 'drawing', 'draw'],        url: '/drawing', label: 'Drawing Studio' },
        { keywords: ['pixel art', 'pixel editor', 'pixel'],       url: '/pixelart', label: 'Pixel Art Editor' },
        { keywords: ['3d', '3d studio', '3d builder', 'shapes'],  url: '/shapes3d', label: '3D Creation Studio' },
        { keywords: ['music', 'acoustic', 'music studio'],        url: '/music', label: 'Acoustic Music World' },
        { keywords: ['beat maker', 'beat', 'beats'],              url: '/music/beat-maker', label: 'Beat Maker Studio' },
        { keywords: ['piano'],                                     url: '/music/piano', label: 'Piano' },
        { keywords: ['guitar'],                                    url: '/music/guitar', label: 'Guitar' },
        { keywords: ['drums', 'drum'],                             url: '/music/drums', label: 'Drums' },
        { keywords: ['story', 'stories', 'story workshop'],       url: '/story', label: 'Story Workshop' },
        { keywords: ['museum', 'virtual museum'],                  url: '/museum', label: 'Virtual Museum' },
        { keywords: ['feed', 'artist feed'],                       url: '/feed', label: 'Artist Feed' },
        { keywords: ['dashboard', 'home'],                         url: '/dashboard', label: 'Dashboard' },
        { keywords: ['profile', 'settings'],                       url: '/profile', label: 'Profile' },
        { keywords: ['harmony', 'harmony assistant'],              url: '/music/harmony', label: 'Harmony Assistant' },
        { keywords: ['rhythm', 'rhythm training'],                 url: '/music/rhythm-training', label: 'Rhythm Training' },
    ];
    const NAV_RE = /\b(take me to|go to|open|navigate to|bring me to|switch to|launch|show me|let'?s go to)\b/i;

    function tryNavigate(text) {
        if (!NAV_RE.test(text)) return false;
        const lower = text.toLowerCase();
        let best = null, bestLen = 0;
        for (const r of NAV_ROUTES) {
            for (const kw of r.keywords) {
                if (lower.includes(kw) && kw.length > bestLen) { best = r; bestLen = kw.length; }
            }
        }
        if (!best) return false;
        addMessage('user', text);
        inputEl.value = '';
        const b = addMessage('ai', '');
        b.innerHTML = `<div style="font-weight:700;">Taking you to ${best.label}…</div><div style="font-size:.78rem;color:rgba(255,255,255,.45);margin-top:4px;">Redirecting in 2s — <a href="${best.url}" style="color:#f97316;font-weight:600;">Go Now →</a></div>`;
        let c = 2;
        const t = setInterval(() => { c--; if (c <= 0) { clearInterval(t); window.location.href = best.url; } }, 1000);
        return true;
    }

    /* ═══════════════════════════════════════
       SEND MESSAGE (with actions + streaming)
    ═══════════════════════════════════════ */
    async function sendMessage() {
        const text = inputEl.value.trim();
        if (!text || isStreaming) return;

        // Check navigation intent first
        if (tryNavigate(text)) return;

        // Show user message
        addMessage('user', text);
        history.push({ role: 'user', content: text });
        inputEl.value = '';
        inputEl.style.height = 'auto';

        isStreaming = true;
        sendBtn.disabled = true;

        const typingEl = addTypingIndicator();

        // Detect if user is asking for an action (create, add, make, generate, suggest palette, etc.)
        const actionKeywords = /\b(create|make|add|build|generate|write|compose|suggest.*palette|suggest.*chord|suggest.*progression)\b/i;
        const isActionIntent = actionKeywords.test(text);

        try {
            // Try action endpoint first if the message seems action-oriented
            if (isActionIntent) {
                const actionResp = await fetch('/api/ai/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: text,
                        module: currentModule,
                        context: window.__auraContext || {},
                    }),
                });

                if (actionResp.ok) {
                    const actionData = await actionResp.json();
                    removeTypingIndicator();

                    if (actionData.action && actionData.result) {
                        // Render action result
                        const bubble = addMessage('ai', actionData.reply || 'Done!');
                        bubble.innerHTML = parseMarkdown(actionData.reply || 'Done!') + renderActionResult(actionData);
                        history.push({ role: 'assistant', content: actionData.reply || 'Done!' });
                        isStreaming = false;
                        sendBtn.disabled = false;
                        inputEl.focus();
                        return;
                    } else if (actionData.reply) {
                        // AI decided not to use an action, just text
                        addMessage('ai', actionData.reply);
                        history.push({ role: 'assistant', content: actionData.reply });
                        isStreaming = false;
                        sendBtn.disabled = false;
                        inputEl.focus();
                        return;
                    }
                }
            }

            // Streaming chat (normal flow)
            const response = await fetch('/api/ai/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    module: currentModule,
                    history: history.slice(-10),
                }),
            });

            if (!response.ok) {
                throw new Error('Stream unavailable');
            }

            removeTypingIndicator();

            const aiBubble = addMessage('ai', '');
            let fullResponse = '';

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') continue;
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmed.slice(6));
                            if (data.content) {
                                fullResponse += data.content;
                                aiBubble.innerHTML = parseMarkdown(fullResponse);
                                messagesEl.scrollTop = messagesEl.scrollHeight;
                            }
                            if (data.error) {
                                fullResponse += '\n⚠️ ' + data.error;
                                aiBubble.innerHTML = parseMarkdown(fullResponse);
                            }
                        } catch (e) { /* skip malformed chunks */ }
                    }
                }
            }

            history.push({ role: 'assistant', content: fullResponse });

        } catch (err) {
            removeTypingIndicator();
            try {
                const fallback = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: text,
                        module: currentModule,
                        history: history.slice(-10),
                    }),
                });
                const data = await fallback.json();
                if (data.reply) {
                    addMessage('ai', data.reply);
                    history.push({ role: 'assistant', content: data.reply });
                } else {
                    addMessage('ai', '⚠️ ' + (data.error || 'Something went wrong.'));
                }
            } catch (e2) {
                addMessage('ai', '⚠️ Network error — please check your connection.');
            }
        }

        isStreaming = false;
        sendBtn.disabled = false;
        inputEl.focus();
    }

    /* ═══════════════════════════════════════
       INPUT HANDLING
    ═══════════════════════════════════════ */
    sendBtn.addEventListener('click', sendMessage);

    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    });

    /* ═══════════════════════════════════════
       PROACTIVE TIP (shows after 5s on module pages)
    ═══════════════════════════════════════ */
    const PROACTIVE_TIPS = {
        '3d_studio': "💡 Try adding a **Torus Knot** with **Glass** material and cranking up the transmission. I can suggest lighting setups!",
        'drawing': "💡 Need a color palette? Ask me for one! I'll give you exact hex codes that work beautifully together.",
        'pixel_art': "💡 Working on pixel art? I can suggest optimized palettes for your grid size. Just ask!",
        'music': "💡 Tell me what mood you're going for and I'll suggest chord progressions, BPMs, and drum patterns.",
        'story': "💡 Feeling stuck? Describe your story's premise and I'll help you brainstorm plot twists and vivid settings.",
    };

    if (PROACTIVE_TIPS[currentModule]) {
        setTimeout(() => {
            // Don't show if already opened
            if (isOpen) return;

            const tip = document.createElement('div');
            tip.className = 'aura-tip';
            tip.innerHTML = `
                <button class="aura-tip-close" aria-label="Dismiss">&times;</button>
                ${parseMarkdown(PROACTIVE_TIPS[currentModule])}
            `;
            document.body.appendChild(tip);

            tip.querySelector('.aura-tip-close').addEventListener('click', () => tip.remove());

            // Auto dismiss after 8 seconds
            setTimeout(() => {
                if (tip.parentNode) {
                    tip.style.opacity = '0';
                    tip.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => tip.remove(), 300);
                }
            }, 8000);

            // Open chat when tip is clicked
            tip.addEventListener('click', (e) => {
                if (e.target.closest('.aura-tip-close')) return;
                tip.remove();
                openPanel();
            });
        }, 5000);
    }

    /* ═══════════════════════════════════════
       KEYBOARD SHORTCUT
    ═══════════════════════════════════════ */
    window.addEventListener('keydown', (e) => {
        // Alt+A to toggle VirtuAi
        if (e.altKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            if (isOpen) closePanel();
            else openPanel();
        }
    });

})();
