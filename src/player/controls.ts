export interface ControlState {
  forward: number; // [-1, 1]
  strafe: number; // [-1, 1]
  yawDelta: number; // radians
  pitchDelta: number; // radians
  boost: boolean;
  ascend: boolean;
  descend: boolean;
}

export class FlightControls {
  public isGrounded = false;

  public state: ControlState = {
    forward: 0,
    strafe: 0,
    yawDelta: 0,
    pitchDelta: 0,
    boost: false,
    ascend: false,
    descend: false
  };

  private keys = new Set<string>();
  private joystickPointerId: number | null = null;
  private joystickOrigin = { x: 0, y: 0 };
  private joystickCurrent = { x: 0, y: 0 };
  private lookPointerId: number | null = null;
  private lookLast = { x: 0, y: 0 };

  private joystickKnob: HTMLElement | null = null;
  private joystickBase: HTMLElement | null = null;
  private boostButton: HTMLElement | null = null;

  private isPointerLocked = false;
  private deadzone = 0.12;
  private maxRadius = 55; // px

  constructor(container: HTMLElement) {
    if (typeof document === 'undefined') return;

    this.setupTouchUI(container);
    this.bindEvents(container);
  }

  private setupTouchUI(container: HTMLElement): void {
    // Virtual joystick base & knob
    this.joystickBase = document.createElement('div');
    this.joystickBase.style.position = 'absolute';
    this.joystickBase.style.bottom = '28px';
    this.joystickBase.style.left = '28px';
    this.joystickBase.style.width = '110px';
    this.joystickBase.style.height = '110px';
    this.joystickBase.style.borderRadius = '50%';
    this.joystickBase.style.background = 'rgba(255, 255, 255, 0.45)';
    this.joystickBase.style.border = '2px solid rgba(255, 180, 210, 0.7)';
    this.joystickBase.style.display = 'none';
    this.joystickBase.style.pointerEvents = 'none';
    this.joystickBase.style.zIndex = '20';

    this.joystickKnob = document.createElement('div');
    this.joystickKnob.style.position = 'absolute';
    this.joystickKnob.style.width = '46px';
    this.joystickKnob.style.height = '46px';
    this.joystickKnob.style.borderRadius = '50%';
    this.joystickKnob.style.background = 'rgba(255, 77, 148, 0.85)';
    this.joystickKnob.style.top = '32px';
    this.joystickKnob.style.left = '32px';
    this.joystickBase.appendChild(this.joystickKnob);
    container.appendChild(this.joystickBase);

    // Boost button (bottom right)
    this.boostButton = document.createElement('button');
    this.boostButton.textContent = '🚀';
    this.boostButton.style.position = 'absolute';
    this.boostButton.style.bottom = '32px';
    this.boostButton.style.right = '32px';
    this.boostButton.style.width = '64px';
    this.boostButton.style.height = '64px';
    this.boostButton.style.borderRadius = '50%';
    this.boostButton.style.background = 'rgba(255, 255, 255, 0.75)';
    this.boostButton.style.border = '3px solid #ff4d94';
    this.boostButton.style.fontSize = '24px';
    this.boostButton.style.cursor = 'pointer';
    this.boostButton.style.zIndex = '20';
    this.boostButton.style.touchAction = 'none';

    this.boostButton.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.state.boost = true;
    });
    this.boostButton.addEventListener('pointerup', () => {
      this.state.boost = false;
    });
    this.boostButton.addEventListener('pointercancel', () => {
      this.state.boost = false;
    });
    container.appendChild(this.boostButton);

    // Ascend button (flap upward)
    const ascendButton = document.createElement('button');
    ascendButton.textContent = '🪽';
    ascendButton.style.position = 'absolute';
    ascendButton.style.bottom = '106px';
    ascendButton.style.right = '32px';
    ascendButton.style.width = '58px';
    ascendButton.style.height = '58px';
    ascendButton.style.borderRadius = '50%';
    ascendButton.style.background = 'rgba(255, 255, 255, 0.75)';
    ascendButton.style.border = '3px solid #ffa6d2';
    ascendButton.style.fontSize = '22px';
    ascendButton.style.cursor = 'pointer';
    ascendButton.style.zIndex = '20';
    ascendButton.style.touchAction = 'none';

    ascendButton.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.state.ascend = true;
    });
    ascendButton.addEventListener('pointerup', () => {
      this.state.ascend = false;
    });
    ascendButton.addEventListener('pointercancel', () => {
      this.state.ascend = false;
    });
    container.appendChild(ascendButton);

    // Descend button (swoop / land)
    const descendButton = document.createElement('button');
    descendButton.textContent = '🔽';
    descendButton.style.position = 'absolute';
    descendButton.style.bottom = '174px';
    descendButton.style.right = '32px';
    descendButton.style.width = '58px';
    descendButton.style.height = '58px';
    descendButton.style.borderRadius = '50%';
    descendButton.style.background = 'rgba(255, 255, 255, 0.75)';
    descendButton.style.border = '3px solid #ffa6d2';
    descendButton.style.fontSize = '22px';
    descendButton.style.cursor = 'pointer';
    descendButton.style.zIndex = '20';
    descendButton.style.touchAction = 'none';

    descendButton.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.state.descend = true;
    });
    descendButton.addEventListener('pointerup', () => {
      this.state.descend = false;
    });
    descendButton.addEventListener('pointercancel', () => {
      this.state.descend = false;
    });
    container.appendChild(descendButton);
  }

  private bindEvents(container: HTMLElement): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    container.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);

    // Desktop pointer lock
    container.addEventListener('click', () => {
      if (!this.isTouchDevice() && document.pointerLockElement !== container) {
        container.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === container;
    });
  }

  private isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (e.code === 'Space') {
      this.state.ascend = true;
      this.state.boost = true;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyC') {
      this.state.descend = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    if (e.code === 'Space') {
      this.state.ascend = false;
      this.state.boost = false;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyC') {
      this.state.descend = false;
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    const isLeftHalf = e.clientX < window.innerWidth * 0.5;

    if (isLeftHalf && this.joystickPointerId === null) {
      this.joystickPointerId = e.pointerId;
      this.joystickOrigin.x = e.clientX;
      this.joystickOrigin.y = e.clientY;
      this.joystickCurrent.x = e.clientX;
      this.joystickCurrent.y = e.clientY;

      if (this.joystickBase) {
        this.joystickBase.style.left = `${e.clientX - 55}px`;
        this.joystickBase.style.top = `${e.clientY - 55}px`;
        this.joystickBase.style.bottom = 'auto';
        this.joystickBase.style.display = 'block';
        if (this.joystickKnob) {
          this.joystickKnob.style.transform = 'translate(0px, 0px)';
        }
      }
    } else if (!isLeftHalf && this.lookPointerId === null) {
      this.lookPointerId = e.pointerId;
      this.lookLast.x = e.clientX;
      this.lookLast.y = e.clientY;
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.isPointerLocked) {
      this.state.yawDelta -= e.movementX * 0.0022;
      this.state.pitchDelta -= e.movementY * 0.0022;
      return;
    }

    if (e.pointerId === this.joystickPointerId) {
      this.joystickCurrent.x = e.clientX;
      this.joystickCurrent.y = e.clientY;

      const dx = this.joystickCurrent.x - this.joystickOrigin.x;
      const dy = this.joystickCurrent.y - this.joystickOrigin.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        const norm = Math.min(dist / this.maxRadius, 1.0);
        if (norm > this.deadzone) {
          const scaled = (norm - this.deadzone) / (1.0 - this.deadzone);
          this.state.strafe = (dx / dist) * scaled;
          this.state.forward = -(dy / dist) * scaled; // Up on joystick is forward
        } else {
          this.state.strafe = 0;
          this.state.forward = 0;
        }

        const clampedDist = Math.min(dist, this.maxRadius);
        const knobX = (dx / dist) * clampedDist;
        const knobY = (dy / dist) * clampedDist;
        if (this.joystickKnob) {
          this.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
        }
      }
    } else if (e.pointerId === this.lookPointerId) {
      const dx = e.clientX - this.lookLast.x;
      const dy = e.clientY - this.lookLast.y;
      this.lookLast.x = e.clientX;
      this.lookLast.y = e.clientY;

      this.state.yawDelta -= dx * 0.0035;
      this.state.pitchDelta -= dy * 0.0035;
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.state.forward = 0;
      this.state.strafe = 0;
      if (this.joystickBase) this.joystickBase.style.display = 'none';
      if (this.joystickKnob) this.joystickKnob.style.transform = 'translate(0px, 0px)';
    } else if (e.pointerId === this.lookPointerId) {
      this.lookPointerId = null;
    }
  };

  public update(): void {
    // Process keyboard inputs if active
    let kbForward = 0;
    let kbStrafe = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) kbForward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) kbForward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kbStrafe += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kbStrafe -= 1;

    if (kbForward !== 0 || kbStrafe !== 0) {
      this.state.forward = kbForward;
      this.state.strafe = kbStrafe;
    }

    if (this.keys.has('Space')) {
      this.state.ascend = true;
      this.state.boost = true;
    }
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('KeyC')) {
      this.state.descend = true;
    }
  }

  public consumeLookDeltas(): { yaw: number; pitch: number } {
    const yaw = this.state.yawDelta;
    const pitch = this.state.pitchDelta;
    this.state.yawDelta = 0;
    this.state.pitchDelta = 0;
    return { yaw, pitch };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
  }
}
