import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fb7a6, 10, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

const hemi = new THREE.HemisphereLight(0xdde7ff, 0x6b7d5a, 0.9);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(8, 12, 6);
scene.add(dir);

const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x6f8f6a, roughness: 1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

function addTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 2, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 })
  );
  trunk.position.set(x, 1, z);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 2.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x4f7a4f, roughness: 1 })
  );
  crown.position.set(x, 3, z);

  scene.add(trunk, crown);
}
for (let i = 0; i < 40; i++) {
  addTree((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80);
}

const player = new THREE.Object3D();
player.position.set(0, 0, 0);
scene.add(player);

// Load character
const loader = new GLTFLoader();
let characterModel = null;

loader.load(
  '/models/avatar/valerie1.glb',
  (gltf) => {
    characterModel = gltf.scene;
    characterModel.scale.setScalar(1.0);
    characterModel.position.y = 0;
    player.add(characterModel);
    console.log('Character loaded!');
  },
  (progress) => {
    console.log('Loading...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
  },
  (error) => {
    console.error('Error loading character:', error);
  }
);

// ========================================
// INPUT STATE
// ========================================

const keys = {};
window.addEventListener("keydown", (e) => keys[e.code] = true);
window.addEventListener("keyup", (e) => keys[e.code] = false);

const mouse = { dragging: false, lastX: 0, lastY: 0 };

window.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    mouse.dragging = true;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  }
});

window.addEventListener("mouseup", () => {
  mouse.dragging = false;
});

window.addEventListener("mousemove", (e) => {
  if (mouse.dragging) {
    const dx = e.clientX - mouse.lastX;
    const dy = e.clientY - mouse.lastY;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
    
    cameraYaw -= dx * 0.004;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy * 0.004, 0.1, 1.3);
  }
});

function getGamepadInput() {
  const gp = navigator.getGamepads()?.[0];
  if (!gp) return { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };
  
  const deadzone = (v, threshold = 0.15) => {
    return Math.abs(v) < threshold ? 0 : (Math.abs(v) - threshold) / (1 - threshold) * Math.sign(v);
  };
  
  return {
    moveX: deadzone(gp.axes[0]),
    moveY: deadzone(gp.axes[1]),
    lookX: deadzone(gp.axes[2]),
    lookY: deadzone(gp.axes[3])
  };
}

// ========================================
// PLAYER & CAMERA STATE
// ========================================

const playerVelocity = new THREE.Vector3();
let cameraYaw = 0;
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

// ========================================
// UPDATE
// ========================================

function update(dt) {
  const gp = getGamepadInput();
  
  // Gather movement input
  let inputX = gp.moveX;
  let inputZ = gp.moveY;
  
  if (keys.KeyW) inputZ -= 1;
  if (keys.KeyS) inputZ += 1;
  if (keys.KeyA) inputX -= 1;
  if (keys.KeyD) inputX += 1;
  
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
    playerVelocity.lerp(new THREE.Vector3(), 1 - Math.exp(-MOVE_DECEL * dt));
  }
  
  player.position.add(playerVelocity.clone().multiplyScalar(dt));
  
  // Update camera
  const camX = Math.sin(cameraYaw) * Math.cos(cameraPitch) * CAM_DISTANCE;
  const camY = CAM_HEIGHT + Math.sin(cameraPitch) * CAM_DISTANCE * 0.6;
  const camZ = Math.cos(cameraYaw) * Math.cos(cameraPitch) * CAM_DISTANCE;
  
  const targetCamPos = player.position.clone().add(new THREE.Vector3(camX, camY, camZ));
  camera.position.lerp(targetCamPos, 1 - Math.exp(-CAM_SMOOTHING * dt));
  
  const lookTarget = player.position.clone().add(new THREE.Vector3(0, CAM_LOOKAT_HEIGHT, 0));
  camera.lookAt(lookTarget);
}

// ========================================
// LOOP
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