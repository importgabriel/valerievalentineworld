// ========================================
// SEQUENCE RUNNER — Declarative narrative beats
// ========================================
// Reads a sequence array from chapter data and plays
// cinematic beats in order: camera moves, text bubbles,
// reactions, choice panels, etc.

import * as THREE from "three";

// Easing functions
const EASINGS = {
  linear: t => t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// ========================================
// BEAT IMPLEMENTATIONS
// ========================================

class CameraMoveBeat {
  constructor(data) {
    this.from = new THREE.Vector3(data.from.x, data.from.y, data.from.z);
    this.to = new THREE.Vector3(data.to.x, data.to.y, data.to.z);
    this.lookAt = new THREE.Vector3(data.lookAt.x, data.lookAt.y, data.lookAt.z);
    this.duration = data.duration || 2.0;
    this.easing = EASINGS[data.easing] || EASINGS.easeInOutCubic;
    this.elapsed = 0;
  }

  start(ctx) {
    this.elapsed = 0;
    ctx.camera.position.copy(this.from);
    ctx.camera.lookAt(this.lookAt);
  }

  update(dt, ctx) {
    this.elapsed += dt;
    const t = Math.min(this.elapsed / this.duration, 1);
    const et = this.easing(t);

    ctx.camera.position.lerpVectors(this.from, this.to, et);
    ctx.camera.lookAt(this.lookAt);

    return t >= 1;
  }

  finish() {}
}

class WaitBeat {
  constructor(data) {
    this.duration = data.duration || 1.0;
    this.elapsed = 0;
  }

  start() { this.elapsed = 0; }

  update(dt) {
    this.elapsed += dt;
    return this.elapsed >= this.duration;
  }

  finish() {}
}

class TextBubbleBeat {
  constructor(data) {
    this.text = data.text || "";
    this.style = data.style || "speech";
    this.duration = data.duration || 3.0;
    this.offsetY = data.offsetY || 0.5;
    this.enterAnimation = data.enterAnimation || "rise";
    this.elapsed = 0;
    this.element = null;
  }

  start(ctx) {
    this.elapsed = 0;

    // Create DOM element
    const el = document.createElement("div");
    el.className = `text-bubble ${this.style}`;
    el.textContent = this.text;

    if (this.enterAnimation === "rise") {
      el.classList.add("rise-enter");
    }

    const container = document.getElementById("level-ui");
    if (container) {
      container.appendChild(el);
    }

    this.element = el;
    this.ctx = ctx;
  }

  update(dt, ctx) {
    this.elapsed += dt;

    // Position the bubble above the character
    if (this.element && ctx.player) {
      const headPos = new THREE.Vector3();
      ctx.player.getWorldPosition(headPos);
      headPos.y += 2.0 + this.offsetY;

      const screenPos = headPos.clone().project(ctx.camera);
      const hw = window.innerWidth / 2;
      const hh = window.innerHeight / 2;

      this.element.style.left = `${(screenPos.x * hw) + hw}px`;
      this.element.style.top = `${-(screenPos.y * hh) + hh}px`;
    }

    // Fade out near end
    if (this.elapsed > this.duration - 0.5 && this.element) {
      const fadeT = (this.duration - this.elapsed) / 0.5;
      this.element.style.opacity = Math.max(0, fadeT);
    }

    return this.elapsed >= this.duration;
  }

  finish() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

class ReactionBeat {
  constructor(data) {
    this.kind = data.kind || "surprise";
    this.duration = data.duration || 1.5;
    this.elapsed = 0;
    this.sprite = null;
  }

  start(ctx) {
    this.elapsed = 0;
    this.sprite = createReactionSprite(this.kind);
    this.sprite.scale.set(0, 0, 1);

    // Position above player
    if (ctx.player) {
      const pos = new THREE.Vector3();
      ctx.player.getWorldPosition(pos);
      this.sprite.position.set(pos.x, pos.y + 2.8, pos.z);
    }

    ctx.scene.add(this.sprite);
  }

  update(dt, ctx) {
    this.elapsed += dt;

    // Scale bounce animation (0 -> 1.3 -> 1.0 in first 0.3s)
    if (this.elapsed < 0.15) {
      const t = this.elapsed / 0.15;
      const s = t * 1.3;
      this.sprite.scale.set(s, s, 1);
    } else if (this.elapsed < 0.3) {
      const t = (this.elapsed - 0.15) / 0.15;
      const s = 1.3 - t * 0.3;
      this.sprite.scale.set(s, s, 1);
    } else {
      this.sprite.scale.set(1, 1, 1);
    }

    // Slight bob
    if (ctx.player) {
      const pos = new THREE.Vector3();
      ctx.player.getWorldPosition(pos);
      this.sprite.position.set(
        pos.x,
        pos.y + 2.8 + Math.sin(this.elapsed * 3) * 0.05,
        pos.z
      );
    }

    // Shrink at end
    if (this.elapsed > this.duration - 0.2) {
      const t = (this.duration - this.elapsed) / 0.2;
      const s = Math.max(0, t);
      this.sprite.scale.set(s, s, 1);
    }

    return this.elapsed >= this.duration;
  }

  finish(ctx) {
    if (this.sprite) {
      ctx.scene.remove(this.sprite);
      this.sprite.material.map?.dispose();
      this.sprite.material.dispose();
    }
  }
}

class ShowChoiceBeat {
  constructor() {
    this.waiting = true;
  }

  start(ctx) {
    this.waiting = true;
    // Trigger the choice panel via callback
    if (ctx.onShowChoice) {
      ctx.onShowChoice();
    }
  }

  update() {
    // Wait until signaled that choice was made
    return !this.waiting;
  }

  finish() {}

  onSignal(eventName) {
    if (eventName === "choice_made") {
      this.waiting = false;
    }
  }
}

// ========================================
// FADE BEAT — Fade transition overlay in/out
// ========================================

class FadeBeat {
  constructor(data) {
    this.direction = data.direction || "in"; // "in" = to black, "out" = from black
    this.duration = data.duration || 1.0;
    this.color = data.color || null;
    this.elapsed = 0;
    this.overlay = null;
  }

  start() {
    this.elapsed = 0;
    this.overlay = document.getElementById("transition-overlay");
    if (!this.overlay) return;

    this.overlay.classList.remove("hidden", "fade-in", "fade-out");
    this.overlay.style.transition = `opacity ${this.duration}s ease`;

    if (this.color) {
      this.overlay.style.background = this.color;
    }

    if (this.direction === "in") {
      this.overlay.style.opacity = "0";
      this.overlay.classList.remove("hidden");
      // Force reflow then animate
      void this.overlay.offsetHeight;
      this.overlay.style.opacity = "1";
    } else {
      this.overlay.style.opacity = "1";
      this.overlay.classList.remove("hidden");
      void this.overlay.offsetHeight;
      this.overlay.style.opacity = "0";
    }
  }

  update(dt) {
    this.elapsed += dt;
    return this.elapsed >= this.duration;
  }

  finish() {
    if (!this.overlay) return;
    this.overlay.style.transition = "";
    if (this.direction === "out") {
      this.overlay.classList.add("hidden");
      this.overlay.style.opacity = "";
    }
  }
}

// ========================================
// FREE ROAM BEAT — Yield control to player
// ========================================

class FreeRoamBeat {
  constructor(data) {
    this.triggerType = data.triggerType || "reach_position"; // "reach_position" | "interact"
    this.targetId = data.targetId || null;
    this.targetPosition = data.targetPosition
      ? new THREE.Vector3(data.targetPosition.x, data.targetPosition.y || 0, data.targetPosition.z)
      : null;
    this.radius = data.radius || 3.0;
    this.triggered = false;
  }

  start(ctx) {
    this.triggered = false;
    // Tell main.js to switch to free-roam mode
    if (ctx.setGameState) ctx.setGameState("level_freeroam");
    // Enable player controller if level has one
    if (ctx.level && ctx.level.enableFreeRoam) ctx.level.enableFreeRoam();
  }

  update(dt, ctx) {
    if (this.triggered) return true;

    if (this.triggerType === "reach_position" && this.targetPosition && ctx.level) {
      const playerPos = ctx.level.getPlayerPosition ? ctx.level.getPlayerPosition() : null;
      if (playerPos) {
        const dist = playerPos.distanceTo(this.targetPosition);
        if (dist < this.radius) {
          this.triggered = true;
          return true;
        }
      }
    }

    // "interact" type is triggered externally via signal
    return false;
  }

  finish(ctx) {
    // Switch back to sequence mode
    if (ctx.setGameState) ctx.setGameState("level_sequence");
    if (ctx.level && ctx.level.disableFreeRoam) ctx.level.disableFreeRoam();
  }

  onSignal(eventName, payload) {
    if (eventName === "interaction" && this.triggerType === "interact") {
      if (!this.targetId || (payload && payload.id === this.targetId)) {
        this.triggered = true;
      }
    }
  }
}

// ========================================
// SCENE SWAP BEAT — Switch level sub-scene
// ========================================

class SceneSwapBeat {
  constructor(data) {
    this.targetPhase = data.targetPhase;
  }

  start(ctx) {
    if (ctx.level && ctx.level.setPhase) {
      ctx.level.setPhase(this.targetPhase);
      // Update context references after phase swap
      if (ctx.level.scene) ctx.scene = ctx.level.scene;
      if (ctx.level.camera) ctx.camera = ctx.level.camera;
    }
  }

  update() {
    return true; // Instant beat
  }

  finish() {}
}

// ========================================
// INTERACTION BEAT — Wait for A-press near object
// ========================================

class InteractionBeat {
  constructor(data) {
    this.targetId = data.targetId || null;
    this.promptText = data.promptText || "Press A";
    this.waiting = true;
  }

  start(ctx) {
    this.waiting = true;
    // Enable the interaction trigger if level has one
    if (ctx.level && ctx.level.enableInteraction) {
      ctx.level.enableInteraction(this.targetId, this.promptText, () => {
        this.waiting = false;
      });
    }
    // Also enable free-roam so player can move to the object
    if (ctx.setGameState) ctx.setGameState("level_freeroam");
    if (ctx.level && ctx.level.enableFreeRoam) ctx.level.enableFreeRoam();
  }

  update() {
    return !this.waiting;
  }

  finish(ctx) {
    if (ctx.setGameState) ctx.setGameState("level_sequence");
    if (ctx.level && ctx.level.disableFreeRoam) ctx.level.disableFreeRoam();
    if (ctx.level && ctx.level.disableInteraction) ctx.level.disableInteraction();
  }

  onSignal(eventName, payload) {
    if (eventName === "interaction") {
      if (!this.targetId || (payload && payload.id === this.targetId)) {
        this.waiting = false;
      }
    }
  }
}

// ========================================
// OVERLAY BEAT — Show/hide HTML overlay
// ========================================

class OverlayBeat {
  constructor(data) {
    this.overlayId = data.overlayId;
    this.action = data.action || "show"; // "show" | "hide"
    this.animation = data.animation || null;
  }

  start(ctx) {
    if (ctx.level && ctx.level.controlOverlay) {
      ctx.level.controlOverlay(this.overlayId, this.action);
    }
  }

  update() {
    return true; // Instant beat
  }

  finish() {}
}

// ========================================
// CUSTOM CALLBACK BEAT — Fire named callback
// ========================================

class CustomCallbackBeat {
  constructor(data) {
    this.callbackName = data.callbackName;
    this.duration = data.duration || 0;
    this.elapsed = 0;
  }

  start(ctx) {
    this.elapsed = 0;
    if (ctx.level && ctx.level.callbacks && ctx.level.callbacks[this.callbackName]) {
      ctx.level.callbacks[this.callbackName](ctx);
    }
  }

  update(dt) {
    this.elapsed += dt;
    return this.elapsed >= this.duration;
  }

  finish() {}
}

// ========================================
// KEY PROMPT BEAT — Show prompt, wait for key press
// ========================================

class KeyPromptBeat {
  constructor(data) {
    this.key = data.key || "A"; // "A" or "B"
    this.promptText = data.promptText || `Press ${this.key}`;
    this.triggered = false;
  }

  start(ctx) {
    this.triggered = false;
    // Enable key listening in the game state
    if (ctx.setGameState) ctx.setGameState("level_sequence");

    // Show the interaction prompt
    const promptEl = document.getElementById("interaction-prompt");
    const promptTextEl = document.getElementById("prompt-text");
    const promptKeyEl = promptEl ? promptEl.querySelector(".prompt-key") : null;
    if (promptEl) promptEl.classList.remove("hidden");
    if (promptTextEl) promptTextEl.textContent = this.promptText;
    if (promptKeyEl) promptKeyEl.textContent = this.key;
  }

  update() {
    return this.triggered;
  }

  finish() {
    const promptEl = document.getElementById("interaction-prompt");
    if (promptEl) promptEl.classList.add("hidden");
  }

  onSignal(eventName) {
    if (eventName === `key_${this.key.toLowerCase()}`) {
      this.triggered = true;
    }
  }
}

class ShowStoryBeat {
  constructor() {
    this.waiting = true;
  }

  start(ctx) {
    this.waiting = true;
    if (ctx.onShowStory) {
      ctx.onShowStory();
    }
  }

  update() {
    return !this.waiting;
  }

  finish() {}

  onSignal(eventName) {
    if (eventName === "story_continue") {
      this.waiting = false;
    }
  }
}

// ========================================
// REACTION SPRITE FACTORY
// ========================================

function createReactionSprite(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  // White rounded rectangle background
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 24, 12, 80, 104, 14);
  ctx.fill();

  // Border
  ctx.strokeStyle = "#5c4a3a";
  ctx.lineWidth = 3;
  roundRect(ctx, 24, 12, 80, 104, 14);
  ctx.stroke();

  // Icon
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  switch (kind) {
    case "surprise":
      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 64px Arial";
      ctx.fillText("!", 64, 64);
      break;
    case "heart":
      ctx.fillStyle = "#e74c3c";
      ctx.font = "56px Arial";
      ctx.fillText("\u2764", 64, 64);
      break;
    case "music":
      ctx.fillStyle = "#5c4a3a";
      ctx.font = "56px Arial";
      ctx.fillText("\u266B", 64, 64);
      break;
    default:
      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 64px Arial";
      ctx.fillText("!", 64, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.6, 0.6, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ========================================
// SEQUENCE RUNNER
// ========================================

export class SequenceRunner {
  constructor() {
    this.beats = [];
    this.currentIndex = 0;
    this.activeBeat = null;
    this.isRunning = false;
    this.onComplete = null;
    this.context = {};
  }

  start(sequence, context) {
    this.beats = sequence;
    this.currentIndex = 0;
    this.context = context;
    this.isRunning = true;
    this.advanceToNext();
  }

  advanceToNext() {
    if (this.currentIndex >= this.beats.length) {
      this.isRunning = false;
      if (this.onComplete) this.onComplete();
      return;
    }

    const beatData = this.beats[this.currentIndex];
    this.activeBeat = this.createBeat(beatData);
    this.activeBeat.start(this.context);
  }

  update(dt) {
    if (!this.isRunning || !this.activeBeat) return;

    const done = this.activeBeat.update(dt, this.context);
    if (done) {
      this.activeBeat.finish(this.context);
      this.currentIndex++;
      this.advanceToNext();
    }
  }

  createBeat(data) {
    switch (data.type) {
      case "camera_move": return new CameraMoveBeat(data);
      case "wait": return new WaitBeat(data);
      case "text_bubble": return new TextBubbleBeat(data);
      case "reaction": return new ReactionBeat(data);
      case "show_choice": return new ShowChoiceBeat(data);
      case "show_story": return new ShowStoryBeat(data);
      case "fade": return new FadeBeat(data);
      case "free_roam": return new FreeRoamBeat(data);
      case "scene_swap": return new SceneSwapBeat(data);
      case "interaction": return new InteractionBeat(data);
      case "overlay": return new OverlayBeat(data);
      case "custom_callback": return new CustomCallbackBeat(data);
      case "key_prompt": return new KeyPromptBeat(data);
      default:
        console.warn("Unknown beat type:", data.type);
        return new WaitBeat({ duration: 0 });
    }
  }

  signal(eventName, payload) {
    if (this.activeBeat && this.activeBeat.onSignal) {
      this.activeBeat.onSignal(eventName, payload);
    }
  }

  stop() {
    if (this.activeBeat && this.activeBeat.finish) {
      this.activeBeat.finish(this.context);
    }
    this.isRunning = false;
    this.activeBeat = null;

    // Clean up any remaining text bubbles
    const container = document.getElementById("level-ui");
    if (container) {
      container.innerHTML = "";
    }
  }
}
