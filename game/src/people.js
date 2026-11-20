// One job: people who read as people — proper head, face, hair, shaped jacket,
// arms and legs that swing when they walk. No ball heads, no box torsos.
import * as THREE from '../vendor/three/three.module.min.js';
import { pick, range } from './random.js';

const SKINS = [0xc98e6a, 0x8a5a3a, 0xe8b88a, 0x6a4530];
const JACKETS = [0x3a5a8a, 0x8a3a3a, 0x3a7a4a, 0xc2a23a, 0x5a3a7a, 0x2a2a2e];
const HAIRS = [0x1a1a1a, 0x3a2a1a, 0x6a4a2a, 0x8a8a8a];

function makeLimb(color, length, radius) {
  const limb = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.85, length, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  limb.add(mesh);
  return limb;
}

/** A person ~1.75 units tall. `opts` = { jacket, pants, skin, hair }. */
export function makePerson(opts) {
  const person = new THREE.Group();
  const skin = opts.skin ?? 0xc98e6a;
  const jacket = opts.jacket ?? 0x3a5a8a;
  const pants = opts.pants ?? 0x2a2a30;
  const hair = opts.hair ?? 0x1a1a1a;

  // Legs (pivot at the hip) + shoes.
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = makeLimb(pants, 0.8, 0.07);
    leg.position.set(side * 0.09, 0.82, 0);
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.06, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }),
    );
    shoe.position.set(0, -0.8, 0.05);
    leg.add(shoe);
    person.add(leg);
    legs.push(leg);
  }
  // Torso: a shaped jacket — wider at the shoulders, tapering to the waist.
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.15, 0.62, 8),
    new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.75 }),
  );
  torso.position.y = 1.13;
  torso.castShadow = true;
  person.add(torso);
  // Shoulders.
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.75 }),
    );
    shoulder.position.set(side * 0.2, 1.4, 0);
    person.add(shoulder);
  }
  // Arms (pivot at the shoulder) + hands.
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = makeLimb(jacket, 0.62, 0.055);
    arm.position.set(side * 0.24, 1.42, 0);
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 }),
    );
    hand.position.y = -0.64;
    arm.add(hand);
    person.add(arm);
    arms.push(arm);
  }
  // Head: skin sphere + hair cap + a small nose so the face reads from behind-side.
  const head = new THREE.Group();
  head.position.y = 1.62;
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 14, 10),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }),
  );
  head.add(skull);
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9 }),
  );
  hairCap.position.y = 0.015;
  head.add(hairCap);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 0.05, 6),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }),
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.01, 0.115);
  head.add(nose);
  person.add(head);

  person.userData = { legs, arms, head, walkPhase: 0 };
  return person;
}

/** Leo Marín, the protagonist: red jacket, dark hair. */
export function makeLeo() {
  return makePerson({ jacket: 0xb02020, pants: 0x23232c, skin: 0xc98e6a, hair: 0x14100c });
}

/** Pedestrians strolling the beach sidewalk and the city sidewalk. */
export function makePedestrians(rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const person = makePerson({
      jacket: pick(rng, JACKETS),
      skin: pick(rng, SKINS),
      hair: pick(rng, HAIRS),
      pants: pick(rng, [0x2a2a30, 0x3a3a44, 0x5a4a3a]),
    });
    const beachSide = rng() > 0.45;
    person.position.set(
      beachSide ? range(rng, -11, -8.2) : range(rng, 8.2, 11),
      0,
      range(rng, -60, 10),
    );
    person.rotation.y = rng() * Math.PI * 2;
    person.userData.speed = range(rng, 0.5, 1.1);
    person.userData.dir = rng() > 0.5 ? 1 : -1;
    peds.push(person);
  }
  return peds;
}

/** Walk cycle: arms and legs swing in opposition; the body bobs slightly. */
export function updatePedestrians(peds, dt) {
  for (const ped of peds) {
    const u = ped.userData;
    u.walkPhase += dt * u.speed * 5;
    const swing = Math.sin(u.walkPhase) * 0.45;
    u.legs[0].rotation.x = swing;
    u.legs[1].rotation.x = -swing;
    u.arms[0].rotation.x = -swing * 0.8;
    u.arms[1].rotation.x = swing * 0.8;
    ped.position.z += u.dir * u.speed * dt;
    if (ped.position.z > 12) ped.position.z = -60;
    if (ped.position.z < -62) ped.position.z = 10;
    ped.position.y = Math.abs(Math.sin(u.walkPhase)) * 0.03;
  }
}
