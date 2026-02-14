import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { chapters } from "./chapters.js";
import { buildHallway, updateDoorMarkers, updateHallwayLights, HALLWAY_BOUNDS, DOOR_TRIGGER_RADIUS, getDoorPosition } from "./hub.js";
import { SceneManager } from "./sceneManager.js";
import { SequenceRunner } from "./sequenceRunner.js";

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
// THREE.JS RENDERER SETUP
// ========================================

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ========================================
// SCENE MANAGER
// ========================================

const sceneManager = new SceneManager(renderer);
const sequenceRunner = new SequenceRunner();

// ========================================
// HUB SCENE (Hotel Hallway)
// ========================================

const hubScene = new THREE.Scene();
const hubCamera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const { doors, markers, lights } = buildHallway(hubScene, chapters);

// ========================================
// PLAYER
// ========================================

const player = new THREE.Object3D();
player.position.set(0, 0, 4);
hubScene.add(player);

const gltfLoader = new GLTFLoader();
let characterModel = null;
let mixer = null;
let walkAction = null;
let isWalking = false;

gltfLoader.loadAsync("/models/avatar/snoopy.glb")
  .then((gltf) => {
    characterModel = gltf.scene;
    characterModel.scale.setScalar(2.5);
    characterModel.position.y = 0;
    player.add(characterModel);

    mixer = new THREE.AnimationMixer(characterModel);

    // Use embedded animations from the GLB (walk animation)
    if (gltf.animations && gltf.animations.length > 0) {
      const walkClip = gltf.animations[0];
      walkAction = mixer.clipAction(walkClip);
      walkAction.setLoop(THREE.LoopRepeat);
      walkAction.timeScale = 1.2;
    }
  })
  .catch((error) => {
    console.error("Error loading avatar:", error);
  });

// Register hub scene with scene manager
sceneManager.setHub({
  scene: hubScene,
  camera: hubCamera,
  update(dt) {
    // Hub-specific updates happen in the main update() function
  },
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
  if (e.button === 0 && (gameState === "hub" || gameState === "level_freeroam")) {
    mouse.dragging = true;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  }
});

window.addEventListener("mouseup", () => {
  mouse.dragging = false;
});

window.addEventListener("mousemove", (e) => {
  if (mouse.dragging && (gameState === "hub" || gameState === "level_freeroam")) {
    const dx = e.clientX - mouse.lastX;
    const dy = e.clientY - mouse.lastY;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;

    if (gameState === "level_freeroam") {
      const active = sceneManager.getActiveScene();
      if (active && active.handleMouseLook) active.handleMouseLook(dx, dy);
    } else {
      cameraYaw -= dx * 0.004;
      cameraPitch = THREE.MathUtils.clamp(
        cameraPitch - dy * 0.004,
        0.1,
        1.0
      );
    }
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
let cameraYaw = 0;
let cameraPitch = 0.3;

const MOVE_SPEED = 6.0;
const MOVE_ACCEL = 15.0;
const MOVE_DECEL = 10.0;
const TURN_SPEED = 8.0;

const CAM_DISTANCE = 9.0;
const CAM_HEIGHT = 5.0;
const CAM_LOOKAT_HEIGHT = 3.5;
const CAM_SMOOTHING = 10.0;
const CAM_STICK_SENSITIVITY = 3.0;

// Pre-allocated temp vectors
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

  // If we were in a level scene, clean up
  if (sceneManager.isInLevel()) {
    sequenceRunner.stop();

    // Move character back to hub
    if (characterModel) {
      player.add(characterModel);
    }

    sceneManager.exitLevel();
  }

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

  const chapter = chapters[currentChapterIndex];

  // If in a level scene, restart the sequence
  if (sceneManager.isInLevel() && chapter.sequence) {
    gameState = "level_sequence";
    // Re-run sequence from the choice beat (skip the cinematic intro, just show choice again)
    showChoicePanel(currentChapterIndex);
    return;
  }

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

function doDoorTransition(callback) {
  transitionOverlay.classList.remove("hidden");
  transitionOverlay.classList.add("door-open");

  setTimeout(() => {
    callback();
    transitionOverlay.classList.remove("door-open");
    transitionOverlay.classList.add("fade-out");

    setTimeout(() => {
      transitionOverlay.classList.add("hidden");
      transitionOverlay.classList.remove("fade-out");
    }, 600);
  }, 800);
}

function updateHud() {
  hudProgress.textContent = `${visitedChapters.size} / ${chapters.length}`;
}

function updateHudHint() {
  const nextIndex = getNextChapterIndex();
  if (nextIndex >= 0) {
    hudHint.textContent = `Walk towards the glowing door \u2014 ${chapters[nextIndex].title}`;
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
  player.position.set(0, 0, 4);
  playerVelocity.set(0, 0, 0);
  cameraYaw = 0;
  cameraPitch = 0.3;

  // Ensure we're back on hub
  if (sceneManager.isInLevel()) {
    sequenceRunner.stop();
    if (characterModel) {
      player.add(characterModel);
    }
    sceneManager.exitLevel();
  }

  finaleScreen.classList.add("hidden");
  gameHud.classList.add("hidden");
  welcomeScreen.classList.remove("hidden");
  welcomeScreen.classList.remove("fade-out");
}

// ========================================
// LEVEL ENTRY
// ========================================

async function enterLevel(chapterIndex) {
  const chapter = chapters[chapterIndex];

  if (!chapter.levelModule) {
    // No custom level — use traditional text panel flow
    doTransition(() => {
      showStoryPanel(chapterIndex);
    });
    gameState = "entering_zone";
    return;
  }

  // Custom level scene — do door transition
  gameState = "entering_zone";

  doDoorTransition(async () => {
    const levelScene = await sceneManager.enterLevel(chapter);

    if (!levelScene) {
      // Fallback if level failed to load
      showStoryPanel(chapterIndex);
      return;
    }

    // Move character model into the level scene
    if (characterModel) {
      player.remove(characterModel);
      if (levelScene.playerAnchor) {
        levelScene.playerAnchor.add(characterModel);
        characterModel.position.set(0, 0, 0);
        characterModel.rotation.set(0, 0, 0);
      } else {
        levelScene.scene.add(characterModel);
        characterModel.position.set(0, 0, 0);
      }
    }

    // Stop walking animation and pass it to the level's PlayerController
    if (walkAction && isWalking) {
      walkAction.fadeOut(0.3);
      isWalking = false;
    }

    // Pass walkAction to level so PlayerController can manage walk animation
    if (walkAction && levelScene.setWalkAction) {
      levelScene.setWalkAction(walkAction);
    }

    // Start the narrative sequence
    gameState = "level_sequence";

    sequenceRunner.onComplete = () => {
      // Sequence ended — if last beat was show_choice, choice panel is already showing
    };

    const seqContext = {
      scene: levelScene.scene,
      camera: levelScene.camera,
      player: levelScene.playerAnchor || characterModel,
      level: levelScene,
      setGameState: (newState) => { gameState = newState; },
      getInput: () => ({ keys, gamepad: getGamepadInput() }),
      onShowChoice: () => {
        showChoicePanel(chapterIndex);
      },
      onShowStory: () => {
        showStoryPanel(chapterIndex);
      },
    };

    sequenceRunner.start(chapter.sequence, seqContext);
  });
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
    if (gameState === "level_freeroam") {
      const active = sceneManager.getActiveScene();
      if (active && active.tryInteract) active.tryInteract();
    } else if (gameState === "level_sequence") {
      // Signal A key to sequence runner for key_prompt beats
      sequenceRunner.signal("key_a");
    } else if (gameState === "in_zone") {
      hideStoryPanel();
      showChoicePanel(currentChapterIndex);
    } else if (gameState === "choice") {
      const btns = choiceOptions.querySelectorAll(".choice-btn");
      if (btns[selectedChoiceIndex]) btns[selectedChoiceIndex].click();
    }
  }
  // B key handling for key_prompt beats (stop working, etc.)
  if (e.code === "KeyB" || e.code === "Escape") {
    if (gameState === "level_sequence") {
      sequenceRunner.signal("key_b");
    }
  }
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
  if (buttonJustPressed(0)) {
    if (gameState === "level_sequence") {
      // A button → signal key_a to sequence runner
      sequenceRunner.signal("key_a");
    } else if (gameState === "level_freeroam") {
      const active = sceneManager.getActiveScene();
      if (active && active.tryInteract) active.tryInteract();
    } else if (gameState === "welcome") {
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

  // B button (gamepad button 1) — signal to sequence runner
  if (buttonJustPressed(1)) {
    if (gameState === "level_sequence") {
      sequenceRunner.signal("key_b");
    }
  }

  if (buttonJustPressed(12)) {
    if (gameState === "choice") {
      const btns = choiceOptions.querySelectorAll(".choice-btn");
      selectedChoiceIndex =
        (selectedChoiceIndex - 1 + btns.length) % btns.length;
      updateChoiceHighlight();
    }
  }

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

  if (mixer) mixer.update(dt);

  // Handle gamepad buttons (poll → check → save)
  pollGamepadButtons();
  handleGamepadButtons();
  saveButtonState();

  // Welcome screen — slow camera dolly down the hallway
  if (gameState === "welcome") {
    const wt = elapsedTime * 0.12;
    hubCamera.position.set(
      Math.sin(wt * 0.3) * 0.5,
      3.0,
      3 + wt * 3
    );
    hubCamera.lookAt(0, 2.5, hubCamera.position.z + 10);

    // Loop the camera position to create endless hallway feel
    if (hubCamera.position.z > 140) {
      elapsedTime -= 140 / (0.12 * 3);
    }
    return;
  }

  // Level sequence — update the sequence runner
  if (gameState === "level_sequence") {
    sequenceRunner.update(dt);
    sceneManager.update(dt);
    return;
  }

  // Level free-roam — player controls the character in the level
  if (gameState === "level_freeroam") {
    const active = sceneManager.getActiveScene();
    if (active && active.handleInput) {
      const gp = getGamepadInput();
      let inputX = -gp.moveX;
      let inputZ = -gp.moveY;
      if (keys.KeyW || keys.ArrowUp) inputZ += 1;
      if (keys.KeyS || keys.ArrowDown) inputZ -= 1;
      if (keys.KeyA || keys.ArrowLeft) inputX += 1;
      if (keys.KeyD || keys.ArrowRight) inputX -= 1;
      active.handleInput({ inputX, inputZ, lookX: gp.lookX, lookY: gp.lookY }, dt);
    }
    sequenceRunner.update(dt);
    sceneManager.update(dt);
    return;
  }

  // Level active (after sequence, waiting for choice result, etc.)
  if (sceneManager.isInLevel()) {
    sceneManager.update(dt);
    return;
  }

  // Update door markers in hub
  updateDoorMarkers(markers, currentChapterIndex, visitedChapters, elapsedTime);

  // Update dynamic hall lights to follow player
  updateHallwayLights(lights, player.position.z);

  // Only process movement during hub state
  if (gameState !== "hub") return;

  const gp = getGamepadInput();

  let inputX = -gp.moveX;
  let inputZ = -gp.moveY;

  if (keys.KeyW || keys.ArrowUp) inputZ += 1;
  if (keys.KeyS || keys.ArrowDown) inputZ -= 1;
  if (keys.KeyA || keys.ArrowLeft) inputX += 1;
  if (keys.KeyD || keys.ArrowRight) inputX -= 1;

  inputX = THREE.MathUtils.clamp(inputX, -1, 1);
  inputZ = THREE.MathUtils.clamp(inputZ, -1, 1);

  // Camera orbit from gamepad
  if (gp.lookX !== 0 || gp.lookY !== 0) {
    cameraYaw -= gp.lookX * CAM_STICK_SENSITIVITY * dt;
    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch - gp.lookY * CAM_STICK_SENSITIVITY * dt,
      0.1,
      1.0
    );
  }

  // Movement direction (camera-relative)
  _moveDir.set(inputX, 0, inputZ);
  const moveLength = Math.min(_moveDir.length(), 1);
  const wasWalking = isWalking;

  if (moveLength > 0) {
    _moveDir.normalize();
    _moveDir.applyAxisAngle(_upAxis, -cameraYaw);
    _moveDir.multiplyScalar(MOVE_SPEED * moveLength);
    playerVelocity.lerp(_moveDir, 1 - Math.exp(-MOVE_ACCEL * dt));

    const targetRotation = Math.atan2(
      playerVelocity.x,
      playerVelocity.z
    );
    // Use angle wrapping to prevent spinning through the long way around
    let angleDiff = targetRotation - player.rotation.y;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    player.rotation.y += angleDiff * (1 - Math.exp(-TURN_SPEED * dt));

    isWalking = true;
  } else {
    playerVelocity.lerp(_zeroVec, 1 - Math.exp(-MOVE_DECEL * dt));
    isWalking = false;
  }

  // Walking animation
  if (walkAction) {
    if (isWalking && !wasWalking) {
      walkAction.reset();
      walkAction.fadeIn(0.2);
      walkAction.play();
    } else if (!isWalking && wasWalking) {
      walkAction.fadeOut(0.3);
    }
  }

  // Apply velocity
  _velDelta.copy(playerVelocity).multiplyScalar(dt);
  player.position.add(_velDelta);

  // Clamp player to hallway bounds
  player.position.x = THREE.MathUtils.clamp(
    player.position.x,
    HALLWAY_BOUNDS.minX,
    HALLWAY_BOUNDS.maxX
  );
  player.position.z = THREE.MathUtils.clamp(
    player.position.z,
    HALLWAY_BOUNDS.minZ,
    HALLWAY_BOUNDS.maxZ
  );

  // Check door triggers
  const nextChapter = chapters[currentChapterIndex];
  if (nextChapter) {
    const doorPos = getDoorPosition(currentChapterIndex);

    const dx = player.position.x - doorPos.x;
    const dz = player.position.z - doorPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < DOOR_TRIGGER_RADIUS) {
      enterLevel(currentChapterIndex);
    }
  }

  // Update camera — constrain yaw for hallway
  cameraYaw = THREE.MathUtils.clamp(cameraYaw, -Math.PI * 0.4, Math.PI * 0.4);

  const camX =
    Math.sin(cameraYaw) * Math.cos(cameraPitch) * CAM_DISTANCE;
  const camY = CAM_HEIGHT + Math.sin(cameraPitch) * CAM_DISTANCE * 0.5;
  const camZ =
    -Math.cos(cameraYaw) * Math.cos(cameraPitch) * CAM_DISTANCE;

  _camTarget.copy(player.position);
  _camTarget.x += camX;
  _camTarget.y += camY;
  _camTarget.z += camZ;
  hubCamera.position.lerp(_camTarget, 1 - Math.exp(-CAM_SMOOTHING * dt));

  _lookTarget.copy(player.position);
  _lookTarget.y += CAM_LOOKAT_HEIGHT;
  hubCamera.lookAt(_lookTarget);
}

// ========================================
// RENDER LOOP
// ========================================

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  update(dt);
  sceneManager.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener("resize", () => {
  const aspect = window.innerWidth / window.innerHeight;

  hubCamera.aspect = aspect;
  hubCamera.updateProjectionMatrix();

  // Also update active level camera if in a level
  const active = sceneManager.getActiveScene();
  if (active && active.camera && active.camera !== hubCamera) {
    active.camera.aspect = aspect;
    active.camera.updateProjectionMatrix();
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
});
