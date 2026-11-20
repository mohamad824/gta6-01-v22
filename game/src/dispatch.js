// One job: police dispatch — the drawn portrait of Captain Rosa Delgado (an
// original character) and the rotating dispatch lines that react to the chase.
import { DISPATCH_LINES } from './config.js';

/** Draw Delgado's portrait on a 64×64 canvas: cap, dark bun, navy uniform, badge. */
export function drawDelgadoPortrait(canvas) {
  const ctx = canvas.getContext('2d');
  const S = canvas.width;
  // Background: deep navy.
  ctx.fillStyle = '#1c2a4a';
  ctx.fillRect(0, 0, S, S);
  // Shoulders / uniform.
  ctx.fillStyle = '#22345c';
  ctx.beginPath();
  ctx.moveTo(6, S);
  ctx.quadraticCurveTo(S / 2, S * 0.55, S - 6, S);
  ctx.closePath();
  ctx.fill();
  // Gold badge on the chest.
  ctx.fillStyle = '#e8b820';
  ctx.beginPath();
  ctx.arc(S * 0.68, S * 0.82, 4, 0, Math.PI * 2);
  ctx.fill();
  // Neck + face.
  ctx.fillStyle = '#c98e6a';
  ctx.fillRect(S * 0.44, S * 0.52, S * 0.12, S * 0.12);
  ctx.beginPath();
  ctx.arc(S / 2, S * 0.36, S * 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Hair: dark bun behind the head.
  ctx.fillStyle = '#1a1210';
  ctx.beginPath();
  ctx.arc(S / 2, S * 0.16, S * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S * 0.3, S * 0.3, S * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S * 0.7, S * 0.3, S * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // SBPD cap.
  ctx.fillStyle = '#14203a';
  ctx.beginPath();
  ctx.arc(S / 2, S * 0.26, S * 0.21, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(S * 0.29, S * 0.26, S * 0.42, S * 0.05);
  ctx.fillStyle = '#e8b820';
  ctx.beginPath();
  ctx.arc(S / 2, S * 0.2, 3, 0, Math.PI * 2);
  ctx.fill();
  // Eyes + mouth (simple, readable at 64px).
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(S * 0.4, S * 0.34, 3, 2);
  ctx.fillRect(S * 0.57, S * 0.34, 3, 2);
  ctx.strokeStyle = '#7a4a3a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(S * 0.44, S * 0.46);
  ctx.lineTo(S * 0.56, S * 0.46);
  ctx.stroke();
}

let lineIndex = 0;

/** The next dispatch line, rotating through the list. */
export function nextDispatchLine() {
  const line = DISPATCH_LINES[lineIndex % DISPATCH_LINES.length];
  lineIndex += 1;
  return line;
}

/** The staged dispatch line for the chase frame. */
export function stagedDispatchLine() {
  return DISPATCH_LINES[0];
}
