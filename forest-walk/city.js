import * as THREE from "three";

// ========================================
// PROCEDURAL CITY BUILDER
// Low-poly, Animal Crossing-esque, dark rainy city
// ========================================

// Color palette
const COLORS = {
  asphalt: 0x1a1a22,
  sidewalk: 0x2a2a35,
  sidewalkLine: 0x3a3a48,
  puddle: 0x0a1525,
  buildingDark: 0x1e1e2e,
  buildingMid: 0x252540,
  buildingLight: 0x2a2a4a,
  buildingWarm: 0x2e2228,
  buildingCool: 0x1e2838,
  windowWarm: 0xffcc66,
  windowCool: 0x88bbff,
  windowOff: 0x111122,
  doorGlow: 0xe74c6f,
  neonPink: 0xff3377,
  neonBlue: 0x3388ff,
  neonGreen: 0x33ff88,
  streetLight: 0xffd699,
  roofDark: 0x151525,
  rain: 0x8899bb,
  campfire: 0xff6633,
  christmas: 0xff2222,
  christmasGreen: 0x22cc44,
  coffee: 0xcc8844,
};

// ========================================
// BUILDING GENERATORS
// ========================================

function createWindow(width, height) {
  const geo = new THREE.PlaneGeometry(width, height);
  return geo;
}

function addWindowsToWall(group, wallWidth, wallHeight, wallDepth, faceDir, windowColor, litChance = 0.6) {
  const rows = Math.max(1, Math.floor(wallHeight / 1.8));
  const cols = Math.max(1, Math.floor(wallWidth / 1.5));
  const winW = 0.5;
  const winH = 0.7;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLit = Math.random() < litChance;
      const color = isLit
        ? Math.random() < 0.7
          ? COLORS.windowWarm
          : COLORS.windowCool
        : COLORS.windowOff;

      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: isLit ? color : 0x000000,
        emissiveIntensity: isLit ? 0.8 : 0,
        roughness: 0.3,
      });

      const win = new THREE.Mesh(createWindow(winW, winH), mat);
      const xOff = ((c + 0.5) / cols - 0.5) * (wallWidth * 0.7);
      const yOff = ((r + 0.5) / rows) * (wallHeight * 0.65) + wallHeight * 0.15;

      if (faceDir === "front") {
        win.position.set(xOff, yOff, wallDepth / 2 + 0.02);
      } else if (faceDir === "back") {
        win.position.set(xOff, yOff, -wallDepth / 2 - 0.02);
        win.rotation.y = Math.PI;
      } else if (faceDir === "left") {
        win.position.set(-wallWidth / 2 - 0.02, yOff, xOff);
        win.rotation.y = -Math.PI / 2;
      } else if (faceDir === "right") {
        win.position.set(wallWidth / 2 + 0.02, yOff, xOff);
        win.rotation.y = Math.PI / 2;
      }

      group.add(win);
    }
  }
}

function createBasicBuilding(width, height, depth, color, opts = {}) {
  const group = new THREE.Group();

  // Main body
  const bodyGeo = new THREE.BoxGeometry(width, height, depth);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.85,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = height / 2;
  group.add(body);

  // Roof overhang
  const roofGeo = new THREE.BoxGeometry(width + 0.4, 0.3, depth + 0.4);
  const roofMat = new THREE.MeshStandardMaterial({
    color: COLORS.roofDark,
    roughness: 0.9,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = height + 0.15;
  group.add(roof);

  // Windows on front face
  addWindowsToWall(group, width, height, depth, "front", COLORS.windowWarm, opts.litChance || 0.6);

  // Windows on sides
  if (width > 3) {
    addWindowsToWall(group, depth, height, width, "left", COLORS.windowWarm, 0.3);
    addWindowsToWall(group, depth, height, width, "right", COLORS.windowWarm, 0.3);
  }

  return group;
}

// ========================================
// SPECIFIC BUILDING TYPES
// ========================================

function createApartment(label) {
  const group = createBasicBuilding(6, 10, 5, COLORS.buildingCool, { litChance: 0.7 });

  // Fire escape (NYC style)
  for (let i = 0; i < 3; i++) {
    const platformGeo = new THREE.BoxGeometry(1.5, 0.08, 0.8);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.6 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(-1.5, 3 + i * 2.8, 2.9);
    group.add(platform);

    // Railing
    const railGeo = new THREE.BoxGeometry(1.5, 0.5, 0.05);
    const rail = new THREE.Mesh(railGeo, platformMat);
    rail.position.set(-1.5, 3.3 + i * 2.8, 3.25);
    group.add(rail);
  }

  addBuildingLabel(group, label || "NYC Apartment", 10.5, 0xe8899a);
  return group;
}

function createBar(label) {
  const group = createBasicBuilding(7, 5, 5, COLORS.buildingWarm, { litChance: 0.8 });

  // Neon sign
  const signGeo = new THREE.BoxGeometry(4, 0.8, 0.15);
  const signMat = new THREE.MeshStandardMaterial({
    color: COLORS.neonPink,
    emissive: COLORS.neonPink,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 4.2, 2.6);
  group.add(sign);

  // Neon light
  const neonLight = new THREE.PointLight(COLORS.neonPink, 3, 10);
  neonLight.position.set(0, 4.2, 3.5);
  group.add(neonLight);

  // Awning
  const awningGeo = new THREE.BoxGeometry(7.5, 0.15, 1.5);
  const awningMat = new THREE.MeshStandardMaterial({ color: 0x661133, roughness: 0.9 });
  const awning = new THREE.Mesh(awningGeo, awningMat);
  awning.position.set(0, 3.2, 3.2);
  group.add(awning);

  addBuildingLabel(group, label || "Bar", 5.5, COLORS.neonPink);
  return group;
}

function createRestaurant(label) {
  const group = createBasicBuilding(6, 4.5, 5, COLORS.buildingMid, { litChance: 0.9 });

  // Large front window
  const windowGeo = new THREE.PlaneGeometry(3, 2);
  const windowMat = new THREE.MeshStandardMaterial({
    color: COLORS.windowWarm,
    emissive: COLORS.windowWarm,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
  });
  const frontWindow = new THREE.Mesh(windowGeo, windowMat);
  frontWindow.position.set(0, 2, 2.52);
  group.add(frontWindow);

  // Interior warm light
  const interiorLight = new THREE.PointLight(COLORS.windowWarm, 2, 8);
  interiorLight.position.set(0, 2.5, 1);
  group.add(interiorLight);

  addBuildingLabel(group, label || "Restaurant", 5, COLORS.windowWarm);
  return group;
}

function createHall(label) {
  const group = createBasicBuilding(10, 7, 8, COLORS.buildingDark, { litChance: 0.4 });

  // Columns at entrance
  for (let i = -1; i <= 1; i += 2) {
    const colGeo = new THREE.CylinderGeometry(0.25, 0.3, 5, 8);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.7 });
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.set(i * 2, 2.5, 4.2);
    group.add(col);
  }

  // Banner
  const bannerGeo = new THREE.PlaneGeometry(4, 1.2);
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xcc3333,
    emissive: 0xcc3333,
    emissiveIntensity: 0.3,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 6, 4.1);
  group.add(banner);

  addBuildingLabel(group, label || "Meeting Hall", 7.5, 0xcc3333);
  return group;
}

function createHouse(label) {
  const group = new THREE.Group();

  // Main house body
  const bodyGeo = new THREE.BoxGeometry(6, 4, 5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.9 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 2;
  group.add(body);

  // Triangular roof
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-3.5, 0);
  roofShape.lineTo(0, 2.5);
  roofShape.lineTo(3.5, 0);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 5.5, bevelEnabled: false });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.9 });
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.set(0, 4, -2.75);
  group.add(roofMesh);

  // Windows
  addWindowsToWall(group, 6, 4, 5, "front", COLORS.windowWarm, 0.7);

  // Campfire in front
  const fireGroup = new THREE.Group();
  // Logs
  for (let i = 0; i < 4; i++) {
    const logGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 1 });
    const log = new THREE.Mesh(logGeo, logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 4) * Math.PI;
    log.position.y = 0.15;
    fireGroup.add(log);
  }
  // Fire light
  const fireLight = new THREE.PointLight(COLORS.campfire, 4, 8);
  fireLight.position.set(0, 0.8, 0);
  fireGroup.add(fireLight);
  // Fire glow sphere
  const fireGeo = new THREE.SphereGeometry(0.3, 8, 6);
  const fireMat = new THREE.MeshStandardMaterial({
    color: COLORS.campfire,
    emissive: COLORS.campfire,
    emissiveIntensity: 2,
    transparent: true,
    opacity: 0.7,
  });
  const fire = new THREE.Mesh(fireGeo, fireMat);
  fire.position.y = 0.5;
  fireGroup.add(fire);

  // Stone ring
  for (let i = 0; i < 8; i++) {
    const stoneGeo = new THREE.SphereGeometry(0.15, 5, 4);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1 });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    const a = (i / 8) * Math.PI * 2;
    stone.position.set(Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6);
    fireGroup.add(stone);
  }

  fireGroup.position.set(0, 0, 5);
  group.add(fireGroup);

  addBuildingLabel(group, label || "House", 7, COLORS.campfire);
  return group;
}

function createDecoratedStreet(label) {
  const group = new THREE.Group();

  // Small building backdrop
  const bldg = createBasicBuilding(5, 4, 4, 0x2a1a2a, { litChance: 0.5 });
  group.add(bldg);

  // Jack-o-lanterns
  for (let i = 0; i < 3; i++) {
    const pumpkin = new THREE.Group();
    const pumpGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const pumpMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 0.5,
    });
    const pump = new THREE.Mesh(pumpGeo, pumpMat);
    pumpkin.add(pump);

    const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.15, 5);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x226622 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.3;
    pumpkin.add(stem);

    pumpkin.position.set(-1.5 + i * 1.5, 0.3, 3);
    group.add(pumpkin);
  }

  // Spooky light
  const spookyLight = new THREE.PointLight(0xff6600, 2, 8);
  spookyLight.position.set(0, 2, 4);
  group.add(spookyLight);

  // Cobwebs (simple triangles)
  const webGeo = new THREE.BufferGeometry();
  const webVerts = new Float32Array([
    -2.5, 4, 2.1, -1.5, 3.5, 2.1, -2, 3, 2.1,
  ]);
  webGeo.setAttribute("position", new THREE.BufferAttribute(webVerts, 3));
  const webMat = new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const web = new THREE.Mesh(webGeo, webMat);
  group.add(web);

  addBuildingLabel(group, label || "Halloween", 4.5, 0xff6600);
  return group;
}

function createStadium(label) {
  const group = new THREE.Group();

  // Stadium wall segment
  const wallGeo = new THREE.BoxGeometry(12, 8, 3);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 4;
  group.add(wall);

  // Stadium arch entrance
  const archGroup = new THREE.Group();
  // Pillars
  for (let side = -1; side <= 1; side += 2) {
    const pillarGeo = new THREE.BoxGeometry(0.6, 5, 0.6);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x444455 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(side * 1.5, 2.5, 1.7);
    archGroup.add(pillar);
  }
  // Arch top
  const archTopGeo = new THREE.BoxGeometry(3.6, 0.6, 0.6);
  const archTop = new THREE.Mesh(archTopGeo, new THREE.MeshStandardMaterial({ color: 0x444455 }));
  archTop.position.set(0, 5.3, 1.7);
  archGroup.add(archTop);

  group.add(archGroup);

  // UGA colors — red lights
  const ugaLight = new THREE.PointLight(0xcc0000, 3, 10);
  ugaLight.position.set(0, 6, 3);
  group.add(ugaLight);

  // Tailgate props (simple table)
  const tableGeo = new THREE.BoxGeometry(2, 0.1, 1);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x664422 });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.set(4, 0.9, 4);
  group.add(table);
  // Table legs
  for (let tx = -0.8; tx <= 0.8; tx += 1.6) {
    for (let tz = -0.4; tz <= 0.4; tz += 0.8) {
      const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6);
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(4 + tx, 0.45, 4 + tz);
      group.add(leg);
    }
  }

  addBuildingLabel(group, label || "Stadium", 8.5, 0xcc0000);
  return group;
}

function createMusicVenue(label) {
  const group = createBasicBuilding(6, 5, 5, 0x1a1a30, { litChance: 0.5 });

  // Neon music note sign
  const noteGeo = new THREE.SphereGeometry(0.4, 8, 6);
  const noteMat = new THREE.MeshStandardMaterial({
    color: COLORS.neonBlue,
    emissive: COLORS.neonBlue,
    emissiveIntensity: 1.5,
  });
  const note = new THREE.Mesh(noteGeo, noteMat);
  note.position.set(2, 4.5, 2.7);
  group.add(note);

  // Note stem
  const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
  const stem = new THREE.Mesh(stemGeo, noteMat);
  stem.position.set(2.35, 5.2, 2.7);
  group.add(stem);

  // Colombian flag colors — subtle accent lights
  const yellowLight = new THREE.PointLight(0xffcc00, 1.5, 6);
  yellowLight.position.set(-2, 3, 3.5);
  group.add(yellowLight);

  const blueLight = new THREE.PointLight(0x0033cc, 1.5, 6);
  blueLight.position.set(2, 3, 3.5);
  group.add(blueLight);

  addBuildingLabel(group, label || "Music Venue", 5.5, COLORS.neonBlue);
  return group;
}

function createPartyHouse(label) {
  const group = createBasicBuilding(8, 5, 6, 0x2a1a28, { litChance: 0.8 });

  // Christmas lights string
  const lightsGroup = new THREE.Group();
  const lightColors = [COLORS.christmas, COLORS.christmasGreen, 0xffcc00, 0x3388ff, COLORS.christmas];
  for (let i = 0; i < 12; i++) {
    const bulbGeo = new THREE.SphereGeometry(0.08, 6, 4);
    const bulbColor = lightColors[i % lightColors.length];
    const bulbMat = new THREE.MeshStandardMaterial({
      color: bulbColor,
      emissive: bulbColor,
      emissiveIntensity: 1.2,
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    const x = ((i / 11) - 0.5) * 7;
    const sag = Math.sin((i / 11) * Math.PI) * 0.3;
    bulb.position.set(x, 4.8 - sag, 3.1);
    lightsGroup.add(bulb);
  }
  group.add(lightsGroup);

  // DJ booth (small platform)
  const boothGeo = new THREE.BoxGeometry(1.5, 0.8, 0.8);
  const boothMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a });
  const booth = new THREE.Mesh(boothGeo, boothMat);
  booth.position.set(-2, 0.4, 2);
  group.add(booth);

  // Disco ball
  const discoGeo = new THREE.SphereGeometry(0.3, 12, 8);
  const discoMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.1,
  });
  const disco = new THREE.Mesh(discoGeo, discoMat);
  disco.position.set(0, 4.5, 0);
  group.add(disco);

  // Party lights
  const partyLight1 = new THREE.PointLight(COLORS.neonPink, 3, 10);
  partyLight1.position.set(-2, 4, 2);
  group.add(partyLight1);

  const partyLight2 = new THREE.PointLight(COLORS.neonBlue, 2, 8);
  partyLight2.position.set(2, 4, 2);
  group.add(partyLight2);

  addBuildingLabel(group, label || "Party", 5.5, COLORS.neonPink);
  return group;
}

function createCookout(label) {
  const group = new THREE.Group();

  // Small fast-food building
  const bldg = createBasicBuilding(5, 3.5, 4, 0x2a1a18, { litChance: 0.9 });
  group.add(bldg);

  // Drive-through sign
  const signGeo = new THREE.BoxGeometry(2.5, 0.6, 0.15);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xff3333,
    emissive: 0xff3333,
    emissiveIntensity: 1,
  });
  const signMesh = new THREE.Mesh(signGeo, signMat);
  signMesh.position.set(0, 3.8, 2.1);
  group.add(signMesh);

  // Red glow
  const cookoutLight = new THREE.PointLight(0xff3333, 3, 8);
  cookoutLight.position.set(0, 3.5, 3);
  group.add(cookoutLight);

  // Car (simple box representation)
  const carBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 3),
    new THREE.MeshStandardMaterial({ color: 0x222244 })
  );
  carBody.position.set(4, 0.5, 2);
  group.add(carBody);

  const carTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.5, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x222244 })
  );
  carTop.position.set(4, 1.05, 1.8);
  group.add(carTop);

  // Headlights
  for (let s = -1; s <= 1; s += 2) {
    const headlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 4),
      new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: 0xffffcc,
        emissiveIntensity: 1,
      })
    );
    headlight.position.set(4 + s * 0.6, 0.5, 0.5);
    group.add(headlight);
  }

  addBuildingLabel(group, label || "Cookout", 4, 0xff3333);
  return group;
}

function createCoffeeShop(label) {
  const group = createBasicBuilding(5, 3.5, 4, 0x2a2218, { litChance: 0.9 });

  // Large warm front window
  const windowGeo = new THREE.PlaneGeometry(3.5, 2);
  const windowMat = new THREE.MeshStandardMaterial({
    color: COLORS.coffee,
    emissive: COLORS.coffee,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.7,
  });
  const frontWindow = new THREE.Mesh(windowGeo, windowMat);
  frontWindow.position.set(0, 2, 2.02);
  group.add(frontWindow);

  // Warm interior glow
  const warmLight = new THREE.PointLight(COLORS.coffee, 4, 10);
  warmLight.position.set(0, 2, 0);
  group.add(warmLight);

  // Outdoor table + chairs
  const tableGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x554433 });
  const coffeeTable = new THREE.Mesh(tableGeo, tableMat);
  coffeeTable.position.set(2, 0.75, 3.5);
  group.add(coffeeTable);
  // Table leg
  const tLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6),
    tableMat
  );
  tLeg.position.set(2, 0.38, 3.5);
  group.add(tLeg);

  // Chairs
  for (let s = -1; s <= 1; s += 2) {
    const chairSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.04, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x443322 })
    );
    chairSeat.position.set(2 + s * 0.7, 0.5, 3.5);
    group.add(chairSeat);
  }

  // Sign with warm glow
  const shopSign = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.5, 0.1),
    new THREE.MeshStandardMaterial({
      color: COLORS.coffee,
      emissive: COLORS.coffee,
      emissiveIntensity: 0.6,
    })
  );
  shopSign.position.set(0, 3.5, 2.1);
  group.add(shopSign);

  addBuildingLabel(group, label || "Coffee Shop", 4, COLORS.coffee);
  return group;
}

// ========================================
// BUILDING LABEL (floating text indicator)
// ========================================

function addBuildingLabel(group, text, yPos, color) {
  // Create a canvas-based text label
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "transparent";
  ctx.fillRect(0, 0, 512, 64);
  ctx.font = "bold 32px 'Lato', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.fillText(text, 256, 42);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.9,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(0, yPos, 0);
  sprite.scale.set(5, 0.65, 1);
  group.add(sprite);
}

// ========================================
// BUILDING FACTORY
// ========================================

const buildingFactories = {
  apartment: createApartment,
  bar: createBar,
  restaurant: createRestaurant,
  hall: createHall,
  house: createHouse,
  decorated_street: createDecoratedStreet,
  stadium: createStadium,
  music_venue: createMusicVenue,
  party_house: createPartyHouse,
  cookout: createCookout,
  coffee_shop: createCoffeeShop,
};

// ========================================
// FILLER BUILDINGS (background skyline)
// ========================================

function createFillerBuilding() {
  const w = 3 + Math.random() * 5;
  const h = 4 + Math.random() * 12;
  const d = 3 + Math.random() * 4;
  const colors = [COLORS.buildingDark, COLORS.buildingMid, COLORS.buildingLight, COLORS.buildingCool, COLORS.buildingWarm];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return createBasicBuilding(w, h, d, color, { litChance: 0.3 + Math.random() * 0.4 });
}

// ========================================
// STREET LIGHTS
// ========================================

function createStreetLight() {
  const group = new THREE.Group();

  // Post
  const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 4, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x333340, metalness: 0.5, roughness: 0.5 });
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.y = 2;
  group.add(post);

  // Arm
  const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
  const arm = new THREE.Mesh(armGeo, postMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.6, 3.8, 0);
  group.add(arm);

  // Lamp housing
  const lampGeo = new THREE.CylinderGeometry(0.3, 0.15, 0.25, 8);
  const lampMat = new THREE.MeshStandardMaterial({
    color: COLORS.streetLight,
    emissive: COLORS.streetLight,
    emissiveIntensity: 0.8,
  });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.set(1.1, 3.7, 0);
  group.add(lamp);

  // Light
  const light = new THREE.PointLight(COLORS.streetLight, 2.5, 12);
  light.position.set(1.1, 3.5, 0);
  group.add(light);

  return group;
}

// ========================================
// RAIN SYSTEM
// ========================================

export function createRainSystem(scene, count = 800) {
  const rainGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = Math.random() * 25;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    velocities.push(15 + Math.random() * 10); // Fall speed
  }

  rainGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const rainMat = new THREE.PointsMaterial({
    color: COLORS.rain,
    size: 0.08,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
  });

  const rain = new THREE.Points(rainGeo, rainMat);
  scene.add(rain);

  return {
    mesh: rain,
    velocities,
    update(dt, playerPos) {
      const posArr = rainGeo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        // Fall down with slight wind
        posArr[i * 3] += -1.5 * dt; // Wind drift
        posArr[i * 3 + 1] -= velocities[i] * dt;
        posArr[i * 3 + 2] += -0.5 * dt; // Slight z drift

        // Reset when below ground
        if (posArr[i * 3 + 1] < 0) {
          posArr[i * 3] = playerPos.x + (Math.random() - 0.5) * 60;
          posArr[i * 3 + 1] = 20 + Math.random() * 5;
          posArr[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * 60;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
    },
  };
}

// ========================================
// GROUND (wet asphalt + sidewalks)
// ========================================

function createCityGround(scene) {
  // Main road
  const roadGeo = new THREE.PlaneGeometry(12, 200);
  const roadMat = new THREE.MeshStandardMaterial({
    color: COLORS.asphalt,
    roughness: 0.5,
    metalness: 0.2,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, 75);
  scene.add(road);

  // Road center line (dashed)
  for (let z = -5; z < 155; z += 4) {
    const lineGeo = new THREE.PlaneGeometry(0.15, 2);
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x555533,
      roughness: 0.6,
    });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.02, z);
    scene.add(line);
  }

  // Left sidewalk
  const leftSidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 200),
    new THREE.MeshStandardMaterial({ color: COLORS.sidewalk, roughness: 0.7, metalness: 0.1 })
  );
  leftSidewalk.rotation.x = -Math.PI / 2;
  leftSidewalk.position.set(-9, 0.02, 75);
  scene.add(leftSidewalk);

  // Right sidewalk
  const rightSidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 200),
    new THREE.MeshStandardMaterial({ color: COLORS.sidewalk, roughness: 0.7, metalness: 0.1 })
  );
  rightSidewalk.rotation.x = -Math.PI / 2;
  rightSidewalk.position.set(9, 0.02, 75);
  scene.add(rightSidewalk);

  // Large ground plane for beyond the city
  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 1 })
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.set(0, -0.01, 75);
  scene.add(outerGround);

  // Puddles
  for (let i = 0; i < 15; i++) {
    const puddleSize = 0.5 + Math.random() * 1.5;
    const puddleGeo = new THREE.CircleGeometry(puddleSize, 12);
    const puddleMat = new THREE.MeshStandardMaterial({
      color: COLORS.puddle,
      roughness: 0.05,
      metalness: 0.8,
      transparent: true,
      opacity: 0.6,
    });
    const puddle = new THREE.Mesh(puddleGeo, puddleMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(
      (Math.random() - 0.5) * 10,
      0.03,
      Math.random() * 150
    );
    scene.add(puddle);
  }
}

// ========================================
// ENTRANCE MARKERS
// ========================================

function createEntranceMarker(color) {
  const group = new THREE.Group();

  // Glowing ground circle
  const ringGeo = new THREE.RingGeometry(1.0, 1.4, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: color || COLORS.doorGlow,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  // Floating arrow
  const arrowGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
  const arrowMat = new THREE.MeshStandardMaterial({
    color: color || COLORS.doorGlow,
    emissive: color || COLORS.doorGlow,
    emissiveIntensity: 0.8,
  });
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.rotation.z = Math.PI; // Point down
  arrow.position.y = 2.5;
  group.add(arrow);

  // Point light
  const light = new THREE.PointLight(color || COLORS.doorGlow, 2, 8);
  light.position.y = 1.5;
  group.add(light);

  return { group, ring, arrow, light };
}

// ========================================
// MAIN CITY BUILDER
// ========================================

export function buildCity(scene, chapters) {
  const storyBuildings = [];
  const entranceMarkers = [];

  createCityGround(scene);

  // Place story buildings along the street
  chapters.forEach((chapter, index) => {
    const factory = buildingFactories[chapter.buildingType] || createBasicBuilding.bind(null, 5, 5, 4, COLORS.buildingMid);
    const building = factory(chapter.buildingLabel);

    // Alternate sides of the street
    const side = index % 2 === 0 ? -1 : 1;
    const xPos = side * 14;
    const zPos = chapter.hubPosition.z;

    building.position.set(xPos, 0, zPos);

    // Rotate buildings to face the street
    if (side === -1) {
      building.rotation.y = Math.PI / 2;
    } else {
      building.rotation.y = -Math.PI / 2;
    }

    scene.add(building);
    storyBuildings.push(building);

    // Entrance marker on the sidewalk
    const entranceX = side * 7;
    const marker = createEntranceMarker(COLORS.doorGlow);
    marker.group.position.set(entranceX, 0, zPos);
    scene.add(marker.group);
    entranceMarkers.push(marker);
  });

  // Filler buildings for city depth
  const fillerPositions = [];
  for (let z = -10; z < 165; z += 8 + Math.random() * 5) {
    // Far left
    const left = createFillerBuilding();
    const lx = -22 - Math.random() * 15;
    left.position.set(lx, 0, z + Math.random() * 3);
    left.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
    scene.add(left);
    fillerPositions.push(left.position);

    // Far right
    const right = createFillerBuilding();
    const rx = 22 + Math.random() * 15;
    right.position.set(rx, 0, z + Math.random() * 3);
    right.rotation.y = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
    scene.add(right);
    fillerPositions.push(right.position);
  }

  // Street lights along both sides
  for (let z = 0; z < 160; z += 12) {
    const leftLight = createStreetLight();
    leftLight.position.set(-6, 0, z);
    scene.add(leftLight);

    const rightLight = createStreetLight();
    rightLight.position.set(6, 0, z);
    rightLight.rotation.y = Math.PI;
    scene.add(rightLight);
  }

  return { storyBuildings, entranceMarkers };
}

// ========================================
// ANIMATE ENTRANCE MARKERS
// ========================================

export function updateEntranceMarkers(markers, activeIndex, visitedSet, elapsedTime) {
  markers.forEach((marker, i) => {
    const isActive = i === activeIndex;
    const isVisited = visitedSet.has(i);

    if (isVisited) {
      // Dim visited markers
      marker.arrow.visible = false;
      marker.ring.material.opacity = 0.1;
      marker.light.intensity = 0.3;
    } else if (isActive) {
      // Pulse active marker
      const pulse = 0.4 + Math.sin(elapsedTime * 3) * 0.3;
      marker.ring.material.opacity = pulse;
      marker.arrow.visible = true;
      marker.arrow.position.y = 2.5 + Math.sin(elapsedTime * 2) * 0.3;
      marker.arrow.rotation.y = elapsedTime * 2;
      marker.light.intensity = 2 + Math.sin(elapsedTime * 3) * 1;
    } else {
      // Dim future markers
      marker.arrow.visible = false;
      marker.ring.material.opacity = 0.15;
      marker.light.intensity = 0.5;
    }
  });
}
