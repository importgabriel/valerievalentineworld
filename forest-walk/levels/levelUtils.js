import * as THREE from "three";

// ========================================
// SHARED LEVEL UTILITIES
// ========================================

/**
 * Dispose all geometries, materials, and textures in a scene.
 * Call this in every level's cleanup() to prevent memory leaks.
 */
export function disposeScene(scene) {
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      } else {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    }
  });
}

/**
 * Create a gradient sky backdrop using a canvas texture.
 * Returns a large plane positioned far behind the scene.
 */
export function createSkyBackdrop(colors, width = 200, height = 100) {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  colors.forEach(([stop, color]) => {
    grad.addColorStop(stop, color);
  });

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  return plane;
}

/**
 * Project a 3D world position to 2D screen coordinates.
 */
export function worldToScreen(position, camera) {
  const vec = position.clone().project(camera);
  return {
    x: (vec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-vec.y * 0.5 + 0.5) * window.innerHeight,
  };
}

// ========================================
// POSTPROCESSING SETUP
// ========================================

import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  ToneMappingEffect,
  VignetteEffect,
  SMAAEffect,
  SMAAPreset,
} from "postprocessing";

/**
 * Create a postprocessing pipeline for a level scene.
 * Returns { composer, bloom, vignette, updateScene(scene, camera) }
 */
export function createPostprocessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new BloomEffect({
    intensity: 0.4,
    luminanceThreshold: 0.75,
    luminanceSmoothing: 0.15,
    mipmapBlur: true,
  });

  const vignette = new VignetteEffect({
    offset: 0.3,
    darkness: 0.5,
  });

  const toneMapping = new ToneMappingEffect({
    mode: THREE.ACESFilmicToneMapping,
  });

  const smaa = new SMAAEffect({ preset: SMAAPreset.MEDIUM });

  composer.addPass(new EffectPass(camera, bloom, vignette, smaa));

  return {
    composer,
    bloom,
    vignette,

    /** Swap scene and camera (used when transitioning sub-scenes) */
    updateScene(newScene, newCamera) {
      renderPass.mainScene = newScene;
      renderPass.mainCamera = newCamera;
    },

    /** Resize handler */
    setSize(width, height) {
      composer.setSize(width, height);
    },

    dispose() {
      composer.dispose();
    },
  };
}
