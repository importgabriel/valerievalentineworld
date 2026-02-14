// ========================================
// LEVEL 01 — THE FOLLOW REQUEST (Orchestrator)
// ========================================
// Multi-phase level: Subway → City → Office
// Phase state machine managing three sub-scenes with transitions,
// free-roam player control, interactions, and postprocessing.
// GLB models loaded in parallel for subway train and city environment.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { buildSubwayScene } from "./level01/SubwayScene.js";
import { buildCityScene, JPMORGAN_ENTRANCE, CITY_BOUNDS } from "./level01/CityScene.js";
import { buildOfficeScene, INTERACTION_POINTS, OFFICE_BOUNDS } from "./level01/OfficeScene.js";
import { PlayerController } from "./level01/PlayerController.js";
import { InteractionSystem } from "./level01/InteractionSystem.js";
import { ComputerScreen } from "./level01/ComputerScreen.js";
import { PhoneUI } from "./level01/PhoneUI.js";
import { createPostprocessing, disposeScene } from "./levelUtils.js";

// ========================================
// PHASES
// ========================================

const PHASES = {
  SUBWAY: "SUBWAY",
  CITY: "CITY",
  OFFICE: "OFFICE",
};

// ========================================
// CREATE LEVEL (exported, async)
// ========================================

export async function create(chapter, renderer) {
  // Load all GLB models in parallel
  const gltfLoader = new GLTFLoader();
  const [subwayGltf, cityGltf, peopleGltf] = await Promise.all([
    gltfLoader.loadAsync("/models/environment/subway_bar.glb"),
    gltfLoader.loadAsync("/models/environment/lowpoly.glb"),
    gltfLoader.loadAsync("/models/environment/low_poly_people_free_sample_pack.glb"),
  ]);

  // To use individual character files instead of the pack, replace peopleGltf above:
  // const peopleGltfs = await Promise.all([
  //   gltfLoader.loadAsync("/models/people/character1.glb"),
  //   gltfLoader.loadAsync("/models/people/character2.glb"),
  //   // ... add more as needed
  // ]);
  // Then pass peopleGltfs (array) to buildCityScene instead of peopleGltf

  // Build all sub-scenes with loaded models
  const subway = buildSubwayScene(subwayGltf);
  const city = buildCityScene(cityGltf, peopleGltf);
  const office = buildOfficeScene();

  // Current phase state
  let currentPhase = PHASES.SUBWAY;
  let activeSubScene = subway;

  // Postprocessing
  const pp = createPostprocessing(renderer, subway.scene, subway.camera);

  // Player controller (used in City and Office phases)
  const playerAnchor = new THREE.Object3D();
  playerAnchor.position.set(0, 0, 0);

  const playerController = new PlayerController({
    player: playerAnchor,
    camera: city.camera, // Will be updated per phase
    moveSpeed: 6.0,
    camDistance: 6.0,
    camHeight: 3.0,
    camLookAtHeight: 2.0,
    initialYaw: 0,
  });

  // Interaction system
  const interactions = new InteractionSystem();

  // UI overlays
  const computerScreen = new ComputerScreen();
  const phoneUI = new PhoneUI();

  // ========================================
  // PHASE MANAGEMENT
  // ========================================

  function setPhase(phase) {
    // Clean up previous phase
    interactions.hidePrompt();
    interactions.dispose();
    playerController.disable();
    playerController.clearColliders();
    playerController.clearGroundMeshes();

    currentPhase = phase;

    switch (phase) {
      case PHASES.SUBWAY:
        activeSubScene = subway;
        pp.updateScene(subway.scene, subway.camera);
        break;

      case PHASES.CITY:
        activeSubScene = city;
        city.scene.add(playerAnchor);
        playerAnchor.position.set(0, 0, -2);
        playerController.camera = city.camera;
        playerController.setBounds(CITY_BOUNDS);
        playerController.yaw = 0;
        playerController.pitch = 0.3;

        // Building colliders (simplified — road and building fronts)
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-40, 0, -20), new THREE.Vector3(-22, 10, 160)
        ));
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(22, 0, -20), new THREE.Vector3(40, 10, 160)
        ));
        // Road collider (keep player on sidewalks)
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-4, 0, -20), new THREE.Vector3(4, 10, 160)
        ));

        // Lamp post colliders (at x=+-5, every 15 units along z)
        for (let z = 0; z < 140; z += 15) {
          playerController.addCollider(new THREE.Box3(
            new THREE.Vector3(-5.4, 0, z - 0.4), new THREE.Vector3(-4.6, 6, z + 0.4)
          ));
          playerController.addCollider(new THREE.Box3(
            new THREE.Vector3(4.6, 0, z - 0.4), new THREE.Vector3(5.4, 6, z + 0.4)
          ));
        }

        // Traffic light colliders (at x=+-4, at key intersections)
        for (const tz of [0, 30, 60, 90, 120]) {
          playerController.addCollider(new THREE.Box3(
            new THREE.Vector3(-4.4, 0, tz - 0.4), new THREE.Vector3(-3.6, 5, tz + 0.4)
          ));
          playerController.addCollider(new THREE.Box3(
            new THREE.Vector3(3.6, 0, tz - 0.4), new THREE.Vector3(4.4, 5, tz + 0.4)
          ));
        }

        // JPMorgan building (14x14 footprint centered at z=137)
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-7, 0, 130), new THREE.Vector3(7, 60, 144)
        ));

        // Auto-generate colliders from city GLB model (buildings, trees, etc.)
        if (city.cityModel) {
          const _tempBox = new THREE.Box3();
          const _tempSize = new THREE.Vector3();
          city.cityModel.traverse((child) => {
            if (!child.isMesh) return;
            _tempBox.setFromObject(child);
            _tempBox.getSize(_tempSize);
            // Skip tiny objects, ground planes, and overly large objects
            if (_tempSize.y < 0.5 || _tempSize.x > 80 || _tempSize.z > 80) return;
            // Only add colliders for objects taller than ~1 unit (buildings, trees, walls)
            if (_tempSize.y > 1.0) {
              playerController.addCollider(_tempBox.clone());
            }
          });
        }

        // Use only flat ground surfaces for raycasting (not buildings/lamps/NPCs)
        playerController.setGroundMeshes(city.groundMeshes || []);
        playerController.currentGroundY = 0;

        pp.updateScene(city.scene, city.camera);
        break;

      case PHASES.OFFICE:
        activeSubScene = office;
        office.scene.add(playerAnchor);
        playerAnchor.position.set(0, 0, 4);
        playerController.camera = office.camera;
        playerController.setBounds(OFFICE_BOUNDS);
        playerController.yaw = Math.PI;
        playerController.pitch = 0.3;

        // Office-specific camera settings (tighter, lower for indoor space)
        playerController.cfg.camDistance = 4.0;
        playerController.cfg.camHeight = 2.0;
        playerController.cfg.camLookAtHeight = 1.5;

        // Player's L-desk (main surface + extension)
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-0.9, 0, 0.0), new THREE.Vector3(1.5, 1.5, 1.0)
        ));
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(1.5, 0, -0.1), new THREE.Vector3(2.3, 1.5, 0.6)
        ));

        // Left coworker desk (x=-4, z=0.5, 2.0 wide x 0.9 deep)
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-5.0, 0, 0.05), new THREE.Vector3(-3.0, 1.5, 0.95)
        ));
        // Right coworker desk (x=4, z=0.5)
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(3.0, 0, 0.05), new THREE.Vector3(5.0, 1.5, 0.95)
        ));

        // Filing cabinets along back wall
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-6.5, 0, -6.1), new THREE.Vector3(-2.4, 1.5, -5.35)
        ));

        // Water cooler near back-right wall
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(6.6, 0, -5.9), new THREE.Vector3(7.4, 1.5, -5.1)
        ));

        // Collect ground meshes for raycasting
        const officeGroundMeshes = [];
        office.scene.traverse((child) => {
          if (child.isMesh && child.geometry) {
            officeGroundMeshes.push(child);
          }
        });
        playerController.setGroundMeshes(officeGroundMeshes);
        playerController.currentGroundY = 0;

        pp.updateScene(office.scene, office.camera);
        break;
    }
  }

  // ========================================
  // LEVEL API (returned to SceneManager)
  // ========================================

  const levelAPI = {
    // Scene/camera are mutable — updated by setPhase
    get scene() { return activeSubScene.scene; },
    get camera() { return activeSubScene.camera; },

    // Player anchor for character model placement
    playerAnchor,

    // Pass walk animation from main.js so PlayerController can play it
    setWalkAction(action) {
      playerController.setWalkAction(action);
    },

    // Custom render with postprocessing
    render() {
      pp.composer.render();
    },

    // Per-frame update
    update(dt) {
      if (activeSubScene.update) activeSubScene.update(dt);
      if (playerController.enabled) {
        interactions.update(playerAnchor.position);
      }
    },

    // Input handling (called from main.js during level_freeroam)
    handleInput(input, dt) {
      playerController.update(input, dt);
    },

    // Mouse look (called from main.js)
    handleMouseLook(dx, dy) {
      playerController.handleMouseLook(dx, dy);
    },

    // Interaction attempt (Enter / A button)
    tryInteract() {
      return interactions.tryInteract();
    },

    // Jump (Space / X button)
    jump() {
      playerController.jump();
    },

    // Register an animation (sit, type, etc.) for later playback
    registerAnimation(name, action) {
      playerController.registerAnimation(name, action);
    },

    // Enable free-roam (called by FreeRoamBeat)
    enableFreeRoam() {
      playerController.enable();
    },

    // Disable free-roam (called when FreeRoamBeat completes)
    disableFreeRoam() {
      playerController.disable();
      interactions.hidePrompt();
    },

    // Get player position (for FreeRoamBeat trigger checks)
    getPlayerPosition() {
      return playerAnchor.position;
    },

    // Phase switching (called by SceneSwapBeat)
    setPhase(phase) {
      setPhase(phase);
    },

    // Interaction management (called by InteractionBeat)
    enableInteraction(targetId, promptText, onComplete) {
      const point = INTERACTION_POINTS[targetId];
      if (point) {
        interactions.addTrigger({
          id: targetId,
          position: point.clone(),
          radius: 2.0,
          promptText,
          onInteract: onComplete,
        });
      }
    },

    disableInteraction() {
      interactions.hidePrompt();
    },

    // Overlay control (called by OverlayBeat)
    controlOverlay(overlayId, action) {
      switch (overlayId) {
        case "computer-screen":
          if (action === "show") computerScreen.show();
          else computerScreen.hide();
          break;
        case "phone-screen":
          if (action === "show") phoneUI.show();
          else phoneUI.hide();
          break;
        case "mini-phone":
          if (action === "show") {
            const miniPhone = document.getElementById("mini-phone-notification");
            if (miniPhone) miniPhone.classList.remove("hidden");
          } else {
            const miniPhone = document.getElementById("mini-phone-notification");
            if (miniPhone) miniPhone.classList.add("hidden");
          }
          break;
      }
    },

    // Named callbacks (called by CustomCallbackBeat)
    callbacks: {
      playDoorAnimation(ctx) {
        // Door opening visual effect is handled by the fade beats
      },

      trainArrive(ctx) {
        if (subway.startTrainArrival) {
          subway.startTrainArrival();
        }
      },

      sitDown(ctx) {
        playerAnchor.position.copy(INTERACTION_POINTS.chair);
        playerAnchor.rotation.y = 0; // Face forward toward desk (+Z)
        playerController.disable();

        // Play sit animation if registered
        if (playerController.animations['sit']) {
          playerController.playAnimation('sit', { loop: false });
        }

        if (office.camera) {
          office.camera.position.set(1.5, 1.6, -1.5);
          office.camera.lookAt(0, 1.0, 0.5);
        }
      },

      startWorking(ctx) {
        // Play typing animation if registered
        if (playerController.animations['type']) {
          playerController.playAnimation('type', { loop: true });
        }
        computerScreen.show();
      },

      stopWorking(ctx) {
        // Hide computer screen
        computerScreen.hide();
      },

      showMiniPhone(ctx) {
        // Show mini phone notification in top-right
        const miniPhone = document.getElementById("mini-phone-notification");
        if (miniPhone) miniPhone.classList.remove("hidden");

        // Make the phone on desk glow
        if (office.phoneMesh) {
          office.phoneMesh.material = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            emissive: 0x224488,
            emissiveIntensity: 0.5,
            roughness: 0.1,
            metalness: 0.3,
          });
        }
      },

      hideMiniPhone(ctx) {
        const miniPhone = document.getElementById("mini-phone-notification");
        if (miniPhone) miniPhone.classList.add("hidden");
      },

      checkPhone(ctx) {
        // Hide mini notification, show full phone UI
        const miniPhone = document.getElementById("mini-phone-notification");
        if (miniPhone) miniPhone.classList.add("hidden");
        phoneUI.show();
      },

      phoneBuzz(ctx) {
        if (office.phoneMesh) {
          office.phoneMesh.material = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            emissive: 0x224488,
            emissiveIntensity: 0.5,
            roughness: 0.1,
            metalness: 0.3,
          });
        }
      },

      cameraToChoice(ctx) {
        if (office.camera) {
          office.camera.position.set(2.5, 1.8, -2.0);
          office.camera.lookAt(0.3, 1.5, -0.3);
        }
      },
    },

    // Cleanup
    cleanup() {
      computerScreen.dispose();
      phoneUI.dispose();
      interactions.dispose();
      subway.dispose();
      city.dispose();
      office.dispose();
      pp.dispose();
      // Clean up mini phone notification
      const miniPhone = document.getElementById("mini-phone-notification");
      if (miniPhone) miniPhone.classList.add("hidden");
    },
  };

  // Start in subway phase
  setPhase(PHASES.SUBWAY);

  return levelAPI;
}
