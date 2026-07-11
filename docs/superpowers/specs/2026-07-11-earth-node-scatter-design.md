# Earth-to-Network Scatter Intro — Design

## Goal

Rework the Hero landmark in [BackgroundCanvas.jsx](../../../src/components/BackgroundCanvas.jsx) so it reads as: a stylized Earth carrying network nodes → moves to screen center as the user scrolls Hero → Earth shrinks away while its nodes widen out and break apart into a random scatter. Mouse parallax must stay off for the whole earth→scatter sequence so it never fights the 3D choreography, and only turns on once the nodes have finished scattering.

## Scope

Single file: `createGlobe()` and the `animate()` loop in `BackgroundCanvas.jsx`. No new dependencies, no external texture/model assets (stylized/procedural look, chosen over a photo-real textured sphere to avoid runtime asset fetch/CORS and to stay consistent with the existing dot/line/additive-glow aesthetic). `createNetworkCluster`, the curve, and the rest of the scroll choreography are unchanged.

## Structure

`createGlobe()` currently returns one flat `group` containing: fibonacci point cloud, hub marker meshes, arcs between hubs, and arc packets — all scaled/faded together. Split into two child groups under the same `group` (so existing position logic in `animate()` needs no change):

- **`earthGroup`** — the planet body: a thin wireframe sphere (lat/long grid) plus a faint solid fill sphere for a sense of mass, and the existing hub markers + arcs + arc packets (the "structured backbone" stays attached to the planet, not the scatter). This group's `scale` animates from 1 → 0 as Hero progresses — this is the "Earth shrinks" beat.
- **`nodeGroup`** — the existing fibonacci point cloud, reinterpreted as the atmosphere/network nodes. Each point gets a precomputed random scatter target (wider spread than the sphere radius). A new `updateScatter(t)` method lerps every point from its sphere position toward its scatter target as `t` (0→1) advances, and leaves `nodeGroup.scale` at 1 (not shrunk) — this is the "nodes widen and break apart" beat, visually growing relative to the shrinking earth beside it.

Both groups continue to be children of `globe.group`, which keeps handling overall position (move-to-center) and self-rotation exactly as today.

## Driving the animation

Reuse `heroEase` (already computed each frame in `animate()` from `smoothedT / heroEndT`, eased) as the single driver:

- `earthGroup.scale.setScalar(1 - heroEase)` — was `globe.group.scale.setScalar(1 - heroEase * 0.82)` applied to everything; now only the earth body shrinks, fully to 0 by the time Hero ends.
- `globe.updateScatter(heroEase)` — lerps `nodeGroup` point positions sphere→scatter using `heroEase` as the interpolation factor.
- Existing `globe.setFade(...)` fade-out threshold (>0.6 of heroLocalT) is kept as-is so the scattered cloud still dissolves before the camera reaches the network clusters further down the curve — it now fades a widened/scattered cloud instead of a shrunk sphere, but the fade mechanism itself doesn't change.

## Parallax gating

`targetX`/`targetY` (mouse-driven camera offset, currently added unconditionally every frame) get multiplied by `heroEase`: 0 while Earth is shrinking/scattering, ramping to 1 exactly as `heroEase` saturates at 1 (i.e., once the scatter finishes and Hero's done). No new state needed — `heroEase` already reaches 1 and stays there for the rest of the scroll, so parallax is simply off during the intro and free afterward.

## Out of scope

- No changes to `createNetworkCluster`, `workCluster`/`uniCluster`, the curve, or section-anchor logic.
- No textured/GLTF Earth asset (stylized procedural chosen explicitly).
- No new packet/arc systems — existing hub/arc/packet code is reused as-is inside `earthGroup`.
