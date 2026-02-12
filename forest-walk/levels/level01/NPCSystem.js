// ========================================
// NPC SYSTEM — Low-poly placeholder silhouettes + GLB characters
// ========================================

import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { MATS } from "./constants.js";

/**
 * Create a single low-poly NPC silhouette (capsule body + sphere head).
 * Returns a THREE.Group.
 */
export function createNPCSilhouette(options = {}) {
  const { seated = false, color } = options;
  const group = new THREE.Group();

  const mat = color
    ? new THREE.MeshStandardMaterial({ color, roughness: 0.8, transparent: true, opacity: 0.8 })
    : MATS.npcBody;

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 4, 8), mat);
  if (seated) {
    body.position.y = 0.65;
    body.rotation.x = -0.15; // slight lean back
  } else {
    body.position.y = 1.0;
  }
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat);
  if (seated) {
    head.position.y = 1.25;
  } else {
    head.position.y = 1.6;
  }
  group.add(head);

  return group;
}

/**
 * Instanced walking NPCs for city streets (fallback).
 * Uses InstancedMesh for performance.
 */
export class WalkingNPCSystem {
  constructor(scene, count = 30) {
    this.count = count;
    this.scene = scene;
    this.positions = [];
    this.speeds = [];
    this.directions = [];
    this.bounds = { minZ: -10, maxZ: 80 };

    // Body InstancedMesh
    const bodyGeo = new THREE.CapsuleGeometry(0.22, 0.7, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x444455,
      roughness: 0.8,
      transparent: true,
      opacity: 0.75,
    });
    this.bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
    this.bodyMesh.castShadow = true;
    scene.add(this.bodyMesh);

    // Head InstancedMesh
    const headGeo = new THREE.SphereGeometry(0.16, 8, 6);
    this.headMesh = new THREE.InstancedMesh(headGeo, bodyMat, count);
    this.headMesh.castShadow = true;
    scene.add(this.headMesh);

    this._matrix = new THREE.Matrix4();
    this._initPositions();
  }

  setBounds(minZ, maxZ) {
    this.bounds.minZ = minZ;
    this.bounds.maxZ = maxZ;
  }

  _initPositions() {
    for (let i = 0; i < this.count; i++) {
      // Distribute on sidewalk lanes
      const lane = i % 4;
      let x;
      switch (lane) {
        case 0: x = -8 + Math.random() * 2; break;   // far left sidewalk
        case 1: x = -5.5 + Math.random() * 1.5; break; // near left
        case 2: x = 5.5 + Math.random() * 1.5; break;  // near right
        case 3: x = 8 + Math.random() * 2; break;     // far right
      }

      const z = this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ);
      this.positions.push(new THREE.Vector3(x, 0, z));
      this.speeds.push(1.5 + Math.random() * 2.0);
      this.directions.push(lane < 2 ? 1 : -1);
    }
    this._updateMatrices();
  }

  _updateMatrices() {
    for (let i = 0; i < this.count; i++) {
      const p = this.positions[i];

      // Body at y=1.0
      this._matrix.makeTranslation(p.x, p.y + 1.0, p.z);
      this.bodyMesh.setMatrixAt(i, this._matrix);

      // Head at y=1.6
      this._matrix.makeTranslation(p.x, p.y + 1.6, p.z);
      this.headMesh.setMatrixAt(i, this._matrix);
    }
    this.bodyMesh.instanceMatrix.needsUpdate = true;
    this.headMesh.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      this.positions[i].z += this.speeds[i] * this.directions[i] * dt;

      // Wrap around
      if (this.positions[i].z > this.bounds.maxZ) {
        this.positions[i].z = this.bounds.minZ;
      }
      if (this.positions[i].z < this.bounds.minZ) {
        this.positions[i].z = this.bounds.maxZ;
      }
    }
    this._updateMatrices();
  }

  dispose() {
    this.scene.remove(this.bodyMesh);
    this.scene.remove(this.headMesh);
    this.bodyMesh.geometry.dispose();
    this.bodyMesh.material.dispose();
    this.headMesh.geometry.dispose();
    this.headMesh.material.dispose();
  }
}

// ========================================
// GLB-BASED NPC SYSTEM — Uses low_poly_people GLB
// ========================================

const CHARACTER_NAMES = [
  "casual_Female_G",
  "casual_Female_K_",
  "casual_Male_G",
  "casual_Male_K",
  "Doctor_Male_B",
  "elder_Female_A",
  "little_boy_B",
  "police_Female_A",
];

export class GLBNPCSystem {
  constructor(scene, peopleGltf, options = {}) {
    this.scene = scene;
    this.count = options.count || 20;
    this.bounds = options.bounds || { minZ: -10, maxZ: 80 };
    this.walkableXRanges = options.walkableXRanges || [[-8, -5], [5, 8]];
    this.npcs = [];

    this._extractAndPlaceNPCs(peopleGltf);
  }

  _extractAndPlaceNPCs(gltf) {
    const rootNode = this._findRootNode(gltf.scene);
    if (!rootNode) {
      console.warn("GLBNPCSystem: Could not find RootNode in people GLB, using silhouettes");
      this._fallbackSilhouettes();
      return;
    }

    // Find character template nodes
    const templates = [];
    for (const name of CHARACTER_NAMES) {
      const node = rootNode.children.find((c) => c.name === name);
      if (node) templates.push(node);
    }

    if (templates.length === 0) {
      console.warn("GLBNPCSystem: No character templates found, using silhouettes");
      this._fallbackSilhouettes();
      return;
    }

    // Place NPCs
    for (let i = 0; i < this.count; i++) {
      const template = templates[i % templates.length];
      let npc;

      try {
        npc = SkeletonUtils.clone(template);
      } catch (e) {
        // Fallback to regular clone if SkeletonUtils fails
        npc = template.clone();
      }

      // Scale from centimeters to meters
      npc.scale.setScalar(0.01);

      // Zero out internal position offsets (characters have large cm-scale offsets)
      npc.position.set(0, 0, 0);
      npc.traverse((child) => {
        if (child.name && child.name.startsWith("rig_CharRoot")) {
          child.position.set(0, 0, 0);
        }
      });

      // Enable shadows
      npc.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Random sidewalk position
      const xRange = this.walkableXRanges[i % this.walkableXRanges.length];
      const x = xRange[0] + Math.random() * (xRange[1] - xRange[0]);
      const z =
        this.bounds.minZ +
        Math.random() * (this.bounds.maxZ - this.bounds.minZ);

      const npcGroup = new THREE.Group();
      npcGroup.add(npc);
      npcGroup.position.set(x, 0, z);
      npcGroup.rotation.y = Math.random() * Math.PI * 2;

      this.scene.add(npcGroup);

      const isStationary = Math.random() > 0.6; // 40% stand still
      const direction = i % 2 === 0 ? 1 : -1;

      this.npcs.push({
        group: npcGroup,
        speed: isStationary ? 0 : 0.5 + Math.random() * 1.5,
        direction,
        isStationary,
      });

      // Face walking direction
      if (!isStationary) {
        npcGroup.rotation.y = direction > 0 ? 0 : Math.PI;
      }
    }
  }

  _findRootNode(scene) {
    let node = null;
    scene.traverse((child) => {
      if (child.name === "RootNode" && child.children.length >= 8) {
        node = child;
      }
    });
    return node;
  }

  _fallbackSilhouettes() {
    // Use simple silhouettes if GLB extraction fails
    for (let i = 0; i < this.count; i++) {
      const xRange = this.walkableXRanges[i % this.walkableXRanges.length];
      const x = xRange[0] + Math.random() * (xRange[1] - xRange[0]);
      const z =
        this.bounds.minZ +
        Math.random() * (this.bounds.maxZ - this.bounds.minZ);

      const npc = createNPCSilhouette({ seated: false });
      npc.position.set(x, 0, z);
      npc.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(npc);

      this.npcs.push({
        group: npc,
        speed: 0.5 + Math.random() * 1.5,
        direction: i % 2 === 0 ? 1 : -1,
        isStationary: Math.random() > 0.6,
      });
    }
  }

  update(dt) {
    for (const npc of this.npcs) {
      if (npc.isStationary) continue;

      npc.group.position.z += npc.speed * npc.direction * dt;

      // Wrap around
      if (npc.group.position.z > this.bounds.maxZ) {
        npc.group.position.z = this.bounds.minZ;
      }
      if (npc.group.position.z < this.bounds.minZ) {
        npc.group.position.z = this.bounds.maxZ;
      }
    }
  }

  dispose() {
    for (const npc of this.npcs) {
      this.scene.remove(npc.group);
      npc.group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    this.npcs = [];
  }
}
