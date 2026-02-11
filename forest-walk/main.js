import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { chapters } from "./chapters.js";
import { buildCity, createRainSystem, updateEntranceMarkers } from "./city.js";

// ========================================
// GAME STATE
// ========================================

let gameState = "welcome"; // "welcome" | "hub" | "entering_zone" | "in_zone" | "choice" | "choice_result" | "finale"
let currentChapterIndex = 0;
let visitedChapters = new Set();
let elapsedTime = 0;
let lastChoiceCorrect = false;
let choiceResponseText = "";

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
// THREE.JS SCENE SETUP
// ========================================

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x080c18, 10, 70);
scene.background = new THREE.Color(0x060a14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

// ========================================
// LIGHTING — Dark rainy city
// ========================================

// Cool moonlight from above
const moonLight = new THREE.DirectionalLight(0x4466aa, 0.3);
moonLight.position.set(5, 15, 10);
scene.add(moonLight);

// Dim ambient — blue-gray
const ambient = new THREE.AmbientLight(0x1a1a30, 0.4);
scene.add(ambient);

// Hemisphere — cool sky, dark ground
const hemi = new THREE.HemisphereLight(0x223355, 0x0a0a15, 0.3);
scene.add(hemi);

// ========================================
// BUILD CITY
// ========================================

const { storyBuildings, entranceMarkers } = buildCity(scene, chapters);

// ========================================
// RAIN SYSTEM
// ========================================

const rain = createRainSystem(scene, 800);

// ========================================
// PLAYER
// ========================================

const player = new THREE.Object3D();
player.position.set(0, 0, -3);
scene.add(player);

// Character model + animation
const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
let characterModel = null;
let mixer = null;
let walkAction = null;
let isWalking = false;

gltfLoader.load(
  "/models/avatar/valerie1.glb",
  (gltf) => {
    characterModel = gltf.scene;
    characterModel.scale.setScalar(1.0);
    characterModel.position.y = 0;
    player.add(characterModel);
    console.log("Character loaded!");

    // Create animation mixer
    mixer = new THREE.AnimationMixer(characterModel);

    // Load walking animation
    fbxLoader.load(
      "/models/animations/Walking.fbx",
      (fbx) => {
        if (fbx.animations && fbx.animations.length > 0) {
          const walkClip = fbx.animations[0];
          walkAction = mixer.clipAction(walkClip);
          walkAction.setLoop(THREE.LoopRepeat);
          walkAction.timeScale = 1.2;
          console.log("Walking animation loaded!");
        }
      },
      undefined,
      (error) => {
        console.error("Error loading walking animation:", error);
      }
    );
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

  // Change the continue button to say "Make Your Choice"
  panelContinue.innerHTML = "Make Your Choice <span>&#10140;</span>";
  storyPanel.classList.remove("hidden");
}

function hideStoryPanel() {
  storyPanel.classList.add("hidden");
}

function showChoicePanel(index) {
  const chapter = chapters[index];
  gameState = "choice";

  choicePrompt.textContent = chapter.choicePrompt;
  choiceOptions.innerHTML = "";

  // Shuffle choices for presentation (but track correct)
  const shuffled = [...chapter.choices].sort(() => Math.random() - 0.5);

  shuffled.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice.text;
    btn.addEventListener("click", () => handleChoice(choice, index));
    choiceOptions.appendChild(btn);
  });

  choicePanel.classList.remove("hidden");
}

function handleChoice(choice, chapterIndex) {
  choicePanel.classList.add("hidden");
  lastChoiceCorrect = choice.correct;
  choiceResponseText = choice.response;
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

  // Check if all chapters visited
  if (visitedChapters.size === chapters.length) {
    setTimeout(() => {
      gameState = "finale";
      gameHud.classList.add("hidden");
      finaleScreen.classList.remove("hidden");
    }, 500);
    return;
  }

  // Move to next chapter
  currentChapterIndex = getNextChapterIndex();

  // Transition back to hub
  doTransition(() => {
    gameState = "hub";
    updateHudHint();
  });
}

function retryChapter() {
  wrongChoiceOverlay.classList.add("hidden");

  // Transition and re-enter the zone
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
  hudProgress.textContent = `Chapters: ${visitedChapters.size} / ${chapters.length}`;
}

function updateHudHint() {
  const nextIndex = getNextChapterIndex();
  if (nextIndex >= 0) {
    hudHint.textContent = `Walk towards the glowing entrance — ${chapters[nextIndex].title}`;
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

// Allow spacebar/enter to advance
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "Enter") {
    if (gameState === "in_zone") {
      hideStoryPanel();
      showChoicePanel(currentChapterIndex);
    }
  }
});

// ========================================
// UPDATE
// ========================================

function update(dt) {
  elapsedTime += dt;

  // Update rain
  rain.update(dt, player.position);

  // Update animation mixer
  if (mixer) {
    mixer.update(dt);
  }

  // Update entrance markers
  updateEntranceMarkers(entranceMarkers, currentChapterIndex, visitedChapters, elapsedTime);

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
  if (gameState !== "hub") {
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

  // Movement direction (camera-relative)
  const moveDir = new THREE.Vector3(inputX, 0, inputZ);
  const moveLength = Math.min(moveDir.length(), 1);
  const wasWalking = isWalking;

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

    isWalking = true;
  } else {
    playerVelocity.lerp(
      new THREE.Vector3(),
      1 - Math.exp(-MOVE_DECEL * dt)
    );
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

  player.position.add(playerVelocity.clone().multiplyScalar(dt));

  // Clamp player to city bounds
  player.position.x = THREE.MathUtils.clamp(player.position.x, -10, 10);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -5, 160);

  // Check entrance triggers
  const nextChapter = chapters[currentChapterIndex];
  if (nextChapter) {
    // Entrance marker position
    const side = currentChapterIndex % 2 === 0 ? -1 : 1;
    const entranceX = side * 7;
    const entranceZ = nextChapter.hubPosition.z;

    const dx = player.position.x - entranceX;
    const dz = player.position.z - entranceZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < TRIGGER_RADIUS) {
      // Enter zone
      doTransition(() => {
        showStoryPanel(currentChapterIndex);
      });
      gameState = "entering_zone"; // Prevent re-triggering
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
