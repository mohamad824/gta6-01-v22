// One job: the radio — stations, the track line the HUD shows, and switching.
import { STATIONS } from './config.js';

export function currentStation(state) {
  return STATIONS[state.station % STATIONS.length];
}

/** The radio track line: station + artist — track name. */
export function trackLine(state) {
  const s = currentStation(state);
  return `${s.name} · ${s.artist} — ${s.track}`;
}

/** Switch to the next station (clicking the radio line). Returns the new line. */
export function nextStation(state) {
  state.station = (state.station + 1) % STATIONS.length;
  return trackLine(state);
}
