// Boot and the one loop: input is drained EVERY frame in EVERY mode (title, play,
// paused, map, garage) — that is the resume fix: a pause action queued while
// paused is always consumed, so P and the resume button can always resume.
// The world advances in fixed 1/60 s steps while playing; the renderer paints
// what is there. ?shot=chase|onfoot|map|garage (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import * as THREE from '../vendor/three/three.module.min.js';
import { STEP, SHOP_GEAR, SHOP_UPGRADES } from './config.js';
import { createRandom } from './random.js';
import { createWorld, stepWorld, setCameraPreset, applyEnvironment, nearestParked } from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_MAP, ACTION_GARAGE, createInput,
} from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import {
  buildRoster, buildWeaponSlots, renderHUD, renderMapOverlay, renderMissionPassed,
  setPrompt, showOverlay,
} from './hud.js';
import { drawDelgadoPortrait, stagedDispatchLine } from './dispatch.js';
import { nextStation } from './radio.js';
import { buyItem } from './garage.js';
import { loadState, applySave, saveState, createState } from './state.js';
import { audio } from './audio.js';
import { updateEffects } from './effects.js';
import { setShotMode } from './motion.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);
const world = createWorld(rng, seed);
const renderer = createRenderer(canvas);
applyEnvironment(world, renderer.renderer, rng);

function announce(message) {
  status.textContent = message;
}

function setMode(mode) {
  world.mode = mode;
  showOverlay('overlay-title', mode === 'title');
  showOverlay('overlay-pause', mode === 'paused');
  showOverlay('overlay-map', mode === 'map');
  showOverlay('overlay-garage', mode === 'garage');
  document.getElementById('hud').style.display = (mode === 'play' || mode === 'paused' || mode === 'title') ? 'block' : 'none';
}

function startGame(fresh) {
  if (fresh) {
    Object.assign(world.state, createState());
    world.hero.x = 0;
    world.hero.z = 0;
    world.hero.heading = 0;
    world.hero.speed = 0;
    world.hero.onFoot = false;
    world.hero.mesh.visible = true;
    world.hero.leo.visible = false;
  }
  audio.unlock();
  audio.siren(true);
  setMode('play');
  announce('Playing. CH. 4 Low Tide — run the coast.');
}

function pauseGame() {
  saveState(world.state);
  audio.siren(false);
  setMode('paused');
  announce('Paused. Press P or click Resume.');
}

function resumeGame() {
  audio.unlock();
  audio.siren(true);
  setMode('play');
  announce('Playing.');
}

function openMap() {
  renderMapOverlay(world);
  setMode('map');
  announce('Map open.');
}

function closeMap() {
  setMode('play');
  announce('Playing.');
}

function openGarage() {
  buildShop();
  setMode('garage');
  announce('Garage open.');
}

function leaveGarage() {
  saveState(world.state);
  setMode('play');
  announce('Playing.');
}

/** Build the shop rows (upgrades + gear) with live buy handlers. */
function buildShop() {
  const state = world.state;
  const fill = (containerId, items) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.dataset.id = item.id;
      const owned = item.owned;
      row.innerHTML = `<span class="shop-icon">${item.icon}</span>` +
        `<span class="shop-name">${item.name}</span>` +
        `<span class="shop-price">${owned ? '✓ OWNED' : '$' + item.price.toLocaleString('en-US')}</span>` +
        `<button class="shop-buy" id="buy-${item.id}" ${owned ? 'disabled' : ''}>${owned ? 'OWNED' : 'BUY'}</button>`;
      row.addEventListener('click', () => {
        document.getElementById('garage-desc').textContent = `${item.name} — ${item.desc}`;
        document.querySelectorAll('.shop-row').forEach((r) => r.classList.remove('selected'));
        row.classList.add('selected');
      });
      const btn = row.querySelector('.shop-buy');
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const res = buyItem(state, item.id);
        if (res.ok) {
          audio.click();
          buildShop();
          renderHUD(world);
          saveState(state);
        } else {
          document.getElementById('garage-desc').textContent = `${item.name} — ${res.reason}.`;
        }
      });
      container.appendChild(row);
    }
  };
  fill('garage-shop-upgrades', SHOP_UPGRADES);
  fill('garage-shop-gear', SHOP_GEAR);
  const cash = document.getElementById('garage-cash');
  if (cash) cash.textContent = `$${state.cash.toLocaleString('en-US')}`;
  const cardName = document.getElementById('garage-car-name');
  if (cardName) cardName.textContent = state.vehicle.name.toUpperCase();
  const cond = document.getElementById('garage-condition-fill');
  if (cond) cond.style.width = `${state.vehicle.condition}%`;
  const condText = document.getElementById('garage-condition-text');
  if (condText) condText.textContent = `CONDITION ${state.vehicle.condition}%`;
  const tags = document.getElementById('garage-tags');
  if (tags) {
    tags.innerHTML = `<span>✓ TUNE ${state.vehicle.tune}</span><span>✓ PLATING</span><span>✓ NITRO</span>`;
  }
  renderMissionPassed({
    title: 'LOW TIDE', subtitle: 'MISSION PASSED', reward: 3600, respect: 140, grade: 'S',
    stats: ['TIME 04:12', 'DAMAGE 12%', 'CASH $24,680 → $28,280'],
  });
}

function runShot(name) {
  setShotMode(true);
  const { scene, camera } = stageShot(name, world, buildShop);
  let painted = 0;
  function paint() {
    renderer.draw(scene, camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  let hudTimer = 0;

  // Overlay buttons.
  document.getElementById('btn-start').addEventListener('click', () => startGame(true));
  document.getElementById('btn-continue').addEventListener('click', () => startGame(false));
  document.getElementById('btn-resume').addEventListener('click', () => resumeGame());
  document.getElementById('btn-quit-title').addEventListener('click', () => {
    saveState(world.state);
    setMode('title');
  });
  document.getElementById('btn-leave-garage').addEventListener('click', () => leaveGarage());
  document.getElementById('map-close').addEventListener('click', () => closeMap());
  document.getElementById('radio-line').addEventListener('click', () => {
    nextStation(world.state);
    renderHUD(world);
  });

  // The input queue is drained ONCE per frame, here. Mode-level actions are
  // handled by handleActions(); gameplay actions (E, F, weapon keys) are passed
  // to exactly ONE simulation sub-step, so a press can never double-fire.
  function handleActions(actions) {
    if (!actions) return;
    if (actions & ACTION_PAUSE) {
      if (world.mode === 'play') pauseGame();
      else if (world.mode === 'paused') resumeGame();
      else if (world.mode === 'map') closeMap();
      else if (world.mode === 'garage') leaveGarage();
      return;
    }
    if (actions & ACTION_MAP) {
      if (world.mode === 'play') openMap();
      else if (world.mode === 'map') closeMap();
      return;
    }
    if (actions & ACTION_GARAGE) {
      if (world.mode === 'play') openGarage();
      else if (world.mode === 'garage') leaveGarage();
      return;
    }
    if (actions & ACTION_CONFIRM) {
      if (world.mode === 'title') startGame(true);
      else if (world.mode === 'paused') resumeGame();
    }
  }

  const camBase = new THREE.Vector3();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (world.mode === 'play') {
      accumulator += dt;
      let pending = actions;
      while (accumulator >= STEP) {
        const events = stepWorld(world, input, pending, STEP);
        pending = 0;
        if (events.missionComplete) {
          renderMissionPassed(events.missionComplete);
          announce(`Mission passed: ${events.missionComplete.title}.`);
        }
        accumulator -= STEP;
      }
      // On-foot steal prompt.
      if (world.hero.onFoot) {
        setPrompt(nearestParked(world) ? 'E — STEAL CAR' : null);
      } else {
        setPrompt(null);
      }
    } else {
      accumulator = 0;
    }
    hudTimer += dt;
    if (hudTimer > 0.15) {
      hudTimer = 0;
      if (world.mode === 'play' || world.mode === 'paused') renderHUD(world);
    }
    camBase.copy(world.camera.position);
    updateEffects(dt, document.getElementById('vignette'), world.camera, camBase);
    const scene = world.mode === 'garage' ? world.garageScene : world.scene;
    const camera = world.mode === 'garage' ? world.garageCamera : world.camera;
    renderer.draw(scene, camera);
  }

  // Leaving the tab pauses a running game rather than letting the chase run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.mode === 'play') pauseGame();
  });

  setCameraPreset(world, 'title');
  setMode('title');
  const saved = loadState();
  const continueBtn = document.getElementById('btn-continue');
  if (saved) {
    applySave(world.state, saved);
    continueBtn.style.display = 'inline-block';
    announce('Solano Bay. Continue your save or start fresh.');
  } else {
    continueBtn.style.display = 'none';
    announce('Solano Bay. Press Space or click to start.');
  }
  requestAnimationFrame(frame);
}

// Static HUD pieces, built once.
buildRoster();
buildWeaponSlots();
drawDelgadoPortrait(document.getElementById('dispatch-portrait'));
document.getElementById('dispatch-line').textContent = stagedDispatchLine();
document.getElementById('mechanic-quote').textContent = 'DANTE ROOK · mechanic · "If it rolls, I can rebuild it."';

// Probe API for the playtest (and the coordinator): live state, never a copy.
window.__world = {
  get mode() { return world.mode; },
  get state() { return world.state; },
  get hero() { return world.hero; },
  get police() { return world.police; },
  get units() { return world.units; },
  get world() { return world; },
  save() { return saveState(world.state); },
  stats() { return renderer.stats(); },
  renderer,
};

if (shot) runShot(shot);
else runGame();
window.__booted = true;
