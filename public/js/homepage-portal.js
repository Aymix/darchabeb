/* ══════════════════════════════════════════════════
   VirtuArts — Three.js Cinematic Portal Engine
   Particles, portal geometry, mouse reactivity
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  const CANVAS_ID = 'cin-hero-webgl';
  const canvas = document.getElementById(CANVAS_ID);
  if (!canvas) return;

  // ── Dynamic Three.js loader ──
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  script.onload = initScene;
  document.head.appendChild(script);

  // Mouse state
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('mousemove', e => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  function initScene() {
    const THREE = window.THREE;
    if (!THREE) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050505, 1);

    // ── Scene + Camera ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.035);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    // ── Ambient + Point Lights ──
    scene.add(new THREE.AmbientLight(0xff9500, 0.15));
    const pointLight = new THREE.PointLight(0xff9500, 2, 20);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);
    const backLight = new THREE.PointLight(0xff7a00, 1.5, 15);
    backLight.position.set(0, 2, -3);
    scene.add(backLight);

    // ── Portal Ring (Torus) ──
    const portalGeo = new THREE.TorusGeometry(1.8, 0.08, 32, 100);
    const portalMat = new THREE.MeshStandardMaterial({
      color: 0xff9500, emissive: 0xff7a00, emissiveIntensity: 0.6,
      metalness: 0.9, roughness: 0.2
    });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    scene.add(portal);

    // ── Inner portal glow (disc) ──
    const glowGeo = new THREE.CircleGeometry(1.7, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff9500, transparent: true, opacity: 0.04, side: THREE.DoubleSide
    });
    const glowDisc = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowDisc);

    // ── Outer decorative rings ──
    const ring2Geo = new THREE.TorusGeometry(2.2, 0.02, 16, 80);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.3 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    scene.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(2.5, 0.015, 16, 80);
    const ring3Mat = new THREE.MeshBasicMaterial({ color: 0xff9500, transparent: true, opacity: 0.15 });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    scene.add(ring3);

    // ── Floating Particles System ──
    const PARTICLE_COUNT = 800;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 12;
      positions[i3 + 1] = (Math.random() - 0.5) * 12;
      positions[i3 + 2] = (Math.random() - 0.5) * 12;
      velocities[i3] = (Math.random() - 0.5) * 0.003;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.003;
      sizes[i] = Math.random() * 3 + 1;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particlesMat = new THREE.PointsMaterial({
      color: 0xff9500, size: 0.03, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // ── Orbiting symbol geometry (small cubes as "symbols") ──
    const symbols = [];
    const symbolGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const symbolMat = new THREE.MeshStandardMaterial({
      color: 0xffb347, emissive: 0xff9500, emissiveIntensity: 0.4,
      metalness: 0.8, roughness: 0.3
    });
    for (let i = 0; i < 20; i++) {
      const s = new THREE.Mesh(symbolGeo, symbolMat);
      const angle = (i / 20) * Math.PI * 2;
      const radius = 2.0 + Math.random() * 0.4;
      s.userData = { angle, radius, speed: 0.1 + Math.random() * 0.15, yOff: (Math.random() - 0.5) * 0.5 };
      scene.add(s);
      symbols.push(s);
    }

    // ── Animation Loop ──
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

      // Smooth mouse
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // Camera reacts to mouse
      camera.position.x = mouse.x * 0.5;
      camera.position.y = mouse.y * 0.3;
      camera.lookAt(0, 0, 0);

      // Portal animations
      portal.rotation.z = t * 0.15;
      portal.scale.setScalar(1 + Math.sin(t * 0.8) * 0.02);
      ring2.rotation.z = -t * 0.1;
      ring3.rotation.z = t * 0.07;

      // Inner glow pulse
      glowMat.opacity = 0.03 + Math.sin(t * 1.5) * 0.02;

      // Point light pulse
      pointLight.intensity = 2 + Math.sin(t * 2) * 0.5;

      // Particles drift
      const posArr = particlesGeo.attributes.position.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        posArr[i3] += velocities[i3];
        posArr[i3 + 1] += velocities[i3 + 1];
        posArr[i3 + 2] += velocities[i3 + 2];
        // Wrap around
        if (Math.abs(posArr[i3]) > 6) velocities[i3] *= -1;
        if (Math.abs(posArr[i3 + 1]) > 6) velocities[i3 + 1] *= -1;
        if (Math.abs(posArr[i3 + 2]) > 6) velocities[i3 + 2] *= -1;
      }
      particlesGeo.attributes.position.needsUpdate = true;
      particles.rotation.y = t * 0.02;

      // Orbiting symbols
      symbols.forEach(s => {
        const d = s.userData;
        d.angle += d.speed * 0.01;
        s.position.x = Math.cos(d.angle) * d.radius;
        s.position.y = Math.sin(d.angle) * d.radius * 0.3 + d.yOff;
        s.position.z = Math.sin(d.angle * 2) * 0.3;
        s.rotation.x = t * 0.5;
        s.rotation.y = t * 0.7;
      });

      renderer.render(scene, camera);
    }

    animate();

    // ── Resize ──
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Remove loader ──
    setTimeout(() => {
      const loader = document.querySelector('.cin-loader');
      if (loader) loader.classList.add('hidden');
    }, 1800);

    console.log('🌀 VirtuArts Portal Engine initialized');
  }
})();
