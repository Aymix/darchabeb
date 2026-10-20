/**
 * VirtuArts — Beat Maker (Music Production)
 * Web Audio API step sequencer with 8 drum tracks and 16 steps.
 */
(function () {
  'use strict';

  const container = document.getElementById('beatGrid');
  if (!container) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  const TRACKS = [
    { name: 'Kick', freq: 60, type: 'sine', decay: 0.5 },
    { name: 'Snare', freq: 200, type: 'triangle', decay: 0.2, noise: true },
    { name: 'Hi-Hat', freq: 6000, type: 'square', decay: 0.05, highpass: true },
    { name: 'Clap', freq: 800, type: 'triangle', decay: 0.15, noise: true },
    { name: 'Tom Low', freq: 100, type: 'sine', decay: 0.35 },
    { name: 'Tom Mid', freq: 180, type: 'sine', decay: 0.3 },
    { name: 'Cymbal', freq: 8000, type: 'square', decay: 0.3, highpass: true },
    { name: 'Rim', freq: 500, type: 'square', decay: 0.06 },
  ];

  const STEPS = 16;
  let bpm = 120;
  let playing = false;
  let currentStep = 0;
  let intervalId = null;
  let grid = TRACKS.map(() => Array(STEPS).fill(false));
  let volumes = TRACKS.map(() => 0.7);

  // Build UI
  function buildGrid() {
    container.innerHTML = '';
    TRACKS.forEach((track, ti) => {
      const row = document.createElement('div');
      row.className = 'beat-row';

      const label = document.createElement('div');
      label.className = 'beat-label';
      label.innerHTML = `<span class="beat-track-name">${track.name}</span>
        <input type="range" min="0" max="100" value="${volumes[ti]*100}" class="beat-vol" data-track="${ti}">`;
      row.appendChild(label);

      for (let si = 0; si < STEPS; si++) {
        const cell = document.createElement('div');
        cell.className = 'beat-cell' + (si % 4 === 0 ? ' beat-bar' : '');
        cell.dataset.track = ti;
        cell.dataset.step = si;
        if (grid[ti][si]) cell.classList.add('active');
        cell.addEventListener('click', () => {
          grid[ti][si] = !grid[ti][si];
          cell.classList.toggle('active');
        });
        row.appendChild(cell);
      }
      container.appendChild(row);
    });

    // Volume sliders
    document.querySelectorAll('.beat-vol').forEach(slider => {
      slider.addEventListener('input', e => {
        volumes[parseInt(e.target.dataset.track)] = parseInt(e.target.value) / 100;
      });
    });
  }

  // Audio synthesis
  function playSound(track, trackIndex) {
    if (!audioCtx) audioCtx = new AudioCtx();
    const now = audioCtx.currentTime;
    const vol = volumes[trackIndex];

    if (track.noise) {
      // Noise-based sounds (snare, clap)
      const bufferSize = audioCtx.sampleRate * track.decay;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + track.decay);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = track.freq;
      noise.connect(filter).connect(gain).connect(audioCtx.destination);
      noise.start(now);
      // Tonal component
      const osc = audioCtx.createOscillator();
      osc.type = track.type;
      osc.frequency.setValueAtTime(track.freq, now);
      osc.frequency.exponentialRampToValueAtTime(track.freq * 0.5, now + track.decay);
      const g2 = audioCtx.createGain();
      g2.gain.setValueAtTime(vol * 0.3, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + track.decay);
      osc.connect(g2).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + track.decay);
    } else if (track.highpass) {
      // Hi-hat / cymbal
      const bufferSize = audioCtx.sampleRate * track.decay;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(vol * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + track.decay);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = track.freq;
      noise.connect(filter).connect(gain).connect(audioCtx.destination);
      noise.start(now);
    } else {
      // Tonal (kick, tom)
      const osc = audioCtx.createOscillator();
      osc.type = track.type;
      osc.frequency.setValueAtTime(track.freq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(track.freq * 0.5, now + track.decay * 0.7);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + track.decay);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + track.decay);
    }
  }

  function step() {
    // Highlight current step
    document.querySelectorAll('.beat-cell.current').forEach(c => c.classList.remove('current'));
    document.querySelectorAll(`.beat-cell[data-step="${currentStep}"]`).forEach(c => c.classList.add('current'));

    // Play active cells
    grid.forEach((row, ti) => {
      if (row[currentStep]) playSound(TRACKS[ti], ti);
    });

    currentStep = (currentStep + 1) % STEPS;
  }

  // Controls
  document.getElementById('btnPlay')?.addEventListener('click', () => {
    if (playing) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    playing = true;
    currentStep = 0;
    const ms = (60 / bpm / 4) * 1000; // 16th note
    intervalId = setInterval(step, ms);
    document.getElementById('btnPlay').classList.add('active');
  });

  document.getElementById('btnStop')?.addEventListener('click', () => {
    playing = false;
    clearInterval(intervalId);
    currentStep = 0;
    document.querySelectorAll('.beat-cell.current').forEach(c => c.classList.remove('current'));
    document.getElementById('btnPlay')?.classList.remove('active');
  });

  document.getElementById('btnReset')?.addEventListener('click', () => {
    grid = TRACKS.map(() => Array(STEPS).fill(false));
    buildGrid();
  });

  const bpmSlider = document.getElementById('bpmSlider');
  const bpmLabel = document.getElementById('bpmLabel');
  if (bpmSlider) bpmSlider.addEventListener('input', e => {
    bpm = parseInt(e.target.value);
    if (bpmLabel) bpmLabel.textContent = bpm + ' BPM';
    if (playing) {
      clearInterval(intervalId);
      const ms = (60 / bpm / 4) * 1000;
      intervalId = setInterval(step, ms);
    }
  });

  // Presets
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      grid = TRACKS.map(() => Array(STEPS).fill(false));
      if (preset === 'rock') {
        // Kick on 1, 5, 9, 13
        [0,4,8,12].forEach(s => grid[0][s] = true);
        // Snare on 4, 12
        [4,12].forEach(s => grid[1][s] = true);
        // Hi-hat every 2
        for (let i = 0; i < 16; i += 2) grid[2][i] = true;
      } else if (preset === 'hiphop') {
        [0,6,10].forEach(s => grid[0][s] = true);
        [4,12].forEach(s => grid[1][s] = true);
        for (let i = 0; i < 16; i += 2) grid[2][i] = true;
        [2,8,14].forEach(s => grid[3][s] = true);
      } else if (preset === 'edm') {
        for (let i = 0; i < 16; i += 4) grid[0][i] = true;
        [4,12].forEach(s => grid[1][s] = true);
        for (let i = 0; i < 16; i++) grid[2][i] = true;
        [2,6,10,14].forEach(s => grid[6][s] = true);
      }
      buildGrid();
    });
  });

  buildGrid();
})();
