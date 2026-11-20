// One job: the HUD — every DOM panel (mission, stats, roster, dispatch, vehicle,
// weapons, prompt, overlays) updated live from the state and the world.
import { MISSIONS, ROSTER, STATIONS } from './config.js';
import { drawMinimap } from './minimap.js';
import { drawMap, mapMissionRows } from './map.js';
import { currentMission } from './missions.js';
import { cashTick, rosterStagger } from './motion.js';

export function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function money(n) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function el(id) {
  return document.getElementById(id);
}

function setBar(id, fraction) {
  const node = el(id);
  if (node) node.style.width = `${Math.max(0, Math.min(100, fraction * 100))}%`;
}

/** Build the police roster rows once (values are re-rendered per frame). */
export function buildRoster() {
  const rows = el('roster-rows');
  if (!rows) return;
  rows.innerHTML = ROSTER.map((r) => (
    `<div class="roster-row"><span class="roster-unit">${r.unit}</span>` +
    `<span class="roster-verb">${r.verb}</span>` +
    `<span class="roster-dist">${r.dist} m</span></div>`
  )).join('');
  rosterStagger(rows);
}

/** Build the five weapon slots once; ammo is re-rendered per frame. */
export function buildWeaponSlots() {
  const slots = el('weapon-slots');
  if (!slots) return;
  slots.innerHTML = '';
  for (let i = 0; i < 5; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'weapon-slot';
    slot.id = `weapon-slot-${i}`;
    slot.innerHTML = `<span class="weapon-key">${i + 1}</span><span class="weapon-name"></span><span class="weapon-ammo"></span>`;
    slots.appendChild(slot);
  }
}

/** Render all live HUD values from the state and the world snapshot. */
export function renderHUD(world) {
  const state = world.state;
  const mission = currentMission(state);
  const missionPanel = el('mission-panel');
  if (missionPanel) {
    el('mission-ch').textContent = `${mission.ch} · ${mission.title}`;
    el('mission-title').textContent = mission.title === 'LOW TIDE' ? 'RUN THE COAST' : mission.title;
    el('mission-desc').textContent = mission.desc === 'Lose the heat down the boulevard'
      ? 'Lose the heat down the boulevard' : mission.desc;
    el('mission-stage').textContent = `STAGE ${Math.max(1, Math.ceil(state.missionProgress * mission.stages))}/${mission.stages}${state.wanted >= 4 ? ' · IN SIGHT' : ''}`;
    const fill = el('mission-fill');
    if (fill) fill.style.width = `${Math.round(state.missionProgress * 100)}%`;
    const chip = el('mission-chip');
    if (chip) chip.style.display = state.missionProgress >= 1 ? 'inline-block' : 'none';
  }
  const stars = el('stars');
  if (stars) {
    stars.textContent = '★★★★★'.slice(0, Math.max(0, state.wanted)) + '☆☆☆☆☆'.slice(0, Math.max(0, 5 - state.wanted));
    stars.classList.toggle('hot', state.wanted >= 4);
  }
  const cash = el('cash');
  if (cash) cashTick(cash, world.lastCash ?? state.cash, state.cash);
  world.lastCash = state.cash;
  const dayTime = el('day-time');
  if (dayTime) dayTime.textContent = `DAY ${state.day} ${formatTime(state.minutes)}`;
  setBar('health-fill', state.health / 100);
  setBar('armour-fill', state.armour / 100);
  setBar('respect-fill', state.respect / 1000);
  setBar('grip-fill', state.grip / 100);
  setBar('condition-fill', state.vehicle.condition / 100);
  const speed = el('speed');
  if (speed) speed.textContent = String(Math.round(Math.abs(world.hero.speed || 0) * 3.6));
  const vname = el('vehicle-name');
  if (vname) {
    vname.textContent = world.hero.onFoot
      ? 'ON FOOT'
      : `${state.vehicle.name.toUpperCase()} · ${state.vehicle.kind.toUpperCase()} · TUNE ${state.vehicle.tune}`;
  }
  const station = STATIONS[state.station];
  const radio = el('radio-line');
  if (radio) radio.textContent = `${station.name} · ${station.artist} — ${station.track}`;
  for (let i = 0; i < 5; i += 1) {
    const slot = el(`weapon-slot-${i}`);
    if (!slot) continue;
    const w = state.weapons[i];
    slot.querySelector('.weapon-name').textContent = w.name;
    slot.querySelector('.weapon-ammo').textContent = Number.isFinite(w.ammo) ? String(w.ammo) : '∞';
    slot.classList.toggle('active', i === state.weaponIndex);
  }
  const minimap = el('minimap');
  if (minimap && world.police) {
    drawMinimap(minimap, world.hero, world.police, { x: 0, z: -40 });
  }
}

/** Show or hide the on-foot "E — STEAL CAR" prompt. */
export function setPrompt(text) {
  const prompt = el('prompt');
  if (!prompt) return;
  if (text) {
    prompt.textContent = text;
    prompt.style.display = 'block';
  } else {
    prompt.style.display = 'none';
  }
}

/** Show/hide a full-screen overlay by id. */
export function showOverlay(id, show) {
  const node = el(id);
  if (node) node.style.display = show ? 'flex' : 'none';
}

/** Fill the map overlay (canvas + mission list + progression line). */
export function renderMapOverlay(world) {
  const canvas = el('map-canvas');
  if (canvas) drawMap(canvas, world.state);
  const root = el('map-root');
  if (root) {
    // One line per row: chapter + title + reward + status (no description — the
    // 320px column cannot hold five elements without wrapping, v21's flaw).
    root.innerHTML = mapMissionRows(world.state).map((m) => (
      `<div class="map-row ${m.status.toLowerCase()}"><span class="map-ch">${m.ch}</span>` +
      `<span class="map-title">${m.title}</span>` +
      `<span class="map-reward">$${m.reward.toLocaleString('en-US')}</span>` +
      `<span class="map-status">${m.status}</span></div>`
    )).join('');
  }
  const prog = el('map-progression');
  if (prog) {
    const s = world.state;
    prog.textContent = `CASH ${money(s.cash)} · RESPECT ${s.respect} · WANTED ${'★'.repeat(Math.max(0, s.wanted)) || '—'} · HEALTH ${s.health} · ARMOUR ${s.armour} · CONDITION ${s.vehicle.condition}% · ${MISSIONS[s.missionIndex].ch}`;
  }
}

/** Fill the mission-passed panel in the garage overlay. */
export function renderMissionPassed(data) {
  const panel = el('mission-passed');
  if (!panel || !data) return;
  panel.style.display = 'block';
  el('mp-title').textContent = `${data.subtitle} — ${data.title}`;
  el('mp-reward').textContent = `+$${data.reward.toLocaleString('en-US')}`;
  el('mp-respect').textContent = `+${data.respect} RESPECT`;
  el('mp-grade').textContent = `GRADE ${data.grade}`;
  el('mp-stats').textContent = data.stats.join('   ·   ');
}
