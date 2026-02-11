// ========================================
// LEVEL 01 — THE FOLLOW REQUEST
// ========================================
// Scene: Modern skyscraper office at evening.
// Floor-to-ceiling windows overlooking a city skyline.
// Character at a desk. Notification bubble rises above head.
// Surprise reaction. Then choice.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { disposeScene, createSkyBackdrop } from "./levelUtils.js";

// ========================================
// MATERIALS
// ========================================

const M = {
  floor: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.15 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.95 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.8 }),
  windowFrame: new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.2, metalness: 0.8 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.12,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }),
  deskTop: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 }),
  deskLeg: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.4 }),
  chair: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }),
  chairBase: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.3 }),
  phone: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.3 }),
  monitor: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, metalness: 0.3 }),
  monitorScreen: new THREE.MeshStandardMaterial({
    color: 0x001133,
    emissive: 0x003366,
    emissiveIntensity: 0.3,
  }),
  buildingDark: new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 }),
  buildingMid: new THREE.MeshStandardMaterial({ color: 0x252545, roughness: 0.8 }),
  buildingFar: new THREE.MeshStandardMaterial({ color: 0x303055, roughness: 0.8 }),
};

// ========================================
// ROOM
// ========================================

function createRoom(scene) {
  const roomW = 10;
  const roomH = 3.5;
  const roomD = 8;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  scene.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), M.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, roomH, 0);
  scene.add(ceiling);

  // Recessed light panels in ceiling
  const lightPanelGeos = [];
  for (let i = -1; i <= 1; i++) {
    const g = new THREE.PlaneGeometry(1.8, 0.4);
    g.rotateX(Math.PI / 2);
    g.translate(i * 3, roomH - 0.01, 0);
    lightPanelGeos.push(g);
  }
  const lightPanelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.6,
  });
  scene.add(new THREE.Mesh(mergeGeometries(lightPanelGeos), lightPanelMat));
  lightPanelGeos.forEach(g => g.dispose());

  // Back wall
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), M.wall);
  backWall.position.set(0, roomH / 2, -roomD / 2);
  scene.add(backWall);

  // Side walls
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), M.wall);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-roomW / 2, roomH / 2, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), M.wall);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(roomW / 2, roomH / 2, 0);
  scene.add(rightWall);

  return { roomW, roomH, roomD };
}

// ========================================
// FLOOR-TO-CEILING WINDOWS
// ========================================

function createWindows(scene, roomW, roomH, roomD) {
  const windowWallZ = roomD / 2;

  // Window mullions (vertical + horizontal)
  const mullionGeos = [];

  // 5 vertical mullions
  for (let i = 0; i < 5; i++) {
    const x = -roomW / 2 + (i + 0.5) * (roomW / 5);
    const g = new THREE.BoxGeometry(0.06, roomH, 0.04);
    g.translate(x, roomH / 2, windowWallZ);
    mullionGeos.push(g);
  }

  // 1 horizontal mullion at mid height
  const hMullion = new THREE.BoxGeometry(roomW, 0.06, 0.04);
  hMullion.translate(0, roomH / 2, windowWallZ);
  mullionGeos.push(hMullion);

  // Top and bottom frame
  const topFrame = new THREE.BoxGeometry(roomW, 0.08, 0.04);
  topFrame.translate(0, roomH - 0.04, windowWallZ);
  mullionGeos.push(topFrame);

  const botFrame = new THREE.BoxGeometry(roomW, 0.08, 0.04);
  botFrame.translate(0, 0.04, windowWallZ);
  mullionGeos.push(botFrame);

  // Side frames
  for (const side of [-1, 1]) {
    const sf = new THREE.BoxGeometry(0.08, roomH, 0.04);
    sf.translate(side * roomW / 2, roomH / 2, windowWallZ);
    mullionGeos.push(sf);
  }

  scene.add(new THREE.Mesh(mergeGeometries(mullionGeos), M.windowFrame));
  mullionGeos.forEach(g => g.dispose());

  // Glass panels
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW - 0.1, roomH - 0.1),
    M.glass
  );
  glass.position.set(0, roomH / 2, windowWallZ - 0.01);
  scene.add(glass);
}

// ========================================
// CITY SKYLINE
// ========================================

function createCitySkyline(scene, roomD) {
  const windowZ = roomD / 2;

  // Layer 1: Near buildings (silhouettes with lit windows)
  const nearGeos = [];
  const windowLitGeos = [];
  const windowDarkGeos = [];

  for (let i = 0; i < 10; i++) {
    const bx = -20 + i * 4.2 + (Math.random() - 0.5) * 1.5;
    const bh = 8 + Math.random() * 25;
    const bw = 2 + Math.random() * 2.5;
    const bd = 2 + Math.random() * 2;
    const bz = windowZ + 4 + Math.random() * 8;

    const g = new THREE.BoxGeometry(bw, bh, bd);
    g.translate(bx, bh / 2 - 3, bz);
    nearGeos.push(g);

    // Window grid on front face
    const wRows = Math.floor(bh / 1.2);
    const wCols = Math.floor(bw / 0.8);
    for (let r = 0; r < wRows; r++) {
      for (let c = 0; c < wCols; c++) {
        const wx = bx - bw / 2 + 0.4 + c * 0.8;
        const wy = 0.5 + r * 1.2 - 3;
        const wg = new THREE.PlaneGeometry(0.35, 0.5);
        wg.translate(wx, wy, bz - bd / 2 - 0.01);

        if (Math.random() > 0.3) {
          windowLitGeos.push(wg);
        } else {
          windowDarkGeos.push(wg);
        }
      }
    }
  }

  if (nearGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(nearGeos), M.buildingDark));
    nearGeos.forEach(g => g.dispose());
  }

  if (windowLitGeos.length > 0) {
    const litMat = new THREE.MeshStandardMaterial({
      color: 0xfff8dc,
      emissive: 0xffd700,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.9,
    });
    scene.add(new THREE.Mesh(mergeGeometries(windowLitGeos), litMat));
    windowLitGeos.forEach(g => g.dispose());
  }

  if (windowDarkGeos.length > 0) {
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a15,
      roughness: 0.9,
    });
    scene.add(new THREE.Mesh(mergeGeometries(windowDarkGeos), darkMat));
    windowDarkGeos.forEach(g => g.dispose());
  }

  // Layer 2: Mid-distance buildings
  const midGeos = [];
  for (let i = 0; i < 15; i++) {
    const bx = -30 + i * 4.5 + (Math.random() - 0.5) * 2;
    const bh = 12 + Math.random() * 30;
    const bw = 3 + Math.random() * 3;
    const bd = 3 + Math.random() * 2;
    const bz = windowZ + 15 + Math.random() * 15;

    const g = new THREE.BoxGeometry(bw, bh, bd);
    g.translate(bx, bh / 2 - 3, bz);
    midGeos.push(g);
  }
  if (midGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(midGeos), M.buildingMid));
    midGeos.forEach(g => g.dispose());
  }

  // Layer 3: Far skyline (simplified blocks)
  const farGeos = [];
  for (let i = 0; i < 20; i++) {
    const bx = -45 + i * 5 + (Math.random() - 0.5) * 3;
    const bh = 15 + Math.random() * 40;
    const bw = 4 + Math.random() * 4;
    const bd = 4 + Math.random() * 3;
    const bz = windowZ + 35 + Math.random() * 20;

    const g = new THREE.BoxGeometry(bw, bh, bd);
    g.translate(bx, bh / 2 - 3, bz);
    farGeos.push(g);
  }
  if (farGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(farGeos), M.buildingFar));
    farGeos.forEach(g => g.dispose());
  }

  // Sky gradient backdrop
  const sky = createSkyBackdrop([
    [0, "#0a0a2e"],
    [0.5, "#1a1a4e"],
    [0.75, "#4a2040"],
    [0.88, "#ff6b4a"],
    [1, "#ffb347"],
  ], 200, 120);
  sky.position.set(0, 25, windowZ + 70);
  scene.add(sky);
}

// ========================================
// OFFICE FURNITURE
// ========================================

function createFurniture(scene, roomD) {
  const group = new THREE.Group();

  // Desk — positioned center-ish, facing the windows
  const deskY = 0.75;
  const deskW = 2.2;
  const deskD = 0.9;
  const deskX = 0.3;
  const deskZ = 0.5;

  // Desktop
  const desktop = new THREE.Mesh(
    new THREE.BoxGeometry(deskW, 0.04, deskD),
    M.deskTop
  );
  desktop.position.set(deskX, deskY, deskZ);
  group.add(desktop);

  // Desk legs
  const legPositions = [
    [deskX - deskW / 2 + 0.08, deskZ - deskD / 2 + 0.08],
    [deskX + deskW / 2 - 0.08, deskZ - deskD / 2 + 0.08],
    [deskX - deskW / 2 + 0.08, deskZ + deskD / 2 - 0.08],
    [deskX + deskW / 2 - 0.08, deskZ + deskD / 2 - 0.08],
  ];

  const legGeos = legPositions.map(([lx, lz]) => {
    const g = new THREE.BoxGeometry(0.04, deskY, 0.04);
    g.translate(lx, deskY / 2, lz);
    return g;
  });
  group.add(new THREE.Mesh(mergeGeometries(legGeos), M.deskLeg));
  legGeos.forEach(g => g.dispose());

  // Chair — behind the desk (between desk and back wall)
  const chairX = deskX;
  const chairZ = deskZ - 0.8;

  // Seat
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.05, 0.5),
    M.chair
  );
  seat.position.set(chairX, 0.48, chairZ);
  group.add(seat);

  // Chair back
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.45, 0.04),
    M.chair
  );
  back.position.set(chairX, 0.73, chairZ - 0.23);
  group.add(back);

  // Chair pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6),
    M.chairBase
  );
  pedestal.position.set(chairX, 0.225, chairZ);
  group.add(pedestal);

  // Chair base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.25, 0.03, 8),
    M.chairBase
  );
  base.position.set(chairX, 0.015, chairZ);
  group.add(base);

  // Phone on desk
  const phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.01, 0.15),
    M.phone
  );
  phone.position.set(deskX + 0.5, deskY + 0.01, deskZ);
  group.add(phone);

  // Monitor
  const monitorScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.4, 0.02),
    M.monitorScreen
  );
  monitorScreen.position.set(deskX - 0.3, deskY + 0.35, deskZ + 0.15);
  group.add(monitorScreen);

  // Monitor bezel
  const monitorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.45, 0.025),
    M.monitor
  );
  monitorFrame.position.set(deskX - 0.3, deskY + 0.35, deskZ + 0.16);
  group.add(monitorFrame);

  // Monitor stand
  const monStand = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.12),
    M.monitor
  );
  monStand.position.set(deskX - 0.3, deskY + 0.06, deskZ + 0.15);
  group.add(monStand);

  scene.add(group);
  return group;
}

// ========================================
// LIGHTING
// ========================================

function createLevelLighting(scene) {
  // Soft office ambient
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Overhead ceiling light
  const ceilingLight = new THREE.PointLight(0xffffff, 0.6, 12, 1.5);
  ceilingLight.position.set(0, 3.2, 0);
  scene.add(ceilingLight);

  // Warm window light from outside (evening)
  const windowLight = new THREE.DirectionalLight(0xffa060, 0.4);
  windowLight.position.set(0, 2, 10);
  scene.add(windowLight);

  // Subtle fill from the side
  const fillLight = new THREE.PointLight(0xffd0a0, 0.2, 8, 2);
  fillLight.position.set(-3, 2, 0);
  scene.add(fillLight);
}

// ========================================
// CREATE LEVEL (exported)
// ========================================

export function create(chapter) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a2e);
  scene.fog = new THREE.Fog(0x0a0a2e, 50, 100);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(4, 3, -3);
  camera.lookAt(0, 1.2, 0);

  // Build scene
  const { roomW, roomH, roomD } = createRoom(scene);
  createWindows(scene, roomW, roomH, roomD);
  createCitySkyline(scene, roomD);
  createFurniture(scene, roomD);
  createLevelLighting(scene);

  // Player reference point (where character model will be placed)
  const playerAnchor = new THREE.Object3D();
  playerAnchor.position.set(0.3, 0, -0.3);
  playerAnchor.rotation.y = Math.PI * 0.7; // facing slightly toward camera
  scene.add(playerAnchor);

  return {
    scene,
    camera,
    playerAnchor,

    update(dt) {
      // Level-specific per-frame updates (if any)
      // City window lights could flicker here, etc.
    },

    cleanup() {
      disposeScene(scene);
    },
  };
}
