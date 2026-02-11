// ========================================
// NPC SYSTEM — Low-poly placeholder silhouettes
// ========================================

import * as THREE from "three";
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
 * Instanced walking NPCs for city streets.
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
