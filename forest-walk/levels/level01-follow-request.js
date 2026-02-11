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
    camDistance: 4.0,
    camHeight: 2.0,
    camLookAtHeight: 1.5,
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
          new THREE.Vector3(-20, 0, -10), new THREE.Vector3(-12, 10, 80)
        ));
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(12, 0, -10), new THREE.Vector3(20, 10, 80)
        ));
        // Road collider (keep player on sidewalks)
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-4, 0, -10), new THREE.Vector3(4, 10, 80)
        ));

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

    // Interaction attempt (A button / Space / Enter)
    tryInteract() {
      return interactions.tryInteract();
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
      // Add a one-shot interaction trigger
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
      }
    },

    // Named callbacks (called by CustomCallbackBeat)
    callbacks: {
      playDoorAnimation(ctx) {
        // Door opening visual effect is handled by the fade beats
      },

      trainArrive(ctx) {
        // Trigger the train arrival state machine in the subway scene
        if (subway.startTrainArrival) {
          subway.startTrainArrival();
        }
      },

      sitDown(ctx) {
        // Teleport player to chair position
        playerAnchor.position.copy(INTERACTION_POINTS.chair);
        playerAnchor.rotation.y = Math.PI * 0.7;
        playerController.disable();

        // Zoom camera to desk view
        if (office.camera) {
          office.camera.position.set(1.5, 1.6, -1.5);
          office.camera.lookAt(0, 1.0, 0.5);
        }
      },

      phoneBuzz(ctx) {
        // Visual phone buzz effect
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
        // Pull camera back for choice panel
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
    },
  };

  // Start in subway phase
  setPhase(PHASES.SUBWAY);

  return levelAPI;
}
