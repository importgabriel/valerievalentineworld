// ========================================
// SUBWAY SCENE — Cinematic platform POV
// ========================================
// Camera is on the platform watching the subway train
// arrive, brake, and stop. Valerie steps off.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MATS, PALETTE } from "./constants.js";

// ========================================
// TRAIN STATE MACHINE
// ========================================

const TRAIN_STATES = {
  WAITING: "WAITING",
  APPROACHING: "APPROACHING",
  BRAKING: "BRAKING",
  STOPPED: "STOPPED",
  DOORS_OPEN: "DOORS_OPEN",
  CHARACTER_EXIT: "CHARACTER_EXIT",
  DONE: "DONE",
};

const TRAIN_STOP_Z = 0;

// ========================================
// BUILD SUBWAY SCENE
// ========================================

export function buildSubwayScene(subwayGltf) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a28);
  scene.fog = new THREE.FogExp2(0x1a1a28, 0.012);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  // Standing on platform, looking down the tracks into the tunnel
  camera.position.set(3, 1.6, 8);
  camera.lookAt(-3, 0.5, -30);

  // Build scene elements
  buildPlatform(scene);
  buildTracks(scene);
  buildTunnelWalls(scene);

  // Set up the train from GLB
  const trainGroup = setupTrain(scene, subwayGltf);

  // Lighting
  addLighting(scene, trainGroup);

  // Train state
  let trainState = TRAIN_STATES.WAITING;
  let stateTimer = 0;
  let trainSpeed = 0;
  const baseCamY = 1.6;

  return {
    scene,
    camera,
    trainGroup,

    startTrainArrival() {
      if (trainState === TRAIN_STATES.WAITING) {
        trainState = TRAIN_STATES.APPROACHING;
        stateTimer = 0;
        trainSpeed = 0;
      }
    },

    getTrainState() {
      return trainState;
    },

    update(dt) {
      stateTimer += dt;

      switch (trainState) {
        case TRAIN_STATES.WAITING:
          // Idle — subtle ambient flicker on platform lights
          break;

        case TRAIN_STATES.APPROACHING:
          // Train accelerates and rumbles in
          trainSpeed = Math.min(trainSpeed + 8 * dt, 18);
          trainGroup.position.z += trainSpeed * dt;

          // Camera shake from approaching train vibration
          camera.position.y =
            baseCamY +
            Math.sin(stateTimer * 14) *
              0.008 *
              Math.min(1, trainSpeed / 8);
          camera.rotation.z = Math.sin(stateTimer * 10) * 0.002;

          if (trainGroup.position.z > -12) {
            trainState = TRAIN_STATES.BRAKING;
            stateTimer = 0;
          }
          break;

        case TRAIN_STATES.BRAKING: {
          // Deceleration with easeOutCubic
          const brakeT = Math.min(stateTimer / 2.0, 1);
          const easedBrake = 1 - Math.pow(1 - brakeT, 3);
          trainSpeed = 18 * (1 - easedBrake);
          trainGroup.position.z += trainSpeed * dt;

          // Decreasing camera shake
          camera.position.y =
            baseCamY +
            Math.sin(stateTimer * 8) * 0.004 * (1 - brakeT);
          camera.rotation.z =
            Math.sin(stateTimer * 6) * 0.001 * (1 - brakeT);

          if (brakeT >= 1) {
            trainGroup.position.z = TRAIN_STOP_Z;
            trainSpeed = 0;
            trainState = TRAIN_STATES.STOPPED;
            stateTimer = 0;
            camera.position.y = baseCamY;
            camera.rotation.z = 0;
          }
          break;
        }

        case TRAIN_STATES.STOPPED:
          if (stateTimer > 0.5) {
            trainState = TRAIN_STATES.DOORS_OPEN;
            stateTimer = 0;
          }
          break;

        case TRAIN_STATES.DOORS_OPEN:
          // Hold for doors
          if (stateTimer > 1.0) {
            trainState = TRAIN_STATES.CHARACTER_EXIT;
            stateTimer = 0;
          }
          break;

        case TRAIN_STATES.CHARACTER_EXIT:
          if (stateTimer > 2.0) {
            trainState = TRAIN_STATES.DONE;
          }
          break;

        case TRAIN_STATES.DONE:
          break;
      }
    },

    dispose() {
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
// PLATFORM CONSTRUCTION
// ========================================

function buildPlatform(scene) {
  const platLen = 40; // 40m long
  const platW = 8; // 8m wide
  const platH = 0.8; // elevated 0.8m above track level
  const platX = 4; // centered at X=4 (tracks at X=-3)

  // Platform top surface
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(platW, platLen),
    MATS.platformFloor
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(platX, platH, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Platform edge (track side) — yellow safety line
  const edgeLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.02, platLen),
    MATS.platformEdge
  );
  edgeLine.position.set(platX - platW / 2 + 0.15, platH + 0.01, 0);
  scene.add(edgeLine);

  // Platform side wall (facing tracks)
  const sideWall = new THREE.Mesh(
    new THREE.PlaneGeometry(platLen, platH),
    MATS.platformTile
  );
  sideWall.rotation.y = Math.PI / 2;
  sideWall.position.set(platX - platW / 2, platH / 2, 0);
  scene.add(sideWall);

  // Back wall with tiles
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(platLen, 3.5),
    MATS.platformTile
  );
  backWall.rotation.y = -Math.PI / 2;
  backWall.position.set(platX + platW / 2, platH + 1.75, 0);
  scene.add(backWall);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(platW + 4, platLen),
    MATS.platformCeiling
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(platX - 2, 3.8, 0);
  scene.add(ceiling);

  // Pillars (instanced)
  const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.0, 8);
  const pillarCount = 10;
  const pillarMesh = new THREE.InstancedMesh(
    pillarGeo,
    MATS.platformPillar,
    pillarCount
  );
  const m = new THREE.Matrix4();
  for (let i = 0; i < pillarCount; i++) {
    const z = -16 + i * (platLen / (pillarCount - 1));
    m.makeTranslation(platX - platW / 2 + 0.5, platH + 1.5, z);
    pillarMesh.setMatrixAt(i, m);
  }
  pillarMesh.castShadow = true;
  scene.add(pillarMesh);

  // Station sign — "34th St" style
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext("2d");
  ctx.fillStyle = "#1a3a1a";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("34th Street", 256, 48);
  ctx.font = "28px Georgia, serif";
  ctx.fillText("Penn Station", 256, 92);

  const signTex = new THREE.CanvasTexture(signCanvas);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), signMat);
  signMesh.rotation.y = -Math.PI / 2;
  signMesh.position.set(platX + platW / 2 - 0.01, platH + 2.5, 0);
  scene.add(signMesh);

  // Benches along the back wall
  const benchGeos = [];
  for (let z = -8; z <= 8; z += 8) {
    // Seat
    const seat = new THREE.BoxGeometry(1.5, 0.06, 0.4);
    seat.translate(platX + platW / 2 - 1.2, platH + 0.45, z);
    benchGeos.push(seat);
    // Legs
    for (const oz of [-0.5, 0.5]) {
      const leg = new THREE.BoxGeometry(0.06, 0.45, 0.06);
      leg.translate(platX + platW / 2 - 1.2 + oz, platH + 0.225, z);
      benchGeos.push(leg);
    }
    // Backrest
    const back = new THREE.BoxGeometry(1.5, 0.5, 0.04);
    back.translate(platX + platW / 2 - 0.95, platH + 0.73, z);
    benchGeos.push(back);
  }
  if (benchGeos.length > 0) {
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0x554433,
      roughness: 0.7,
    });
    const benchMesh = new THREE.Mesh(mergeGeometries(benchGeos), benchMat);
    benchMesh.castShadow = true;
    scene.add(benchMesh);
    benchGeos.forEach((g) => g.dispose());
  }
}

// ========================================
// TRACKS
// ========================================

function buildTracks(scene) {
  const trackLen = 80;
  const trackCenterX = -3;
  const trackY = 0;
  const gauge = 1.435 / 2; // Standard gauge half-width

  // Track bed (gravel)
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(3, trackLen),
    MATS.trackBed
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(trackCenterX, trackY - 0.01, 0);
  bed.receiveShadow = true;
  scene.add(bed);

  // Rails
  const railGeos = [];
  for (const side of [-1, 1]) {
    const rail = new THREE.BoxGeometry(0.07, 0.08, trackLen);
    rail.translate(trackCenterX + side * gauge, trackY + 0.04, 0);
    railGeos.push(rail);
  }
  if (railGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(railGeos), MATS.trackRail));
    railGeos.forEach((g) => g.dispose());
  }

  // Ties (instanced)
  const tieGeo = new THREE.BoxGeometry(2.0, 0.06, 0.15);
  const tieCount = Math.floor(trackLen / 0.6);
  const tieMesh = new THREE.InstancedMesh(tieGeo, MATS.trackTie, tieCount);
  const m = new THREE.Matrix4();
  for (let i = 0; i < tieCount; i++) {
    m.makeTranslation(trackCenterX, trackY - 0.01, -trackLen / 2 + i * 0.6);
    tieMesh.setMatrixAt(i, m);
  }
  scene.add(tieMesh);
}

// ========================================
// TUNNEL WALLS
// ========================================

function buildTunnelWalls(scene) {
  const tunnelLen = 80;

  // Tunnel ceiling over tracks
  const tunnelCeiling = new THREE.Mesh(
    new THREE.PlaneGeometry(6, tunnelLen),
    MATS.tunnelWall
  );
  tunnelCeiling.rotation.x = Math.PI / 2;
  tunnelCeiling.position.set(-3, 3.8, 0);
  scene.add(tunnelCeiling);

  // Far tunnel wall (opposite side of tracks from platform)
  const farWall = new THREE.Mesh(
    new THREE.PlaneGeometry(tunnelLen, 4.6),
    MATS.tunnelWall
  );
  farWall.rotation.y = -Math.PI / 2;
  farWall.position.set(-6, 1.5, 0);
  scene.add(farWall);

  // Tunnel mouth darkness (far ends)
  for (const zSign of [-1, 1]) {
    const mouth = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      new THREE.MeshBasicMaterial({ color: 0x050508 })
    );
    mouth.position.set(-2, 1.5, zSign * 40);
    mouth.rotation.y = zSign === 1 ? Math.PI : 0;
    scene.add(mouth);
  }
}

// ========================================
// TRAIN GLB SETUP
// ========================================

function buildProceduralTrain() {
  const group = new THREE.Group();

  const carLength = 16;
  const carWidth = 3;
  const carHeight = 3.2;

  // Main body
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.4, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(carWidth, carHeight, carLength), bodyMat);
  body.position.set(0, carHeight / 2 + 0.1, 0);
  body.castShadow = true;
  group.add(body);

  // Roof (slightly wider, rounded look)
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth + 0.1, 0.15, carLength + 0.1),
    new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.5, metalness: 0.2 })
  );
  roof.position.set(0, carHeight + 0.18, 0);
  group.add(roof);

  // Windows (both sides)
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x334455, roughness: 0.1, metalness: 0.3,
    emissive: 0x112233, emissiveIntensity: 0.3,
  });
  for (const side of [-1, 1]) {
    for (let z = -carLength / 2 + 1.5; z < carLength / 2 - 1; z += 1.8) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), windowMat);
      win.position.set(side * (carWidth / 2 + 0.01), carHeight / 2 + 0.5, z);
      win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(win);
    }
  }

  // Door areas (wider windows in the middle and ends)
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x666677, roughness: 0.3, metalness: 0.4 });
  for (const side of [-1, 1]) {
    for (const dz of [-carLength / 4, 0, carLength / 4]) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), doorMat);
      door.position.set(side * (carWidth / 2 + 0.01), carHeight / 2 - 0.1, dz);
      door.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(door);
    }
  }

  // Stripe along the side (colored band like NYC subway)
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x2255cc, roughness: 0.6 });
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.25, carLength), stripeMat);
    stripe.position.set(side * (carWidth / 2 + 0.02), carHeight / 2 + 1.2, 0);
    stripe.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(stripe);
  }

  // Front face
  const frontMat = new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.4, metalness: 0.3 });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(carWidth, carHeight), frontMat);
  front.position.set(0, carHeight / 2 + 0.1, carLength / 2 + 0.01);
  group.add(front);

  // Front window
  const frontWin = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.8), windowMat);
  frontWin.position.set(0, carHeight / 2 + 0.7, carLength / 2 + 0.02);
  group.add(frontWin);

  // Undercarriage / wheels
  const underMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
  const under = new THREE.Mesh(new THREE.BoxGeometry(carWidth - 0.2, 0.3, carLength - 0.5), underMat);
  under.position.set(0, 0.05, 0);
  group.add(under);

  // Interior lights (warm glow from windows)
  const intLight = new THREE.PointLight(0xffeedd, 0.4, 8, 2);
  intLight.position.set(0, carHeight / 2 + 0.5, 0);
  group.add(intLight);

  return group;
}

function setupTrain(scene, subwayGltf) {
  const trainGroup = new THREE.Group();

  // Use a procedural subway car for a clean NYC subway look
  const proceduralTrain = buildProceduralTrain();
  trainGroup.add(proceduralTrain);

  // Position on tracks, start way off-screen to the left (negative Z)
  trainGroup.position.set(-3, 0, -55);

  scene.add(trainGroup);
  return trainGroup;
}

// ========================================
// LIGHTING
// ========================================

function addLighting(scene, trainGroup) {
  // Brighter underground ambient so the scene is clearly visible
  const ambient = new THREE.AmbientLight(0x667788, 0.6);
  scene.add(ambient);

  // Warm fluorescent platform lights — brighter and more of them
  const platX = 4;
  for (let z = -18; z <= 18; z += 3) {
    const light = new THREE.PointLight(PALETTE.warmLight, 1.0, 16, 1.5);
    light.position.set(platX, 3.5, z);
    scene.add(light);

    // Light fixture visual — glowing fluorescent tubes
    const fixtureGeo = new THREE.BoxGeometry(0.8, 0.06, 0.2);
    const fixtureMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: PALETTE.warmLight,
      emissiveIntensity: 1.0,
    });
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(platX, 3.78, z);
    scene.add(fixture);
  }

  // Additional fill lights along the track side for visibility
  for (let z = -15; z <= 15; z += 10) {
    const fillLight = new THREE.PointLight(0xaabbcc, 0.4, 12, 2);
    fillLight.position.set(0, 3.0, z);
    scene.add(fillLight);
  }

  // Train headlight — attached to the train so it moves with it
  const headlight = new THREE.SpotLight(
    0xffffcc,
    4.0,
    80,
    Math.PI / 6,
    0.4,
    1.2
  );
  headlight.position.set(0, 1.5, 8);
  headlight.target.position.set(0, 0.5, 20);
  trainGroup.add(headlight);
  trainGroup.add(headlight.target);

  // Secondary red tail light glow
  const taillight = new THREE.PointLight(0xff3333, 0.6, 10);
  taillight.position.set(0, 1.5, -8);
  trainGroup.add(taillight);

  // Hemisphere for natural color contrast — much brighter
  const hemi = new THREE.HemisphereLight(0x556688, 0x332211, 0.5);
  scene.add(hemi);
}
