# Mobile Controls & First-Person Camera Research
Date: 2026-10-15
Sources:
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
- https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent

Key Findings:
1. Pointer Events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) unify mouse, stylus, and multi-touch.
2. CSS `touch-action: none` on the container prevents browser scroll, pinch-zoom, and pull-to-refresh gestures.
3. Track active pointers by `event.pointerId` to cleanly separate left virtual joystick from right look/drag.
4. Apply a minimum deadzone of 0.12 on virtual joystick inputs to eliminate drift and micro-jitter.
5. Lock camera roll to 0.0 (keep horizon level) and maintain FOV between 70° and 75° to minimize simulator sickness.
6. Minimum flight altitude clamp: `camera.position.y = Math.max(terrainHeight + 2.0, camera.position.y)`.
7. Desktop fallback utilizes Pointer Lock API (`canvas.requestPointerLock()`) for mouselook and WASD/arrow keys.
8. DeviceOrientationEvent enables optional gyro look controls on supported hardware (requires permission request on iOS 13+).
