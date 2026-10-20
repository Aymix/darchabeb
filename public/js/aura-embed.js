/**
 * VirtuAi — Advanced Embedded Module Panel Controller
 * ═══════════════════════════════════════════════════
 * Features:
 * - Multi-turn conversation memory (sends full history to API)
 * - 10 creative tool renderers (palette, progression, draw, beat, clear, analysis, challenge, etc.)
 * - Workspace bridge: AI actions directly manipulate the active module
 * - Streaming SSE with real-time typing indicator
 * - Smart suggestion chips per module
 * - Markdown rendering (bold, italic, code, lists)
 * - Toast notifications for action feedback
 */
(function () {
    'use strict';

    const panel = document.getElementById('auraEmbed');
    if (!panel) return;

    const module     = panel.dataset.module || 'general';
    const body       = document.getElementById('auraEmbedBody');
    const messagesEl = document.getElementById('auraEmbedMessages');
    const inputEl    = document.getElementById('auraEmbedInput');
    const sendBtn    = document.getElementById('auraEmbedSend');
    const toggleBtn  = document.getElementById('auraEmbedToggle');
    const chipsWrap  = document.getElementById('auraEmbedChips');

    let isStreaming = false;
    const history = [];

    /* ══════════════════════════════════════════
       WORKSPACE CONTEXT DETECTION
       Auto-detect what the user is working on
       and send it to VirtuAi for smarter responses
    ══════════════════════════════════════════ */
    function getWorkspaceContext() {
        const ctx = {
            page: window.location.pathname,
            module: module,
        };

        // Detect story context (story ID, chapter ID from URL)
        const storyMatch = window.location.pathname.match(/\/story\/(\d+)/);
        if (storyMatch) ctx.story_id = parseInt(storyMatch[1]);
        const chapterMatch = window.location.pathname.match(/\/chapter\/(\d+)/);
        if (chapterMatch) ctx.chapter_id = parseInt(chapterMatch[1]);

        // Detect grid size for pixel art
        const canvas = document.querySelector('canvas.pixel-canvas, canvas#pixelCanvas');
        if (canvas) ctx.grid_size = parseInt(canvas.dataset.gridSize) || 16;

        // Detect current BPM in beat maker
        const bpmEl = document.getElementById('bpmLabel') || document.getElementById('bpmSlider');
        if (bpmEl) ctx.current_bpm = parseInt(bpmEl.textContent || bpmEl.value) || 120;

        // Detect current color
        const colorPicker = document.querySelector('input[type="color"]');
        if (colorPicker) ctx.current_color = colorPicker.value;

        // Detect page title for context
        const pageTitle = document.querySelector('h1, .module-title');
        if (pageTitle) ctx.page_title = pageTitle.textContent.trim().substring(0, 60);

        // Canvas snapshot for Drawing Studio — gives AI spatial awareness
        if (module === 'drawing' && typeof window.__auraCanvasSnapshot === 'function') {
            try {
                const snapshot = window.__auraCanvasSnapshot();
                ctx.canvas = snapshot;
            } catch(e) { /* ignore */ }
        }

        // 3D scene objects for 3D Builder
        if ((module === '3d_studio' || module === 'shapes_3d') && typeof window.sbGetObjects === 'function') {
            try { ctx.scene_objects = window.sbGetObjects(); } catch(e) {}
        }

        // Beat maker state for Music module
        if (module === 'music' && typeof window.__auraGetBeatState === 'function') {
            try {
                const state = window.__auraGetBeatState();
                ctx.beat_state = {
                    bpm: state.bpm,
                    swing: state.swing,
                    trackIds: state.trackIds,
                    activeTracks: state.trackIds.filter(id => state.grid[id] && state.grid[id].some(v => !!v)),
                };
            } catch(e) { /* ignore */ }
        }

        // Expose for external scripts
        window.__auraContext = ctx;
        return ctx;
    }

    /* ── Collapse / Expand ── */
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('collapsed');
        });
    }
    const header = panel.querySelector('.aura-embed-header');
    if (header) {
        header.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
        });
    }

    /* ══════════════════════════════════════════
       MARKDOWN PARSER — supports bold, italic,
       code, lists, headers, links
    ══════════════════════════════════════════ */
    function md(text) {
        return text
            // Code blocks
            .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code style="background:rgba(124,58,237,0.15);padding:1px 5px;border-radius:3px;font-size:.82em;">$1</code>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Headers (h3, h4)
            .replace(/^### (.+)/gm, '<div style="font-weight:800;font-size:.92rem;margin:8px 0 4px;color:#f97316;">$1</div>')
            .replace(/^## (.+)/gm, '<div style="font-weight:800;font-size:1rem;margin:10px 0 4px;color:#f97316;">$1</div>')
            // Unordered lists
            .replace(/^[-•]\s+(.+)/gm, '<li>$1</li>')
            // Ordered lists
            .replace(/^\d+\.\s+(.+)/gm, '<li>$1</li>')
            .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul style="margin:4px 0;padding-left:18px;list-style:none;">$1</ul>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#f97316;text-decoration:underline;">$1</a>')
            // Line breaks
            .replace(/\n/g, '<br>');
    }

    /* ── Message management ── */
    function addMsg(role, content) {
        const welcome = messagesEl.querySelector('.aura-embed-welcome');
        if (welcome) welcome.remove();
        if (chipsWrap) chipsWrap.style.display = 'none';

        const el = document.createElement('div');
        el.className = `aura-embed-msg ${role}`;

        if (role === 'ai') {
            el.innerHTML = md(content);
        } else {
            el.innerHTML = escapeHtml(content);
        }

        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return el;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function addTyping() {
        const el = document.createElement('div');
        el.className = 'aura-embed-typing';
        el.id = 'auraEmbedTyping';
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;">
                <span class="aura-embed-typing-dot"></span>
                <span class="aura-embed-typing-dot"></span>
                <span class="aura-embed-typing-dot"></span>
                <span style="font-size:.7rem;color:rgba(255,255,255,.35);margin-left:4px;">VirtuAi is thinking...</span>
            </div>`;
        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById('auraEmbedTyping');
        if (el) el.remove();
    }

    /* ══════════════════════════════════════════
       ACTION RESULT RENDERERS — 10 action types
    ══════════════════════════════════════════ */
    function renderActionResult(data) {
        const result = data.result || {};
        let html = '<div class="aura-action-result" style="margin-top:10px;padding:12px;background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.15);border-radius:10px;">';

        if (result.type === 'palette' && result.colors) {
            html += `<div style="font-weight:800;margin-bottom:6px;font-size:.85rem;">🎨 ${result.theme || 'Color Palette'}</div>`;
            if (result.harmony) html += `<div style="font-size:.7rem;color:#a8a29e;margin-bottom:6px;">Harmony: ${result.harmony}</div>`;
            html += '<div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;">';
            result.colors.forEach(c => {
                html += `<div class="aura-palette-swatch" data-color="${c}" style="width:34px;height:34px;border-radius:8px;background:${c};border:2px solid rgba(255,255,255,0.1);cursor:pointer;transition:all .15s;box-shadow:0 2px 8px ${c}33;" title="${c}"></div>`;
            });
            html += '</div>';
            if (result.description) html += `<div style="font-size:.72rem;color:#a8a29e;line-height:1.3;">${result.description}</div>`;
            html += '<div style="font-size:.65rem;color:rgba(255,255,255,.25);margin-top:4px;">Click any swatch to apply</div>';
            applyPaletteToWorkspace(result.colors);

        } else if (result.type === 'progression' && result.chords) {
            html += `<div style="font-weight:800;margin-bottom:4px;font-size:.85rem;">🎵 ${result.genre || 'Chord Progression'}</div>`;
            if (result.key) html += `<span style="font-size:.7rem;color:#a8a29e;">Key: ${result.key} · </span>`;
            html += `<span style="font-size:.7rem;color:#a8a29e;">${result.bpm || 120} BPM</span>`;
            html += '<div style="display:flex;gap:6px;margin:8px 0;flex-wrap:wrap;">';
            result.chords.forEach(ch => {
                html += `<span style="padding:5px 12px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.25);border-radius:8px;font-weight:700;font-size:0.85rem;color:#f97316;">${ch}</span>`;
            });
            html += '</div>';
            if (result.strumming) html += `<div style="font-size:.72rem;color:#a8a29e;">Rhythm: ${result.strumming}</div>`;
            if (result.description) html += `<div style="font-size:.72rem;color:#a8a29e;margin-top:4px;">${result.description}</div>`;
            applyProgressionToWorkspace(result);

        } else if (result.type === 'story_created') {
            html += '<div style="font-weight:800;margin-bottom:4px;">✨ Story Created!</div>';
            html += `<a href="/story/${result.story_id}" style="color:#f97316;font-weight:600;text-decoration:underline;font-size:.85rem;">"${result.title}" → Open in Story Workshop</a>`;
            html += `<button class="aura-action-go-btn" onclick="window.location.href='/story/${result.story_id}'" style="margin-top:8px;display:block;padding:8px 16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:.78rem;cursor:pointer;transition:all .2s;">📖 Open Story Now</button>`;

        } else if (result.type === 'chapter_added') {
            html += '<div style="font-weight:800;margin-bottom:4px;">📖 Chapter Added!</div>';
            html += `<a href="/story/${result.story_id}" style="color:#f97316;font-weight:600;text-decoration:underline;font-size:.85rem;">"${result.title}" → View in story</a>`;
            if (window.location.pathname.includes('/story/' + result.story_id)) {
                setTimeout(() => window.location.reload(), 1500);
            }

        } else if (result.type === 'scene_added') {
            html += '<div style="font-weight:800;margin-bottom:4px;">🎬 Scene Written!</div>';
            html += `<div style="font-size:.78rem;color:#a8a29e;">"${result.title}"</div>`;
            setTimeout(() => window.location.reload(), 1500);

        } else if (result.type === 'draw_pixels' && result.pixels) {
            html += `<div style="font-weight:800;margin-bottom:4px;">🎨 ${result.description || 'Artwork'}</div>`;
            html += `<div style="font-size:.72rem;color:#a8a29e;">${result.pixels.length} pixels painted</div>`;
            if (result.style) html += `<div style="font-size:.65rem;color:rgba(255,255,255,.3);">Style: ${result.style}</div>`;
            drawPixelsOnCanvas(result.pixels);

        } else if (result.type === 'beat_pattern' && result.pattern) {
            const trackCount = Object.keys(result.pattern).length;
            html += `<div style="font-weight:800;margin-bottom:4px;">🥁 ${result.name || 'Custom Beat'}</div>`;
            if (result.genre) html += `<span style="font-size:.7rem;color:#a8a29e;">${result.genre} · </span>`;
            html += `<span style="font-size:.7rem;color:#a8a29e;">${trackCount} tracks loaded</span>`;
            if (result.tips) html += `<div style="font-size:.72rem;color:#a8a29e;margin-top:6px;">💡 ${result.tips}</div>`;
            fillBeatGrid(result.pattern, result.bpm);

        } else if (result.type === 'clear_canvas') {
            html += '<div style="font-weight:800;">🧹 Canvas Cleared!</div>';
            html += '<div style="font-size:.72rem;color:#a8a29e;">Fresh start — the blank canvas is full of possibilities.</div>';
            executeClearCanvas();

        } else if (result.type === 'analysis') {
            html += '<div style="font-weight:800;margin-bottom:6px;">💡 Creative Analysis</div>';
            if (result.analysis) html += `<div style="font-size:.82rem;margin-bottom:8px;line-height:1.4;">${result.analysis}</div>`;
            if (result.suggestions && result.suggestions.length) {
                html += '<div style="font-weight:700;font-size:.78rem;margin-bottom:4px;">Suggestions:</div>';
                result.suggestions.forEach((s, i) => {
                    html += `<div style="font-size:.78rem;color:#e2e2e2;margin-bottom:3px;padding-left:12px;">
                        <span style="color:#f97316;font-weight:700;">${i+1}.</span> ${s}</div>`;
                });
            }
            if (result.inspiration) html += `<div style="font-size:.68rem;color:rgba(255,255,255,.35);margin-top:6px;font-style:italic;">🎯 Inspiration: ${result.inspiration}</div>`;

        } else if (result.type === 'challenge') {
            html += `<div style="font-weight:800;margin-bottom:4px;font-size:.92rem;">🏆 ${result.title}</div>`;
            const diffColors = {Beginner:'#22c55e',Intermediate:'#f97316',Advanced:'#ef4444',Master:'#7c3aed'};
            html += `<span style="font-size:.65rem;padding:2px 8px;border-radius:4px;background:${diffColors[result.difficulty]||'#888'}22;color:${diffColors[result.difficulty]||'#888'};font-weight:700;">${result.difficulty}</span>`;
            if (result.time_limit) html += `<span style="font-size:.65rem;color:#a8a29e;margin-left:8px;">⏱ ${result.time_limit} min</span>`;
            html += `<div style="font-size:.82rem;margin-top:8px;line-height:1.4;">${result.description}</div>`;
            if (result.tips && result.tips.length) {
                html += '<div style="margin-top:6px;">';
                result.tips.forEach(t => {
                    html += `<div style="font-size:.72rem;color:#a8a29e;margin-bottom:2px;">💡 ${t}</div>`;
                });
                html += '</div>';
            }

        } else if (result.type === 'drawing_generated' && result.instructions) {
            html += `<div style="font-weight:800;margin-bottom:4px;">🎨 ${result.description || 'Artwork'}</div>`;
            html += `<div style="font-size:.72rem;color:#a8a29e;">${result.instructions.length} shapes rendered on canvas</div>`;
            executeGenerateDrawing(result.instructions);

        } else if (result.type === '3d_shape_added') {
            html += `<div style="font-weight:800;margin-bottom:4px;">🧊 ${result.name || result.shape}</div>`;
            html += `<div style="font-size:.72rem;color:#a8a29e;">Shape: ${result.shape} · Material: ${result.material} · Color: ${result.color}</div>`;
            execute3dAddShape(result);

        } else if (result.type === '3d_environment') {
            html += `<div style="font-weight:800;margin-bottom:4px;">🌍 Environment: ${result.environment}</div>`;
            execute3dEnvironment(result.environment);

        } else if (result.type === '3d_lighting') {
            html += `<div style="font-weight:800;margin-bottom:4px;">💡 Lighting Updated</div>`;
            execute3dLighting(result);

        } else if (result.type === 'canvas_fill') {
            html += `<div style="font-weight:800;margin-bottom:4px;">🎨 Filled area with ${result.color}</div>`;
            executeCanvasFill(result.x, result.y, result.color);

        } else if (result.type === 'artwork_generated') {
            html += `<div style="font-weight:800;margin-bottom:4px;">🎨 ${result.subject || 'Artwork'}</div>`;
            html += `<div style="font-size:.72rem;color:#a8a29e;">Rendered with parametric template engine</div>`;
            if (typeof window.__auraDrawArtwork === 'function') {
                const count = window.__auraDrawArtwork(result.params || {subject: result.subject});
                html += `<div style="font-size:.65rem;color:rgba(255,255,255,.25);margin-top:4px;">${count} shapes generated</div>`;
                showAuraToast('🎨 Drawing ' + (result.subject || 'artwork') + ' — ' + count + ' shapes!');
            } else {
                showAuraToast('⚠️ Drawing Studio canvas not found');
            }
        }

        html += '</div>';

        // Attach palette click handlers
        setTimeout(() => {
            document.querySelectorAll('.aura-palette-swatch').forEach(swatch => {
                swatch.addEventListener('click', () => {
                    const color = swatch.dataset.color;
                    applyColorToCanvas(color);
                    document.querySelectorAll('.aura-palette-swatch').forEach(s => s.style.borderColor = 'rgba(255,255,255,0.1)');
                    swatch.style.borderColor = '#fff';
                    swatch.style.transform = 'scale(1.15)';
                    setTimeout(() => { swatch.style.transform = ''; }, 200);
                });
            });
        }, 50);

        return html;
    }

    /* ══════════════════════════════════════════
       WORKSPACE EXECUTORS — AI → Module Bridge
    ══════════════════════════════════════════ */

    function applyColorToCanvas(hex) {
        const pixelColorInput = document.querySelector('input[type="color"]');
        if (pixelColorInput) {
            pixelColorInput.value = hex;
            pixelColorInput.dispatchEvent(new Event('input', { bubbles: true }));
            pixelColorInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const drawingPicker = document.getElementById('colorPicker') || document.getElementById('drawColor');
        if (drawingPicker) {
            drawingPicker.value = hex;
            drawingPicker.dispatchEvent(new Event('input', { bubbles: true }));
            drawingPicker.dispatchEvent(new Event('change', { bubbles: true }));
        }
        window.__auraSelectedColor = hex;
        const preview = document.querySelector('.color-preview, .current-color, #currentColorPreview');
        if (preview) preview.style.background = hex;
        showAuraToast('🎨 Color set to ' + hex);
    }

    function applyPaletteToWorkspace(colors) {
        const paletteContainer = document.querySelector('.pixel-palette, .color-swatches, #colorPalette, .pa-palette');
        if (paletteContainer) {
            colors.forEach(hex => {
                const existing = paletteContainer.querySelector(`[data-color="${hex}"]`);
                if (existing) return;
                const swatch = document.createElement('div');
                swatch.className = 'ai-injected-swatch';
                swatch.dataset.color = hex;
                swatch.style.cssText = `width:28px;height:28px;border-radius:6px;background:${hex};border:2px solid rgba(255,255,255,0.15);cursor:pointer;transition:all .15s;display:inline-block;margin:2px;box-shadow:0 0 8px ${hex}44;`;
                swatch.title = hex;
                swatch.addEventListener('click', () => applyColorToCanvas(hex));
                paletteContainer.appendChild(swatch);
            });
            showAuraToast('🎨 ' + colors.length + ' colors added!');
        }
        if (colors.length > 0) applyColorToCanvas(colors[0]);
        window.__auraPalette = colors;
    }

    function applyProgressionToWorkspace(result) {
        const bpmSlider = document.getElementById('bpmSlider');
        const bpmLabel = document.getElementById('bpmLabel');
        if (bpmSlider && result.bpm) {
            bpmSlider.value = result.bpm;
            bpmSlider.dispatchEvent(new Event('input', { bubbles: true }));
            if (bpmLabel) bpmLabel.textContent = result.bpm;
            showAuraToast('🎵 BPM set to ' + result.bpm);
        }
        window.__auraProgression = result;
    }

    function drawPixelsOnCanvas(pixels) {
        if (!pixels || !pixels.length) return;
        const gridCells = document.querySelectorAll('.pixel-cell, .pa-cell, [data-x]');
        if (gridCells.length > 0) {
            const cellMap = {};
            gridCells.forEach(cell => {
                const x = parseInt(cell.dataset.x ?? cell.dataset.col);
                const y = parseInt(cell.dataset.y ?? cell.dataset.row);
                if (!isNaN(x) && !isNaN(y)) cellMap[x + ',' + y] = cell;
            });
            pixels.forEach((p, i) => {
                setTimeout(() => {
                    const cell = cellMap[p.x + ',' + p.y];
                    if (cell) {
                        cell.style.backgroundColor = p.color;
                        cell.dataset.color = p.color;
                        cell.classList.add('filled');
                    }
                }, i * 12);
            });
            showAuraToast('🎨 Painting ' + pixels.length + ' pixels...');
            return;
        }
        const canvas = document.querySelector('canvas.pixel-canvas, canvas#pixelCanvas, canvas#drawingCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const gridSize = parseInt(canvas.dataset.gridSize) || 16;
            const cellW = canvas.width / gridSize;
            const cellH = canvas.height / gridSize;
            pixels.forEach((p, i) => {
                setTimeout(() => {
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x * cellW, p.y * cellH, cellW, cellH);
                }, i * 12);
            });
            showAuraToast('🎨 Drawing on canvas...');
            return;
        }
        window.__auraDrawPixels = pixels;
    }

    function fillBeatGrid(pattern, bpm) {
        if (!pattern) return;

        // Use the direct beat maker API if available (preferred — manipulates internal state)
        if (typeof window.__auraLoadBeat === 'function') {
            const loaded = window.__auraLoadBeat(pattern, bpm);
            showAuraToast('🥁 ' + loaded + ' tracks loaded!');
            return;
        }

        // Fallback: set BPM via DOM
        if (bpm) {
            const sl = document.getElementById('bpmSlider');
            const lb = document.getElementById('bpmLabel');
            if (sl) { sl.value = bpm; sl.dispatchEvent(new Event('input', {bubbles:true})); }
            if (lb) lb.textContent = bpm;
        }

        // Fallback: click cells via DOM
        const beatGrid = document.getElementById('beatGrid');
        if (beatGrid) {
            const rows = beatGrid.querySelectorAll('.beat-row');
            let loaded = 0;
            rows.forEach(row => {
                const tid = row.dataset.sound;
                if (!tid || !pattern[tid]) return;
                const cells = row.querySelectorAll('.beat-cell');
                const steps = pattern[tid];
                cells.forEach((cell, i) => {
                    if (i < steps.length && !!steps[i] !== cell.classList.contains('on')) {
                        setTimeout(() => cell.click(), i * 25 + loaded * 40);
                    }
                });
                loaded++;
            });
            showAuraToast('🥁 ' + loaded + ' tracks loaded!');
        } else {
            window.__auraBeatPattern = pattern;
        }
    }

    function executeClearCanvas() {
        const clearBtn = document.querySelector('.pa-clear, #btnClear, [data-action="clear"]');
        if (clearBtn) { clearBtn.click(); showAuraToast('🧹 Cleared!'); return; }
        const resetBtn = document.getElementById('btnReset');
        if (resetBtn) { resetBtn.click(); showAuraToast('🧹 Reset!'); return; }
        const canvas = document.querySelector('canvas.pixel-canvas, canvas#pixelCanvas');
        if (canvas) {
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            showAuraToast('🧹 Cleared!'); return;
        }
        document.querySelectorAll('.pixel-cell.filled, .pa-cell.filled').forEach(c => {
            c.style.backgroundColor = ''; c.classList.remove('filled');
        });
        showAuraToast('🧹 Cleared!');
    }

    /* ── Drawing Studio AI Executor ── */
    function executeGenerateDrawing(instructions) {
        if (typeof window.__auraDrawOnCanvas === 'function') {
            window.__auraDrawOnCanvas(instructions);
            showAuraToast('🎨 Drawing ' + instructions.length + ' shapes...');
        } else {
            window.__auraDrawInstructions = instructions;
            showAuraToast('⚠️ Drawing Studio canvas not found');
        }
    }

    /* ── 3D Builder AI Executors ── */
    function execute3dAddShape(result) {
        if (typeof window.sbAddObject === 'function') {
            const opts = {
                color: result.color || '#f97316',
                materialType: result.material || 'standard',
                name: result.name || undefined,
            };
            if (result.position) opts.position = result.position;
            if (result.scale) opts.scale = result.scale;
            window.sbAddObject(result.shape || 'cube', opts);
            showAuraToast('🧊 Added ' + (result.name || result.shape));
        } else {
            showAuraToast('⚠️ 3D Builder not active');
        }
    }

    function execute3dEnvironment(envName) {
        if (typeof window.sbSetEnvironment === 'function') {
            window.sbSetEnvironment(envName);
            showAuraToast('🌍 ' + envName + ' environment');
        }
    }

    function execute3dLighting(result) {
        if (typeof window.sbSetLighting === 'function') {
            const opts = {};
            if (result.ambientIntensity != null) opts.ambientIntensity = result.ambientIntensity;
            if (result.ambientColor) opts.ambientColor = result.ambientColor;
            if (result.dirIntensity != null) opts.dirIntensity = result.dirIntensity;
            if (result.dirColor) opts.dirColor = result.dirColor;
            window.sbSetLighting(opts);
            showAuraToast('💡 Lighting updated');
        }
    }

    /* ── Canvas Fill Executor ── */
    function executeCanvasFill(x, y, color) {
        if (typeof window.__auraFloodFill === 'function') {
            window.__auraFloodFill(x, y, color);
            showAuraToast('🎨 Filled at (' + Math.round(x) + ',' + Math.round(y) + ')');
        } else {
            showAuraToast('⚠️ Canvas fill not available');
        }
    }

    /* ── Toast Notification ── */
    function showAuraToast(msg) {
        let toast = document.getElementById('auraToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'auraToast';
            toast.style.cssText = `
                position:fixed;bottom:80px;right:24px;z-index:9999;
                background:rgba(15,15,20,0.95);backdrop-filter:blur(16px);
                border:1px solid rgba(249,115,22,0.35);border-radius:12px;
                padding:10px 18px;color:#f97316;font-size:.82rem;font-weight:700;
                font-family:'Inter',sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.5);
                transform:translateY(10px);opacity:0;transition:all .3s cubic-bezier(.34,1.56,.64,1);
                pointer-events:none;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
        }, 2800);
    }

    /* ══════════════════════════════════════════
       SMART NAVIGATION
    ══════════════════════════════════════════ */
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
        addMsg('user', text);
        inputEl.value = '';
        const b = addMsg('ai', '');
        b.innerHTML = `<strong>Taking you to ${best.label}…</strong><br><span style="font-size:.75rem;color:rgba(255,255,255,.4);">Redirecting in 2s — <a href="${best.url}" style="color:#f97316;font-weight:600;">Go Now →</a></span>`;
        let c = 2;
        const t = setInterval(() => { c--; if (c <= 0) { clearInterval(t); window.location.href = best.url; } }, 1000);
        return true;
    }

    /* ══════════════════════════════════════════
       SEND MESSAGE — action detection + streaming
       with full conversation history for multi-turn
    ══════════════════════════════════════════ */
    async function send() {
        const text = inputEl.value.trim();
        if (!text || isStreaming) return;

        // Check navigation intent first
        if (tryNavigate(text)) return;

        addMsg('user', text);
        history.push({ role: 'user', content: text });
        inputEl.value = '';
        inputEl.style.height = 'auto';

        isStreaming = true;
        sendBtn.disabled = true;
        addTyping();

        try {
            // Try action endpoint first (has function calling + conversation history)
            const actionResp = await fetch('/api/ai/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    module: module,
                    context: getWorkspaceContext(),
                    history: history.slice(-16),
                }),
            });

            if (actionResp.ok) {
                const actionData = await actionResp.json();
                removeTyping();

                if (actionData.action && actionData.result) {
                    const bubble = addMsg('ai', actionData.reply || 'Done!');
                    bubble.innerHTML = md(actionData.reply || 'Done!') + renderActionResult(actionData);
                    history.push({ role: 'assistant', content: actionData.reply || 'Done!' });
                    isStreaming = false;
                    sendBtn.disabled = false;
                    inputEl.focus();
                    return;
                } else if (actionData.reply) {
                    addMsg('ai', actionData.reply);
                    history.push({ role: 'assistant', content: actionData.reply });
                    isStreaming = false;
                    sendBtn.disabled = false;
                    inputEl.focus();
                    return;
                }
            }

            // Streaming fallback (SSE with conversation history)
            const res = await fetch('/api/ai/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, module, history: history.slice(-16) }),
            });

            if (!res.ok) throw new Error('stream fail');

            removeTyping();
            const bubble = addMsg('ai', '');
            let full = '';

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    const t = line.trim();
                    if (!t || t === 'data: [DONE]') continue;
                    if (t.startsWith('data: ')) {
                        try {
                            const d = JSON.parse(t.slice(6));
                            if (d.content) {
                                full += d.content;
                                bubble.innerHTML = md(full);
                                messagesEl.scrollTop = messagesEl.scrollHeight;
                            }
                        } catch (e) {}
                    }
                }
            }
            history.push({ role: 'assistant', content: full });

        } catch (err) {
            removeTyping();
            try {
                const fb = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, module, history: history.slice(-12) }),
                });
                const data = await fb.json();
                if (data.reply) {
                    addMsg('ai', data.reply);
                    history.push({ role: 'assistant', content: data.reply });
                } else {
                    addMsg('ai', '⚠️ ' + (data.error || 'Something went wrong.'));
                }
            } catch (e2) {
                addMsg('ai', '⚠️ Connection error — please try again.');
            }
        }

        isStreaming = false;
        sendBtn.disabled = false;
        inputEl.focus();
    }

    /* ── Event listeners ── */
    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
    });

    /* ── Suggestion chips ── */
    if (chipsWrap) {
        chipsWrap.querySelectorAll('.aura-embed-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                inputEl.value = chip.dataset.auraSuggest.replace(/[^\w\s?.,!]/g, '').trim();
                send();
            });
        });
    }

})();
