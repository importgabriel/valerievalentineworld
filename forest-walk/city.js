import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ========================================
// ANIMAL CROSSING COLOR PALETTE
// ========================================

const AC = {
  grass: 0x7ec850,
  grassLight: 0x8fd45e,
  dirtPath: 0xd4b896,
  dirtEdge: 0xc4a880,

  // Building pastels
  pink: 0xf4a6b0,
  mint: 0xa8e6cf,
  lavender: 0xc3b1e1,
  cream: 0xfff5e6,
  peach: 0xfcd5b5,
  babyBlue: 0xa8d8ea,
  yellow: 0xfff3b0,
  sage: 0xb5c99a,
  coral: 0xf4978e,
  warmWhite: 0xfff8f0,

  // Roofs
  roofBrown: 0x8b6914,
  roofRed: 0xc4655a,
  roofBlue: 0x6b8fb5,
  roofGreen: 0x6ba36b,
  roofPurple: 0x9b7cb5,

  // Accents
  windowYellow: 0xfff8dc,
  doorBrown: 0x6b4226,
  wood: 0xa0724a,
  white: 0xffffff,
  brownDark: 0x5c4a3a,

  // Markers
  markerGreen: 0x7ecda4,
  markerGold: 0xf9d976,

  // Flowers
  flowerRed: 0xe8615a,
  flowerBlue: 0x6b9bd2,
  flowerYellow: 0xf9d976,
  flowerPink: 0xf4a6b0,
  flowerWhite: 0xfff5f5,
};

// ========================================
// SHARED MATERIALS
// ========================================

const MATS = {
  grass: new THREE.MeshStandardMaterial({ color: AC.grass, roughness: 0.95, metalness: 0 }),
  dirt: new THREE.MeshStandardMaterial({ color: AC.dirtPath, roughness: 0.85, metalness: 0.05 }),
  dirtEdge: new THREE.MeshStandardMaterial({ color: AC.dirtEdge, roughness: 0.9, metalness: 0 }),
  windowLit: new THREE.MeshStandardMaterial({
    color: AC.windowYellow,
    emissive: AC.windowYellow,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
  }),
  door: new THREE.MeshStandardMaterial({ color: AC.doorBrown, roughness: 0.7, metalness: 0.1 }),
  wood: new THREE.MeshStandardMaterial({ color: AC.wood, roughness: 0.8, metalness: 0.05 }),
  white: new THREE.MeshStandardMaterial({ color: AC.white, roughness: 0.8, metalness: 0 }),
};

function wallMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
}

function roofMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
}

// ========================================
// BUILDING CONFIGS
// ========================================

const BUILDING_CONFIGS = {
  apartment: { wallColor: AC.pink, roofColor: AC.roofRed, width: 7, height: 5, depth: 6 },
  bar: { wallColor: AC.mint, roofColor: AC.roofGreen, width: 6, height: 4, depth: 5 },
  restaurant: { wallColor: AC.peach, roofColor: AC.roofBrown, width: 7, height: 4.5, depth: 6 },
  hall: { wallColor: AC.cream, roofColor: AC.roofBlue, width: 9, height: 6, depth: 7 },
  house: { wallColor: AC.yellow, roofColor: AC.roofBrown, width: 6, height: 4, depth: 5 },
  decorated_street: { wallColor: AC.sage, roofColor: AC.roofGreen, width: 5, height: 3.5, depth: 4 },
  stadium: { wallColor: AC.warmWhite, roofColor: AC.roofRed, width: 10, height: 5, depth: 8 },
  music_venue: { wallColor: AC.babyBlue, roofColor: AC.roofPurple, width: 7, height: 4.5, depth: 5 },
  party_house: { wallColor: AC.lavender, roofColor: AC.roofRed, width: 7, height: 4.5, depth: 6 },
  cookout: { wallColor: AC.coral, roofColor: AC.roofBrown, width: 6, height: 4, depth: 5 },
  coffee_shop: { wallColor: AC.cream, roofColor: AC.roofBrown, width: 7, height: 4, depth: 6 },
};

// ========================================
// AC BUILDING GENERATOR
// ========================================

function createACBuilding(type) {
  const config = BUILDING_CONFIGS[type] || BUILDING_CONFIGS.house;
  const group = new THREE.Group();
  const { width, height, depth } = config;
  const wMat = wallMat(config.wallColor);
  const rMat = roofMat(config.roofColor);

  // Main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wMat);
  body.position.y = height / 2;
  group.add(body);

  // Roof (triangular prism)
  const roofOverhang = 0.6;
  const roofHeight = height * 0.4;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-(width / 2 + roofOverhang), 0);
  roofShape.lineTo(0, roofHeight);
  roofShape.lineTo(width / 2 + roofOverhang, 0);
  roofShape.lineTo(-(width / 2 + roofOverhang), 0);

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: depth + roofOverhang,
    bevelEnabled: false,
  });
  const roof = new THREE.Mesh(roofGeo, rMat);
  roof.position.set(0, height, -(depth + roofOverhang) / 2);
  group.add(roof);

  // Door
  const doorW = 1.2;
  const doorH = 2.2;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), MATS.door);
  door.position.set(0, doorH / 2, depth / 2 + 0.01);
  group.add(door);

  // Windows (batched into single geometry)
  const windowGeos = [];
  const winW = 0.8;
  const winH = 0.9;
  const cols = Math.max(2, Math.floor(width / 2.5));
  const rows = Math.max(1, Math.floor(height / 2.5));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = -((cols - 1) * 2) / 2 + c * 2;
      const wy = 1.5 + r * 2.2;
      if (wy + winH / 2 > height - 0.5) continue;
      if (Math.abs(wx) < doorW / 2 + 0.3 && r === 0) continue;

      const geo = new THREE.PlaneGeometry(winW, winH);
      geo.translate(wx, wy, depth / 2 + 0.02);
      windowGeos.push(geo);
    }
  }

  if (windowGeos.length > 0) {
    const merged = mergeGeometries(windowGeos);
    group.add(new THREE.Mesh(merged, MATS.windowLit));
    windowGeos.forEach((g) => g.dispose());
  }

  // Awning over door
  const awningMat = new THREE.MeshStandardMaterial({
    color: config.roofColor,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(doorW + 1, 1), awningMat);
  awning.position.set(0, doorH + 0.3, depth / 2 + 0.4);
  awning.rotation.x = -Math.PI * 0.15;
  group.add(awning);

  // Type-specific decorations
  addDecorations(group, type, config);

  return group;
}

function addDecorations(group, type, config) {
  const { width, height, depth } = config;

  switch (type) {
    case "bar":
    case "coffee_shop": {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 8), MATS.wood);
      table.position.set(width / 2 + 1.5, 0.7, depth / 4);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 4), MATS.wood);
      leg.position.set(width / 2 + 1.5, 0.35, depth / 4);
      group.add(table, leg);
      break;
    }
    case "stadium": {
      const buntingMat = new THREE.MeshStandardMaterial({ color: AC.coral, roughness: 0.8, side: THREE.DoubleSide });
      const bunting = new THREE.Mesh(new THREE.PlaneGeometry(width + 2, 0.5), buntingMat);
      bunting.position.set(0, height - 0.5, depth / 2 + 0.1);
      group.add(bunting);
      break;
    }
    case "party_house": {
      const colors = [AC.flowerRed, AC.flowerBlue, AC.flowerYellow];
      colors.forEach((color, i) => {
        const balloon = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 6),
          new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
        );
        balloon.position.set(-1 + i, height + 1 + i * 0.3, depth / 2);
        group.add(balloon);
      });
      break;
    }
    case "music_venue": {
      const noteMat = new THREE.MeshStandardMaterial({ color: AC.brownDark, roughness: 0.7 });
      const noteHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), noteMat);
      noteHead.position.set(width / 2 - 0.5, height - 1, depth / 2 + 0.1);
      const noteStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 4), noteMat);
      noteStem.position.set(width / 2 - 0.2, height - 0.3, depth / 2 + 0.1);
      group.add(noteHead, noteStem);
      break;
    }
    case "house": {
      const fenceGeos = [];
      for (let i = 0; i < 5; i++) {
        const picket = new THREE.BoxGeometry(0.1, 0.8, 0.05);
        picket.translate(-1.5 + i * 0.6, 0.4, depth / 2 + 0.8);
        fenceGeos.push(picket);
      }
      const rail = new THREE.BoxGeometry(3, 0.08, 0.05);
      rail.translate(-0.3, 0.6, depth / 2 + 0.8);
      fenceGeos.push(rail);
      const rail2 = new THREE.BoxGeometry(3, 0.08, 0.05);
      rail2.translate(-0.3, 0.25, depth / 2 + 0.8);
      fenceGeos.push(rail2);

      const fence = new THREE.Mesh(mergeGeometries(fenceGeos), MATS.white);
      group.add(fence);
      fenceGeos.forEach((g) => g.dispose());
      break;
    }
    case "decorated_street": {
      const flowerColors = [AC.flowerRed, AC.flowerPink, AC.flowerYellow, AC.flowerBlue, AC.flowerWhite];
      for (let i = 0; i < 8; i++) {
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 6, 4),
          new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length], roughness: 0.6 })
        );
        const angle = (i / 8) * Math.PI * 2;
        flower.position.set(Math.cos(angle) * (width / 2 + 1.5), 0.15, Math.sin(angle) * (depth / 2 + 1.5));
        group.add(flower);
      }
      break;
    }
    case "cookout": {
      const grillMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.3 });
      const grillBody = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 8), grillMat);
      grillBody.position.set(width / 2 + 1.5, 0.9, 0);
      const grillLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 4), grillMat);
      grillLeg.position.set(width / 2 + 1.5, 0.35, 0);
      group.add(grillBody, grillLeg);
      break;
    }
    case "restaurant": {
      const chairMat = new THREE.MeshStandardMaterial({ color: AC.wood, roughness: 0.8 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.6), chairMat);
      seat.position.set(width / 2 + 1.2, 0.45, -depth / 4);
      const chairLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), chairMat);
      chairLeg.position.set(width / 2 + 1.2, 0.225, -depth / 4);
      group.add(seat, chairLeg);
      break;
    }
  }
}

// ========================================
// GROUND & PATH
// ========================================

function createGround(scene) {
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), MATS.grass);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.01;
  scene.add(grass);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(10, 200), MATS.dirt);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 80);
  scene.add(path);

  const edgeL = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 200), MATS.dirtEdge);
  edgeL.rotation.x = -Math.PI / 2;
  edgeL.position.set(-5.75, 0.005, 80);
  scene.add(edgeL);

  const edgeR = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 200), MATS.dirtEdge);
  edgeR.rotation.x = -Math.PI / 2;
  edgeR.position.set(5.75, 0.005, 80);
  scene.add(edgeR);
}

// ========================================
// FLOWERS (batched by color)
// ========================================

function scatterFlowers(scene) {
  const flowerColors = [AC.flowerRed, AC.flowerPink, AC.flowerYellow, AC.flowerBlue, AC.flowerWhite];
  const allGeos = flowerColors.map(() => []);

  for (let i = 0; i < 40; i++) {
    const geo = new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 6, 4);
    let x = (Math.random() - 0.5) * 30;
    x = x > 0 ? x + 6 : x - 6;
    const z = Math.random() * 160;
    geo.translate(x, 0.1, z);
    allGeos[i % flowerColors.length].push(geo);
  }

  allGeos.forEach((geos, ci) => {
    if (geos.length > 0) {
      const merged = mergeGeometries(geos);
      const mat = new THREE.MeshStandardMaterial({ color: flowerColors[ci], roughness: 0.6 });
      scene.add(new THREE.Mesh(merged, mat));
      geos.forEach((g) => g.dispose());
    }
  });
}

// ========================================
// LANTERNS (InstancedMesh — zero PointLights)
// ========================================

function createLanterns(scene) {
  const positions = [];
  for (let z = 5; z < 160; z += 15) {
    positions.push([-6.5, z]);
    positions.push([6.5, z]);
  }

  const postMat = new THREE.MeshStandardMaterial({ color: AC.brownDark, roughness: 0.7, metalness: 0.2 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: AC.markerGold,
    emissive: AC.markerGold,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });

  const postInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 6), postMat, positions.length);
  const lampInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 6), lampMat, positions.length);

  const m = new THREE.Matrix4();
  positions.forEach(([x, z], i) => {
    m.makeTranslation(x, 1.25, z);
    postInst.setMatrixAt(i, m);
    m.makeTranslation(x, 2.65, z);
    lampInst.setMatrixAt(i, m);
  });

  scene.add(postInst, lampInst);
}

// ========================================
// TREES (InstancedMesh)
// ========================================

function scatterTrees(scene) {
  const treePos = [];
  for (let z = 10; z < 160; z += 12) {
    treePos.push([-15 - Math.random() * 5, z + Math.random() * 4]);
    treePos.push([15 + Math.random() * 5, z + Math.random() * 4]);
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: AC.wood, roughness: 0.85 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x4a9e4a, roughness: 0.9 });

  const trunkInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6), trunkMat, treePos.length);
  const canopyInst = new THREE.InstancedMesh(new THREE.SphereGeometry(1.2, 8, 6), canopyMat, treePos.length);

  const m = new THREE.Matrix4();
  treePos.forEach(([x, z], i) => {
    m.makeTranslation(x, 0.75, z);
    trunkInst.setMatrixAt(i, m);
    m.makeTranslation(x, 2.2, z);
    canopyInst.setMatrixAt(i, m);
  });

  scene.add(trunkInst, canopyInst);
}

// ========================================
// FILLER BUILDINGS (batched by color)
// ========================================

function createFillerBuildings(scene) {
  const fillerColors = [AC.pink, AC.mint, AC.lavender, AC.cream, AC.peach, AC.babyBlue, AC.yellow, AC.sage];

  const entries = [];
  for (let z = 0; z < 160; z += 8) {
    entries.push({ x: -20 - Math.random() * 8, z: z + Math.random() * 4, h: 3 + Math.random() * 3, ci: Math.floor(Math.random() * fillerColors.length) });
    entries.push({ x: 20 + Math.random() * 8, z: z + Math.random() * 4, h: 3 + Math.random() * 3, ci: Math.floor(Math.random() * fillerColors.length) });
  }

  const groups = {};
  entries.forEach((e) => {
    if (!groups[e.ci]) groups[e.ci] = [];
    groups[e.ci].push(e);
  });

  Object.entries(groups).forEach(([ci, items]) => {
    const geos = items.map((e) => {
      const w = 4 + Math.random() * 3;
      const d = 4 + Math.random() * 2;
      const g = new THREE.BoxGeometry(w, e.h, d);
      g.translate(e.x, e.h / 2, e.z);
      return g;
    });
    const merged = mergeGeometries(geos);
    scene.add(new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: fillerColors[parseInt(ci)], roughness: 0.9 })));
    geos.forEach((g) => g.dispose());
  });

  const roofGeos = entries.map((e) => {
    const g = new THREE.BoxGeometry(5 + Math.random() * 2, 0.5, 5 + Math.random());
    g.translate(e.x, e.h + 0.25, e.z);
    return g;
  });
  const mergedRoofs = mergeGeometries(roofGeos);
  scene.add(new THREE.Mesh(mergedRoofs, new THREE.MeshStandardMaterial({ color: AC.roofBrown, roughness: 0.85 })));
  roofGeos.forEach((g) => g.dispose());
}

// ========================================
// BUILDING LABEL (canvas sprite)
// ========================================

function addBuildingLabel(group, text, yPos) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(255, 248, 240, 0.92)";
  const rr = 16;
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

  ctx.strokeStyle = "#8b7e6a";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#5c4a3a";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(0, yPos, 0);
  sprite.scale.set(5, 0.65, 1);
  group.add(sprite);
}

// ========================================
// ENTRANCE MARKERS (AC leaf/star style)
// ========================================

function createEntranceMarker(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const ringMat = new THREE.MeshStandardMaterial({
    color: AC.markerGreen,
    emissive: AC.markerGreen,
    emissiveIntensity: 0.5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.3, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  const starMat = new THREE.MeshStandardMaterial({
    color: AC.markerGold,
    emissive: AC.markerGold,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), starMat);
  star.position.y = 2.5;
  group.add(star);

  return { group, ring, ringMat, star, starMat };
}

// ========================================
// MAIN BUILD FUNCTION
// ========================================

export function buildCity(scene, chapters) {
  createGround(scene);
  scatterFlowers(scene);
  createLanterns(scene);
  scatterTrees(scene);
  createFillerBuildings(scene);

  const storyBuildings = [];
  const entranceMarkers = [];

  chapters.forEach((chapter, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const buildingX = side * 14;
    const buildingZ = chapter.hubPosition.z;

    const building = createACBuilding(chapter.buildingType);
    building.position.set(buildingX, 0, buildingZ);
    if (side === 1) building.rotation.y = Math.PI;
    scene.add(building);

    const cfg = BUILDING_CONFIGS[chapter.buildingType] || BUILDING_CONFIGS.house;
    addBuildingLabel(building, chapter.buildingLabel, cfg.height + cfg.height * 0.4 + 1);

    storyBuildings.push(building);

    const entranceX = side * 7;
    const marker = createEntranceMarker(entranceX, buildingZ);
    scene.add(marker.group);
    entranceMarkers.push(marker);
  });

  return { storyBuildings, entranceMarkers };
}

// ========================================
// UPDATE ENTRANCE MARKERS
// ========================================

export function updateEntranceMarkers(markers, currentIndex, visitedChapters, elapsedTime) {
  markers.forEach((marker, i) => {
    const isActive = i === currentIndex && !visitedChapters.has(i);
    const isVisited = visitedChapters.has(i);

    if (isActive) {
      const pulse = 0.5 + 0.3 * Math.sin(elapsedTime * 2.5);
      marker.ringMat.opacity = pulse;
      marker.ringMat.emissiveIntensity = 0.4 + 0.4 * Math.sin(elapsedTime * 2.5);
      marker.star.position.y = 2.5 + Math.sin(elapsedTime * 1.8) * 0.3;
      marker.star.rotation.y = elapsedTime * 1.5;
      marker.star.visible = true;
    } else if (isVisited) {
      marker.ringMat.opacity = 0.15;
      marker.ringMat.emissiveIntensity = 0.1;
      marker.star.visible = false;
    } else {
      marker.ringMat.opacity = 0.2;
      marker.ringMat.emissiveIntensity = 0.2;
      marker.star.visible = false;
    }
  });
}
