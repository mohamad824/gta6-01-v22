// One job: the wanted system — five stars driven by a 0–100 heat value. Crimes
// add heat, heat bleeds away when the player escapes, a respray clears it.
export function starsFromHeat(heat) {
  if (heat < 12) return 1;
  if (heat < 30) return 2;
  if (heat < 52) return 3;
  if (heat < 74) return 4;
  return 5;
}

/** Add heat for a crime; returns the new star level. */
export function addHeat(state, amount) {
  state.heat = Math.max(0, Math.min(100, state.heat + amount));
  state.wanted = starsFromHeat(state.heat);
  return state.wanted;
}

/**
 * Heat bleed: visible heat decays slowly, hidden heat (no police in sight)
 * decays fast. Called every step with the seconds elapsed.
 */
export function bleedHeat(state, dt, hidden) {
  const rate = hidden ? 6 : 1.2;
  state.heat = Math.max(0, state.heat - rate * dt);
  state.wanted = starsFromHeat(state.heat);
  return state.wanted;
}

/** A respray clears the wanted level entirely. */
export function clearWanted(state) {
  state.heat = 0;
  state.wanted = 0;
  return 0;
}

/** Crime heat values: stealing, shooting, speeding through a roadblock. */
export const CRIME_HEAT = { steal: 30, shoot: 12, ram: 8, speeding: 4 };
