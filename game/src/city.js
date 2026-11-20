// One job: the city itself — the coastal boulevard, the beach and sea, the city
// buildings with lit windows and signs, palms, street lights and props. Static
// geometry is merged per material where it can be, and repeats are instanced.
import * as THREE from '../vendor/three/three.module.min.js';
import { range } from './random.js';

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Lit-window facade: warm lit windows scattered over a dark wall. */
function facadeTexture(rng, base) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const lit = rng() > 0.45;
        ctx.fillStyle = lit ? (rng() > 0.5 ? '#ffd27a' : '#ffb35a') : '#1c1410';
        ctx.fillRect(14 + col * 40, 14 + row * 30, 24, 18);
      }
    }
    // Balcony rails on two floors.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 108, w, 6);
    ctx.fillRect(0, 204, w, 6);
  });
}

function signTexture(text, fg, bg, vertical) {
  return canvasTexture(vertical ? 128 : 512, vertical ? 512 : 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = `bold ${vertical ? 64 : 72}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (vertical) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(text, w / 2, h / 2);
    }
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  });
}

function makeInstanced(geo, mat, transforms) {
  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3(1, 1, 1);
  transforms.forEach((t, i) => {
    e.set(t.rx || 0, t.ry || 0, t.rz || 0);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(t.x, t.y, t.z), q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/** A palm: segmented trunk + curved drooping fronds (one group, cloned by the city). */
export function makePalm(rng) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 4.2, 7), trunkMat);
  trunk.position.y = 2.1;
  trunk.rotation.z = range(rng, -0.08, 0.08);
  trunk.castShadow = true;
  palm.add(trunk);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e6a2e, roughness: 0.85, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i += 1) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.4, 4), frondMat);
    frond.scale.set(1, 1, 0.16);
    frond.position.y = 4.25;
    frond.rotation.z = Math.PI / 2 + range(rng, 0.5, 0.9);
    frond.rotation.y = (i / 8) * Math.PI * 2;
    // Droop: tilt the frond down from the crown.
    frond.translateY(0.9);
    palm.add(frond);
  }
  const coconuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 }),
  );
  coconuts.position.set(0.15, 4.05, 0);
  palm.add(coconuts);
  return palm;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  const add = (mesh, x, y, z, ry = 0) => {
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    return mesh;
  };

  // Ground: city side (dark) and beach side (sand), sea far west.
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x5a4a42, roughness: 0.95 });
  add(new THREE.Mesh(new THREE.PlaneGeometry(220, 220), groundMat), 40, 0, -30).rotation.x = -Math.PI / 2;
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xe0b878, roughness: 1 });
  add(new THREE.Mesh(new THREE.PlaneGeometry(60, 220), sandMat), -38, 0.01, -30).rotation.x = -Math.PI / 2;
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x2e7f8a, roughness: 0.25, metalness: 0.4 });
  add(new THREE.Mesh(new THREE.PlaneGeometry(80, 220), seaMat), -105, 0.02, -30).rotation.x = -Math.PI / 2;

  // The boulevard: asphalt with a bright centre line, lane dashes, crosswalks,
  // and wet-reflection streaks (additive planes) so the road never reads bare brown.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a3a34, roughness: 0.35, metalness: 0.15 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 220), roadMat);
  add(road, 0, 0.03, -30).rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe8e0c8 });
  const dashes = [];
  for (let z = -120; z < 60; z += 6) {
    dashes.push({ x: -2.3, y: 0.05, z, ry: 0 });
    dashes.push({ x: 2.3, y: 0.05, z, ry: 0 });
  }
  group.add(makeInstanced(new THREE.PlaneGeometry(0.18, 2.6), dashMat, dashes.map((d) => ({ ...d, rx: -Math.PI / 2 }))));
  // Centre line (amber) and two crosswalks.
  const centre = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 220), new THREE.MeshBasicMaterial({ color: 0xd8a020 }));
  add(centre, 0, 0.05, -30).rotation.x = -Math.PI / 2;
  for (const cz of [2, -34]) {
    for (let x = -6.5; x <= 6.5; x += 1.4) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.4), dashMat);
      add(stripe, x, 0.05, cz).rotation.x = -Math.PI / 2;
    }
  }
  // Wet reflections: additive light streaks along the road.
  const streakTex = canvasTexture(64, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,180,90,0)');
    grad.addColorStop(0.5, 'rgba(255,180,90,0.5)');
    grad.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  for (const sx of [-4.5, 4.5]) {
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 60),
      new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    add(streak, sx, 0.06, -20).rotation.x = -Math.PI / 2;
  }

  // Sidewalks.
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x9a8a7a, roughness: 0.95 });
  add(new THREE.Mesh(new THREE.PlaneGeometry(4, 220), walkMat), -9, 0.04, -30).rotation.x = -Math.PI / 2;
  add(new THREE.Mesh(new THREE.PlaneGeometry(4, 220), walkMat), 9, 0.04, -30).rotation.x = -Math.PI / 2;

  // Buildings (right side): varied heights, lit-window facades, balconies, signs.
  const buildingDefs = [
    { x: 14, z: -8, w: 10, h: 14, d: 10, base: '#8a4a34' },
    { x: 15, z: -22, w: 9, h: 20, d: 9, base: '#6a4a3a' },
    { x: 14, z: -38, w: 11, h: 10, d: 10, base: '#a05a3a' },
    { x: 16, z: -54, w: 9, h: 24, d: 9, base: '#5a3a4a' },
    { x: 15, z: -70, w: 10, h: 16, d: 10, base: '#7a5a44' },
    { x: 14, z: 8, w: 10, h: 12, d: 10, base: '#94503a' },
  ];
  for (const def of buildingDefs) {
    const mat = new THREE.MeshStandardMaterial({
      map: facadeTexture(rng, def.base), roughness: 0.85,
    });
    const b = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, def.d), mat);
    b.castShadow = true;
    add(b, def.x, def.h / 2, def.z);
    // Roof line + a lit sign board on two of them.
    const roof = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.4, 0.3, def.d + 0.4), new THREE.MeshStandardMaterial({ color: 0x2a201c, roughness: 0.9 }));
    add(roof, def.x, def.h + 0.15, def.z);
  }
  // MOTEL sign (vertical, lit) on the first building; CAFE sign on the second.
  const motel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 6),
    new THREE.MeshBasicMaterial({ map: signTexture('MOTEL', '#ff5a3a', '#1c1410', true) }),
  );
  add(motel, 9.4, 9, -8, -Math.PI / 2);
  const cafe = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.2),
    new THREE.MeshBasicMaterial({ map: signTexture('CAFE', '#ffd27a', '#14202a', false) }),
  );
  add(cafe, 9.4, 7.5, -22, -Math.PI / 2);
  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1),
    new THREE.MeshBasicMaterial({ map: signTexture('TACOS', '#7ae8d8', '#241428', false) }),
  );
  add(neon, 9.4, 6, -38, -Math.PI / 2);

  // Palms in a row along the beach sidewalk.
  for (let i = 0; i < 9; i += 1) {
    const palm = makePalm(rng);
    palm.position.set(-8.2, 0, 12 - i * 9);
    palm.rotation.y = rng() * Math.PI;
    group.add(palm);
  }
  // A few palms on the city side too.
  for (let i = 0; i < 4; i += 1) {
    const palm = makePalm(rng);
    palm.position.set(8.4, 0, -2 - i * 14);
    palm.rotation.y = rng() * Math.PI;
    group.add(palm);
  }

  // Beach furniture: umbrellas, loungers, a lifeguard post.
  const umbrellaCols = [0xd84a3a, 0x2a7a8a, 0xe8c23a, 0x7a3a8a];
  for (let i = 0; i < 6; i += 1) {
    const ux = -16 - (i % 3) * 7;
    const uz = 4 - Math.floor(i / 3) * 18 - range(rng, 0, 4);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.8 }));
    add(pole, ux, 1.2, uz);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: umbrellaCols[i % 4], roughness: 0.8, side: THREE.DoubleSide }),
    );
    add(canopy, ux, 2.6, uz);
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 1.8), new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.85 }));
    add(lounger, ux + 1.6, 0.18, uz + 0.6, range(rng, -0.3, 0.3));
  }
  // Lifeguard post: four legs + cabin + roof.
  const postMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.85 });
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 6), postMat);
    leg.rotation.z = lx * 0.18;
    leg.rotation.x = -lz * 0.18;
    add(leg, -30 + lx * 0.8, 1.7, -18 + lz * 0.8);
  }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), new THREE.MeshStandardMaterial({ color: 0xd84a3a, roughness: 0.8 }));
  add(cabin, -30, 3.9, -18);
  const cabinRoof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.8 }));
  cabinRoof.rotation.y = Math.PI / 4;
  add(cabinRoof, -30, 5, -18);

  // Street lights along the boulevard (pole + warm emissive head).
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe8b0, emissive: 0xffd27a, emissiveIntensity: 1.6 });
  for (let z = 8; z > -80; z -= 16) {
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 8), poleMat);
      add(pole, side * 7.4, 2.7, z);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), poleMat);
      add(arm, side * 6.8, 5.35, z);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.24), lampMat);
      add(head, side * 6.1, 5.3, z);
    }
  }
  // Traffic lights at the two crosswalks.
  for (const cz of [2, -34]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.4, 8), poleMat);
    add(post, 7.4, 2.2, cz + 2);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.0, 0.34), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }));
    add(box, 7.4, 4.6, cz + 2);
    for (let li = 0; li < 3; li += 1) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x222222, emissive: li === 2 ? 0x22ff44 : 0x000000, emissiveIntensity: li === 2 ? 1.4 : 0 }),
      );
      add(lamp, 7.4, 4.3 + li * 0.3, cz + 1.82);
    }
  }
  // Street sign: SUNSET BLVD.
  const streetSign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.5),
    new THREE.MeshBasicMaterial({ map: signTexture('SUNSET BLVD', '#ffffff', '#1a5a2a', false) }),
  );
  add(streetSign, -7.4, 3.2, 6, Math.PI / 2);

  // Bake the static transforms now that every rotation is set.
  group.traverse((o) => { if (o.isMesh && !o.matrixAutoUpdate) o.updateMatrix(); });

  scene.add(group);
  return group;
}
