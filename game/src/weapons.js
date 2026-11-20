// One job: weapons and combat — switching (keys 1–5), firing with ammo spend,
// fire-rate cooldowns, and police return fire that chips armour then health.
import { WEAPONS } from './config.js';

export function currentWeapon(state) {
  return state.weapons[state.weaponIndex];
}

export function weaponDef(state) {
  return WEAPONS[state.weaponIndex];
}

/** Switch to a weapon slot (0..4). Returns the new weapon or null. */
export function switchWeapon(state, index) {
  if (index < 0 || index >= state.weapons.length) return null;
  state.weaponIndex = index;
  return currentWeapon(state);
}

/**
 * Fire once. Returns { fired, ammo } — ammo only decreases on a real shot, and
 * the fire-rate cooldown is enforced by the caller passing `now` seconds.
 */
export function shoot(state, now, lastShot) {
  const def = weaponDef(state);
  const weapon = currentWeapon(state);
  if (weapon.id === 'fists') return { fired: false, ammo: Infinity, reason: 'fists' };
  if (weapon.ammo <= 0) return { fired: false, ammo: 0, reason: 'empty' };
  if (now - lastShot < def.rate) return { fired: false, ammo: weapon.ammo, reason: 'cooldown' };
  weapon.ammo -= 1;
  return { fired: true, ammo: weapon.ammo, damage: def.damage };
}

/** Top up every magazine (the shop's AMMO, ALL GUNS item). */
export function refillAmmo(state) {
  for (let i = 0; i < state.weapons.length; i += 1) {
    const def = WEAPONS[i];
    if (Number.isFinite(def.ammo)) state.weapons[i].ammo = def.ammo;
  }
}

/**
 * Police return fire: when wanted is 3+ and a cruiser is close, a shot lands every
 * so often — armour absorbs first, then health. Returns damage dealt (0 if none).
 */
export function policeReturnFire(state, dt, nearestDist, rng) {
  if (state.wanted < 3 || nearestDist > 14) return 0;
  const chance = dt * 0.25 * (state.wanted - 2);
  if (rng() > chance) return 0;
  const dmg = 3 + Math.floor(rng() * 4);
  if (state.armour > 0) {
    const absorbed = Math.min(state.armour, dmg);
    state.armour -= absorbed;
    const rest = dmg - absorbed;
    state.health = Math.max(0, state.health - rest);
  } else {
    state.health = Math.max(0, state.health - dmg);
  }
  return dmg;
}
