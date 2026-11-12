/**
 * ============================================================================
 * 3A-GAME Input Management System (input.js)
 * 键鼠第一人称指针锁定、触屏虚拟摇杆与标准手柄控制器
 * ============================================================================
 */

// ============================================================================
// 一、 按键映射配置与敏感度常量 (Keymap & Sensitivity)
// ============================================================================

export const INPUT_KEYS = {
  KeyW:         'forward',
  KeyS:         'back',
  KeyA:         'left',
  KeyD:         'right',
  Space:        'jump',
  ShiftLeft:    'sprint',
  ShiftRight:   'sprint',
  KeyC:         'crouch',
  ControlLeft:  'crouch',
  ControlRight: 'crouch',
  KeyR:         'reload',
  KeyE:         'interact',
  KeyF:         'melee',
  KeyV:         'melee',
  Escape:       'pause',
  KeyP:         'pause',
  KeyQ:         'alt',
  Enter:        'fire',
  NumpadEnter:  'fire',
  ArrowLeft:    'turnL',
  ArrowRight:   'turnR',
  ArrowUp:      'turnU',
  ArrowDown:    'turnD',
  KeyJ:         'turnL',
  KeyL:         'turnR',
  KeyI:         'turnU',
  KeyK:         'turnD'
};

const MOUSE_SENSITIVITY_BASE = 0.0021;
const TOUCH_LOOK_SENSITIVITY = 0.0052;
const KEY_TURN_SPEED         = 2.1;
const GAMEPAD_TURN_SPEED     = 3.0;
const JOYSTICK_MAX_RADIUS    = 58;

const PASSTHROUGH_ACTIONS = { pause: 1 };

const GAMEPAD_BUTTON_MAP = {
  0:  'jump',
  1:  'crouch',
  2:  'reload',
  3:  'interact',
  5:  'melee',
  6:  'ads',
  7:  'fire',
  9:  'pause',
  10: 'sprint',
  11: 'melee'
};

// ============================================================================
// 二、 输入管理器工厂 (createInputManager)
// ============================================================================

export function createInputManager(engineCtx) {
  const canvasEl = (engineCtx.renderer && engineCtx.renderer.domElement) || document.getElementById('view');
  const uiContainer = document.getElementById('ui');

  const activeActions = new Set();
  const pressedOnceActions = new Set();

  const sourceSets = {
    key:   new Set(),
    mouse: new Set(),
    touch: new Set(),
    pad:   new Set()
  };

  let isGameplayActive = false;
  let hasLockedBefore = false;
  let lockRequestTime = 0;
  let lockErrorCount = 0;
  let mouseButtonMask = 0;
  const modeChangeListeners = [];

  const inputState = {
    move: { x: 0, y: 0 },
    look: { dx: 0, dy: 0 },
    fire: false,
    ads: false,
    sprint: false,
    crouch: false,
    locked: false,
    touch: false,
    gamepad: false,
    sensitivity: 1.0,
    invertY: false,
    mode: 'lock', // 'lock' | 'drag' | 'touch'

    down(action) {
      return activeActions.has(action) && (isGameplayActive || PASSTHROUGH_ACTIONS[action] === 1);
    },

    pressed(action) {
      return pressedOnceActions.has(action) && (isGameplayActive || PASSTHROUGH_ACTIONS[action] === 1);
    },

    update: updateInputFrame,
    endFrame: endInputFrame,
    requestLock: requestPointerLock,
    exitLock: exitPointerLock,

    setGameplay(active) {
      const boolVal = Boolean(active);
      if (boolVal !== isGameplayActive) {
        isGameplayActive = boolVal;
        if (!boolVal) resetAllInputs();
        if (touchUI) touchUI.root.classList.toggle('on', boolVal && inputState.touch);
      }
    },

    setPrompt(showInteract) {
      if (touchUI) {
        touchUI.btn.interact.classList.toggle('on', Boolean(showInteract));
      }
    },

    onModeChange(fn) {
      modeChangeListeners.push(fn);
    },

    describeMode() {
      if (inputState.mode === 'touch') return '触屏操作已启用';
      if (inputState.mode === 'drag') {
        return '鼠标捕获不可用：移动鼠标调整视角，停在屏幕边缘持续转向；点击开火；方向键或 IJKL 也可转向';
      }
      return inputState.locked ? '鼠标已捕获，按 Esc 释放' : '点击游戏画面以捕获鼠标';
    }
  };

  function setMode(newMode) {
    if (inputState.mode !== newMode) {
      inputState.mode = newMode;
      for (const fn of modeChangeListeners) {
        try {
          fn(newMode);
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  function setActionState(sourceType, action, isDown) {
    if (!action) return;
    const set = sourceSets[sourceType];
    if (isDown) {
      if (set.has(action)) return;
      set.add(action);
      if (!activeActions.has(action)) {
        activeActions.add(action);
        pressedOnceActions.add(action);
      }
    } else {
      if (!set.delete(action)) return;
      if (!sourceSets.key.has(action) &&
          !sourceSets.mouse.has(action) &&
          !sourceSets.touch.has(action) &&
          !sourceSets.pad.has(action)) {
        activeActions.delete(action);
      }
    }
  }

  function resetAllInputs() {
    for (const src in sourceSets) sourceSets[src].clear();
    activeActions.clear();
    mouseButtonMask = 0;
    touchAdsToggled = false;
    if (touchUI) {
      touchUI.btn.ads.classList.remove('active');
      resetTouchStick();
      touchLookId = -1;
      touchFireId = -1;
    }
  }

  // --------------------------------------------------------------------------
  // 1. 键盘事件监听 (Keyboard Listeners)
  // --------------------------------------------------------------------------

  window.addEventListener('keydown', (ev) => {
    const action = INPUT_KEYS[ev.code];
    if (!action) return;

    const targetTag = ev.target && ev.target.tagName;
    if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') return;
    if (targetTag === 'BUTTON' && (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'NumpadEnter')) {
      return;
    }

    if (isGameplayActive && (ev.code === 'Space' || ev.code.startsWith('Arrow') || ev.code === 'ControlLeft')) {
      ev.preventDefault();
    }
    if (!ev.repeat) {
      setActionState('key', action, true);
    }
  });

  window.addEventListener('keyup', (ev) => {
    const action = INPUT_KEYS[ev.code];
    if (action) {
      setActionState('key', action, false);
    }
  });

  window.addEventListener('blur', () => {
    resetAllInputs();
  });

  // --------------------------------------------------------------------------
  // 2. 鼠标与指针锁定 (Mouse & Pointer Lock)
  // --------------------------------------------------------------------------

  const mouseButtonToAction = (btn) => {
    if (btn === 0) return 'fire';
    if (btn === 2) return 'ads';
    if (btn === 1) return 'melee';
    return null;
  };

  canvasEl.addEventListener('mousedown', (ev) => {
    if (inputState.touch && performance.now() - lastTouchTime < 800) return;
    if (!isGameplayActive) return;

    if (!inputState.locked && inputState.mode === 'lock') {
      requestPointerLock();
      ev.preventDefault();
      return;
    }

    mouseButtonMask |= (1 << ev.button);
    setActionState('mouse', mouseButtonToAction(ev.button), true);
    ev.preventDefault();
  });

  window.addEventListener('mouseup', (ev) => {
    mouseButtonMask &= ~(1 << ev.button);
    setActionState('mouse', mouseButtonToAction(ev.button), false);
  });

  window.addEventListener('contextmenu', (ev) => {
    if (ev.target === canvasEl || isGameplayActive) {
      ev.preventDefault();
    }
  });

  let mouseNormX = 0.5;
  let mouseNormY = 0.5;
  let mouseInWindow = false;

  window.addEventListener('mousemove', (ev) => {
    if (isGameplayActive) {
      if (inputState.mode === 'drag') {
        mouseNormX = ev.clientX / Math.max(1, window.innerWidth);
        mouseNormY = ev.clientY / Math.max(1, window.innerHeight);
        mouseInWindow = true;
      }
      if (inputState.locked || inputState.mode === 'drag') {
        const mx = ev.movementX || 0;
        const my = ev.movementY || 0;
        if (Math.abs(mx) > 400 || Math.abs(my) > 400) return; // 过滤指针锁定瞬跳奇异值
        inputState.look.dx += mx * MOUSE_SENSITIVITY_BASE * inputState.sensitivity;
        inputState.look.dy += my * MOUSE_SENSITIVITY_BASE * inputState.sensitivity * (inputState.invertY ? -1 : 1);
      }
    }
  });

  document.addEventListener('pointerlockchange', () => {
    inputState.locked = (document.pointerLockElement === canvasEl);
    if (inputState.locked) {
      hasLockedBefore = true;
      lockRequestTime = 0;
      lockErrorCount = 0;
      if (!inputState.touch) setMode('lock');
    } else {
      sourceSets.mouse.clear();
      activeActions.delete('fire');
      activeActions.delete('ads');
      for (const k of sourceSets.key) activeActions.add(k);
      mouseButtonMask = 0;
    }
    engineCtx.events.emit('input:lock', { locked: inputState.locked });
  });

  document.addEventListener('pointerlockerror', () => {
    handlePointerLockError();
  });

  document.addEventListener('mouseleave', () => {
    mouseInWindow = false;
  });

  function handlePointerLockError() {
    lockRequestTime = 0;
    if (!inputState.locked && !inputState.touch) {
      lockErrorCount++;
      if (!hasLockedBefore) setMode('drag');
    }
  }

  function requestPointerLock() {
    if (inputState.touch || inputState.locked) return;
    if (!canvasEl.requestPointerLock) {
      handlePointerLockError();
      return;
    }
    try {
      lockRequestTime = performance.now();
      const p = canvasEl.requestPointerLock();
      if (p && p.catch) p.catch(() => handlePointerLockError());
    } catch {
      handlePointerLockError();
    }
    try {
      canvasEl.focus({ preventScroll: true });
    } catch {}
  }

  function exitPointerLock() {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch {}
  }

  // --------------------------------------------------------------------------
  // 3. 触屏虚拟按键与摇杆 (Touch Controls)
  // --------------------------------------------------------------------------

  let touchUI = null;
  let lastTouchTime = 0;
  let touchMoveId = -1;
  let stickStartX = 0;
  let stickStartY = 0;
  let stickAxisX = 0;
  let stickAxisY = 0;
  let touchLookId = -1;
  let lookStartX = 0;
  let lookStartY = 0;
  let touchFireId = -1;
  let fireStartX = 0;
  let fireStartY = 0;
  let touchAdsToggled = false;

  function buildTouchUI() {
    const root = document.createElement('div');
    root.className = 'touch';
    root.innerHTML = `
      <div class="t-stick"><i class="t-ring"></i><i class="t-nub"></i></div>
      <button class="t-btn t-fire" data-a="fire" aria-label="开火"><span>开火</span></button>
      <button class="t-btn t-ads" data-a="ads" aria-label="瞄准"><span>瞄准</span></button>
      <button class="t-btn t-reload" data-a="reload" aria-label="换弹"><span>换弹</span></button>
      <button class="t-btn t-jump" data-a="jump" aria-label="跳跃"><span>跳跃</span></button>
      <button class="t-btn t-interact" data-a="interact" aria-label="交互"><span>交互</span></button>
      <button class="t-btn t-pause" data-a="pause" aria-label="暂停"><span>暂停</span></button>
    `;
    uiContainer.appendChild(root);

    const sel = (s) => root.querySelector(s);
    const ui = {
      root,
      stick: sel('.t-stick'),
      nub:   sel('.t-nub'),
      btn: {
        fire:     sel('.t-fire'),
        ads:      sel('.t-ads'),
        reload:   sel('.t-reload'),
        jump:     sel('.t-jump'),
        interact: sel('.t-interact'),
        pause:    sel('.t-pause')
      }
    };

    for (const action in ui.btn) {
      const b = ui.btn[action];
      b.addEventListener('touchstart', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        lastTouchTime = performance.now();
        const touch = ev.changedTouches[0];

        if (action === 'ads') {
          touchAdsToggled = !touchAdsToggled;
          b.classList.toggle('active', touchAdsToggled);
          return;
        }

        if (action === 'fire') {
          touchFireId = touch.identifier;
          fireStartX = touch.clientX;
          fireStartY = touch.clientY;
        }

        b.classList.add('active');
        setActionState('touch', action, true);
      }, { passive: false });

      const onTouchEnd = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (action !== 'ads') {
          if (action === 'fire') {
            let matched = false;
            for (const t of ev.changedTouches) {
              if (t.identifier === touchFireId) matched = true;
            }
            if (!matched) return;
            touchFireId = -1;
          }
          b.classList.remove('active');
          setActionState('touch', action, false);
        }
      };

      b.addEventListener('touchend', onTouchEnd, { passive: false });
      b.addEventListener('touchcancel', onTouchEnd, { passive: false });

      b.addEventListener('touchmove', (ev) => {
        if (ev.preventDefault) ev.preventDefault();
        if (action === 'fire') {
          for (const t of ev.changedTouches) {
            if (t.identifier === touchFireId) {
              applyTouchLookDelta(t.clientX - fireStartX, t.clientY - fireStartY);
              fireStartX = t.clientX;
              fireStartY = t.clientY;
            }
          }
        }
      }, { passive: false });

      b.addEventListener('contextmenu', (ev) => ev.preventDefault());
    }

    return ui;
  }

  function applyTouchLookDelta(dx, dy) {
    inputState.look.dx += dx * TOUCH_LOOK_SENSITIVITY * inputState.sensitivity;
    inputState.look.dy += dy * TOUCH_LOOK_SENSITIVITY * inputState.sensitivity * (inputState.invertY ? -1 : 1);
  }

  function activateTouchMode() {
    if (!inputState.touch) {
      inputState.touch = true;
      exitPointerLock();
      if (!touchUI) touchUI = buildTouchUI();
      touchUI.root.classList.toggle('on', isGameplayActive);
      document.documentElement.classList.add('is-touch');
      setMode('touch');
    }
  }

  function resetTouchStick() {
    touchMoveId = -1;
    stickAxisX = 0;
    stickAxisY = 0;
    if (touchUI) touchUI.stick.classList.remove('on');
  }

  window.addEventListener('touchstart', () => {
    lastTouchTime = performance.now();
    activateTouchMode();
  }, { passive: true, capture: true });

  canvasEl.addEventListener('touchstart', (ev) => {
    ev.preventDefault();
    if (!isGameplayActive) return;

    for (const t of ev.changedTouches) {
      if (t.clientX < window.innerWidth * 0.45 && touchMoveId < 0) {
        touchMoveId = t.identifier;
        stickStartX = t.clientX;
        stickStartY = t.clientY;
        stickAxisX = 0;
        stickAxisY = 0;
        if (touchUI) {
          touchUI.stick.style.transform = `translate3d(${stickStartX}px,${stickStartY}px,0)`;
          touchUI.nub.style.transform = 'translate3d(0,0,0)';
          touchUI.stick.classList.add('on');
        }
      } else if (touchLookId < 0) {
        touchLookId = t.identifier;
        lookStartX = t.clientX;
        lookStartY = t.clientY;
      }
    }
  }, { passive: false });

  canvasEl.addEventListener('touchmove', (ev) => {
    ev.preventDefault();
    if (!isGameplayActive) return;

    for (const t of ev.changedTouches) {
      if (t.identifier === touchMoveId) {
        let dx = t.clientX - stickStartX;
        let dy = t.clientY - stickStartY;
        const dist = Math.hypot(dx, dy);
        if (dist > JOYSTICK_MAX_RADIUS) {
          dx *= JOYSTICK_MAX_RADIUS / dist;
          dy *= JOYSTICK_MAX_RADIUS / dist;
        }
        stickAxisX = dx / JOYSTICK_MAX_RADIUS;
        stickAxisY = -dy / JOYSTICK_MAX_RADIUS; // 上推为正
        if (touchUI) {
          touchUI.nub.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0)`;
        }
      } else if (t.identifier === touchLookId) {
        applyTouchLookDelta(t.clientX - lookStartX, t.clientY - lookStartY);
        lookStartX = t.clientX;
        lookStartY = t.clientY;
      }
    }
  }, { passive: false });

  const onTouchEndOrCancel = (ev) => {
    for (const t of ev.changedTouches) {
      if (t.identifier === touchMoveId) {
        resetTouchStick();
      } else if (t.identifier === touchLookId) {
        touchLookId = -1;
      }
    }
  };

  canvasEl.addEventListener('touchend', onTouchEndOrCancel, { passive: false });
  canvasEl.addEventListener('touchcancel', onTouchEndOrCancel, { passive: false });

  // --------------------------------------------------------------------------
  // 4. 标准手柄支持 (Standard Gamepad)
  // --------------------------------------------------------------------------

  const hasGamepadSupport = typeof navigator !== 'undefined' && Boolean(navigator.getGamepads);
  let padMoveX = 0;
  let padMoveY = 0;

  const applyDeadzone = (val) => {
    const absVal = Math.abs(val);
    return absVal < 0.16 ? 0 : Math.sign(val) * (absVal - 0.16) / 0.84;
  };

  function pollGamepad(dt) {
    padMoveX = 0;
    padMoveY = 0;
    if (!hasGamepadSupport) return;

    let gamepads;
    try {
      gamepads = navigator.getGamepads();
    } catch {
      return;
    }

    let activePad = null;
    for (let i = 0; gamepads && i < gamepads.length; i++) {
      const pad = gamepads[i];
      if (pad && pad.connected && pad.mapping === 'standard') {
        activePad = pad;
        break;
      }
    }

    if (!activePad) {
      if (inputState.gamepad) {
        inputState.gamepad = false;
        sourceSets.pad.clear();
      }
      return;
    }

    inputState.gamepad = true;
    padMoveX = applyDeadzone(activePad.axes[0] || 0);
    padMoveY = -applyDeadzone(activePad.axes[1] || 0);

    const lookX = applyDeadzone(activePad.axes[2] || 0);
    const lookY = applyDeadzone(activePad.axes[3] || 0);

    if (isGameplayActive) {
      inputState.look.dx += lookX * Math.abs(lookX) * GAMEPAD_TURN_SPEED * dt * inputState.sensitivity;
      inputState.look.dy += lookY * Math.abs(lookY) * GAMEPAD_TURN_SPEED * 0.7 * dt * inputState.sensitivity * (inputState.invertY ? -1 : 1);
    }

    for (const bIdx in GAMEPAD_BUTTON_MAP) {
      const btn = activePad.buttons[bIdx];
      const isPressed = Boolean(btn && (btn.pressed || btn.value > 0.4));
      setActionState('pad', GAMEPAD_BUTTON_MAP[bIdx], isPressed);
    }
  }

  // --------------------------------------------------------------------------
  // 5. 每帧主更新循环 (Per-Frame Update)
  // --------------------------------------------------------------------------

  function updateInputFrame(dt) {
    pollGamepad(dt);

    if (lockRequestTime && performance.now() - lockRequestTime > 1200 && !inputState.locked) {
      handlePointerLockError();
    }

    // 屏幕边缘自动旋转 (Edge Drag Mode)
    if (inputState.mode === 'drag' && isGameplayActive && mouseInWindow && !inputState.locked) {
      const edgeFactorX = mouseNormX < 0.12 ? -(0.12 - mouseNormX) / 0.12 :
                          mouseNormX > 0.88 ? (mouseNormX - 0.88) / 0.12 : 0;
      const edgeFactorY = mouseNormY < 0.10 ? -(0.10 - mouseNormY) / 0.10 :
                          mouseNormY > 0.90 ? (mouseNormY - 0.90) / 0.10 : 0;

      inputState.look.dx += edgeFactorX * 2.4 * dt * inputState.sensitivity;
      inputState.look.dy += edgeFactorY * 1.2 * dt * inputState.sensitivity * (inputState.invertY ? -1 : 1);
    }

    let moveX = 0;
    let moveY = 0;
    let sprintFlag = false;

    if (isGameplayActive) {
      moveX = (activeActions.has('right') ? 1 : 0) - (activeActions.has('left') ? 1 : 0);
      moveY = (activeActions.has('forward') ? 1 : 0) - (activeActions.has('back') ? 1 : 0);
      sprintFlag = activeActions.has('sprint');

      if (touchMoveId >= 0) {
        moveX += stickAxisX;
        moveY += stickAxisY;
        if (Math.hypot(stickAxisX, stickAxisY) > 0.93 && stickAxisY > 0.8) {
          sprintFlag = true;
        }
      }

      moveX += padMoveX;
      moveY += padMoveY;

      const moveLen = Math.hypot(moveX, moveY);
      if (moveLen > 1.0) {
        moveX /= moveLen;
        moveY /= moveLen;
      }

      // 键盘旋转转向 (Arrow Keys / IJKL)
      const turnH = (activeActions.has('turnR') ? 1 : 0) - (activeActions.has('turnL') ? 1 : 0);
      const turnV = (activeActions.has('turnD') ? 1 : 0) - (activeActions.has('turnU') ? 1 : 0);
      if (turnH) inputState.look.dx += turnH * KEY_TURN_SPEED * dt;
      if (turnV) inputState.look.dy += turnV * KEY_TURN_SPEED * 0.6 * dt;
    }

    inputState.move.x = moveX;
    inputState.move.y = moveY;
    inputState.fire = isGameplayActive && activeActions.has('fire');
    inputState.ads = isGameplayActive && (activeActions.has('ads') || touchAdsToggled);
    inputState.sprint = isGameplayActive && sprintFlag;
    inputState.crouch = isGameplayActive && activeActions.has('crouch');
  }

  function endInputFrame() {
    pressedOnceActions.clear();
    inputState.look.dx = 0;
    inputState.look.dy = 0;
  }

  return inputState;
}

export const create = createInputManager;
export { createInputManager as v_, INPUT_KEYS as h_ };
