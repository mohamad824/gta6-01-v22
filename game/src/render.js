// One job: drawing only — the THREE.WebGLRenderer, resize handling, tone mapping
// and the per-frame render of whichever scene is active (city or garage).
import * as THREE from '../vendor/three/three.module.min.js';

export function createRenderer(canvas) {
  const params = new URLSearchParams(window.location.search);
  const antialias = params.get('aa') !== '0';
  const shadows = params.get('shadow') !== '0';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.33;

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return {
    renderer,
    resize,
    /** Paint one frame of the given scene/camera pair. */
    draw(scene, camera) {
      renderer.render(scene, camera);
    },
    /** Render statistics for the frame just drawn (calls, triangles). */
    stats() {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };
    },
  };
}
