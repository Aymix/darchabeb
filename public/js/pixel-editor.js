/**
 * VirtuArts — Pixel Art Editor
 * Grid-based pixel art editor with configurable grid, tools, multi-palette.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('pixelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let gridSize = 16;
  let cellSize = 0;
  let grid = [];
  let color = '#f97316';
  let tool = 'pen'; // pen, eraser, fill
  let drawing = false;

  function initGrid(size) {
    gridSize = size;
    grid = Array.from({ length: gridSize }, () => Array(gridSize).fill('#ffffff'));
    cellSize = Math.floor(Math.min(canvas.width, canvas.height) / gridSize);
    render();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        ctx.fillStyle = grid[y][x];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  function getCell(e) {
    const rect = canvas.getBoundingClientRect();
    const ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((ex * scaleX) / cellSize);
    const y = Math.floor((ey * scaleY) / cellSize);
    return [x, y];
  }

  function paint(x, y) {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
    if (tool === 'pen') {
      grid[y][x] = color;
    } else if (tool === 'eraser') {
      grid[y][x] = '#ffffff';
    }
    render();
  }

  function floodFill(x, y, targetColor, replaceColor) {
    if (targetColor === replaceColor) return;
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
    if (grid[y][x] !== targetColor) return;
    grid[y][x] = replaceColor;
    floodFill(x + 1, y, targetColor, replaceColor);
    floodFill(x - 1, y, targetColor, replaceColor);
    floodFill(x, y + 1, targetColor, replaceColor);
    floodFill(x, y - 1, targetColor, replaceColor);
  }

  function handleClick(e) {
    e.preventDefault();
    const [x, y] = getCell(e);
    if (tool === 'fill') {
      const target = grid[y]?.[x];
      if (target && target !== color) {
        floodFill(x, y, target, color);
        render();
      }
    } else {
      paint(x, y);
    }
  }

  canvas.addEventListener('mousedown', e => { drawing = true; handleClick(e); });
  canvas.addEventListener('mousemove', e => { if (drawing && tool !== 'fill') handleClick(e); });
  canvas.addEventListener('mouseup', () => { drawing = false; });
  canvas.addEventListener('mouseleave', () => { drawing = false; });
  canvas.addEventListener('touchstart', e => { drawing = true; handleClick(e); }, { passive: false });
  canvas.addEventListener('touchmove', e => { if (drawing && tool !== 'fill') handleClick(e); }, { passive: false });
  canvas.addEventListener('touchend', () => { drawing = false; });

  // Tool buttons
  document.querySelectorAll('[data-px-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-px-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tool = btn.dataset.pxTool;
    });
  });

  // Grid size buttons
  document.querySelectorAll('[data-grid-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-grid-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      initGrid(parseInt(btn.dataset.gridSize));
    });
  });

  // Color
  const pxColor = document.getElementById('pxColorPicker');
  if (pxColor) pxColor.addEventListener('input', e => { color = e.target.value; });

  document.querySelectorAll('[data-px-color]').forEach(swatch => {
    swatch.addEventListener('click', () => {
      color = swatch.dataset.pxColor;
      if (pxColor) pxColor.value = color;
    });
  });

  // Clear
  document.getElementById('pxClear')?.addEventListener('click', () => {
    grid = Array.from({ length: gridSize }, () => Array(gridSize).fill('#ffffff'));
    render();
  });

  // Save
  document.getElementById('pxSave')?.addEventListener('click', async () => {
    const name = prompt('Name your pixel art:', 'My Pixel Art');
    if (!name) return;
    // Create a clean export (no grid lines)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = gridSize;
    exportCanvas.height = gridSize;
    const ectx = exportCanvas.getContext('2d');
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        ectx.fillStyle = grid[y][x];
        ectx.fillRect(x, y, 1, 1);
      }
    }
    try {
      const resp = await fetch('/pixelart/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image: exportCanvas.toDataURL('image/png') }),
      });
      const data = await resp.json();
      if (data.success) alert('Saved successfully!');
    } catch (err) { alert('Error: ' + err.message); }
  });

  // Download
  document.getElementById('pxDownload')?.addEventListener('click', () => {
    const exportCanvas = document.createElement('canvas');
    const scale = 16; // upscale for crisp export
    exportCanvas.width = gridSize * scale;
    exportCanvas.height = gridSize * scale;
    const ectx = exportCanvas.getContext('2d');
    ectx.imageSmoothingEnabled = false;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        ectx.fillStyle = grid[y][x];
        ectx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    const a = document.createElement('a');
    a.download = 'pixel-art.png';
    a.href = exportCanvas.toDataURL('image/png');
    a.click();
  });

  // Init
  canvas.width = 512;
  canvas.height = 512;
  initGrid(16);
})();
