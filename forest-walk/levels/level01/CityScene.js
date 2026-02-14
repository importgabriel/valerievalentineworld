// ========================================
// CITY SCENE — Low-poly GLB city with JPMorgan building
// ========================================

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MATS, PALETTE } from "./constants.js";
import { createSkyBackdrop } from "../levelUtils.js";
import { GLBNPCSystem } from "./NPCSystem.js";

// JPMorgan entrance position (used for trigger)
export const JPMORGAN_ENTRANCE = new THREE.Vector3(0, 0, 130);

// City bounds for player movement
export const CITY_BOUNDS = {
  minX: -20,
  maxX: 20,
  minZ: -10,
  maxZ: 140,
};

export function buildCityScene(cityGltf, peopleGltf) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xddeeff);
  scene.fog = new THREE.Fog(0xddeeff, 100, 250);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // Load the low-poly city GLB model
  setupCityModel(scene, cityGltf);

  // Keep procedural elements that the GLB doesn't have
  buildJPMorganBuilding(scene);
  buildSubwayExit(scene);
  buildStreetElements(scene);

  // NPC system — accepts people pack GLTF or array of individual character GLTFs
  let npcSystem = null;
  if (peopleGltf) {
    npcSystem = new GLBNPCSystem(scene, peopleGltf, {
      count: 40,
      bounds: { minZ: -5, maxZ: 125 },
      walkableXRanges: [
        [-12, -8],
        [-7, -5],
        [5, 7],
        [8, 12],
      ],
    });
  }

  // Navigation waypoint — floating marker above JPMorgan entrance
  const waypointGroup = buildNavigationWaypoint(scene);

  const { sunLight } = addLighting(scene);
  addSkyBackdrop(scene);

  // Freeze static shadows after first frame
  let shadowFrozen = false;
  let waypointTime = 0;

  return {
    scene,
    camera,
    sunLight,
    npcSystem,

    update(dt) {
      if (npcSystem) npcSystem.update(dt);

      // Animate waypoint
      waypointTime += dt;
      if (waypointGroup) {
        waypointGroup.position.y = 8 + Math.sin(waypointTime * 2) * 0.5;
        waypointGroup.rotation.y = waypointTime * 0.8;
      }

      // Freeze static shadow map after first render
      if (!shadowFrozen) {
        shadowFrozen = true;
        setTimeout(() => {
          sunLight.shadow.autoUpdate = false;
          sunLight.shadow.needsUpdate = false;
        }, 100);
      }
    },

    dispose() {
      if (npcSystem) npcSystem.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    },
  };
}

// ========================================
// CITY GLB MODEL SETUP
// ========================================

function setupCityModel(scene, cityGltf) {
  if (!cityGltf) {
    // Fallback: build a simple procedural ground if GLB is missing
    buildFallbackGround(scene);
    return;
  }

  const cityModel = cityGltf.scene;

  // The lowpoly.glb bounding box is ~17x5.4x9.3 units at base scale.
  // At 8x scale: ~136x43x74 units — close to our city bounds.
  cityModel.scale.setScalar(16);

  // Position so the city is centered on our walking corridor (Z: -10 to 140)
  cityModel.position.set(-8, 0, 110);

  // Rotate to align the longest axis with the walking direction (Z)
  cityModel.rotation.y = Math.PI / 2;

  // Enable shadows on all meshes
  cityModel.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  scene.add(cityModel);

  // Add a ground plane that extends beyond the model
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 300),
    MATS.sidewalk
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 70);
  ground.receiveShadow = true;
  scene.add(ground);
}

function buildFallbackGround(scene) {
  // Simple ground if city GLB isn't available
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 200),
    MATS.sidewalk
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 70);
  ground.receiveShadow = true;
  scene.add(ground);

  // Road
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 180), MATS.road);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.02, 70);
  road.receiveShadow = true;
  scene.add(road);
}

// ========================================
// JPMORGAN BUILDING (procedural — kept for destination trigger)
// ========================================

function buildJPMorganBuilding(scene) {
  const h = 60,
    w = 14,
    d = 14;
  const x = 0,
    z = 137;

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
    windowGeos.forEach((g) => g.dispose());
  }

  // JPMorgan logo
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
  const logoMat = new THREE.SpriteMaterial({
    map: logoTex,
    transparent: true,
  });
  const logo = new THREE.Sprite(logoMat);
  logo.position.set(x, 6, z - d / 2 - 0.5);
  logo.scale.set(8, 2, 1);
  scene.add(logo);

  // Entrance — glass doors
  const entranceGeos = [];

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
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.3,
      metalness: 0.5,
    });
    scene.add(new THREE.Mesh(mergeGeometries(entranceGeos), frameMat));
    entranceGeos.forEach((g) => g.dispose());
  }

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

  // Glowing entrance marker
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

// ========================================
// SUBWAY EXIT (procedural — player spawn point)
// ========================================

function buildSubwayExit(scene) {
  const stairX = 0,
    stairZ = -2;
  const stepCount = 8;
  const stepH = 0.2,
    stepD = 0.4,
    stepW = 3;
  const stairGeos = [];

  for (let i = 0; i < stepCount; i++) {
    const step = new THREE.BoxGeometry(stepW, stepH, stepD);
    step.translate(stairX, -i * stepH + 0.1, stairZ - i * stepD);
    stairGeos.push(step);
  }

  if (stairGeos.length > 0) {
    const stairMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.7,
    });
    const mesh = new THREE.Mesh(mergeGeometries(stairGeos), stairMat);
    mesh.receiveShadow = true;
    scene.add(mesh);
    stairGeos.forEach((g) => g.dispose());
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
  const signMat = new THREE.SpriteMaterial({
    map: signTex,
    transparent: true,
  });
  const sign = new THREE.Sprite(signMat);
  sign.position.set(stairX, 3, stairZ - 1);
  sign.scale.set(3, 1.5, 1);
  scene.add(sign);

  // Railing
  const railGeos = [];
  for (const side of [-1, 1]) {
    const rail = new THREE.BoxGeometry(
      0.04,
      0.8,
      stepCount * stepD + 1
    );
    rail.translate(
      stairX + side * (stepW / 2 + 0.05),
      0.5,
      stairZ - (stepCount * stepD) / 2
    );
    railGeos.push(rail);
  }
  if (railGeos.length > 0) {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.3,
      metalness: 0.5,
    });
    scene.add(new THREE.Mesh(mergeGeometries(railGeos), railMat));
    railGeos.forEach((g) => g.dispose());
  }
}

// ========================================
// STREET ELEMENTS (lamp posts, traffic lights)
// ========================================

function buildStreetElements(scene) {
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 5, 6);
  const poleMat = MATS.lampPost;
  const lampPositions = [];

  for (let z = 0; z < 140; z += 15) {
    lampPositions.push([-5, z]);
    lampPositions.push([5, z]);
  }

  const poleInst = new THREE.InstancedMesh(
    poleGeo,
    poleMat,
    lampPositions.length
  );
  const m = new THREE.Matrix4();
  lampPositions.forEach(([x, z], i) => {
    m.makeTranslation(x, 2.5, z);
    poleInst.setMatrixAt(i, m);
  });
  poleInst.castShadow = true;
  scene.add(poleInst);

  // Lamp heads
  const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: PALETTE.warmLight,
    emissiveIntensity: 0.5,
  });
  const headInst = new THREE.InstancedMesh(
    headGeo,
    headMat,
    lampPositions.length
  );
  lampPositions.forEach(([x, z], i) => {
    m.makeTranslation(x, 5.2, z);
    headInst.setMatrixAt(i, m);
  });
  scene.add(headInst);

  // Traffic lights
  const tlGeos = [];
  for (const z of [0, 30, 60, 90, 120]) {
    for (const x of [-4, 4]) {
      const pole = new THREE.BoxGeometry(0.1, 4, 0.1);
      pole.translate(x, 2, z);
      tlGeos.push(pole);

      const housing = new THREE.BoxGeometry(0.3, 0.8, 0.3);
      housing.translate(x, 4.2, z);
      tlGeos.push(housing);
    }
  }
  if (tlGeos.length > 0) {
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
    });
    scene.add(new THREE.Mesh(mergeGeometries(tlGeos), tlMat));
    tlGeos.forEach((g) => g.dispose());
  }
}

// ========================================
// NAVIGATION WAYPOINT — floating diamond marker above JPMorgan
// ========================================

function buildNavigationWaypoint(scene) {
  const group = new THREE.Group();
  const entranceZ = 130;

  // Floating diamond marker
  const diamondGeo = new THREE.OctahedronGeometry(1.2, 0);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sunGold,
    emissive: PALETTE.sunGold,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.85,
  });
  const diamond = new THREE.Mesh(diamondGeo, diamondMat);
  group.add(diamond);

  // Vertical light beam below the diamond
  const beamGeo = new THREE.CylinderGeometry(0.15, 0.5, 8, 8);
  const beamMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sunGold,
    emissive: PALETTE.sunGold,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.25,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = -5;
  group.add(beam);

  // Point light for glow
  const glow = new THREE.PointLight(PALETTE.sunGold, 1.5, 30, 2);
  glow.position.y = 0;
  group.add(glow);

  // "JPMORGAN" label sprite floating above
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const ctx = labelCanvas.getContext("2d");
  ctx.fillStyle = "rgba(0,51,102,0.8)";
  ctx.beginPath();
  // Compatible rounded rect
  const rx = 16, ry = 16, rw = 480, rh = 96, rr = 16;
  ctx.moveTo(rx + rr, ry);
  ctx.lineTo(rx + rw - rr, ry);
  ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
  ctx.lineTo(rx + rw, ry + rh - rr);
  ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
  ctx.lineTo(rx + rr, ry + rh);
  ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
  ctx.lineTo(rx, ry + rr);
  ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("JPMORGAN", 256, 50);
  ctx.font = "24px Arial, sans-serif";
  ctx.fillStyle = "#ffdd88";
  ctx.fillText("Walk here", 256, 84);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
  const label = new THREE.Sprite(labelMat);
  label.position.y = 2.5;
  label.scale.set(6, 1.5, 1);
  group.add(label);

  group.position.set(0, 8, entranceZ);
  scene.add(group);
  return group;
}

// ========================================
// LIGHTING
// ========================================

function addLighting(scene) {
  // Warm afternoon sun
  const sunLight = new THREE.DirectionalLight(PALETTE.warmLight, 0.8);
  sunLight.position.set(30, 60, 60);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -80;
  sunLight.shadow.camera.right = 80;
  sunLight.shadow.camera.top = 80;
  sunLight.shadow.camera.bottom = -20;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 200;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  // Warm ambient
  const ambient = new THREE.AmbientLight(PALETTE.warmAmbient, 0.4);
  scene.add(ambient);

  // Hemisphere light for natural sky color
  const hemi = new THREE.HemisphereLight(0x88bbee, 0xddc8a0, 0.3);
  scene.add(hemi);

  return { sunLight };
}

// ========================================
// SKY BACKDROP
// ========================================

function addSkyBackdrop(scene) {
  const sky = createSkyBackdrop(
    [
      [0, "#88bbee"],
      [0.3, "#aaccee"],
      [0.6, "#ddeeff"],
      [0.8, "#ffeedd"],
      [0.95, "#ffcc88"],
      [1, "#ff9944"],
    ],
    500,
    250
  );
  sky.position.set(0, 60, 200);
  scene.add(sky);
}
