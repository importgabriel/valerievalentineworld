// ========================================
// OFFICE SCENE — JPMorgan office interior
// ========================================

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MATS, PALETTE } from "./constants.js";
import { createSkyBackdrop } from "../levelUtils.js";
import { createNPCSilhouette } from "./NPCSystem.js";

// Interaction point positions (exported for trigger setup)
export const INTERACTION_POINTS = {
  chair: new THREE.Vector3(0.3, 0, -0.8),
  computer: new THREE.Vector3(-0.3, 0.75, 0.5),
  phone: new THREE.Vector3(0.8, 0.77, 0.5),
};

// Office bounds for player movement
export const OFFICE_BOUNDS = {
  minX: -7,
  maxX: 7,
  minZ: -5,
  maxZ: 5,
};

export function buildOfficeScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyWarm);
  scene.fog = new THREE.Fog(PALETTE.skyWarm, 40, 80);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  const roomDims = createRoom(scene);
  createWindows(scene, roomDims);
  createCitySkyline(scene, roomDims);
  const furniture = createFurniture(scene);
  createOtherDesks(scene);
  createDecor(scene);
  createNPCWorkers(scene);
  const { sunLight } = createLighting(scene);

  return {
    scene,
    camera,
    furniture,
    sunLight,

    // Monitor mesh reference for overlay positioning
    monitorScreen: furniture.monitorScreen,
    phoneMesh: furniture.phone,

    update(dt) {
      // Could animate monitor glow, etc.
    },

    dispose() {
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    },
  };
}

function createRoom(scene) {
  const roomW = 16, roomH = 3.5, roomD = 12;

  // Floor (warm wood tone)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    MATS.officeFloor
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    MATS.officeCeiling
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomH;
  scene.add(ceiling);

  // Recessed light panels
  const lightGeos = [];
  for (let x = -4; x <= 4; x += 4) {
    for (let z = -3; z <= 3; z += 3) {
      const panel = new THREE.PlaneGeometry(1.8, 0.6);
      panel.rotateX(Math.PI / 2);
      panel.translate(x, roomH - 0.01, z);
      lightGeos.push(panel);
    }
  }
  if (lightGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(lightGeos), MATS.ceilingLight));
    lightGeos.forEach(g => g.dispose());
  }

  // Back wall
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomH),
    MATS.officeWall
  );
  backWall.position.set(0, roomH / 2, -roomD / 2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Side walls
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomD, roomH),
      MATS.officeWall
    );
    wall.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    wall.position.set(side * roomW / 2, roomH / 2, 0);
    wall.receiveShadow = true;
    scene.add(wall);
  }

  // Door wall (behind player start) with a door opening
  const doorWallLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW / 2 - 0.7, roomH),
    MATS.officeWall
  );
  doorWallLeft.rotation.y = Math.PI;
  doorWallLeft.position.set(-roomW / 4 - 0.35, roomH / 2, roomD / 2);
  scene.add(doorWallLeft);

  const doorWallRight = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW / 2 - 0.7, roomH),
    MATS.officeWall
  );
  doorWallRight.rotation.y = Math.PI;
  doorWallRight.position.set(roomW / 4 + 0.35, roomH / 2, roomD / 2);
  scene.add(doorWallRight);

  // Door frame
  const frameGeos = [];
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.3 });

  const leftJamb = new THREE.BoxGeometry(0.1, 2.6, 0.1);
  leftJamb.translate(-0.7, 1.3, roomD / 2 - 0.05);
  frameGeos.push(leftJamb);

  const rightJamb = new THREE.BoxGeometry(0.1, 2.6, 0.1);
  rightJamb.translate(0.7, 1.3, roomD / 2 - 0.05);
  frameGeos.push(rightJamb);

  const lintel = new THREE.BoxGeometry(1.5, 0.1, 0.1);
  lintel.translate(0, 2.6, roomD / 2 - 0.05);
  frameGeos.push(lintel);

  scene.add(new THREE.Mesh(mergeGeometries(frameGeos), frameMat));
  frameGeos.forEach(g => g.dispose());

  return { roomW, roomH, roomD };
}

function createWindows(scene, { roomW, roomH, roomD }) {
  const windowWallZ = -roomD / 2;

  // Window mullions
  const mullionGeos = [];
  const numPanels = 7;
  for (let i = 0; i <= numPanels; i++) {
    const x = -roomW / 2 + i * (roomW / numPanels);
    const g = new THREE.BoxGeometry(0.05, roomH, 0.03);
    g.translate(x, roomH / 2, windowWallZ);
    mullionGeos.push(g);
  }

  // Horizontal mullion
  const hMullion = new THREE.BoxGeometry(roomW, 0.05, 0.03);
  hMullion.translate(0, roomH * 0.4, windowWallZ);
  mullionGeos.push(hMullion);

  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.2, metalness: 0.6 });
  scene.add(new THREE.Mesh(mergeGeometries(mullionGeos), mullionMat));
  mullionGeos.forEach(g => g.dispose());

  // Glass
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW - 0.1, roomH - 0.1),
    MATS.windowGlass
  );
  glass.position.set(0, roomH / 2, windowWallZ - 0.01);
  scene.add(glass);
}

function createCitySkyline(scene, { roomD }) {
  const windowZ = -roomD / 2;

  // Near buildings
  const nearGeos = [];
  const litGeos = [];

  for (let i = 0; i < 12; i++) {
    const bx = -25 + i * 4.5 + (Math.random() - 0.5) * 1.5;
    const bh = 10 + Math.random() * 25;
    const bw = 2.5 + Math.random() * 2.5;
    const bd = 2 + Math.random() * 2;
    const bz = windowZ - 5 - Math.random() * 10;

    const g = new THREE.BoxGeometry(bw, bh, bd);
    g.translate(bx, bh / 2 - 2, bz);
    nearGeos.push(g);

    // Window lights
    const wRows = Math.floor(bh / 1.4);
    const wCols = Math.floor(bw / 0.9);
    for (let r = 0; r < Math.min(wRows, 12); r++) {
      for (let c = 0; c < Math.min(wCols, 4); c++) {
        if (Math.random() > 0.35) {
          const wx = bx - bw / 2 + 0.5 + c * 0.9;
          const wy = 0.5 + r * 1.4 - 2;
          const wg = new THREE.PlaneGeometry(0.35, 0.6);
          wg.translate(wx, wy, bz - bd / 2 - 0.01);
          litGeos.push(wg);
        }
      }
    }
  }

  if (nearGeos.length > 0) {
    const buildMat = new THREE.MeshStandardMaterial({ color: 0x889999, roughness: 0.7 });
    scene.add(new THREE.Mesh(mergeGeometries(nearGeos), buildMat));
    nearGeos.forEach(g => g.dispose());
  }
  if (litGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(litGeos), MATS.windowLit));
    litGeos.forEach(g => g.dispose());
  }

  // Warm sunset sky
  const sky = createSkyBackdrop([
    [0, "#88bbee"],
    [0.4, "#bbddee"],
    [0.65, "#ffeedd"],
    [0.8, "#ffcc88"],
    [0.92, "#ff9944"],
    [1, "#ff6622"],
  ], 200, 120);
  sky.position.set(0, 30, windowZ - 60);
  scene.add(sky);
}

function createFurniture(scene) {
  const group = new THREE.Group();

  // Player's desk — L-shaped
  const deskY = 0.75;
  const deskX = 0.3, deskZ = 0.5;

  // Main desktop
  const desktop = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.04, 1.0),
    MATS.deskWood
  );
  desktop.position.set(deskX, deskY, deskZ);
  desktop.castShadow = true;
  desktop.receiveShadow = true;
  group.add(desktop);

  // L-extension
  const extension = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.04, 0.6),
    MATS.deskWood
  );
  extension.position.set(deskX + 1.6, deskY, deskZ - 0.2);
  extension.castShadow = true;
  group.add(extension);

  // Desk legs (metal)
  const legGeos = [];
  const legPositions = [
    [deskX - 1.1, deskZ - 0.4],
    [deskX + 1.1, deskZ - 0.4],
    [deskX - 1.1, deskZ + 0.4],
    [deskX + 1.1, deskZ + 0.4],
    [deskX + 1.9, deskZ - 0.4],
    [deskX + 1.9, deskZ + 0.1],
  ];
  for (const [lx, lz] of legPositions) {
    const leg = new THREE.BoxGeometry(0.04, deskY, 0.04);
    leg.translate(lx, deskY / 2, lz);
    legGeos.push(leg);
  }
  group.add(new THREE.Mesh(mergeGeometries(legGeos), MATS.deskMetal));
  legGeos.forEach(g => g.dispose());

  // Office chair
  const chairX = 0.3, chairZ = -0.8;
  const chairGroup = createOfficeChair();
  chairGroup.position.set(chairX, 0, chairZ);
  group.add(chairGroup);

  // Monitor
  const monitorScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.45, 0.02),
    MATS.monitorScreen
  );
  monitorScreen.position.set(deskX - 0.3, deskY + 0.35, deskZ + 0.2);
  monitorScreen.castShadow = true;
  group.add(monitorScreen);

  // Monitor bezel
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.5, 0.025),
    MATS.monitorBlack
  );
  bezel.position.set(deskX - 0.3, deskY + 0.35, deskZ + 0.21);
  group.add(bezel);

  // Monitor stand
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.12),
    MATS.monitorBlack
  );
  stand.position.set(deskX - 0.3, deskY + 0.06, deskZ + 0.2);
  group.add(stand);

  // Monitor base
  const monBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.02, 0.18),
    MATS.monitorBlack
  );
  monBase.position.set(deskX - 0.3, deskY + 0.01, deskZ + 0.2);
  group.add(monBase);

  // Keyboard
  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.015, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 })
  );
  keyboard.position.set(deskX - 0.3, deskY + 0.02, deskZ - 0.05);
  group.add(keyboard);

  // Mouse
  const mouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.02, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 })
  );
  mouse.position.set(deskX + 0.15, deskY + 0.02, deskZ - 0.05);
  group.add(mouse);

  // Phone
  const phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.01, 0.16),
    MATS.phoneBlack
  );
  phone.position.set(deskX + 0.5, deskY + 0.01, deskZ);
  group.add(phone);

  // Coffee mug
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.03, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 })
  );
  mug.position.set(deskX + 0.8, deskY + 0.05, deskZ + 0.1);
  group.add(mug);

  scene.add(group);

  return { group, monitorScreen, phone };
}

function createOfficeChair() {
  const group = new THREE.Group();

  // Seat
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.05, 0.5),
    MATS.chairBlack
  );
  seat.position.y = 0.48;
  group.add(seat);

  // Backrest
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.5, 0.04),
    MATS.chairBlack
  );
  back.position.set(0, 0.75, -0.23);
  group.add(back);

  // Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.44, 6),
    MATS.chairBase
  );
  pedestal.position.y = 0.24;
  group.add(pedestal);

  // 5-spoke base
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.25),
      MATS.chairBase
    );
    spoke.position.set(Math.sin(angle) * 0.12, 0.02, Math.cos(angle) * 0.12);
    spoke.rotation.y = angle;
    group.add(spoke);

    // Wheel
    const wheel = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 4, 4),
      MATS.chairBase
    );
    wheel.position.set(Math.sin(angle) * 0.24, 0.02, Math.cos(angle) * 0.24);
    group.add(wheel);
  }

  return group;
}

function createOtherDesks(scene) {
  // 2 additional desks with basic furniture
  const deskConfigs = [
    { x: -4, z: 0.5 },
    { x: 4, z: 0.5 },
  ];

  const deskGeos = [];
  const legGeos = [];

  for (const cfg of deskConfigs) {
    const deskY = 0.75;

    // Desktop
    const dt = new THREE.BoxGeometry(2.0, 0.04, 0.9);
    dt.translate(cfg.x, deskY, cfg.z);
    deskGeos.push(dt);

    // Legs
    for (const [ox, oz] of [[-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35]]) {
      const leg = new THREE.BoxGeometry(0.04, deskY, 0.04);
      leg.translate(cfg.x + ox, deskY / 2, cfg.z + oz);
      legGeos.push(leg);
    }

    // Monitor placeholder
    const mon = new THREE.BoxGeometry(0.6, 0.4, 0.025);
    mon.translate(cfg.x, deskY + 0.35, cfg.z + 0.2);
    deskGeos.push(mon);
  }

  if (deskGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(deskGeos), MATS.deskWood));
    deskGeos.forEach(g => g.dispose());
  }
  if (legGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(legGeos), MATS.deskMetal));
    legGeos.forEach(g => g.dispose());
  }
}

function createDecor(scene) {
  const { roomW, roomD } = { roomW: 16, roomD: 12 };

  // Filing cabinets along back wall
  const cabinetGeos = [];
  for (let x = -6; x <= -3; x += 1.2) {
    const cab = new THREE.BoxGeometry(0.9, 1.2, 0.5);
    cab.translate(x, 0.6, -roomD / 2 + 0.4);
    cabinetGeos.push(cab);
  }
  if (cabinetGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(cabinetGeos), MATS.cabinetGray));
    cabinetGeos.forEach(g => g.dispose());
  }

  // Water cooler
  const coolerGroup = new THREE.Group();
  const coolerBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 1.0, 0.35),
    MATS.waterCooler
  );
  coolerBody.position.set(roomW / 2 - 1, 0.5, -roomD / 2 + 0.5);
  coolerGroup.add(coolerBody);

  const coolerBottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8),
    new THREE.MeshPhysicalMaterial({
      color: 0x88ccee,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
    })
  );
  coolerBottle.position.set(roomW / 2 - 1, 1.25, -roomD / 2 + 0.5);
  coolerGroup.add(coolerBottle);
  scene.add(coolerGroup);

  // Potted plants
  const plantPositions = [
    [roomW / 2 - 0.8, 0, roomD / 2 - 1],
    [-roomW / 2 + 0.8, 0, -roomD / 2 + 0.5],
    [3, 0, -roomD / 2 + 0.5],
  ];

  for (const [px, py, pz] of plantPositions) {
    const potGroup = new THREE.Group();

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.15, 0.35, 8),
      MATS.plantPot
    );
    pot.position.y = 0.175;
    potGroup.add(pot);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 6),
      MATS.plantGreen
    );
    leaves.position.y = 0.65;
    leaves.scale.y = 1.2;
    potGroup.add(leaves);

    potGroup.position.set(px, py, pz);
    scene.add(potGroup);
  }

  // Whiteboard on side wall
  const whiteboard = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  whiteboard.rotation.y = Math.PI / 2;
  whiteboard.position.set(-roomW / 2 + 0.02, 1.6, 0);
  scene.add(whiteboard);

  // Whiteboard frame
  const wbFrameGeos = [];
  const wbx = -roomW / 2 + 0.01;
  const wby = 1.6;
  const wbz = 0;

  const tbFrame = new THREE.BoxGeometry(0.04, 0.04, 2.1);
  tbFrame.translate(wbx, wby + 0.62, wbz);
  wbFrameGeos.push(tbFrame);

  const bbFrame = new THREE.BoxGeometry(0.04, 0.04, 2.1);
  bbFrame.translate(wbx, wby - 0.62, wbz);
  wbFrameGeos.push(bbFrame);

  const lFrame = new THREE.BoxGeometry(0.04, 1.28, 0.04);
  lFrame.translate(wbx, wby, wbz - 1.05);
  wbFrameGeos.push(lFrame);

  const rFrame = new THREE.BoxGeometry(0.04, 1.28, 0.04);
  rFrame.translate(wbx, wby, wbz + 1.05);
  wbFrameGeos.push(rFrame);

  if (wbFrameGeos.length > 0) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.3 });
    scene.add(new THREE.Mesh(mergeGeometries(wbFrameGeos), frameMat));
    wbFrameGeos.forEach(g => g.dispose());
  }
}

function createNPCWorkers(scene) {
  // 2 NPCs at other desks
  const npcConfigs = [
    { x: -4, z: -0.3, seated: true },
    { x: 4, z: -0.3, seated: true },
  ];

  npcConfigs.forEach(cfg => {
    const npc = createNPCSilhouette({ seated: cfg.seated });
    npc.position.set(cfg.x, 0, cfg.z);
    scene.add(npc);
  });
}

function createLighting(scene) {
  // Warm ambient
  const ambient = new THREE.AmbientLight(PALETTE.warmAmbient, 0.4);
  scene.add(ambient);

  // Warm directional (afternoon sun through windows)
  const sunLight = new THREE.DirectionalLight(PALETTE.warmLight, 0.6);
  sunLight.position.set(0, 5, -10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -10;
  sunLight.shadow.camera.right = 10;
  sunLight.shadow.camera.top = 5;
  sunLight.shadow.camera.bottom = -5;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 20;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  // Ceiling panel lights
  for (let x = -4; x <= 4; x += 4) {
    for (let z = -3; z <= 3; z += 3) {
      const light = new THREE.PointLight(PALETTE.warmLight, 0.25, 8, 2);
      light.position.set(x, 3.3, z);
      scene.add(light);
    }
  }

  // Monitor glow
  const monitorLight = new THREE.PointLight(0x4466aa, 0.15, 3, 2);
  monitorLight.position.set(0, 1.1, 0.5);
  scene.add(monitorLight);

  // Hemisphere for natural feel
  const hemi = new THREE.HemisphereLight(0xffeedd, 0xddc8a0, 0.25);
  scene.add(hemi);

  return { sunLight };
}
