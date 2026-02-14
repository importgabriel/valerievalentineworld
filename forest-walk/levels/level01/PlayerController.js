// ========================================
// PLAYER CONTROLLER — Free-roam movement for levels
// ========================================
// Handles movement, camera follow, AABB collision,
// ground raycasting, jumping, and animation management.

import * as THREE from "three";

const _moveDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _zeroVec = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _velDelta = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDown = new THREE.Vector3(0, -1, 0);

const DEFAULTS = {
  moveSpeed: 4.0,
  moveAccel: 15.0,
  moveDecel: 10.0,
  turnSpeed: 8.0,
  camDistance: 5.0,
  camHeight: 2.0,
  camLookAtHeight: 1.5,
  camSmoothing: 10.0,
  camStickSensitivity: 3.0,
  mouseSensitivity: 0.004,
  yawClamp: null, // null = full rotation, [min, max] to clamp
};

export class PlayerController {
  constructor(config = {}) {
    this.player = config.player || new THREE.Object3D();
    this.camera = config.camera || new THREE.PerspectiveCamera();
    this.characterModel = config.characterModel || null;
    this.mixer = config.mixer || null;
    this.walkAction = config.walkAction || null;

    this.bounds = config.bounds || null; // { minX, maxX, minZ, maxZ }
    this.colliders = []; // Array of THREE.Box3

    // Config
    this.cfg = { ...DEFAULTS, ...config };

    // State
    this.velocity = new THREE.Vector3();
    this.yaw = config.initialYaw || 0;
    this.pitch = config.initialPitch || 0.3;
    this.isWalking = false;
    this.enabled = false;

    // Ground following (raycasting)
    this.groundRaycaster = new THREE.Raycaster();
    this.groundRaycaster.far = 50;
    this.groundMeshes = [];
    this.groundOffset = 0;
    this.currentGroundY = 0;
    this.groundSmoothing = 10.0;

    // Jump physics
    this.jumpVelocity = 0;
    this.isGrounded = true;
    this.gravity = -15.0;
    this.jumpStrength = 6.0;

    // Animation management
    this.animations = {};
    this.currentAnimation = null;
    this.currentAnimationName = '';
  }

  enable() {
    this.enabled = true;
    this.isGrounded = true;
    this.jumpVelocity = 0;
  }

  disable() {
    if (this.walkAction && this.isWalking) {
      this.walkAction.fadeOut(0.3);
      this.isWalking = false;
    }
    this.enabled = false;
    this.velocity.set(0, 0, 0);
  }

  setBounds(bounds) {
    this.bounds = bounds;
  }

  setWalkAction(action) {
    this.walkAction = action;
  }

  setCharacterModel(model) {
    this.characterModel = model;
  }

  addCollider(box3) {
    this.colliders.push(box3);
  }

  clearColliders() {
    this.colliders.length = 0;
  }

  // Ground mesh management
  setGroundMeshes(meshes) {
    this.groundMeshes = meshes;
  }

  addGroundMesh(mesh) {
    this.groundMeshes.push(mesh);
  }

  clearGroundMeshes() {
    this.groundMeshes.length = 0;
  }

  // Jump
  jump() {
    if (!this.enabled || !this.isGrounded) return;
    this.jumpVelocity = this.jumpStrength;
    this.isGrounded = false;
  }

  // Animation management
  registerAnimation(name, action) {
    this.animations[name] = action;
  }

  playAnimation(name, { fadeDuration = 0.3, loop = true } = {}) {
    if (name === this.currentAnimationName) return;
    const newAction = this.animations[name];
    if (!newAction) return;

    if (this.currentAnimation) {
      this.currentAnimation.fadeOut(fadeDuration);
    }

    newAction.reset();
    newAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
    newAction.clampWhenFinished = !loop;
    newAction.fadeIn(fadeDuration);
    newAction.play();

    this.currentAnimation = newAction;
    this.currentAnimationName = name;
  }

  stopAnimation(fadeDuration = 0.3) {
    if (this.currentAnimation) {
      this.currentAnimation.fadeOut(fadeDuration);
      this.currentAnimation = null;
      this.currentAnimationName = '';
    }
  }

  handleMouseLook(dx, dy) {
    if (!this.enabled) return;
    this.yaw -= dx * this.cfg.mouseSensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * this.cfg.mouseSensitivity,
      0.1, 1.0
    );
    if (this.cfg.yawClamp) {
      this.yaw = THREE.MathUtils.clamp(this.yaw, this.cfg.yawClamp[0], this.cfg.yawClamp[1]);
    }
  }

  /**
   * Ground raycasting + jump physics
   */
  _updateGroundHeight(dt) {
    // Apply gravity when airborne
    if (!this.isGrounded) {
      this.jumpVelocity += this.gravity * dt;
      this.player.position.y += this.jumpVelocity * dt;
    }

    // Find ground height via raycast
    let groundY = this.currentGroundY;
    if (this.groundMeshes.length > 0) {
      _rayOrigin.copy(this.player.position);
      _rayOrigin.y += 10;
      this.groundRaycaster.set(_rayOrigin, _rayDown);
      const hits = this.groundRaycaster.intersectObjects(this.groundMeshes, true);
      if (hits.length > 0) {
        const hitY = hits[0].point.y + this.groundOffset;
        // Reject ground detections that jump unreasonably high (e.g. hitting rooftops)
        if (hitY < this.currentGroundY + 2.0) {
          groundY = hitY;
        }
      }
    }

    // Landing check when falling
    if (!this.isGrounded && this.player.position.y <= groundY) {
      this.player.position.y = groundY;
      this.jumpVelocity = 0;
      this.isGrounded = true;
      this.currentGroundY = groundY;
    } else if (this.isGrounded) {
      // Smooth ground following when grounded (handles uneven terrain)
      if (this.groundMeshes.length > 0) {
        this.currentGroundY = THREE.MathUtils.lerp(
          this.currentGroundY,
          groundY,
          1 - Math.exp(-this.groundSmoothing * dt)
        );
        this.player.position.y = this.currentGroundY;
      }
    }
  }

  /**
   * Main update — call each frame with pre-processed input
   * @param {{ inputX: number, inputZ: number, lookX: number, lookY: number }} input
   * @param {number} dt
   */
  update(input, dt) {
    if (!this.enabled) return;

    const { inputX, inputZ, lookX, lookY } = input;

    // Gamepad camera orbit
    if (lookX !== 0 || lookY !== 0) {
      this.yaw -= lookX * this.cfg.camStickSensitivity * dt;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - lookY * this.cfg.camStickSensitivity * dt,
        0.1, 1.0
      );
    }

    if (this.cfg.yawClamp) {
      this.yaw = THREE.MathUtils.clamp(this.yaw, this.cfg.yawClamp[0], this.cfg.yawClamp[1]);
    }

    // Movement direction (camera-relative)
    _moveDir.set(inputX, 0, inputZ);
    const moveLength = Math.min(_moveDir.length(), 1);
    const wasWalking = this.isWalking;

    if (moveLength > 0) {
      _moveDir.normalize();
      _moveDir.applyAxisAngle(_upAxis, -this.yaw);
      _moveDir.multiplyScalar(this.cfg.moveSpeed * moveLength);
      this.velocity.lerp(_moveDir, 1 - Math.exp(-this.cfg.moveAccel * dt));

      const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
      // Use angle wrapping to prevent spinning through the long way around
      let angleDiff = targetRotation - this.player.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.player.rotation.y += angleDiff * (1 - Math.exp(-this.cfg.turnSpeed * dt));
      this.isWalking = true;
    } else {
      this.velocity.lerp(_zeroVec, 1 - Math.exp(-this.cfg.moveDecel * dt));
      this.isWalking = false;
    }

    // Walk animation
    if (this.walkAction) {
      if (this.isWalking && !wasWalking) {
        this.walkAction.reset();
        this.walkAction.fadeIn(0.2);
        this.walkAction.play();
      } else if (!this.isWalking && wasWalking) {
        this.walkAction.fadeOut(0.3);
      }
    }

    // Apply velocity
    _velDelta.copy(this.velocity).multiplyScalar(dt);
    this.player.position.add(_velDelta);

    // AABB collision with colliders
    for (const box of this.colliders) {
      const p = this.player.position;
      if (p.x > box.min.x && p.x < box.max.x &&
          p.z > box.min.z && p.z < box.max.z) {
        // Push out on the axis with smallest penetration
        const pushLeft = p.x - box.min.x;
        const pushRight = box.max.x - p.x;
        const pushFront = p.z - box.min.z;
        const pushBack = box.max.z - p.z;
        const minPush = Math.min(pushLeft, pushRight, pushFront, pushBack);
        if (minPush === pushLeft) p.x = box.min.x;
        else if (minPush === pushRight) p.x = box.max.x;
        else if (minPush === pushFront) p.z = box.min.z;
        else p.z = box.max.z;
      }
    }

    // Bounds clamp
    if (this.bounds) {
      this.player.position.x = THREE.MathUtils.clamp(
        this.player.position.x, this.bounds.minX, this.bounds.maxX
      );
      this.player.position.z = THREE.MathUtils.clamp(
        this.player.position.z, this.bounds.minZ, this.bounds.maxZ
      );
    }

    // Ground following + jump physics
    this._updateGroundHeight(dt);

    // Camera follow
    const camX = Math.sin(this.yaw) * Math.cos(this.pitch) * this.cfg.camDistance;
    const camY = this.cfg.camHeight + Math.sin(this.pitch) * this.cfg.camDistance * 0.5;
    const camZ = -Math.cos(this.yaw) * Math.cos(this.pitch) * this.cfg.camDistance;

    _camTarget.copy(this.player.position);
    _camTarget.x += camX;
    _camTarget.y += camY;
    _camTarget.z += camZ;
    this.camera.position.lerp(_camTarget, 1 - Math.exp(-this.cfg.camSmoothing * dt));

    _lookTarget.copy(this.player.position);
    _lookTarget.y += this.cfg.camLookAtHeight;
    this.camera.lookAt(_lookTarget);
  }
}
