// One job: screen-space effects — damage flash, wanted-heat vignette, muzzle flash
// and camera shake. All numeric ramps go through utils.lerp / utils.mapRange.
import { utils } from '../vendor/anime.min.js';

let heat = 0; // 0..1 wanted heat for the vignette
let shakeTime = 0;
let shakeAmp = 0;

/** Set the wanted-heat vignette strength (0..1). */
export function setHeat(value) {
  heat = Math.max(0, Math.min(1, value));
}

/** Trigger a short camera shake (e.g. a ram or a shot). */
export function shake(amount, seconds) {
  shakeAmp = Math.max(shakeAmp, amount);
  shakeTime = Math.max(shakeTime, seconds);
}

/** Per-frame update: vignette opacity + shake offset (reused vector, no allocation). */
export function updateEffects(dt, vignetteEl, camera, basePos) {
  if (vignetteEl) {
    const target = utils.lerp(0.0, 0.55, heat);
    vignetteEl.style.opacity = String(target);
  }
  if (shakeTime > 0) {
    shakeTime -= dt;
    const s = shakeAmp * (shakeTime / 0.2);
    camera.position.x = basePos.x + (Math.random() - 0.5) * s;
    camera.position.y = basePos.y + (Math.random() - 0.5) * s;
    if (shakeTime <= 0) {
      shakeAmp = 0;
      camera.position.copy(basePos);
    }
  }
}

/** Flash the damage overlay once (red edge flash). */
export function damageFlash(el) {
  if (!el) return;
  el.style.opacity = '0.7';
  window.setTimeout(() => { el.style.opacity = '0'; }, 140);
}

/** A muzzle flash: a bright additive sprite that lives ~60ms at a world position. */
export function muzzleFlash(scene, THREE, position) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,240,180,1)');
  grad.addColorStop(0.4, 'rgba(255,160,40,0.8)');
  grad.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(position);
  sprite.scale.set(1.2, 1.2, 1);
  scene.add(sprite);
  window.setTimeout(() => {
    scene.remove(sprite);
    mat.dispose();
    tex.dispose();
  }, 70);
}
