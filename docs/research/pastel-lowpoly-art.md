# Pastel Low-Poly Art & Procedural Shaders Research
Date: 2026-10-15
Sources:
- https://threejs.org/docs/#api/en/materials/ShaderMaterial
- https://threejs.org/docs/#api/en/scenes/Fog
- https://threejs.org/docs/#api/en/objects/Sprite

Key Findings:
1. Low-poly aesthetic is achieved with `flatShading: true` and vertex colors without image textures.
2. Atmospheric fog color matching the horizon color unifies low-draw-distance scenes.
3. Sky gradient dome can be rendered in a single draw call with inverted sphere and vertex shader lerp.
4. Water is rendered with a single flat plane using simple sine-wave vertex displacement or UV color shimmer.
5. Soft cloud puffs can be generated procedurally into tiny 64x64 OffscreenCanvas / Canvas2D textures at startup and rendered as lightweight THREE.Sprite instances.
6. Lighting is dominated by a gentle HemisphereLight (warm pink sky / mint ground) and subtle directional light.
7. Triangle budgets:
   - Tree canopy + trunk: ≤ 40 triangles
   - Flower: ≤ 8 triangles
   - Dreamhouse: ≤ 80 triangles
   - Bird player/companion: ≤ 150 triangles
8. Day/dusk/night cycle smoothly interpolates light and fog color uniforms over an 80-second loop.
