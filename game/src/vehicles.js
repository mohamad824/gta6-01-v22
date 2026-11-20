// One job: the vehicles in the world — the hero car, the police fleet, civilian
// traffic and the stealable parked cars — plus arcade driving physics.
import * as THREE from '../vendor/three/three.module.min.js';
import { buildCar, updateLightBar } from './carfactory.js';
import { pick, range } from './random.js';

const TRAFFIC_COLORS = [0x3a6ea5, 0xc2a23a, 0x7a3a5a, 0x4a7a5a, 0x8a8a8a, 0x5a3a7a, 0xb05a2a];
const TRAFFIC_KINDS = ['sedan', 'coupe', 'suv', 'pickup', 'van', 'sports', 'classic'];

export function buildHero(state) {
  const car = buildCar({ kind: 'sedan', color: state.vehicle.color });
  car.position.set(0, 0, 0);
  return car;
}

export function buildPoliceFleet() {
  // Six cruisers: two rammers, two roadblock, one boxer, one spotter (Air 1 is the heli).
  const fleet = [];
  const spots = [
    { x: -1.95, z: 0.4, heading: 0 },
    { x: 1.95, z: 0.4, heading: 0 },
    { x: -3.2, z: -12, heading: 0.12 },
    { x: 3.2, z: -12, heading: -0.12 },
    { x: 0, z: -12, heading: 0 },
    { x: 5.5, z: -6, heading: 0.5 },
  ];
  for (const spot of spots) {
    const car = buildCar({ kind: 'sedan', color: 0xe8e4da, police: true });
    car.position.set(spot.x, 0, spot.z);
    car.rotation.y = spot.heading;
    fleet.push(car);
  }
  return fleet;
}

export function buildTraffic(rng, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const kind = pick(rng, TRAFFIC_KINDS);
    const color = pick(rng, TRAFFIC_COLORS);
    const car = buildCar({ kind, color });
    const lane = rng() > 0.5 ? -3.4 : 3.4;
    car.position.set(lane + range(rng, -0.6, 0.6), 0, -20 - i * range(rng, 7, 12));
    car.rotation.y = rng() > 0.5 ? 0 : Math.PI;
    cars.push(car);
  }
  return cars;
}

/** Seven stealable parked cars along the boulevard, distinct silhouettes/colours. */
export function buildParked(rng) {
  const parked = [];
  const defs = [
    { kind: 'coupe', color: 0xc21f2a, name: 'Vela S', x: 5.8, z: -4 },
    { kind: 'suv', color: 0x2a4a6a, name: 'Bruto XL', x: -5.8, z: -14 },
    { kind: 'sports', color: 0xd8b400, name: 'Cometa R', x: 5.8, z: -22 },
    { kind: 'classic', color: 0x6a4a2a, name: 'Ancora', x: -5.8, z: -30 },
    { kind: 'pickup', color: 0x3a5a3a, name: 'Toro', x: 5.8, z: -38 },
    { kind: 'van', color: 0x8a8a92, name: 'Caravana', x: -5.8, z: -46 },
    { kind: 'sedan', color: 0x7a2a4a, name: 'Luna', x: 5.8, z: -54 },
  ];
  for (const def of defs) {
    const car = buildCar({ kind: def.kind, color: def.color });
    car.position.set(def.x, 0, def.z);
    car.rotation.y = def.x > 0 ? 0 : Math.PI;
    car.userData.steal = { name: def.name, kind: def.kind, color: def.color };
    parked.push(car);
  }
  return parked;
}

/**
 * Arcade driving: accelerate/brake/steer/drift with a speed cap that grows with
 * the engine tune. Returns the new speed in m/s. `hero` is { x, z, heading, speed }.
 */
export function driveHero(hero, input, dt, state) {
  const tune = 1 + (state.vehicle.tune - 1) * 0.06;
  const maxSpeed = 38 * tune;
  const accel = 15 * (input.nitro && state.vehicle.nitro > 0 ? 1.8 : 1);
  if (input.fwd > 0) hero.speed += accel * dt;
  else if (input.fwd < 0) hero.speed -= 10 * dt;
  else hero.speed -= Math.sign(hero.speed) * 6 * dt;
  if (input.brake) hero.speed -= Math.sign(hero.speed) * 26 * dt;
  hero.speed = Math.max(-8, Math.min(maxSpeed * (input.nitro ? 1.25 : 1), hero.speed));
  if (Math.abs(hero.speed) < 0.05) hero.speed = 0;
  // Steering answers more at speed, less at a crawl.
  const steerRate = 1.9 * Math.min(1, Math.abs(hero.speed) / 12);
  hero.heading += input.steer * steerRate * dt * Math.sign(hero.speed || 1);
  hero.x += Math.sin(hero.heading) * hero.speed * dt;
  hero.z -= Math.cos(hero.heading) * hero.speed * dt;
  // Stay on the boulevard (soft wall): the road is x in [-7, 7].
  if (hero.x < -6.4) { hero.x = -6.4; hero.speed *= 0.98; }
  if (hero.x > 6.4) { hero.x = 6.4; hero.speed *= 0.98; }
  return hero.speed;
}

/** Flash every police light bar; called from the frame loop. */
export function updatePoliceLights(fleet, dt) {
  for (const car of fleet) updateLightBar(car.userData.inner, dt);
}
