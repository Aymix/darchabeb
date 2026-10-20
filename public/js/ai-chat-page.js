/**
 * VirtuArts AI Chat Page — Interactive Controller
 * Adapted from animated-ai-chat.tsx (React) → vanilla JS
 * Handles: streaming, action detection, command palette, auto-resize, typing indicator
 */
(function () {
    'use strict';

    /* ═══════════════════════════════════════
       DOM ELEMENTS
    ═══════════════════════════════════════ */
    const textarea      = document.getElementById('aiChatTextarea');
    const sendBtn       = document.getElementById('aiChatSend');
    const messagesEl    = document.getElementById('aiChatMessages');
    const chatBox       = document.getElementById('aiChatBox');
    const cmdPalette    = document.getElementById('aiCommandPalette');
    const attachmentsEl = document.getElementById('aiAttachments');
    const attachBtn     = document.getElementById('aiAttachBtn');
    const cmdBtn        = document.getElementById('aiCmdBtn');
    const mouseGlow     = document.getElementById('aiMouseGlow');
    const fileInput     = document.getElementById('aiFileInput');

    if (!textarea || !sendBtn || !messagesEl) return;

    /* ═══════════════════════════════════════
       STATE
    ═══════════════════════════════════════ */
    let isStreaming = false;
    let activeSuggestion = -1;
    let showCmdPalette = false;
    let attachments = [];
    const history = [];

    const COMMANDS = [
        { icon: 'image', label: 'Create Drawing', desc: 'AI-assisted artwork idea', prefix: '/draw' },
        { icon: 'book-open', label: 'Write Story', desc: 'Generate a story prompt', prefix: '/story' },
        { icon: 'music', label: 'Music Help', desc: 'Chord progressions & beats', prefix: '/music' },
        { icon: 'sparkles', label: 'Creative Boost', desc: 'Get inspired with new ideas', prefix: '/inspire' },
        { icon: 'palette', label: 'Color Palette', desc: 'Generate a color scheme', prefix: '/palette' },
        { icon: 'box', label: '3D Scene', desc: 'Build a 3D composition', prefix: '/3d' },
    ];

    /* ═══════════════════════════════════════
       AUTO-RESIZE TEXTAREA
    ═══════════════════════════════════════ */
    const MIN_HEIGHT = 60;
    const MAX_HEIGHT = 200;

    function adjustHeight(reset) {
        if (reset) {
            textarea.style.height = MIN_HEIGHT + 'px';
            return;
        }
        textarea.style.height = MIN_HEIGHT + 'px';
        const newH = Math.max(MIN_HEIGHT, Math.min(textarea.scrollHeight, MAX_HEIGHT));
        textarea.style.height = newH + 'px';
        textarea.style.overflow = newH >= MAX_HEIGHT ? 'auto' : 'hidden';
    }

    textarea.addEventListener('input', () => {
        adjustHeight();
        updateSendButton();
        checkCommandTrigger();
    });

    /* ═══════════════════════════════════════
       FOCUS / BLUR
    ═══════════════════════════════════════ */
    textarea.addEventListener('focus', () => {
        chatBox.classList.add('focused');
        if (mouseGlow) mouseGlow.style.display = 'block';
    });

    textarea.addEventListener('blur', () => {
        chatBox.classList.remove('focused');
        if (mouseGlow) mouseGlow.style.display = 'none';
    });

    /* ═══════════════════════════════════════
       MOUSE FOLLOWER GLOW
    ═══════════════════════════════════════ */
    if (mouseGlow) {
        mouseGlow.style.display = 'none';
        document.addEventListener('mousemove', (e) => {
            mouseGlow.style.transform = `translate(${e.clientX - 400}px, ${e.clientY - 400}px)`;
        });
    }

    /* ═══════════════════════════════════════
       SEND BUTTON STATE
    ═══════════════════════════════════════ */
    function updateSendButton() {
        const hasText = textarea.value.trim().length > 0;
        sendBtn.className = 'ai-send-btn ' + (hasText && !isStreaming ? 'active' : 'inactive');
        sendBtn.disabled = !hasText || isStreaming;
    }

    updateSendButton();

    /* ═══════════════════════════════════════
       COMMAND PALETTE
    ═══════════════════════════════════════ */
    function checkCommandTrigger() {
        const val = textarea.value;
        if (val.startsWith('/') && !val.includes(' ')) {
            showCommandPalette(true);
            // Find matching command
            const matchIdx = COMMANDS.findIndex(c => c.prefix.startsWith(val));
            activeSuggestion = matchIdx >= 0 ? matchIdx : -1;
            renderCommandPalette();
        } else {
            showCommandPalette(false);
        }
    }

    function showCommandPalette(show) {
        showCmdPalette = show;
        if (cmdPalette) {
            cmdPalette.style.display = show ? 'block' : 'none';
            if (show) {
                cmdPalette.classList.remove('closing');
            }
        }
    }

    function renderCommandPalette() {
        if (!cmdPalette) return;
        let html = '';
        COMMANDS.forEach((cmd, i) => {
            const isActive = i === activeSuggestion ? ' active' : '';
            html += `
                <div class="ai-cmd-item${isActive}" data-cmd-idx="${i}">
                    <div class="ai-cmd-icon"><i data-lucide="${cmd.icon}"></i></div>
                    <span class="ai-cmd-label">${cmd.label}</span>
                    <span class="ai-cmd-prefix">${cmd.prefix}</span>
                    <span class="ai-cmd-desc">${cmd.desc}</span>
                </div>`;
        });
        cmdPalette.innerHTML = html;

        // Re-render lucide icons inside palette
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: cmdPalette.querySelectorAll('[data-lucide]') });

        cmdPalette.querySelectorAll('.ai-cmd-item').forEach(el => {
            el.addEventListener('click', () => {
                selectCommand(parseInt(el.dataset.cmdIdx));
            });
        });
    }

    function selectCommand(idx) {
        const cmd = COMMANDS[idx];
        if (!cmd) return;
        textarea.value = cmd.prefix + ' ';
        showCommandPalette(false);
        textarea.focus();
        adjustHeight();
        updateSendButton();
    }

    if (cmdBtn) {
        cmdBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showCmdPalette = !showCmdPalette;
            showCommandPalette(showCmdPalette);
            if (showCmdPalette) {
                activeSuggestion = -1;
                renderCommandPalette();
            }
        });
    }

    document.addEventListener('mousedown', (e) => {
        if (showCmdPalette && cmdPalette && !cmdPalette.contains(e.target) && e.target !== cmdBtn) {
            showCommandPalette(false);
        }
    });

    /* ═══════════════════════════════════════
       ATTACHMENTS
    ═══════════════════════════════════════ */
    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            const files = Array.from(fileInput.files);
            files.forEach(f => {
                attachments.push(f.name);
            });
            renderAttachments();
            fileInput.value = '';
        });
    }

    function renderAttachments() {
        if (!attachmentsEl) return;
        if (attachments.length === 0) {
            attachmentsEl.style.display = 'none';
            return;
        }
        attachmentsEl.style.display = 'flex';
        let html = '';
        attachments.forEach((name, i) => {
            html += `
                <div class="ai-attachment-chip">
                    <span>${escapeHtml(name)}</span>
                    <button class="chip-remove" data-idx="${i}">
                        <i data-lucide="x" style="width:12px;height:12px;"></i>
                    </button>
                </div>`;
        });
        attachmentsEl.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: attachmentsEl.querySelectorAll('[data-lucide]') });

        attachmentsEl.querySelectorAll('.chip-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                attachments.splice(parseInt(btn.dataset.idx), 1);
                renderAttachments();
            });
        });
    }

    /* ═══════════════════════════════════════
       MARKDOWN PARSER (simple)
    ═══════════════════════════════════════ */
    function md(text) {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^[-•]\s+(.+)/gm, '<li>$1</li>')
            .replace(/^\d+\.\s+(.+)/gm, '<li>$1</li>')
            .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
            .replace(/\n/g, '<br>');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* ═══════════════════════════════════════
       ADD MESSAGE
    ═══════════════════════════════════════ */
    function addMessage(role, content) {
        // Remove welcome on first message
        const welcome = messagesEl.querySelector('.ai-chat-welcome');
        if (welcome) welcome.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'ai-msg ' + (role === 'user' ? 'ai-msg-user' : 'ai-msg-ai');

        if (role === 'ai') {
            wrapper.innerHTML = `
                <div class="ai-msg-avatar">✦</div>
                <div class="ai-msg-bubble">${md(content)}</div>`;
        } else {
            wrapper.innerHTML = `<div class="ai-msg-bubble">${escapeHtml(content)}</div>`;
        }

        messagesEl.appendChild(wrapper);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Show messages container
        if (messagesEl.style.display === 'none') messagesEl.style.display = 'block';

        return role === 'ai' ? wrapper.querySelector('.ai-msg-bubble') : wrapper.querySelector('.ai-msg-bubble');
    }

    /* ═══════════════════════════════════════
       TYPING INDICATOR
    ═══════════════════════════════════════ */
    function showTyping() {
        let indicator = document.getElementById('aiTypingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'aiTypingIndicator';
            indicator.className = 'ai-typing-indicator';
            indicator.innerHTML = `
                <div class="ai-typing-avatar"><span>VirtuAi</span></div>
                <div class="ai-typing-text">
                    <span>Thinking</span>
                    <div class="ai-typing-dots">
                        <div class="ai-typing-dot"></div>
                        <div class="ai-typing-dot"></div>
                        <div class="ai-typing-dot"></div>
                    </div>
                </div>`;
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'flex';
        indicator.classList.remove('hiding');
    }

    function hideTyping() {
        const indicator = document.getElementById('aiTypingIndicator');
        if (indicator) {
            indicator.classList.add('hiding');
            setTimeout(() => { indicator.style.display = 'none'; }, 300);
        }
    }

    /* ═══════════════════════════════════════
       ACTION RESULT RENDERER
    ═══════════════════════════════════════ */
    function renderActionResult(data) {
        const result = data.result || {};
        let html = '<div class="ai-action-result">';

        if (result.type === 'palette' && result.colors) {
            html += '<div style="font-weight:700;margin-bottom:8px;">🎨 ' + (result.theme || 'Color Palette') + '</div>';
            html += '<div style="display:flex;gap:6px;margin-bottom:8px;">';
            result.colors.forEach(c => {
                html += '<div class="ai-palette-swatch" style="background:' + c + ';" title="' + c + '" onclick="navigator.clipboard.writeText(\'' + c + '\')"></div>';
            });
            html += '</div><small style="color:rgba(255,255,255,0.4);">Click a color to copy its hex code</small>';
        } else if (result.type === 'progression' && result.chords) {
            html += '<div style="font-weight:700;margin-bottom:8px;">🎵 ' + (result.genre || 'Chord Progression') + ' · ' + (result.bpm || 120) + ' BPM</div>';
            html += '<div style="display:flex;gap:6px;margin-bottom:8px;">';
            result.chords.forEach(ch => { html += '<span class="ai-chord-badge">' + ch + '</span>'; });
            html += '</div>';
            if (result.description) html += '<p style="font-size:0.82rem;color:rgba(255,255,255,0.55);margin:4px 0 0;">' + result.description + '</p>';
        } else if (result.type === 'story_created') {
            html += '<div style="font-weight:700;margin-bottom:4px;">✨ Story Created!</div>';
            html += '<a href="/story/' + result.story_id + '">"' + result.title + '" → Go to story</a>';
        } else if (result.type === 'chapter_added') {
            html += '<div style="font-weight:700;margin-bottom:4px;">📖 Chapter Added</div>';
            html += '<a href="/story/' + result.story_id + '">"' + result.title + '" → View in story</a>';
        } else if (result.type === 'scene_added') {
            html += '<div style="font-weight:700;margin-bottom:4px;">🎬 Scene Added</div>';
            html += '<p style="font-size:0.82rem;color:rgba(255,255,255,0.55);margin:0;">"' + result.title + '"</p>';
        }

        html += '</div>';
        return html;
    }

    /* ═══════════════════════════════════════
       SMART NAVIGATION — VirtuAi can take
       users to any module on command
    ═══════════════════════════════════════ */
    const NAV_ROUTES = [
        { keywords: ['drawing studio', 'drawing', 'draw'],        url: '/drawing', label: 'Drawing Studio',       icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' },
        { keywords: ['pixel art', 'pixel editor', 'pixel'],       url: '/pixelart', label: 'Pixel Art Editor',     icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' },
        { keywords: ['3d', '3d studio', '3d builder', 'shape builder', 'shapes'], url: '/shapes3d', label: '3D Creation Studio', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>' },
        { keywords: ['music', 'acoustic', 'music studio', 'music world'], url: '/music', label: 'Acoustic Music World', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
        { keywords: ['beat maker', 'beat', 'beats', 'sequencer'], url: '/music/beat-maker', label: 'Beat Maker Studio',          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z"/></svg>' },
        { keywords: ['piano'],                                     url: '/music/piano', label: 'Piano',                    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 4v16M10 4v16M14 4v16M18 4v16"/></svg>' },
        { keywords: ['guitar'],                                    url: '/music/guitar', label: 'Guitar',                  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M16 3v18l-8-4V7Z"/></svg>' },
        { keywords: ['drums', 'drum'],                             url: '/music/drums', label: 'Drums',                    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><ellipse cx="12" cy="8" rx="9" ry="4"/><path d="M3 8v6a9 4 0 0 0 18 0V8"/></svg>' },
        { keywords: ['story', 'stories', 'story workshop', 'writing'], url: '/story', label: 'Story Workshop',            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>' },
        { keywords: ['museum', 'virtual museum', 'gallery museum'], url: '/museum', label: 'Virtual Museum',              icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/></svg>' },
        { keywords: ['feed', 'artist feed', 'community feed'],    url: '/feed', label: 'Artist Feed',                     icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M22 4 12 9 2 4"/><path d="m2 4 3 15h3l1-4"/><circle cx="18" cy="15" r="3" opacity=".4"/></svg>' },
        { keywords: ['dashboard', 'home', 'main'],                 url: '/dashboard', label: 'Dashboard',                  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>' },
        { keywords: ['profile', 'settings', 'my profile'],        url: '/profile', label: 'Profile',                       icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
        { keywords: ['harmony', 'chord', 'harmony assistant'],     url: '/music/harmony', label: 'Harmony Assistant',      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
        { keywords: ['rhythm', 'rhythm training'],                 url: '/music/rhythm-training', label: 'Rhythm Training',          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M10 2h4"/></svg>' },
    ];

    const NAV_PATTERNS = /\b(take me to|go to|open|navigate to|bring me to|switch to|launch|show me|let'?s go to)\b/i;

    function tryNavigate(text) {
        if (!NAV_PATTERNS.test(text)) return false;
        const lower = text.toLowerCase();
        // Find best matching route (longest keyword match first)
        let bestMatch = null;
        let bestLen = 0;
        for (const route of NAV_ROUTES) {
            for (const kw of route.keywords) {
                if (lower.includes(kw) && kw.length > bestLen) {
                    bestMatch = route;
                    bestLen = kw.length;
                }
            }
        }
        if (!bestMatch) return false;

        // Show user message
        addMessage('user', text);
        textarea.value = '';
        adjustHeight(true);
        updateSendButton();

        // Show navigation card
        const navBubble = addMessage('ai', '');
        navBubble.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;padding:4px 0;">
                <div style="width:44px;height:44px;border-radius:12px;background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    ${bestMatch.icon}
                </div>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:.95rem;color:#fff;">Taking you to ${bestMatch.label}</div>
                    <div style="font-size:.78rem;color:rgba(255,255,255,.45);margin-top:2px;">Redirecting in <span id="navCountdown">2</span>s…</div>
                </div>
                <a href="${bestMatch.url}" style="padding:6px 16px;background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;border-radius:8px;font-size:.8rem;font-weight:700;text-decoration:none;white-space:nowrap;transition:transform .15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Go Now →</a>
            </div>
        `;

        // Countdown and redirect
        let count = 2;
        const countEl = document.getElementById('navCountdown');
        const timer = setInterval(() => {
            count--;
            if (countEl) countEl.textContent = count;
            if (count <= 0) {
                clearInterval(timer);
                window.location.href = bestMatch.url;
            }
        }, 1000);

        return true;
    }

    /* ═══════════════════════════════════════
       SEND MESSAGE
    ═══════════════════════════════════════ */
    async function sendMessage() {
        const text = textarea.value.trim();
        if (!text || isStreaming) return;

        // Check for navigation intent first
        if (tryNavigate(text)) return;

        addMessage('user', text);
        history.push({ role: 'user', content: text });
        textarea.value = '';
        adjustHeight(true);
        updateSendButton();
        attachments = [];
        renderAttachments();

        isStreaming = true;
        updateSendButton();
        showTyping();

        // Detect action intent
        const actionKeywords = /\b(create|make|add|build|generate|write|compose|suggest.*palette|suggest.*chord|suggest.*progression)\b/i;
        const isActionIntent = actionKeywords.test(text);

        try {
            // Try action endpoint first
            if (isActionIntent) {
                const actionResp = await fetch('/api/ai/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, module: 'general', context: {} }),
                });

                if (actionResp.ok) {
                    const actionData = await actionResp.json();
                    hideTyping();

                    if (actionData.action && actionData.result) {
                        const bubble = addMessage('ai', actionData.reply || 'Done!');
                        bubble.innerHTML = md(actionData.reply || 'Done!') + renderActionResult(actionData);
                        history.push({ role: 'assistant', content: actionData.reply || 'Done!' });
                        isStreaming = false;
                        updateSendButton();
                        textarea.focus();
                        return;
                    } else if (actionData.reply) {
                        addMessage('ai', actionData.reply);
                        history.push({ role: 'assistant', content: actionData.reply });
                        isStreaming = false;
                        updateSendButton();
                        textarea.focus();
                        return;
                    }
                }
            }

            // Streaming chat
            const response = await fetch('/api/ai/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, module: 'general', history: history.slice(-10) }),
            });

            if (!response.ok) throw new Error('Stream unavailable');

            hideTyping();
            const bubble = addMessage('ai', '');
            let fullResponse = '';

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });

                for (const line of chunk.split('\n')) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') continue;
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmed.slice(6));
                            if (data.content) {
                                fullResponse += data.content;
                                bubble.innerHTML = md(fullResponse);
                                messagesEl.scrollTop = messagesEl.scrollHeight;
                            }
                        } catch (e) {}
                    }
                }
            }
            history.push({ role: 'assistant', content: fullResponse });

        } catch (err) {
            hideTyping();
            // Fallback to non-streaming
            try {
                const fb = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, module: 'general', history: history.slice(-10) }),
                });
                const data = await fb.json();
                if (data.reply) {
                    addMessage('ai', data.reply);
                    history.push({ role: 'assistant', content: data.reply });
                } else {
                    addMessage('ai', '⚠️ ' + (data.error || 'Something went wrong.'));
                }
            } catch (e2) {
                addMessage('ai', '⚠️ Connection error — please try again.');
            }
        }

        isStreaming = false;
        updateSendButton();
        textarea.focus();
    }

    /* ═══════════════════════════════════════
       EVENT LISTENERS
    ═══════════════════════════════════════ */
    sendBtn.addEventListener('click', sendMessage);

    textarea.addEventListener('keydown', (e) => {
        if (showCmdPalette) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeSuggestion = activeSuggestion < COMMANDS.length - 1 ? activeSuggestion + 1 : 0;
                renderCommandPalette();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeSuggestion = activeSuggestion > 0 ? activeSuggestion - 1 : COMMANDS.length - 1;
                renderCommandPalette();
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestion >= 0) selectCommand(activeSuggestion);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                showCommandPalette(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    /* ── Suggestion chips ── */
    document.querySelectorAll('.ai-suggest-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.dataset.suggest;
            if (text) {
                textarea.value = text;
                adjustHeight();
                updateSendButton();
                sendMessage();
            }
        });
    });

    /* ── Lucide init after page ready ── */
    if (typeof lucide !== 'undefined') lucide.createIcons();

})();
