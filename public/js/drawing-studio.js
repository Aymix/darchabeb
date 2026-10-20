/**
 * VirtuArts — Drawing Studio
 * Full HTML5 Canvas drawing app with brushes, shapes, colors, undo/redo.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('drawingCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // State
  let drawing = false;
  let tool = 'brush';
  let color = '#f97316';
  let brushSize = 4;
  let brushOpacity = 1;
  let history = [];
  let historyIndex = -1;
  let lastX = 0, lastY = 0;
  let shapeStart = null;
  let snapshot = null;

  // Setup canvas size
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const tmp = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    ctx.putImageData(tmp, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function init() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 600;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    saveState();
  }

  // History
  function saveState() {
    historyIndex++;
    history = history.slice(0, historyIndex);
    history.push(canvas.toDataURL());
    if (history.length > 50) { history.shift(); historyIndex--; }
    updateUndoButtons();
  }

  function undo() { if (historyIndex <= 0) return; historyIndex--; loadState(history[historyIndex]); }
  function redo() { if (historyIndex >= history.length - 1) return; historyIndex++; loadState(history[historyIndex]); }

  function loadState(dataUrl) {
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); updateUndoButtons(); };
    img.src = dataUrl;
  }

  function updateUndoButtons() {
    const undoBtn = document.getElementById('btnUndo');
    const redoBtn = document.getElementById('btnRedo');
    if (undoBtn) undoBtn.style.opacity = historyIndex > 0 ? '1' : '0.3';
    if (redoBtn) redoBtn.style.opacity = historyIndex < history.length - 1 ? '1' : '0.3';
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return [x, y];
  }

  // ── SPRAY TOOL helper ──
  function sprayDots(x, y) {
    const density = brushSize * 3;
    ctx.fillStyle = color;
    ctx.globalAlpha = brushOpacity * 0.3;
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * brushSize * 2;
      ctx.fillRect(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 1, 1);
    }
    ctx.globalAlpha = brushOpacity;
  }

  // ── SMUDGE TOOL helper ──
  function smudge(x, y) {
    const r = brushSize * 2;
    const imgData = ctx.getImageData(x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 0.4;
    ctx.putImageData(imgData, x - r + 1, y - r + 1);
    ctx.globalAlpha = brushOpacity;
  }

  // ── Shape helpers ──
  function drawTriangle(cx, cy, x, y) {
    const w = x - cx, h = y - cy;
    ctx.beginPath();
    ctx.moveTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx + w, cy + h);
    ctx.closePath();
    ctx.stroke();
  }

  function drawStar(cx, cy, x, y) {
    const outerR = Math.max(Math.abs(x - cx), Math.abs(y - cy)) / 2;
    const innerR = outerR * 0.4;
    const centerX = (cx + x) / 2, centerY = (cy + y) / 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const px = centerX + r * Math.cos(angle);
      const py = centerY + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // ── DRAWING EVENTS ──
  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    [lastX, lastY] = getPos(e);

    // Eyedropper: pick color on click
    if (tool === 'eyedropper') {
      const px = ctx.getImageData(lastX, lastY, 1, 1).data;
      color = '#' + [px[0], px[1], px[2]].map(c => c.toString(16).padStart(2, '0')).join('');
      const cp = document.getElementById('colorPicker');
      if (cp) cp.value = color;
      document.querySelectorAll('[data-color]').forEach(s => s.classList.remove('active'));
      drawing = false;
      return;
    }

    // Fill tool
    if (tool === 'fill') {
      if (window.__auraFloodFill) window.__auraFloodFill(lastX, lastY, color);
      drawing = false;
      return;
    }

    // Text tool
    if (tool === 'text') {
      const txt = prompt('Enter text:');
      if (txt) {
        ctx.save();
        ctx.globalAlpha = brushOpacity;
        ctx.font = brushSize * 4 + 'px "Outfit", sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(txt, lastX, lastY);
        ctx.restore();
        saveState();
      }
      drawing = false;
      return;
    }

    // Shape tools
    if (['rect', 'circle', 'line', 'triangle', 'star'].includes(tool)) {
      shapeStart = [lastX, lastY];
      snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const [x, y] = getPos(e);

    ctx.globalAlpha = brushOpacity;

    if (tool === 'brush') {
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y);
      ctx.strokeStyle = color; ctx.lineWidth = brushSize;
      ctx.lineCap = 'round'; ctx.stroke();
      [lastX, lastY] = [x, y];
    } else if (tool === 'pencil') {
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y);
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.lineCap = 'butt'; ctx.stroke();
      [lastX, lastY] = [x, y];
    } else if (tool === 'calligraphy') {
      const dx = x - lastX, dy = y - lastY;
      const angle = Math.atan2(dy, dx);
      const width = brushSize * (0.3 + Math.abs(Math.sin(angle)) * 0.7);
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y);
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.lineCap = 'butt'; ctx.stroke();
      [lastX, lastY] = [x, y];
    } else if (tool === 'spray') {
      sprayDots(x, y);
    } else if (tool === 'smudge') {
      smudge(x, y);
      [lastX, lastY] = [x, y];
    } else if (tool === 'eraser') {
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = brushSize * 3;
      ctx.lineCap = 'round'; ctx.stroke();
      [lastX, lastY] = [x, y];
    } else if (shapeStart && snapshot) {
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      ctx.strokeStyle = color; ctx.lineWidth = brushSize; ctx.lineCap = 'round';
      if (tool === 'rect') {
        ctx.strokeRect(shapeStart[0], shapeStart[1], x - shapeStart[0], y - shapeStart[1]);
      } else if (tool === 'circle') {
        const rx = Math.abs(x - shapeStart[0]) / 2, ry = Math.abs(y - shapeStart[1]) / 2;
        ctx.ellipse(shapeStart[0] + (x - shapeStart[0]) / 2, shapeStart[1] + (y - shapeStart[1]) / 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.moveTo(shapeStart[0], shapeStart[1]); ctx.lineTo(x, y); ctx.stroke();
      } else if (tool === 'triangle') {
        drawTriangle(shapeStart[0], shapeStart[1], x, y);
      } else if (tool === 'star') {
        drawStar(shapeStart[0], shapeStart[1], x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function endDraw() {
    if (!drawing) return;
    drawing = false; shapeStart = null; snapshot = null;
    saveState();
  }

  // Events
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  // Tool selection
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tool = btn.dataset.tool;
      canvas.style.cursor = tool === 'eyedropper' ? 'crosshair' : tool === 'fill' ? 'cell' : tool === 'text' ? 'text' : 'default';
    });
  });

  const colorPicker = document.getElementById('colorPicker');
  if (colorPicker) colorPicker.addEventListener('input', e => { color = e.target.value; });

  const sizeSlider = document.getElementById('brushSize');
  const sizeLabel = document.getElementById('sizeLabel');
  if (sizeSlider) sizeSlider.addEventListener('input', e => {
    brushSize = parseInt(e.target.value);
    if (sizeLabel) sizeLabel.textContent = brushSize + 'px';
  });

  // Opacity slider
  const opacitySlider = document.getElementById('brushOpacity');
  const opacityLabel = document.getElementById('opacityLabel');
  if (opacitySlider) opacitySlider.addEventListener('input', e => {
    brushOpacity = parseInt(e.target.value) / 100;
    if (opacityLabel) opacityLabel.textContent = e.target.value + '%';
  });

  document.getElementById('btnUndo')?.addEventListener('click', undo);
  document.getElementById('btnRedo')?.addEventListener('click', redo);

  document.getElementById('btnClear')?.addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  });

  // Quick palette colors
  document.querySelectorAll('[data-color]').forEach(swatch => {
    swatch.addEventListener('click', () => {
      color = swatch.dataset.color;
      if (colorPicker) colorPicker.value = color;
      document.querySelectorAll('[data-color]').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    });
  });

  // Save
  document.getElementById('btnSave')?.addEventListener('click', async () => {
    const title = prompt('Give your drawing a title:', 'My Drawing');
    if (!title) return;
    const btn = document.getElementById('btnSave');
    btn.textContent = 'Saving...';
    btn.disabled = true;
    try {
      const resp = await fetch('/drawing/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, image: canvas.toDataURL('image/png'), description: '' }),
      });
      const data = await resp.json();
      if (data.success) {
        btn.textContent = '✓ Saved!';
        setTimeout(() => { btn.textContent = '💾 Save'; btn.disabled = false; }, 2000);
      }
    } catch (err) {
      btn.textContent = '💾 Save';
      btn.disabled = false;
      alert('Error saving: ' + err.message);
    }
  });

  // Download
  document.getElementById('btnDownload')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'virtuarts-drawing.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  init();

  /* ══════════════════════════════════════════
     AURA AI DRAWING BRIDGE
     Allows AI to programmatically draw on canvas
  ══════════════════════════════════════════ */
  window.__auraDrawOnCanvas = function(instructions) {
    if (!instructions || !instructions.length) return;
    instructions.forEach((cmd, i) => {
      setTimeout(() => {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (cmd.type === 'circle' || cmd.type === 'filled_circle') {
          ctx.beginPath();
          ctx.arc(cmd.x, cmd.y, cmd.r || 20, 0, Math.PI * 2);
          if (cmd.type === 'filled_circle') { ctx.fillStyle = cmd.color || color; ctx.fill(); }
          if (cmd.stroke !== false) { ctx.strokeStyle = cmd.strokeColor || cmd.color || color; ctx.lineWidth = cmd.lineWidth || 2; ctx.stroke(); }
        } else if (cmd.type === 'rect' || cmd.type === 'filled_rect') {
          if (cmd.type === 'filled_rect') { ctx.fillStyle = cmd.color || color; ctx.fillRect(cmd.x, cmd.y, cmd.w || 40, cmd.h || 40); }
          else { ctx.strokeStyle = cmd.color || color; ctx.lineWidth = cmd.lineWidth || 2; ctx.strokeRect(cmd.x, cmd.y, cmd.w || 40, cmd.h || 40); }
        } else if (cmd.type === 'line') {
          ctx.beginPath(); ctx.moveTo(cmd.x1, cmd.y1); ctx.lineTo(cmd.x2, cmd.y2);
          ctx.strokeStyle = cmd.color || color; ctx.lineWidth = cmd.lineWidth || 2; ctx.stroke();
        } else if (cmd.type === 'path') {
          ctx.beginPath();
          (cmd.points || []).forEach((p, j) => { j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
          if (cmd.close) ctx.closePath();
          if (cmd.fill) { ctx.fillStyle = cmd.color || color; ctx.fill(); }
          if (cmd.stroke !== false) { ctx.strokeStyle = cmd.strokeColor || cmd.color || color; ctx.lineWidth = cmd.lineWidth || 2; ctx.stroke(); }
        } else if (cmd.type === 'ellipse') {
          ctx.beginPath(); ctx.ellipse(cmd.x, cmd.y, cmd.rx || 30, cmd.ry || 20, (cmd.rotation || 0) * Math.PI / 180, 0, Math.PI * 2);
          if (cmd.fill) { ctx.fillStyle = cmd.color || color; ctx.fill(); }
          if (cmd.stroke !== false) { ctx.strokeStyle = cmd.strokeColor || cmd.color || color; ctx.lineWidth = cmd.lineWidth || 2; ctx.stroke(); }
        } else if (cmd.type === 'arc') {
          ctx.beginPath(); ctx.arc(cmd.x, cmd.y, cmd.r || 20, (cmd.startAngle || 0) * Math.PI / 180, (cmd.endAngle || 360) * Math.PI / 180);
          if (cmd.fill) { ctx.fillStyle = cmd.color || color; ctx.fill(); }
          ctx.strokeStyle = cmd.strokeColor || cmd.color || color; ctx.lineWidth = cmd.lineWidth || 2; ctx.stroke();
        } else if (cmd.type === 'bezier') {
          ctx.beginPath(); ctx.moveTo(cmd.x1, cmd.y1);
          ctx.bezierCurveTo(cmd.cx1, cmd.cy1, cmd.cx2, cmd.cy2, cmd.x2, cmd.y2);
          if (cmd.fill) { ctx.fillStyle = cmd.color || color; ctx.fill(); }
          ctx.strokeStyle = cmd.strokeColor || cmd.color || color; ctx.lineWidth = cmd.lineWidth || 2; ctx.stroke();
        } else if (cmd.type === 'quadratic') {
          ctx.beginPath(); ctx.moveTo(cmd.x1, cmd.y1);
          ctx.quadraticCurveTo(cmd.cx, cmd.cy, cmd.x2, cmd.y2);
          if (cmd.fill) { ctx.fillStyle = cmd.color || color; ctx.fill(); }
          ctx.strokeStyle = cmd.strokeColor || cmd.color || color; ctx.lineWidth = cmd.lineWidth || 2; ctx.stroke();
        } else if (cmd.type === 'text') {
          ctx.font = (cmd.fontSize || 16) + 'px ' + (cmd.fontFamily || 'Arial');
          ctx.fillStyle = cmd.color || color;
          ctx.textAlign = cmd.align || 'center';
          ctx.fillText(cmd.text || '', cmd.x, cmd.y);
        }
        ctx.restore();
      }, i * 30);
    });
    setTimeout(() => saveState(), instructions.length * 30 + 50);
  };

  /* ══════════════════════════════════════════
     PARAMETRIC ARTWORK ENGINE
     AI sends high-level params, JS does the math
  ══════════════════════════════════════════ */
  window.__auraDrawArtwork = function(params) {
    const cx = params.centerX || 400, cy = params.centerY || 280;
    const s = params.size || 1.0;
    const subject = (params.subject || '').toLowerCase();
    let cmds = [];

    // ── FLOWER / DAISY / ROSE / SUNFLOWER ──
    if (/flower|daisy|rose|sunflower|tulip|lotus/.test(subject)) {
      const petalCount = params.petalCount || (/sunflower/.test(subject) ? 20 : /rose/.test(subject) ? 16 : 12);
      const petalColor = params.petalColor || (/rose/.test(subject) ? '#E74C3C' : /sunflower/.test(subject) ? '#F1C40F' : '#FFFFFF');
      const petalColor2 = params.petalColor2 || shadeColor(petalColor, -20);
      const centerColor = params.centerColor || '#FFD700';
      const centerColor2 = params.centerColor2 || '#D4A017';
      const stemColor = params.stemColor || '#2E7D32';
      const stemColor2 = params.stemColor2 || '#1B5E20';
      const leafColor = params.leafColor || '#388E3C';
      const leafColor2 = params.leafColor2 || '#2E7D32';
      const petalR = (params.petalRadius || 65) * s;
      const petalRx = (params.petalRx || 32) * s;
      const petalRy = (params.petalRy || 12) * s;
      const centerR = (params.centerRadius || 22) * s;
      const stemLen = (params.stemLength || 200) * s;
      const stemW = (params.stemWidth || 6) * s;

      // Shadow under flower head
      cmds.push({type:'filled_circle', x:cx+3, y:cy+3, r:petalR+10, color:'rgba(0,0,0,0.06)'});

      // Stem (thick gradient)
      cmds.push({type:'line', x1:cx, y1:cy+centerR, x2:cx, y2:cy+stemLen, color:stemColor2, lineWidth:stemW+2});
      cmds.push({type:'line', x1:cx, y1:cy+centerR, x2:cx, y2:cy+stemLen, color:stemColor, lineWidth:stemW});

      // Leaves
      const leafY1 = cy + stemLen * 0.4;
      const leafY2 = cy + stemLen * 0.65;
      // Left leaf
      cmds.push({type:'path', points:[
        {x:cx, y:leafY1}, {x:cx-50*s, y:leafY1-35*s}, {x:cx-70*s, y:leafY1-15*s},
        {x:cx-55*s, y:leafY1+10*s}, {x:cx, y:leafY1+5*s}
      ], close:true, fill:true, color:leafColor, stroke:false});
      cmds.push({type:'path', points:[
        {x:cx, y:leafY1}, {x:cx-45*s, y:leafY1-30*s}, {x:cx-60*s, y:leafY1-10*s},
        {x:cx-48*s, y:leafY1+8*s}, {x:cx, y:leafY1+3*s}
      ], close:true, fill:true, color:leafColor2, stroke:false});
      // Leaf vein
      cmds.push({type:'line', x1:cx, y1:leafY1, x2:cx-55*s, y2:leafY1-12*s, color:stemColor2, lineWidth:1});
      // Right leaf
      cmds.push({type:'path', points:[
        {x:cx, y:leafY2}, {x:cx+50*s, y:leafY2-30*s}, {x:cx+68*s, y:leafY2-8*s},
        {x:cx+52*s, y:leafY2+15*s}, {x:cx, y:leafY2+5*s}
      ], close:true, fill:true, color:leafColor, stroke:false});
      cmds.push({type:'path', points:[
        {x:cx, y:leafY2}, {x:cx+45*s, y:leafY2-25*s}, {x:cx+58*s, y:leafY2-5*s},
        {x:cx+45*s, y:leafY2+12*s}, {x:cx, y:leafY2+3*s}
      ], close:true, fill:true, color:leafColor2, stroke:false});
      cmds.push({type:'line', x1:cx, y1:leafY2, x2:cx+52*s, y2:leafY2-5*s, color:stemColor2, lineWidth:1});

      // Petals (two layers for depth)
      for (let layer = 0; layer < 2; layer++) {
        const layerR = layer === 0 ? petalR * 1.1 : petalR * 0.85;
        const layerRx = layer === 0 ? petalRx * 1.15 : petalRx * 0.9;
        const layerRy = layer === 0 ? petalRy * 1.1 : petalRy;
        const offset = layer === 0 ? 0 : (360 / petalCount / 2);
        const col = layer === 0 ? petalColor2 : petalColor;
        for (let i = 0; i < petalCount; i++) {
          const angle = ((i * 360 / petalCount) + offset) * Math.PI / 180;
          const px = cx + layerR * Math.cos(angle);
          const py = cy + layerR * Math.sin(angle);
          const rot = (i * 360 / petalCount) + offset;
          cmds.push({type:'ellipse', x:px, y:py, rx:layerRx, ry:layerRy, rotation:rot, fill:true, color:col, stroke:false});
        }
      }

      // Center (layered for depth)
      cmds.push({type:'filled_circle', x:cx, y:cy, r:centerR*1.1, color:centerColor2});
      cmds.push({type:'filled_circle', x:cx, y:cy, r:centerR, color:centerColor});
      cmds.push({type:'filled_circle', x:cx, y:cy, r:centerR*0.6, color:centerColor2});
      // Center texture dots
      for (let i = 0; i < 8; i++) {
        const a = (i * 45) * Math.PI / 180;
        const dr = centerR * 0.4;
        cmds.push({type:'filled_circle', x:cx+dr*Math.cos(a), y:cy+dr*Math.sin(a), r:2*s, color:shadeColor(centerColor,-30)});
      }
      // Highlight
      cmds.push({type:'filled_circle', x:cx-centerR*0.25, y:cy-centerR*0.25, r:centerR*0.2, color:'rgba(255,255,255,0.35)'});
    }

    // ── TREE ──
    else if (/tree|oak|pine|palm/.test(subject)) {
      const trunkColor = params.trunkColor || '#5D4037';
      const leafColor = params.leafColor || '#388E3C';
      const trunkW = 30 * s, trunkH = 160 * s;
      // Trunk
      cmds.push({type:'filled_rect', x:cx-trunkW/2, y:cy, w:trunkW, h:trunkH, color:'#4E342E'});
      cmds.push({type:'filled_rect', x:cx-trunkW/2+3, y:cy, w:trunkW-6, h:trunkH, color:trunkColor});
      // Bark lines
      for (let i = 0; i < 5; i++) cmds.push({type:'line', x1:cx-8*s, y1:cy+i*30*s+10, x2:cx+5*s, y2:cy+i*30*s+20, color:'#4E342E', lineWidth:1});
      // Canopy layers
      const greens = [leafColor, shadeColor(leafColor,-15), shadeColor(leafColor,15), shadeColor(leafColor,-25)];
      const canopyR = [90,75,60,45].map(r=>r*s);
      const canopyY = [-40,-65,-95,-115].map(y=>cy+y*s);
      canopyR.forEach((r,i) => {
        cmds.push({type:'filled_circle', x:cx+(i%2?15:-15)*s, y:canopyY[i], r:r, color:greens[i]});
      });
      cmds.push({type:'filled_circle', x:cx-45*s, y:cy-30*s, r:55*s, color:greens[1]});
      cmds.push({type:'filled_circle', x:cx+45*s, y:cy-35*s, r:50*s, color:greens[2]});
      // Ground
      cmds.push({type:'ellipse', x:cx, y:cy+trunkH, rx:80*s, ry:12*s, fill:true, color:'rgba(46,125,50,0.2)', rotation:0, stroke:false});
    }

    // ── HEART ──
    else if (/heart/.test(subject)) {
      const col = params.color || '#E74C3C';
      const pts = [];
      for (let t = 0; t <= 360; t += 5) {
        const rad = t * Math.PI / 180;
        const hx = 16 * Math.pow(Math.sin(rad), 3);
        const hy = -(13*Math.cos(rad) - 5*Math.cos(2*rad) - 2*Math.cos(3*rad) - Math.cos(4*rad));
        pts.push({x: cx + hx * 5 * s, y: cy + hy * 5 * s});
      }
      cmds.push({type:'path', points:pts, close:true, fill:true, color:shadeColor(col,-20), stroke:false});
      const pts2 = pts.map(p => ({x: p.x*0.95+cx*0.05, y: p.y*0.95+cy*0.05}));
      cmds.push({type:'path', points:pts2, close:true, fill:true, color:col, stroke:false});
      cmds.push({type:'filled_circle', x:cx-18*s, y:cy-20*s, r:12*s, color:'rgba(255,255,255,0.2)'});
    }

    // ── STAR ──
    else if (/star/.test(subject)) {
      const col = params.color || '#F1C40F';
      const points = params.pointCount || 5;
      const outerR = 80 * s, innerR = 35 * s;
      const starPts = [];
      for (let i = 0; i < points * 2; i++) {
        const a = (i * 180 / points - 90) * Math.PI / 180;
        const r = i % 2 === 0 ? outerR : innerR;
        starPts.push({x: cx + r * Math.cos(a), y: cy + r * Math.sin(a)});
      }
      cmds.push({type:'path', points:starPts, close:true, fill:true, color:shadeColor(col,-15), stroke:false});
      const inner = starPts.map(p => ({x: p.x*0.9+cx*0.1, y: p.y*0.9+cy*0.1}));
      cmds.push({type:'path', points:inner, close:true, fill:true, color:col, stroke:false});
      cmds.push({type:'filled_circle', x:cx-10*s, y:cy-10*s, r:8*s, color:'rgba(255,255,255,0.25)'});
    }

    // ── SUN ──
    else if (/sun/.test(subject)) {
      const col = params.color || '#F39C12';
      const rays = params.rayCount || 12;
      for (let i = 0; i < rays; i++) {
        const a = (i * 360 / rays) * Math.PI / 180;
        cmds.push({type:'line', x1:cx+50*s*Math.cos(a), y1:cy+50*s*Math.sin(a),
          x2:cx+110*s*Math.cos(a), y2:cy+110*s*Math.sin(a), color:'#F1C40F', lineWidth:4*s});
      }
      cmds.push({type:'filled_circle', x:cx, y:cy, r:48*s, color:shadeColor(col,-10)});
      cmds.push({type:'filled_circle', x:cx, y:cy, r:42*s, color:col});
      cmds.push({type:'filled_circle', x:cx-12*s, y:cy-12*s, r:10*s, color:'rgba(255,255,255,0.3)'});
    }

    // ── HOUSE ──
    else if (/house|home|cabin/.test(subject)) {
      const wallColor = params.wallColor || '#E8D5B7';
      const roofColor = params.roofColor || '#8B4513';
      const doorColor = params.doorColor || '#5D4037';
      const w = 180*s, h = 130*s;
      // Wall
      cmds.push({type:'filled_rect', x:cx-w/2, y:cy, w:w, h:h, color:wallColor});
      cmds.push({type:'rect', x:cx-w/2, y:cy, w:w, h:h, color:shadeColor(wallColor,-20), lineWidth:2});
      // Roof
      cmds.push({type:'path', points:[{x:cx-w/2-20*s,y:cy},{x:cx,y:cy-80*s},{x:cx+w/2+20*s,y:cy}],
        close:true, fill:true, color:roofColor, stroke:false});
      cmds.push({type:'path', points:[{x:cx-w/2-20*s,y:cy},{x:cx,y:cy-80*s},{x:cx+w/2+20*s,y:cy}],
        close:true, fill:false, color:shadeColor(roofColor,-20), lineWidth:2, stroke:true});
      // Door
      cmds.push({type:'filled_rect', x:cx-18*s, y:cy+h-65*s, w:36*s, h:65*s, color:doorColor});
      cmds.push({type:'filled_circle', x:cx+10*s, y:cy+h-30*s, r:3*s, color:'#FFD700'});
      // Windows
      cmds.push({type:'filled_rect', x:cx-w/2+20*s, y:cy+20*s, w:35*s, h:35*s, color:'#87CEEB'});
      cmds.push({type:'line', x1:cx-w/2+37.5*s, y1:cy+20*s, x2:cx-w/2+37.5*s, y2:cy+55*s, color:'#fff', lineWidth:2});
      cmds.push({type:'line', x1:cx-w/2+20*s, y1:cy+37.5*s, x2:cx-w/2+55*s, y2:cy+37.5*s, color:'#fff', lineWidth:2});
      cmds.push({type:'filled_rect', x:cx+w/2-55*s, y:cy+20*s, w:35*s, h:35*s, color:'#87CEEB'});
      cmds.push({type:'line', x1:cx+w/2-37.5*s, y1:cy+20*s, x2:cx+w/2-37.5*s, y2:cy+55*s, color:'#fff', lineWidth:2});
      cmds.push({type:'line', x1:cx+w/2-55*s, y1:cy+37.5*s, x2:cx+w/2-20*s, y2:cy+37.5*s, color:'#fff', lineWidth:2});
      // Chimney
      cmds.push({type:'filled_rect', x:cx+40*s, y:cy-75*s, w:22*s, h:40*s, color:'#795548'});
      // Ground
      cmds.push({type:'filled_rect', x:cx-w, y:cy+h, w:w*2, h:20*s, color:'#4CAF50'});
    }

    // ── BUTTERFLY ──
    else if (/butterfly/.test(subject)) {
      const col1 = params.wingColor1 || '#9C27B0';
      const col2 = params.wingColor2 || '#E91E63';
      const wingW = 70*s, wingH = 50*s;
      // Body
      cmds.push({type:'ellipse', x:cx, y:cy, rx:5*s, ry:35*s, fill:true, color:'#3E2723', rotation:0, stroke:false});
      // Wings
      [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([dx,dy],i) => {
        const wc = i<2 ? col1 : col2;
        cmds.push({type:'ellipse', x:cx+dx*wingW*0.7, y:cy+dy*wingH*0.5, rx:wingW*(i<2?1:0.7), ry:wingH*(i<2?0.8:0.6),
          fill:true, color:wc, rotation:dx*dy*25, stroke:false});
        cmds.push({type:'ellipse', x:cx+dx*wingW*0.6, y:cy+dy*wingH*0.4, rx:wingW*0.3, ry:wingH*0.25,
          fill:true, color:'rgba(255,255,255,0.3)', rotation:dx*dy*20, stroke:false});
      });
      // Antennae
      cmds.push({type:'bezier', x1:cx, y1:cy-35*s, cx1:cx-15*s, cy1:cy-60*s, cx2:cx-25*s, cy2:cy-65*s, x2:cx-20*s, y2:cy-55*s, color:'#3E2723', lineWidth:1.5});
      cmds.push({type:'bezier', x1:cx, y1:cy-35*s, cx1:cx+15*s, cy1:cy-60*s, cx2:cx+25*s, cy2:cy-65*s, x2:cx+20*s, y2:cy-55*s, color:'#3E2723', lineWidth:1.5});
      cmds.push({type:'filled_circle', x:cx-20*s, y:cy-55*s, r:3*s, color:'#3E2723'});
      cmds.push({type:'filled_circle', x:cx+20*s, y:cy-55*s, r:3*s, color:'#3E2723'});
    }

    // ── GENERIC: pass through as raw instructions ──
    else if (params.instructions) {
      cmds = params.instructions;
    }

    if (cmds.length > 0) window.__auraDrawOnCanvas(cmds);
    return cmds.length;
  };

  function shadeColor(hex, percent) {
    let c = hex.replace('#','');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    const num = parseInt(c, 16);
    let r = (num >> 16) + Math.round(2.55 * percent);
    let g = ((num >> 8) & 0x00FF) + Math.round(2.55 * percent);
    let b = (num & 0x0000FF) + Math.round(2.55 * percent);
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }

  // Expose canvas dimensions for AI
  window.__auraCanvasSize = function() {
    return { width: canvas.width, height: canvas.height };
  };

  // Expose brush settings
  window.__auraSetBrush = function(opts) {
    if (opts.color) { color = opts.color; const cp = document.getElementById('colorPicker'); if (cp) cp.value = color; }
    if (opts.size) { brushSize = opts.size; const sl = document.getElementById('brushSize'); if (sl) sl.value = brushSize; const lb = document.getElementById('sizeLabel'); if (lb) lb.textContent = brushSize + 'px'; }
    if (opts.tool) { tool = opts.tool; document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === opts.tool); }); }
  };

  // Flood fill at x,y with given color — used when AI needs to fill user-drawn shapes
  window.__auraFloodFill = function(startX, startY, fillColor) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width, h = canvas.height;

    // Parse fill color
    const fc = document.createElement('canvas').getContext('2d');
    fc.fillStyle = fillColor;
    fc.fillRect(0, 0, 1, 1);
    const fcd = fc.getImageData(0, 0, 1, 1).data;
    const fillR = fcd[0], fillG = fcd[1], fillB = fcd[2], fillA = fcd[3];

    const sx = Math.round(startX), sy = Math.round(startY);
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;

    const idx = (sy * w + sx) * 4;
    const targetR = data[idx], targetG = data[idx+1], targetB = data[idx+2], targetA = data[idx+3];

    // Don't fill if same color
    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

    const stack = [[sx, sy]];
    const visited = new Set();

    function match(i) {
      return data[i] === targetR && data[i+1] === targetG && data[i+2] === targetB && Math.abs(data[i+3] - targetA) < 30;
    }

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      const key = cy * w + cx;
      if (visited.has(key)) continue;
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
      const ci = key * 4;
      if (!match(ci)) continue;
      visited.add(key);
      data[ci] = fillR; data[ci+1] = fillG; data[ci+2] = fillB; data[ci+3] = fillA;
      stack.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]);
    }

    ctx.putImageData(imgData, 0, 0);
    saveState();
  };

  // Canvas snapshot — high-res sampling + shape detection for AI spatial awareness
  window.__auraCanvasSnapshot = function() {
    const w = canvas.width, h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const gridX = 40, gridY = 30; // denser sampling grid
    const stepX = Math.floor(w / gridX);
    const stepY = Math.floor(h / gridY);
    const regions = [];
    let nonWhiteCount = 0;
    const colorsFound = new Set();
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let sumX = 0, sumY = 0, contentPixels = 0;

    for (let gy = 0; gy < gridY; gy++) {
      for (let gx = 0; gx < gridX; gx++) {
        const px = gx * stepX + Math.floor(stepX / 2);
        const py = gy * stepY + Math.floor(stepY / 2);
        const i = (py * w + px) * 4;
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        const isWhite = r > 240 && g > 240 && b > 240 && a > 200;
        const isEmpty = a < 10;
        if (!isWhite && !isEmpty) {
          nonWhiteCount++;
          const hex = '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
          colorsFound.add(hex);
          regions.push({ x: px, y: py, color: hex });
          if (px < minX) minX = px; if (px > maxX) maxX = px;
          if (py < minY) minY = py; if (py > maxY) maxY = py;
          sumX += px; sumY += py; contentPixels++;
        }
      }
    }

    // Shape detection: estimate center and radius of drawn content
    let shapeHint = null;
    if (contentPixels >= 3) {
      const centroidX = Math.round(sumX / contentPixels);
      const centroidY = Math.round(sumY / contentPixels);
      const bboxW = maxX - minX;
      const bboxH = maxY - minY;
      // Bounding box center is more accurate than centroid for partial shapes
      const bboxCenterX = Math.round(minX + bboxW / 2);
      const bboxCenterY = Math.round(minY + bboxH / 2);

      // Compute average distance from bbox center
      let sumDist = 0;
      const distances = [];
      regions.forEach(p => {
        const d = Math.sqrt((p.x - bboxCenterX)**2 + (p.y - bboxCenterY)**2);
        distances.push(d);
        sumDist += d;
      });
      const avgDist = sumDist / distances.length;
      let distVariance = 0;
      distances.forEach(d => distVariance += (d - avgDist)**2);
      distVariance /= distances.length;
      const distStdDev = Math.sqrt(distVariance);

      // If points are roughly equidistant from center → likely a circle
      const isCircular = distStdDev < avgDist * 0.45 && bboxW > 30 && bboxH > 30;
      const isLine = (bboxW < 20 || bboxH < 20) && Math.max(bboxW, bboxH) > 50;
      const aspectRatio = bboxW / (bboxH || 1);
      // For circles: radius = half the average of bbox width and height
      const estimatedRadius = Math.round((bboxW + bboxH) / 4);

      shapeHint = {
        centerX: bboxCenterX, centerY: bboxCenterY,
        boundingBox: { x: minX, y: minY, w: bboxW, h: bboxH },
        avgRadius: isCircular ? estimatedRadius : Math.round(avgDist),
        likelyShape: isCircular ? 'circle' : isLine ? 'line' : (Math.abs(aspectRatio-1) < 0.3 ? 'square-ish' : 'rectangle-ish'),
        confidence: isCircular ? 'high' : 'medium',
      };
    }

    return {
      width: w, height: h,
      hasContent: nonWhiteCount > 0,
      contentDensity: Math.round(nonWhiteCount / (gridX * gridY) * 100),
      colorsUsed: [...colorsFound].slice(0, 10),
      sampleRegions: regions.slice(0, 50),
      shapeHint: shapeHint,
      currentColor: color,
      currentTool: tool,
      currentBrushSize: brushSize,
    };
  };
})();
