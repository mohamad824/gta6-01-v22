// One job: the police helicopter — rotor, tail boom, skids, cabin glass and a
// searchlight with a soft volumetric cone (custom shader) and a bright pool on
// the road. It hovers above the chase and keeps its beam on the hero.
import * as THREE from '../vendor/three/three.module.min.js';

function beamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { intensity: { value: 0.35 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float intensity;
      varying vec2 vUv;
      void main() {
        // Bright at the heli, fading toward the road; soft edges across the cone.
        float along = 1.0 - vUv.y;
        float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
        float a = along * edge * intensity;
        gl_FragColor = vec4(1.0, 0.95, 0.75, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function poolTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,240,190,0.95)');
  grad.addColorStop(0.5, 'rgba(255,220,140,0.45)');
  grad.addColorStop(1, 'rgba(255,210,120,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Build the helicopter. Returns { group, rotor, beam, pool, light }. */
export function buildHeli() {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c20, metalness: 0.6, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0a0a18, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.75,
  });
  // Cabin: rounded body + glass nose.
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), dark);
  body.scale.set(1.15, 0.9, 1.5);
  group.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), glass);
  nose.scale.set(1, 0.75, 0.9);
  nose.position.set(0, -0.1, -1.1);
  group.add(nose);
  // Tail boom + tail rotor + fin.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 3.4, 8), dark);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.25, 2.6);
  group.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.5), dark);
  fin.position.set(0, 0.7, 4.2);
  group.add(fin);
  // Main rotor: four blades on a mast, spinning.
  const rotor = new THREE.Group();
  rotor.position.y = 1.05;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8), dark);
  rotor.add(mast);
  for (let i = 0; i < 4; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 3.4), dark);
    blade.rotation.y = (i / 4) * Math.PI;
    blade.position.y = 0.24;
    rotor.add(blade);
  }
  group.add(rotor);
  // Skids.
  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), dark);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(side * 0.85, -1.05, 0);
    group.add(skid);
  }
  // Searchlight: a real spotlight + a visible cone + a bright pool on the road.
  const light = new THREE.SpotLight(0xfff2c0, 900, 40, 0.32, 0.5, 1.6);
  light.position.set(0, -0.8, -0.6);
  group.add(light);
  group.add(light.target);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 2.6, 13, 20, 1, true), beamMaterial());
  cone.position.set(0, -7.2, -0.6);
  group.add(cone);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({
      map: poolTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.06, -0.6);
  group.add(pool);
  return { group, rotor, beam: cone, pool, light };
}

/** Hover above the hero, spin the rotor, keep the beam and pool on the road. */
export function updateHeli(heli, hero, dt, time) {
  heli.group.position.set(hero.x + 2.5, 10.5 + Math.sin(time * 0.7) * 0.4, hero.z - 5);
  heli.group.rotation.y = Math.sin(time * 0.2) * 0.2;
  heli.rotor.rotation.y += dt * 22;
  // The pool stays on the road under the beam, following the hero.
  heli.pool.position.set(hero.x + 1.2, 0.06, hero.z - 6);
  heli.light.target.position.set(hero.x + 1.2, 0, hero.z - 6);
}
