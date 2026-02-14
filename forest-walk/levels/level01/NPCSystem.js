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
// Varied NPC colors for street visibility
const NPC_COLORS = [
  0x4466aa, 0xaa4444, 0x44aa66, 0x886644,
  0x664488, 0xaa8844, 0x448888, 0x884466,
  0x5577bb, 0xbb5555, 0x55bb77, 0x997755,
];

export function createNPCSilhouette(options = {}) {
  const { seated = false, color } = options;
  const group = new THREE.Group();

  const npcColor = color || NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)];
  const mat = new THREE.MeshStandardMaterial({ color: npcColor, roughness: 0.7 });

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.8, 4, 8), mat);
  if (seated) {
    body.position.y = 0.65;
    body.rotation.x = -0.15;
  } else {
    body.position.y = 1.05;
  }
  body.castShadow = true;
  group.add(body);

  // Head — skin tone
  const headMat = new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.6 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), headMat);
  if (seated) {
    head.position.y = 1.3;
  } else {
    head.position.y = 1.7;
  }
  head.castShadow = true;
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
  /**
   * @param {THREE.Scene} scene
   * @param {object|object[]} peopleGltf — single pack GLTF or array of individual character GLTFs
   * @param {object} options
   */
  constructor(scene, peopleGltf, options = {}) {
    this.scene = scene;
    this.count = options.count || 20;
    this.bounds = options.bounds || { minZ: -10, maxZ: 80 };
    this.walkableXRanges = options.walkableXRanges || [[-8, -5], [5, 8]];
    this.npcs = [];
    this.mixers = [];
    this.walkClip = options.walkClip || null;

    // Support both individual GLTFs array and single pack
    if (Array.isArray(peopleGltf)) {
      this._placeFromIndividualGLTFs(peopleGltf);
    } else {
      this._extractAndPlaceNPCs(peopleGltf);
    }
  }

  _placeFromIndividualGLTFs(gltfs) {
    const templates = [];
    for (const gltf of gltfs) {
      if (gltf && gltf.scene) {
        templates.push(gltf.scene);
      }
    }

    if (templates.length > 0) {
      for (let i = 0; i < this.count; i++) {
        const template = templates[i % templates.length];
        let npc;
        try {
          npc = SkeletonUtils.clone(template);
        } catch (e) {
          npc = template.clone();
        }

        // Auto-scale: normalize character height to ~1.8 world units
        const box = new THREE.Box3().setFromObject(npc);
        const height = box.max.y - box.min.y;
        if (height > 0) {
          const targetHeight = 1.8;
          npc.scale.multiplyScalar(targetHeight / height);
        }

        npc.position.set(0, 0, 0);
        npc.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this._placeNPC(npc, i);
      }
      this._addSilhouetteNPCs(0);
    } else {
      console.warn("GLBNPCSystem: No individual character GLTFs provided, using silhouettes");
      this._addSilhouetteNPCs(this.count);
    }
  }

  _extractAndPlaceNPCs(gltf) {
    let glbSuccess = false;
    const rootNode = this._findRootNode(gltf.scene);

    if (rootNode) {
      const templates = [];
      for (const name of CHARACTER_NAMES) {
        const node = rootNode.children.find((c) =>
          c.name === name || c.name.startsWith(name) || c.name.includes(name)
        );
        if (node) templates.push(node);
      }

      // Fallback: if none of the expected names matched, try all group/mesh children
      if (templates.length === 0) {
        for (const child of rootNode.children) {
          if (child.children.length > 0 || child.isMesh) {
            templates.push(child);
          }
          if (templates.length >= 8) break;
        }
      }

      if (templates.length > 0) {
        glbSuccess = true;
        for (let i = 0; i < this.count; i++) {
          const template = templates[i % templates.length];
          let npc;
          try {
            npc = SkeletonUtils.clone(template);
          } catch (e) {
            npc = template.clone();
          }

          npc.scale.setScalar(0.01);
          npc.position.set(0, 0, 0);
          npc.traverse((child) => {
            if (child.name && child.name.startsWith("rig_CharRoot")) {
              child.position.set(0, 0, 0);
            }
          });
          npc.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          this._placeNPC(npc, i);
        }
      }
    }

    // Always add silhouette NPCs as guaranteed visible pedestrians
    if (!glbSuccess) {
      console.warn("GLBNPCSystem: GLB extraction failed, using colorful silhouettes");
    }
    this._addSilhouetteNPCs(glbSuccess ? 0 : this.count);
  }

  _placeNPC(npcModel, index) {
    const xRange = this.walkableXRanges[index % this.walkableXRanges.length];
    const x = xRange[0] + Math.random() * (xRange[1] - xRange[0]);
    const z = this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ);

    const npcGroup = new THREE.Group();
    npcGroup.add(npcModel);
    npcGroup.position.set(x, 0, z);

    this.scene.add(npcGroup);

    const isStationary = Math.random() > 0.9;
    const direction = index % 2 === 0 ? 1 : -1;

    // Create animation mixer if walk clip is available and NPC is moving
    if (this.walkClip && !isStationary) {
      try {
        const mixer = new THREE.AnimationMixer(npcModel);
        const action = mixer.clipAction(this.walkClip);
        action.setLoop(THREE.LoopRepeat);
        action.timeScale = 0.8 + Math.random() * 0.4;
        action.play();
        this.mixers.push(mixer);
      } catch (e) {
        // Animation binding may fail if bone names don't match — that's OK
      }
    }

    this.npcs.push({
      group: npcGroup,
      speed: isStationary ? 0 : 1.5 + Math.random() * 2.5,
      direction,
      isStationary,
    });

    npcGroup.rotation.y = isStationary ? Math.random() * Math.PI * 2 : (direction > 0 ? 0 : Math.PI);
  }

  _findRootNode(scene) {
    let node = null;
    scene.traverse((child) => {
      // Relaxed search — accept any RootNode with children
      if (child.name === "RootNode" && child.children.length >= 1 && !node) {
        node = child;
      }
    });
    return node;
  }

  _addSilhouetteNPCs(count) {
    // Add colorful silhouette NPCs that are always visible
    const actualCount = Math.max(count, 25); // Always at least 25 visible silhouettes
    for (let i = 0; i < actualCount; i++) {
      const xRange = this.walkableXRanges[i % this.walkableXRanges.length];
      const x = xRange[0] + Math.random() * (xRange[1] - xRange[0]);
      const z = this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ);

      const npc = createNPCSilhouette({ seated: false });
      npc.position.set(x, 0, z);
      this.scene.add(npc);

      const direction = i % 2 === 0 ? 1 : -1;
      const isStationary = Math.random() > 0.85;

      this.npcs.push({
        group: npc,
        speed: isStationary ? 0 : 1.5 + Math.random() * 2.5,
        direction,
        isStationary,
      });

      npc.rotation.y = isStationary ? Math.random() * Math.PI * 2 : (direction > 0 ? 0 : Math.PI);
    }
  }

  update(dt) {
    for (const npc of this.npcs) {
      if (npc.isStationary) continue;

      npc.group.position.z += npc.speed * npc.direction * dt;

      // Procedural walk bob for silhouette NPCs (slight up/down motion)
      const walkCycle = (performance.now() * 0.003 * npc.speed) % (Math.PI * 2);
      npc.group.position.y = Math.abs(Math.sin(walkCycle)) * 0.08;

      // Wrap around
      if (npc.group.position.z > this.bounds.maxZ) {
        npc.group.position.z = this.bounds.minZ;
      }
      if (npc.group.position.z < this.bounds.minZ) {
        npc.group.position.z = this.bounds.maxZ;
      }
    }

    // Tick all animation mixers for GLB NPCs
    for (const mixer of this.mixers) {
      mixer.update(dt);
    }
  }

  dispose() {
    for (const mixer of this.mixers) {
      mixer.stopAllAction();
    }
    this.mixers = [];

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
