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
