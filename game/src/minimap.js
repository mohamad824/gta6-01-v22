// One job: the circular minimap — real streets, the sea band, the player, police
// and mission markers, drawn on a small canvas and refreshed a few times a second.
import { DISTRICTS } from './config.js';

const STREETS = [
  { x1: 0.15, y1: 0.05, x2: 0.15, y2: 0.95 },
  { x1: 0.38, y1: 0.05, x2: 0.38, y2: 0.95 },
  { x1: 0.62, y1: 0.05, x2: 0.62, y2: 0.95 },
  { x1: 0.85, y1: 0.05, x2: 0.85, y2: 0.95 },
  { x1: 0.05, y1: 0.2, x2: 0.95, y2: 0.2 },
  { x1: 0.05, y1: 0.5, x2: 0.95, y2: 0.5 },
  { x1: 0.05, y1: 0.78, x2: 0.95, y2: 0.78 },
];

/** World x/z in [-70, 70] maps to minimap u/v in [0, 1]. */
function toMap(x, z) {
  return { u: (x + 70) / 140, v: (z + 70) / 140 };
}

export function drawMinimap(canvas, hero, police, missionPos) {
  const ctx = canvas.getContext('2d');
  const S = canvas.width;
  const R = S / 2;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R - 2, 0, Math.PI * 2);
  ctx.clip();
  // Land + sea.
  ctx.fillStyle = '#141a20';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#2e7f8a';
  ctx.fillRect(0, 0, S * 0.16, S);
  // District tints (faint) + streets.
  ctx.fillStyle = 'rgba(217,179,128,0.25)';
  ctx.fillRect(S * 0.16, 0, S * 0.3, S * 0.4);
  ctx.fillStyle = 'rgba(63,143,138,0.3)';
  ctx.fillRect(S * 0.6, S * 0.6, S * 0.4, S * 0.4);
  ctx.strokeStyle = 'rgba(232,232,232,0.35)';
  ctx.lineWidth = 1.5;
  for (const st of STREETS) {
    ctx.beginPath();
    ctx.moveTo(st.x1 * S, st.y1 * S);
    ctx.lineTo(st.x2 * S, st.y2 * S);
    ctx.stroke();
  }
  // Sunset Boulevard (the yellow line).
  ctx.strokeStyle = '#e8b820';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(S * 0.5, 0);
  ctx.lineTo(S * 0.5, S);
  ctx.stroke();
  // Mission marker (yellow diamond).
  if (missionPos) {
    const m = toMap(missionPos.x, missionPos.z);
    ctx.fillStyle = '#e8b820';
    ctx.save();
    ctx.translate(m.u * S, m.v * S);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }
  // Police (blue dots).
  ctx.fillStyle = '#4a8aff';
  for (const p of police) {
    const m = toMap(p.car.position.x, p.car.position.z);
    ctx.beginPath();
    ctx.arc(m.u * S, m.v * S, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player (orange dot, white ring).
  const h = toMap(hero.x, hero.z);
  ctx.fillStyle = '#ff5a1f';
  ctx.beginPath();
  ctx.arc(h.u * S, h.v * S, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Ring around the minimap.
  ctx.strokeStyle = 'rgba(232,232,232,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(R, R, R - 2, 0, Math.PI * 2);
  ctx.stroke();
}
