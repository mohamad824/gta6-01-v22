// One job: the game state and its save/load. The save persists the WHOLE vehicle
// object — including condition — so a $250 REPAIR is still 100% after a reload.
import { SAVE_KEY, STAGED, WEAPONS } from './config.js';

export function createState() {
  return {
    cash: STAGED.cash,
    respect: STAGED.respect,
    day: STAGED.day,
    minutes: STAGED.minutes,
    health: STAGED.health,
    armour: STAGED.armour,
    wanted: STAGED.wanted,
    heat: STAGED.heat,
    grip: STAGED.grip,
    missionIndex: STAGED.missionIndex,
    missionProgress: STAGED.missionProgress,
    missionsDone: [true, true, true, false, false, false, false, false],
    vehicle: {
      name: 'Solstice GT',
      kind: 'sedan',
      tune: 3,
      armour: 2,
      nitro: 1,
      condition: STAGED.condition,
      color: 0xff5a1f,
    },
    garage: { engine: 3, armour: 2, nitro: 1 },
    weapons: WEAPONS.map((w) => ({ id: w.id, name: w.name, ammo: w.ammo })),
    weaponIndex: 2,
    station: 0,
    flares: 0,
    vest: false,
  };
}

export function serializeState(state) {
  return JSON.stringify(state);
}

export function saveState(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, serializeState(state));
    return true;
  } catch {
    return false;
  }
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.cash !== 'number' || !data.vehicle) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

/** Apply a loaded save onto a fresh state object (keeps the shape valid). */
export function applySave(state, data) {
  Object.assign(state, data);
  if (data.vehicle) state.vehicle = { ...createState().vehicle, ...data.vehicle };
  if (data.garage) state.garage = { ...createState().garage, ...data.garage };
  if (Array.isArray(data.weapons)) state.weapons = data.weapons;
  return state;
}
