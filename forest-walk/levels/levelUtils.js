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
