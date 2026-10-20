/* ══════════════════════════════════════════════════════════════
   VirtuArts — Cinematic 3D Scroll Engine
   Three.js + GSAP ScrollTrigger
   One continuous camera journey through artistic dimensions
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const canvas = document.getElementById('cinCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  /* ════════════════ RENDERER ════════════════ */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x050505, 1);
  renderer.shadowMap.enabled = false;

  /* ════════════════ SCENE + CAMERA ════════════════ */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.018);
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 0, 0);

  /* ════════════════ LIGHTS ════════════════ */
  scene.add(new THREE.AmbientLight(0xff9500, 0.08));
  const coreLight = new THREE.PointLight(0xff9500, 0, 30);
  coreLight.position.set(0, 0, -20);
  scene.add(coreLight);

  /* ════════════════ MOUSE ════════════════ */
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  /* ════════════════ SCROLL STATE ════════════════ */
  let scrollProgress = 0; // 0 → 1
  const JOURNEY_DEPTH = -200; // total camera Z travel

  // Scene zones (as fractions of total scroll)
  const ZONES = {
    void:     [0.00, 0.08],   // darkness + particles
    hero:     [0.04, 0.12],   // title visible
    approach: [0.10, 0.22],   // camera approaches door
    door:     [0.18, 0.30],   // door opens
    enter:    [0.28, 0.35],   // fly through portal
    music:    [0.34, 0.46],   // music world
    draw:     [0.46, 0.58],   // drawing world
    write:    [0.58, 0.70],   // writing world
    model:    [0.70, 0.82],   // 3D world
    aura:     [0.82, 0.92],   // Aura AI
    finale:   [0.90, 1.00],   // final convergence
  };

  function inZone(name) {
    const z = ZONES[name];
    return scrollProgress >= z[0] && scrollProgress <= z[1];
  }
  function zoneProgress(name) {
    const z = ZONES[name];
    return Math.max(0, Math.min(1, (scrollProgress - z[0]) / (z[1] - z[0])));
  }

  /* ════════════════════════════════════════════════
     BUILD SCENE OBJECTS
     ════════════════════════════════════════════════ */

  // ── 1. AMBIENT PARTICLES (throughout journey) ──
  const PCOUNT = 1200;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PCOUNT * 3);
  const pVel = new Float32Array(PCOUNT * 3);
  for (let i = 0; i < PCOUNT; i++) {
    pPos[i*3]     = (Math.random() - 0.5) * 40;
    pPos[i*3 + 1] = (Math.random() - 0.5) * 40;
    pPos[i*3 + 2] = -Math.random() * 220;
    pVel[i*3]     = (Math.random() - 0.5) * 0.008;
    pVel[i*3 + 1] = (Math.random() - 0.5) * 0.008;
    pVel[i*3 + 2] = (Math.random() - 0.5) * 0.002;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0xff9500, size: 0.06, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(particles);

  // ── 2. THE DOOR (Portal at z = -22) ──
  const DOOR_Z = -22;
  const doorGroup = new THREE.Group();
  doorGroup.position.z = DOOR_Z;

  // Main torus ring
  const doorRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.5, 0.12, 32, 128),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xff7a00, emissiveIntensity: 0.3, metalness: 0.95, roughness: 0.15 })
  );
  doorGroup.add(doorRing);

  // Inner glow disc
  const doorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(3.3, 64),
    new THREE.MeshBasicMaterial({ color: 0xff9500, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
  );
  doorGroup.add(doorGlow);

  // Outer decorative rings
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(4 + i * 0.6, 0.02 - i * 0.005, 16, 80),
      new THREE.MeshBasicMaterial({ color: 0xff9500, transparent: true, opacity: 0.15 - i * 0.04 })
    );
    r.userData.speed = 0.08 + i * 0.03;
    r.userData.dir = i % 2 === 0 ? 1 : -1;
    doorGroup.add(r);
  }

  // Orbiting symbol cubes
  const symbols = [];
  const symGeo = new THREE.OctahedronGeometry(0.08);
  const symMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Mesh(symGeo, symMat);
    s.userData = { angle: (i / 24) * Math.PI * 2, r: 3.8 + Math.random() * 0.8, speed: 0.06 + Math.random() * 0.1, yOff: (Math.random() - 0.5) * 1.5 };
    doorGroup.add(s);
    symbols.push(s);
  }

  // Door point light
  const doorLight = new THREE.PointLight(0xff9500, 0, 20);
  doorGroup.add(doorLight);
  scene.add(doorGroup);

  // ── 3. POST-PORTAL TUNNEL RINGS ──
  const tunnelRings = [];
  for (let i = 0; i < 15; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(2.5 + Math.sin(i) * 0.5, 0.03, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xff9500, transparent: true, opacity: 0 })
    );
    r.position.z = DOOR_Z - 3 - i * 2.5;
    scene.add(r);
    tunnelRings.push(r);
  }

  // ── 4. MUSIC WORLD (z = -70 to -90) ──
  const musicGroup = new THREE.Group();
  musicGroup.position.z = -80;

  // Equalizer bars
  const eqBars = [];
  for (let i = 0; i < 20; i++) {
    const h = 0.5 + Math.random() * 2;
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, h, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xff9500, transparent: true, opacity: 0.6 })
    );
    bar.position.set((i - 10) * 0.6, -2, 0);
    bar.userData.baseH = h;
    bar.userData.phase = Math.random() * Math.PI * 2;
    musicGroup.add(bar);
    eqBars.push(bar);
  }

  // Floating music notes (small spheres)
  for (let i = 0; i < 30; i++) {
    const note = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.5 })
    );
    note.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 10);
    note.userData.oy = note.position.y;
    note.userData.phase = Math.random() * Math.PI * 2;
    musicGroup.add(note);
  }

  // Vinyl disc
  const vinyl = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.5, 4, 32),
    new THREE.MeshBasicMaterial({ color: 0x1a0f00, transparent: true, opacity: 0.3 })
  );
  vinyl.position.set(5, 1, -3);
  vinyl.rotation.x = 0.3;
  musicGroup.add(vinyl);
  scene.add(musicGroup);

  // ── 5. DRAWING WORLD (z = -95 to -115) ──
  const drawGroup = new THREE.Group();
  drawGroup.position.z = -105;

  // Paint stroke curves
  for (let i = 0; i < 12; i++) {
    const pts = [];
    const startX = (Math.random() - 0.5) * 10;
    const startY = (Math.random() - 0.5) * 6;
    for (let j = 0; j < 20; j++) {
      pts.push(new THREE.Vector3(
        startX + j * 0.3 * (Math.random() - 0.3),
        startY + Math.sin(j * 0.5) * 1.5,
        (Math.random() - 0.5) * 3
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 30, 0.04 + Math.random() * 0.06, 6, false);
    const colors = [0xff9500, 0xffb347, 0xff7a00, 0xffcc00];
    const stroke = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: colors[i % colors.length], transparent: true, opacity: 0.4
    }));
    drawGroup.add(stroke);
  }

  // Floating brush (cylinder)
  const brush = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.15, 2, 8),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.5 })
  );
  brush.position.set(-3, 2, 0);
  brush.rotation.z = 0.5;
  drawGroup.add(brush);
  scene.add(drawGroup);

  // ── 6. WRITING WORLD (z = -120 to -140) ──
  const writeGroup = new THREE.Group();
  writeGroup.position.z = -130;

  // Floating letter cubes
  for (let i = 0; i < 40; i++) {
    const letter = new THREE.Mesh(
      new THREE.BoxGeometry(0.15 + Math.random() * 0.2, 0.2 + Math.random() * 0.15, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.3 + Math.random() * 0.3 })
    );
    letter.position.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    letter.userData.oy = letter.position.y;
    letter.userData.phase = Math.random() * Math.PI * 2;
    letter.userData.rotSpeed = (Math.random() - 0.5) * 0.02;
    writeGroup.add(letter);
  }

  // Book shape (flat box)
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2.8, 0.2),
    new THREE.MeshBasicMaterial({ color: 0x1a0f00, transparent: true, opacity: 0.25 })
  );
  book.position.set(0, 0, -2);
  writeGroup.add(book);
  scene.add(writeGroup);

  // ── 7. 3D MODELING WORLD (z = -145 to -165) ──
  const modelGroup = new THREE.Group();
  modelGroup.position.z = -155;

  // Wireframe sculptures
  const wireGeos = [
    new THREE.IcosahedronGeometry(1.5, 1),
    new THREE.OctahedronGeometry(1.2, 0),
    new THREE.TorusKnotGeometry(1, 0.3, 64, 8),
    new THREE.DodecahedronGeometry(1, 0)
  ];
  const wireMeshes = [];
  wireGeos.forEach((geo, i) => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xff9500, wireframe: true, transparent: true, opacity: 0.4
    }));
    const angle = (i / wireGeos.length) * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * 4, Math.sin(angle) * 2, (Math.random() - 0.5) * 4);
    mesh.userData.rotX = (Math.random() - 0.5) * 0.01;
    mesh.userData.rotY = (Math.random() - 0.5) * 0.01;
    modelGroup.add(mesh);
    wireMeshes.push(mesh);
  });

  // Central holographic cube
  const holoCube = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xffb347, wireframe: true, transparent: true, opacity: 0.5 })
  );
  modelGroup.add(holoCube);
  scene.add(modelGroup);

  // ── 8. AURA AI (z = -170 to -190) ──
  const auraGroup = new THREE.Group();
  auraGroup.position.z = -180;

  // Core orb
  const auraOrb = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff9500, transparent: true, opacity: 0.08 })
  );
  auraGroup.add(auraOrb);

  // Energy rings
  const auraRings = [];
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.8 + i * 0.7, 0.02, 12, 60),
      new THREE.MeshBasicMaterial({ color: 0xff9500, transparent: true, opacity: 0.25 - i * 0.05 })
    );
    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.y = Math.random() * Math.PI;
    ring.userData.speed = 0.3 + i * 0.15;
    ring.userData.axis = i % 2 === 0 ? 'x' : 'y';
    auraGroup.add(ring);
    auraRings.push(ring);
  }

  // Aura particle cloud
  const auraPC = 300;
  const apGeo = new THREE.BufferGeometry();
  const apPos = new Float32Array(auraPC * 3);
  for (let i = 0; i < auraPC; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.5 + Math.random() * 1.5;
    apPos[i*3]     = r * Math.sin(phi) * Math.cos(theta);
    apPos[i*3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    apPos[i*3 + 2] = r * Math.cos(phi);
  }
  apGeo.setAttribute('position', new THREE.BufferAttribute(apPos, 3));
  const auraParticles = new THREE.Points(apGeo, new THREE.PointsMaterial({
    color: 0xffb347, size: 0.05, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  auraGroup.add(auraParticles);
  scene.add(auraGroup);

  /* ════════════════════════════════════════════════
     SCROLL CONTROLLER (GSAP)
     ════════════════════════════════════════════════ */
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: '#scrollSpacer',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: self => {
      scrollProgress = self.progress;
    }
  });

  /* ════════════════════════════════════════════════
     OVERLAY TEXT CONTROLLER
     ════════════════════════════════════════════════ */
  function updateOverlays() {
    const map = {
      textHero:  ZONES.hero,
      textDoor:  ZONES.approach,
      textMusic: ZONES.music,
      textDraw:  ZONES.draw,
      textWrite: ZONES.write,
      text3D:    ZONES.model,
      textAura:  ZONES.aura,
    };
    for (const [id, zone] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const inZ = scrollProgress >= zone[0] && scrollProgress <= zone[1];
      const mid = (zone[0] + zone[1]) / 2;
      const halfW = (zone[1] - zone[0]) / 2;
      const dist = Math.abs(scrollProgress - mid);
      const fade = inZ && dist < halfW * 0.7;
      el.classList.toggle('active', fade);
    }
    // Final CTA
    const cta = document.getElementById('finalCTA');
    if (cta) cta.classList.toggle('active', scrollProgress > 0.93);

    // Scroll cue
    const cue = document.getElementById('scrollCue');
    if (cue) cue.classList.toggle('show', scrollProgress < 0.05);

    // Progress bar
    const prog = document.getElementById('cinProgress');
    if (prog) prog.style.width = (scrollProgress * 100) + '%';
  }

  /* ════════════════════════════════════════════════
     ANIMATION LOOP
     ════════════════════════════════════════════════ */
  const clock = new THREE.Clock();
  let loaded = false;

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse
    mouse.sx += (mouse.x - mouse.sx) * 0.04;
    mouse.sy += (mouse.y - mouse.sy) * 0.04;

    // ── Camera position driven by scroll ──
    camera.position.z = scrollProgress * JOURNEY_DEPTH;
    camera.position.x = mouse.sx * 1.2;
    camera.position.y = mouse.sy * 0.8;
    camera.lookAt(camera.position.x * 0.3, camera.position.y * 0.2, camera.position.z - 10);

    // ── Fog density changes ──
    scene.fog.density = 0.018 + (inZone('enter') ? zoneProgress('enter') * 0.06 : 0);
    if (scrollProgress > 0.35) scene.fog.density = 0.012;

    // ── Core light follows camera ──
    coreLight.position.z = camera.position.z - 5;
    coreLight.intensity = 0.5 + scrollProgress * 2;

    // ── Ambient particles drift ──
    const pp = particles.geometry.attributes.position.array;
    for (let i = 0; i < PCOUNT; i++) {
      pp[i*3]     += pVel[i*3];
      pp[i*3 + 1] += pVel[i*3 + 1] + Math.sin(t + i) * 0.001;
      if (pp[i*3] > 20) pp[i*3] = -20;
      if (pp[i*3] < -20) pp[i*3] = 20;
      if (pp[i*3+1] > 20) pp[i*3+1] = -20;
      if (pp[i*3+1] < -20) pp[i*3+1] = 20;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    // ── DOOR animations ──
    const doorDist = Math.abs(camera.position.z - DOOR_Z);
    const doorVisible = doorDist < 30;
    doorGroup.visible = doorVisible;

    if (doorVisible) {
      doorRing.rotation.z = t * 0.1;

      // Door glow increases as we approach
      const approachP = zoneProgress('approach');
      doorGlow.material.opacity = approachP * 0.12;
      doorLight.intensity = approachP * 4;
      doorRing.material.emissiveIntensity = 0.3 + approachP * 1.5;

      // Door "opens" — scale the ring wider
      const doorP = zoneProgress('door');
      doorRing.scale.set(1 + doorP * 0.8, 1 + doorP * 0.8, 1);
      doorGlow.material.opacity = approachP * 0.12 + doorP * 0.08;

      // Orbiting symbols
      symbols.forEach(s => {
        s.userData.angle += s.userData.speed * 0.015;
        s.position.x = Math.cos(s.userData.angle) * s.userData.r;
        s.position.y = Math.sin(s.userData.angle) * s.userData.r * 0.5 + s.userData.yOff;
        s.position.z = Math.sin(s.userData.angle * 1.5) * 0.8;
        s.rotation.x = t * 0.5;
        s.rotation.y = t * 0.8;
      });

      // Outer rings rotate
      doorGroup.children.forEach(c => {
        if (c.userData.speed) {
          c.rotation.z += c.userData.speed * c.userData.dir * 0.01;
        }
      });
    }

    // ── TUNNEL RINGS during portal entry ──
    const enterP = zoneProgress('enter');
    tunnelRings.forEach((r, i) => {
      const ringVisible = enterP > 0.1;
      r.material.opacity = ringVisible ? Math.min(0.3, enterP * 0.5) * (1 - i / tunnelRings.length) : 0;
      r.rotation.z = t * 0.3 * (i % 2 === 0 ? 1 : -1);
    });

    // ── MUSIC WORLD ──
    const musicP = zoneProgress('music');
    musicGroup.visible = Math.abs(camera.position.z - musicGroup.position.z) < 25;
    if (musicGroup.visible) {
      eqBars.forEach(bar => {
        const h = bar.userData.baseH * (0.5 + Math.sin(t * 3 + bar.userData.phase) * 0.5);
        bar.scale.y = h;
        bar.position.y = -2 + h * 0.5;
      });
      vinyl.rotation.z = t * 0.5;
      musicGroup.children.forEach(c => {
        if (c.userData.oy !== undefined) {
          c.position.y = c.userData.oy + Math.sin(t * 1.5 + c.userData.phase) * 0.4;
        }
      });
    }

    // ── DRAWING WORLD ──
    drawGroup.visible = Math.abs(camera.position.z - drawGroup.position.z) < 25;
    if (drawGroup.visible) {
      brush.position.y = 2 + Math.sin(t * 0.8) * 0.5;
      brush.rotation.z = 0.5 + Math.sin(t * 0.5) * 0.3;
    }

    // ── WRITING WORLD ──
    writeGroup.visible = Math.abs(camera.position.z - writeGroup.position.z) < 25;
    if (writeGroup.visible) {
      writeGroup.children.forEach(c => {
        if (c.userData.oy !== undefined) {
          c.position.y = c.userData.oy + Math.sin(t + c.userData.phase) * 0.3;
          c.rotation.z += c.userData.rotSpeed;
        }
      });
      book.rotation.y = Math.sin(t * 0.3) * 0.15;
    }

    // ── 3D MODELING WORLD ──
    modelGroup.visible = Math.abs(camera.position.z - modelGroup.position.z) < 25;
    if (modelGroup.visible) {
      wireMeshes.forEach(m => {
        m.rotation.x += m.userData.rotX;
        m.rotation.y += m.userData.rotY;
      });
      holoCube.rotation.x = t * 0.4;
      holoCube.rotation.y = t * 0.6;
      holoCube.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
    }

    // ── AURA AI ──
    auraGroup.visible = Math.abs(camera.position.z - auraGroup.position.z) < 25;
    if (auraGroup.visible) {
      auraOrb.scale.setScalar(1 + Math.sin(t * 1.5) * 0.08);
      auraOrb.material.opacity = 0.06 + Math.sin(t * 2) * 0.04;
      auraRings.forEach(r => {
        r.rotation[r.userData.axis] += r.userData.speed * 0.008;
      });
      auraParticles.rotation.y = t * 0.1;
      auraParticles.rotation.x = Math.sin(t * 0.3) * 0.1;
    }

    // ── Update overlays ──
    updateOverlays();

    // ── Render ──
    renderer.render(scene, camera);
  }

  /* ════════════════ RESIZE ════════════════ */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ════════════════ CURSOR GLOW ════════════════ */
  const cursorEl = document.getElementById('cinCursor');
  if (cursorEl) {
    document.addEventListener('mousemove', e => {
      cursorEl.style.left = e.clientX + 'px';
      cursorEl.style.top = e.clientY + 'px';
    });
  }

  /* ════════════════ LOADER ════════════════ */
  setTimeout(() => {
    const loader = document.getElementById('cinLoader');
    if (loader) loader.classList.add('done');
    const cue = document.getElementById('scrollCue');
    if (cue) cue.classList.add('show');
  }, 2200);

  /* ════════════════ START ════════════════ */
  animate();
  console.log('🌌 VirtuArts Cinematic Engine — Active');

})();
