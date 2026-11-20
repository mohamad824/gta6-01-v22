// One job: keyboard input. Keys are held in a set; discrete presses queue actions
// as a bitmask that the frame loop drains with takeActions() — in EVERY mode,
// including paused, so a queued pause action can always resume the game.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MAP = 4;
export const ACTION_GARAGE = 8;
export const ACTION_ENTER = 16;
export const ACTION_SHOOT = 32;
export const ACTION_NITRO = 64;
export const ACTION_WEAPON_1 = 128;
export const ACTION_WEAPON_2 = 256;
export const ACTION_WEAPON_3 = 512;
export const ACTION_WEAPON_4 = 1024;
export const ACTION_WEAPON_5 = 2048;
export const ACTION_JUMP = 4096;

const KEY_ACTIONS = {
  KeyP: ACTION_PAUSE,
  KeyM: ACTION_MAP,
  KeyG: ACTION_GARAGE,
  KeyE: ACTION_ENTER,
  KeyF: ACTION_SHOOT,
  Digit1: ACTION_WEAPON_1,
  Digit2: ACTION_WEAPON_2,
  Digit3: ACTION_WEAPON_3,
  Digit4: ACTION_WEAPON_4,
  Digit5: ACTION_WEAPON_5,
  Space: ACTION_JUMP,
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) {
      queued |= action;
      event.preventDefault();
    }
    if (event.code === 'Space') event.preventDefault();
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseDown(event) {
    // A click on the canvas is a confirm on menus and a shot in play.
    if (event.target === canvas) queued |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => held.clear());

  return {
    /** Drain and clear the queued action bitmask. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    isHeld(code) {
      return held.has(code);
    },
    /** Steering/drive intent: { fwd, steer, brake, nitro }. */
    drive() {
      return {
        fwd: (held.has('KeyW') ? 1 : 0) - (held.has('KeyS') ? 1 : 0),
        steer: (held.has('KeyA') ? 1 : 0) - (held.has('KeyD') ? 1 : 0),
        brake: held.has('Space'),
        nitro: held.has('ShiftLeft') || held.has('ShiftRight'),
      };
    },
    /** On-foot intent: { fwd, strafe, run }. */
    walk() {
      return {
        fwd: (held.has('KeyW') ? 1 : 0) - (held.has('KeyS') ? 1 : 0),
        strafe: (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0),
        run: held.has('ShiftLeft') || held.has('ShiftRight'),
      };
    },
  };
}
