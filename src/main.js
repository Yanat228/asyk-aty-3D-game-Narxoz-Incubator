import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  restoreSession, register, login, logout, getCurrentUser, isLoggedIn,
  loadProgress, saveProgressCloud, pushResult, getHistory, getRecords
} from './auth.js';
import { isCloudEnabled } from './config.js';

// ─────────────────────────────────────────────
// CONFIG & LEVELS
// ─────────────────────────────────────────────
const LEVELS = [
  {
    id: 1,
    name: 'Первый бросок',
    target: 2,
    attempts: 1,
    asyks: [
      { x: 0, z: -2.2 },
      { x: 0.7, z: -2.5 },
      { x: -0.7, z: -2.5 }
    ]
  },
  {
    id: 2,
    name: 'Линия',
    target: 3,
    attempts: 2,
    asyks: [
      { x: -1.2, z: -2.4 },
      { x: -0.4, z: -2.4 },
      { x: 0.4, z: -2.4 },
      { x: 1.2, z: -2.4 }
    ]
  },
  {
    id: 3,
    name: 'Треугольник',
    target: 3,
    attempts: 2,
    asyks: [
      { x: 0, z: -1.8 },
      { x: -0.8, z: -2.6 },
      { x: 0.8, z: -2.6 },
      { x: 0, z: -3.2 }
    ]
  },
  {
    id: 4,
    name: 'Квадрат',
    target: 4,
    attempts: 2,
    asyks: [
      { x: -0.9, z: -2.0 },
      { x: 0.9, z: -2.0 },
      { x: -0.9, z: -3.0 },
      { x: 0.9, z: -3.0 },
      { x: 0, z: -2.5 }
    ]
  },
  {
    id: 5,
    name: 'Круг',
    target: 5,
    attempts: 3,
    asyks: (() => {
      const arr = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        arr.push({ x: Math.cos(a) * 1.1, z: -2.5 + Math.sin(a) * 1.1 });
      }
      return arr;
    })()
  },
  {
    id: 6,
    name: 'Мастер',
    target: 6,
    attempts: 3,
    asyks: [
      { x: 0, z: -1.6 },
      { x: -1.4, z: -2.3 },
      { x: 1.4, z: -2.3 },
      { x: -0.7, z: -2.9 },
      { x: 0.7, z: -2.9 },
      { x: 0, z: -3.5 },
      { x: -1.1, z: -3.6 },
      { x: 1.1, z: -3.6 }
    ]
  },
  // ── Усложнённые уровни с препятствиями ──
  {
    id: 7,
    name: 'Столб',
    target: 3,
    attempts: 2,
    asyks: [
      { x: -1.0, z: -2.2 },
      { x: 1.0, z: -2.2 },
      { x: 0, z: -3.0 },
      { x: -1.2, z: -3.2 },
      { x: 1.2, z: -3.2 }
    ],
    obstacles: [
      { type: 'box', x: 0, z: -1.4, w: 0.35, d: 1.2, rot: 0 } // барьер перед группой
    ]
  },
  {
    id: 8,
    name: 'Ворота',
    target: 4,
    attempts: 2,
    asyks: [
      { x: -0.9, z: -2.6 },
      { x: 0.9, z: -2.6 },
      { x: 0, z: -2.0 },
      { x: -1.3, z: -3.3 },
      { x: 1.3, z: -3.3 },
      { x: 0, z: -3.5 }
    ],
    obstacles: [
      { type: 'box', x: -1.1, z: -1.5, w: 0.3, d: 1.0, rot: 0.15 },
      { type: 'box', x: 1.1, z: -1.5, w: 0.3, d: 1.0, rot: -0.15 }
    ]
  },
  {
    id: 9,
    name: 'Лабиринт',
    target: 3,
    attempts: 3,
    // плотная кучка + проход по центру
    asyks: [
      { x: 0, z: -2.2 },
      { x: -0.55, z: -2.5 },
      { x: 0.55, z: -2.5 },
      { x: 0, z: -2.9 },
      { x: -0.5, z: -3.2 },
      { x: 0.5, z: -3.2 }
    ],
    obstacles: [
      // боковые стенки, центр открыт
      { type: 'box', x: -1.7, z: -1.8, w: 0.28, d: 1.4, rot: 0 },
      { type: 'box', x: 1.7, z: -1.8, w: 0.28, d: 1.4, rot: 0 },
      { type: 'cylinder', x: -1.2, z: -1.2, r: 0.28 }
    ]
  },
  {
    id: 10,
    name: 'Крепость',
    target: 4,
    attempts: 3,
    asyks: [
      { x: 0, z: -2.0 },
      { x: -0.6, z: -2.4 },
      { x: 0.6, z: -2.4 },
      { x: -0.3, z: -2.8 },
      { x: 0.3, z: -2.8 },
      { x: 0, z: -3.2 }
    ],
    obstacles: [
      // узкий проход по центру, стены по бокам
      { type: 'box', x: -1.5, z: -1.5, w: 1.0, d: 0.26, rot: 0 },
      { type: 'box', x: 1.5, z: -1.5, w: 1.0, d: 0.26, rot: 0 },
      { type: 'cylinder', x: -1.4, z: -2.2, r: 0.26 },
      { type: 'cylinder', x: 1.4, z: -2.2, r: 0.26 }
    ]
  },
  {
    id: 11,
    name: 'Зигзаг',
    target: 4,
    attempts: 3,
    asyks: [
      { x: 0, z: -2.1 },
      { x: -0.7, z: -2.5 },
      { x: 0.7, z: -2.5 },
      { x: 0, z: -2.9 },
      { x: -0.6, z: -3.3 },
      { x: 0.6, z: -3.3 }
    ],
    obstacles: [
      // два коротких барьера сбоку — центр свободен
      { type: 'box', x: -1.4, z: -1.5, w: 1.1, d: 0.24, rot: 0.25 },
      { type: 'box', x: 1.4, z: -2.2, w: 1.1, d: 0.24, rot: -0.25 }
    ]
  },
  {
    id: 12,
    name: 'Легенда',
    target: 5,
    attempts: 4,
    asyks: [
      { x: 0, z: -1.9 },
      { x: -0.65, z: -2.3 },
      { x: 0.65, z: -2.3 },
      { x: -0.35, z: -2.7 },
      { x: 0.35, z: -2.7 },
      { x: 0, z: -3.1 },
      { x: -0.7, z: -3.4 },
      { x: 0.7, z: -3.4 }
    ],
    obstacles: [
      // лёгкие боковые препятствия, прямая дорога к кучке
      { type: 'box', x: -1.6, z: -1.4, w: 0.9, d: 0.24, rot: 0 },
      { type: 'box', x: 1.6, z: -1.4, w: 0.9, d: 0.24, rot: 0 },
      { type: 'cylinder', x: -1.5, z: -2.5, r: 0.28 },
      { type: 'cylinder', x: 1.5, z: -2.5, r: 0.28 }
    ]
  }
];

const FIELD_RADIUS = 4.2; // golden border
const THROW_SPOTS = [
  { x: 0, z: 3.2 },   // Player 1 — спереди
  { x: 3.4, z: 0.3 }, // Player 2 — сбоку
];
let SAQA_START = { ...THROW_SPOTS[0] };
const SCALE = 40; // matter.js scale factor (pixels)

// ── Multiplayer state ──
let gameMode = 1; // 1 or 2
let playerNames = ['Игрок 1', 'Игрок 2'];
let currentPlayer = 0; // 0 or 1
let playerScores = [0, 0];
let playerStars = [0, 0];
let twoPlayerRound = false;
let roundsPlayed = [0, 0]; // completed rounds per player

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let currentLevel = 0;
let score = 0;
let attemptsLeft = 0;
let scoredIds = new Set();
let stars = {};
let unlocked = [1];
let firstTime = true;
let coins = 20; // тиын
let gems = 0; // тенге/донат
let ownedSkins = ['classic'];
let activeSkin = 'classic';
let isAiming = false;
let aimStart = null;
let power = 0;
let powerMeter = 0;       // 0..1 oscillating value
let powerDir = 1;         // direction of meter travel
let aimDirX = 0;
let aimDirZ = -1;         // default forward
const POWER_SPEED = 1.55; // visible sweep speed
let saqaBody = null;
let asykBodies = [];
let asykMeshes = [];
let obstacleBodies = [];
let obstacleMeshes = [];
let debrisPieces = []; // осколки препятствий
let saqaMesh = null;
let thrown = false;
let resultPending = false;
let uiSession = 0; // инкремент при уходе в меню — отменяет мем/таймеры
let alshyClaimPending = null; // callback после 1p alshy minigame

let hintTimer = null;
let aimLine = null;

// Скины сақа
// Скины — только вид. Цена в 💎 тенге (донат), не в тиын
const SKINS = [
  { id: 'classic', name: 'Классика', color: 0xffd700, emissive: 0x5a3a00, price: 0, tag: 'Бесплатно' },
  { id: 'emerald', name: 'Изумруд', color: 0x10b981, emissive: 0x064e3b, price: 150, tag: 'Скин' },
  { id: 'aurora', name: 'Аврора', color: 0xa78bfa, emissive: 0x5b21b6, price: 300, tag: 'Донат' },
  { id: 'flame', name: 'Жалын', color: 0xf97316, emissive: 0x9a3412, price: 300, tag: 'Донат' },
];

// Прокачка (как Traffic Rider) — за тиын
const UPGRADE_DEFS = [
  { id: 'force', name: 'Сила удара', desc: 'Сақа бьёт мощнее', max: 5, baseCost: 25 },
  { id: 'precision', name: 'Точность', desc: 'Ползунок силы медленнее', max: 5, baseCost: 30 },
  { id: 'strength', name: 'Прочность', desc: 'Ломает препятствия (с 1 ур.)', max: 5, baseCost: 40 },
  { id: 'size', name: 'Размер', desc: 'Крупнее сақа — проще попадать', max: 5, baseCost: 35 },
];

function defaultUpgrades() {
  return { force: 0, precision: 0, strength: 0, size: 0 };
}
function loadUpgrades() {
  return defaultUpgrades();
}
let upgrades = defaultUpgrades();

function upgradeCost(def) {
  const lvl = upgrades[def.id] || 0;
  return Math.floor(def.baseCost * Math.pow(1.55, lvl));
}

function getPlayStats() {
  const f = upgrades.force || 0;
  const p = upgrades.precision || 0;
  const s = upgrades.strength || 0;
  const sz = upgrades.size || 0;
  // размер: 0 = компактный, дальше растёт
  const sizeMul = 0.82 + sz * 0.1;
  return {
    forceMul: 1 + f * 0.07,
    powerSpeedMul: Math.max(0.45, 1 - p * 0.1),
    canBreak: s >= 1,
    breakSpeedMin: Math.max(1.2, 3.2 - s * 0.4),
    frictionAirMul: 1,
    restitutionMul: 1,
    densityMul: 1 + f * 0.08,
    sizeMul,
    radius: 0.42 * sizeMul,
  };
}


// ─────────────────────────────────────────────
// THREE.JS SETUP
// ─────────────────────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
// Дневная степь
scene.background = new THREE.Color(0x87b8e0);
scene.fog = new THREE.Fog(0xb8d4e8, 22, 45);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
const CAM_HOME = new THREE.Vector3(0, 11, 7.5);
const CAM_LOOK = new THREE.Vector3(0, 0, -0.5);
camera.position.copy(CAM_HOME);
camera.lookAt(CAM_LOOK);

const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableZoom = false;
controls.enableRotate = false;
controls.target.copy(CAM_LOOK);

// Follow-cam state
let camMode = 'home'; // 'home' | 'follow' | 'return'
const camTargetPos = new THREE.Vector3().copy(CAM_HOME);
const camTargetLook = new THREE.Vector3().copy(CAM_LOOK);

/** Камера с стороны текущего игрока */
function updateHomeCamera(playerIdx) {
  const spot = THROW_SPOTS[playerIdx % THROW_SPOTS.length];
  // позиция камеры: сзади-сверху от точки броска, смотрит в центр поля
  const len = Math.hypot(spot.x, spot.z) || 1;
  const backX = spot.x / len;
  const backZ = spot.z / len;
  CAM_HOME.set(
    spot.x + backX * 5.5,
    10.5,
    spot.z + backZ * 5.5
  );
  CAM_LOOK.set(0, 0.2, -0.3);
  camTargetPos.copy(CAM_HOME);
  camTargetLook.copy(CAM_LOOK);
  camMode = 'return';
}

// Lights — ясный день
const hemi = new THREE.HemisphereLight(0xfff5e0, 0x4a7c3a, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff8e7, 1.5);
sun.position.set(6, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
sun.shadow.bias = -0.0005;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xa0c4ff, 0.3);
fill.position.set(-5, 8, -3);
scene.add(fill);
const fireLight = new THREE.PointLight(0xff8a40, 0.55, 12, 1.5);
fireLight.position.set(-8, 1.2, -6);
scene.add(fireLight);

// ─────────────────────────────────────────────
// GROUND + ORNAMENTS + GOLDEN BORDER
// ─────────────────────────────────────────────
const grassBlades = [];
const starMeshes = [];
const smokePuffs = [];

function createGround() {
  // Степь — тёмно-зелёная трава
  const grassGeo = new THREE.PlaneGeometry(50, 50, 1, 1);
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4a9c3a,
    roughness: 0.95,
    metalness: 0.0
  });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  grass.receiveShadow = true;
  scene.add(grass);

  // Игровое поле — земля
  const groundGeo = new THREE.CircleGeometry(FIELD_RADIUS + 0.6, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x8B6914,
    roughness: 0.92,
    metalness: 0.02
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.001;
  ground.receiveShadow = true;
  scene.add(ground);

  // Золотая граница
  const borderGeo = new THREE.RingGeometry(FIELD_RADIUS - 0.08, FIELD_RADIUS + 0.1, 64);
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0xDAA520,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x8B6914,
    emissiveIntensity: 0.55
  });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.rotation.x = -Math.PI / 2;
  border.position.y = 0.02;
  scene.add(border);

  const innerGeo = new THREE.CircleGeometry(FIELD_RADIUS - 0.12, 64);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xa67c3a,
    roughness: 0.96
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.008;
  inner.receiveShadow = true;
  scene.add(inner);

  addOrnaments();
  addNightSteppe();
  // Markers for player throw spots
  THROW_SPOTS.forEach((spot, i) => {
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 24),
      new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x3b82f6 : 0xef4444,
        transparent: true, opacity: 0.35, roughness: 0.8
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(spot.x, 0.03, spot.z);
    scene.add(pad);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: i === 0 ? 0x60a5fa : 0xf87171, roughness: 0.5 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(spot.x, 0.035, spot.z);
    scene.add(ring);
  });
}

function addOrnaments() {
  // Simple procedural kazakh-style motifs using shapes
  const motifs = [];
  const colors = [0xc9a227, 0xb8860b, 0xdaa520];

  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const r = FIELD_RADIUS + 0.9 + Math.random() * 0.6;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    const group = new THREE.Group();
    // Horn-like spiral motif
    const curve = new THREE.EllipseCurve(0, 0, 0.35, 0.22, 0, Math.PI * 1.6, false, 0);
    const points = curve.getPoints(24);
    const geo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0.02, p.y)));
    const mat = new THREE.LineBasicMaterial({ color: colors[i % 3], transparent: true, opacity: 0.55 });
    const line = new THREE.Line(geo, mat);
    group.add(line);

    // Small center diamond
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 0.6, roughness: 0.3 })
    );
    diamond.position.y = 0.04;
    group.add(diamond);

    group.position.set(x, 0, z);
    group.rotation.y = angle + Math.PI / 2;
    scene.add(group);
    motifs.push(group);
  }

  // Center small pattern
  const centerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.48, 32),
    new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.7 })
  );
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.y = 0.02;
  scene.add(centerRing);
}

function makeYurt(feltColor) {
  const yurt = new THREE.Group();
  const feltMat = new THREE.MeshStandardMaterial({ color: feltColor, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.8 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 1.8, 12, 1, true), feltMat);
  wall.position.y = 0.9;
  wall.castShadow = true;
  yurt.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.35, 1.45, 12), feltMat);
  roof.position.y = 2.5;
  roof.castShadow = true;
  yurt.add(roof);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.05, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 0.5, roughness: 0.4 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 3.2;
  yurt.add(ring);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.15, 0.08), woodMat);
  door.position.set(0, 0.58, 2.15);
  yurt.add(door);
  return yurt;
}

function makeHouse(wallColor, roofColor) {
  const h = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.0), wallMat);
  body.position.y = 0.8;
  body.castShadow = true;
  h.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.1, 4), roofMat);
  roof.position.y = 2.15;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  h.add(roof);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.9, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.9 })
  );
  door.position.set(0, 0.45, 1.02);
  h.add(door);
  return h;
}

function addNightSteppe() {
  // --- Аул: юрты и домики вокруг (лёгкая геометрия) ---
  const yurtSpots = [
    { x: -9, z: -7, s: 0.85, c: 0xc4a882, rot: 0.4 },
    { x: 10, z: -6, s: 0.7, c: 0xd4b896, rot: -0.8 },
    { x: -11, z: 4, s: 0.65, c: 0xbba07a, rot: 1.2 },
    { x: 8, z: 8, s: 0.75, c: 0xc9ad88, rot: -2.0 },
  ];
  yurtSpots.forEach(sp => {
    const y = makeYurt(sp.c);
    y.position.set(sp.x, 0, sp.z);
    y.scale.setScalar(sp.s);
    y.rotation.y = sp.rot;
    scene.add(y);
  });

  const houseSpots = [
    { x: -12, z: -2, s: 0.9, w: 0xe8d5b5, r: 0x8b4513, rot: 0.3 },
    { x: 11, z: 2, s: 0.85, w: 0xf0e0c8, r: 0x6b3a1f, rot: -0.5 },
    { x: 3, z: -11, s: 0.7, w: 0xdcc8a8, r: 0xa0522d, rot: 1.0 },
  ];
  houseSpots.forEach(sp => {
    const h = makeHouse(sp.w, sp.r);
    h.position.set(sp.x, 0, sp.z);
    h.scale.setScalar(sp.s);
    h.rotation.y = sp.rot;
    scene.add(h);
  });

  // главная юрта у костра (для совместимости с fireLight)
  // костёр остаётся у первой юрты

  // --- Костёр ---
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6), logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 4) * Math.PI;
    log.position.set(-8 + Math.cos(i) * 0.15, 0.08, -6 + Math.sin(i) * 0.15);
    scene.add(log);
  }
  // пламя
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.85 });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 6), flameMat);
  flame.position.set(-8, 0.5, -6);
  flame.userData.baseY = 0.5;
  scene.add(flame);
  smokePuffs.push(flame); // reuse array for flame bob

  // дым
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.25 });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.15, 6, 5), smokeMat.clone());
    s.position.set(-8 + (Math.random() - 0.5) * 0.3, 1.2 + i * 0.4, -6);
    s.userData.phase = Math.random() * Math.PI * 2;
    s.userData.speed = 0.008 + Math.random() * 0.006;
    scene.add(s);
    smokePuffs.push(s);
  }

  // --- Качающаяся трава ---
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x3d8a35, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 20; i++) {
    const h = 0.3 + Math.random() * 0.5;
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.04, h), bladeMat);
    const a = Math.random() * Math.PI * 2;
    const r = FIELD_RADIUS + 1.2 + Math.random() * 12;
    blade.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    blade.userData.phase = Math.random() * Math.PI * 2;
    blade.userData.amp = 0.08 + Math.random() * 0.12;
    scene.add(blade);
    grassBlades.push(blade);
  }

  // --- Звёзды ---
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
  for (let i = 0; i < 8; i++) { // barely visible day haze
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 4, 4), starMat);
    star.position.set(
      (Math.random() - 0.5) * 40,
      8 + Math.random() * 12,
      -15 - Math.random() * 20
    );
    star.userData.twinkle = Math.random() * Math.PI * 2;
    scene.add(star);
    starMeshes.push(star);
  }

  // --- Солнце ---
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe566 })
  );
  sunMesh.position.set(14, 16, -18);
  scene.add(sunMesh);
  // glow
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.2 })
  );
  sunGlow.position.copy(sunMesh.position);
  scene.add(sunGlow);

  // --- Облака ---
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9
  });
  for (let i = 0; i < 7; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 5; j++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 + Math.random() * 0.55, 8, 6),
        cloudMat
      );
      puff.position.set(j * 0.65 - 1.2, Math.random() * 0.35, (Math.random() - 0.5) * 0.9);
      cloud.add(puff);
    }
    cloud.position.set(-14 + i * 5.5, 9 + Math.random() * 3, -10 - Math.random() * 8);
    cloud.userData.speed = 0.004 + Math.random() * 0.006;
    cloud.userData.bob = Math.random() * Math.PI * 2;
    scene.add(cloud);
    starMeshes.push(cloud); // reuse for cloud animation
  }

  // --- Бабочки ---
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xff66aa, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 3; i++) {
    const bug = new THREE.Group();
    const w1 = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), wingMat.clone());
    const w2 = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), wingMat.clone());
    w1.position.x = -0.08; w2.position.x = 0.08;
    bug.add(w1, w2);
    bug.userData.w1 = w1; bug.userData.w2 = w2;
    bug.userData.phase = Math.random() * Math.PI * 2;
    bug.userData.speed = 0.4 + Math.random() * 0.5;
    bug.userData.radius = 3 + Math.random() * 5;
    bug.userData.baseY = 0.8 + Math.random() * 1.5;
    const a = Math.random() * Math.PI * 2;
    bug.position.set(Math.cos(a) * 5, bug.userData.baseY, Math.sin(a) * 5 - 1);
    scene.add(bug);
    smokePuffs.push(bug); // tag butterflies with wing data
  }

  // --- Холмы на горизонте ---
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x3a6a32, roughness: 1 });
  for (let i = 0; i < 5; i++) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 3, 12, 8), hillMat);
    hill.scale.y = 0.35;
    hill.position.set(-15 + i * 8, -1, -16 - Math.random() * 4);
    scene.add(hill);
  }
}

// ─────────────────────────────────────────────
// ASYK 3D MODEL (GLB)
// ─────────────────────────────────────────────
let asykTemplate = null; // loaded GLB scene root
let asykReady = false;

function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

function loadAsykModel() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      'assets/asyk.glb',
      (gltf) => {
        asykTemplate = gltf.scene;
        // Normalize: center, scale, enable shadows
        const box = new THREE.Box3().setFromObject(asykTemplate);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = 0.55; // world units
        const s = targetSize / maxDim;
        asykTemplate.scale.setScalar(s);
        box.setFromObject(asykTemplate);
        const center = new THREE.Vector3();
        box.getCenter(center);
        asykTemplate.position.sub(center); // center at origin
        // Lift so it sits on ground
        box.setFromObject(asykTemplate);
        asykTemplate.position.y -= box.min.y;

        asykTemplate.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material = child.material.clone();
              child.material.roughness = Math.min(child.material.roughness ?? 0.5, 0.55);
            }
          }
        });
        asykReady = true;
        console.log('Asyk GLB loaded, size:', size);
        resolve();
      },
      undefined,
      (err) => {
        console.error('GLB load failed', err);
        reject(err);
      }
    );
  });
}

function createAsykMesh(isSaqa = false) {
  if (!asykTemplate) {
    // Fallback simple shape if model not loaded yet
    const geo = new THREE.SphereGeometry(isSaqa ? 0.28 : 0.22, 12, 10);
    const mat = new THREE.MeshStandardMaterial({ color: isSaqa ? 0xffd700 : 0xf5c542 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  const root = asykTemplate.clone(true);
  const scaleMul = isSaqa ? 1.25 : 0.95;
  root.scale.multiplyScalar(scaleMul);

  // Color variants
  const skin = isSaqa ? getSkin(activeSkin) : null;
  const tint = isSaqa
    ? (activeSkin === 'classic' ? null : skin.color)
    : 0xe8b84a; // slightly different warm tone for targets

  root.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
      if (tint !== null) {
        // Multiply existing color with tint for variety
        if (child.material.color) {
          child.material.color.multiply(new THREE.Color(tint));
        } else {
          child.material.color = new THREE.Color(tint);
        }
        if (isSaqa && skin && activeSkin !== 'classic') {
          child.material.emissive = new THREE.Color(skin.emissive);
          child.material.emissiveIntensity = 0.15;
          child.material.metalness = 0.35;
        }
      } else if (!isSaqa) {
        // Target asyks: slightly more matte bone look
        child.material.color = new THREE.Color(0xf0d080);
        child.material.roughness = 0.55;
      }
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Wrap in group for easy position/rotation control
  const group = new THREE.Group();
  group.add(root);
  group.userData.isSaqa = isSaqa;
  return group;
}

// ─────────────────────────────────────────────
// MATTER.JS PHYSICS (2D top-down)
// ─────────────────────────────────────────────
const { Engine, World, Bodies, Body, Events, Query } = Matter;

const engine = Engine.create({ gravity: { x: 0, y: 0 } }); // top-down, no gravity
const world = engine.world;

// Walls for field (soft boundary)
function createPhysicsBounds() {
  // Внешний барьер: асыки могут выйти за золотую линию (очки), но не улетают далеко
  const outerR = (FIELD_RADIUS + 3.4) * SCALE;
  const segments = 24;
  const wallThick = 0.45 * SCALE;
  const wallH = 1.2 * SCALE;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 0.5) / segments) * Math.PI * 2;
    const mx = Math.cos(a1) * outerR;
    const my = Math.sin(a1) * outerR;
    const wall = Bodies.rectangle(mx, my, wallThick, wallH, {
      isStatic: true,
      friction: 0.3,
      restitution: 0.35,
      angle: a1,
      label: 'outer_wall'
    });
    World.add(world, wall);
  }

  // Визуальное мягкое кольцо (чтобы было видно границу стола)
  const ringGeo = new THREE.RingGeometry(FIELD_RADIUS + 3.2, FIELD_RADIUS + 3.55, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x5c4030,
    roughness: 0.9,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);
}

function matterToThree(body) {
  return {
    x: body.position.x / SCALE,
    z: body.position.y / SCALE // matter Y → three Z
  };
}

function threeToMatter(x, z) {
  return { x: x * SCALE, y: z * SCALE };
}

// ─────────────────────────────────────────────
// GAME LOGIC
// ─────────────────────────────────────────────
function clearLevel() {
  asykBodies.forEach(b => World.remove(world, b));
  if (saqaBody) World.remove(world, saqaBody);
  obstacleBodies.forEach(b => World.remove(world, b));
  asykBodies = [];
  obstacleBodies = [];
  scoredIds.clear();

  asykMeshes.forEach(m => scene.remove(m));
  obstacleMeshes.forEach(m => scene.remove(m));
  debrisPieces.forEach(m => scene.remove(m));
  if (saqaMesh) scene.remove(saqaMesh);
  asykMeshes = [];
  obstacleMeshes = [];
  debrisPieces = [];
  saqaMesh = null;
  saqaBody = null;
}


/** Повернуть позицию асыка так, чтобы группа лежала напротив точки броска игрока.
 *  В уровнях расстановка задана «для игрока с +Z» (асыки в сторону −Z).
 */
function orientAsykForPlayer(x, z, playerIdx) {
  const spot = THROW_SPOTS[playerIdx % THROW_SPOTS.length];
  const len = Math.hypot(spot.x, spot.z) || 1;
  // направление от игрока к центру (куда смотрит бросок)
  const fx = -spot.x / len;
  const fz = -spot.z / len;
  // угол поворота из дефолтного «вперёд = −Z» (0, -1) в (fx, fz)
  const cosT = -fz; // cosθ
  const sinT = fx;  // sinθ
  return {
    x: x * cosT - z * sinT,
    z: x * sinT + z * cosT
  };
}


function orientObstacleForPlayer(obs, playerIdx) {
  const p = orientAsykForPlayer(obs.x, obs.z, playerIdx);
  // rotate obstacle facing with same frame (approx rot += player angle)
  const spot = THROW_SPOTS[playerIdx % THROW_SPOTS.length];
  const len = Math.hypot(spot.x, spot.z) || 1;
  const fx = -spot.x / len;
  const fz = -spot.z / len;
  const baseAngle = Math.atan2(fx, -fz); // same as asyk orient
  return { ...obs, x: p.x, z: p.z, rot: (obs.rot || 0) + baseAngle };
}

function spawnObstacles(list) {
  if (!list || !list.length) return;
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6b4423, roughness: 0.75, metalness: 0.1
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x8a8a8a, roughness: 0.85, metalness: 0.05
  });

  list.forEach((raw) => {
    const obs = orientObstacleForPlayer(raw, currentPlayer);
    if (obs.type === 'cylinder') {
      const r = obs.r || 0.3;
      const mPos = threeToMatter(obs.x, obs.z);
      const body = Bodies.circle(mPos.x, mPos.y, r * SCALE, {
        isStatic: true,
        friction: 0.4,
        label: 'obstacle',
        plugin: {}
      });
      World.add(world, body);
      obstacleBodies.push(body);

      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, 0.55, 12),
        stoneMat.clone()
      );
      mesh.position.set(obs.x, 0.28, obs.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      obstacleMeshes.push(mesh);
      body._mesh = mesh;
      body._obsType = 'cylinder';
      body._obsSize = { r };
      body._broken = false;
    } else {
      // box
      const w = obs.w || 0.4;
      const d = obs.d || 0.4;
      const rot = obs.rot || 0;
      const mPos = threeToMatter(obs.x, obs.z);
      const body = Bodies.rectangle(mPos.x, mPos.y, w * SCALE, d * SCALE, {
        isStatic: true,
        friction: 0.4,
        angle: rot,
        label: 'obstacle'
      });
      World.add(world, body);
      obstacleBodies.push(body);

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.5, d),
        woodMat.clone()
      );
      mesh.position.set(obs.x, 0.25, obs.z);
      mesh.rotation.y = -rot;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      obstacleMeshes.push(mesh);
      body._mesh = mesh;
      body._obsType = 'box';
      body._obsSize = { w, d };
      body._broken = false;
    }
  });
}

function spawnLevel(levelIndex) {
  clearLevel();
  const lvl = LEVELS[levelIndex];
  currentLevel = levelIndex;
  score = 0;
  attemptsLeft = lvl.attempts;
  thrown = false;
  resultPending = false;
  scoredIds.clear();
  camMode = 'return';
  setIngameBtns(true);
  setThrowSpot(currentPlayer);
  showTurnBanner();

  document.getElementById('lvl-num').textContent = lvl.id;
  document.getElementById('score').textContent = '0';
  document.getElementById('target').textContent = lvl.target;
  document.getElementById('attempts').textContent = attemptsLeft;

  // Spawn asyks — расстановка повернута напротив текущего игрока
  lvl.asyks.forEach((pos, i) => {
    const op = orientAsykForPlayer(pos.x, pos.z, currentPlayer);
    const mPos = threeToMatter(op.x, op.z);
    const body = Bodies.circle(mPos.x, mPos.y, 0.32 * SCALE, {
      friction: 0.05,
      frictionAir: 0.018,
      restitution: 0.68,
      density: 0.0016,
      label: `asyk_${i}`
    });
    body._scored = false;
    body._meshIndex = i;
    World.add(world, body);
    asykBodies.push(body);

    const mesh = createAsykMesh(false);
    mesh.position.set(op.x, 0.12, op.z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);
    asykMeshes.push(mesh);
  });

  // Obstacles on table
  spawnObstacles(lvl.obstacles);

  // Spawn saqa
  resetSaqa();
}

function resetSaqa() {
  if (saqaBody) World.remove(world, saqaBody);
  if (saqaMesh) scene.remove(saqaMesh);

  const mPos = threeToMatter(SAQA_START.x, SAQA_START.z);
  const st = getPlayStats();
  saqaBody = Bodies.circle(mPos.x, mPos.y, st.radius * SCALE, {
    friction: 0.03,
    frictionAir: 0.008,
    restitution: 0.5,
    density: 0.008 * st.densityMul,
    frictionStatic: 0.05,
    label: 'saqa'
  });
  World.add(world, saqaBody);

  saqaMesh = createAsykMesh(true);
  saqaMesh.scale.setScalar(st.sizeMul);
  saqaMesh.position.set(SAQA_START.x, 0.12 * st.sizeMul, SAQA_START.z);
  scene.add(saqaMesh);
  thrown = false;
}

function checkScored() {
  asykBodies.forEach((body, i) => {
    if (body._scored) return;
    const pos = matterToThree(body);
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (dist > FIELD_RADIUS + 0.15) {
      body._scored = true;
      scoredIds.add(body.id);
      score++;
      document.getElementById('score').textContent = score;
      // Visual feedback – glow green (works for Group with child meshes)
      if (asykMeshes[i]) {
        asykMeshes[i].traverse((c) => {
          if (c.isMesh && c.material) {
            c.material.emissive = new THREE.Color(0x22c55e);
            c.material.emissiveIntensity = 0.85;
          }
        });
      }
      // Small pop sound per asyk
      playPop(0.08);
    }
  });
}


function shatterObstacle(body, impactVel) {
  if (!body || body._broken) return;
  body._broken = true;
  const mesh = body._mesh;
  if (!mesh) return;

  const pos = mesh.position.clone();
  const col = mesh.material.color ? mesh.material.color.getHex() : 0x6b4423;
  scene.remove(mesh);
  const mi = obstacleMeshes.indexOf(mesh);
  if (mi >= 0) obstacleMeshes.splice(mi, 1);

  // remove static body
  World.remove(world, body);
  const bi = obstacleBodies.indexOf(body);
  if (bi >= 0) obstacleBodies.splice(bi, 1);

  // 3D осколки
  const n = body._obsType === 'cylinder' ? 10 : 12;
  const speed = Math.min(0.35, 0.12 + Math.hypot(impactVel.x, impactVel.y) / SCALE * 0.08);
  for (let i = 0; i < n; i++) {
    const size = 0.08 + Math.random() * 0.14;
    const geo = Math.random() > 0.5
      ? new THREE.BoxGeometry(size, size * 0.7, size * 0.9)
      : new THREE.TetrahedronGeometry(size * 0.7, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.8,
      metalness: 0.05,
      emissive: 0x3a2000,
      emissiveIntensity: 0.15
    });
    const piece = new THREE.Mesh(geo, mat);
    piece.position.set(
      pos.x + (Math.random() - 0.5) * 0.3,
      pos.y + Math.random() * 0.2,
      pos.z + (Math.random() - 0.5) * 0.3
    );
    piece.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    piece.castShadow = true;
    const ang = Math.random() * Math.PI * 2;
    piece.userData.vx = Math.cos(ang) * speed * (0.6 + Math.random());
    piece.userData.vy = 0.08 + Math.random() * 0.18;
    piece.userData.vz = Math.sin(ang) * speed * (0.6 + Math.random());
    piece.userData.rx = (Math.random() - 0.5) * 0.25;
    piece.userData.ry = (Math.random() - 0.5) * 0.25;
    piece.userData.rz = (Math.random() - 0.5) * 0.25;
    piece.userData.life = 1.2 + Math.random() * 0.8;
    scene.add(piece);
    debrisPieces.push(piece);
  }
  playPop(0.2);
}

function checkRubyBreaks() {
  const st = getPlayStats();
  if (!st.canBreak || !saqaBody || !thrown) return;
  const sx = saqaBody.position.x;
  const sy = saqaBody.position.y;
  const speed = Math.hypot(saqaBody.velocity.x, saqaBody.velocity.y);
  if (speed < st.breakSpeedMin) return;

  for (let i = obstacleBodies.length - 1; i >= 0; i--) {
    const ob = obstacleBodies[i];
    if (ob._broken) continue;
    const dx = ob.position.x - sx;
    const dy = ob.position.y - sy;
    const dist = Math.hypot(dx, dy);
    // порог касания: радиус сақа + половина препятствия
    const hitR = getPlayStats().radius * SCALE + (ob._obsType === 'cylinder'
      ? (ob._obsSize.r || 0.3) * SCALE
      : Math.max(ob._obsSize.w || 0.3, ob._obsSize.d || 0.3) * SCALE * 0.55);
    if (dist < hitR * 1.15) {
      shatterObstacle(ob, saqaBody.velocity);
    }
  }
}


function showAlshyPopup(msg) {
  const el = document.getElementById('alshy-popup');
  if (!el) return;
  const inner = el.querySelector('.alshy-popup-inner');
  if (inner) inner.textContent = msg || 'АЛШЫ! +10 тиын';
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1800);
}

/** 1P: после броска — медленный ползунок, попади в АЛШЫ за +10 тиын */
function startAlshyClaim(onDone) {
  alshyClaimPending = onDone;
  alshyDuel.active = true;
  alshyDuel.mode = 'claim'; // 1p claim vs 2p duel
  alshyDuel.turn = 0;
  alshyDuel.pos = Math.random() * 0.3;
  alshyDuel.dir = 1;
  alshyDuel.zoneStart = 0.40;
  alshyDuel.zoneEnd = 0.60;
  const title = document.querySelector('#alshy-duel-screen h1');
  if (title) title.textContent = 'АЛШЫ!';
  const textEl = document.getElementById('alshy-duel-text');
  if (textEl) textEl.innerHTML = 'Попади в зелёную зону — забери <b>+10 тиын</b>';
  const pl = document.getElementById('alshy-duel-player');
  if (pl) pl.textContent = 'Не торопись — ползунок медленный';
  const res = document.getElementById('alshy-duel-result');
  if (res) res.textContent = '';
  showScreen('alshy-duel-screen');
  runAlshyNeedle(0.012); // медленнее чем 2p (0.028)
}

function finishAlshyClaim(hit) {
  alshyDuel.active = false;
  cancelAnimationFrame(alshyDuel.raf);
  if (hit) {
    coins += 10;
    persistAll();
    showAlshyPopup('АЛШЫ! +10 тиын');
    showHint('+10 тиын 🪙');
    playSfx('win');
  } else {
    showHint('Мимо — тиын не начислены');
    playSfx('click');
  }
  const cb = alshyClaimPending;
  alshyClaimPending = null;
  // чуть пауза и продолжаем раунд
  setTimeout(() => {
    if (typeof cb === 'function') cb();
  }, hit ? 900 : 400);
}


function endThrow() {
  if (resultPending) return;
  attemptsLeft--;
  document.getElementById('attempts').textContent = attemptsLeft;

  setTimeout(() => {
    checkScored();
    const sess = uiSession;

    const finishThrowLogic = () => {
    if (sess !== uiSession) return;
    if (saqaMesh) saqaMesh.userData.alshyHold = false;
    if (practiceMode) {
      // обучение: выбил всех / цель — двигаем шаги дальше
      const allGone = asykBodies.every(b => b._scored) || score >= 1;
      if (allGone || attemptsLeft <= 0) {
        practiceWait = null;
        tutStep = Math.max(tutStep, 3);
        document.getElementById('tut-next').disabled = false;
        updateTut();
        showHint('Отлично! Жми «Дальше» в подсказке справа');
      }
      setTimeout(() => {
        if (sess !== uiSession || !practiceMode) return;
        if (!resultPending && attemptsLeft > 0 && !asykBodies.every(b => b._scored)) resetSaqa();
      }, 400);
      return;
    }
    const lvl = LEVELS[currentLevel];
    // очки = число выбитых асыков (1 асык = 1 очко)
    const totalAsyks = asykBodies.length;
    const goalReached = score >= lvl.target;          // цель набрана (или больше)
    const allCleared = score >= totalAsyks && totalAsyks > 0;
    const noThrowsLeft = attemptsLeft <= 0;

    // Продолжаем только если цель ещё не взята и есть броски
    if (!goalReached && !allCleared && !noThrowsLeft) {
      setTimeout(() => {
        resetSaqa();
        if (score === 0) {
          showHint(Math.random() > 0.5 ? 'Не дотянул — потяни сильнее!' : 'Поправь угол — целься в центр группы');
        }
      }, 450);
      return;
    }

    // Конец уровня: цель набрана / все асыки / броски кончились
    resultPending = true;
    const win = score >= lvl.target;
    const starsEarned = win ? calcStars() : 0;
    if (win) {
      saveProgress(starsEarned);
      spawnConfetti();
      showResult(true, starsEarned);
    } else {
      showResult(false, 0);
    }
    }; // finishThrowLogic

    // 1P: алшы не каждый бросок (~22%)
    if (gameMode === 1 && !practiceMode && Math.random() < 0.22) {
      startAlshyClaim(() => {
        if (sess !== uiSession) return;
        hideAllScreens();
        setIngameBtns(true);
        finishThrowLogic();
      });
    } else {
      finishThrowLogic();
    }
  }, 700);
}

function calcStars() {
  const lvl = LEVELS[currentLevel];
  // Звёзды: прошёл цель + насколько экономно по броскам
  const used = Math.max(1, lvl.attempts - attemptsLeft);
  let s = 0;
  if (score >= lvl.target) {
    s = 1;
    if (used <= Math.max(1, Math.ceil(lvl.attempts * 0.7))) s = 2;
    if (used <= Math.max(1, Math.ceil(lvl.attempts * 0.4))) s = 3;
  }
  return s;
}

function setThrowSpot(playerIdx) {
  SAQA_START = { ...THROW_SPOTS[playerIdx % THROW_SPOTS.length] };
  // aim toward center of field
  const len = Math.hypot(SAQA_START.x, SAQA_START.z) || 1;
  aimDirX = -SAQA_START.x / len;
  aimDirZ = -SAQA_START.z / len;
  updateHomeCamera(playerIdx);
}

function showTurnBanner() {
  const el = document.getElementById('turn-banner');
  if (!el) return;
  if (gameMode !== 2) { el.classList.remove('show'); return; }
  el.textContent = 'Ход: ' + playerNames[currentPlayer];
  el.classList.add('show');
}

function switchPlayer() {
  currentPlayer = currentPlayer === 0 ? 1 : 0;
  setThrowSpot(currentPlayer);
  showTurnBanner();
  showHint('Ход: ' + playerNames[currentPlayer]);
}

function saveProgress(starsEarned) {
  const id = LEVELS[currentLevel].id;
  const prev = stars[id] || 0;
  if (starsEarned > prev) {
    stars[id] = starsEarned;
  }
  if (!unlocked.includes(id + 1) && id < 12) {
    unlocked.push(id + 1);
  }
  persistAll();
}

function persistAll() {
  updateCoinsUI();
  // Гость — ничего не сохраняем
  if (!isLoggedIn()) return;
  // Только профиль этого пользователя (auth.js → per-user)
  saveProgressCloud({
    stars,
    unlocked,
    coins,
    gems,
    skins: ownedSkins,
    activeSkin,
    upgrades: { ...upgrades },
    played: true,
  }).catch(() => {});
}

function resetGuestState() {
  coins = 20;
  gems = 0;
  stars = {};
  unlocked = [1];
  ownedSkins = ['classic'];
  activeSkin = 'classic';
  upgrades = defaultUpgrades();
  firstTime = true;
  updateCoinsUI();
}

function applyUserProgress(prog) {
  if (!prog) {
    resetGuestState();
    return;
  }
  stars = prog.stars || {};
  unlocked = prog.unlocked || [1];
  coins = prog.coins != null ? prog.coins : 20;
  gems = prog.gems != null ? prog.gems : 0;
  ownedSkins = prog.skins && prog.skins.length ? prog.skins : ['classic'];
  activeSkin = prog.activeSkin || 'classic';
  upgrades = { ...defaultUpgrades(), ...(prog.upgrades || {}) };
  firstTime = !prog.played;
  updateCoinsUI();
}

async function recordMatchResult(win, starsEarned) {
  try {
    await pushResult({
      level: LEVELS[currentLevel].id,
      score,
      stars: starsEarned || 0,
      win: Boolean(win),
      mode: gameMode,
      player: gameMode === 2 ? playerNames[currentPlayer] : (getCurrentUser()?.name || 'Гость'),
    });
  } catch (e) {
    console.warn('recordMatchResult', e);
  }
}

function updateCoinsUI() {
  const el1 = document.getElementById('coins-display');
  const el2 = document.getElementById('shop-coins');
  const g1 = document.getElementById('gems-display');
  const g2 = document.getElementById('shop-gems');
  if (el1) el1.textContent = coins;
  if (el2) el2.textContent = coins;
  if (g1) g1.textContent = gems;
  if (g2) g2.textContent = gems;
}

function buildUpgradesPanel() {
  const panel = document.getElementById('upgrades-panel');
  if (!panel) return;
  panel.innerHTML = '';
  updateCoinsUI();
  UPGRADE_DEFS.forEach(def => {
    const lvl = upgrades[def.id] || 0;
    const maxed = lvl >= def.max;
    const cost = upgradeCost(def);
    const row = document.createElement('div');
    row.className = 'upgrade-row';
    row.innerHTML = `
      <div class="info">
        <div class="title">${def.name}</div>
        <div class="desc">${def.desc}</div>
        <div class="lvl">Уровень ${lvl}/${def.max}</div>
      </div>
      <button class="btn ${maxed ? 'secondary' : ''}" type="button">${maxed ? 'Макс' : cost + ' 🪙'}</button>
    `;
    const btn = row.querySelector('button');
    btn.disabled = maxed;
    btn.onclick = () => {
      playSfx('click');
      if (maxed) return;
      if (coins < cost) { showHint('Не хватает тиын. Лови алшы!'); return; }
      coins -= cost;
      upgrades[def.id] = lvl + 1;
      persistAll();
      buildUpgradesPanel();
      showHint(def.name + ' → ур. ' + upgrades[def.id]);
    };
    panel.appendChild(row);
  });
}

function buildShop() {
  buildUpgradesPanel();
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  grid.innerHTML = '';
  updateCoinsUI();
  SKINS.forEach(skin => {
    const owned = ownedSkins.includes(skin.id);
    const active = activeSkin === skin.id;
    const card = document.createElement('div');
    card.className = 'skin-card' + (owned ? ' owned' : '') + (active ? ' active' : '');
    const hex = '#' + skin.color.toString(16).padStart(6, '0');
    card.innerHTML = `
      <div class="skin-preview" style="background:linear-gradient(135deg, ${hex}, #1a0a00);"></div>
      <div class="skin-name">${skin.name}</div>
      <div style="font-size:10px;color:#c4a882;margin:4px 0;">${skin.tag || 'Скин'}</div>
      <div class="skin-price">${owned ? (active ? '✓ Надет' : 'Выбрать') : (skin.price ? skin.price + ' 💎' : 'Бесплатно')}</div>
    `;
    card.onclick = () => {
      playSfx('click');
      if (owned) {
        activeSkin = skin.id;
        persistAll();
        buildShop();
        showHint('Скин «' + skin.name + '»');
      } else if (gems >= skin.price) {
        gems -= skin.price;
        ownedSkins.push(skin.id);
        activeSkin = skin.id;
        persistAll();
        buildShop();
        showHint('Скин куплен за тенге: ' + skin.name);
      } else {
        showHint('Нужны тенге 💎 (донат). Тиын на скины не тратятся');
      }
    };
    grid.appendChild(card);
  });
}


// ─────────────────────────────────────────────
// AIMING (mouse + touch)
// ─────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const intersectPoint = new THREE.Vector3();

function getWorldPoint(clientX, clientY) {
  mouse.x = (clientX / innerWidth) * 2 - 1;
  mouse.y = -(clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, intersectPoint);
  return intersectPoint.clone();
}

function updatePowerUI() {
  const bar = document.getElementById('power-bar');
  const pl = document.getElementById('power-label');
  if (bar) bar.style.width = `${powerMeter * 100}%`;
  if (pl) {
    if (powerMeter < 0.33) pl.textContent = 'Слабый';
    else if (powerMeter < 0.66) pl.textContent = 'Средний';
    else pl.textContent = 'Сильный ⚡';
  }
}

function onPointerDown(e) {
  if (thrown || resultPending) return;
  const clientX = e.clientX ?? e.touches?.[0]?.clientX;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY;
  const pt = getWorldPoint(clientX, clientY);
  if (!pt) return;

  const sx = saqaMesh ? saqaMesh.position.x : SAQA_START.x;
  const sz = saqaMesh ? saqaMesh.position.z : SAQA_START.z;
  const dist = Math.hypot(pt.x - sx, pt.z - sz);
  // большая зона клика вокруг сақа / площадки
  if (dist < 2.5) {
    isAiming = true;
    aimStart = pt;
    powerMeter = 0.02;
    powerDir = 1;
    window.__lastAimT = performance.now();
    const len = Math.hypot(SAQA_START.x, SAQA_START.z) || 1;
    aimDirX = -SAQA_START.x / len;
    aimDirZ = -SAQA_START.z / len;
    const box = document.getElementById('power-bar-container');
    if (box) box.classList.add('show');
    updatePowerUI();
  }
}

function onPointerMove(e) {
  if (!isAiming || !aimStart) return;
  const pt = getWorldPoint(e.clientX || e.touches?.[0]?.clientX, e.clientY || e.touches?.[0]?.clientY);
  if (!pt) return;

  // Направление = куда тянешь (от сақа назад)
  const dx = aimStart.x - pt.x;
  const dz = aimStart.z - pt.z;
  const len = Math.hypot(dx, dz);
  if (len > 0.08) {
    aimDirX = dx / len;
    aimDirZ = dz / len;
  }

  // Визуальный оттяг сақа
  if (saqaMesh && saqaBody) {
    const pullAmt = Math.min(len, 1.2) * 0.28;
    const pullX = SAQA_START.x - aimDirX * pullAmt;
    const pullZ = SAQA_START.z - aimDirZ * pullAmt;
    saqaMesh.position.x = pullX;
    saqaMesh.position.z = pullZ;
    Body.setPosition(saqaBody, threeToMatter(pullX, pullZ));
  }

  // Линия прицела по направлению, длина = текущая сила ползунка
  updateAimLine(aimDirX, aimDirZ, powerMeter);
}

function updateAimLine(dirX, dirZ, pwr) {
  if (aimLine) scene.remove(aimLine);
  const len = Math.hypot(dirX, dirZ) || 1;
  const dx = dirX / len;
  const dz = dirZ / len;
  const dist = 1.5 + pwr * 4.5;
  const points = [
    new THREE.Vector3(SAQA_START.x, 0.06, SAQA_START.z),
    new THREE.Vector3(SAQA_START.x + dx * dist, 0.06, SAQA_START.z + dz * dist)
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const col = pwr < 0.33 ? 0x22c55e : pwr < 0.66 ? 0xeab308 : 0xef4444;
  const mat = new THREE.LineDashedMaterial({
    color: col,
    dashSize: 0.22,
    gapSize: 0.1,
    transparent: true,
    opacity: 0.9
  });
  aimLine = new THREE.Line(geo, mat);
  aimLine.computeLineDistances();
  scene.add(aimLine);
}

function onPointerUp(e) {
  if (!isAiming) return;
  isAiming = false;
  document.getElementById('power-bar-container').classList.remove('show');
  const pl = document.getElementById('power-label');
  if (pl) pl.textContent = '';
  if (aimLine) { scene.remove(aimLine); aimLine = null; }

  // Сила = где остановился ползунок в момент отпускания
  power = Math.max(0.12, powerMeter);

  // Направление: если почти не тянули — вперёд
  let dx = aimDirX;
  let dz = aimDirZ;
  const dlen = Math.hypot(dx, dz);
  if (dlen < 0.05) { dx = 0; dz = -1; }
  else { dx /= dlen; dz /= dlen; }

  // Snap saqa back to start before launch
  if (saqaMesh && saqaBody) {
    saqaMesh.position.set(SAQA_START.x, 0.14, SAQA_START.z);
    Body.setPosition(saqaBody, threeToMatter(SAQA_START.x, SAQA_START.z));
  }

  playSfx('whoosh');
  camMode = 'follow';

  const st = getPlayStats();
  const force = power * 0.078 * st.forceMul;
  Body.setVelocity(saqaBody, {
    x: dx * force * SCALE * 3.2,
    y: dz * force * SCALE * 3.2
  });
  // лёгкое вращение (не жёстко)
  const spin = (0.06 + power * 0.12) * (Math.random() > 0.5 ? 1 : -1);
  Body.setAngularVelocity(saqaBody, spin);
  if (saqaMesh) {
    saqaMesh.userData.tumble = 0.12 + power * 0.2;
    saqaMesh.userData.alshyHold = false;
  }

  thrown = true;
  power = 0;
  powerMeter = 0;
  aimStart = null;
  advancePractice('throw');

  let checkCount = 0;
  const stopCheck = setInterval(() => {
    checkCount++;
    if (!saqaBody) { clearInterval(stopCheck); return; }
    const speed = Math.hypot(saqaBody.velocity.x, saqaBody.velocity.y);
    if (speed < 0.7 || checkCount > 90) {
      clearInterval(stopCheck);
      camMode = 'return';
      endThrow();
    }
  }, 35);
}

// Events
canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchstart', e => { e.preventDefault(); onPointerDown(e); }, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); onPointerMove(e); }, { passive: false });
canvas.addEventListener('touchend', e => { e.preventDefault(); onPointerUp(e); }, { passive: false });

// ─────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────
function setIngameBtns(visible) {
  const el = document.getElementById('ingame-btns');
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  document.body.classList.add('menu-open');
  setIngameBtns(false);
  camMode = 'return';
}

function hideAllScreens() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.body.classList.remove('menu-open');
  setIngameBtns(true);
}

function showHint(text) {
  const h = document.getElementById('hint');
  h.textContent = text;
  h.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => h.classList.remove('show'), 2800);
}

// ── Audio (low-latency: pool of clones) ──
const SFX_SRC = {
  whoosh: 'assets/whoosh.mp3',
  click: 'assets/click.mp3',
  win: 'assets/win.mp3',
};
const SFX_POOL = { whoosh: [], click: [], win: [] };
const SFX_VOL = { whoosh: 0.7, click: 0.35, win: 0.65 };

function warmSfx() {
  Object.keys(SFX_SRC).forEach(name => {
    for (let i = 0; i < 3; i++) {
      const a = new Audio(SFX_SRC[name]);
      a.preload = 'auto';
      a.loop = false;
      a.volume = SFX_VOL[name];
      a.load();
      SFX_POOL[name].push(a);
    }
  });
}
warmSfx();

const _sfxLast = {};
function playSfx(name) {
  const now = performance.now();
  // анти-спам: клик не чаще чем раз в 120мс
  if (name === 'click' && _sfxLast.click && now - _sfxLast.click < 120) return;
  _sfxLast[name] = now;

  const pool = SFX_POOL[name];
  if (!pool || !pool.length) return;
  let a = pool.find(x => x.paused || x.ended);
  if (!a) {
    // все заняты — клонируем одноразово
    a = pool[0].cloneNode();
    a.volume = SFX_VOL[name];
  }
  try {
    a.loop = false;
    a.volume = SFX_VOL[name];
    a.currentTime = 0;
    const pr = a.play();
    if (pr) pr.catch(() => {});
  } catch (_) {}
}

function playPop(vol = 0.15) {
  // soft fallback beep for asyk score
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(480 + Math.random() * 120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}

function cancelMeme() {
  const overlay = document.getElementById('meme-overlay');
  if (!overlay) return;
  clearTimeout(overlay._hideTimer);
  overlay.classList.remove('show');
  overlay._onDone = null;
}

function showMeme(onDone) {
  const overlay = document.getElementById('meme-overlay');
  const img = document.getElementById('meme-img');
  if (!overlay || !img) { if (onDone) onDone(); return; }
  const session = uiSession;
  img.src = 'assets/spongebob-kazakh.png';
  overlay.classList.remove('show');
  img.style.animation = 'none';
  void overlay.offsetWidth;
  img.style.animation = '';
  overlay.classList.add('show');
  overlay._onDone = onDone;
  playSfx('win');
  clearTimeout(overlay._hideTimer);
  overlay._hideTimer = setTimeout(() => {
    overlay.classList.remove('show');
    if (session !== uiSession) return; // ушли в меню — не показываем результат поверх
    const cb = overlay._onDone;
    overlay._onDone = null;
    if (typeof cb === 'function') cb();
  }, 3200);
}

// Confetti particles on win
let confettiParticles = [];
function spawnConfetti() {
  confettiParticles = [];
  const colors = [0xFFD700, 0x22c55e, 0xef4444, 0x3b82f6, 0xf97316, 0xffffff];
  for (let i = 0; i < 48; i++) {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
    const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length] });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 6,
      4 + Math.random() * 3,
      (Math.random() - 0.5) * 6 - 1
    );
    mesh.userData.vx = (Math.random() - 0.5) * 0.12;
    mesh.userData.vy = -0.04 - Math.random() * 0.06;
    mesh.userData.vz = (Math.random() - 0.5) * 0.12;
    mesh.userData.spin = (Math.random() - 0.5) * 0.3;
    scene.add(mesh);
    confettiParticles.push(mesh);
  }
  // auto cleanup
  setTimeout(() => {
    confettiParticles.forEach(p => scene.remove(p));
    confettiParticles = [];
  }, 3500);
}

function showResult(win, starsEarned) {
  recordMatchResult(win, starsEarned);
  const title = document.getElementById('result-title');
  const starsEl = document.getElementById('result-stars');
  const textEl = document.getElementById('result-text');
  const nextBtn = document.getElementById('btn-next');
  const vsEl = document.getElementById('vs-score');

  // Animated glowing stars
  const starNodes = starsEl.querySelectorAll('.star');
  starNodes.forEach((n, i) => {
    n.classList.remove('on');
    n.style.transitionDelay = '0s';
  });
  // force reflow then light up
  void starsEl.offsetWidth;
  if (win) {
    for (let i = 0; i < 3; i++) {
      const n = starNodes[i];
      if (!n) continue;
      if (i < starsEarned) {
        n.style.transitionDelay = (0.15 + i * 0.25) + 's';
        n.classList.add('on');
      }
    }
  }

  if (gameMode === 2) {
    // Очки = число выбитых асыков за раунд (всегда, win или нет)
    playerScores[currentPlayer] += score;
    if (win) {
      playerStars[currentPlayer] = Math.max(playerStars[currentPlayer], starsEarned);
    }
    if (vsEl) {
      vsEl.style.display = 'block';
      vsEl.innerHTML = playerNames[0] + ': <b>' + playerScores[0] + '</b> · ' +
        playerNames[1] + ': <b>' + playerScores[1] + '</b> (очки = выбитые асыки)';
    }
    title.textContent = playerNames[currentPlayer] + (win ? ' — раунд!' : ' — раунд окончен');
    textEl.textContent = 'Выбито асыков: ' + score + (win ? ' · ' + starsEarned + '★' : '');
    nextBtn.style.display = 'inline-block';
    nextBtn.textContent = 'Ход: ' + playerNames[currentPlayer === 0 ? 1 : 0];
  } else {
    if (vsEl) vsEl.style.display = 'none';
    if (win) {
      title.textContent = 'Победа!';
      textEl.textContent = starsEarned === 3 ? 'Идеально! Отличная меткость!' :
                         starsEarned === 2 ? 'Отличный результат!' : 'Уровень пройден!';
      nextBtn.style.display = currentLevel < LEVELS.length - 1 ? 'inline-block' : 'none';
      nextBtn.textContent = 'Следующий уровень';
    } else {
      title.textContent = 'Почти...';
      textEl.textContent = 'Асыки остались на поле. Попробуй ещё раз!';
      nextBtn.style.display = 'none';
      nextBtn.textContent = 'Следующий уровень';
    }
  }
  showScreen('result-screen');
}

function buildLevelsGrid() {
  const grid = document.getElementById('levels-grid');
  grid.innerHTML = '';
  LEVELS.forEach(lvl => {
    const card = document.createElement('div');
    card.className = 'level-card' + (unlocked.includes(lvl.id) ? '' : ' locked');
    const s = stars[lvl.id] || 0;
    card.innerHTML = `
      <div class="num">${lvl.id}</div>
      <div style="font-size:9px;opacity:0.9;margin-top:2px">${lvl.name || ''}</div>
      <div class="stars-small">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</div>
      ${lvl.obstacles && lvl.obstacles.length ? '<div style="font-size:11px">🧱</div>' : ''}
    `;
    if (unlocked.includes(lvl.id)) {
      card.onclick = () => {
        playSfx('click');
        hideAllScreens();
        spawnLevel(lvl.id - 1);
      };
    }
    grid.appendChild(card);
  });
}


// ── Auth / Records / History UI ──
let authRegisterMode = false;

function updateUserChip() {
  const el = document.getElementById('user-chip');
  if (!el) return;
  const u = getCurrentUser();
  el.textContent = u ? ('👤 ' + u.name + (u.cloud ? ' · облако' : ' · локально')) : 'Гость (прогресс только на этом устройстве)';
}

function setAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) el.textContent = msg || '';
}


function afterAuthEnter() {
  updateUserChip();
  if (!isLoggedIn()) {
    resetGuestState();
    firstTime = true;
    showScreen('tutorial-choice-screen');
    return;
  }
  if (firstTime || !localStorage.getItem('asyk_played')) {
    showScreen('tutorial-choice-screen');
  } else {
    showScreen('start-screen');
  }
}

function openAuthScreen() {
  authRegisterMode = false;
  setAuthError('');
  document.getElementById('auth-name').style.display = 'none';
  document.getElementById('btn-auth-submit').textContent = 'Войти';
  document.getElementById('btn-auth-toggle').textContent = 'Нет аккаунта? Регистрация';
  document.getElementById('auth-mode-label').textContent = 'Войди, чтобы сохранять прогресс и рекорды';
  const u = getCurrentUser();
  document.getElementById('btn-auth-logout').style.display = u ? 'inline-block' : 'none';
  document.getElementById('auth-cloud-status').textContent = isCloudEnabled()
    ? 'Режим: Supabase (облако)'
    : 'Режим: локальные аккаунты (добавь ключи в src/config.js для облака)';
  showScreen('auth-screen');
}

async function applyLoadedProgress(prog) {
  applyUserProgress(prog);
  updateUserChip();
}

async function refreshRecordsUI() {
  const list = document.getElementById('records-list');
  if (!list) return;
  list.innerHTML = '<p style="color:#DAA520">Загрузка…</p>';
  const best = await getRecords();
  list.innerHTML = '';
  if (!Object.keys(best).length) {
    list.innerHTML = '<p style="color:#c4a882">Пока нет рекордов — сыграй уровень!</p>';
    return;
  }
  for (let i = 1; i <= LEVELS.length; i++) {
    const b = best[String(i)];
    const div = document.createElement('div');
    div.className = 'record-item';
    if (b) {
      div.innerHTML = '<b>Уровень ' + i + '</b> — очки: <b>' + b.score + '</b> · ' + '★'.repeat(b.stars || 0);
    } else {
      div.innerHTML = '<b>Уровень ' + i + '</b> — нет результата';
    }
    list.appendChild(div);
  }
}

async function refreshHistoryUI() {
  const list = document.getElementById('history-list');
  if (!list) return;
  list.innerHTML = '<p style="color:#DAA520">Загрузка…</p>';
  const hist = await getHistory();
  list.innerHTML = '';
  if (!hist.length) {
    list.innerHTML = '<p style="color:#c4a882">История пуста</p>';
    return;
  }
  hist.slice(0, 30).forEach(h => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const d = h.at ? new Date(h.at).toLocaleString('ru-RU') : '';
    div.innerHTML = '<b>Ур.' + h.level + '</b> · очки <b>' + h.score + '</b> · ' +
      (h.win ? '✓' : '✗') + ' · ' + (h.stars || 0) + '★' +
      (h.player ? ' · ' + h.player : '') +
      (d ? '<br><span style="opacity:0.7">' + d + '</span>' : '');
    list.appendChild(div);
  });
}



// ── 2P: дуэль на алшы — кто ходит первым ──
let alshyDuel = {
  active: false,
  mode: 'duel', // 'duel' | 'claim'
  turn: 0,
  results: [null, null],
  pos: 0,
  dir: 1,
  raf: null,
  zoneStart: 0.42,
  zoneEnd: 0.58,
};

function startAlshyDuel() {
  alshyDuel.active = true;
  alshyDuel.mode = 'duel';
  alshyDuel.turn = 0;
  alshyDuel.results = [null, null];
  alshyDuel.pos = 0;
  alshyDuel.dir = 1;
  const title = document.querySelector('#alshy-duel-screen h1');
  if (title) title.textContent = 'Кто первый?';
  const textEl = document.getElementById('alshy-duel-text');
  if (textEl) textEl.innerHTML = 'Попади ползунком в зону <b>АЛШЫ</b>';
  showScreen('alshy-duel-screen');
  updateAlshyDuelUI();
  runAlshyNeedle(0.028);
}

function updateAlshyDuelUI() {
  const name = playerNames[alshyDuel.turn] || ('Игрок ' + (alshyDuel.turn + 1));
  const el = document.getElementById('alshy-duel-player');
  if (el) el.textContent = name + ' — твой ход';
  const res = document.getElementById('alshy-duel-result');
  if (res) {
    const r0 = alshyDuel.results[0];
    const r1 = alshyDuel.results[1];
    let t = '';
    if (r0 !== null) t += playerNames[0] + ': ' + (r0 ? 'АЛШЫ ✓' : 'мимо') + ' · ';
    if (r1 !== null) t += playerNames[1] + ': ' + (r1 ? 'АЛШЫ ✓' : 'мимо');
    res.textContent = t;
  }
  const needle = document.getElementById('alshy-needle');
  if (needle) needle.style.left = (alshyDuel.pos * 100) + '%';
}

function runAlshyNeedle(speed) {
  cancelAnimationFrame(alshyDuel.raf);
  const spd = speed != null ? speed : 0.028; // 2p быстро, claim медленно
  const tick = () => {
    if (!alshyDuel.active) return;
    alshyDuel.pos += alshyDuel.dir * spd;
    if (alshyDuel.pos >= 1) { alshyDuel.pos = 1; alshyDuel.dir = -1; }
    if (alshyDuel.pos <= 0) { alshyDuel.pos = 0; alshyDuel.dir = 1; }
    const needle = document.getElementById('alshy-needle');
    if (needle) needle.style.left = (alshyDuel.pos * 100) + '%';
    alshyDuel.raf = requestAnimationFrame(tick);
  };
  alshyDuel.raf = requestAnimationFrame(tick);
}

function stopAlshyNeedle() {
  if (!alshyDuel.active) return;
  cancelAnimationFrame(alshyDuel.raf);
  const hit = alshyDuel.pos >= alshyDuel.zoneStart && alshyDuel.pos <= alshyDuel.zoneEnd;

  // 1P claim mode
  if (alshyDuel.mode === 'claim') {
    finishAlshyClaim(hit);
    return;
  }

  alshyDuel.results[alshyDuel.turn] = hit;
  playSfx(hit ? 'win' : 'click');
  if (hit) showHint(playerNames[alshyDuel.turn] + ' — АЛШЫ!');
  else showHint(playerNames[alshyDuel.turn] + ' — не алшы');

  if (alshyDuel.turn === 0) {
    alshyDuel.turn = 1;
    alshyDuel.pos = 0;
    alshyDuel.dir = 1;
    updateAlshyDuelUI();
    setTimeout(() => runAlshyNeedle(0.028), 600);
  } else {
    const a = alshyDuel.results[0];
    const b = alshyDuel.results[1];
    if (a && !b) currentPlayer = 0;
    else if (!a && b) currentPlayer = 1;
    else currentPlayer = Math.random() < 0.5 ? 0 : 1;
    alshyDuel.active = false;
    alshyDuel.mode = 'duel';
    updateAlshyDuelUI();
    const res = document.getElementById('alshy-duel-result');
    if (res) res.textContent = 'Первым ходит: ' + playerNames[currentPlayer];
    const sess = uiSession;
    setTimeout(() => {
      if (sess !== uiSession) return;
      hideAllScreens();
      setThrowSpot(currentPlayer);
      spawnLevel(0);
      showTurnBanner();
      showHint('Начинает ' + playerNames[currentPlayer]);
    }, 1200);
  }
}


// Buttons
function withClick(fn) {
  return (...args) => { playSfx('click'); fn(...args); };
}

document.getElementById('btn-play').onclick = withClick(() => {
  const n1 = document.getElementById('nick1');
  const n2 = document.getElementById('nick2');
  playerNames[0] = (n1 && n1.value.trim()) || 'Игрок 1';
  playerNames[1] = (n2 && n2.value.trim()) || 'Игрок 2';
  playerScores = [0, 0];
  playerStars = [0, 0];
  roundsPlayed = [0, 0];
  firstTime = false;
  persistAll();
  if (gameMode === 2) {
    startAlshyDuel();
  } else {
    currentPlayer = 0;
    setThrowSpot(0);
    hideAllScreens();
    spawnLevel(0);
    showTurnBanner();
  }
});

// Mode toggle

const mode2Btn = document.getElementById('mode-2p');
if (mode2Btn) mode2Btn.onclick = () => {
  playSfx('click');
  gameMode = 2;
  document.getElementById('mode-2p').classList.add('active');
  document.getElementById('mode-1p').classList.remove('active');
  const n2 = document.getElementById('nick2');
  if (n2) { n2.style.display = 'block'; n2.focus(); }
  showHint('Режим: 2 игрока');
};
const mode1Btn = document.getElementById('mode-1p');
if (mode1Btn) mode1Btn.onclick = () => {
  playSfx('click');
  gameMode = 1;
  document.getElementById('mode-1p').classList.add('active');
  document.getElementById('mode-2p').classList.remove('active');
  const n2 = document.getElementById('nick2');
  if (n2) n2.style.display = 'none';
};

document.getElementById('btn-auth')?.addEventListener('click', withClick(() => openAuthScreen()));

document.getElementById('btn-auth-guest')?.addEventListener('click', withClick(() => afterAuthEnter()));
document.getElementById('btn-auth-toggle')?.addEventListener('click', withClick(() => {
  authRegisterMode = !authRegisterMode;
  document.getElementById('auth-name').style.display = authRegisterMode ? 'block' : 'none';
  document.getElementById('btn-auth-submit').textContent = authRegisterMode ? 'Зарегистрироваться' : 'Войти';
  document.getElementById('btn-auth-toggle').textContent = authRegisterMode ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация';
  document.getElementById('auth-mode-label').textContent = authRegisterMode ? 'Создай аккаунт' : 'Войди в аккаунт';
  setAuthError('');
}));
document.getElementById('btn-auth-submit')?.addEventListener('click', withClick(async () => {
  setAuthError('');
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  const name = document.getElementById('auth-name').value;
  try {
    if (authRegisterMode) await register(email, pass, name);
    else await login(email, pass);
    const prog = await loadProgress();
    await applyLoadedProgress(prog);
    showHint('Сәлем, ' + (getCurrentUser()?.name || '') + '!');
    afterAuthEnter();
  } catch (e) {
    setAuthError(e.message || 'Ошибка');
  }
}));
document.getElementById('btn-auth-logout')?.addEventListener('click', withClick(async () => {
  await logout();
  updateUserChip();
  showHint('Вы вышли');
  showScreen('auth-screen');
}));
document.getElementById('btn-records')?.addEventListener('click', withClick(async () => {
  showScreen('records-screen');
  await refreshRecordsUI();
}));
document.getElementById('btn-history')?.addEventListener('click', withClick(async () => {
  showScreen('history-screen');
  await refreshHistoryUI();
}));
document.getElementById('btn-back-records')?.addEventListener('click', withClick(() => showScreen('start-screen')));
document.getElementById('btn-back-history')?.addEventListener('click', withClick(() => showScreen('start-screen')));
document.getElementById('btn-guide')?.addEventListener('click', withClick(() => showScreen('guide-screen')));
document.getElementById('btn-back-guide')?.addEventListener('click', withClick(() => showScreen('start-screen')));
document.getElementById('btn-tutorial')?.addEventListener('click', withClick(() => {
  hideAllScreens();
  startTutorial();
}));
document.getElementById('btn-do-tutorial')?.addEventListener('click', withClick(() => {
  hideAllScreens();
  startTutorial();
}));
document.getElementById('btn-skip-tutorial')?.addEventListener('click', withClick(() => {
  firstTime = false;
  persistAll();
  showScreen('start-screen');
  showHint('Можно открыть обучение в меню в любой момент');
}));

document.getElementById('btn-levels').onclick = withClick(() => {
  buildLevelsGrid();
  showScreen('levels-screen');
});

document.getElementById('tab-upgrades')?.addEventListener('click', withClick(() => {
  document.getElementById('tab-upgrades').classList.add('active');
  document.getElementById('tab-skins').classList.remove('active');
  document.getElementById('upgrades-panel').style.display = 'block';
  document.getElementById('shop-grid').style.display = 'none';
}));
document.getElementById('tab-skins')?.addEventListener('click', withClick(() => {
  document.getElementById('tab-skins').classList.add('active');
  document.getElementById('tab-upgrades').classList.remove('active');
  document.getElementById('upgrades-panel').style.display = 'none';
  document.getElementById('shop-grid').style.display = 'grid';
  buildShop();
}));
document.getElementById('btn-alshy-stop')?.addEventListener('click', withClick(() => stopAlshyNeedle()));

document.getElementById('btn-shop').onclick = withClick(() => {
  buildShop();
  document.getElementById('tab-upgrades')?.classList.add('active');
  document.getElementById('tab-skins')?.classList.remove('active');
  const up = document.getElementById('upgrades-panel');
  const gr = document.getElementById('shop-grid');
  if (up) up.style.display = 'block';
  if (gr) gr.style.display = 'none';
  showScreen('shop-screen');
});
document.getElementById('btn-back-levels').onclick = withClick(() => showScreen('start-screen'));
document.getElementById('btn-back-how').onclick = withClick(() => showScreen('start-screen'));
document.getElementById('btn-back-shop').onclick = withClick(() => showScreen('start-screen'));
document.getElementById('btn-donate').onclick = withClick(() => {
  gems += 200;
  persistAll();
  updateCoinsUI();
  buildShop();
  showHint('+200 тенге 💎 за донат! Рахмет');
});
document.getElementById('btn-retry').onclick = withClick(() => {
  hideAllScreens();
  spawnLevel(currentLevel);
});
document.getElementById('btn-next').onclick = withClick(() => {
  hideAllScreens();
  if (gameMode === 2) {
    roundsPlayed[currentPlayer] = (roundsPlayed[currentPlayer] || 0) + 1;
    // switch to other player
    currentPlayer = currentPlayer === 0 ? 1 : 0;
    setThrowSpot(currentPlayer);
    // after both played this level, advance level
    if (roundsPlayed[0] > 0 && roundsPlayed[1] > 0 && roundsPlayed[0] === roundsPlayed[1]) {
      if (currentLevel < LEVELS.length - 1) currentLevel++;
      roundsPlayed = [0, 0];
    }
    spawnLevel(currentLevel);
    showTurnBanner();
    showHint('Ход: ' + playerNames[currentPlayer] + ' · Ур.' + (currentLevel + 1));
  } else {
    spawnLevel(Math.min(currentLevel + 1, LEVELS.length - 1));
  }
});
document.getElementById('btn-menu').onclick = withClick(() => {
  updateCoinsUI();
  document.getElementById('turn-banner')?.classList.remove('show');
  showScreen('start-screen');
});

document.getElementById('btn-restart').onclick = withClick(() => {
  if (resultPending) return;
  camMode = 'return';
  hideAllScreens();
  spawnLevel(currentLevel);
});
document.getElementById('btn-to-menu').onclick = withClick(() => {
  uiSession++;
  resultPending = false;
  thrown = false;
  practiceMode = false;
  alshyClaimPending = null;
  if (alshyDuel) alshyDuel.active = false;
  cancelAnimationFrame(alshyDuel?.raf);
  cancelMeme();
  camMode = 'return';
  clearLevel();
  document.getElementById('tutorial')?.classList.remove('show', 'practice-mode');
  document.getElementById('turn-banner')?.classList.remove('show');
  document.getElementById('power-bar-container')?.classList.remove('show');
  updateCoinsUI();
  showScreen('start-screen');
});

// Tutorial
let tutStep = 0;
let practiceMode = false;
let practiceWait = null; // 'aim' | 'throw' | 'done'

const tutTexts = [
  { title: 'Практика', text: 'Сейчас сыграешь на учебном поле. Жми «Начать практику» — и сделай первый бросок.', action: 'start' },
  { title: '1. Направление', text: 'Зажми САҚА внизу поля и тяни — это направление. Ползунок силы бегает сам.', action: 'aim' },
  { title: '2. Сила', text: 'Отпусти, когда ползунок в зоне «Средний» или «Сильный». Сақа полетит и будет крутиться!', action: 'throw' },
  { title: '3. Алшы', text: 'После броска появится ползунок АЛШЫ. Попади в зелёную зону — +10 тиын 🪙. Тиын только так, не донатом.', action: 'info' },
  { title: '4. Мастерская', text: 'Тиын → прокачка (сила, точность, прочность, размер). Тенге 💎 → только красивые скины.', action: 'info' },
  { title: 'Готово!', text: 'Ты готов к уровням. Удачи!', action: 'end' },
];

function startTutorial() {
  tutStep = 0;
  practiceMode = false;
  practiceWait = null;
  const tut = document.getElementById('tutorial');
  tut.classList.add('show');
  tut.classList.remove('practice-mode');
  updateTut();
}

function updateTut() {
  const t = tutTexts[tutStep];
  document.querySelector('#tut-step h2').textContent = t.title;
  document.querySelector('#tut-step p').textContent = t.text;
  const btn = document.getElementById('tut-next');
  if (t.action === 'start') btn.textContent = 'Начать практику';
  else if (t.action === 'aim' || t.action === 'throw') btn.textContent = 'Жду твоё действие…';
  else if (t.action === 'end') btn.textContent = 'В меню';
  else btn.textContent = 'Дальше';
  btn.disabled = (t.action === 'aim' || t.action === 'throw');
}

function advancePractice(from) {
  if (!practiceMode) return;
  if (practiceWait === 'aim' && from === 'aim') {
    practiceWait = 'throw';
    tutStep = 2;
    updateTut();
  } else if (practiceWait === 'throw' && from === 'throw') {
    practiceWait = null;
    tutStep = 3;
    const btn = document.getElementById('tut-next');
    if (btn) btn.disabled = false;
    updateTut();
    showHint('Бросок есть! Можно жать «Дальше» справа сверху');
  }
}

document.getElementById('tut-next').onclick = () => {
  playSfx('click');
  const t = tutTexts[tutStep];
  if (t.action === 'start') {
    // launch practice field
    practiceMode = true;
    practiceWait = 'aim';
    document.getElementById('tutorial').classList.add('practice-mode');
    hideAllScreens();
    currentPlayer = 0;
    setThrowSpot(0);
    // soft level: few asyks, many attempts
    const practiceLvl = {
      id: 0, name: 'Практика', target: 1, attempts: 8,
      asyks: [{ x: 0, z: -2.0 }, { x: 0.6, z: -2.3 }, { x: -0.6, z: -2.3 }]
    };
    // temporarily inject
    clearLevel();
    score = 0;
    attemptsLeft = 8;
    thrown = false;
    resultPending = false;
    scoredIds.clear();
    setIngameBtns(true);
    document.getElementById('lvl-num').textContent = 'Обуч.';
    document.getElementById('score').textContent = '0';
    document.getElementById('target').textContent = '1';
    document.getElementById('attempts').textContent = '8';
    practiceLvl.asyks.forEach((pos, i) => {
      const op = orientAsykForPlayer(pos.x, pos.z, 0);
      const mPos = threeToMatter(op.x, op.z);
      const body = Bodies.circle(mPos.x, mPos.y, 0.32 * SCALE, {
        friction: 0.05, frictionAir: 0.018, restitution: 0.68, density: 0.0016, label: 'asyk_' + i
      });
      body._scored = false; body._meshIndex = i;
      World.add(world, body); asykBodies.push(body);
      const mesh = createAsykMesh(false);
      mesh.position.set(op.x, 0.12, op.z);
      scene.add(mesh); asykMeshes.push(mesh);
    });
    resetSaqa();
    tutStep = 1;
    updateTut();
    showHint('Зажми сақа и потяни');
    return;
  }
  if (t.action === 'aim' || t.action === 'throw') return;
  tutStep++;
  if (tutStep >= tutTexts.length) {
    document.getElementById('tutorial').classList.remove('show', 'practice-mode');
    practiceMode = false;
    firstTime = false;
    persistAll();
    clearLevel();
    showScreen('start-screen');
    showHint('Обучение пройдено!');
  } else {
    updateTut();
  }
};


// ─────────────────────────────────────────────
// ANIMATION LOOP
// ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  Engine.update(engine, 1000 / 60);
  checkRubyBreaks();

  // Sync meshes (лежат на земле)
  if (saqaMesh && saqaBody) {
    const p = matterToThree(saqaBody);
    const st = getPlayStats();
    saqaMesh.position.x = p.x;
    saqaMesh.position.y = 0.12 * st.sizeMul;
    saqaMesh.position.z = p.z;
    saqaMesh.rotation.y = saqaBody.angle;
    // лёгкий перекат в полёте; при алшы — держим ровно
    if (saqaMesh.userData.alshyHold) {
      saqaMesh.rotation.x = 0;
      saqaMesh.rotation.z = 0;
    } else {
      const spd = Math.hypot(saqaBody.velocity.x, saqaBody.velocity.y);
      if (thrown && spd > 1.2) {
        const tumble = saqaMesh.userData.tumble || 0.15;
        saqaMesh.rotation.x += saqaBody.velocity.y * 0.0008 * tumble;
        saqaMesh.rotation.z -= saqaBody.velocity.x * 0.0008 * tumble;
      } else {
        saqaMesh.rotation.x *= 0.85;
        saqaMesh.rotation.z *= 0.85;
      }
    }
  }
  asykBodies.forEach((body, i) => {
    if (!asykMeshes[i]) return;
    const p = matterToThree(body);
    asykMeshes[i].position.x = p.x;
    asykMeshes[i].position.y = 0.10;
    asykMeshes[i].position.z = p.z;
    asykMeshes[i].rotation.y = body.angle;
  });

  // Continuous score check while moving
  if (thrown) checkScored();

  // Confetti physics
  if (confettiParticles.length) {
    confettiParticles.forEach(p => {
      p.position.x += p.userData.vx;
      p.position.y += p.userData.vy;
      p.position.z += p.userData.vz;
      p.rotation.x += p.userData.spin;
      p.rotation.z += p.userData.spin * 0.7;
      p.userData.vy -= 0.002;
    });
  }

  // Animated environment — night steppe
  const t = performance.now() * 0.001;

  // Ползунок силы — ходит сам, пока целишься
  if (isAiming) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - (window.__lastAimT || now)) / 1000);
    window.__lastAimT = now;
    const pMul = getPlayStats().powerSpeedMul;
    powerMeter += powerDir * POWER_SPEED * pMul * (dt > 0 ? dt : 0.016);
    if (powerMeter >= 1) { powerMeter = 1; powerDir = -1; }
    if (powerMeter <= 0) { powerMeter = 0; powerDir = 1; }
    updatePowerUI();
    try { updateAimLine(aimDirX, aimDirZ, powerMeter); } catch (_) {}
  }

  // качающаяся трава
  grassBlades.forEach(b => {
    b.rotation.z = Math.sin(t * 1.8 + b.userData.phase) * b.userData.amp;
  });

  // облака плывут / звёзды
  starMeshes.forEach(s => {
    if (s.userData.speed) {
      s.position.x += s.userData.speed;
      s.position.y += Math.sin(t * 0.6 + (s.userData.bob || 0)) * 0.003;
      if (s.position.x > 20) s.position.x = -18;
    } else if (s.userData.twinkle !== undefined) {
      const tw = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.5 + s.userData.twinkle));
      s.scale.setScalar(tw);
    }
  });

  // дым, пламя, бабочки
  smokePuffs.forEach((s) => {
    if (s.userData.w1) {
      // butterfly
      s.userData.phase += 0.012 * s.userData.speed;
      const ph = s.userData.phase;
      s.position.x = Math.cos(ph) * s.userData.radius;
      s.position.z = Math.sin(ph * 0.7) * s.userData.radius * 0.6 - 1;
      s.position.y = s.userData.baseY + Math.sin(ph * 2) * 0.35;
      const flap = Math.sin(t * 10 + ph) * 0.55;
      s.userData.w1.rotation.y = flap;
      s.userData.w2.rotation.y = -flap;
    } else if (s.userData.baseY !== undefined && !s.userData.radius) {
      s.scale.y = 0.9 + Math.sin(t * 8) * 0.2;
      s.scale.x = 0.85 + Math.sin(t * 10) * 0.15;
      if (typeof fireLight !== 'undefined') fireLight.intensity = 0.4 + Math.sin(t * 9) * 0.2;
    } else if (s.userData.speed && s.material) {
      s.position.y += s.userData.speed;
      s.position.x += Math.sin(t + s.userData.phase) * 0.004;
      s.material.opacity = Math.max(0, 0.28 - (s.position.y - 1.2) * 0.07);
      if (s.position.y > 4.5) {
        s.position.y = 1.2;
        s.material.opacity = 0.25;
      }
    }
  });

  // ── Follow Cam ──
  if (camMode === 'follow' && saqaMesh) {
    const p = saqaMesh.position;
    const spot = SAQA_START;
    const len = Math.hypot(spot.x, spot.z) || 1;
    const backX = spot.x / len;
    const backZ = spot.z / len;
    // камера чуть сзади по оси броска игрока
    camTargetPos.set(p.x + backX * 4.2, 6.8, p.z + backZ * 4.2);
    camTargetLook.set(p.x, 0.2, p.z);
  } else if (camMode === 'return' || camMode === 'home') {
    camTargetPos.copy(CAM_HOME);
    camTargetLook.copy(CAM_LOOK);
    if (camMode === 'return') {
      const dist = camera.position.distanceTo(CAM_HOME);
      if (dist < 0.2) camMode = 'home';
    }
  }
  const lerp = camMode === 'follow' ? 0.08 : 0.06;
  camera.position.lerp(camTargetPos, lerp);
  controls.target.lerp(camTargetLook, lerp);
  controls.update();

  // осколки препятствий
  for (let i = debrisPieces.length - 1; i >= 0; i--) {
    const d = debrisPieces[i];
    d.position.x += d.userData.vx;
    d.position.y += d.userData.vy;
    d.position.z += d.userData.vz;
    d.userData.vy -= 0.012;
    d.rotation.x += d.userData.rx;
    d.rotation.y += d.userData.ry;
    d.rotation.z += d.userData.rz;
    d.userData.life -= 0.016;
    if (d.position.y < 0.05) {
      d.position.y = 0.05;
      d.userData.vy *= -0.3;
      d.userData.vx *= 0.85;
      d.userData.vz *= 0.85;
    }
    if (d.userData.life <= 0) {
      scene.remove(d);
      debrisPieces.splice(i, 1);
    } else if (d.userData.life < 0.35) {
      d.material.transparent = true;
      d.material.opacity = d.userData.life / 0.35;
    }
  }

  renderer.render(scene, camera);
}

// Resize
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
createGround();
createPhysicsBounds();

// Preload meme image
const memePreload = new Image();
memePreload.src = './assets/spongebob-kazakh.png';
updateCoinsUI();

function loadGrassModel() { /* removed for performance */ return Promise.resolve(); }

// Start loop immediately, models load in background
animate();
loadAsykModel().catch(e => console.warn('asyk load', e));
// loadGrassModel disabled

(async function bootAuth() {
  try {
    await restoreSession();
    if (isLoggedIn()) {
      const prog = await loadProgress();
      applyUserProgress(prog);
    } else {
      resetGuestState();
    }
    updateUserChip();
  } catch (e) {
    console.warn('bootAuth', e);
    resetGuestState();
    updateUserChip();
  }
  showScreen('auth-screen');
  console.log('Асық Ату boot', 'user:', isLoggedIn());
})();

