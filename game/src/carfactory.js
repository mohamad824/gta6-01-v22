// One job: build cars as compound geometry — never one box. Extruded side-view
// silhouette with wheel-arch cutouts and a crowned hood/trunk, a separate glasshouse
// group, torus tires with spoked rims, hub caps and brake discs, inset tinted glass,
// emissive lights and a police light bar. Proportions: 1 unit ≈ 1 m.
// Parts that share a material are MERGED into one mesh per material (see merge.js):
// a car is ~9 draw calls, not ~60 — the chase stays smooth.
import * as THREE from '../vendor/three/three.module.min.js';
import { bucketAdd, bucketBuild } from './merge.js';

function std(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}

/** Side-view silhouette with wheel-arch cutouts (the wells are cut, not pasted on). */
function bodyShape(spec) {
  const L = spec.length;
  const H = spec.bodyH;
  const wheelR = 0.325;
  const frontAxle = L / 2 - 0.8; // +x is the front
  const rearAxle = -L / 2 + 1.0;
  const s = new THREE.Shape();
  // Start at the front bumper bottom, trace the bottom edge with arch cutouts.
  s.moveTo(L / 2, 0.18);
  s.lineTo(frontAxle + wheelR + 0.12, 0.18);
  s.absarc(frontAxle, 0.18, wheelR + 0.06, 0, Math.PI, false);
  s.lineTo(rearAxle + wheelR + 0.12, 0.18);
  s.absarc(rearAxle, 0.18, wheelR + 0.06, 0, Math.PI, false);
  s.lineTo(-L / 2, 0.18);
  // Rear, trunk, beltline, hood, nose — back to the start.
  s.lineTo(-L / 2, H * 0.62);
  s.quadraticCurveTo(-L / 2 - 0.04, H * 0.78, -L * 0.42, H * 0.82);
  s.lineTo(L * 0.18, H * 0.86);
  s.quadraticCurveTo(L * 0.34, H * 0.86, L * 0.44, H * 0.66);
  s.lineTo(L / 2, H * 0.5);
  s.quadraticCurveTo(L / 2 + 0.03, H * 0.34, L / 2, 0.18);
  return s;
}

function crownHoodTrunk(geo, spec) {
  // Crown the hood and trunk across the width: centre vertices rise 0.02–0.04.
  const pos = geo.attributes.position;
  const halfW = spec.width / 2;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const inHood = x > spec.length * 0.18 && x < spec.length * 0.46;
    const inTrunk = x < -spec.length * 0.34 && x > -spec.length * 0.5;
    if ((inHood || inTrunk) && y > spec.bodyH * 0.6) {
      const crown = 0.035 * (1 - (z / halfW) * (z / halfW));
      pos.setY(i, y + crown);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/** Make a temp mesh (position/rotation/scale set) and drop it into a bucket. */
function put(bucket, material, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.scale.set(sx, sy, sz);
  bucketAdd(bucket, material, mesh);
  return mesh;
}

function wheelParts(bucket, mats, axle, side, spec) {
  const z = side * (spec.width / 2 - 0.02);
  // Tire: a torus with a rounded profile (outer radius 0.325 = 0.65 m diameter),
  // never a flat disc. The ring already lies in the wheel plane (X–Y), axle = Z.
  put(bucket, mats.rubber, new THREE.TorusGeometry(0.24, 0.085, 10, 24), axle, 0.325, z);
  // Brake disc behind the spokes (60–70% of rim diameter).
  put(bucket, mats.steel, new THREE.CylinderGeometry(0.21, 0.21, 0.04, 20), axle, 0.325, z - 0.02, Math.PI / 2);
  // Rim: 0.58 of tire diameter, 5 spokes radiating from the hub.
  put(bucket, mats.chrome, new THREE.CylinderGeometry(0.19, 0.19, 0.05, 20), axle, 0.325, z + 0.02, Math.PI / 2);
  for (let i = 0; i < 5; i += 1) {
    const holder = new THREE.Group();
    holder.position.set(axle, 0.325, z + 0.055);
    holder.rotation.z = (i / 5) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.02), mats.chrome);
    holder.add(bar);
    holder.updateMatrix();
    bar.updateMatrix();
    // The spoke's matrix is the holder's rotation composed with the bar's own.
    if (!bucket.has(mats.chrome)) bucket.set(mats.chrome, []);
    bucket.get(mats.chrome).push({
      geo: bar.geometry,
      matrix: new THREE.Matrix4().multiplyMatrices(holder.matrix, bar.matrix),
    });
  }
  // Hub cap, proud of the rim face.
  put(bucket, mats.chrome, new THREE.CylinderGeometry(0.065, 0.065, 0.08, 12), axle, 0.325, z + 0.05, Math.PI / 2);
}

function glasshouseParts(bucket, mats, spec) {
  const cabinL = spec.length * 0.46;
  const cabinW = spec.width * 0.82;
  const cabinH = 0.42;
  // Cabin shell: a box tapering rearward (narrower at the roof).
  put(bucket, mats.paint, new THREE.BoxGeometry(cabinL, cabinH, cabinW),
    -spec.length * 0.04, spec.bodyH + cabinH / 2 - 0.02, 0, 0, 0, 0, 1, 1, 0.94);
  // Inset glass panels (0.02–0.03 inside the frame) so a frame edge reads around
  // them. Each glass sits in a holder rotated to face out, then tilted to lean.
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(cabinW * 0.92, 0.4), mats.glass);
  windshield.position.set(spec.length * 0.2, spec.bodyH + 0.22, 0);
  windshield.rotation.order = 'YXZ';
  windshield.rotation.y = Math.PI / 2;
  windshield.rotation.x = -0.35; // top leans back
  bucketAdd(bucket, mats.glass, windshield);
  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabinW * 0.9, 0.36), mats.glass);
  rearGlass.position.set(-spec.length * 0.28, spec.bodyH + 0.2, 0);
  rearGlass.rotation.order = 'YXZ';
  rearGlass.rotation.y = -Math.PI / 2;
  rearGlass.rotation.x = -0.55; // top leans forward
  bucketAdd(bucket, mats.glass, rearGlass);
  for (const side of [-1, 1]) {
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabinL * 0.82, 0.3), mats.glass);
    sideGlass.position.set(-spec.length * 0.04, spec.bodyH + 0.24, side * (cabinW / 2 + 0.01));
    if (side < 0) sideGlass.rotation.y = Math.PI;
    bucketAdd(bucket, mats.glass, sideGlass);
  }
  // Dark dashboard shape inside so the glass has something behind it.
  put(bucket, mats.dark, new THREE.BoxGeometry(0.3, 0.12, cabinW * 0.8), spec.length * 0.16, spec.bodyH + 0.06, 0);
}

/** Lights. Returns the light-bar meshes (kept separate so they can flash). */
function lightParts(bucket, mats, spec, police) {
  const W = spec.width;
  for (const side of [-1, 1]) {
    put(bucket, mats.dark, new THREE.BoxGeometry(0.06, 0.12, 0.3), spec.length / 2 - 0.02, 0.62, side * (W / 2 - 0.28));
    put(bucket, mats.lens, new THREE.BoxGeometry(0.03, 0.09, 0.24), spec.length / 2 + 0.015, 0.62, side * (W / 2 - 0.28));
    put(bucket, mats.tail, new THREE.BoxGeometry(0.03, 0.09, 0.26), -spec.length / 2 - 0.015, 0.62, side * (W / 2 - 0.28));
  }
  if (!police) return null;
  put(bucket, mats.dark, new THREE.BoxGeometry(0.34, 0.07, 0.95), -0.05, spec.bodyH + 0.44, 0);
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.07, 0.4),
    std(0x660000, 0.3, 0.4, { emissive: 0xff0000, emissiveIntensity: 2.2 }),
  );
  red.position.set(-0.05, spec.bodyH + 0.48, -0.24);
  const blue = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.07, 0.4),
    std(0x000066, 0.3, 0.4, { emissive: 0x2244ff, emissiveIntensity: 2.2 }),
  );
  blue.position.set(-0.05, spec.bodyH + 0.48, 0.24);
  return { red, blue, timer: 0 };
}

/** Flash the police light bar: alternate the red/blue emissive modules. */
export function updateLightBar(car, dt) {
  const bar = car.userData.lightBar;
  if (!bar) return;
  bar.timer += dt;
  const phase = Math.floor(bar.timer * 4) % 2 === 0;
  bar.red.material.emissiveIntensity = phase ? 2.4 : 0.25;
  bar.blue.material.emissiveIntensity = phase ? 0.25 : 2.4;
}

const KIND_SPECS = {
  sedan: { length: 4.6, width: 1.8, bodyH: 0.78 },
  coupe: { length: 4.3, width: 1.8, bodyH: 0.72 },
  suv: { length: 4.8, width: 1.9, bodyH: 1.0 },
  pickup: { length: 5.0, width: 1.9, bodyH: 0.85 },
  van: { length: 4.9, width: 1.95, bodyH: 1.15 },
  sports: { length: 4.4, width: 1.85, bodyH: 0.62 },
  classic: { length: 4.7, width: 1.75, bodyH: 0.8 },
};

/**
 * Build a car. The inner group is built with length along +X (nose +X); the
 * wrapper rotates it so the nose points to -Z (world forward). Returns a
 * THREE.Group with userData { spec, kind, inner }.
 */
export function buildCar(specIn) {
  const spec = { ...(KIND_SPECS[specIn.kind] || KIND_SPECS.sedan), ...specIn };
  // Police white must read WHITE, not tan: a cruiser's paint carries less metal
  // (more diffuse) than civilian paint, so the bounce light shows its colour.
  const paintMetal = spec.police ? 0.5 : 0.9;
  const paintRough = spec.police ? 0.45 : 0.3;
  const mats = {
    paint: std(spec.color, paintMetal, paintRough),
    glass: std(0x111122, 0, 0.05, { transparent: true, opacity: 0.85, envMapIntensity: 0.6 }),
    chrome: std(0xd8d8d8, 1, 0.08),
    rubber: std(0x141414, 0, 0.9),
    dark: std(0x1a1a1c, 0.4, 0.6),
    steel: std(0x555558, 0.9, 0.35),
    lens: std(0xfff2c0, 0.2, 0.3, { emissive: 0xffffcc, emissiveIntensity: 0.9 }),
    tail: std(0x880000, 0.2, 0.3, { emissive: 0xff2200, emissiveIntensity: 0.9 }),
  };
  const bucket = new Map();
  const car = new THREE.Group();

  // Lower body: extruded silhouette, bevelled, crowned, wheel wells cut in.
  const shape = bodyShape(spec);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: spec.width - 0.1,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, -(spec.width - 0.1) / 2);
  crownHoodTrunk(geo, spec);
  bucketAdd(bucket, mats.paint, new THREE.Mesh(geo, mats.paint));

  // Fenders bulge over the wheels (front slightly more elongated).
  for (const [axle, sx] of [[spec.length / 2 - 0.8, 1.15], [-spec.length / 2 + 1.0, 1.0]]) {
    for (const side of [-1, 1]) {
      put(bucket, mats.paint, new THREE.SphereGeometry(0.42, 12, 8),
        axle, 0.42, side * (spec.width / 2 - 0.05), 0, 0, 0, sx, 0.55, 0.32);
    }
  }

  glasshouseParts(bucket, mats, spec);
  const lightBar = lightParts(bucket, mats, spec, spec.police);

  // Bumpers: separate elements, protruding past the body.
  for (const [x, w] of [[spec.length / 2 + 0.03, 0.12], [-spec.length / 2 - 0.03, 0.12]]) {
    put(bucket, mats.chrome, new THREE.BoxGeometry(w, 0.16, spec.width - 0.06), x, 0.3, 0);
  }
  // Grille: dark recessed grid between the headlights.
  put(bucket, mats.dark, new THREE.BoxGeometry(0.04, 0.14, 0.7), spec.length / 2 + 0.01, 0.45, 0);
  // Side mirrors, door lines, handles, exhaust tips, wiper.
  for (const side of [-1, 1]) {
    put(bucket, mats.dark, new THREE.BoxGeometry(0.04, 0.03, 0.14), spec.length * 0.2, spec.bodyH + 0.08, side * (spec.width / 2 + 0.06));
    put(bucket, mats.paint, new THREE.BoxGeometry(0.08, 0.1, 0.05), spec.length * 0.2, spec.bodyH + 0.1, side * (spec.width / 2 + 0.13));
    put(bucket, mats.dark, new THREE.BoxGeometry(1.7, 0.015, 0.012), -0.1, 0.58, side * (spec.width / 2 + 0.005));
    put(bucket, mats.chrome, new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), 0.25, 0.68, side * (spec.width / 2 + 0.01), Math.PI / 2);
    put(bucket, mats.chrome, new THREE.CylinderGeometry(0.045, 0.045, 0.16, 10), -spec.length / 2 - 0.04, 0.22, side * 0.5, 0, 0, Math.PI / 2);
  }
  put(bucket, mats.dark, new THREE.BoxGeometry(0.02, 0.02, 0.5), spec.length * 0.24, spec.bodyH + 0.32, 0, 0, 0.3, 0);

  // Wheels: torus tires, spoked rims, hub caps, brake discs; gap to fender 0.03–0.05.
  for (const axle of [spec.length / 2 - 0.8, -spec.length / 2 + 1.0]) {
    for (const side of [-1, 1]) wheelParts(bucket, mats, axle, side, spec);
  }

  // One mesh per material; only the painted body casts a shadow (cheap pass).
  for (const mesh of bucketBuild(bucket, new Set([mats.paint]))) car.add(mesh);
  if (lightBar) {
    car.add(lightBar.red);
    car.add(lightBar.blue);
    car.userData.lightBar = lightBar;
  }

  // Rotate so the nose (+X in the shape) points to -Z (world forward).
  const wrapper = new THREE.Group();
  car.rotation.y = Math.PI / 2;
  wrapper.add(car);
  wrapper.userData = { spec, kind: spec.kind, inner: car };
  return wrapper;
}
