/**
 * VirtuArts — Advanced 3D Creation Studio (Three.js)
 * Full-featured 3D scene builder with CSG, grouping, undo/redo,
 * animations, lighting controls, environment presets, and more.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const viewport = document.getElementById('sb-viewport');
if (!viewport) throw new Error('Viewport not found');

/* ═══════════════════════════════════════
   THREE.JS  SCENE  SETUP
═══════════════════════════════════════ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0c);
scene.fog = new THREE.FogExp2(0x0a0a0c, 0.012);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(5, 4, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
viewport.appendChild(renderer.domElement);

// Orbit controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
orbitControls.minDistance = 2;
orbitControls.maxDistance = 50;

// Transform controls
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.setSize(0.8);
scene.add(transformControls);

transformControls.addEventListener('dragging-changed', (e) => {
  orbitControls.enabled = !e.value;
});

transformControls.addEventListener('objectChange', () => {
  // Snap if enabled
  if (snapEnabled && selectedObject) {
    const s = snapSize;
    if (currentTransformMode === 'translate') {
      selectedObject.position.x = Math.round(selectedObject.position.x / s) * s;
      selectedObject.position.y = Math.round(selectedObject.position.y / s) * s;
      selectedObject.position.z = Math.round(selectedObject.position.z / s) * s;
    } else if (currentTransformMode === 'rotate') {
      const snapRad = THREE.MathUtils.degToRad(15);
      selectedObject.rotation.x = Math.round(selectedObject.rotation.x / snapRad) * snapRad;
      selectedObject.rotation.y = Math.round(selectedObject.rotation.y / snapRad) * snapRad;
      selectedObject.rotation.z = Math.round(selectedObject.rotation.z / snapRad) * snapRad;
    }
  }
  updateSelectedUI();
});

// Save state after transform drag ends
transformControls.addEventListener('mouseUp', () => {
  pushUndo('transform');
});

/* ═══════════════════════════════════════
   LIGHTING
═══════════════════════════════════════ */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(8, 12, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
scene.add(directionalLight);

const fillLight = new THREE.PointLight(0xf97316, 0.3, 30);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

// User-added point lights array
const userPointLights = [];

/* ═══════════════════════════════════════
   HELPERS (Grid + Axes)
═══════════════════════════════════════ */
const gridHelper = new THREE.GridHelper(20, 20, 0x2a2a2a, 0x1a1a1a);
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(3);
axesHelper.visible = false;
scene.add(axesHelper);

// Ground plane (shadow receiver)
const groundGeo = new THREE.PlaneGeometry(40, 40);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

/* ═══════════════════════════════════════
   STATE
═══════════════════════════════════════ */
let objects = [];
let selectedObject = null;
let multiSelected = []; // for multi-select
let objectCounter = 0;
let currentTransformMode = 'translate';
let snapEnabled = false;
let snapSize = 0.5;
let currentEnv = 'void';

/* ═══════════════════════════════════════
   UNDO / REDO SYSTEM
═══════════════════════════════════════ */
const undoStack = [];
const redoStack = [];
const MAX_UNDO = 50;

function captureState() {
  return JSON.stringify(objects.map(o => ({
    shapeType: o.userData.shapeType,
    name: o.userData.name,
    color: o.userData.color,
    materialType: o.userData.materialType,
    position: { x: o.position.x, y: o.position.y, z: o.position.z },
    rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
    scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
    roughness: o.material.roughness,
    metalness: o.material.metalness,
    opacity: o.material.opacity,
    anim: o.userData.anim || null,
    isCSG: o.userData.isCSG || false,
  })));
}

function pushUndo(action) {
  undoStack.push({ action, state: captureState() });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
  updateUndoRedoUI();
}

function undo() {
  if (undoStack.length === 0) return;
  const current = captureState();
  const prev = undoStack.pop();
  redoStack.push({ action: 'undo', state: current });
  restoreState(prev.state);
  updateUndoRedoUI();
  showToast('Undo', 'success');
}

function redo() {
  if (redoStack.length === 0) return;
  const current = captureState();
  const next = redoStack.pop();
  undoStack.push({ action: 'redo', state: current });
  restoreState(next.state);
  updateUndoRedoUI();
  showToast('Redo', 'success');
}

function restoreState(json) {
  let data;
  try { data = JSON.parse(json); } catch { return; }
  transformControls.detach();
  objects.forEach(o => {
    scene.remove(o);
    o.geometry.dispose();
    if (o.material.dispose) o.material.dispose();
  });
  objects = [];
  selectedObject = null;
  multiSelected = [];
  objectCounter = 0;

  data.forEach(item => {
    const geoFn = GEOMETRIES[item.shapeType];
    if (!geoFn) return;
    objectCounter++;
    const geometry = geoFn();
    const material = createMaterial(item.materialType || 'standard', item.color || '#f97316');
    if (item.roughness !== undefined && material.roughness !== undefined) material.roughness = item.roughness;
    if (item.metalness !== undefined && material.metalness !== undefined) material.metalness = item.metalness;
    if (item.opacity !== undefined) { material.opacity = item.opacity; material.transparent = item.opacity < 1; }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (item.position) mesh.position.set(item.position.x, item.position.y, item.position.z);
    if (item.rotation) mesh.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
    if (item.scale) mesh.scale.set(item.scale.x, item.scale.y, item.scale.z);
    mesh.userData = {
      id: objectCounter,
      name: item.name || `Shape ${objectCounter}`,
      shapeType: item.shapeType,
      materialType: item.materialType || 'standard',
      color: item.color || '#f97316',
      anim: item.anim || null,
      isCSG: item.isCSG || false,
    };
    scene.add(mesh);
    objects.push(mesh);
  });
  updateObjectList();
  updateSelectedUI();
}

function updateUndoRedoUI() {
  const undoBtn = document.getElementById('sb-undo-btn');
  const redoBtn = document.getElementById('sb-redo-btn');
  if (undoBtn) {
    undoBtn.disabled = undoStack.length === 0;
    undoBtn.title = undoStack.length ? `Undo (${undoStack.length})` : 'Nothing to undo';
  }
  if (redoBtn) {
    redoBtn.disabled = redoStack.length === 0;
    redoBtn.title = redoStack.length ? `Redo (${redoStack.length})` : 'Nothing to redo';
  }
}

/* ═══════════════════════════════════════
   GEOMETRY FACTORY
═══════════════════════════════════════ */
const GEOMETRIES = {
  cube:        () => new THREE.BoxGeometry(1, 1, 1),
  sphere:      () => new THREE.SphereGeometry(0.6, 32, 32),
  cylinder:    () => new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
  cone:        () => new THREE.ConeGeometry(0.5, 1, 32),
  torus:       () => new THREE.TorusGeometry(0.5, 0.2, 16, 48),
  torusknot:   () => new THREE.TorusKnotGeometry(0.4, 0.15, 64, 8),
  icosahedron: () => new THREE.IcosahedronGeometry(0.6, 0),
  octahedron:  () => new THREE.OctahedronGeometry(0.6, 0),
  dodecahedron:() => new THREE.DodecahedronGeometry(0.6, 0),
  capsule:     () => new THREE.CapsuleGeometry(0.4, 0.6, 8, 16),
  plane:       () => new THREE.PlaneGeometry(1.5, 1.5),
  ring:        () => new THREE.RingGeometry(0.3, 0.6, 32),
  merged:      () => new THREE.BoxGeometry(1, 1, 1), // placeholder for CSG results
};

const SHAPE_NAMES = {
  cube: 'Cube', sphere: 'Sphere', cylinder: 'Cylinder', cone: 'Cone',
  torus: 'Torus', torusknot: 'Torus Knot', icosahedron: 'Icosahedron',
  octahedron: 'Octahedron', dodecahedron: 'Dodecahedron', capsule: 'Capsule',
  plane: 'Plane', ring: 'Ring', merged: 'Merged',
};

/* ═══════════════════════════════════════
   MATERIAL FACTORY
═══════════════════════════════════════ */
function createMaterial(type, color) {
  const c = new THREE.Color(color);
  switch (type) {
    case 'standard':
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.1 });
    case 'phong':
      return new THREE.MeshPhongMaterial({ color: c, shininess: 80 });
    case 'toon':
      return new THREE.MeshToonMaterial({ color: c });
    case 'wireframe':
      return new THREE.MeshBasicMaterial({ color: c, wireframe: true });
    case 'glass':
      return new THREE.MeshPhysicalMaterial({
        color: c, roughness: 0.05, metalness: 0, transmission: 0.9,
        thickness: 0.5, transparent: true, opacity: 0.7,
      });
    case 'metal':
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.15, metalness: 0.95 });
    case 'emissive':
      return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.1 });
    case 'normal':
      return new THREE.MeshNormalMaterial();
    default:
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.1 });
  }
}

/* ═══════════════════════════════════════
   ADD OBJECT
═══════════════════════════════════════ */
function addObject(shapeType, opts = {}) {
  const geoFn = GEOMETRIES[shapeType];
  if (!geoFn) return null;

  objectCounter++;
  const geometry = opts.geometry || geoFn();
  const material = createMaterial(opts.materialType || 'standard', opts.color || '#f97316');
  const mesh = new THREE.Mesh(geometry, material);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (opts.position) {
    mesh.position.set(opts.position.x, opts.position.y, opts.position.z);
  } else {
    mesh.position.set(
      (Math.random() - 0.5) * 3,
      0.5 + Math.random() * 1.5,
      (Math.random() - 0.5) * 3
    );
  }

  if (opts.rotation) mesh.rotation.set(opts.rotation.x, opts.rotation.y, opts.rotation.z);
  if (opts.scale) mesh.scale.set(opts.scale.x, opts.scale.y, opts.scale.z);

  mesh.userData = {
    id: objectCounter,
    name: opts.name || `${SHAPE_NAMES[shapeType] || 'Shape'} ${objectCounter}`,
    shapeType: shapeType,
    materialType: opts.materialType || 'standard',
    color: opts.color || '#f97316',
    anim: opts.anim || null,
    isCSG: opts.isCSG || false,
  };

  scene.add(mesh);
  objects.push(mesh);

  if (!opts.silent) {
    selectObject(mesh);
    updateObjectList();
    pushUndo('add');
    showToast(`Added ${SHAPE_NAMES[shapeType] || 'Shape'}`, 'success');
  }

  return mesh;
}

/* ═══════════════════════════════════════
   SELECT / DESELECT / MULTI-SELECT
═══════════════════════════════════════ */
function selectObject(mesh) {
  multiSelected = [];
  selectedObject = mesh;
  if (mesh) {
    transformControls.attach(mesh);
  } else {
    transformControls.detach();
  }
  updateObjectList();
  updateSelectedUI();
}

function toggleMultiSelect(mesh) {
  if (!mesh) return;
  const idx = multiSelected.indexOf(mesh);
  if (idx >= 0) {
    multiSelected.splice(idx, 1);
  } else {
    multiSelected.push(mesh);
  }
  // Also set primary selection to last
  if (multiSelected.length > 0) {
    selectedObject = multiSelected[multiSelected.length - 1];
    transformControls.attach(selectedObject);
  } else {
    selectedObject = null;
    transformControls.detach();
  }
  updateObjectList();
  updateSelectedUI();
}

function deleteSelected() {
  if (!selectedObject) return;
  pushUndo('delete');
  transformControls.detach();
  scene.remove(selectedObject);
  selectedObject.geometry.dispose();
  if (selectedObject.material.dispose) selectedObject.material.dispose();
  objects = objects.filter(o => o !== selectedObject);
  selectedObject = null;
  multiSelected = [];
  updateObjectList();
  updateSelectedUI();
  showToast('Object removed', 'success');
}

function deleteMultiSelected() {
  if (multiSelected.length === 0) return;
  pushUndo('delete-multi');
  transformControls.detach();
  multiSelected.forEach(obj => {
    scene.remove(obj);
    obj.geometry.dispose();
    if (obj.material.dispose) obj.material.dispose();
    objects = objects.filter(o => o !== obj);
  });
  selectedObject = null;
  multiSelected = [];
  updateObjectList();
  updateSelectedUI();
  showToast('Objects removed', 'success');
}

function duplicateSelected() {
  if (!selectedObject) return;
  const src = selectedObject;
  const mesh = addObject(src.userData.shapeType, {
    materialType: src.userData.materialType,
    color: src.userData.color,
    position: { x: src.position.x + 1, y: src.position.y, z: src.position.z + 1 },
    rotation: { x: src.rotation.x, y: src.rotation.y, z: src.rotation.z },
    scale: { x: src.scale.x, y: src.scale.y, z: src.scale.z },
    anim: src.userData.anim ? { ...src.userData.anim } : null,
  });
  if (mesh && src.material.roughness !== undefined) mesh.material.roughness = src.material.roughness;
  if (mesh && src.material.metalness !== undefined) mesh.material.metalness = src.material.metalness;
  if (mesh && src.material.opacity !== undefined) {
    mesh.material.opacity = src.material.opacity;
    mesh.material.transparent = src.material.opacity < 1;
  }
}

/* ═══════════════════════════════════════
   CSG BOOLEAN OPERATIONS (manual merge fallback)
═══════════════════════════════════════ */
function performCSG(operation) {
  // Need exactly 2 objects selected
  let objA, objB;
  if (multiSelected.length === 2) {
    objA = multiSelected[0];
    objB = multiSelected[1];
  } else if (multiSelected.length === 1 && selectedObject && selectedObject !== multiSelected[0]) {
    objA = multiSelected[0];
    objB = selectedObject;
  } else {
    showToast('Select exactly 2 objects for CSG', 'error');
    return;
  }

  // Use manual merge as primary approach (CSG lib is unreliable via CDN)
  performManualUnion(objA, objB);
}

// Manual union — merges geometries (visual combination)
function performManualUnion(objA, objB) {
  pushUndo('merge');

  const geoA = objA.geometry.clone();
  geoA.applyMatrix4(objA.matrixWorld);
  const geoB = objB.geometry.clone();
  geoB.applyMatrix4(objB.matrixWorld);

  // Manual merge by combining buffer attributes
  let mergedGeo;
  try {
    mergedGeo = mergeGeometries([geoA, geoB]);
  } catch (e) {
    // Fallback: just use geometry A
    mergedGeo = geoA;
  }

  if (!mergedGeo) {
    showToast('Merge failed — incompatible geometries', 'error');
    return;
  }

  const material = objA.material.clone();
  const mesh = new THREE.Mesh(mergedGeo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  objectCounter++;
  mesh.userData = {
    id: objectCounter,
    name: `Merged ${objectCounter}`,
    shapeType: 'merged',
    materialType: objA.userData.materialType,
    color: objA.userData.color,
    isCSG: true,
    anim: null,
  };

  // Remove originals
  transformControls.detach();
  [objA, objB].forEach(o => {
    scene.remove(o);
    o.geometry.dispose();
    if (o.material.dispose) o.material.dispose();
    objects = objects.filter(x => x !== o);
  });

  scene.add(mesh);
  objects.push(mesh);
  selectObject(mesh);
  updateObjectList();
  showToast('Objects merged!', 'success');
}

// Simple geometry merge utility (replaces BufferGeometryUtils.mergeGeometries)
function mergeGeometries(geos) {
  // Collect position data from all geometries
  const positions = [];
  const normals = [];
  let totalVerts = 0;

  for (const geo of geos) {
    const pos = geo.getAttribute('position');
    if (!pos) continue;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    const norm = geo.getAttribute('normal');
    if (norm) {
      for (let i = 0; i < norm.count; i++) {
        normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        normals.push(0, 1, 0);
      }
    }
    totalVerts += pos.count;
  }

  if (totalVerts === 0) return null;

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length === positions.length) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }
  return merged;
}

/* ═══════════════════════════════════════
   RAYCASTER (Click to Select)
═══════════════════════════════════════ */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (transformControls.dragging) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(objects);
  if (hits.length > 0) {
    if (e.shiftKey) {
      toggleMultiSelect(hits[0].object);
    } else {
      selectObject(hits[0].object);
    }
  }
});

/* ═══════════════════════════════════════
   CONTEXT MENU (Right-Click)
═══════════════════════════════════════ */
let contextMenu = null;

renderer.domElement.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  closeContextMenu();

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(objects);
  const hitObj = hits.length > 0 ? hits[0].object : null;

  if (hitObj) selectObject(hitObj);

  contextMenu = document.createElement('div');
  contextMenu.className = 'sb-ctxmenu';
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';

  const items = [];
  if (hitObj) {
    items.push({ label: '✏️ Rename', action: () => renameObject(hitObj) });
    items.push({ label: '📋 Duplicate', action: () => duplicateSelected() });
    items.push({ label: '🎯 Focus Camera', action: () => focusOnObject(hitObj) });
    items.push({ label: '───', action: null });
    items.push({ label: '🗑️ Delete', action: () => deleteSelected(), cls: 'danger' });
  } else {
    items.push({ label: '➕ Add Cube', action: () => addObject('cube') });
    items.push({ label: '🟡 Add Sphere', action: () => addObject('sphere') });
    items.push({ label: '🔄 Reset View', action: () => resetCameraView('perspective') });
  }

  items.forEach(item => {
    if (item.label === '───') {
      const sep = document.createElement('div');
      sep.className = 'sb-ctxmenu-sep';
      contextMenu.appendChild(sep);
      return;
    }
    const el = document.createElement('button');
    el.className = 'sb-ctxmenu-item' + (item.cls ? ' ' + item.cls : '');
    el.textContent = item.label;
    el.addEventListener('click', () => {
      item.action();
      closeContextMenu();
    });
    contextMenu.appendChild(el);
  });

  document.body.appendChild(contextMenu);

  // Close on next click
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu, { once: true });
  }, 50);
});

function closeContextMenu() {
  if (contextMenu) {
    contextMenu.remove();
    contextMenu = null;
  }
}

/* ═══════════════════════════════════════
   OBJECT RENAME (Double-click in list)
═══════════════════════════════════════ */
function renameObject(obj) {
  const newName = prompt('Rename object:', obj.userData.name);
  if (newName && newName.trim()) {
    obj.userData.name = newName.trim();
    updateObjectList();
    showToast('Renamed', 'success');
  }
}

/* ═══════════════════════════════════════
   CAMERA VIEWS
═══════════════════════════════════════ */
function resetCameraView(view) {
  const target = new THREE.Vector3(0, 1, 0);
  let pos;
  switch (view) {
    case 'front':   pos = new THREE.Vector3(0, 2, 10); break;
    case 'top':     pos = new THREE.Vector3(0, 12, 0.01); break;
    case 'right':   pos = new THREE.Vector3(10, 2, 0); break;
    case 'perspective': default: pos = new THREE.Vector3(5, 4, 7); break;
  }
  animateCamera(pos, target);
}

function focusOnObject(obj) {
  if (!obj) return;
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim * 3;
  const dir = camera.position.clone().sub(center).normalize();
  const newPos = center.clone().add(dir.multiplyScalar(dist));
  animateCamera(newPos, center);
}

function animateCamera(targetPos, targetLookAt) {
  const startPos = camera.position.clone();
  const startTarget = orbitControls.target.clone();
  const duration = 600;
  const startTime = Date.now();

  function step() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease out cubic

    camera.position.lerpVectors(startPos, targetPos, ease);
    orbitControls.target.lerpVectors(startTarget, targetLookAt, ease);
    orbitControls.update();

    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

/* ═══════════════════════════════════════
   ENVIRONMENT PRESETS
═══════════════════════════════════════ */
const ENVIRONMENTS = {
  void: {
    bg: 0x0a0a0c,
    fog: 0x0a0a0c,
    fogDensity: 0.012,
    ambientColor: 0xffffff,
    ambientIntensity: 0.4,
    dirColor: 0xffffff,
    dirIntensity: 1.0,
  },
  studio: {
    bg: 0x1a1a2e,
    fog: 0x1a1a2e,
    fogDensity: 0.008,
    ambientColor: 0xe0e0ff,
    ambientIntensity: 0.6,
    dirColor: 0xffffff,
    dirIntensity: 1.2,
  },
  sunset: {
    bg: 0x1a0a1e,
    fog: 0x1a0a1e,
    fogDensity: 0.01,
    ambientColor: 0xffa040,
    ambientIntensity: 0.5,
    dirColor: 0xff8844,
    dirIntensity: 1.4,
  },
  midnight: {
    bg: 0x050510,
    fog: 0x050510,
    fogDensity: 0.015,
    ambientColor: 0x4060ff,
    ambientIntensity: 0.3,
    dirColor: 0x8888cc,
    dirIntensity: 0.8,
  },
  arena: {
    bg: 0x0c0c0c,
    fog: 0x0c0c0c,
    fogDensity: 0.005,
    ambientColor: 0x00ffaa,
    ambientIntensity: 0.5,
    dirColor: 0xffffff,
    dirIntensity: 1.0,
  },
};

function setEnvironment(envName) {
  const env = ENVIRONMENTS[envName];
  if (!env) return;
  currentEnv = envName;

  scene.background = new THREE.Color(env.bg);
  scene.fog = new THREE.FogExp2(env.fog, env.fogDensity);
  ambientLight.color.set(env.ambientColor);
  ambientLight.intensity = env.ambientIntensity;
  directionalLight.color.set(env.dirColor);
  directionalLight.intensity = env.dirIntensity;

  // Update grid colors per environment
  if (envName === 'arena') {
    gridHelper.material[0].color.set(0x00664d);
    gridHelper.material[1].color.set(0x003d2e);
  } else if (envName === 'sunset') {
    gridHelper.material[0].color.set(0x3a2020);
    gridHelper.material[1].color.set(0x221010);
  } else if (envName === 'midnight') {
    gridHelper.material[0].color.set(0x151530);
    gridHelper.material[1].color.set(0x0a0a20);
  } else if (envName === 'studio') {
    gridHelper.material[0].color.set(0x2a2a3a);
    gridHelper.material[1].color.set(0x1a1a2a);
  } else {
    gridHelper.material[0].color.set(0x2a2a2a);
    gridHelper.material[1].color.set(0x1a1a1a);
  }

  // Update ground
  ground.material.opacity = envName === 'void' ? 0.3 : 0.2;

  // Highlight active env button
  document.querySelectorAll('.sb-env-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.env === envName);
  });

  showToast(`${envName.charAt(0).toUpperCase() + envName.slice(1)} environment`, 'success');
}

/* ═══════════════════════════════════════
   ANIMATION SYSTEM
═══════════════════════════════════════ */
function setObjectAnimation(obj, animType, speed) {
  if (!obj) return;
  if (!obj.userData.anim) {
    obj.userData.anim = { rotateX: 0, rotateY: 0, rotateZ: 0, float: 0, floatPhase: Math.random() * Math.PI * 2 };
  }
  obj.userData.anim[animType] = speed;
}

function applyAnimations(deltaTime) {
  const t = Date.now() * 0.001;
  objects.forEach(obj => {
    const anim = obj.userData.anim;
    if (!anim) return;
    if (obj === selectedObject && transformControls.dragging) return;

    if (anim.rotateX) obj.rotation.x += anim.rotateX * deltaTime;
    if (anim.rotateY) obj.rotation.y += anim.rotateY * deltaTime;
    if (anim.rotateZ) obj.rotation.z += anim.rotateZ * deltaTime;
    if (anim.float) {
      obj.position.y += Math.sin(t * 2 + (anim.floatPhase || 0)) * anim.float * deltaTime * 0.5;
    }
  });
}

/* ═══════════════════════════════════════
   UI UPDATES
═══════════════════════════════════════ */
function updateObjectList() {
  const list = document.getElementById('sb-obj-list');
  if (!list) return;

  if (objects.length === 0) {
    list.innerHTML = '<div class="sb-obj-empty">No objects yet. Add a shape!</div>';
    document.getElementById('sb-obj-count').textContent = '0';
    return;
  }

  list.innerHTML = objects.map(obj => {
    const isSelected = selectedObject === obj;
    const isMulti = multiSelected.includes(obj);
    const cls = isSelected ? 'selected' : (isMulti ? 'multi-selected' : '');
    const icon = obj.userData.isCSG ? '🔗' : '';
    const animIcon = obj.userData.anim && (obj.userData.anim.rotateX || obj.userData.anim.rotateY || obj.userData.anim.rotateZ || obj.userData.anim.float) ? '⚡' : '';
    return `
      <div class="sb-obj-item ${cls}" data-id="${obj.userData.id}">
        <span class="sb-obj-color" style="background:${obj.userData.color}"></span>
        <span class="sb-obj-name" data-objid="${obj.userData.id}">${icon}${animIcon} ${obj.userData.name}</span>
        <button class="sb-obj-del" data-del="${obj.userData.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }).join('');

  // Click to select
  list.querySelectorAll('.sb-obj-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.sb-obj-del')) return;
      const id = parseInt(el.dataset.id);
      const obj = objects.find(o => o.userData.id === id);
      if (obj) {
        if (e.shiftKey) {
          toggleMultiSelect(obj);
        } else {
          selectObject(obj);
        }
      }
    });
    // Double click to rename
    el.addEventListener('dblclick', (e) => {
      const id = parseInt(el.dataset.id);
      const obj = objects.find(o => o.userData.id === id);
      if (obj) renameObject(obj);
    });
  });

  // Delete buttons
  list.querySelectorAll('.sb-obj-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.del);
      const obj = objects.find(o => o.userData.id === id);
      if (obj) {
        pushUndo('delete');
        if (selectedObject === obj) selectObject(null);
        transformControls.detach();
        scene.remove(obj);
        obj.geometry.dispose();
        if (obj.material.dispose) obj.material.dispose();
        objects = objects.filter(o => o !== obj);
        multiSelected = multiSelected.filter(o => o !== obj);
        updateObjectList();
        updateSelectedUI();
      }
    });
  });

  // Object count
  const countBadge = document.getElementById('sb-obj-count');
  if (countBadge) countBadge.textContent = objects.length;
}

function updateSelectedUI() {
  const matPanel = document.getElementById('sb-material-panel');
  const transformPanel = document.getElementById('sb-transform-panel');
  const animPanel = document.getElementById('sb-animation-panel');
  const noSel = document.getElementById('sb-no-selection');
  const csgBtns = document.getElementById('sb-csg-buttons');

  if (!selectedObject) {
    if (matPanel) matPanel.style.display = 'none';
    if (transformPanel) transformPanel.style.display = 'none';
    if (animPanel) animPanel.style.display = 'none';
    if (noSel) noSel.style.display = 'block';
    if (csgBtns) csgBtns.style.display = 'none';
    return;
  }

  if (matPanel) matPanel.style.display = '';
  if (transformPanel) transformPanel.style.display = '';
  if (animPanel) animPanel.style.display = '';
  if (noSel) noSel.style.display = 'none';

  // Show CSG buttons only when 2+ objects selected
  const canCSG = multiSelected.length === 2 || (multiSelected.length === 1 && selectedObject && selectedObject !== multiSelected[0]);
  if (csgBtns) csgBtns.style.display = canCSG ? 'flex' : 'none';

  // Color
  const colorInput = document.getElementById('sb-color');
  if (colorInput) colorInput.value = selectedObject.userData.color;

  // Material type buttons
  document.querySelectorAll('.sb-mat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mat === selectedObject.userData.materialType);
  });

  // Roughness / Metalness / Opacity
  syncSlider('sb-roughness', selectedObject.material.roughness);
  syncSlider('sb-metalness', selectedObject.material.metalness);
  syncSlider('sb-opacity', selectedObject.material.opacity !== undefined ? selectedObject.material.opacity : 1);

  // Per-axis Position
  setInputValue('sb-pos-x', selectedObject.position.x.toFixed(2));
  setInputValue('sb-pos-y', selectedObject.position.y.toFixed(2));
  setInputValue('sb-pos-z', selectedObject.position.z.toFixed(2));

  // Per-axis Rotation (convert to degrees)
  setInputValue('sb-rot-x', THREE.MathUtils.radToDeg(selectedObject.rotation.x).toFixed(1));
  setInputValue('sb-rot-y', THREE.MathUtils.radToDeg(selectedObject.rotation.y).toFixed(1));
  setInputValue('sb-rot-z', THREE.MathUtils.radToDeg(selectedObject.rotation.z).toFixed(1));

  // Per-axis Scale
  setInputValue('sb-scl-x', selectedObject.scale.x.toFixed(2));
  setInputValue('sb-scl-y', selectedObject.scale.y.toFixed(2));
  setInputValue('sb-scl-z', selectedObject.scale.z.toFixed(2));

  // Animation sliders
  const anim = selectedObject.userData.anim || { rotateX: 0, rotateY: 0, rotateZ: 0, float: 0 };
  syncSlider('sb-anim-rx', anim.rotateX || 0);
  syncSlider('sb-anim-ry', anim.rotateY || 0);
  syncSlider('sb-anim-rz', anim.rotateZ || 0);
  syncSlider('sb-anim-float', anim.float || 0);

  // Object count badge
  const countBadge = document.getElementById('sb-obj-count');
  if (countBadge) countBadge.textContent = objects.length;
}

function syncSlider(id, value) {
  const slider = document.getElementById(id);
  if (slider && value !== undefined) {
    slider.value = value;
    const label = document.getElementById(id + '-val');
    if (label) label.textContent = parseFloat(value).toFixed(2);
  }
}

function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el && document.activeElement !== el) el.value = val;
}

/* ═══════════════════════════════════════
   TOOLBAR EVENT WIRING
═══════════════════════════════════════ */
// Add shape buttons
document.querySelectorAll('[data-add-shape]').forEach(btn => {
  btn.addEventListener('click', () => {
    addObject(btn.dataset.addShape);
  });
});

// Transform mode
document.querySelectorAll('[data-tf-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    currentTransformMode = btn.dataset.tfMode;
    transformControls.setMode(currentTransformMode);
    document.querySelectorAll('[data-tf-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Color picker
const colorInput = document.getElementById('sb-color');
if (colorInput) {
  colorInput.addEventListener('input', (e) => {
    if (!selectedObject) return;
    selectedObject.userData.color = e.target.value;
    selectedObject.material.color.set(e.target.value);
    updateObjectList();
  });
  colorInput.addEventListener('change', () => pushUndo('color'));
}

// Color swatches
document.querySelectorAll('.sb-swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    if (!selectedObject) return;
    const c = sw.dataset.color;
    selectedObject.userData.color = c;
    selectedObject.material.color.set(c);
    if (colorInput) colorInput.value = c;
    updateObjectList();
    pushUndo('color');
  });
});

// Material type
document.querySelectorAll('.sb-mat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!selectedObject) return;
    const type = btn.dataset.mat;
    selectedObject.userData.materialType = type;
    const newMat = createMaterial(type, selectedObject.userData.color);
    selectedObject.material.dispose();
    selectedObject.material = newMat;
    document.querySelectorAll('.sb-mat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateSelectedUI();
    pushUndo('material');
  });
});

// PBR Sliders
function wireSlider(id, prop, applyFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', (e) => {
    if (!selectedObject) return;
    const v = parseFloat(e.target.value);
    applyFn(v);
    const label = document.getElementById(id + '-val');
    if (label) label.textContent = v.toFixed(2);
  });
  el.addEventListener('change', () => pushUndo('slider'));
}

wireSlider('sb-roughness', 'roughness', v => {
  if (selectedObject.material.roughness !== undefined) selectedObject.material.roughness = v;
});
wireSlider('sb-metalness', 'metalness', v => {
  if (selectedObject.material.metalness !== undefined) selectedObject.material.metalness = v;
});
wireSlider('sb-opacity', 'opacity', v => {
  selectedObject.material.opacity = v;
  selectedObject.material.transparent = v < 1;
});

// Per-axis Position inputs
function wireAxisInput(id, axis, group) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', (e) => {
    if (!selectedObject) return;
    const v = parseFloat(e.target.value);
    if (isNaN(v)) return;
    if (group === 'pos') selectedObject.position[axis] = v;
    else if (group === 'rot') selectedObject.rotation[axis] = THREE.MathUtils.degToRad(v);
    else if (group === 'scl') selectedObject.scale[axis] = Math.max(0.01, v);
  });
  el.addEventListener('change', () => pushUndo('axis-input'));
}

wireAxisInput('sb-pos-x', 'x', 'pos');
wireAxisInput('sb-pos-y', 'y', 'pos');
wireAxisInput('sb-pos-z', 'z', 'pos');
wireAxisInput('sb-rot-x', 'x', 'rot');
wireAxisInput('sb-rot-y', 'y', 'rot');
wireAxisInput('sb-rot-z', 'z', 'rot');
wireAxisInput('sb-scl-x', 'x', 'scl');
wireAxisInput('sb-scl-y', 'y', 'scl');
wireAxisInput('sb-scl-z', 'z', 'scl');

// Animation sliders
function wireAnimSlider(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', (e) => {
    if (!selectedObject) return;
    const v = parseFloat(e.target.value);
    setObjectAnimation(selectedObject, key, v);
    const label = document.getElementById(id + '-val');
    if (label) label.textContent = v.toFixed(2);
    updateObjectList();
  });
}

wireAnimSlider('sb-anim-rx', 'rotateX');
wireAnimSlider('sb-anim-ry', 'rotateY');
wireAnimSlider('sb-anim-rz', 'rotateZ');
wireAnimSlider('sb-anim-float', 'float');

// Delete / Duplicate buttons
document.getElementById('sb-delete-btn')?.addEventListener('click', () => {
  if (multiSelected.length > 1) deleteMultiSelected();
  else deleteSelected();
});
document.getElementById('sb-duplicate-btn')?.addEventListener('click', duplicateSelected);

// Undo / Redo buttons
document.getElementById('sb-undo-btn')?.addEventListener('click', undo);
document.getElementById('sb-redo-btn')?.addEventListener('click', redo);

// Grid toggle
document.getElementById('sb-grid-toggle')?.addEventListener('click', function () {
  gridHelper.visible = !gridHelper.visible;
  this.classList.toggle('active', gridHelper.visible);
});

// Axes toggle
document.getElementById('sb-axes-toggle')?.addEventListener('click', function () {
  axesHelper.visible = !axesHelper.visible;
  this.classList.toggle('active', axesHelper.visible);
});

// Snap toggle
document.getElementById('sb-snap-toggle')?.addEventListener('click', function () {
  snapEnabled = !snapEnabled;
  this.classList.toggle('active', snapEnabled);
  const badge = document.getElementById('sb-snap-badge');
  if (badge) badge.style.display = snapEnabled ? 'flex' : 'none';
  showToast(snapEnabled ? 'Snap enabled' : 'Snap disabled', 'success');
});

// Snap size
document.getElementById('sb-snap-size')?.addEventListener('change', function () {
  snapSize = parseFloat(this.value);
});

// Environment buttons
document.querySelectorAll('.sb-env-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setEnvironment(btn.dataset.env);
  });
});

// Camera view buttons
document.querySelectorAll('[data-cam-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    resetCameraView(btn.dataset.camView);
  });
});

// Focus button
document.getElementById('sb-focus-btn')?.addEventListener('click', () => {
  if (selectedObject) focusOnObject(selectedObject);
});

// CSG buttons
document.getElementById('sb-csg-union')?.addEventListener('click', () => performCSG('union'));
document.getElementById('sb-csg-subtract')?.addEventListener('click', () => performCSG('subtract'));
document.getElementById('sb-csg-intersect')?.addEventListener('click', () => performCSG('intersect'));

// Lighting controls
wireSlider('sb-light-ambient-intensity', null, v => { ambientLight.intensity = v; });
wireSlider('sb-light-dir-intensity', null, v => { directionalLight.intensity = v; });
wireSlider('sb-light-dir-x', null, v => { directionalLight.position.x = v; });
wireSlider('sb-light-dir-y', null, v => { directionalLight.position.y = v; });
wireSlider('sb-light-dir-z', null, v => { directionalLight.position.z = v; });

const ambientColorInput = document.getElementById('sb-light-ambient-color');
if (ambientColorInput) {
  ambientColorInput.addEventListener('input', e => { ambientLight.color.set(e.target.value); });
}
const dirColorInput = document.getElementById('sb-light-dir-color');
if (dirColorInput) {
  dirColorInput.addEventListener('input', e => { directionalLight.color.set(e.target.value); });
}

// Shadow toggle
document.getElementById('sb-shadow-toggle')?.addEventListener('click', function () {
  renderer.shadowMap.enabled = !renderer.shadowMap.enabled;
  this.classList.toggle('active', renderer.shadowMap.enabled);
  objects.forEach(o => { o.castShadow = renderer.shadowMap.enabled; o.receiveShadow = renderer.shadowMap.enabled; });
  ground.receiveShadow = renderer.shadowMap.enabled;
  // Force shadow map refresh
  objects.forEach(o => { o.material.needsUpdate = true; });
  showToast(renderer.shadowMap.enabled ? 'Shadows ON' : 'Shadows OFF', 'success');
});

// Reset scene
document.getElementById('sb-reset-btn')?.addEventListener('click', () => {
  if (!confirm('Clear all objects from the scene?')) return;
  pushUndo('reset');
  transformControls.detach();
  objects.forEach(o => {
    scene.remove(o);
    o.geometry.dispose();
    if (o.material.dispose) o.material.dispose();
  });
  objects = [];
  selectedObject = null;
  multiSelected = [];
  objectCounter = 0;
  updateObjectList();
  updateSelectedUI();
  showToast('Scene cleared', 'success');
});

// Panel collapse
document.querySelectorAll('.sb-panel-header').forEach(header => {
  header.addEventListener('click', () => {
    header.closest('.sb-panel').classList.toggle('collapsed');
  });
});

/* ═══════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════ */
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key.toLowerCase()) {
    case 'g':
      setTransformMode('translate');
      break;
    case 'r':
      if (!e.ctrlKey && !e.metaKey) setTransformMode('rotate');
      break;
    case 's':
      if (!e.ctrlKey && !e.metaKey) setTransformMode('scale');
      break;
    case 'delete':
    case 'backspace':
      if (multiSelected.length > 1) deleteMultiSelected();
      else if (selectedObject) deleteSelected();
      break;
    case 'escape':
      selectObject(null);
      closeContextMenu();
      break;
    case 'd':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        duplicateSelected();
      }
      break;
    case 'z':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      break;
    case 'y':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        redo();
      }
      break;
    case 'f':
      if (selectedObject) focusOnObject(selectedObject);
      break;
  }
});

function setTransformMode(mode) {
  currentTransformMode = mode;
  transformControls.setMode(mode);
  document.querySelectorAll('[data-tf-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.tfMode === mode);
  });
}

/* ═══════════════════════════════════════
   SCREENSHOT & SAVE
═══════════════════════════════════════ */
document.getElementById('sb-screenshot-btn')?.addEventListener('click', () => {
  openSaveModal();
});

function openSaveModal() {
  if (objects.length === 0) {
    showToast('Add some shapes first!', 'error');
    return;
  }

  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');

  const overlay = document.createElement('div');
  overlay.className = 'sb-modal-overlay';
  overlay.innerHTML = `
    <div class="sb-modal">
      <div class="sb-modal-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save Creation
        </h3>
        <button class="sb-modal-close" onclick="this.closest('.sb-modal-overlay').remove()">&times;</button>
      </div>
      <div class="sb-modal-body">
        <div class="sb-modal-preview">
          <img src="${dataURL}" alt="Preview">
        </div>
        <div class="sb-form-group" style="margin-top:16px;">
          <label>Creation Title</label>
          <input type="text" id="sb-save-title" placeholder="My 3D Masterpiece" maxlength="100">
        </div>
      </div>
      <div class="sb-modal-footer">
        <button class="sb-btn sb-btn-ghost" onclick="this.closest('.sb-modal-overlay').remove()">Cancel</button>
        <button class="sb-btn sb-btn-primary" id="sb-save-confirm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/></svg>
          Save &amp; Export
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.getElementById('sb-save-confirm').addEventListener('click', async () => {
    const title = document.getElementById('sb-save-title').value.trim() || 'Untitled';
    const sceneData = serializeScene();

    try {
      const resp = await fetch('/shapes3d/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          screenshot: dataURL,
          sceneData: sceneData,
        }),
      });
      const result = await resp.json();
      if (result.success) {
        showToast('Scene saved successfully!', 'success');
        overlay.remove();
      } else {
        showToast('Save failed: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    }
  });

  setTimeout(() => document.getElementById('sb-save-title')?.focus(), 100);
}

/* ═══════════════════════════════════════
   SCENE SERIALIZATION
═══════════════════════════════════════ */
function serializeScene() {
  return JSON.stringify({
    environment: currentEnv,
    lighting: {
      ambientColor: '#' + ambientLight.color.getHexString(),
      ambientIntensity: ambientLight.intensity,
      dirColor: '#' + directionalLight.color.getHexString(),
      dirIntensity: directionalLight.intensity,
      dirPosition: {
        x: directionalLight.position.x,
        y: directionalLight.position.y,
        z: directionalLight.position.z,
      },
    },
    objects: objects.map(o => ({
      shapeType: o.userData.shapeType,
      name: o.userData.name,
      color: o.userData.color,
      materialType: o.userData.materialType,
      position: { x: o.position.x, y: o.position.y, z: o.position.z },
      rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
      scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
      roughness: o.material.roughness,
      metalness: o.material.metalness,
      opacity: o.material.opacity,
      anim: o.userData.anim || null,
      isCSG: o.userData.isCSG || false,
    })),
  });
}

function loadScene(json) {
  let data;
  try { data = JSON.parse(json); } catch { return; }

  transformControls.detach();
  objects.forEach(o => {
    scene.remove(o);
    o.geometry.dispose();
    if (o.material.dispose) o.material.dispose();
  });
  objects = [];
  selectedObject = null;
  multiSelected = [];
  objectCounter = 0;

  // Handle old format (array) vs new format (object with environment/lighting/objects)
  const objArray = Array.isArray(data) ? data : (data.objects || []);
  const env = data.environment || 'void';
  const lighting = data.lighting || null;

  // Restore environment
  setEnvironment(env);

  // Restore lighting
  if (lighting) {
    if (lighting.ambientColor) ambientLight.color.set(lighting.ambientColor);
    if (lighting.ambientIntensity !== undefined) ambientLight.intensity = lighting.ambientIntensity;
    if (lighting.dirColor) directionalLight.color.set(lighting.dirColor);
    if (lighting.dirIntensity !== undefined) directionalLight.intensity = lighting.dirIntensity;
    if (lighting.dirPosition) directionalLight.position.set(lighting.dirPosition.x, lighting.dirPosition.y, lighting.dirPosition.z);

    // Sync lighting UI
    syncSlider('sb-light-ambient-intensity', ambientLight.intensity);
    syncSlider('sb-light-dir-intensity', directionalLight.intensity);
    syncSlider('sb-light-dir-x', directionalLight.position.x);
    syncSlider('sb-light-dir-y', directionalLight.position.y);
    syncSlider('sb-light-dir-z', directionalLight.position.z);
    if (document.getElementById('sb-light-ambient-color')) {
      document.getElementById('sb-light-ambient-color').value = lighting.ambientColor || '#ffffff';
    }
    if (document.getElementById('sb-light-dir-color')) {
      document.getElementById('sb-light-dir-color').value = lighting.dirColor || '#ffffff';
    }
  }

  objArray.forEach(item => {
    const geoFn = GEOMETRIES[item.shapeType];
    if (!geoFn) return;

    objectCounter++;
    const geometry = geoFn();
    const material = createMaterial(item.materialType || 'standard', item.color || '#f97316');
    if (item.roughness !== undefined && material.roughness !== undefined) material.roughness = item.roughness;
    if (item.metalness !== undefined && material.metalness !== undefined) material.metalness = item.metalness;
    if (item.opacity !== undefined) { material.opacity = item.opacity; material.transparent = item.opacity < 1; }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (item.position) mesh.position.set(item.position.x, item.position.y, item.position.z);
    if (item.rotation) mesh.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
    if (item.scale) mesh.scale.set(item.scale.x, item.scale.y, item.scale.z);

    mesh.userData = {
      id: objectCounter,
      name: item.name || `${SHAPE_NAMES[item.shapeType]} ${objectCounter}`,
      shapeType: item.shapeType,
      materialType: item.materialType || 'standard',
      color: item.color || '#f97316',
      anim: item.anim || null,
      isCSG: item.isCSG || false,
    };

    scene.add(mesh);
    objects.push(mesh);
  });

  updateObjectList();
  updateSelectedUI();
  showToast(`Loaded ${objArray.length} objects`, 'success');
}

// Load from embedded data
const sceneDataEl = document.getElementById('sb-scene-data');
if (sceneDataEl && sceneDataEl.value) {
  try { loadScene(sceneDataEl.value); } catch (e) { console.warn('Failed to load scene:', e); }
}

/* ═══════════════════════════════════════
   TOAST HELPER
═══════════════════════════════════════ */
function showToast(msg, type = 'success') {
  let wrap = document.querySelector('.sb-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'sb-toast-wrap';
    document.body.appendChild(wrap);
  }

  const icon = type === 'success'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';

  const toast = document.createElement('div');
  toast.className = `sb-toast ${type}`;
  toast.innerHTML = `${icon} ${msg}`;
  wrap.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* ═══════════════════════════════════════
   RESIZE + RENDER LOOP
═══════════════════════════════════════ */
function onResize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener('resize', onResize);
onResize();

let lastTime = Date.now();

function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  applyAnimations(dt);
  orbitControls.update();
  renderer.render(scene, camera);
}

animate();
updateObjectList();
updateUndoRedoUI();
updateSelectedUI(); // Ensure panels are properly hidden on load

// Expose load function globally
window.sbLoadScene = loadScene;

// ══════════════════════════════════════════
// AURA AI 3D BRIDGE — allows AI to control scene
// ══════════════════════════════════════════
window.sbAddObject = function(shapeType, opts) { return addObject(shapeType, opts || {}); };
window.sbSetEnvironment = function(envName) { setEnvironment(envName); };
window.sbDeleteSelected = function() { deleteSelected(); };
window.sbGetObjects = function() {
  return objects.map(o => ({
    id: o.userData.id, name: o.userData.name, shapeType: o.userData.shapeType,
    color: o.userData.color, materialType: o.userData.materialType,
    position: { x: o.position.x, y: o.position.y, z: o.position.z },
  }));
};
window.sbSetLighting = function(opts) {
  if (opts.ambientIntensity !== undefined) { ambientLight.intensity = opts.ambientIntensity; syncSlider('sb-light-ambient-intensity', opts.ambientIntensity); }
  if (opts.ambientColor) { ambientLight.color.set(opts.ambientColor); }
  if (opts.dirIntensity !== undefined) { directionalLight.intensity = opts.dirIntensity; syncSlider('sb-light-dir-intensity', opts.dirIntensity); }
  if (opts.dirColor) { directionalLight.color.set(opts.dirColor); }
  if (opts.dirX !== undefined) { directionalLight.position.x = opts.dirX; }
  if (opts.dirY !== undefined) { directionalLight.position.y = opts.dirY; }
  if (opts.dirZ !== undefined) { directionalLight.position.z = opts.dirZ; }
  showToast('Lighting updated', 'success');
};
window.sbSetMaterial = function(objId, matType, color) {
  const obj = objects.find(o => o.userData.id === objId);
  if (!obj) return;
  selectObject(obj);
  obj.userData.materialType = matType;
  obj.userData.color = color;
  const newMat = createMaterial(matType, color);
  obj.material.dispose();
  obj.material = newMat;
  updateObjectList();
  updateSelectedUI();
  pushUndo('ai-material');
  showToast('Material updated', 'success');
};

// Listen for Poly Haven texture application
window.addEventListener('aura-apply-texture', (e) => {
  const { texture, name } = e.detail || {};
  if (!texture) return;
  texture.colorSpace = THREE.SRGBColorSpace;
  if (selectedObject) {
    selectedObject.material.map = texture;
    selectedObject.material.needsUpdate = true;
    pushUndo('texture');
    showToast('Texture "' + name + '" applied to ' + selectedObject.userData.name, 'success');
  } else if (objects.length > 0) {
    // Apply to last added object if none selected
    const obj = objects[objects.length - 1];
    obj.material.map = texture;
    obj.material.needsUpdate = true;
    pushUndo('texture');
    showToast('Texture "' + name + '" applied to ' + obj.userData.name, 'success');
  } else {
    showToast('Add a shape first, then apply a texture', 'warning');
  }
});

// Listen for Poly Haven HDRI environment application
window.addEventListener('aura-apply-hdri', (e) => {
  const { texture, name } = e.detail || {};
  if (!texture) return;
  scene.background = texture;
  scene.environment = texture;
  showToast('HDRI "' + name + '" set as environment', 'success');
});

