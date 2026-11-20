// One job: the garage — a 3D interior (lift, turntable ring, corrugated wall, the
// fully readable EDDIE'S GARAGE sign, mechanic Dante Rook, dense props, warm
// practicals + a key light on the car) and the shop's buy logic.
import * as THREE from '../vendor/three/three.module.min.js';
import { buildCar } from './carfactory.js';
import { makePerson } from './people.js';
import { SHOP_GEAR, SHOP_UPGRADES } from './config.js';
import { clearWanted } from './wanted.js';
import { refillAmmo } from './weapons.js';

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The sign: every letter of EDDIE'S GARAGE, bold amber on dark teal, lit border. */
export function makeGarageSign() {
  const tex = canvasTexture(1024, 224, (ctx, w, h) => {
    ctx.fillStyle = '#0f2a2e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffb02a';
    ctx.font = 'bold 118px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("EDDIE'S GARAGE", w / 2, h / 2 + 4);
    ctx.strokeStyle = '#ffb02a';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  });
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 1.75),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  // High on the back wall, centred, nothing in front of it: lift posts top out
  // at y 1.9 and the sign's bottom edge sits at y 2.6.
  sign.position.set(0, 3.5, -4.9);
  return sign;
}

function corrugatedTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    for (let x = 0; x < w; x += 16) {
      const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, '#8a5a34');
      grad.addColorStop(0.5, '#b07a44');
      grad.addColorStop(1, '#6a4024');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 16, h);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, h - 30, w, 30);
  });
}

function ringTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#2a2a2e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e8b820';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 200, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 26;
    ctx.setLineDash([40, 40]);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 200, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** Build the garage as its own scene (rendered instead of the city in garage mode). */
export function buildGarageScene(rng, state) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1410);
  const camera = new THREE.PerspectiveCamera(50, 1280 / 720, 0.1, 60);
  camera.position.set(0, 2.4, 10.5);
  // Look slightly right of the room's centre so the sign, the car and the
  // mechanic all sit in the LEFT half of the frame — the DOM shop panel covers
  // the right 46%, and v21's sign died behind it ("DIE'S GARA").
  camera.lookAt(2.2, 1.4, 0);

  // Floor with painted markings + oil stains.
  const floorTex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5a5550';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8b820';
    ctx.fillRect(40, 240, 432, 10);
    ctx.fillRect(40, 262, 432, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 12; i += 1) {
      ctx.beginPath();
      ctx.ellipse(60 + rng() * 380, 60 + rng() * 380, 20 + rng() * 40, 10 + rng() * 20, rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 12),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Back wall (corrugated, warm) + side walls + ceiling.
  const wallMat = new THREE.MeshStandardMaterial({ map: corrugatedTexture(), roughness: 0.85 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
  back.position.set(0, 3, -5);
  scene.add(back);
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 0.9 });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), sideMat);
    wall.position.set(side * 8, 3, 0);
    wall.rotation.y = -side * Math.PI / 2;
    scene.add(wall);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ color: 0x2e2822, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 6, 0);
  scene.add(ceil);

  // The sign — fully readable, nothing in front of it.
  const sign = makeGarageSign();
  scene.add(sign);

  // Lift: two posts (max height 1.9, below the sign) + turntable with striped ring.
  const postMat = new THREE.MeshStandardMaterial({ color: 0xd8b820, roughness: 0.5, metalness: 0.4 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.9, 0.5), postMat);
    post.position.set(side * 2.3, 0.95, 0);
    scene.add(post);
  }
  const turntable = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.1, 0.12, 40),
    new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.7 }),
  );
  turntable.position.set(0, 0.06, 0);
  scene.add(turntable);

  // The hero car, side-on, up on the lift.
  const car = buildCar({ kind: 'sedan', color: state.vehicle.color });
  car.rotation.y = Math.PI / 2; // length along X: side-on to the camera
  car.position.set(0, 0.55, 0);
  scene.add(car);

  // Mechanic Dante Rook, standing by the car, facing it (kept left of the shop
  // panel's edge after the camera shift).
  const dante = makePerson({ jacket: 0x4a5a3a, pants: 0x2e2a24, skin: 0x8a5a3a, hair: 0x1a1a1a });
  dante.position.set(2.6, 0, 0.9);
  dante.rotation.y = -Math.PI / 2;
  scene.add(dante);

  // Density: tool wall, tyre stack, workbench, oil drums, hanging lamp, crates.
  const peg = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 2),
    new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 }),
  );
  peg.position.set(-7.8, 2.4, -1);
  peg.rotation.y = Math.PI / 2;
  scene.add(peg);
  for (let i = 0; i < 6; i += 1) {
    const tool = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.5 + (i % 3) * 0.2, 0.08),
      new THREE.MeshStandardMaterial({ color: [0xb0b0b0, 0xd84a3a, 0x2a7a8a][i % 3], metalness: 0.6, roughness: 0.4 }),
    );
    tool.position.set(-7.7, 2.4 + (i % 2) * 0.5, -2.2 + i * 0.5);
    scene.add(tool);
  }
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  for (let i = 0; i < 3; i += 1) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.11, 8, 18), tyreMat);
    tyre.rotation.x = Math.PI / 2;
    tyre.position.set(-5.2, 0.12 + i * 0.24, -3.6);
    scene.add(tyre);
  }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.9), new THREE.MeshStandardMaterial({ color: 0x6a4a34, roughness: 0.85 }));
  bench.position.set(-5.6, 0.95, 2.6);
  scene.add(bench);
  for (const [bx, bz] of [[-6.7, 2.3], [-4.5, 2.3], [-6.7, 2.9], [-4.5, 2.9]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 0.1), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.7 }));
    leg.position.set(bx, 0.48, bz);
    scene.add(leg);
  }
  for (let i = 0; i < 2; i += 1) {
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 1.1, 14),
      new THREE.MeshStandardMaterial({ color: i ? 0x2a5a7a : 0x7a3a2a, roughness: 0.6, metalness: 0.4 }),
    );
    drum.position.set(5.6 + i * 1.0, 0.55, -4.2);
    scene.add(drum);
  }
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 });
  for (const [cx, cy, cz, s] of [[6.2, 0.4, 2.8, 0.8], [6.2, 1.2, 2.8, 0.7], [5.4, 0.35, 3.4, 0.7]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(cx, cy, cz);
    scene.add(crate);
  }
  // Hanging lamp: emissive bulb + cord.
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  cord.position.set(0, 5.2, 1.2);
  scene.add(cord);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe8b0, emissive: 0xffc070, emissiveIntensity: 2.4 }),
  );
  bulb.position.set(0, 4.3, 1.2);
  scene.add(bulb);

  // Lighting: warm key spot on the car, warm practicals, a cool rim from the door.
  const hemi = new THREE.HemisphereLight(0xffe0b0, 0x3a2a20, 0.85);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xffd9a0, 1000, 18, 0.62, 0.5, 1.5);
  key.position.set(2, 5.5, 4.5);
  key.target.position.set(0, 0.8, 0);
  scene.add(key);
  scene.add(key.target);
  for (const px of [-2.5, 2.5]) {
    const practical = new THREE.PointLight(0xffc070, 200, 13, 1.8);
    practical.position.set(px, 4.2, 1.2);
    scene.add(practical);
  }
  const rim = new THREE.PointLight(0x6a8aff, 100, 12, 1.8);
  rim.position.set(-5.5, 2.5, 4.5);
  scene.add(rim);

  return { scene, camera, car, sign, dante };
}

/** Buy a shop item. Applies the real effect; returns { ok, reason }. */
export function buyItem(state, id) {
  const item = [...SHOP_UPGRADES, ...SHOP_GEAR].find((i) => i.id === id);
  if (!item) return { ok: false, reason: 'unknown item' };
  if (item.owned) return { ok: false, reason: 'already owned' };
  if (state.cash < item.price) return { ok: false, reason: 'not enough cash' };
  state.cash -= item.price;
  switch (id) {
    case 'repair':
      if (state.vehicle.condition >= 100) {
        state.cash += item.price;
        return { ok: false, reason: 'condition already 100%' };
      }
      state.vehicle.condition = 100;
      break;
    case 'respray':
      clearWanted(state);
      break;
    case 'tune':
      state.vehicle.tune += 1;
      state.garage.engine += 1;
      item.owned = true;
      break;
    case 'armour':
      state.vehicle.armour += 1;
      state.garage.armour += 1;
      item.owned = true;
      break;
    case 'nitro':
      state.vehicle.nitro += 1;
      state.garage.nitro += 1;
      item.owned = true;
      break;
    case 'cobra':
      state.weapons[2].ammo = 16;
      break;
    case 'longshot':
      state.weapons[4].ammo = 6;
      break;
    case 'flare':
      state.flares += 3;
      break;
    case 'ammo':
      refillAmmo(state);
      break;
    case 'vest':
      state.armour = Math.min(100, state.armour + 40);
      state.vest = true;
      break;
    default:
      break;
  }
  return { ok: true, reason: 'bought', cash: state.cash, condition: state.vehicle.condition };
}
