import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ========================================
// STORY DATA — 12 CHAPTERS
// ========================================

const storyChapters = [
  {
    position: { x: 0, z: 12 },
    date: "July 26, 2025",
    title: "The Follow Request",
    text: "It was a regular day during my internship in New York City when my phone buzzed. valerie.rengifo had requested to follow me. I was genuinely shocked — I screenshotted the notification and sent it straight to my good friend Skylar. Something about it felt different.",
    quote: null,
  },
  {
    position: { x: 5, z: 24 },
    date: "July 30, 2025",
    title: "The Book Story",
    text: "Four days later, I posted a photo of a book on my Instagram story. She liked it. By then, I knew she was interested. But I was still in New York City, hundreds of miles away — there wasn't much I could do except wait.",
    quote: null,
  },
  {
    position: { x: -3, z: 36 },
    date: "August 15, 2025",
    title: "Magnolias",
    text: "My internship wrapped up and I headed home to Athens, Georgia. That night I went to Magnolias — a bar that AKPsi, her professional fraternity, is known to frequent. I went hoping I'd see her. And I did. We talked, both a little drunk, had a great conversation about HSA. It was short, but it was real.",
    quote: null,
  },
  {
    position: { x: 4, z: 48 },
    date: "August 16, 2025",
    title: "Close Friends",
    text: "The next day, I posted a photo of my dinner on my close friends story. She liked it. These small interactions were starting to add up — each one a quiet signal that maybe this wasn't one-sided.",
    quote: null,
  },
  {
    position: { x: -5, z: 60 },
    date: "August 19, 2025",
    title: "The Reintroduction",
    text: "The Hispanic Student Association held their first GBM of the year — around 200 people packed the room. I spotted her across the crowd. As the event wound down, I caught her eye and waved her over. I made a joke and reintroduced myself.",
    quote: '"Haven\'t we already met?" she said with a smile. I apologized and we both laughed.',
  },
  {
    position: { x: 3, z: 75 },
    date: "October 22, 2025",
    title: "Three Hours by the Fire",
    text: "We both got busy throughout the semester and never saw each other — until ALPHA and AKPsi hosted their Fall Festival. I found her by the campfire and did the same bit — reintroduced myself with the joke. What was supposed to be a quick hello turned into three hours of talking. The fire crackled and the world shrank to just us. She had to leave for church.",
    quote: null,
  },
  {
    position: { x: -4, z: 88 },
    date: "October 31, 2025",
    title: "Get Your Head in the Game",
    text: "Halloween. I saw her story — she was dressed as Troy Bolton from High School Musical. I couldn't resist. I swiped up quoting the iconic song.",
    quote: '"Get your head in the game" I said.\n"Exactlyy you get it" she replied.',
  },
  {
    position: { x: 5, z: 100 },
    date: "November 15, 2025",
    title: "I Only Asked You",
    text: 'I heard AKPsi was having a tailgate for the UGA vs Texas game. I slid into her DMs: "Does AKPsi have a tailgate this weekend?" She said yeah and asked if I planned on going. I said maybe — I was trying to see if you were going.',
    quote: '"Is Skylar not going?" she asked.\n"I only asked you," I said.\nShe said she had an exam Monday and was going to skip it.',
  },
  {
    position: { x: -3, z: 112 },
    date: "November 17, 2025",
    title: "Peak Feid",
    text: "Two days later, I posted a story with a song by one of her favorite Colombian artists — Feid. The song was Chorritos Pa Las Animas. She swiped up immediately.",
    quote: '"Peak Feid" she said.\n"You know ball," I replied. "I forgot you was Colombian."',
  },
  {
    position: { x: 0, z: 126 },
    date: "December 5, 2025",
    title: "A Smile Across the Room",
    text: "Time passed. School forced us both to lock in. Then the LUL fraternity threw a Christmas party. I was supposed to be in Virginia visiting my little sister, but I'd fallen ill and was stuck in Athens. My roommate forced me out. We showed up two hours late. They asked me to DJ and things were smooth — until I saw a smile cutting through the dark room. A dark blue top. Beautiful brown hair. It was her. Valerie. I stopped everything.",
    quote: 'I tapped her shoulder. She turned around and did MY joke — reintroduced herself. "Have we met before?" We both laughed. I asked for her number.',
  },
  {
    position: { x: 5, z: 138 },
    date: "December 5, 2025",
    title: "Cookout at 4 AM",
    text: "That same night, I ran into her again at the Tropical bar. No joke — I picked her out through the entire crowd because of that smile. She said she was leaving, so I walked out with her and asked if she was hungry. We got in my car and went to Cookout. I told her I'd never been — I lied. She ordered for both of us.",
    quote: "Four chicken quesadillas. We talked until 4 AM. I dropped her off and couldn't stop smiling the whole way home.",
  },
  {
    position: { x: 0, z: 152 },
    date: "December 7, 2025",
    title: "12 Hours of Forever",
    text: "That Sunday, we met at 1000 Faces Coffee Shop for our first date. What was supposed to be coffee turned into 12 hours together. Twelve. Hours. We talked about everything and nothing. I didn't even notice time passing — it just flew. That's when I knew. With her, time doesn't exist. It just... disappears.",
    quote: null,
  },
];

// ========================================
// GAME STATE
// ========================================

let gameState = "welcome"; // "welcome" | "playing" | "reading" | "finale"
let currentPanelIndex = -1;
let visitedStations = new Set();
let elapsedTime = 0;

// ========================================
// DOM REFERENCES
// ========================================

const welcomeScreen = document.getElementById("welcome-screen");
const playBtn = document.getElementById("play-btn");
const storyPanel = document.getElementById("story-panel");
const panelDate = document.getElementById("panel-date");
const panelNumber = document.getElementById("panel-number");
const panelTitle = document.getElementById("panel-title");
const panelBody = document.getElementById("panel-body");
const panelQuote = document.getElementById("panel-quote");
const panelContinue = document.getElementById("panel-continue");
const gameHud = document.getElementById("game-hud");
const hudHint = document.getElementById("hud-hint");
const hudProgress = document.getElementById("hud-progress");
const finaleScreen = document.getElementById("finale-screen");
const replayBtn = document.getElementById("replay-btn");

// ========================================
// THREE.JS SCENE SETUP
// ========================================

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x2a1520, 15, 90);
scene.background = new THREE.Color(0x1a0e14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

// Lighting — warm romantic tones
const hemi = new THREE.HemisphereLight(0xffd4e0, 0x3a2030, 0.6);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffeedd, 0.7);
dir.position.set(8, 12, 6);
scene.add(dir);

// Soft ambient fill
const ambient = new THREE.AmbientLight(0x402030, 0.3);
scene.add(ambient);

// Ground
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x3a4a3a,
  roughness: 1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// ========================================
// PATH TRAIL BETWEEN STATIONS
// ========================================

function createPathTrail() {
  const points = storyChapters.map(
    (ch) => new THREE.Vector3(ch.position.x, 0.05, ch.position.z)
  );
  // Add start point at player spawn
  points.unshift(new THREE.Vector3(0, 0.05, 0));

  const curve = new THREE.CatmullRomCurve3(points, false);
  const curvePoints = curve.getPoints(200);
  const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
  const material = new THREE.LineBasicMaterial({
    color: 0xe74c6f,
    transparent: true,
    opacity: 0.3,
  });
  const trail = new THREE.Line(geometry, material);
  scene.add(trail);

  // Also add a wider ground strip for the path
  const pathWidth = 2.5;
  const pathShape = [];
  for (let i = 0; i < curvePoints.length; i++) {
    const p = curvePoints[i];
    const pathMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(pathWidth, 1.5),
      new THREE.MeshStandardMaterial({
        color: 0x4a3a40,
        roughness: 0.9,
        transparent: true,
        opacity: 0.5,
      })
    );
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(p.x, 0.02, p.z);
    if (i < curvePoints.length - 1) {
      const next = curvePoints[i + 1];
      pathMesh.lookAt(next.x, 0.02, next.z);
      pathMesh.rotation.x = -Math.PI / 2;
    }
    scene.add(pathMesh);
  }
}
createPathTrail();

// ========================================
// TREES — avoid the path corridor
// ========================================

function isNearPath(x, z) {
  for (const ch of storyChapters) {
    const dx = x - ch.position.x;
    const dz = z - ch.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < 6) return true;
  }
  // Also clear around the straight-line path corridor
  if (Math.abs(x) < 4 && z > -5 && z < 160) return true;
  return false;
}

function addTree(x, z) {
  // Randomize between green and pink-tinted trees
  const isPink = Math.random() < 0.2;
  const trunkColor = 0x5a3a2b;
  const crownColor = isPink
    ? [0xc77088, 0xd4899a, 0xb85a70][Math.floor(Math.random() * 3)]
    : [0x3a6a3a, 0x4a7a4a, 0x2a5a2a][Math.floor(Math.random() * 3)];

  const trunkH = 1.5 + Math.random() * 1.5;
  const crownR = 0.8 + Math.random() * 0.8;
  const crownH = 2 + Math.random() * 1.5;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, trunkH, 8),
    new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 1 })
  );
  trunk.position.set(x, trunkH / 2, z);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(crownR, crownH, 10),
    new THREE.MeshStandardMaterial({ color: crownColor, roughness: 0.8 })
  );
  crown.position.set(x, trunkH + crownH / 2, z);

  scene.add(trunk, crown);
}

for (let i = 0; i < 60; i++) {
  const x = (Math.random() - 0.5) * 80;
  const z = (Math.random() - 0.5) * 200 + 75; // Spread along the path
  if (!isNearPath(x, z)) {
    addTree(x, z);
  }
}

// ========================================
// STORY STATION MARKERS (3D Hearts)
// ========================================

const stationMarkers = [];
const stationLights = [];

function createHeartShape() {
  const shape = new THREE.Shape();
  const s = 0.4;
  shape.moveTo(0, s * 0.7);
  shape.bezierCurveTo(0, s * 1.2, -s * 1, s * 1.4, -s * 1, s * 0.7);
  shape.bezierCurveTo(-s * 1, 0, 0, -s * 0.2, 0, -s * 1);
  shape.bezierCurveTo(0, -s * 0.2, s * 1, 0, s * 1, s * 0.7);
  shape.bezierCurveTo(s * 1, s * 1.4, 0, s * 1.2, 0, s * 0.7);
  return shape;
}

function createStationMarker(chapter, index) {
  const group = new THREE.Group();
  group.position.set(chapter.position.x, 0, chapter.position.z);

  // Heart mesh
  const heartShape = createHeartShape();
  const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 };
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  heartGeo.center();

  const heartMat = new THREE.MeshStandardMaterial({
    color: 0xe74c6f,
    emissive: 0xe74c6f,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.1,
  });
  const heart = new THREE.Mesh(heartGeo, heartMat);
  heart.position.y = 2.5;
  heart.scale.setScalar(1.5);
  group.add(heart);

  // Glow light
  const light = new THREE.PointLight(0xe74c6f, 2, 8);
  light.position.y = 2.5;
  group.add(light);

  // Ring on the ground
  const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xe74c6f,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  scene.add(group);
  stationMarkers.push({ group, heart, light, ring, index });
}

storyChapters.forEach((ch, i) => createStationMarker(ch, i));

// ========================================
// PLAYER
// ========================================

const player = new THREE.Object3D();
player.position.set(0, 0, 0);
scene.add(player);

// Load character
const loader = new GLTFLoader();
let characterModel = null;

loader.load(
  "/models/avatar/valerie1.glb",
  (gltf) => {
    characterModel = gltf.scene;
    characterModel.scale.setScalar(1.0);
    characterModel.position.y = 0;
    player.add(characterModel);
    console.log("Character loaded!");
  },
  (progress) => {
    if (progress.total > 0) {
      console.log(
        "Loading...",
        ((progress.loaded / progress.total) * 100).toFixed(0) + "%"
      );
    }
  },
  (error) => {
    console.error("Error loading character:", error);
  }
);

// ========================================
// INPUT STATE
// ========================================

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

const mouse = { dragging: false, lastX: 0, lastY: 0 };

window.addEventListener("mousedown", (e) => {
  if (e.button === 0 && gameState === "playing") {
    mouse.dragging = true;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  }
});

window.addEventListener("mouseup", () => {
  mouse.dragging = false;
});

window.addEventListener("mousemove", (e) => {
  if (mouse.dragging && gameState === "playing") {
    const dx = e.clientX - mouse.lastX;
    const dy = e.clientY - mouse.lastY;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;

    cameraYaw -= dx * 0.004;
    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch - dy * 0.004,
      0.1,
      1.3
    );
  }
});

function getGamepadInput() {
  const gp = navigator.getGamepads()?.[0];
  if (!gp) return { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };

  const deadzone = (v, threshold = 0.15) => {
    return Math.abs(v) < threshold
      ? 0
      : ((Math.abs(v) - threshold) / (1 - threshold)) * Math.sign(v);
  };

  return {
    moveX: deadzone(gp.axes[0]),
    moveY: deadzone(gp.axes[1]),
    lookX: deadzone(gp.axes[2]),
    lookY: deadzone(gp.axes[3]),
  };
}

// ========================================
// PLAYER & CAMERA STATE
// ========================================

const playerVelocity = new THREE.Vector3();
let cameraYaw = Math.PI; // Start facing forward (along +Z)
let cameraPitch = 0.4;

const MOVE_SPEED = 4.0;
const MOVE_ACCEL = 15.0;
const MOVE_DECEL = 10.0;
const TURN_SPEED = 8.0;

const CAM_DISTANCE = 8.0;
const CAM_HEIGHT = 3.0;
const CAM_LOOKAT_HEIGHT = 1.8;
const CAM_SMOOTHING = 10.0;
const CAM_STICK_SENSITIVITY = 3.0;

const TRIGGER_RADIUS = 3.5;

// ========================================
// SIMPLE PARTICLE SYSTEM (rose petals)
// ========================================

const petalCount = 40;
const petalGeo = new THREE.PlaneGeometry(0.15, 0.1);
const petalMat = new THREE.MeshBasicMaterial({
  color: 0xe8899a,
  transparent: true,
  opacity: 0.6,
  side: THREE.DoubleSide,
});
const petals = [];

for (let i = 0; i < petalCount; i++) {
  const petal = new THREE.Mesh(petalGeo, petalMat);
  petal.position.set(
    (Math.random() - 0.5) * 20,
    2 + Math.random() * 6,
    Math.random() * 160
  );
  petal.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  petal.userData = {
    speedY: 0.3 + Math.random() * 0.3,
    speedX: (Math.random() - 0.5) * 0.5,
    rotSpeed: (Math.random() - 0.5) * 2,
  };
  scene.add(petal);
  petals.push(petal);
}

// ========================================
// UI FUNCTIONS
// ========================================

function showPanel(index) {
  const chapter = storyChapters[index];
  currentPanelIndex = index;
  gameState = "reading";

  panelDate.textContent = chapter.date;
  panelNumber.textContent = `${index + 1} of ${storyChapters.length}`;
  panelTitle.textContent = chapter.title;
  panelBody.textContent = chapter.text;

  if (chapter.quote) {
    panelQuote.textContent = chapter.quote;
    panelQuote.classList.remove("hidden");
  } else {
    panelQuote.classList.add("hidden");
  }

  storyPanel.classList.remove("hidden");
  visitedStations.add(index);
  updateHud();
}

function hidePanel() {
  storyPanel.classList.add("hidden");
  gameState = "playing";

  // Check if all stations visited
  if (visitedStations.size === storyChapters.length) {
    setTimeout(() => {
      gameState = "finale";
      gameHud.classList.add("hidden");
      finaleScreen.classList.remove("hidden");
    }, 500);
  } else {
    updateHudHint();
  }
}

function updateHud() {
  hudProgress.textContent = `Chapters: ${visitedStations.size} / ${storyChapters.length}`;
}

function updateHudHint() {
  // Find the next unvisited station
  let nextIndex = -1;
  for (let i = 0; i < storyChapters.length; i++) {
    if (!visitedStations.has(i)) {
      nextIndex = i;
      break;
    }
  }
  if (nextIndex >= 0) {
    hudHint.textContent = `Walk towards the next glowing heart`;
    hudHint.style.opacity = "1";
    // Fade hint after a few seconds
    setTimeout(() => {
      hudHint.style.opacity = "0";
    }, 4000);
  }
}

function startGame() {
  gameState = "playing";
  welcomeScreen.classList.add("fade-out");
  setTimeout(() => {
    welcomeScreen.classList.add("hidden");
  }, 1000);
  gameHud.classList.remove("hidden");
  updateHud();
  updateHudHint();
}

function replayGame() {
  visitedStations.clear();
  currentPanelIndex = -1;
  gameState = "welcome";
  player.position.set(0, 0, 0);
  playerVelocity.set(0, 0, 0);
  cameraYaw = Math.PI;
  cameraPitch = 0.4;

  finaleScreen.classList.add("hidden");
  gameHud.classList.add("hidden");
  welcomeScreen.classList.remove("hidden");
  welcomeScreen.classList.remove("fade-out");

  // Reset station marker visibility
  stationMarkers.forEach((m) => {
    m.heart.material.emissiveIntensity = 0.6;
    m.light.intensity = 2;
    m.ring.material.opacity = 0.3;
  });
}

// ========================================
// EVENT LISTENERS
// ========================================

playBtn.addEventListener("click", startGame);
panelContinue.addEventListener("click", hidePanel);
replayBtn.addEventListener("click", replayGame);

// Allow spacebar/enter to dismiss panel
window.addEventListener("keydown", (e) => {
  if (
    gameState === "reading" &&
    (e.code === "Space" || e.code === "Enter")
  ) {
    hidePanel();
  }
});

// ========================================
// UPDATE
// ========================================

function update(dt) {
  elapsedTime += dt;

  // Animate station markers (float + rotate)
  stationMarkers.forEach((m) => {
    const visited = visitedStations.has(m.index);
    const baseY = 2.5;
    m.heart.position.y = baseY + Math.sin(elapsedTime * 2 + m.index) * 0.3;
    m.heart.rotation.y += dt * 0.8;

    // Dim visited stations
    if (visited) {
      m.heart.material.emissiveIntensity = 0.15;
      m.light.intensity = 0.3;
      m.ring.material.opacity = 0.08;
    } else {
      // Pulse glow for unvisited
      const pulse = 0.4 + Math.sin(elapsedTime * 3 + m.index * 0.7) * 0.3;
      m.heart.material.emissiveIntensity = pulse;
      m.light.intensity = 1.5 + Math.sin(elapsedTime * 3 + m.index) * 0.5;
    }
  });

  // Animate petals
  petals.forEach((p) => {
    p.position.y -= p.userData.speedY * dt;
    p.position.x += p.userData.speedX * dt;
    p.rotation.z += p.userData.rotSpeed * dt;

    // Reset petals that fall below ground
    if (p.position.y < 0) {
      p.position.y = 6 + Math.random() * 3;
      p.position.x = player.position.x + (Math.random() - 0.5) * 20;
      p.position.z = player.position.z + Math.random() * 20;
    }
  });

  // Only process input during "playing" state
  if (gameState !== "playing") {
    // During welcome, slowly orbit camera
    if (gameState === "welcome") {
      const welcomeOrbitSpeed = 0.15;
      const wt = elapsedTime * welcomeOrbitSpeed;
      camera.position.set(
        Math.sin(wt) * 15,
        6,
        Math.cos(wt) * 15
      );
      camera.lookAt(0, 2, 20);
    }
    return;
  }

  const gp = getGamepadInput();

  // Gather movement input
  let inputX = gp.moveX;
  let inputZ = gp.moveY;

  if (keys.KeyW || keys.ArrowUp) inputZ -= 1;
  if (keys.KeyS || keys.ArrowDown) inputZ += 1;
  if (keys.KeyA || keys.ArrowLeft) inputX -= 1;
  if (keys.KeyD || keys.ArrowRight) inputX += 1;

  inputX = THREE.MathUtils.clamp(inputX, -1, 1);
  inputZ = THREE.MathUtils.clamp(inputZ, -1, 1);

  // Camera orbit from gamepad
  if (gp.lookX !== 0 || gp.lookY !== 0) {
    cameraYaw -= gp.lookX * CAM_STICK_SENSITIVITY * dt;
    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch - gp.lookY * CAM_STICK_SENSITIVITY * dt,
      0.1,
      1.3
    );
  }

  // Calculate movement direction (camera-relative)
  const moveDir = new THREE.Vector3(inputX, 0, inputZ);
  const moveLength = Math.min(moveDir.length(), 1);

  if (moveLength > 0) {
    moveDir.normalize();
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

    const targetVel = moveDir.multiplyScalar(MOVE_SPEED * moveLength);
    playerVelocity.lerp(targetVel, 1 - Math.exp(-MOVE_ACCEL * dt));

    const targetRotation = Math.atan2(playerVelocity.x, playerVelocity.z);
    player.rotation.y = THREE.MathUtils.lerp(
      player.rotation.y,
      targetRotation,
      1 - Math.exp(-TURN_SPEED * dt)
    );
  } else {
    playerVelocity.lerp(
      new THREE.Vector3(),
      1 - Math.exp(-MOVE_DECEL * dt)
    );
  }

  player.position.add(playerVelocity.clone().multiplyScalar(dt));

  // Check station triggers
  for (let i = 0; i < storyChapters.length; i++) {
    if (visitedStations.has(i)) continue;
    const ch = storyChapters[i];
    const dx = player.position.x - ch.position.x;
    const dz = player.position.z - ch.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < TRIGGER_RADIUS) {
      showPanel(i);
      break;
    }
  }

  // Update camera
  const camX =
    Math.sin(cameraYaw) * Math.cos(cameraPitch) * CAM_DISTANCE;
  const camY =
    CAM_HEIGHT + Math.sin(cameraPitch) * CAM_DISTANCE * 0.6;
  const camZ =
    Math.cos(cameraYaw) * Math.cos(cameraPitch) * CAM_DISTANCE;

  const targetCamPos = player.position
    .clone()
    .add(new THREE.Vector3(camX, camY, camZ));
  camera.position.lerp(
    targetCamPos,
    1 - Math.exp(-CAM_SMOOTHING * dt)
  );

  const lookTarget = player.position
    .clone()
    .add(new THREE.Vector3(0, CAM_LOOKAT_HEIGHT, 0));
  camera.lookAt(lookTarget);
}

// ========================================
// RENDER LOOP
// ========================================

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
