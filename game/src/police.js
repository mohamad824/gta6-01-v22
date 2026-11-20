// One job: police AI — patrol cars, pursuit cars, tactical units, roadblocks.
// Each unit steers toward the hero, rams when close, and the roadblock units hold
// their line ahead of the chase. Spawn count follows the wanted level.
import { updateLightBar } from './carfactory.js';

const MODES = { PATROL: 'patrol', PURSUIT: 'pursuit', RAM: 'ram', ROADBLOCK: 'roadblock', BOX: 'box' };

export function createPoliceUnit(car, mode, verb) {
  return { car, mode, verb, speed: 0, ramCooldown: 0 };
}

/** Units active at a wanted level: 1 star patrols, 5 stars the full response. */
export function unitsForWanted(wanted) {
  return Math.min(6, 1 + wanted);
}

/** Steer one unit toward a target point (simple pursuit steering). */
function steerToward(unit, tx, tz, dt, maxSpeed) {
  const car = unit.car;
  const dx = tx - car.position.x;
  const dz = tz - car.position.z;
  const want = Math.atan2(dx, -dz);
  let diff = want - car.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.rotation.y += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
  unit.speed = Math.min(maxSpeed, unit.speed + 12 * dt);
  car.position.x += Math.sin(car.rotation.y) * unit.speed * dt;
  car.position.z -= Math.cos(car.rotation.y) * unit.speed * dt;
}

/**
 * Advance the pursuit one step. Returns events: { rammed, damage } when a unit
 * touches the hero (a ram: hero condition drops, camera shakes).
 */
export function updatePolice(units, hero, dt, state) {
  let rammed = false;
  let damage = 0;
  for (const unit of units) {
    if (unit.ramCooldown > 0) unit.ramCooldown -= dt;
    const car = unit.car;
    const dx = hero.x - car.position.x;
    const dz = hero.z - car.position.z;
    const dist = Math.hypot(dx, dz);
    if (unit.mode === MODES.ROADBLOCK) {
      // Hold the line ahead of the hero; inch forward to stay 12 m ahead.
      const targetZ = hero.z - 12;
      car.position.z += (targetZ - car.position.z) * Math.min(1, dt * 0.8);
      unit.speed = 0;
    } else if (unit.mode === MODES.BOX) {
      steerToward(unit, hero.x + 2.5, hero.z - 2, dt, 16);
    } else {
      // Pursuit / ram: chase the hero, ram on contact.
      steerToward(unit, hero.x, hero.z, dt, 24 + state.wanted * 1.5);
      if (dist < 2.3 && unit.ramCooldown <= 0) {
        rammed = true;
        damage += 4;
        unit.ramCooldown = 1.2;
        // Bounce the unit off so it does not sit inside the hero car.
        car.position.x -= Math.sin(car.rotation.y) * 1.2;
        car.position.z += Math.cos(car.rotation.y) * 1.2;
      }
    }
    updateLightBar(car.userData.inner, dt);
  }
  return { rammed, damage };
}
