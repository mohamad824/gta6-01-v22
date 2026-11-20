// One job: build cars as compound geometry — never one box. Extruded side-view
// silhouette with wheel-arch cutouts and a crowned hood/trunk, a separate glasshouse
// group, torus tires with spoked rims, hub caps and brake discs, inset tinted glass,
// emissive lights and a police light bar. Proportions: 1 unit ≈ 1 m.
import * as THREE from '../vendor/three/three.module.min.js';

const PAINT = (color) => new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.3 });
const GLASS_MAT = new THREE.MeshStandardMaterial({
  color: 0x111122, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.72, envMapIntensity: 1.5,
});
const CHROME = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.08 });
const RUBBER = new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0, roughness: 0.9 });
const DARK = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.4, roughness: 0.6 });

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

function makeWheel() {
  const wheel = new THREE.Group();
  // Tire: a torus with a rounded profile (outer radius 0.325 = 0.65 m diameter),
  // never a flat disc. The ring already lies in the wheel plane (X–Y), axle = Z.
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.085, 10, 24), RUBBER);
  wheel.add(tire);
  // Brake disc behind the spokes (60–70% of rim diameter).
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.21, 0.04, 20),
    new THREE.MeshStandardMaterial({ color: 0x555558, metalness: 0.9, roughness: 0.35 }),
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.z = -0.02;
  wheel.add(disc);
  // Rim: 0.58 of tire diameter, 5 spokes radiating from the hub.
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 20), CHROME);
  rim.rotation.x = Math.PI / 2;
  rim.position.z = 0.02;
  wheel.add(rim);
  for (let i = 0; i < 5; i += 1) {
    const holder = new THREE.Group();
    holder.rotation.z = (i / 5) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.02), CHROME);
    bar.position.set(0, 0, 0.055);
    holder.add(bar);
    wheel.add(holder);
  }
  // Hub cap, proud of the rim face.
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 12), CHROME);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.05;
  wheel.add(hub);
  return wheel;
}

function makeGlasshouse(spec, paint) {
  const g = new THREE.Group();
  const cabinL = spec.length * 0.46;
  const cabinW = spec.width * 0.82;
  const cabinH = 0.42;
  // Cabin shell: a box tapering rearward (narrower at the roof), darker than the body.
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(cabinL, cabinH, cabinW),
    new THREE.MeshStandardMaterial({ color: paint, metalness: 0.85, roughness: 0.35 }),
  );
  shell.position.set(-spec.length * 0.04, spec.bodyH + cabinH / 2 - 0.02, 0);
  shell.scale.set(1, 1, 0.94);
  g.add(shell);
  // Inset glass panels (0.02–0.03 inside the frame) so a frame edge reads around
  // them. Each glass sits in a holder rotated to face out, then tilted to lean.
  const windshieldHolder = new THREE.Group();
  windshieldHolder.rotation.y = Math.PI / 2; // face the nose (+X)
  windshieldHolder.position.set(spec.length * 0.2, spec.bodyH + 0.22, 0);
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(cabinW * 0.92, 0.4), GLASS_MAT);
  windshield.rotation.x = -0.35; // top leans back
  windshieldHolder.add(windshield);
  g.add(windshieldHolder);
  const rearHolder = new THREE.Group();
  rearHolder.rotation.y = -Math.PI / 2; // face the tail (-X)
  rearHolder.position.set(-spec.length * 0.28, spec.bodyH + 0.2, 0);
  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabinW * 0.9, 0.36), GLASS_MAT);
  rearGlass.rotation.x = -0.55; // top leans forward
  rearHolder.add(rearGlass);
  g.add(rearHolder);
  for (const side of [-1, 1]) {
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabinL * 0.82, 0.3), GLASS_MAT);
    sideGlass.position.set(-spec.length * 0.04, spec.bodyH + 0.24, side * (cabinW / 2 + 0.01));
    if (side < 0) sideGlass.rotation.y = Math.PI;
    g.add(sideGlass);
  }
  // Dark dashboard shape inside so the glass has something behind it.
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, cabinW * 0.8), DARK);
  dash.position.set(spec.length * 0.16, spec.bodyH + 0.06, 0);
  g.add(dash);
  return g;
}

function addLights(car, spec, police) {
  const W = spec.width;
  // Headlights: dark recessed housing + warm-white emissive lens.
  for (const side of [-1, 1]) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), DARK);
    housing.position.set(spec.length / 2 - 0.02, 0.62, side * (W / 2 - 0.28));
    car.add(housing);
    const lens = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.09, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffffcc, emissiveIntensity: 0.9 }),
    );
    lens.position.set(spec.length / 2 + 0.015, 0.62, side * (W / 2 - 0.28));
    car.add(lens);
    // Taillights: red emissive strip at the rear corners.
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.09, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x880000, emissive: 0xff2200, emissiveIntensity: 0.9 }),
    );
    tail.position.set(-spec.length / 2 - 0.015, 0.62, side * (W / 2 - 0.28));
    car.add(tail);
  }
  if (police) {
    // Light bar: black base + red/blue modules that flash on a timer.
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.95), DARK);
    base.position.set(-0.05, spec.bodyH + 0.44, 0);
    car.add(base);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.07, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0xff0000, emissiveIntensity: 2.2 }),
    );
    red.position.set(-0.05, spec.bodyH + 0.48, -0.24);
    car.add(red);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.07, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x000066, emissive: 0x2244ff, emissiveIntensity: 2.2 }),
    );
    blue.position.set(-0.05, spec.bodyH + 0.48, 0.24);
    car.add(blue);
    car.userData.lightBar = { red, blue, timer: 0 };
  }
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
 * THREE.Group with userData { spec, wheels, kind, inner }.
 */
export function buildCar(specIn) {
  const spec = { ...(KIND_SPECS[specIn.kind] || KIND_SPECS.sedan), ...specIn };
  const car = new THREE.Group();
  const paint = spec.color;

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
  const body = new THREE.Mesh(geo, PAINT(paint));
  body.castShadow = true;
  car.add(body);

  // Fenders bulge over the wheels (front slightly more elongated).
  for (const [axle, sx] of [[spec.length / 2 - 0.8, 1.15], [-spec.length / 2 + 1.0, 1.0]]) {
    for (const side of [-1, 1]) {
      const fender = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), PAINT(paint));
      fender.scale.set(sx, 0.55, 0.32);
      fender.position.set(axle, 0.42, side * (spec.width / 2 - 0.05));
      car.add(fender);
    }
  }

  // Glasshouse (separate group) + lights + details.
  car.add(makeGlasshouse(spec, paint));
  addLights(car, spec, spec.police);

  // Bumpers: separate elements, protruding past the body.
  for (const [x, w] of [[spec.length / 2 + 0.03, 0.12], [-spec.length / 2 - 0.03, 0.12]]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, spec.width - 0.06), CHROME);
    bumper.position.set(x, 0.3, 0);
    car.add(bumper);
  }
  // Grille: dark recessed grid between the headlights.
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.7), DARK);
  grille.position.set(spec.length / 2 + 0.01, 0.45, 0);
  car.add(grille);
  // Side mirrors, door lines, handles, exhaust tips, wiper.
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.14), DARK);
    arm.position.set(spec.length * 0.2, spec.bodyH + 0.08, side * (spec.width / 2 + 0.06));
    car.add(arm);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.05), PAINT(paint));
    mirror.position.set(spec.length * 0.2, spec.bodyH + 0.1, side * (spec.width / 2 + 0.13));
    car.add(mirror);
    const doorLine = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.015, 0.012), DARK);
    doorLine.position.set(-0.1, 0.58, side * (spec.width / 2 + 0.005));
    car.add(doorLine);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), CHROME);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.25, 0.68, side * (spec.width / 2 + 0.01));
    car.add(handle);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 10), CHROME);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(-spec.length / 2 - 0.04, 0.22, side * 0.5);
    car.add(exhaust);
  }
  const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.5), DARK);
  wiper.position.set(spec.length * 0.24, spec.bodyH + 0.32, 0);
  wiper.rotation.y = 0.3;
  car.add(wiper);

  // Wheels: torus tires, spoked rims, hub caps, brake discs; gap to fender 0.03–0.05.
  const wheels = [];
  for (const axle of [spec.length / 2 - 0.8, -spec.length / 2 + 1.0]) {
    for (const side of [-1, 1]) {
      const wheel = makeWheel();
      wheel.position.set(axle, 0.325, side * (spec.width / 2 - 0.02));
      car.add(wheel);
      wheels.push(wheel);
    }
  }

  // Rotate so the nose (+X in the shape) points to -Z (world forward).
  const wrapper = new THREE.Group();
  car.rotation.y = Math.PI / 2;
  wrapper.add(car);
  wrapper.userData = { spec, wheels, kind: spec.kind, inner: car };
  return wrapper;
}
