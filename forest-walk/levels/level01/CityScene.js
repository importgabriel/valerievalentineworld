// ========================================
// CITY SCENE — NYC street with JPMorgan building
// ========================================

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MATS, PALETTE } from "./constants.js";
import { createSkyBackdrop } from "../levelUtils.js";
import { WalkingNPCSystem } from "./NPCSystem.js";

export function buildCityScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xddeeff);
  scene.fog = new THREE.Fog(0xddeeff, 60, 120);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  buildGround(scene);
  buildBuildings(scene);
  buildJPMorganBuilding(scene);
  buildSubwayExit(scene);
  buildStreetElements(scene);
  buildTrees(scene);

  const npcSystem = new WalkingNPCSystem(scene, 30);
  npcSystem.setBounds(-10, 75);

  const { sunLight, dynamicLight } = addLighting(scene);
  addSkyBackdrop(scene);

  // Freeze static shadows after first frame
  let shadowFrozen = false;

  return {
    scene,
    camera,
    sunLight,
    npcSystem,

    update(dt) {
      npcSystem.update(dt);

      // Freeze static shadow map after first render
      if (!shadowFrozen) {
        shadowFrozen = true;
        // Allow one frame to render shadows, then freeze
        setTimeout(() => {
          sunLight.shadow.autoUpdate = false;
          sunLight.shadow.needsUpdate = false;
        }, 100);
      }
    },

    dispose() {
      npcSystem.dispose();
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

// JPMorgan entrance position (used for trigger)
export const JPMORGAN_ENTRANCE = new THREE.Vector3(0, 0, 65);

// City bounds for player movement
export const CITY_BOUNDS = {
  minX: -10,
  maxX: 10,
  minZ: -5,
  maxZ: 70,
};

function buildGround(scene) {
  // Sidewalks
  const leftSidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 90),
    MATS.sidewalk
  );
  leftSidewalk.rotation.x = -Math.PI / 2;
  leftSidewalk.position.set(-8, 0, 35);
  leftSidewalk.receiveShadow = true;
  scene.add(leftSidewalk);

  const rightSidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 90),
    MATS.sidewalk
  );
  rightSidewalk.rotation.x = -Math.PI / 2;
  rightSidewalk.position.set(8, 0, 35);
  rightSidewalk.receiveShadow = true;
  scene.add(rightSidewalk);

  // Road
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 90),
    MATS.road
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.02, 35);
  road.receiveShadow = true;
  scene.add(road);

  // Center road line
  const lineGeos = [];
  for (let z = -5; z < 80; z += 4) {
    const line = new THREE.PlaneGeometry(0.15, 2.5);
    line.rotateX(-Math.PI / 2);
    line.translate(0, -0.01, z);
    lineGeos.push(line);
  }
  if (lineGeos.length > 0) {
    const lineMat = new THREE.MeshStandardMaterial({ color: PALETTE.roadLine, roughness: 0.8 });
    scene.add(new THREE.Mesh(mergeGeometries(lineGeos), lineMat));
    lineGeos.forEach(g => g.dispose());
  }

  // Crosswalks
  const crosswalkGeos = [];
  for (const z of [0, 30, 60]) {
    for (let i = -3; i <= 3; i++) {
      const stripe = new THREE.PlaneGeometry(0.6, 4);
      stripe.rotateX(-Math.PI / 2);
      stripe.translate(i * 1.0, 0.01, z);
      crosswalkGeos.push(stripe);
    }
  }
  if (crosswalkGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(crosswalkGeos), MATS.crosswalk));
    crosswalkGeos.forEach(g => g.dispose());
  }

  // Curb edges
  const curbGeos = [];
  for (const x of [-4, 4]) {
    const curb = new THREE.BoxGeometry(0.3, 0.15, 90);
    curb.translate(x, 0.075, 35);
    curbGeos.push(curb);
  }
  if (curbGeos.length > 0) {
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 });
    scene.add(new THREE.Mesh(mergeGeometries(curbGeos), curbMat));
    curbGeos.forEach(g => g.dispose());
  }
}

function buildBuildings(scene) {
  const buildingDefs = [];
  const rng = mulberry32(42); // Seeded random for consistent layout

  // Left side buildings
  for (let z = -5; z < 55; z += 12) {
    const h = 20 + rng() * 40;
    const w = 6 + rng() * 4;
    const d = 8 + rng() * 6;
    buildingDefs.push({ x: -12 - w / 2, z: z + d / 2, w, h, d, type: rng() > 0.5 ? "glass" : "concrete" });
  }

  // Right side buildings
  for (let z = -5; z < 55; z += 10) {
    const h = 15 + rng() * 35;
    const w = 5 + rng() * 5;
    const d = 7 + rng() * 5;
    buildingDefs.push({ x: 12 + w / 2, z: z + d / 2, w, h, d, type: rng() > 0.5 ? "glass" : "brick" });
  }

  const concreteGeos = [];
  const glassGeos = [];
  const brickGeos = [];
  const windowGeos = [];

  for (const b of buildingDefs) {
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    geo.translate(b.x, b.h / 2, b.z);

    switch (b.type) {
      case "glass": glassGeos.push(geo); break;
      case "brick": brickGeos.push(geo); break;
      default: concreteGeos.push(geo);
    }

    // Window grid on side facing street
    const facingX = b.x < 0 ? b.x + b.w / 2 : b.x - b.w / 2;
    const wRows = Math.floor(b.h / 3);
    const wCols = Math.floor(b.d / 2.5);

    for (let r = 0; r < Math.min(wRows, 15); r++) {
      for (let c = 0; c < Math.min(wCols, 6); c++) {
        const wy = 2 + r * 3;
        const wz = b.z - b.d / 2 + 1.5 + c * 2.5;
        const wGeo = new THREE.PlaneGeometry(0.8, 1.5);
        wGeo.rotateY(b.x < 0 ? 0 : Math.PI);
        wGeo.translate(facingX + (b.x < 0 ? 0.01 : -0.01), wy, wz);
        windowGeos.push(wGeo);
      }
    }
  }

  if (concreteGeos.length > 0) {
    const mesh = new THREE.Mesh(mergeGeometries(concreteGeos), MATS.buildingConcrete);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    concreteGeos.forEach(g => g.dispose());
  }
  if (glassGeos.length > 0) {
    const glassMat = new THREE.MeshStandardMaterial({ color: PALETTE.buildingDark, roughness: 0.3, metalness: 0.4 });
    const mesh = new THREE.Mesh(mergeGeometries(glassGeos), glassMat);
    mesh.castShadow = true;
    scene.add(mesh);
    glassGeos.forEach(g => g.dispose());
  }
  if (brickGeos.length > 0) {
    const mesh = new THREE.Mesh(mergeGeometries(brickGeos), MATS.buildingBrick);
    mesh.castShadow = true;
    scene.add(mesh);
    brickGeos.forEach(g => g.dispose());
  }
  if (windowGeos.length > 0) {
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x88bbcc,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.5,
    });
    scene.add(new THREE.Mesh(mergeGeometries(windowGeos), winMat));
    windowGeos.forEach(g => g.dispose());
  }
}

function buildJPMorganBuilding(scene) {
  // The tallest, most prominent building — dark glass with blue accents
  const h = 60, w = 14, d = 14;
  const x = 0, z = 72;

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    MATS.jpmorganGlass
  );
  building.position.set(x, h / 2, z);
  building.castShadow = true;
  scene.add(building);

  // Window grid on front face
  const windowGeos = [];
  const wRows = Math.floor(h / 3);
  const wCols = Math.floor(w / 2);
  for (let r = 0; r < wRows; r++) {
    for (let c = 0; c < wCols; c++) {
      const wx = x - w / 2 + 1.5 + c * 2;
      const wy = 2 + r * 3;
      const wGeo = new THREE.PlaneGeometry(1.0, 1.8);
      wGeo.translate(wx, wy, z - d / 2 - 0.01);
      windowGeos.push(wGeo);
    }
  }
  if (windowGeos.length > 0) {
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x334466,
      roughness: 0.05,
      metalness: 0.5,
      transparent: true,
      opacity: 0.6,
    });
    scene.add(new THREE.Mesh(mergeGeometries(windowGeos), winMat));
    windowGeos.forEach(g => g.dispose());
  }

  // JPMorgan logo / text (canvas texture sprite)
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = 512;
  logoCanvas.height = 128;
  const ctx = logoCanvas.getContext("2d");
  ctx.fillStyle = "#003366";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("JPMORGAN", 256, 50);
  ctx.font = "24px Arial, sans-serif";
  ctx.fillText("CHASE & CO.", 256, 90);

  const logoTex = new THREE.CanvasTexture(logoCanvas);
  const logoMat = new THREE.SpriteMaterial({ map: logoTex, transparent: true });
  const logo = new THREE.Sprite(logoMat);
  logo.position.set(x, 6, z - d / 2 - 0.5);
  logo.scale.set(8, 2, 1);
  scene.add(logo);

  // Entrance — glass doors area
  const entranceGeos = [];

  // Door frame
  const frameLeft = new THREE.BoxGeometry(0.2, 3.5, 0.2);
  frameLeft.translate(x - 1.5, 1.75, z - d / 2 - 0.1);
  entranceGeos.push(frameLeft);

  const frameRight = new THREE.BoxGeometry(0.2, 3.5, 0.2);
  frameRight.translate(x + 1.5, 1.75, z - d / 2 - 0.1);
  entranceGeos.push(frameRight);

  const frameTop = new THREE.BoxGeometry(3.2, 0.2, 0.2);
  frameTop.translate(x, 3.5, z - d / 2 - 0.1);
  entranceGeos.push(frameTop);

  if (entranceGeos.length > 0) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.5 });
    scene.add(new THREE.Mesh(mergeGeometries(entranceGeos), frameMat));
    entranceGeos.forEach(g => g.dispose());
  }

  // Glass door panels
  const doorGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 3.2),
    new THREE.MeshPhysicalMaterial({
      color: 0x88bbcc,
      transparent: true,
      opacity: 0.25,
      roughness: 0.05,
      metalness: 0.1,
    })
  );
  doorGlass.position.set(x, 1.7, z - d / 2 - 0.11);
  scene.add(doorGlass);

  // Glowing entrance marker on ground
  const markerGeo = new THREE.CircleGeometry(1.5, 24);
  markerGeo.rotateX(-Math.PI / 2);
  const markerMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sunGold,
    emissive: PALETTE.sunGold,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.set(x, 0.02, z - d / 2 - 1.5);
  scene.add(marker);
}

function buildSubwayExit(scene) {
  // Stairway emerging from ground (player spawns at top)
  const stairX = 0, stairZ = -2;
  const stepCount = 8;
  const stepH = 0.2, stepD = 0.4, stepW = 3;
  const stairGeos = [];

  for (let i = 0; i < stepCount; i++) {
    const step = new THREE.BoxGeometry(stepW, stepH, stepD);
    step.translate(stairX, -i * stepH + 0.1, stairZ - i * stepD);
    stairGeos.push(step);
  }

  if (stairGeos.length > 0) {
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 });
    const mesh = new THREE.Mesh(mergeGeometries(stairGeos), stairMat);
    mesh.receiveShadow = true;
    scene.add(mesh);
    stairGeos.forEach(g => g.dispose());
  }

  // Subway entrance sign
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 256;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext("2d");
  ctx.fillStyle = "#222222";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SUBWAY", 128, 45);
  ctx.fillStyle = "#ffdd00";
  ctx.font = "bold 36px Arial";
  ctx.fillText("N  R  W", 128, 90);

  const signTex = new THREE.CanvasTexture(signCanvas);
  const signMat = new THREE.SpriteMaterial({ map: signTex, transparent: true });
  const sign = new THREE.Sprite(signMat);
  sign.position.set(stairX, 3, stairZ - 1);
  sign.scale.set(3, 1.5, 1);
  scene.add(sign);

  // Railing
  const railGeos = [];
  for (const side of [-1, 1]) {
    const rail = new THREE.BoxGeometry(0.04, 0.8, stepCount * stepD + 1);
    rail.translate(stairX + side * (stepW / 2 + 0.05), 0.5, stairZ - stepCount * stepD / 2);
    railGeos.push(rail);
  }
  if (railGeos.length > 0) {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.5 });
    scene.add(new THREE.Mesh(mergeGeometries(railGeos), railMat));
    railGeos.forEach(g => g.dispose());
  }
}

function buildStreetElements(scene) {
  // Lamp posts (instanced)
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 5, 6);
  const poleMat = MATS.lampPost;
  const lampPositions = [];

  for (let z = 0; z < 70; z += 15) {
    lampPositions.push([-5, z]);
    lampPositions.push([5, z]);
  }

  const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lampPositions.length);
  const m = new THREE.Matrix4();
  lampPositions.forEach(([x, z], i) => {
    m.makeTranslation(x, 2.5, z);
    poleInst.setMatrixAt(i, m);
  });
  poleInst.castShadow = true;
  scene.add(poleInst);

  // Lamp heads (glowing spheres on top)
  const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: PALETTE.warmLight,
    emissiveIntensity: 0.5,
  });
  const headInst = new THREE.InstancedMesh(headGeo, headMat, lampPositions.length);
  lampPositions.forEach(([x, z], i) => {
    m.makeTranslation(x, 5.2, z);
    headInst.setMatrixAt(i, m);
  });
  scene.add(headInst);

  // Traffic lights at intersections
  const tlGeos = [];
  for (const z of [0, 30, 60]) {
    for (const x of [-4, 4]) {
      // Pole
      const pole = new THREE.BoxGeometry(0.1, 4, 0.1);
      pole.translate(x, 2, z);
      tlGeos.push(pole);

      // Light housing
      const housing = new THREE.BoxGeometry(0.3, 0.8, 0.3);
      housing.translate(x, 4.2, z);
      tlGeos.push(housing);
    }
  }
  if (tlGeos.length > 0) {
    const tlMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
    scene.add(new THREE.Mesh(mergeGeometries(tlGeos), tlMat));
    tlGeos.forEach(g => g.dispose());
  }
}

function buildTrees(scene) {
  const treePositions = [];
  for (let z = 5; z < 60; z += 12) {
    treePositions.push([-6, z]);
    treePositions.push([6, z]);
  }

  // Trunks (instanced)
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.5, 6);
  const trunkInst = new THREE.InstancedMesh(trunkGeo, MATS.treeTrunk, treePositions.length);
  const m = new THREE.Matrix4();
  treePositions.forEach(([x, z], i) => {
    m.makeTranslation(x, 1.25, z);
    trunkInst.setMatrixAt(i, m);
  });
  trunkInst.castShadow = true;
  scene.add(trunkInst);

  // Canopies (instanced spheres)
  const canopyGeo = new THREE.SphereGeometry(1.5, 8, 6);
  const canopyInst = new THREE.InstancedMesh(canopyGeo, MATS.treeLeaves, treePositions.length);
  treePositions.forEach(([x, z], i) => {
    m.makeTranslation(x, 3.5, z);
    canopyInst.setMatrixAt(i, m);
  });
  canopyInst.castShadow = true;
  scene.add(canopyInst);
}

function addLighting(scene) {
  // Warm afternoon sun
  const sunLight = new THREE.DirectionalLight(PALETTE.warmLight, 0.8);
  sunLight.position.set(20, 40, 30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -10;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 100;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  // Dynamic light (follows player, updated by orchestrator)
  const dynamicLight = new THREE.DirectionalLight(PALETTE.warmLight, 0.3);
  dynamicLight.castShadow = true;
  dynamicLight.shadow.mapSize.set(1024, 1024);
  dynamicLight.shadow.camera.left = -5;
  dynamicLight.shadow.camera.right = 5;
  dynamicLight.shadow.camera.top = 5;
  dynamicLight.shadow.camera.bottom = -5;
  scene.add(dynamicLight);

  // Warm ambient
  const ambient = new THREE.AmbientLight(PALETTE.warmAmbient, 0.4);
  scene.add(ambient);

  // Hemisphere light for natural sky color
  const hemi = new THREE.HemisphereLight(0x88bbee, 0xddc8a0, 0.3);
  scene.add(hemi);

  return { sunLight, dynamicLight };
}

function addSkyBackdrop(scene) {
  const sky = createSkyBackdrop([
    [0, "#88bbee"],
    [0.3, "#aaccee"],
    [0.6, "#ddeeff"],
    [0.8, "#ffeedd"],
    [0.95, "#ffcc88"],
    [1, "#ff9944"],
  ], 300, 150);
  sky.position.set(0, 40, 100);
  scene.add(sky);
}

// Seeded random number generator for consistent building layout
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
