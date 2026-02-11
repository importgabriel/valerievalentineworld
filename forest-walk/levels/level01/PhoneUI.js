// ========================================
// PHONE UI — Instagram notification overlay
// ========================================

export class PhoneUI {
  constructor() {
    this.overlay = document.getElementById("phone-overlay");
  }

  show() {
    if (!this.overlay) return;
    this.overlay.classList.remove("hidden");
    this.overlay.classList.add("phone-slide-in");
  }

  hide() {
    if (!this.overlay) return;
    this.overlay.classList.remove("phone-slide-in");
    this.overlay.classList.add("phone-slide-out");
    setTimeout(() => {
      this.overlay.classList.add("hidden");
      this.overlay.classList.remove("phone-slide-out");
    }, 400);
  }

  dispose() {
    this.hide();
  }
}
