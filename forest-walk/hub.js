import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ========================================
// HOTEL HALLWAY — "The Shining but romantic"
// ========================================

const HALL = {
  width: 6,
  height: 4,
  length: 90,
  doorSpacing: 6,
  doorStartZ: 8,
  carpetWidth: 3,
};

// Color palette
const C = {
  floor: 0x3a2a1a,
  carpet: 0x8b1a1a,
  carpetDark: 0x6b1414,
  wall: 0xf5f0e8,
  wainscot: 0xe0d8c8,
  molding: 0x8b7355,
  ceiling: 0xfaf5ef,
  doorFrame: 0x5c3a1a,
  doorPanel: 0x6b4226,
  doorPanelDetail: 0x7a5233,
  brass: 0xc4a35a,
  sconceBulb: 0xffd700,
  lightPool: 0xffd700,
  fog: 0x1a1008,
  stairRail: 0x5c3a1a,
};

// ========================================
// SHARED MATERIALS
// ========================================

const MATS = {
  floor: new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.7, metalness: 0.1 }),
  carpet: new THREE.MeshStandardMaterial({ color: C.carpet, roughness: 0.85, metalness: 0 }),
  wall: new THREE.MeshStandardMaterial({ color: C.wall, roughness: 0.8, metalness: 0 }),
  wainscot: new THREE.MeshStandardMaterial({ color: C.wainscot, roughness: 0.8, metalness: 0 }),
  molding: new THREE.MeshStandardMaterial({ color: C.molding, roughness: 0.6, metalness: 0.1 }),
  ceiling: new THREE.MeshStandardMaterial({ color: C.ceiling, roughness: 0.9, metalness: 0 }),
  doorFrame: new THREE.MeshStandardMaterial({ color: C.doorFrame, roughness: 0.6, metalness: 0.1 }),
  doorPanel: new THREE.MeshStandardMaterial({ color: C.doorPanel, roughness: 0.5, metalness: 0.05 }),
  doorDetail: new THREE.MeshStandardMaterial({ color: C.doorPanelDetail, roughness: 0.5, metalness: 0.05 }),
  brass: new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.3, metalness: 0.6 }),
  sconceBulb: new THREE.MeshStandardMaterial({
    color: C.sconceBulb,
    emissive: C.sconceBulb,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  }),
  lightPoolWall: new THREE.MeshStandardMaterial({
    color: C.lightPool,
    emissive: C.lightPool,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  }),
  lightPoolFloor: new THREE.MeshStandardMaterial({
    color: C.lightPool,
    emissive: C.lightPool,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  }),
  markerGlow: new THREE.MeshStandardMaterial({
    color: C.sconceBulb,
    emissive: C.sconceBulb,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  }),
};

// ========================================
// HALLWAY STRUCTURE
// ========================================

function createHallwayStructure(scene) {
  const hw = HALL.width / 2;

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.width, HALL.length),
    MATS.floor
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, HALL.length / 2);
  scene.add(floor);

  // Carpet runner
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.carpetWidth, HALL.length),
    MATS.carpet
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.01, HALL.length / 2);
  scene.add(carpet);

  // Carpet border stripes (thin darker lines on each side)
  const stripGeos = [];
  for (const side of [-1, 1]) {
    const g = new THREE.PlaneGeometry(0.08, HALL.length);
    g.rotateX(-Math.PI / 2);
    g.translate(side * (HALL.carpetWidth / 2 + 0.04), 0.012, HALL.length / 2);
    stripGeos.push(g);
  }
  const stripMat = new THREE.MeshStandardMaterial({ color: C.carpetDark, roughness: 0.85 });
  const strips = new THREE.Mesh(mergeGeometries(stripGeos), stripMat);
  scene.add(strips);
  stripGeos.forEach(g => g.dispose());

  // Walls
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL.length, HALL.height),
      MATS.wall
    );
    wall.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    wall.position.set(side * hw, HALL.height / 2, HALL.length / 2);
    scene.add(wall);

    // Wainscoting (lower third)
    const wainscot = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.2, HALL.length),
      MATS.wainscot
    );
    wainscot.position.set(side * (hw - 0.025), 0.6, HALL.length / 2);
    scene.add(wainscot);

    // Molding rail at top of wainscoting
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, HALL.length),
      MATS.molding
    );
    rail.position.set(side * (hw - 0.03), 1.24, HALL.length / 2);
    scene.add(rail);

    // Crown molding at ceiling
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.1, HALL.length),
      MATS.molding
    );
    crown.position.set(side * (hw - 0.04), HALL.height - 0.05, HALL.length / 2);
    scene.add(crown);
  }

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.width, HALL.length),
    MATS.ceiling
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, HALL.height, HALL.length / 2);
  scene.add(ceiling);

  // End wall (back of hallway, disappears into fog)
  const endWall = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.width, HALL.height),
    MATS.wall
  );
  endWall.position.set(0, HALL.height / 2, HALL.length);
  scene.add(endWall);

  // Start wall (behind player start)
  const startWall = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.width, HALL.height),
    MATS.wall
  );
  startWall.rotation.y = Math.PI;
  startWall.position.set(0, HALL.height / 2, 0);
  scene.add(startWall);
}

// ========================================
// DOORS
// ========================================

function createDoors(scene, chapters) {
  const doors = [];
  const hw = HALL.width / 2;

  chapters.forEach((chapter, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = HALL.doorStartZ + i * HALL.doorSpacing;
    const x = side * (hw - 0.02);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(x, 0, z);
    doorGroup.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;

    // Door frame (3 pieces: two jambs + lintel)
    const jambs = [];
    const doorW = 1.2;
    const doorH = 2.4;
    const frameThick = 0.15;

    // Left jamb
    const jl = new THREE.BoxGeometry(frameThick, doorH + frameThick, 0.12);
    jl.translate(-(doorW / 2 + frameThick / 2), (doorH + frameThick) / 2, 0);
    jambs.push(jl);

    // Right jamb
    const jr = new THREE.BoxGeometry(frameThick, doorH + frameThick, 0.12);
    jr.translate(doorW / 2 + frameThick / 2, (doorH + frameThick) / 2, 0);
    jambs.push(jr);

    // Lintel
    const lt = new THREE.BoxGeometry(doorW + frameThick * 2, frameThick, 0.12);
    lt.translate(0, doorH + frameThick / 2, 0);
    jambs.push(lt);

    const frame = new THREE.Mesh(mergeGeometries(jambs), MATS.doorFrame);
    doorGroup.add(frame);
    jambs.forEach(g => g.dispose());

    // Door panel
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(doorW, doorH),
      MATS.doorPanel
    );
    panel.position.set(0, doorH / 2, -0.01);
    doorGroup.add(panel);

    // Decorative inset panels (two rectangles)
    const panelGeos = [];
    const insetW = doorW * 0.65;
    const insetH = doorH * 0.3;
    const p1 = new THREE.PlaneGeometry(insetW, insetH);
    p1.translate(0, doorH * 0.7, 0.005);
    panelGeos.push(p1);
    const p2 = new THREE.PlaneGeometry(insetW, insetH);
    p2.translate(0, doorH * 0.3, 0.005);
    panelGeos.push(p2);

    const insets = new THREE.Mesh(mergeGeometries(panelGeos), MATS.doorDetail);
    doorGroup.add(insets);
    panelGeos.forEach(g => g.dispose());

    // Door handle
    const handleGroup = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6),
      MATS.brass
    );
    stem.rotation.x = Math.PI / 2;
    handleGroup.add(stem);

    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      MATS.brass
    );
    knob.position.z = 0.06;
    handleGroup.add(knob);

    handleGroup.position.set(doorW / 2 - 0.12, doorH * 0.45, 0.05);
    doorGroup.add(handleGroup);

    scene.add(doorGroup);

    // Door label (canvas sprite above door)
    const label = chapter.doorLabel || chapter.buildingLabel || chapter.title;
    addDoorLabel(scene, `${i + 1}. ${label}`, x, doorH + 0.4, z, side);

    doors.push({
      group: doorGroup,
      z,
      side,
      index: i,
    });
  });

  return doors;
}

function addDoorLabel(scene, text, x, y, z, side) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  // Elegant room number plate style
  ctx.fillStyle = "rgba(250, 245, 239, 0.92)";
  const rr = 12;
  ctx.beginPath();
  ctx.moveTo(10 + rr, 4);
  ctx.lineTo(502 - rr, 4);
  ctx.quadraticCurveTo(502, 4, 502, 4 + rr);
  ctx.lineTo(502, 60 - rr);
  ctx.quadraticCurveTo(502, 60, 502 - rr, 60);
  ctx.lineTo(10 + rr, 60);
  ctx.quadraticCurveTo(10, 60, 10, 60 - rr);
  ctx.lineTo(10, 4 + rr);
  ctx.quadraticCurveTo(10, 4, 10 + rr, 4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#8b7355";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#5c3a1a";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(x, y + 0.3, z);
  sprite.scale.set(3.5, 0.45, 1);
  scene.add(sprite);
}

// ========================================
// WALL SCONCES (InstancedMesh + baked light)
// ========================================

function createSconces(scene) {
  const positions = [];
  const hw = HALL.width / 2;

  // Place sconces between doors on both walls
  for (let z = HALL.doorStartZ - 3; z < HALL.length - 2; z += HALL.doorSpacing / 2) {
    positions.push({ x: -(hw - 0.05), z, side: -1 });
    positions.push({ x: hw - 0.05, z, side: 1 });
  }

  // Sconce brackets (InstancedMesh)
  const bracketGeo = new THREE.BoxGeometry(0.08, 0.15, 0.1);
  const bracketInst = new THREE.InstancedMesh(bracketGeo, MATS.molding, positions.length);

  // Sconce bulbs (InstancedMesh)
  const bulbGeo = new THREE.SphereGeometry(0.07, 8, 6);
  const bulbInst = new THREE.InstancedMesh(bulbGeo, MATS.sconceBulb, positions.length);

  const m = new THREE.Matrix4();
  const lightPoolWallGeos = [];
  const lightPoolFloorGeos = [];

  positions.forEach((pos, i) => {
    const wallOffset = pos.side === -1 ? 0.04 : -0.04;

    // Bracket
    m.makeTranslation(pos.x + wallOffset, 2.2, pos.z);
    bracketInst.setMatrixAt(i, m);

    // Bulb
    m.makeTranslation(pos.x + wallOffset, 2.35, pos.z);
    bulbInst.setMatrixAt(i, m);

    // Light pool on wall (emissive circle)
    const wallPool = new THREE.CircleGeometry(0.4, 12);
    wallPool.rotateY(pos.side === -1 ? Math.PI / 2 : -Math.PI / 2);
    wallPool.translate(pos.x + wallOffset * 0.5, 2.5, pos.z);
    lightPoolWallGeos.push(wallPool);

    // Light pool on floor
    const floorPool = new THREE.CircleGeometry(0.5, 12);
    floorPool.rotateX(-Math.PI / 2);
    floorPool.translate(pos.x + wallOffset * 2, 0.02, pos.z);
    lightPoolFloorGeos.push(floorPool);
  });

  scene.add(bracketInst, bulbInst);

  // Merge light pools
  if (lightPoolWallGeos.length > 0) {
    const merged = mergeGeometries(lightPoolWallGeos);
    scene.add(new THREE.Mesh(merged, MATS.lightPoolWall));
    lightPoolWallGeos.forEach(g => g.dispose());
  }
  if (lightPoolFloorGeos.length > 0) {
    const merged = mergeGeometries(lightPoolFloorGeos);
    scene.add(new THREE.Mesh(merged, MATS.lightPoolFloor));
    lightPoolFloorGeos.forEach(g => g.dispose());
  }
}

// ========================================
// CEILING FIXTURES
// ========================================

function createCeilingFixtures(scene) {
  const fixtureGeos = [];
  const globeGeos = [];

  for (let z = 6; z < HALL.length; z += 12) {
    // Base plate
    const base = new THREE.CylinderGeometry(0.25, 0.3, 0.08, 8);
    base.translate(0, HALL.height - 0.04, z);
    fixtureGeos.push(base);

    // Globe
    const globe = new THREE.SphereGeometry(0.15, 10, 8);
    globe.translate(0, HALL.height - 0.2, z);
    globeGeos.push(globe);
  }

  if (fixtureGeos.length > 0) {
    const baseMat = new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.4, metalness: 0.5 });
    scene.add(new THREE.Mesh(mergeGeometries(fixtureGeos), baseMat));
    fixtureGeos.forEach(g => g.dispose());
  }
  if (globeGeos.length > 0) {
    const globeMat = new THREE.MeshStandardMaterial({
      color: 0xfffff0,
      emissive: C.sconceBulb,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85,
    });
    scene.add(new THREE.Mesh(mergeGeometries(globeGeos), globeMat));
    globeGeos.forEach(g => g.dispose());
  }
}

// ========================================
// STAIRCASE (end of hallway)
// ========================================

function createStaircase(scene) {
  const stairStartZ = HALL.length - 12;
  const stepCount = 14;
  const stepW = 4;
  const stepH = 0.2;
  const stepD = 0.55;

  const stepGeos = [];
  const carpetGeos = [];

  for (let i = 0; i < stepCount; i++) {
    const z = stairStartZ + i * stepD;
    const y = i * stepH;

    // Step
    const step = new THREE.BoxGeometry(stepW, stepH, stepD);
    step.translate(0, y + stepH / 2, z);
    stepGeos.push(step);

    // Carpet on step
    const carp = new THREE.BoxGeometry(HALL.carpetWidth * 0.7, 0.01, stepD - 0.04);
    carp.translate(0, y + stepH + 0.005, z);
    carpetGeos.push(carp);
  }

  if (stepGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(stepGeos), MATS.floor));
    stepGeos.forEach(g => g.dispose());
  }
  if (carpetGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(carpetGeos), MATS.carpet));
    carpetGeos.forEach(g => g.dispose());
  }

  // Simple side railings
  const railGeos = [];
  const railLength = stepCount * stepD;
  const railAngle = Math.atan2(stepCount * stepH, railLength);

  for (const side of [-1, 1]) {
    const rail = new THREE.BoxGeometry(0.06, 0.06, railLength * 1.05);
    const m = new THREE.Matrix4();
    m.makeRotationX(-railAngle);
    rail.applyMatrix4(m);
    rail.translate(
      side * (stepW / 2 - 0.1),
      stepCount * stepH * 0.5 + 0.5,
      stairStartZ + railLength / 2
    );
    railGeos.push(rail);
  }

  if (railGeos.length > 0) {
    scene.add(new THREE.Mesh(mergeGeometries(railGeos), MATS.molding));
    railGeos.forEach(g => g.dispose());
  }
}

// ========================================
// DOOR MARKERS (glow on floor)
// ========================================

function createDoorMarkers(chapters) {
  const hw = HALL.width / 2;
  const markers = [];

  chapters.forEach((chapter, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = HALL.doorStartZ + i * HALL.doorSpacing;
    const x = side * (hw - 0.5);

    // Glow plane on floor in front of door
    const glowMat = MATS.markerGlow.clone();
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 16),
      glowMat
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x * 0.6, 0.02, z);

    markers.push({ mesh: glow, material: glowMat, z, side, index: i });
  });

  return markers;
}

// ========================================
// LIGHTING
// ========================================

function createLighting(scene) {
  // Very dim warm ambient
  const ambient = new THREE.AmbientLight(0xfff5e0, 0.15);
  scene.add(ambient);

  // Two moving point lights (repositioned near player each frame)
  const hallLight1 = new THREE.PointLight(0xffd700, 0.8, 15, 1.5);
  hallLight1.position.set(0, 3.2, 10);
  scene.add(hallLight1);

  const hallLight2 = new THREE.PointLight(0xffd700, 0.6, 15, 1.5);
  hallLight2.position.set(0, 3.2, 22);
  scene.add(hallLight2);

  // A subtle warm directional for overall shape
  const dirLight = new THREE.DirectionalLight(0xfff0d0, 0.15);
  dirLight.position.set(0, 4, 20);
  scene.add(dirLight);

  return { hallLight1, hallLight2 };
}

// ========================================
// MAIN BUILD FUNCTION
// ========================================

export function buildHallway(scene, chapters) {
  // Scene settings
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.Fog(C.fog, 30, 55);

  createHallwayStructure(scene);
  const doors = createDoors(scene, chapters);
  createSconces(scene);
  createCeilingFixtures(scene);
  createStaircase(scene);

  const markers = createDoorMarkers(chapters);
  markers.forEach(m => scene.add(m.mesh));

  const lights = createLighting(scene);

  return { doors, markers, lights };
}

// ========================================
// UPDATE DOOR MARKERS
// ========================================

export function updateDoorMarkers(markers, currentIndex, visitedChapters, elapsedTime) {
  markers.forEach((marker, i) => {
    const isActive = i === currentIndex && !visitedChapters.has(i);
    const isVisited = visitedChapters.has(i);

    if (isActive) {
      const pulse = 0.4 + 0.35 * Math.sin(elapsedTime * 2.5);
      marker.material.opacity = pulse;
      marker.material.emissiveIntensity = 0.4 + 0.4 * Math.sin(elapsedTime * 2.5);
      marker.mesh.visible = true;
    } else if (isVisited) {
      marker.material.opacity = 0.08;
      marker.material.emissiveIntensity = 0.1;
      marker.mesh.visible = true;
    } else {
      marker.mesh.visible = false;
    }
  });
}

// ========================================
// UPDATE DYNAMIC LIGHTS (follow player)
// ========================================

export function updateHallwayLights(lights, playerZ) {
  // Position lights near the player for consistent quality
  lights.hallLight1.position.z = playerZ - 2;
  lights.hallLight2.position.z = playerZ + 8;
}

// ========================================
// HALLWAY BOUNDS
// ========================================

export const HALLWAY_BOUNDS = {
  minX: -2,
  maxX: 2,
  minZ: 2,
  maxZ: HALL.length - 5,
};

export const DOOR_TRIGGER_RADIUS = 2.0;

export function getDoorPosition(chapterIndex) {
  const side = chapterIndex % 2 === 0 ? -1 : 1;
  const z = HALL.doorStartZ + chapterIndex * HALL.doorSpacing;
  const hw = HALL.width / 2;
  return { x: side * (hw - 0.5) * 0.6, z };
}
