// One job: HUD motion on Anime.js v4 (the motion engine). Named imports only;
// durations in milliseconds; ease names without the v3 prefix. CORRECTED WARNING:
// `utils.interpolate` does NOT exist in Anime.js v4.5.0 ESM — only utils.lerp,
// utils.mapRange and utils.clamp are used anywhere in this game.
// In shot mode every helper applies its final state instantly (determinism).
import { animate, createTimeline, stagger, utils } from '../vendor/anime.min.js';

let shotMode = false;
export function setShotMode(on) {
  shotMode = on;
}

function instant(el, props) {
  if (!el) return;
  Object.assign(el.style, props);
}

/** Mission banner slides in from the left with its progress bar filling. */
export function bannerIn(panel, bar, progress) {
  if (shotMode) {
    instant(panel, { opacity: '1', transform: 'translateX(0)' });
    if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
    return;
  }
  if (!panel) return;
  animate(panel, { x: [-24, 0], opacity: [0, 1], duration: 350, ease: 'outExpo' });
  if (bar) animate(bar, { width: `${Math.round(progress * 100)}%`, duration: 500, ease: 'outQuad' });
}

/** Wanted stars pulse on gain: scale pop, then settle. */
export function starPulse(starsEl) {
  if (shotMode || !starsEl) return;
  animate(starsEl, { scale: [1.35, 1], duration: 220, ease: 'outBack' });
}

/** Cash ticks from one value to another (utils.lerp, never interpolate). */
export function cashTick(el, from, to) {
  if (!el) return;
  if (shotMode || from === to) {
    el.textContent = `$${to.toLocaleString('en-US')}`;
    return;
  }
  const obj = { v: from };
  animate(obj, {
    v: to,
    duration: 450,
    ease: 'outQuad',
    onUpdate: () => {
      el.textContent = `$${Math.round(utils.lerp(from, to, (obj.v - from) / (to - from || 1))).toLocaleString('en-US')}`;
    },
  });
}

/** Police roster rows stagger in, total under ~500ms. */
export function rosterStagger(container) {
  if (shotMode || !container) return;
  const rows = container.querySelectorAll('.roster-row');
  if (!rows.length) return;
  animate(rows, { x: [16, 0], opacity: [0, 1], duration: 240, delay: stagger(45), ease: 'outQuad' });
}

/** A one-shot camera intro sweep: from wide to the chase framing. */
export function introSweep(camera, from, to, onDone) {
  if (shotMode) {
    camera.position.copy(to.position);
    camera.lookAt(to.lookAt);
    if (onDone) onDone();
    return;
  }
  const proxy = { t: 0 };
  createTimeline({ defaults: { duration: 900, ease: 'inOutExpo' } })
    .add(proxy, {
      t: 1,
      onUpdate: () => {
        camera.position.set(
          utils.lerp(from.position.x, to.position.x, proxy.t),
          utils.lerp(from.position.y, to.position.y, proxy.t),
          utils.lerp(from.position.z, to.position.z, proxy.t),
        );
        camera.lookAt(
          utils.lerp(from.lookAt.x, to.lookAt.x, proxy.t),
          utils.lerp(from.lookAt.y, to.lookAt.y, proxy.t),
          utils.lerp(from.lookAt.z, to.lookAt.z, proxy.t),
        );
      },
      onComplete: onDone,
    });
}

/** Map a speed (0..max) onto the speedometer needle angle with utils.mapRange. */
export function speedToNeedle(speed, max) {
  return utils.mapRange(speed, 0, max, -120, 120);
}
