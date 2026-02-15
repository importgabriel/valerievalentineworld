// ========================================
// CITY SCENE — Low-poly GLB city with Edificio building
// ========================================

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MATS, PALETTE } from "./constants.js";
import { createSkyBackdrop } from "../levelUtils.js";
import { GLBNPCSystem } from "./NPCSystem.js";

// Building entrance position (used for trigger)
export const BUILDING_ENTRANCE = new THREE.Vector3(0, 0, 130);

// City bounds for player movement
export const CITY_BOUNDS = {
  minX: -20,
  maxX: 20,
  minZ: -10,
  maxZ: 140,
};

export function buildCityScene(cityGltf, peopleGltf, options = {}) {
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
  const { cityModel, groundMeshes } = setupCityModel(scene, cityGltf);

  // Keep procedural elements that the GLB doesn't have
  const edificio = setupEdificioBuilding(scene, options.edificioGltf);
  buildSubwayExit(scene);
  buildStreetElements(scene);

  // Compute building colliders from city model for NPC avoidance
  const buildingColliders = computeBuildingColliders(cityModel, edificio);

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
      walkClip: options.walkClip || null,
      buildingColliders,
    });
  }

  // Navigation waypoint — floating marker above building entrance
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
    cityModel,
    groundMeshes,
    edificioCollider: edificio ? edificio.collider : null,
    buildingColliders,

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
  const groundMeshes = [];

  if (!cityGltf) {
    // Fallback: build a simple procedural ground if GLB is missing
    const fallbackGround = buildFallbackGround(scene);
    if (fallbackGround) groundMeshes.push(fallbackGround);
    return { cityModel: null, groundMeshes };
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

  // Only the flat ground plane is used for ground raycasting (not buildings/lamps/NPCs)
  groundMeshes.push(ground);

  return { cityModel, groundMeshes };
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

  return ground;
}

// ========================================
// EDIFICIO BUILDING (GLB model — destination trigger)
// ========================================

function setupEdificioBuilding(scene, edificioGltf) {
  if (!edificioGltf) {
    // Fallback: simple procedural building if GLB is missing
    const fallback = new THREE.Mesh(
      new THREE.BoxGeometry(14, 60, 14),
      new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.4, metalness: 0.3 })
    );
    fallback.position.set(0, 30, 137);
    fallback.castShadow = true;
    scene.add(fallback);

    const collider = new THREE.Box3(
      new THREE.Vector3(-7, 0, 130), new THREE.Vector3(7, 60, 144)
    );
    return { model: fallback, collider };
  }

  const model = edificioGltf.scene;

  // Compute original bounds
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Scale to ~60 units tall (matching the city's building scale)
  const targetHeight = 60;
  const scale = targetHeight / size.y;
  model.scale.setScalar(scale);

  // Position: center on x=0, base at y=0, centered at z=137
  model.position.set(
    -center.x * scale,
    -box.min.y * scale,
    137 - center.z * scale
  );

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // Fix materials that appear all-black: ensure proper color space on
      // textures, clamp metalness, and boost roughness so PBR lighting works.
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat || !mat.isMeshStandardMaterial) continue;

        // Ensure base color textures use sRGB encoding
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.needsUpdate = true;
        }

        // Highly metallic surfaces with no environment map look black;
        // reduce metalness and raise roughness so diffuse lighting shows.
        if (mat.metalness > 0.6) mat.metalness = 0.3;
        if (mat.roughness < 0.3) mat.roughness = 0.5;

        mat.needsUpdate = true;
      }
    }
  });

  scene.add(model);

  // Compute world-space collider after positioning
  const worldBox = new THREE.Box3().setFromObject(model);

  // Glowing entrance marker on the ground
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
  marker.position.set(0, 0.02, 130);
  scene.add(marker);

  return { model, collider: worldBox };
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
// NAVIGATION WAYPOINT — floating diamond marker above Edificio
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
  ctx.fillStyle = "rgba(51,68,85,0.8)";
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
  ctx.fillText("EDIFICIO", 256, 50);
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
// BUILDING COLLIDERS — for NPC avoidance
// ========================================

function computeBuildingColliders(cityModel, edificio) {
  const colliders = [];

  // Hardcoded major boundaries — buildings on far sides and road in center
  // Far left buildings
  colliders.push(new THREE.Box3(
    new THREE.Vector3(-40, 0, -20), new THREE.Vector3(-22, 10, 160)
  ));
  // Far right buildings
  colliders.push(new THREE.Box3(
    new THREE.Vector3(22, 0, -20), new THREE.Vector3(40, 10, 160)
  ));
  // Road (center strip — keep NPCs on sidewalks)
  colliders.push(new THREE.Box3(
    new THREE.Vector3(-4, 0, -20), new THREE.Vector3(4, 10, 160)
  ));

  // Lamp post colliders
  for (let z = 0; z < 140; z += 15) {
    colliders.push(new THREE.Box3(
      new THREE.Vector3(-5.4, 0, z - 0.4), new THREE.Vector3(-4.6, 6, z + 0.4)
    ));
    colliders.push(new THREE.Box3(
      new THREE.Vector3(4.6, 0, z - 0.4), new THREE.Vector3(5.4, 6, z + 0.4)
    ));
  }

  // Traffic light colliders
  for (const tz of [0, 30, 60, 90, 120]) {
    colliders.push(new THREE.Box3(
      new THREE.Vector3(-4.4, 0, tz - 0.4), new THREE.Vector3(-3.6, 5, tz + 0.4)
    ));
    colliders.push(new THREE.Box3(
      new THREE.Vector3(3.6, 0, tz - 0.4), new THREE.Vector3(4.4, 5, tz + 0.4)
    ));
  }

  // Edificio building collider
  if (edificio && edificio.collider) {
    colliders.push(edificio.collider);
  }

  // Auto-generate colliders from city GLB model meshes (buildings, trees, etc.)
  if (cityModel) {
    const _tempBox = new THREE.Box3();
    const _tempSize = new THREE.Vector3();
    cityModel.traverse((child) => {
      if (!child.isMesh) return;
      _tempBox.setFromObject(child);
      _tempBox.getSize(_tempSize);
      // Skip tiny objects, ground planes, and overly large objects
      if (_tempSize.y < 0.3 || _tempSize.x > 80 || _tempSize.z > 80) return;
      // Add colliders for objects taller than 0.5 units (buildings, trees, walls, fences)
      if (_tempSize.y > 0.5) {
        colliders.push(_tempBox.clone());
      }
    });
  }

  return colliders;
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
