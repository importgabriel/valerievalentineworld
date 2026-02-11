// ========================================
// LEVEL 01 — SHARED CONSTANTS & MATERIALS
// ========================================
// Warm, inviting color palette used across all sub-scenes.

import * as THREE from "three";

// ========================================
// COLOR PALETTE
// ========================================

export const PALETTE = {
  // Warm light tones
  warmLight: 0xfff4e0,
  warmAmbient: 0xffe8cc,
  sunGold: 0xffd700,
  warmWhite: 0xfff8f0,

  // Subway
  subwayCeiling: 0xe8e0d0,
  subwayFloor: 0x888888,
  subwaySeat: 0xcc6633,
  subwaySeatCushion: 0xd4783c,
  subwayMetal: 0xaaaaaa,
  subwayMetalDark: 0x777777,
  subwayWindow: 0x334455,
  subwayWall: 0xddd8cc,
  subwayDoor: 0x999999,

  // City
  sidewalk: 0xccccbb,
  sidewalkLight: 0xd8d8cc,
  road: 0x444444,
  roadLine: 0xddddaa,
  crosswalk: 0xeeeedd,
  buildingGlass: 0x88bbcc,
  buildingConcrete: 0xbbaa99,
  buildingBrick: 0xaa7755,
  buildingDark: 0x556677,
  jpmorganBlue: 0x003366,
  jpmorganGlass: 0x224466,
  lampPost: 0x555555,
  treeTrunk: 0x8b6914,
  treeLeaves: 0x558844,

  // Office
  officeFloor: 0xdcd0c0,
  officeFloorAccent: 0xc8bca8,
  officeCeiling: 0xfaf5ef,
  officeWall: 0xf0ebe0,
  officeWallAccent: 0xe8e0d4,
  deskWood: 0xb8956a,
  deskWoodDark: 0x9a7a55,
  deskMetal: 0x888888,
  chairBlack: 0x333333,
  chairBase: 0x555555,
  monitorBlack: 0x222222,
  monitorScreen: 0x112244,
  monitorScreenEmissive: 0x224488,
  phoneBlack: 0x1a1a1a,
  plantGreen: 0x558844,
  plantPot: 0xaa7744,
  cabinetGray: 0x999999,
  waterCooler: 0xccddee,

  // NPC
  npcBody: 0x444455,
  npcBodyLight: 0x556666,

  // Sky
  skyWarm: 0xffeedd,
  skyHorizon: 0xffcc88,
  skySunset: 0xff8844,
};

// ========================================
// SHARED MATERIALS
// ========================================

export const MATS = {
  // Subway
  subwayFloor: new THREE.MeshStandardMaterial({ color: PALETTE.subwayFloor, roughness: 0.7, metalness: 0.1 }),
  subwayCeiling: new THREE.MeshStandardMaterial({ color: PALETTE.subwayCeiling, roughness: 0.9 }),
  subwayWall: new THREE.MeshStandardMaterial({ color: PALETTE.subwayWall, roughness: 0.8 }),
  subwaySeat: new THREE.MeshStandardMaterial({ color: PALETTE.subwaySeat, roughness: 0.7 }),
  subwaySeatCushion: new THREE.MeshStandardMaterial({ color: PALETTE.subwaySeatCushion, roughness: 0.85 }),
  subwayMetal: new THREE.MeshStandardMaterial({ color: PALETTE.subwayMetal, roughness: 0.3, metalness: 0.6 }),
  subwayMetalDark: new THREE.MeshStandardMaterial({ color: PALETTE.subwayMetalDark, roughness: 0.4, metalness: 0.5 }),
  subwayDoor: new THREE.MeshStandardMaterial({ color: PALETTE.subwayDoor, roughness: 0.3, metalness: 0.4 }),
  subwayWindow: new THREE.MeshPhysicalMaterial({
    color: PALETTE.subwayWindow,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }),
  subwayFluorescent: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: PALETTE.warmLight,
    emissiveIntensity: 0.8,
  }),

  // City
  sidewalk: new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 0.85 }),
  road: new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 0.9 }),
  crosswalk: new THREE.MeshStandardMaterial({ color: PALETTE.crosswalk, roughness: 0.8 }),
  buildingGlass: new THREE.MeshPhysicalMaterial({
    color: PALETTE.buildingGlass,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.6,
  }),
  buildingConcrete: new THREE.MeshStandardMaterial({ color: PALETTE.buildingConcrete, roughness: 0.9 }),
  buildingBrick: new THREE.MeshStandardMaterial({ color: PALETTE.buildingBrick, roughness: 0.85 }),
  jpmorganGlass: new THREE.MeshPhysicalMaterial({
    color: PALETTE.jpmorganGlass,
    roughness: 0.05,
    metalness: 0.3,
    transparent: true,
    opacity: 0.7,
  }),
  lampPost: new THREE.MeshStandardMaterial({ color: PALETTE.lampPost, roughness: 0.4, metalness: 0.5 }),
  treeLeaves: new THREE.MeshStandardMaterial({ color: PALETTE.treeLeaves, roughness: 0.9 }),
  treeTrunk: new THREE.MeshStandardMaterial({ color: PALETTE.treeTrunk, roughness: 0.85 }),

  // Office
  officeFloor: new THREE.MeshStandardMaterial({ color: PALETTE.officeFloor, roughness: 0.6 }),
  officeCeiling: new THREE.MeshStandardMaterial({ color: PALETTE.officeCeiling, roughness: 0.9 }),
  officeWall: new THREE.MeshStandardMaterial({ color: PALETTE.officeWall, roughness: 0.8 }),
  deskWood: new THREE.MeshStandardMaterial({ color: PALETTE.deskWood, roughness: 0.5 }),
  deskMetal: new THREE.MeshStandardMaterial({ color: PALETTE.deskMetal, roughness: 0.3, metalness: 0.4 }),
  chairBlack: new THREE.MeshStandardMaterial({ color: PALETTE.chairBlack, roughness: 0.9 }),
  chairBase: new THREE.MeshStandardMaterial({ color: PALETTE.chairBase, roughness: 0.4, metalness: 0.3 }),
  monitorBlack: new THREE.MeshStandardMaterial({ color: PALETTE.monitorBlack, roughness: 0.2, metalness: 0.3 }),
  monitorScreen: new THREE.MeshStandardMaterial({
    color: PALETTE.monitorScreen,
    emissive: PALETTE.monitorScreenEmissive,
    emissiveIntensity: 0.3,
  }),
  phoneBlack: new THREE.MeshStandardMaterial({ color: PALETTE.phoneBlack, roughness: 0.1, metalness: 0.3 }),
  plantGreen: new THREE.MeshStandardMaterial({ color: PALETTE.plantGreen, roughness: 0.85 }),
  plantPot: new THREE.MeshStandardMaterial({ color: PALETTE.plantPot, roughness: 0.7 }),
  cabinetGray: new THREE.MeshStandardMaterial({ color: PALETTE.cabinetGray, roughness: 0.6, metalness: 0.1 }),
  waterCooler: new THREE.MeshStandardMaterial({ color: PALETTE.waterCooler, roughness: 0.3, metalness: 0.1 }),
  ceilingLight: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: PALETTE.warmLight,
    emissiveIntensity: 0.6,
  }),

  // NPC
  npcBody: new THREE.MeshStandardMaterial({
    color: PALETTE.npcBody,
    roughness: 0.8,
    transparent: true,
    opacity: 0.8,
  }),

  // Glass
  windowGlass: new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.12,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }),

  // Lit windows (for skyline)
  windowLit: new THREE.MeshStandardMaterial({
    color: 0xfff8dc,
    emissive: 0xffd700,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.9,
  }),
  windowDark: new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9 }),
};
