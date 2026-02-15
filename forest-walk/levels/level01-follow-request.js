// ========================================
// LEVEL 01 — THE FOLLOW REQUEST (Orchestrator)
// ========================================
// Multi-phase level: Subway → City → Office
// Phase state machine managing three sub-scenes with transitions,
// free-roam player control, interactions, and postprocessing.
// GLB models loaded in parallel for subway train and city environment.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { buildSubwayScene } from "./level01/SubwayScene.js";
import { buildCityScene, BUILDING_ENTRANCE, CITY_BOUNDS } from "./level01/CityScene.js";
import { buildOfficeScene, INTERACTION_POINTS, OFFICE_BOUNDS } from "./level01/OfficeScene.js";
import { PlayerController } from "./level01/PlayerController.js";
import { InteractionSystem } from "./level01/InteractionSystem.js";
import { ComputerScreen } from "./level01/ComputerScreen.js";
import { PhoneUI } from "./level01/PhoneUI.js";
import { createPostprocessing, disposeScene } from "./levelUtils.js";

/**
 * Load the business-man NPC model (FBX) and apply its textures.
 */
async function loadBusinessManNPC(fbxLoader, textureLoader) {
  try {
    const fbx = await fbxLoader.loadAsync("/models/npc/business-man-low-polygon-game-character/source/Business_Man.fbx");

    const albedo = await textureLoader.loadAsync("/models/npc/business-man-low-polygon-game-character/textures/business_man_albedo.png");
    albedo.colorSpace = THREE.SRGBColorSpace;

    let normalMap = null;
    let aoMap = null;
    try {
      normalMap = await textureLoader.loadAsync("/models/npc/business-man-low-polygon-game-character/textures/business_man_normal.png");
      aoMap = await textureLoader.loadAsync("/models/npc/business-man-low-polygon-game-character/textures/business_man_ao.png");
    } catch (e) {
      // Optional textures — continue without them
    }

    const npcMaterial = new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normalMap,
      aoMap: aoMap,
      roughness: 0.7,
      metalness: 0.1,
    });

    fbx.traverse((child) => {
      if (child.isMesh) {
        child.material = npcMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return fbx;
  } catch (e) {
    console.warn("Failed to load business-man NPC:", e);
    return null;
  }
}

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
  // Load all GLB/FBX models in parallel
  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();
  const textureLoader = new THREE.TextureLoader();
  const [subwayGltf, cityGltf, edificioGltf, walkingFbx, businessManNPC] = await Promise.all([
    gltfLoader.loadAsync("/models/environment/subway_bar.glb"),
    gltfLoader.loadAsync("/models/environment/lowpoly.glb"),
    gltfLoader.loadAsync("/models/edificio_corficolombiana_colombian_skyscraper.glb"),
    fbxLoader.loadAsync("/models/animations/Walking.fbx").catch(() => null),
    loadBusinessManNPC(fbxLoader, textureLoader),
  ]);

  // Extract NPC walk animation clip from FBX
  let npcWalkClip = null;
  if (walkingFbx && walkingFbx.animations && walkingFbx.animations.length > 0) {
    npcWalkClip = walkingFbx.animations[0];
  }

  // Wrap business-man NPC as a GLTF-like object for the NPC system
  const npcGltfs = businessManNPC ? [{ scene: businessManNPC }] : null;

  // Build all sub-scenes with loaded models
  const subway = buildSubwayScene(subwayGltf);
  const city = buildCityScene(cityGltf, npcGltfs, { edificioGltf, walkClip: npcWalkClip });
  const office = buildOfficeScene({ npcTemplate: businessManNPC ? businessManNPC.clone() : null });

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
        // Place Snoopy inside the subway train so he rides in and exits when doors open
        subway.placeCharacterInTrain(playerAnchor);
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

        // Use pre-computed building colliders from city scene (shared with NPCs)
        if (city.buildingColliders) {
          for (const collider of city.buildingColliders) {
            playerController.addCollider(collider);
          }
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
        playerAnchor.rotation.y = Math.PI; // Face Snoopy toward the desk (forward into office)
        playerController.camera = office.camera;
        playerController.setBounds(OFFICE_BOUNDS);
        playerController.yaw = Math.PI;
        playerController.pitch = 0.3;

        // Office-specific camera settings (tighter, lower for indoor space)
        playerController.cfg.camDistance = 4.0;
        playerController.cfg.camHeight = 2.0;
        playerController.cfg.camLookAtHeight = 1.5;

        // Player's L-desk (main surface + extension) — padded for character model width
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-1.2, 0, -0.3), new THREE.Vector3(1.8, 1.5, 1.3)
        ));
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(1.3, 0, -0.4), new THREE.Vector3(2.6, 1.5, 0.9)
        ));

        // Left coworker desk (x=-4, z=0.5, 2.0 wide x 0.9 deep) — padded
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-5.3, 0, -0.25), new THREE.Vector3(-2.7, 1.5, 1.25)
        ));
        // Right coworker desk (x=4, z=0.5) — padded
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(2.7, 0, -0.25), new THREE.Vector3(5.3, 1.5, 1.25)
        ));

        // Filing cabinets along back wall
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(-6.5, 0, -6.1), new THREE.Vector3(-2.4, 1.5, -5.35)
        ));

        // Water cooler near back-right wall
        playerController.addCollider(new THREE.Box3(
          new THREE.Vector3(6.6, 0, -5.9), new THREE.Vector3(7.4, 1.5, -5.1)
        ));

        // Plant colliders (from OfficeScene)
        if (office.plantColliders) {
          for (const collider of office.plantColliders) {
            playerController.addCollider(collider);
          }
        }

        // Use only floor mesh for raycasting (not furniture/walls/etc)
        playerController.setGroundMeshes(office.groundMeshes || []);
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

      positionCityCamera(ctx) {
        // Position camera behind player before fade reveals city
        if (city.camera) {
          city.camera.position.set(0, 3, -8);
          city.camera.lookAt(0, 2, 10);
        }
      },

      positionOfficeCamera(ctx) {
        // Position camera behind player before fade reveals office
        if (office.camera) {
          office.camera.position.set(0, 2.5, 7);
          office.camera.lookAt(0, 1.5, 0);
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
