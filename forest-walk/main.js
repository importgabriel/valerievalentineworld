import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { chapters } from "./chapters.js";
import { buildCity, updateEntranceMarkers } from "./city.js";

// ========================================
// GAME STATE
// ========================================

let gameState = "welcome";
let currentChapterIndex = 0;
let visitedChapters = new Set();
let elapsedTime = 0;
let lastChoiceCorrect = false;
let selectedChoiceIndex = 0;
let gamepadConnected = false;

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
const hudControls = document.querySelector(".hud-controls");
const finaleScreen = document.getElementById("finale-screen");
const replayBtn = document.getElementById("replay-btn");
const choicePanel = document.getElementById("choice-panel");
const choicePrompt = document.getElementById("choice-prompt");
const choiceOptions = document.getElementById("choice-options");
const wrongChoiceOverlay = document.getElementById("wrong-choice-overlay");
const wrongChoiceText = document.getElementById("wrong-choice-text");
const retryBtn = document.getElementById("retry-btn");
const rightChoiceOverlay = document.getElementById("right-choice-overlay");
const rightChoiceText = document.getElementById("right-choice-text");
const continueBtn = document.getElementById("continue-btn");
const transitionOverlay = document.getElementById("transition-overlay");

// ========================================
// THREE.JS SCENE SETUP — Bright AC daytime
// ========================================

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd4e6f1, 40, 80);
scene.background = new THREE.Color(0x87ceeb);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  80
);

// ========================================
// LIGHTING — Warm AC sunlight (3 lights total)
// ========================================

const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
sunLight.position.set(10, 20, 10);
scene.add(sunLight);

const ambient = new THREE.AmbientLight(0xfff8f0, 0.5);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0x87ceeb, 0x7ec850, 0.4);
scene.add(hemi);

// ========================================
// BUILD VILLAGE
// ========================================

const { storyBuildings, entranceMarkers } = buildCity(scene, chapters);

// ========================================
// PLAYER
// ========================================

const player = new THREE.Object3D();
player.position.set(0, 0, -3);
scene.add(player);

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
let characterModel = null;
let mixer = null;
let walkAction = null;
let isWalking = false;

// Parallel asset loading
Promise.all([
  gltfLoader.loadAsync("/models/avatar/valerie1.glb"),
  fbxLoader.loadAsync("/models/animations/Walking.fbx"),
])
  .then(([gltf, fbx]) => {
    characterModel = gltf.scene;
    characterModel.scale.setScalar(1.0);
    characterModel.position.y = 0;
    player.add(characterModel);

    mixer = new THREE.AnimationMixer(characterModel);

    if (fbx.animations && fbx.animations.length > 0) {
      const walkClip = fbx.animations[0];
      walkAction = mixer.clipAction(walkClip);
      walkAction.setLoop(THREE.LoopRepeat);
      walkAction.timeScale = 1.2;
    }
  })
  .catch((error) => {
    console.error("Error loading assets:", error);
  });

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
  if (e.button === 0 && gameState === "hub") {
    mouse.dragging = true;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  }
});

window.addEventListener("mouseup", () => {
  mouse.dragging = false;
});

window.addEventListener("mousemove", (e) => {
  if (mouse.dragging && gameState === "hub") {
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

// ========================================
// GAMEPAD INPUT
// ========================================

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

// Button edge detection — poll all buttons once per frame
const currButtons = new Array(17).fill(false);
const prevButtons = new Array(17).fill(false);

function pollGamepadButtons() {
  const gp = navigator.getGamepads()?.[0];
  if (!gp) return;
  for (let i = 0; i < Math.min(gp.buttons.length, currButtons.length); i++) {
    currButtons[i] = gp.buttons[i].pressed;
  }
}

function buttonJustPressed(index) {
  return currButtons[index] && !prevButtons[index];
}

function saveButtonState() {
  for (let i = 0; i < currButtons.length; i++) {
    prevButtons[i] = currButtons[i];
  }
}

// Gamepad connection detection
window.addEventListener("gamepadconnected", () => {
  gamepadConnected = true;
  if (hudControls) {
    hudControls.textContent =
      "Left Stick: move \u2022 Right Stick: look \u2022 A: interact";
  }
});

window.addEventListener("gamepaddisconnected", () => {
  gamepadConnected = false;
  if (hudControls) {
    hudControls.textContent = "WASD to move \u2022 Mouse to look";
  }
});

// ========================================
// PLAYER & CAMERA STATE
// ========================================

const playerVelocity = new THREE.Vector3();
let cameraYaw = Math.PI;
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

const TRIGGER_RADIUS = 3.0;

// Pre-allocated temp vectors (avoid per-frame GC)
const _moveDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _zeroVec = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _velDelta = new THREE.Vector3();

// ========================================
// UI FUNCTIONS
// ========================================

function showStoryPanel(index) {
  const chapter = chapters[index];
  gameState = "in_zone";

  panelDate.textContent = chapter.date;
  panelNumber.textContent = `${index + 1} of ${chapters.length}`;
  panelTitle.textContent = chapter.title;
  panelBody.textContent = chapter.storyText;

  if (chapter.quote) {
    panelQuote.textContent = chapter.quote;
    panelQuote.classList.remove("hidden");
  } else {
    panelQuote.classList.add("hidden");
  }

  panelContinue.innerHTML = gamepadConnected
    ? 'Make Your Choice <span class="glyph-a">A</span>'
    : "Make Your Choice <span>&#10140;</span>";
  storyPanel.classList.remove("hidden");
}

function hideStoryPanel() {
  storyPanel.classList.add("hidden");
}

function showChoicePanel(index) {
  const chapter = chapters[index];
  gameState = "choice";
  selectedChoiceIndex = 0;

  choicePrompt.textContent = chapter.choicePrompt;
  choiceOptions.innerHTML = "";

  const shuffled = [...chapter.choices].sort(() => Math.random() - 0.5);

  shuffled.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn" + (i === 0 ? " selected" : "");
    btn.textContent = choice.text;
    btn.addEventListener("click", () => handleChoice(choice, index));
    btn.addEventListener("mouseenter", () => {
      selectedChoiceIndex = i;
      updateChoiceHighlight();
    });
    choiceOptions.appendChild(btn);
  });

  choicePanel.classList.remove("hidden");
}

function updateChoiceHighlight() {
  const btns = choiceOptions.querySelectorAll(".choice-btn");
  btns.forEach((btn, i) => {
    btn.classList.toggle("selected", i === selectedChoiceIndex);
  });
}

function handleChoice(choice, chapterIndex) {
  choicePanel.classList.add("hidden");
  lastChoiceCorrect = choice.correct;
  gameState = "choice_result";

  if (choice.correct) {
    rightChoiceText.textContent = choice.response;
    rightChoiceOverlay.classList.remove("hidden");
    visitedChapters.add(chapterIndex);
    updateHud();
  } else {
    wrongChoiceText.textContent = choice.response;
    wrongChoiceOverlay.classList.remove("hidden");
  }
}

function continueAfterCorrectChoice() {
  rightChoiceOverlay.classList.add("hidden");

  if (visitedChapters.size === chapters.length) {
    setTimeout(() => {
      gameState = "finale";
      gameHud.classList.add("hidden");
      finaleScreen.classList.remove("hidden");
    }, 500);
    return;
  }

  currentChapterIndex = getNextChapterIndex();

  doTransition(() => {
    gameState = "hub";
    updateHudHint();
  });
}

function retryChapter() {
  wrongChoiceOverlay.classList.add("hidden");

  doTransition(() => {
    showStoryPanel(currentChapterIndex);
  });
}

function getNextChapterIndex() {
  for (let i = 0; i < chapters.length; i++) {
    if (!visitedChapters.has(i)) return i;
  }
  return -1;
}

function doTransition(callback) {
  transitionOverlay.classList.remove("hidden");
  transitionOverlay.classList.add("fade-in");

  setTimeout(() => {
    callback();
    transitionOverlay.classList.remove("fade-in");
    transitionOverlay.classList.add("fade-out");

    setTimeout(() => {
      transitionOverlay.classList.add("hidden");
      transitionOverlay.classList.remove("fade-out");
    }, 500);
  }, 500);
}

function updateHud() {
  hudProgress.textContent = `${visitedChapters.size} / ${chapters.length}`;
}

function updateHudHint() {
  const nextIndex = getNextChapterIndex();
  if (nextIndex >= 0) {
    hudHint.textContent = `Walk towards the glowing marker \u2014 ${chapters[nextIndex].title}`;
    hudHint.style.opacity = "1";
    setTimeout(() => {
      hudHint.style.opacity = "0";
    }, 5000);
  }
}

function startGame() {
  gameState = "hub";
  currentChapterIndex = 0;
  welcomeScreen.classList.add("fade-out");
  setTimeout(() => {
    welcomeScreen.classList.add("hidden");
  }, 1000);
  gameHud.classList.remove("hidden");
  updateHud();
  updateHudHint();
}

function replayGame() {
  visitedChapters.clear();
  currentChapterIndex = 0;
  gameState = "welcome";
  player.position.set(0, 0, -3);
  playerVelocity.set(0, 0, 0);
  cameraYaw = Math.PI;
  cameraPitch = 0.4;

  finaleScreen.classList.add("hidden");
  gameHud.classList.add("hidden");
  welcomeScreen.classList.remove("hidden");
  welcomeScreen.classList.remove("fade-out");
}

// ========================================
// EVENT LISTENERS
// ========================================

playBtn.addEventListener("click", startGame);
replayBtn.addEventListener("click", replayGame);

panelContinue.addEventListener("click", () => {
  if (gameState === "in_zone") {
    hideStoryPanel();
    showChoicePanel(currentChapterIndex);
  }
});

retryBtn.addEventListener("click", retryChapter);
continueBtn.addEventListener("click", continueAfterCorrectChoice);

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "Enter") {
    if (gameState === "in_zone") {
      hideStoryPanel();
      showChoicePanel(currentChapterIndex);
    } else if (gameState === "choice") {
      const btns = choiceOptions.querySelectorAll(".choice-btn");
      if (btns[selectedChoiceIndex]) btns[selectedChoiceIndex].click();
    }
  }
  // Arrow/WASD for choice navigation
  if (gameState === "choice") {
    const btns = choiceOptions.querySelectorAll(".choice-btn");
    if (e.code === "ArrowUp" || e.code === "KeyW") {
      selectedChoiceIndex =
        (selectedChoiceIndex - 1 + btns.length) % btns.length;
      updateChoiceHighlight();
      e.preventDefault();
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      selectedChoiceIndex = (selectedChoiceIndex + 1) % btns.length;
      updateChoiceHighlight();
      e.preventDefault();
    }
  }
});

// ========================================
// GAMEPAD BUTTON HANDLING
// ========================================

function handleGamepadButtons() {
  // A button (0) - Confirm
  if (buttonJustPressed(0)) {
    if (gameState === "welcome") {
      startGame();
    } else if (gameState === "in_zone") {
      hideStoryPanel();
      showChoicePanel(currentChapterIndex);
    } else if (gameState === "choice") {
      const btns = choiceOptions.querySelectorAll(".choice-btn");
      if (btns[selectedChoiceIndex]) btns[selectedChoiceIndex].click();
    } else if (gameState === "choice_result") {
      if (lastChoiceCorrect) {
        continueAfterCorrectChoice();
      } else {
        retryChapter();
      }
    } else if (gameState === "finale") {
      replayGame();
    }
  }

  // D-pad Up (12)
  if (buttonJustPressed(12)) {
    if (gameState === "choice") {
      const btns = choiceOptions.querySelectorAll(".choice-btn");
      selectedChoiceIndex =
        (selectedChoiceIndex - 1 + btns.length) % btns.length;
      updateChoiceHighlight();
    }
  }

  // D-pad Down (13)
  if (buttonJustPressed(13)) {
    if (gameState === "choice") {
      const btns = choiceOptions.querySelectorAll(".choice-btn");
      selectedChoiceIndex = (selectedChoiceIndex + 1) % btns.length;
      updateChoiceHighlight();
    }
  }
}

// ========================================
// UPDATE
// ========================================

function update(dt) {
  elapsedTime += dt;

  // Update animation mixer
  if (mixer) mixer.update(dt);

  // Update entrance markers
  updateEntranceMarkers(
    entranceMarkers,
    currentChapterIndex,
    visitedChapters,
    elapsedTime
  );

  // Handle gamepad buttons (poll → check → save)
  pollGamepadButtons();
  handleGamepadButtons();
  saveButtonState();

  // Welcome screen — slow camera orbit
  if (gameState === "welcome") {
    const wt = elapsedTime * 0.15;
    camera.position.set(
      Math.sin(wt) * 18,
      8,
      Math.cos(wt) * 18 + 20
    );
    camera.lookAt(0, 3, 30);
    return;
  }

  // Only process movement during hub state
  if (gameState !== "hub") return;

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

  // Movement direction (camera-relative) — pre-allocated vectors
  _moveDir.set(inputX, 0, inputZ);
  const moveLength = Math.min(_moveDir.length(), 1);
  const wasWalking = isWalking;

  if (moveLength > 0) {
    _moveDir.normalize();
    _moveDir.applyAxisAngle(_upAxis, cameraYaw);
    _moveDir.multiplyScalar(MOVE_SPEED * moveLength);
    playerVelocity.lerp(_moveDir, 1 - Math.exp(-MOVE_ACCEL * dt));

    const targetRotation = Math.atan2(
      playerVelocity.x,
      playerVelocity.z
    );
    player.rotation.y = THREE.MathUtils.lerp(
      player.rotation.y,
      targetRotation,
      1 - Math.exp(-TURN_SPEED * dt)
    );

    isWalking = true;
  } else {
    playerVelocity.lerp(_zeroVec, 1 - Math.exp(-MOVE_DECEL * dt));
    isWalking = false;
  }

  // Handle walking animation
  if (walkAction) {
    if (isWalking && !wasWalking) {
      walkAction.reset();
      walkAction.fadeIn(0.2);
      walkAction.play();
    } else if (!isWalking && wasWalking) {
      walkAction.fadeOut(0.3);
    }
  }

  // Apply velocity — pre-allocated
  _velDelta.copy(playerVelocity).multiplyScalar(dt);
  player.position.add(_velDelta);

  // Clamp player to city bounds
  player.position.x = THREE.MathUtils.clamp(player.position.x, -10, 10);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -5, 160);

  // Check entrance triggers
  const nextChapter = chapters[currentChapterIndex];
  if (nextChapter) {
    const side = currentChapterIndex % 2 === 0 ? -1 : 1;
    const entranceX = side * 7;
    const entranceZ = nextChapter.hubPosition.z;

    const dx = player.position.x - entranceX;
    const dz = player.position.z - entranceZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < TRIGGER_RADIUS) {
      doTransition(() => {
        showStoryPanel(currentChapterIndex);
      });
      gameState = "entering_zone";
    }
  }

  // Update camera — pre-allocated vectors
  const camX =
    Math.sin(cameraYaw) * Math.cos(cameraPitch) * CAM_DISTANCE;
  const camY = CAM_HEIGHT + Math.sin(cameraPitch) * CAM_DISTANCE * 0.6;
  const camZ =
    Math.cos(cameraYaw) * Math.cos(cameraPitch) * CAM_DISTANCE;

  _camTarget.copy(player.position);
  _camTarget.x += camX;
  _camTarget.y += camY;
  _camTarget.z += camZ;
  camera.position.lerp(_camTarget, 1 - Math.exp(-CAM_SMOOTHING * dt));

  _lookTarget.copy(player.position);
  _lookTarget.y += CAM_LOOKAT_HEIGHT;
  camera.lookAt(_lookTarget);
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
