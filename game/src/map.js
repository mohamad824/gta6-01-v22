// One job: the full map overlay — five distinctly coloured districts with street
// grids and labels, mission markers, the sea band, SUNSET BLVD (label kept inside
// the panel, never clipped), a legend, and the mission list data for the DOM side.
import { DISTRICTS, MISSIONS } from './config.js';

// District rectangles in map space (canvas 1000 x 620). Colours are the district
// tokens from config.js; hues stay >15° apart so they read as one city, five parts.
const LAYOUT = [
  { id: 'north', x: 130, y: 20, w: 400, h: 210 },
  { id: 'hills', x: 550, y: 20, w: 420, h: 210 },
  { id: 'old', x: 130, y: 250, w: 400, h: 180 },
  { id: 'downtown', x: 550, y: 250, w: 420, h: 180 },
  { id: 'marina', x: 130, y: 450, w: 840, h: 110 },
];

const MARKERS = [
  { n: 1, x: 300, y: 120 }, { n: 2, x: 700, y: 110 }, { n: 3, x: 480, y: 330 },
  { n: 4, x: 250, y: 500 }, { n: 5, x: 620, y: 300 }, { n: 6, x: 850, y: 400 },
  { n: 7, x: 420, y: 180 }, { n: 8, x: 760, y: 500 },
];

export function drawMap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  // Fully opaque dark overlay — nothing from the game shows through.
  ctx.fillStyle = '#0d0f12';
  ctx.fillRect(0, 0, W, H);

  // The sea band on the left.
  const sea = ctx.createLinearGradient(0, 0, 130, 0);
  sea.addColorStop(0, '#1d4a55');
  sea.addColorStop(1, '#2e7f8a');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, 130, H);
  ctx.save();
  ctx.translate(24, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#bfe8ec';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('T H E   S E A', 0, 0);
  ctx.restore();
  // Beach strip.
  ctx.fillStyle = '#d9b380';
  ctx.fillRect(130, 0, 14, H);

  // Districts: colour block, street grid, label.
  for (const d of LAYOUT) {
    const def = DISTRICTS.find((x) => x.id === d.id);
    ctx.fillStyle = def.color;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    // Street grid inside the district.
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    for (let gx = d.x + 34; gx < d.x + d.w; gx += 34) {
      ctx.beginPath();
      ctx.moveTo(gx, d.y);
      ctx.lineTo(gx, d.y + d.h);
      ctx.stroke();
    }
    for (let gy = d.y + 30; gy < d.y + d.h; gy += 30) {
      ctx.beginPath();
      ctx.moveTo(d.x, gy);
      ctx.lineTo(d.x + d.w, gy);
      ctx.stroke();
    }
    // Label: name + subtitle, dark text on the district colour.
    ctx.fillStyle = def.text;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(def.name, d.x + 14, d.y + 36);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(def.sub, d.x + 14, d.y + 60);
  }

  // SUNSET BLVD: a yellow line down the middle with its label INSIDE the panel,
  // padded from the top edge (v21's label was clipped at the district edge).
  ctx.strokeStyle = '#e8b820';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(540, 20);
  ctx.lineTo(540, 560);
  ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(486, 26, 108, 26);
  ctx.fillStyle = '#e8b820';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUNSET BLVD', 540, 44);

  // Mission markers: green done, yellow active, grey locked.
  for (const m of MARKERS) {
    const status = m.n - 1 < state.missionIndex ? 'done' : m.n - 1 === state.missionIndex ? 'active' : 'locked';
    ctx.fillStyle = status === 'done' ? '#3aa84a' : status === 'active' ? '#e8b820' : '#6a6a6a';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0d0f12';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0d0f12';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(m.n), m.x, m.y + 5);
  }
  // Player marker at the chase (on Sunset Boulevard, mid-map).
  ctx.fillStyle = '#ff5a1f';
  ctx.beginPath();
  ctx.arc(540, 380, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Legend along the bottom.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(130, 576, 840, 34);
  let lx = 146;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, sans-serif';
  for (const def of DISTRICTS) {
    ctx.fillStyle = def.color;
    ctx.fillRect(lx, 586, 14, 14);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText(def.name, lx + 20, 598);
    lx += 20 + def.name.length * 8 + 18;
  }
  ctx.fillStyle = '#e8b820';
  ctx.fillText('● ACTIVE', lx + 6, 598);
}

/** Mission rows for the DOM side of the map panel (short, one line each). */
export function mapMissionRows(state) {
  return MISSIONS.map((m, i) => ({
    ch: m.ch,
    title: m.title,
    desc: m.desc,
    reward: m.reward,
    status: i < state.missionIndex ? 'DONE' : i === state.missionIndex ? 'ACTIVE' : 'LOCKED',
  }));
}
