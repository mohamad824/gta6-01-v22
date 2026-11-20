// One job: the golden-hour sky — a gradient dome shader, a filled sun disc with
// halo, and soft cloud bands. The sun is an opaque emissive disc (never a hollow
// ring) so the chase sky reads bright and warm.
import * as THREE from '../vendor/three/three.module.min.js';
import { PALETTE } from './config.js';

function makeSkyDome() {
  const geo = new THREE.SphereGeometry(400, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      low: { value: new THREE.Color(PALETTE.skyLow) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 low;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 col = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.9, h))
                            : mix(low, mid, smoothstep(-0.05, 0.25, h));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

function makeHaloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  grad.addColorStop(0, 'rgba(255,214,106,0.9)');
  grad.addColorStop(0.35, 'rgba(255,170,60,0.45)');
  grad.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The sun: a filled disc plus a halo sprite, placed low over the sea (west). */
export function makeSun() {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(10, 40),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
  );
  group.add(disc);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeHaloTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  halo.scale.set(70, 70, 1);
  group.add(halo);
  group.position.set(-55, 14, -130);
  group.lookAt(0, 2, 20);
  return group;
}

/** A few soft cloud bands, warm-lit, drifting slowly. */
export function makeClouds(rng) {
  const group = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 26; i += 1) {
    const x = 20 + rng() * 216;
    const y = 18 + rng() * 28;
    const r = 10 + rng() * 22;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, 'rgba(255,190,130,0.55)');
    grad.addColorStop(1, 'rgba(255,190,130,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
  for (let i = 0; i < 7; i += 1) {
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(-160 + rng() * 320, 34 + rng() * 26, -190 - rng() * 80);
    sprite.scale.set(70 + rng() * 60, 12 + rng() * 8, 1);
    group.add(sprite);
  }
  return group;
}

export function makeSky(rng) {
  const group = new THREE.Group();
  group.add(makeSkyDome());
  group.add(makeSun());
  group.add(makeClouds(rng));
  return group;
}
