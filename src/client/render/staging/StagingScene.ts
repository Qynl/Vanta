import * as THREE from "three";

import { CameraRig } from "@/client/render/camera/CameraRig";
import {
  ProceduralMaterialLibrary,
  type SurfaceStyleId,
} from "@/client/render/materials/ProceduralMaterials";
import {
  QUALITY_PROFILES,
  type QualityProfile,
} from "@/client/render/quality";
import { createSkyDome } from "@/client/render/staging/SkyDome";

export interface ArenaScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cameraRig: CameraRig;
  setSize: (aspect: number) => void;
  setFov: (fov: number) => void;
  setQuality: (profile: QualityProfile) => void;
  setCinematicCameraEnabled: (enabled: boolean) => void;
  update: (
    elapsedSeconds: number,
    deltaSeconds: number,
    reducedMotion: boolean,
  ) => void;
  dispose: () => void;
}

export interface StagingSceneOptions {
  fov?: number;
  materials?: ProceduralMaterialLibrary;
}

const FOG_COLOR = 0x101a13;
const SKY_HORIZON = 0x1a2a1c;
const SKY_ZENITH = 0x040706;
const SUN_COLOR = 0xffd8a4;
const VOLT = 0xd8ff45;
const SIGNAL = 0xff5b34;
const CYAN = 0x79e6d2;
const SUN_DIRECTION = new THREE.Vector3(24, 34, 14);

type SurfaceMaterial = THREE.MeshStandardMaterial;

function surface(
  materials: ProceduralMaterialLibrary,
  style: SurfaceStyleId,
): SurfaceMaterial {
  return materials.getSurface(style);
}

export function createStagingScene(
  options: StagingSceneOptions = {},
): ArenaScene {
  const materials =
    options.materials ??
    new ProceduralMaterialLibrary({
      anisotropy: QUALITY_PROFILES.high.anisotropy,
    });

  try {
    return buildStagingScene(materials, options);
  } catch (error) {
    if (!options.materials) {
      materials.dispose();
    }

    throw error;
  }
}

function buildStagingScene(
  materials: ProceduralMaterialLibrary,
  { fov = 100 }: StagingSceneOptions,
): ArenaScene {
  const scene = new THREE.Scene();
  scene.name = "VANTA staging scene";
  scene.background = new THREE.Color(FOG_COLOR);

  const fog = new THREE.Fog(
    FOG_COLOR,
    QUALITY_PROFILES.high.fogNear,
    QUALITY_PROFILES.high.fogFar,
  );
  scene.fog = fog;

  const cameraRig = new CameraRig({ fov, near: 0.1, far: 420 });
  const camera = cameraRig.camera;
  const lookTarget = new THREE.Vector3(0, 3, 0);
  const cameraRadius = 31;

  const placeCamera = (elapsedSeconds: number) => {
    const angle = 0.78 + elapsedSeconds * 0.014;

    cameraRig.setPose(
      {
        x: Math.sin(angle) * cameraRadius,
        y: 11.5 + Math.sin(elapsedSeconds * 0.18) * 0.35,
        z: Math.cos(angle) * cameraRadius,
      },
      lookTarget,
    );
    cameraRig.setLean(Math.sin(angle * 0.85) * 0.012);
  };

  placeCamera(0);
  cameraRig.update(0);

  const sky = createSkyDome({
    horizonColor: SKY_HORIZON,
    zenithColor: SKY_ZENITH,
    sunColor: SUN_COLOR,
    sunDirection: SUN_DIRECTION,
    radius: 320,
  });
  sky.follow(camera.position);
  scene.add(sky.mesh);

  const world = new THREE.Group();
  world.name = "staging-world";
  scene.add(world);

  const concrete = surface(materials, "concrete");
  const darkMetal = surface(materials, "darkMetal");
  const bleachedPanel = surface(materials, "bleachedPanel");
  const towerMaterial = surface(materials, "tower");
  const deck = surface(materials, "deck");
  const hazard = surface(materials, "hazard");
  const grate = surface(materials, "grate");
  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), deck);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "ground";
  world.add(floor);

  const grid = new THREE.GridHelper(160, 80, 0x364438, 0x1b251d);
  grid.position.y = 0.012;
  grid.name = "ground-grid";

  const gridMaterial = Array.isArray(grid.material)
    ? grid.material[0]
    : grid.material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.3;
  gridMaterial.depthWrite = false;
  world.add(grid);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(13.4, 14.2, 0.7, 64),
    darkMetal,
  );
  platform.position.y = 0.35;
  platform.receiveShadow = true;
  platform.castShadow = true;
  platform.name = "staging-platform";
  world.add(platform);

  const serviceGrate = new THREE.Mesh(
    new THREE.RingGeometry(3.9, 4.65, 72),
    grate,
  );
  serviceGrate.rotation.x = -Math.PI / 2;
  serviceGrate.position.y = 0.707;
  serviceGrate.receiveShadow = true;
  serviceGrate.name = "service-grate";
  world.add(serviceGrate);

  const hazardRing = new THREE.Mesh(
    new THREE.RingGeometry(12.18, 12.46, 128),
    hazard,
  );
  hazardRing.rotation.x = -Math.PI / 2;
  hazardRing.position.y = 0.709;
  hazardRing.receiveShadow = true;
  hazardRing.name = "hazard-ring";
  world.add(hazardRing);

  const perimeterRing = new THREE.Mesh(
    new THREE.RingGeometry(12.52, 12.6, 128),
    new THREE.MeshBasicMaterial({
      color: VOLT,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  perimeterRing.rotation.x = -Math.PI / 2;
  perimeterRing.position.y = 0.715;
  world.add(perimeterRing);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(6.5, 6.56, 96),
    new THREE.MeshBasicMaterial({
      color: SIGNAL,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.716;
  world.add(innerRing);

  const coverBlocks = [
    [-5.4, -2, 2.8, 1.3, 1.7, concrete],
    [4.9, -3.9, 1.4, 2.4, 1.4, darkMetal],
    [5.9, 3.3, 3.2, 1.05, 2, bleachedPanel],
    [-3.7, 5.1, 2.2, 1.8, 1, concrete],
    [0.4, -7.2, 4, 0.8, 1.5, bleachedPanel],
    [-8.1, -5.5, 1.2, 2.3, 3.3, darkMetal],
    [8.1, -0.7, 1.1, 3.1, 3.1, concrete],
    [-8.7, 2.8, 1.4, 2.7, 1.4, darkMetal],
  ] as const;

  coverBlocks.forEach(([x, z, width, height, depth, material], index) => {
    const block = new THREE.Mesh(unitBox, material);
    block.position.set(x, 0.7 + height / 2, z);
    block.scale.set(width, height, depth);
    block.castShadow = true;
    block.receiveShadow = true;
    world.add(block);

    if (index % 2 === 0) {
      const strip = new THREE.Mesh(
        unitBox,
        new THREE.MeshBasicMaterial({
          color: index === 0 ? SIGNAL : VOLT,
          transparent: true,
          opacity: 0.5,
        }),
      );
      strip.position.set(
        x,
        0.7 + height - 0.08,
        z - depth / 2 - 0.012,
      );
      strip.scale.set(width * 0.52, 0.035, 0.02);
      world.add(strip);
    }
  });

  const addBlock = (
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    material: SurfaceMaterial,
    rotationY = 0,
  ) => {
    const block = new THREE.Mesh(unitBox, material);
    block.name = name;
    block.position.set(x, y, z);
    block.rotation.y = rotationY;
    block.scale.set(width, height, depth);
    block.castShadow = true;
    block.receiveShadow = true;
    world.add(block);

    return block;
  };

  // Elevated service catwalk, reached by a real stepped run. This adds the
  // verticality and occluded sightlines a gameplay greybox must exercise.
  const catwalk = new THREE.Group();
  catwalk.name = "elevated-catwalk";
  world.add(catwalk);

  const catwalkDeck = new THREE.Mesh(unitBox, bleachedPanel);
  catwalkDeck.name = "catwalk-deck";
  catwalkDeck.position.set(14.9, 5.9, 2.2);
  catwalkDeck.scale.set(3.2, 0.36, 18.4);
  catwalkDeck.castShadow = true;
  catwalkDeck.receiveShadow = true;
  catwalk.add(catwalkDeck);

  for (const z of [-6.4, -1.4, 4.1, 9.4]) {
    const support = new THREE.Mesh(unitBox, darkMetal);
    support.position.set(14.9, 2.95, z);
    support.scale.set(0.34, 5.9, 0.34);
    support.castShadow = true;
    support.receiveShadow = true;
    catwalk.add(support);
  }

  const stairCount = 13;
  const stairs = new THREE.InstancedMesh(unitBox, darkMetal, stairCount);
  stairs.name = "catwalk-stairs";
  stairs.castShadow = true;
  stairs.receiveShadow = true;
  const stairTransform = new THREE.Object3D();

  const stairRise = (5.9 + 0.18 - 0.7) / stairCount;

  for (let index = 0; index < stairCount; index += 1) {
    const stepHeight = 0.7 + (index + 1) * stairRise;
    stairTransform.position.set(14.9, stepHeight / 2, 16 - index * 0.42);
    stairTransform.scale.set(2.4, stepHeight, 0.46);
    stairTransform.updateMatrix();
    stairs.setMatrixAt(index, stairTransform.matrix);
  }

  catwalk.add(stairs);

  const railPostCount = 16;
  const railPosts = new THREE.InstancedMesh(
    unitBox,
    darkMetal,
    railPostCount,
  );
  railPosts.name = "catwalk-rail-posts";
  railPosts.castShadow = true;
  const railTransform = new THREE.Object3D();
  let railIndex = 0;

  for (const x of [13.33, 16.47]) {
    for (let index = 0; index < 8; index += 1) {
      railTransform.position.set(x, 6.66, -6.4 + index * 2.24);
      railTransform.scale.set(0.075, 1.08, 0.075);
      railTransform.updateMatrix();
      railPosts.setMatrixAt(railIndex, railTransform.matrix);
      railIndex += 1;
    }
  }

  catwalk.add(railPosts);

  for (const x of [13.33, 16.47]) {
    const topRail = new THREE.Mesh(unitBox, darkMetal);
    topRail.position.set(x, 7.2, 2.2);
    topRail.scale.set(0.075, 0.075, 17.6);
    topRail.castShadow = true;
    catwalk.add(topRail);
  }

  // Cargo bay: two grounded containers and two platform-side crates create
  // distinct lanes, cover heights and a hard silhouette against the skyline.
  const cargoBank = new THREE.Group();
  cargoBank.name = "cargo-bank";
  world.add(cargoBank);

  const cargo = [
    [-18.2, 1.55, 10.9, 5.8, 3.1, 2.7, bleachedPanel, 0.08],
    [18.8, 1.15, -11.3, 4.8, 2.3, 2.8, deck, -0.1],
    [-10.9, 0.7 + 1.25, 7.6, 4.2, 2.5, 2.1, darkMetal, 0.04],
    [11.4, 0.7 + 0.75, -6.5, 3, 1.5, 3.1, bleachedPanel, -0.06],
  ] as const;

  cargo.forEach(([x, y, z, width, height, depth, material, rotation], index) => {
    const container = new THREE.Mesh(unitBox, material);
    container.name = `cargo-container-${index + 1}`;
    container.position.set(x, y, z);
    container.rotation.y = rotation;
    container.scale.set(width, height, depth);
    container.castShadow = true;
    container.receiveShadow = true;
    cargoBank.add(container);
  });

  const cargoStripMaterial = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const cargoStrip = new THREE.Mesh(unitBox, cargoStripMaterial);
  cargoStrip.position.set(-18.2, 2.6, 9.53);
  cargoStrip.scale.set(4.6, 0.035, 0.02);
  cargoBank.add(cargoStrip);

  const floodlightMasts = new THREE.Group();
  floodlightMasts.name = "floodlight-masts";
  world.add(floodlightMasts);

  const floodLampMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe6b8,
    toneMapped: false,
  });

  for (const [x, z] of [
    [-19.5, -18.5],
    [19.5, -18.5],
    [-19.5, 18.5],
    [19.5, 18.5],
  ] as const) {
    const mast = new THREE.Mesh(unitBox, darkMetal);
    mast.position.set(x, 4.5, z);
    mast.scale.set(0.24, 9, 0.24);
    mast.castShadow = true;
    floodlightMasts.add(mast);

    const head = new THREE.Mesh(unitBox, darkMetal);
    head.position.set(x, 9.12, z);
    head.scale.set(1.8, 0.28, 0.7);
    head.castShadow = true;
    floodlightMasts.add(head);

    const lamp = new THREE.Mesh(unitBox, floodLampMaterial);
    lamp.position.set(x, 8.94, z);
    lamp.scale.set(1.32, 0.07, 0.46);
    floodlightMasts.add(lamp);
  }

  const pipeGeometry = new THREE.CylinderGeometry(0.18, 0.18, 16, 12);
  const servicePipes = new THREE.Group();
  servicePipes.name = "service-pipe-run";
  world.add(servicePipes);

  const horizontalPipe = new THREE.Mesh(pipeGeometry, darkMetal);
  horizontalPipe.position.set(-17, 1.15, 13.8);
  horizontalPipe.rotation.z = Math.PI / 2;
  horizontalPipe.castShadow = true;
  servicePipes.add(horizontalPipe);

  const riserPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 5.4, 12),
    darkMetal,
  );
  riserPipe.position.set(-18.8, 2.7, 13.8);
  riserPipe.castShadow = true;
  servicePipes.add(riserPipe);

  const perimeterCovers = [
    [-15.8, 0.55, -4.8, 3.8, 1.1, 0.8, concrete, 0.05],
    [15.4, 0.75, 7.9, 3.2, 1.5, 0.8, concrete, -0.04],
    [-7.2, 0.45, 13.1, 4.4, 0.9, 0.75, darkMetal, 0],
    [3.6, 0.65, -14.7, 4.8, 1.3, 0.8, bleachedPanel, 0],
  ] as const;

  perimeterCovers.forEach(([x, y, z, width, height, depth, material, rotation], index) => {
    addBlock(
      `perimeter-cover-${index + 1}`,
      x,
      y,
      z,
      width,
      height,
      depth,
      material,
      rotation,
    );
  });

  const towerLayout = [
    [-23, -19, 5, 15, 5],
    [21, -25, 6, 20, 6],
    [29, 3, 4, 11, 7],
    [-28, 9, 5, 17, 5],
    [16, 23, 8, 8, 5],
    [-14, 26, 4, 13, 4],
    [37, -14, 3, 26, 3],
    [-36, -8, 4, 23, 4],
  ] as const;

  const towerCaps = new THREE.Group();
  towerCaps.name = "tower-beacons";
  world.add(towerCaps);

  towerLayout.forEach(([x, z, width, height, depth], index) => {
    const tower = new THREE.Mesh(unitBox, towerMaterial);
    tower.position.set(x, height / 2, z);
    tower.scale.set(width, height, depth);
    tower.castShadow = true;
    tower.receiveShadow = true;
    world.add(tower);

    const cap = new THREE.Mesh(
      unitBox,
      new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? SIGNAL : index % 2 === 0 ? CYAN : VOLT,
        transparent: true,
        opacity: 0.8,
      }),
    );
    cap.position.set(x, height + 0.05, z);
    cap.scale.set(width * 0.4, 0.05, depth * 0.4);
    towerCaps.add(cap);
  });

  const skyline = new THREE.InstancedMesh(unitBox, towerMaterial, 34);
  skyline.name = "distant-skyline";
  skyline.castShadow = false;
  skyline.receiveShadow = false;
  const skylineTransform = new THREE.Object3D();

  for (let index = 0; index < 34; index += 1) {
    const angle = index * 2.399963 + 0.41;
    const radius = 72 + ((index * 37) % 79);
    const width = 4 + ((index * 13) % 9);
    const depth = 4 + ((index * 17) % 11);
    const height = 16 + ((index * 29) % 54);
    skylineTransform.position.set(
      Math.sin(angle) * radius,
      height / 2,
      Math.cos(angle) * radius,
    );
    skylineTransform.rotation.set(0, angle, 0);
    skylineTransform.scale.set(width, height, depth);
    skylineTransform.updateMatrix();
    skyline.setMatrixAt(index, skylineTransform.matrix);
  }

  skyline.instanceMatrix.needsUpdate = true;
  skyline.computeBoundingSphere();
  world.add(skyline);

  const beacon = new THREE.Group();
  beacon.name = "beacon";
  beacon.position.y = 5.4;
  world.add(beacon);

  const holoMaterial = new THREE.MeshBasicMaterial({
    color: VOLT,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const signalHoloMaterial = new THREE.MeshBasicMaterial({
    color: SIGNAL,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const outerHoloRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.6, 0.04, 8, 96),
    holoMaterial,
  );
  outerHoloRing.rotation.x = Math.PI / 2;
  beacon.add(outerHoloRing);

  const innerHoloRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.025, 8, 72),
    signalHoloMaterial,
  );
  innerHoloRing.rotation.x = Math.PI / 2;
  beacon.add(innerHoloRing);

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 0),
    new THREE.MeshBasicMaterial({
      color: VOLT,
      transparent: true,
      opacity: 0.82,
    }),
  );
  beacon.add(core);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 8.2, 6, 1, true),
    new THREE.MeshBasicMaterial({
      color: VOLT,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  beam.position.y = 4.1;
  world.add(beam);

  const orbiterGroup = new THREE.Group();
  orbiterGroup.name = "orbiters";
  orbiterGroup.position.y = 4.5;
  const orbiterGeometry = new THREE.TetrahedronGeometry(0.16, 0);
  const orbiterMaterial = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.72,
  });

  for (let index = 0; index < 3; index += 1) {
    const orbiter = new THREE.Mesh(orbiterGeometry, orbiterMaterial);
    const angle = (index / 3) * Math.PI * 2;
    orbiter.position.set(
      Math.sin(angle) * 5.3,
      index * 0.35,
      Math.cos(angle) * 5.3,
    );
    orbiterGroup.add(orbiter);
  }

  world.add(orbiterGroup);

  const hemisphereLight = new THREE.HemisphereLight(
    0xa8c4b9,
    0x050806,
    1.25,
  );
  scene.add(hemisphereLight);

  const sun = new THREE.DirectionalLight(0xffe8c5, 2.7);
  sun.name = "key-light";
  sun.position.copy(SUN_DIRECTION);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const rimLight = new THREE.DirectionalLight(0x79e6d2, 0.75);
  rimLight.position.set(-20, 12, -24);
  scene.add(rimLight);

  const voltSpill = new THREE.PointLight(0xd8ff45, 18, 24, 2);
  voltSpill.position.set(0, 2.2, 0);
  scene.add(voltSpill);

  const signalSpill = new THREE.PointLight(0xff5b34, 12, 18, 2);
  signalSpill.position.set(-8, 2.4, 6.5);
  scene.add(signalSpill);

  let disposed = false;
  let cinematicCameraEnabled = true;

  const setSize = (aspect: number) => {
    cameraRig.setViewport(aspect);
  };

  const setFov = (nextFov: number) => {
    cameraRig.setFov(nextFov);
  };

  const setQuality = (profile: QualityProfile) => {
    fog.near = profile.fogNear;
    fog.far = profile.fogFar;
    sun.castShadow = profile.shadows;
    sun.shadow.mapSize.set(
      profile.shadowMapSize || 512,
      profile.shadowMapSize || 512,
    );
    materials.setQuality(profile);

    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }

    gridMaterial.opacity = profile.shadows ? 0.3 : 0.22;
  };

  const update = (
    elapsedSeconds: number,
    deltaSeconds: number,
    reducedMotion: boolean,
  ) => {
    cameraRig.setReducedMotion(reducedMotion);

    if (!reducedMotion) {
      beacon.rotation.y = elapsedSeconds * 0.12;
      outerHoloRing.rotation.z = elapsedSeconds * 0.16;
      innerHoloRing.rotation.z = elapsedSeconds * -0.2;
      orbiterGroup.rotation.y = elapsedSeconds * 0.08;
      orbiterGroup.rotation.x = Math.sin(elapsedSeconds * 0.2) * 0.06;
      holoMaterial.opacity = 0.5 + Math.sin(elapsedSeconds * 0.9) * 0.08;
      signalHoloMaterial.opacity =
        0.32 + Math.sin(elapsedSeconds * 0.7 + 1.4) * 0.06;

      if (cinematicCameraEnabled) {
        placeCamera(elapsedSeconds);
      }
    }

    cameraRig.update(deltaSeconds);
    sky.follow(camera.position);
  };

  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;

    const geometries = new Set<THREE.BufferGeometry>();
    const materialsToDispose = new Set<THREE.Material>();

    scene.traverse((object) => {
      const renderable = object as unknown as {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };

      if (renderable.geometry) {
        geometries.add(renderable.geometry);
      }

      const collectMaterial = (material: THREE.Material) => {
        if (material.userData.vantaSurfaceStyle) {
          return;
        }

        materialsToDispose.add(material);
      };

      if (Array.isArray(renderable.material)) {
        renderable.material.forEach(collectMaterial);
      } else if (renderable.material) {
        collectMaterial(renderable.material);
      }
    });

    geometries.forEach((geometry) => geometry.dispose());
    materialsToDispose.forEach((material) => material.dispose());
    materials.dispose();
    sun.shadow.map?.dispose();
    scene.clear();
  };

  setQuality(QUALITY_PROFILES.high);

  return {
    scene,
    camera,
    cameraRig,
    setSize,
    setFov,
    setQuality,
    setCinematicCameraEnabled: (enabled) => {
      cinematicCameraEnabled = enabled;
    },
    update,
    dispose,
  };
}
