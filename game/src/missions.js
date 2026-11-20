// One job: story missions — the list, the current mission's stage progress, and
// completing a mission (cash + respect, unlock the next, mission-passed data).
import { MISSIONS } from './config.js';

export function missionList(state) {
  return MISSIONS.map((m, i) => ({
    ...m,
    index: i,
    status: i < state.missionIndex ? 'DONE' : i === state.missionIndex ? 'ACTIVE' : 'LOCKED',
  }));
}

export function currentMission(state) {
  return MISSIONS[state.missionIndex] || MISSIONS[MISSIONS.length - 1];
}

/** Advance the current mission's progress by `amount` (0..1). Returns true on completion. */
export function advanceMission(state, amount) {
  state.missionProgress = Math.min(1, state.missionProgress + amount);
  return state.missionProgress >= 1;
}

/**
 * Complete the current mission: pay cash + respect, mark it done, unlock the next.
 * Returns the mission-passed panel data (title, reward, respect, grade, stats).
 */
export function completeMission(state) {
  const mission = currentMission(state);
  const cashBefore = state.cash;
  state.cash += mission.reward;
  state.respect = Math.min(1000, state.respect + mission.respect);
  state.missionsDone[state.missionIndex] = true;
  const grade = state.health > 60 ? 'S' : state.health > 30 ? 'A' : 'B';
  const data = {
    title: mission.title,
    subtitle: 'MISSION PASSED',
    reward: mission.reward,
    respect: mission.respect,
    grade,
    stats: [
      `TIME 04:12`,
      `DAMAGE ${100 - state.vehicle.condition}%`,
      `CASH $${cashBefore.toLocaleString('en-US')} → $${state.cash.toLocaleString('en-US')}`,
    ],
  };
  if (state.missionIndex < MISSIONS.length - 1) {
    state.missionIndex += 1;
    state.missionProgress = 0;
  }
  return data;
}

/** The staged mission-passed panel for the garage frame (CH. 4, LOW TIDE). */
export function stagedMissionPassed() {
  return {
    title: 'LOW TIDE',
    subtitle: 'MISSION PASSED',
    reward: 3600,
    respect: 140,
    grade: 'S',
    stats: ['TIME 04:12', 'DAMAGE 12%', 'CASH $24,680 → $28,280'],
  };
}
