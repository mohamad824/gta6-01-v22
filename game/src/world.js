// One job: the world — scene assembly (sky, lights, city, vehicles, people, heli,
// garage), the camera rigs, the per-step simulation, and the deterministic shot
// staging. Rendering lives in render.js; the loop lives in main.js.
import * as THREE from '../vendor/three/three.module.min.js';
import { createState } from './state.js';
import { buildCity } from './city.js';
import { makeSky } from './sky.js';
import { buildHero, buildPoliceFleet, buildTraffic, buildParked, driveHero } from './vehicles.js';
import { makeLeo, makePedestrians, updatePedestrians } from './people.js';
import { buildHeli, updateHeli } from './heli.js';
import { createPoliceUnit, updatePolice, unitsForWanted } from './police.js';
import { buildGarageScene } from './garage.js';
import { addHeat, bleedHeat, CRIME_HEAT } from './wanted.js';
import { advanceMission, completeMission } from './missions.js';
import { shoot, switchWeapon, policeReturnFire } from './weapons.js';
import { audio } from './audio.js';
import { muzzleFlash, setHeat, shake } from './effects.js';
import { nextDispatchLine } from './dispatch.js';

const CAMERAS = {
  chase: { pos: [0, 3.1, 8.6], look: [0, 0.9, -10] },
  onfoot: { pos: [1.6, 2.3, 7.5], look: [0, 1.1, -3] },
  title: { pos: [-6, 5.5, 16], look: [0, 1, -8] },
};

export function createWorld(rng, seed) {
  const state = createState();
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xff8a3a, 90, 280);

  // Golden-hour light: low warm sun from the west, warm hemisphere fill.
  const sun = new THREE.DirectionalLight(0xffb066, 2.6);
  sun.position.set(-40, 18, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.normalBias = 0.02;
  sun.shadow.bias = -0.0001;
  sun.shadow.intensity = 0.7;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xff9a4d, 0x7a5a3a, 1.5));
  scene.add(new THREE.AmbientLight(0xffc090, 0.55));
  // Warm bounce from behind the camera: the cars' rears (the side the chase
  // camera sees) must read orange and white, not black silhouettes.
  const bounce = new THREE.DirectionalLight(0xffd9a0, 1.4);
  bounce.position.set(30, 12, 40);
  scene.add(bounce);
  scene.add(bounce.target);

  // Environment lighting: prefilter the sunset sky itself (PMREM from a scene).
  // (The PMREM pass needs the real renderer, so it runs in applyEnvironment().)
  scene.add(makeSky(rng));
  buildCity(scene, rng);

  const heroMesh = buildHero(state);
  scene.add(heroMesh);
  const leo = makeLeo();
  leo.visible = false;
  scene.add(leo);
  const hero = { x: 0, z: 0, heading: 0, speed: 0, onFoot: false, mesh: heroMesh, leo, vy: 0 };

  const fleet = buildPoliceFleet();
  for (const car of fleet) scene.add(car);
  const units = [
    createPoliceUnit(fleet[0], 'ram', 'RAMMING'),
    createPoliceUnit(fleet[1], 'ram', 'RAMMING'),
    createPoliceUnit(fleet[2], 'roadblock', 'ROADBLOCK'),
    createPoliceUnit(fleet[3], 'roadblock', 'ROADBLOCK'),
    createPoliceUnit(fleet[4], 'box', 'BOXING IN'),
    createPoliceUnit(fleet[5], 'pursuit', 'PURSUIT'),
  ];

  const heli = buildHeli();
  heli.group.position.set(2.5, 10.5, -5);
  scene.add(heli.group);

  const traffic = buildTraffic(rng, 10);
  for (const car of traffic) scene.add(car);
  const parked = buildParked(rng);
  for (const car of parked) scene.add(car);
  const peds = makePedestrians(rng, 8);
  for (const ped of peds) scene.add(ped);

  const garage = buildGarageScene(rng, state);
  const camera = new THREE.PerspectiveCamera(55, 1280 / 720, 0.1, 500);

  const world = {
    scene, garageScene: garage.scene, garageCamera: garage.camera, garage,
    camera, state, hero, police: fleet, units, heli, traffic, parked, peds,
    mode: 'title', time: 0, lastShot: 0, dispatchTimer: 0, dispatchLine: '',
    shotName: null, lastCash: state.cash, seed,
  };
  return world;
}

/** Prefilter the sunset sky into the scene environment (needs the real renderer). */
export function applyEnvironment(world, renderer, rng) {
  const envScene = new THREE.Scene();
  envScene.add(makeSky(rng));
  const pmrem = new THREE.PMREMGenerator(renderer);
  world.scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  world.scene.environmentIntensity = 1.1;
  pmrem.dispose();
}

/** Position the camera from a preset (chase / onfoot / title). */
export function setCameraPreset(world, name) {
  const preset = CAMERAS[name];
  world.camera.position.set(...preset.pos);
  world.camera.lookAt(...preset.look);
}

/** Chase-follow camera: low and close behind the hero car. */
function followCamera(world, dt) {
  const hero = world.hero;
  const back = 9.2;
  const tx = hero.x - Math.sin(hero.heading) * back;
  const tz = hero.z + Math.cos(hero.heading) * back;
  const k = Math.min(1, dt * 5);
  world.camera.position.x += (tx - world.camera.position.x) * k;
  world.camera.position.y += (3.4 - world.camera.position.y) * k;
  world.camera.position.z += (tz - world.camera.position.z) * k;
  world.camera.lookAt(hero.x + Math.sin(hero.heading) * 8, 1.0, hero.z - Math.cos(hero.heading) * 8);
}

/** Nearest parked car within 3 m of the hero (for the steal prompt). */
export function nearestParked(world) {
  let best = null;
  let bestDist = 3;
  for (const car of world.parked) {
    if (!car.visible) continue;
    const d = Math.hypot(car.position.x - world.hero.x, car.position.z - world.hero.z);
    if (d < bestDist) { best = car; bestDist = d; }
  }
  return best;
}

function enterCar(world, parkedCar) {
  const state = world.state;
  world.hero.onFoot = false;
  world.hero.mesh.visible = true;
  world.hero.leo.visible = false;
  world.hero.mesh.position.set(parkedCar.position.x, 0, parkedCar.position.z);
  world.hero.x = parkedCar.position.x;
  world.hero.z = parkedCar.position.z;
  world.hero.heading = parkedCar.rotation.y;
  world.hero.speed = 0;
  state.vehicle.name = parkedCar.userData.steal.name;
  state.vehicle.kind = parkedCar.userData.steal.kind;
  state.vehicle.color = parkedCar.userData.steal.color;
  parkedCar.visible = false;
  addHeat(state, CRIME_HEAT.steal);
}

function exitCar(world) {
  const hero = world.hero;
  hero.onFoot = true;
  hero.speed = 0;
  hero.mesh.visible = false;
  hero.leo.visible = true;
  hero.leo.position.set(hero.x + 1.6, 0, hero.z + 0.8);
  hero.leo.rotation.y = Math.PI;
}

/**
 * One simulation step (play mode only). `drive`/`walk` are the input intents,
 * `actions` the drained bitmask. Returns events for the loop.
 */
export function stepWorld(world, input, actions, dt) {
  const state = world.state;
  const hero = world.hero;
  const events = { missionComplete: null, rammed: false, shot: false };
  world.time += dt;

  // Weapon switching (keys 1–5).
  for (let i = 0; i < 5; i += 1) {
    if (actions & (128 << i)) switchWeapon(state, i);
  }
  // Shooting (F or click): spends ammo, flashes, adds heat.
  if (actions & 32) {
    const res = shoot(state, world.time, world.lastShot);
    if (res.fired) {
      world.lastShot = world.time;
      events.shot = true;
      audio.gunshot();
      const fx = hero.onFoot ? hero.leo.position : hero.mesh.position;
      muzzleFlash(world.scene, THREE, new THREE.Vector3(fx.x, 1.2, fx.z - 2));
      addHeat(state, CRIME_HEAT.shoot);
    }
  }
  // Enter / steal / exit (E).
  if (actions & 16) {
    if (hero.onFoot) {
      const near = nearestParked(world);
      if (near) enterCar(world, near);
    } else {
      exitCar(world);
    }
  }

  if (hero.onFoot) {
    const walk = input.walk();
    const speed = walk.run ? 7 : 4;
    hero.x += Math.sin(hero.heading) * walk.fwd * speed * dt + Math.cos(hero.heading) * walk.strafe * speed * dt;
    hero.z -= Math.cos(hero.heading) * walk.fwd * speed * dt - Math.sin(hero.heading) * walk.strafe * speed * dt;
    hero.leo.position.set(hero.x, 0, hero.z);
    const u = hero.leo.userData;
    const moving = walk.fwd !== 0 || walk.strafe !== 0;
    if (moving) {
      u.walkPhase += dt * speed * 1.6;
      const swing = Math.sin(u.walkPhase) * 0.5;
      u.legs[0].rotation.x = swing;
      u.legs[1].rotation.x = -swing;
      u.arms[0].rotation.x = -swing * 0.8;
      u.arms[1].rotation.x = swing * 0.8;
    }
    hero.speed = moving ? speed : 0;
  } else {
    driveHero(hero, input.drive(), dt, state);
    hero.mesh.position.set(hero.x, 0, hero.z);
    hero.mesh.rotation.y = hero.heading;
    // Mission 4 progress: driving west fast through the chase advances it.
    if (state.missionIndex === 3 && Math.abs(hero.speed) > 12) {
      if (advanceMission(state, dt * 0.02)) {
        events.missionComplete = completeMission(state);
        audio.chime();
      }
    }
    audio.engine(Math.abs(hero.speed) / 40);
  }

  // Police, heli, pedestrians, traffic.
  const active = unitsForWanted(state.wanted);
  const res = updatePolice(world.units.slice(0, active), hero, dt, state);
  if (res.rammed) {
    events.rammed = true;
    state.vehicle.condition = Math.max(0, state.vehicle.condition - res.damage);
    shake(0.25, 0.25);
    setHeat(state.heat / 100);
  }
  updateHeli(world.heli, hero, dt, world.time);
  updatePedestrians(world.peds, dt);
  for (const car of world.traffic) {
    car.position.z -= 3 * dt;
    if (car.position.z < -90) car.position.z = 30;
  }
  // Wanted bleed + return fire.
  bleedHeat(state, dt, false);
  const nearest = world.units.reduce((m, u) => Math.min(m, Math.hypot(u.car.position.x - hero.x, u.car.position.z - hero.z)), 99);
  policeReturnFire(state, dt, nearest, Math.random);
  // Dispatch line rotates every 12 s.
  world.dispatchTimer += dt;
  if (world.dispatchTimer > 12) {
    world.dispatchTimer = 0;
    world.dispatchLine = nextDispatchLine();
    audio.blip();
  }
  followCamera(world, dt);
  return events;
}

/** Reset the world to the staged chase state (deterministic, from the seed). */
export function resetToStaged(world) {
  const state = world.state;
  Object.assign(state, createState());
  world.hero.x = 0;
  world.hero.z = 0;
  world.hero.heading = 0;
  world.hero.speed = 0;
  world.hero.onFoot = false;
  world.hero.mesh.visible = true;
  world.hero.leo.visible = false;
  world.hero.mesh.position.set(0, 0, 0);
  world.hero.mesh.rotation.y = 0;
  const spots = [
    [-1.95, 0.4, 0], [1.95, 0.4, 0], [-3.2, -12, 0.12], [3.2, -12, -0.12], [0, -12, 0], [5.5, -6, 0.5],
  ];
  world.police.forEach((car, i) => {
    car.position.set(spots[i][0], 0, spots[i][1]);
    car.rotation.y = spots[i][2];
  });
  world.heli.group.position.set(2.5, 10.5, -5);
  world.time = 0;
  world.dispatchLine = 'All units, suspect is westbound on the boulevard. Air One has the light.';
}
