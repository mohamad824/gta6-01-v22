// One job: the four screenshot scenes behind ?shot=chase|onfoot|map|garage.
// Each one stages the real world deterministically from the seed (no loop, no
// animation), paints twice and sets window.__shotReady for the screenshot.
import { resetToStaged, setCameraPreset } from './world.js';
import { renderHUD, renderMapOverlay, renderMissionPassed, setPrompt, showOverlay } from './hud.js';
import { stagedMissionPassed } from './missions.js';
import { stagedDispatchLine } from './dispatch.js';
import { setShotMode } from './motion.js';

/** Stage one shot and return the scene/camera pair to paint. */
export function stageShot(name, world, buildShop) {
  setShotMode(true);
  resetToStaged(world);
  world.shotName = name;
  const state = world.state;
  state.missionProgress = 1; // the staged mission reads OBJECTIVE COMPLETE

  if (name === 'onfoot') {
    // Leo from behind, the red coupe ahead, "E — STEAL CAR", a cruiser nearby.
    world.hero.onFoot = true;
    world.hero.mesh.visible = false;
    world.hero.leo.visible = true;
    world.hero.leo.position.set(0, 0, 2.5);
    world.hero.leo.rotation.y = Math.PI;
    world.hero.x = 0;
    world.hero.z = 2.5;
    world.hero.speed = 0;
    const coupe = world.parked[0];
    coupe.position.set(0.6, 0, -3.5);
    coupe.rotation.y = 0.35;
    coupe.visible = true;
    world.police[0].position.set(-3.4, 0, -7);
    world.police[0].rotation.y = 0.2;
    setCameraPreset(world, 'onfoot');
    setPrompt('E — STEAL CAR');
    document.getElementById('dispatch-line').textContent = stagedDispatchLine();
    renderHUD(world);
    return { scene: world.scene, camera: world.camera };
  }

  if (name === 'map') {
    setCameraPreset(world, 'chase');
    renderHUD(world);
    renderMapOverlay(world);
    showOverlay('overlay-map', true);
    return { scene: world.scene, camera: world.camera };
  }

  if (name === 'garage') {
    if (buildShop) buildShop();
    renderMissionPassed(stagedMissionPassed());
    showOverlay('overlay-garage', true);
    document.getElementById('hud').style.display = 'none';
    return { scene: world.garageScene, camera: world.garageCamera };
  }

  // Default: the chase — low, close camera, hero BIG, tight 3-car contact.
  world.hero.speed = 73 / 3.6; // the HUD reads 73 KM/H in the frozen frame
  setCameraPreset(world, 'chase');
  setPrompt(null);
  document.getElementById('dispatch-line').textContent = stagedDispatchLine();
  renderHUD(world);
  return { scene: world.scene, camera: world.camera };
}
