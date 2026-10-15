---
name: pastel-lowpoly-art
description: Art direction and procedural assets for the pink pastel low-poly look. Use when creating colors, sky, fog, water, trees, flowers, houses, hearts, clouds, or the bird model.
---
# Pastel Low-Poly Art

## Rules
1. Palette tokens: grass `#b8f0c8`, pink meadow `#ffd1e6`, hills `#d9c2f5`, peaks `#fff0fa`, water `#9fdcf7`, sand `#fde8c9`, fog `#ffd9ec`, heart `#ff3d97`.
2. All 3D assets are procedural geometry with vertex colors; zero external models or textures.
3. Material style: `flatShading: true`, `MeshLambertMaterial` or unlit vertex color shaders.
4. Asset triangle limits: Tree ≤ 40 tris, Flower ≤ 8 tris, Dreamhouse ≤ 80 tris, Bird ≤ 150 tris.
5. Sky gradient dome rendered as single inverted sphere (1 draw call) lerping zenith to horizon.
6. Synchronize fog color with sky horizon color to seamlessly mask terrain draw edge.
7. Water is a single mesh plane with cheap procedural vertex/color shimmer.
8. Clouds: ≤ 10 small transparent sprites generated procedurally on a 64×64 canvas.
9. Day/dusk/night cycle smoothly interpolates light and fog uniforms (default 80s cycle).

## Snippets

### Sky Gradient Vertex Shader
```glsl
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

### Sky Gradient Fragment Shader
```glsl
uniform vec3 topColor;
uniform vec3 bottomColor;
varying vec3 vWorldPosition;
void main() {
  float h = normalize(vWorldPosition).y;
  gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
}
```

## Pitfalls
- Large textures bloat mobile memory; use procedural vertex colors instead.
- Disconnected fog and horizon colors reveal an ugly hard boundary line.

## Sources
- https://threejs.org/docs/#api/en/materials/ShaderMaterial (2026-10-15)
- https://threejs.org/docs/#api/en/scenes/Fog (2026-10-15)
