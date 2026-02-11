// ========================================
// INTERACTION SYSTEM — Proximity triggers
// ========================================

import * as THREE from "three";

export class InteractionSystem {
  constructor() {
    this.triggers = []; // { id, position: Vector3, radius, promptText, onInteract, active }
    this.activeTrigger = null;
    this.promptEl = null;
    this._createPromptElement();
  }

  _createPromptElement() {
    this.promptEl = document.getElementById("interaction-prompt");
    this.promptTextEl = document.getElementById("prompt-text");
  }

  addTrigger({ id, position, radius = 2.0, promptText, onInteract }) {
    this.triggers.push({
      id,
      position: position instanceof THREE.Vector3 ? position : new THREE.Vector3(position.x, position.y || 0, position.z),
      radius,
      promptText,
      onInteract,
      active: true,
    });
  }

  setTriggerActive(id, active) {
    const trigger = this.triggers.find(t => t.id === id);
    if (trigger) trigger.active = active;
  }

  removeTrigger(id) {
    this.triggers = this.triggers.filter(t => t.id !== id);
  }

  update(playerPosition) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const trigger of this.triggers) {
      if (!trigger.active) continue;
      const dist = playerPosition.distanceTo(trigger.position);
      if (dist < trigger.radius && dist < nearestDist) {
        nearest = trigger;
        nearestDist = dist;
      }
    }

    if (nearest !== this.activeTrigger) {
      this.activeTrigger = nearest;
      this._updatePrompt();
    }
  }

  _updatePrompt() {
    if (!this.promptEl) return;
    if (this.activeTrigger) {
      if (this.promptTextEl) {
        this.promptTextEl.textContent = this.activeTrigger.promptText;
      }
      this.promptEl.classList.remove("hidden");
    } else {
      this.promptEl.classList.add("hidden");
    }
  }

  /**
   * Called when player presses A/Space/Enter.
   * Returns true if an interaction was triggered.
   */
  tryInteract() {
    if (this.activeTrigger && this.activeTrigger.onInteract) {
      this.activeTrigger.onInteract();
      return true;
    }
    return false;
  }

  hidePrompt() {
    if (this.promptEl) this.promptEl.classList.add("hidden");
    this.activeTrigger = null;
  }

  dispose() {
    this.triggers.length = 0;
    this.activeTrigger = null;
    this.hidePrompt();
  }
}
