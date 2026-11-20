// One job: every constant the game shares — prices, weapons, missions, districts,
// radio, dispatch lines and the staged HUD values. No logic lives here.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solano-bay-save-v22';
export const SEED_DEFAULT = 1;

// The staged chase frame's HUD values (the frame Zul judged good).
export const STAGED = {
  cash: 24680,
  respect: 1000,
  day: 9,
  minutes: 18 * 60 + 40,
  health: 78,
  armour: 64,
  wanted: 5,
  heat: 92,
  grip: 86,
  speedKmh: 73,
  missionIndex: 3,
  missionProgress: 0.92,
  condition: 88,
};

export const WEAPONS = [
  { id: 'fists', name: 'FISTS', ammo: Infinity, damage: 8, rate: 0.35 },
  { id: 'p9', name: 'P9', ammo: 12, damage: 22, rate: 0.28 },
  { id: 'pico9', name: 'PICO 9', ammo: 16, damage: 16, rate: 0.09 },
  { id: 'ar7', name: 'AR-7', ammo: 30, damage: 30, rate: 0.12 },
  { id: 'breacher', name: 'BREACHER', ammo: 6, damage: 65, rate: 0.9 },
];

export const MISSIONS = [
  { ch: 'CH. 1', title: 'HOT START', desc: 'Steal a clean ride', reward: 1200, respect: 60, stages: 3 },
  { ch: 'CH. 2', title: 'FIRST SCORE', desc: 'Hit the corner store', reward: 2400, respect: 90, stages: 4 },
  { ch: 'CH. 3', title: 'COURIER RUN', desc: 'Deliver the packages', reward: 1800, respect: 80, stages: 5 },
  { ch: 'CH. 4', title: 'LOW TIDE', desc: 'Lose the heat down the boulevard', reward: 3600, respect: 140, stages: 7 },
  { ch: 'CH. 5', title: 'BANK JOB', desc: 'Empty the vault, vanish', reward: 9800, respect: 220, stages: 6 },
  { ch: 'CH. 6', title: 'SILENT PARTNER', desc: 'Remove the two witnesses', reward: 6400, respect: 180, stages: 5 },
  { ch: 'CH. 7', title: 'LAST STAND', desc: 'Hold the safe house', reward: 7200, respect: 200, stages: 6 },
  { ch: 'CH. 8', title: 'GOLDEN HOUR', desc: 'Cross the city before dusk', reward: 12000, respect: 300, stages: 8 },
];

export const DISTRICTS = [
  { id: 'north', name: 'NORTH END', sub: 'Beachfront', color: '#d9b380', text: '#2b2118' },
  { id: 'hills', name: 'HILLSIDE', sub: 'Residential', color: '#8a9a5b', text: '#1d2413' },
  { id: 'old', name: 'OLD TOWN', sub: 'Historic', color: '#7d8a99', text: '#141a20' },
  { id: 'downtown', name: 'DOWNTOWN', sub: 'Towers', color: '#e0a458', text: '#2b1d0c' },
  { id: 'marina', name: 'MARINA', sub: 'Harbour', color: '#3f8f8a', text: '#0d2220' },
];

export const SHOP_UPGRADES = [
  { id: 'repair', name: 'FULL REPAIR', desc: 'Restore the car to 100% condition.', price: 250, icon: 'FIX' },
  { id: 'respray', name: 'RESPRAY', desc: 'Fresh paint. The heat forgets your car.', price: 100, icon: 'PAINT' },
  { id: 'tune', name: 'STAGE 2 TUNE', desc: '+12% top speed and sharper throttle.', price: 5000, icon: '+12%', owned: true },
  { id: 'armour', name: 'ARMOUR PLATING', desc: 'Half damage from crashes and bullets.', price: 1800, icon: 'PLATE', owned: true },
  { id: 'nitro', name: 'NITRO KIT', desc: 'SHIFT bursts. Burns fast, hits hard.', price: 3000, icon: 'N2O', owned: true },
];

export const SHOP_GEAR = [
  { id: 'cobra', name: 'COBRA SMG', desc: 'Fast, loud, hungry for ammo.', price: 2400, icon: 'SMG' },
  { id: 'longshot', name: 'LONGSHOT', desc: 'One round, one problem solved.', price: 6800, icon: 'RIFLE' },
  { id: 'flare', name: 'FLARE CHARGES X3', desc: 'Blind the roadblock, slip past.', price: 600, icon: 'x3' },
  { id: 'ammo', name: 'AMMO, ALL GUNS', desc: 'Top up every magazine you own.', price: 200, icon: 'AMMO' },
  { id: 'vest', name: 'KEVLAR VEST', desc: '+40 armour before the next job.', price: 350, icon: 'VEST' },
];

export const STATIONS = [
  { name: 'BAY FM 94.7', artist: 'Marina Reyes', track: 'Neon Coast' },
  { name: 'SOL 101.3', artist: 'The Breakers', track: 'Low Tide' },
  { name: 'PALM 88.1', artist: 'Duna Vale', track: 'Golden Static' },
];

export const ROSTER = [
  { unit: 'ADAM 12', verb: 'RAMMING', dist: 2 },
  { unit: 'BOY 7', verb: 'RAMMING', dist: 2 },
  { unit: 'KING 3', verb: 'ROADBLOCK', dist: 12 },
  { unit: 'LINCOLN 5', verb: 'ROADBLOCK', dist: 12 },
  { unit: 'TAC 2', verb: 'BOXING IN', dist: 12 },
  { unit: 'AIR 1', verb: 'PURSUIT', dist: 22 },
];

export const DISPATCH_LINES = [
  'All units, suspect is westbound on the boulevard. Air One has the light.',
  'Suspect vehicle is an orange sedan, last seen on Sunset Boulevard.',
  'Roadblock forming at the marina junction. Do not let him through.',
  'Air One, keep the beam on him. Ground units, close the gap.',
  'He is threading the roadblock. All units converge, now.',
];

// Sunset palette: dominant warm orange + one tension colour (teal sea / blue lights).
export const PALETTE = {
  skyTop: 0x7a2e12,
  skyMid: 0xff7a2a,
  skyLow: 0xffc46b,
  sun: 0xffd76a,
  sea: 0x2e7f8a,
  sand: 0xe0b878,
  road: 0x4a3a34,
  buildingWarm: 0xc47a4a,
  buildingCool: 0x8a6a5a,
  heroOrange: 0xff5a1f,
  policeWhite: 0xe8e4da,
};
