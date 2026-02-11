// ========================================
// SCENE MANAGER — Multi-scene lifecycle
// ========================================
// Single renderer, multiple scenes. The hub (hotel hallway) and each
// level are separate THREE.Scene instances swapped on demand.

export class SceneManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.hubScene = null; // { scene, camera, update(dt), cleanup? }
    this.activeScene = null;
    this.loadedLevels = {};
  }

  setHub(hubSceneObj) {
    this.hubScene = hubSceneObj;
    this.activeScene = hubSceneObj;
  }

  getActiveScene() {
    return this.activeScene;
  }

  isInLevel() {
    return this.activeScene !== null && this.activeScene !== this.hubScene;
  }

  async enterLevel(chapter) {
    if (!chapter.levelModule) {
      return null; // no custom level — caller should fall back to text panel
    }

    // Lazy-load the level module
    if (!this.loadedLevels[chapter.levelModule]) {
      const mod = await import(`./levels/${chapter.levelModule}.js`);
      this.loadedLevels[chapter.levelModule] = mod;
    }

    const levelMod = this.loadedLevels[chapter.levelModule];
    // Support both sync and async create; pass renderer for postprocessing
    const levelSceneObj = await levelMod.create(chapter, this.renderer);
    this.activeScene = levelSceneObj;
    return levelSceneObj;
  }

  exitLevel() {
    if (this.activeScene && this.activeScene !== this.hubScene && this.activeScene.cleanup) {
      this.activeScene.cleanup();
    }
    this.activeScene = this.hubScene;
  }

  update(dt) {
    if (this.activeScene && this.activeScene.update) {
      this.activeScene.update(dt);
    }
  }

  render() {
    if (this.activeScene) {
      // Allow level to provide custom render (e.g. for postprocessing EffectComposer)
      if (this.activeScene.render) {
        this.activeScene.render();
      } else {
        this.renderer.render(this.activeScene.scene, this.activeScene.camera);
      }
    }
  }
}
