---
name: mobile-controls-fp-camera
description: First-person flight camera and mobile controls. Use when handling touch, joystick, look, gyro, keyboard/mouse, camera smoothing, boost, altitude clamping, or motion comfort.
---
# Mobile Controls & First-Person Camera

## Rules
1. Set `touch-action: none` on the container; prevent default touch actions to eliminate page scroll and zoom.
2. Track multi-touch using pointer IDs; split screen into left (virtual joystick) and right (drag look).
3. Apply 0.12 joystick deadzone; apply exponential smoothing (`lerp`) to flight velocity.
4. Keep the horizon strictly level (zero roll rotation); lock camera FOV to 72° (range 70°–75°).
5. Enforce altitude clamp: `camera.position.y = Math.max(heightAt(x, z) + 2.0, camera.position.y)`.
6. Support pointer lock on desktop via `canvas.requestPointerLock()` and standard WASD controls.
7. Support optional gyro-look via `DeviceOrientationEvent` (request permission when on iOS).
8. Respect CSS safe-area insets (`env(safe-area-inset-top)`, etc.) for HUD and joystick positioning.
9. Never allocate objects in touch or animation handlers.

## Snippets

### Joystick Deadzone & Clamp
```ts
export function applyDeadzone(dx: number, dy: number, radius = 50, deadzone = 0.12) {
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { x: 0, y: 0 };
  const norm = Math.min(dist / radius, 1.0);
  if (norm < deadzone) return { x: 0, y: 0 };
  const scaled = (norm - deadzone) / (1.0 - deadzone);
  return { x: (dx / dist) * scaled, y: (dy / dist) * scaled };
}
```

### Altitude Clamping
```ts
export function clampAltitude(pos: THREE.Vector3, groundY: number, clearance = 2.0): void {
  const minY = groundY + clearance;
  if (pos.y < minY) pos.y = minY;
}
```

## Pitfalls
- Camera roll induces rapid motion sickness on mobile screens; keep roll locked at 0.
- Missing `touch-action: none` causes pinch-to-zoom to break touch coordinate mapping.

## Sources
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events (2026-10-15)
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API (2026-10-15)
