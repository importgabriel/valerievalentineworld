// ========================================
// SUBWAY SCENE — Cinematic NYC subway car interior
// ========================================

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MATS, PALETTE } from "./constants.js";
import { createNPCSilhouette } from "./NPCSystem.js";

export function buildSubwayScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a22);
  scene.fog = new THREE.FogExp2(0x1a1a22, 0.04);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.6, -8);
  camera.lookAt(0, 1.5, 10);

  buildCarInterior(scene);
  addSeats(scene);
  addHandrails(scene);
  addWindows(scene);
  addDoors(scene);
  addNPCs(scene);
  addLighting(scene);

  // Sway timer for train motion simulation
  let swayTime = 0;
  const baseCamY = 1.6;

  return {
    scene,
    camera,
    update(dt) {
      swayTime += dt;
      // Gentle sway to simulate train motion
      camera.position.y = baseCamY + Math.sin(swayTime * 1.5) * 0.015;
      camera.position.x = Math.sin(swayTime * 0.8) * 0.01;
      camera.rotation.z = Math.sin(swayTime * 1.2) * 0.003;
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

function buildCarInterior(scene) {
  const carLen = 20, carW = 3, carH = 2.6;

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(carW, carLen),
    MATS.subwayFloor
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, carLen / 2 - 5);
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(carW, carLen),
    MATS.subwayCeiling
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, carH, carLen / 2 - 5);
  scene.add(ceiling);

  // Walls (between windows)
  const wallGeos = [];
  const halfW = carW / 2;

  // Bottom wall strip (below windows)
  for (const side of [-1, 1]) {
    const wallBottom = new THREE.PlaneGeometry(carLen, 0.8);
    wallBottom.rotateY(side === -1 ? Math.PI / 2 : -Math.PI / 2);
    wallBottom.translate(side * halfW, 0.4, carLen / 2 - 5);
    wallGeos.push(wallBottom);

    // Top wall strip (above windows)
    const wallTop = new THREE.PlaneGeometry(carLen, 0.6);
    wallTop.rotateY(side === -1 ? Math.PI / 2 : -Math.PI / 2);
    wallTop.translate(side * halfW, carH - 0.3, carLen / 2 - 5);
    wallGeos.push(wallTop);
  }

  if (wallGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(wallGeos), MATS.subwayWall));
    wallGeos.forEach(g => g.dispose());
  }

  // End walls
  const endWall1 = new THREE.Mesh(new THREE.PlaneGeometry(carW, carH), MATS.subwayMetalDark);
  endWall1.position.set(0, carH / 2, -5);
  scene.add(endWall1);

  const endWall2 = new THREE.Mesh(new THREE.PlaneGeometry(carW, carH), MATS.subwayMetalDark);
  endWall2.rotation.y = Math.PI;
  endWall2.position.set(0, carH / 2, carLen - 5);
  scene.add(endWall2);

  // Fluorescent light strips on ceiling
  const lightGeos = [];
  for (let z = -3; z < carLen - 5; z += 3) {
    const lightPanel = new THREE.PlaneGeometry(0.3, 2.0);
    lightPanel.rotateX(Math.PI / 2);
    lightPanel.translate(0, carH - 0.01, z);
    lightGeos.push(lightPanel);
  }
  if (lightGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(lightGeos), MATS.subwayFluorescent));
    lightGeos.forEach(g => g.dispose());
  }

  // Floor edge trim (metal strip)
  const trimGeos = [];
  for (const side of [-1, 1]) {
    const trim = new THREE.BoxGeometry(0.04, 0.03, carLen);
    trim.translate(side * (halfW - 0.02), 0.015, carLen / 2 - 5);
    trimGeos.push(trim);
  }
  if (trimGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(trimGeos), MATS.subwayMetal));
    trimGeos.forEach(g => g.dispose());
  }
}

function addSeats(scene) {
  const carW = 3, halfW = carW / 2;
  const seatGeos = [];
  const cushionGeos = [];

  // Row seats along each wall
  for (const side of [-1, 1]) {
    for (let z = -3; z < 13; z += 2.0) {
      // Seat base
      const seatBase = new THREE.BoxGeometry(0.55, 0.04, 0.45);
      seatBase.translate(side * (halfW - 0.35), 0.45, z);
      seatGeos.push(seatBase);

      // Seat back
      const seatBack = new THREE.BoxGeometry(0.04, 0.4, 0.45);
      seatBack.translate(side * (halfW - 0.08), 0.67, z);
      seatGeos.push(seatBack);

      // Cushion
      const cushion = new THREE.BoxGeometry(0.48, 0.06, 0.4);
      cushion.translate(side * (halfW - 0.35), 0.49, z);
      cushionGeos.push(cushion);
    }
  }

  if (seatGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(seatGeos), MATS.subwayMetal));
    seatGeos.forEach(g => g.dispose());
  }
  if (cushionGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(cushionGeos), MATS.subwaySeatCushion));
    cushionGeos.forEach(g => g.dispose());
  }
}

function addHandrails(scene) {
  const carW = 3, carH = 2.6, halfW = carW / 2;
  const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, carH, 6);
  const poleMat = MATS.subwayMetal;

  // Vertical poles
  const polePositions = [];
  for (const x of [-0.8, 0.8]) {
    for (let z = -3; z < 14; z += 4) {
      polePositions.push([x, z]);
    }
  }

  const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, polePositions.length);
  const m = new THREE.Matrix4();
  polePositions.forEach(([x, z], i) => {
    m.makeTranslation(x, carH / 2, z);
    poleMesh.setMatrixAt(i, m);
  });
  scene.add(poleMesh);

  // Horizontal overhead rail
  const railGeos = [];
  for (const x of [-0.8, 0.8]) {
    const rail = new THREE.CylinderGeometry(0.015, 0.015, 18, 6);
    rail.rotateX(Math.PI / 2);
    rail.translate(x, carH - 0.3, 5);
    railGeos.push(rail);
  }
  if (railGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(railGeos), poleMat));
    railGeos.forEach(g => g.dispose());
  }
}

function addWindows(scene) {
  const carW = 3, halfW = carW / 2;
  const windowGeos = [];

  for (const side of [-1, 1]) {
    for (let z = -2; z < 13; z += 3) {
      const window = new THREE.PlaneGeometry(2.2, 1.0);
      window.rotateY(side === -1 ? Math.PI / 2 : -Math.PI / 2);
      window.translate(side * (halfW - 0.01), 1.3, z);
      windowGeos.push(window);
    }
  }

  if (windowGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(windowGeos), MATS.subwayWindow));
    windowGeos.forEach(g => g.dispose());
  }

  // Occasional tunnel light flash (emissive planes outside windows)
  const flashGeos = [];
  for (let z = -1; z < 13; z += 6) {
    for (const side of [-1, 1]) {
      const flash = new THREE.PlaneGeometry(0.5, 0.3);
      flash.rotateY(side === -1 ? Math.PI / 2 : -Math.PI / 2);
      flash.translate(side * (halfW + 0.5), 1.5, z);
      flashGeos.push(flash);
    }
  }
  if (flashGeos.length > 0) {
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.3,
    });
    scene.add(new THREE.Mesh(mergeGeometries(flashGeos), flashMat));
    flashGeos.forEach(g => g.dispose());
  }
}

function addDoors(scene) {
  const carW = 3, halfW = carW / 2, carH = 2.6;
  const doorGeos = [];

  // Doors at specific positions on each side
  for (const side of [-1, 1]) {
    for (const z of [-4, 5.5, 14]) {
      // Two sliding door panels
      for (const offset of [-0.35, 0.35]) {
        const door = new THREE.BoxGeometry(0.03, 2.0, 0.6);
        door.translate(side * (halfW - 0.02), 1.1, z + offset);
        doorGeos.push(door);
      }
      // Door frame
      const frame = new THREE.BoxGeometry(0.05, 2.1, 0.08);
      frame.translate(side * (halfW - 0.025), 1.1, z - 0.68);
      doorGeos.push(frame);
      const frame2 = frame.clone();
      frame2.translate(0, 0, 1.36);
      doorGeos.push(frame2);
    }
  }

  if (doorGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(doorGeos), MATS.subwayDoor));
    doorGeos.forEach(g => g.dispose());
  }
}

function addNPCs(scene) {
  // 8 NPCs: mix of seated and standing
  const npcConfigs = [
    { x: -1.15, z: -1, seated: true },
    { x: -1.15, z: 1, seated: true },
    { x: 1.15, z: 0, seated: true },
    { x: 1.15, z: 3, seated: true },
    { x: 1.15, z: 7, seated: true },
    { x: -0.5, z: 4, seated: false },
    { x: 0.3, z: 8, seated: false },
    { x: -0.6, z: 10, seated: false },
  ];

  const colors = [0x445566, 0x554455, 0x556655, 0x665544, 0x445555, 0x555566, 0x664455, 0x556644];

  npcConfigs.forEach((cfg, i) => {
    const npc = createNPCSilhouette({ seated: cfg.seated, color: colors[i % colors.length] });
    npc.position.set(cfg.x, 0, cfg.z);
    if (!cfg.seated) {
      // Standing NPCs face random direction
      npc.rotation.y = Math.random() * Math.PI * 2;
    }
    scene.add(npc);
  });
}

function addLighting(scene) {
  // Warm fluorescent ambient
  const ambient = new THREE.AmbientLight(PALETTE.warmAmbient, 0.3);
  scene.add(ambient);

  // Overhead warm lights
  for (let z = -3; z < 14; z += 3) {
    const light = new THREE.PointLight(PALETTE.warmLight, 0.4, 6, 2);
    light.position.set(0, 2.5, z);
    scene.add(light);
  }

  // Subtle cool fill from windows
  const windowFill = new THREE.DirectionalLight(0x667788, 0.15);
  windowFill.position.set(-3, 1.5, 5);
  scene.add(windowFill);
}
