# Network Scrollytelling Background — Design Spec

**Date:** 2026-07-13
**Status:** Approved
**Supersedes:** the hologram-globe explode background (`docs/superpowers/specs/2026-07-11-r3f-hologram-globe-design.md`) — its shrink/explode behavior is removed entirely.

## Goal

Replace the current neon-hologram globe background with a four-scene, computer-network-themed 3D scrollytelling background in a realistic/photorealistic style. Each page section gets its own scene; scrolling crossfades between scenes with a forward camera dolly.

## Story (top to bottom)

| Page section(s) | Scene | Content |
|---|---|---|
| `#hero` + `#intro` | **EarthScene** | Photoreal night Earth: NASA 2K textures (day map, night-lights emissive, cloud layer), fresnel atmosphere glow, star field, sun directional light. Connection arcs between the 8 existing `HUBS` cities with traveling packet dots. Slow rotation + mouse parallax. |
| `#work` | **DataCenterScene** | Procedural server-rack aisle: instanced rack boxes with PBR metal materials, randomly blinking emissive LED strips, cool blue point lights, light fog. Camera slides along the aisle driven by local section progress. |
| `#uni` | **TopologyScene** | 3D network graph: glossy PBR sphere nodes connected by line edges, glowing packets flowing along edges. |
| `#contact` | **SignalScene** | Thousands of particles spiraling/converging into one glowing core sphere with pulse rings — "all connections meet here". |

## Transitions

- Camera dollies forward continuously with overall scroll; each scene crossfades in/out over a transition zone (~15% of viewport height) at section boundaries.
- Scene weight and local progress are **pure functions of scroll position** — scrolling back up exactly reverses everything. No latched or time-based one-way state.
- At most 2 scenes have weight > 0 at any moment; scenes with weight 0 are not rendered.

## Architecture

- **Modify** `src/components/BackgroundCanvas.jsx` — rewrite as the scene manager. External contract unchanged: default export, `revealed` boolean prop, fixed full-viewport layer (`position: fixed; z-index: -1; pointer-events: none`). `App.jsx` untouched.
- **Create** `src/three/scrollytelling.js` — pure logic, no React/three imports: given section rects (top/height per section id) and scrollY, return per-scene `{ weight, localProgress }`. Unit-tested with Vitest.
- **Create** `src/components/scenes/EarthScene.jsx`, `DataCenterScene.jsx`, `TopologyScene.jsx`, `SignalScene.jsx` — each receives `{ weight, localProgress, pointer }` refs and renders nothing when its weight is 0.
- **Reuse** `src/three/globeGeo.js` (`HUBS`, `latLonToVector3`) for the Earth scene arcs. `sampleLandPoints` and the explode/burst code paths in the old `BackgroundCanvas` are deleted.
- Section rects are measured from the DOM (`NAV_LINKS` ids) on load and resize; scroll listener stays a plain `window` listener (no drei `ScrollControls` — conflicts with Lenis).

## Dependencies & assets

- **Add** `@react-three/postprocessing` — `Bloom` for realistic glow, subtle `Vignette`.
- **Add** NASA-derived 2K Earth textures (public domain, from the three.js examples repo) committed to `public/textures/`: day map, night lights, clouds (~2–3 MB total). No runtime fetching from external hosts.
- Server racks and topology nodes are procedural geometry (instanced meshes) — no 3D model files.

## Performance & accessibility

- `dpr [1, 1.5]`, `antialias: false` (bloom hides aliasing).
- Particle/instance counts scale with viewport width; Bloom disabled below 640px width.
- `prefers-reduced-motion: reduce` → `frameloop="demand"` static render (existing behavior kept).
- Textures load via Suspense; the page never blocks on them.

## Error handling

- Missing/failed texture → Suspense keeps the scene unmounted rather than crashing the canvas; the rest of the page is unaffected (background is decorative).

## Testing

- Vitest unit tests for `scrollytelling.js` (band mapping, weight trapezoid, local progress, reversibility).
- Existing `globeGeo.test.js` must keep passing.
- Visual/interaction QA is manual via `npm run dev` (scroll through all four scenes, mouse parallax, reduced-motion, mobile viewport).
