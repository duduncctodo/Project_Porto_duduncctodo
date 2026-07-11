# R3F Hologram Globe Background — Design

## Goal

Replace [BackgroundCanvas.jsx](../../../src/components/BackgroundCanvas.jsx) (currently hand-rolled Three.js: multi-section camera flight through landmark clusters) with a `@react-three/fiber` + `@react-three/drei` component: a single persistent neon-cyan hologram Earth with a satellite/arc network, whose rotation and camera depth respond to page scroll, plus subtle mouse parallax. Deep-black/dark-blue background throughout.

## Scope

Full rewrite of `src/components/BackgroundCanvas.jsx`. Adds two dependencies: `@react-three/fiber`, `@react-three/drei`. Keeps the existing external contract unchanged — default export `BackgroundCanvas({ revealed })`, mounted once at the top of `App.jsx`, full-viewport fixed layer behind all page content (`position: fixed; inset: 0; z-index: -1; pointer-events: none`), opacity driven by `revealed`.

Out of scope: the old per-section "fly past Work/Uni network clusters" choreography, `NAV_LINKS`-anchored camera curve, and the Earth-shrink/scatter Hero intro — all removed. This is a simpler, single continuous background, not a scripted flight.

## Component breakdown

One file, three internal components + the exported wrapper:

- **`BackgroundCanvas`** (exported) — fixed-position wrapper div + `<Canvas>` (dpr capped `[1, 1.5]`, no antialias, `camera={{ position: [0, 0, 26], fov: 50 }}`). Reads `prefers-reduced-motion`; if set, renders one static frame (`frameloop="demand"`, no scroll/mouse listeners attached).
- **`HologramGlobe`** — wireframe sphere shell (drei `<Sphere>`, `MeshBasicMaterial` wireframe, color `#00d2ff`, low opacity) + continent-silhouette particle cloud (drei `<Points>`/`<PointMaterial>`, additive blending, `#00d2ff`) + 8 pulsing hub markers at fixed lat/lon — San Francisco, New York, London, Dubai, Singapore, Tokyo, Sydney, São Paulo (small emissive spheres). Self-rotates every frame (`useFrame`); rotation speed/tilt read from a shared scroll-progress ref (see below).
- **`NetworkArcs`** — quadratic bezier curves (drei `<Line>` or `THREE.QuadraticBezierCurve3` + `<line>`) connecting hub pairs, plus small `<Points>` riding each curve (`curve.getPointAt(progress)`, progress += speed per frame, wraps at 1 → seamless loop), same additive-glow packet look as the current codebase's arc packets.
- **`CameraRig`** — no visible mesh; a `useFrame` component that lerps camera `position.z` (dolly-in) and passes rotation-speed/tilt multipliers to the globe based on scroll progress, and applies a small mouse-offset lerp to camera position.

## Scroll & mouse input

- Custom hook `useScrollProgress()`: one `scroll` listener (passive) updating a ref `scrollY / (document.documentElement.scrollHeight - innerHeight)`, clamped 0..1. **Not** drei's `<ScrollControls>`/`useScroll` — that hijacks page scroll via its own virtual scroll container, which would conflict with the Lenis smooth-scroll already driving `App.jsx`. Plain scroll listener reads the same DOM scroll Lenis produces.
- Mouse: one `pointermove` listener (passive) updating a ref with normalized `(x, y)` in **-1..1**; skipped entirely on touch devices (`matchMedia('(hover: none)')`), matching the existing app-wide parallax convention in `App.jsx`.
- Both refs are read inside `useFrame`, not React state — no re-renders from scroll/mouse movement.

## Visual parameters

- Background: canvas `alpha` transparent, no opaque scene background of its own — same approach as the current implementation. The "very dark" requirement is satisfied by the site's existing dark theme (`#131313`, the default — `isDark` starts `true` in `App.jsx`) showing through; the hologram is not designed against the light theme (`#f0f2f8`) and isn't expected to look right there. Not addressing that is a deliberate scope cut, not an oversight: the light theme isn't part of the original spec, and forcing an opaque dark scene background would fight the site's own theme toggle instead.
- Primary color: `#00d2ff` for wireframe, particles, hub markers, arcs, and packets — one accent color throughout, varying only in opacity, to read as a single coherent hologram rather than multiple palettes.
- Continent silhouette: hand-authored low-resolution land/ocean mask (~60x30 grid, embedded as a plain string constant) sampled to place particle points — an approximation, not pixel-accurate coastline data (no GIS dataset or texture asset exists in this project, and none is fetched over the network). Documented inline as a `ponytail:` upgrade point (swap for `three-globe` + real GeoJSON if pixel-accurate coastlines are ever needed).
- Glow: additive-blended `PointsMaterial`/`MeshBasicMaterial` only. No `@react-three/postprocessing` Bloom pass — avoids a third new dependency and an extra full-screen render pass for a decorative background layer. Noted as the upgrade point if a thicker glow is wanted later.

## Performance

- All geometry (sphere positions, particle positions, hub lat/lon → vec3, arc curves) built once via `useMemo`, never regenerated per frame.
- Single `useFrame` per component, no per-frame allocations (reuse typed arrays / Vector3 scratch objects).
- `frameloop="demand"` + one manual render when `prefers-reduced-motion` is set; otherwise default continuous loop, paused implicitly by the browser when the tab is backgrounded (React Three Fiber's default loop already no-ops via `requestAnimationFrame` semantics — no separate visibility-change handler needed, unlike the old manual `renderer`/`requestAnimationFrame` setup).

## Testing

Manual verification via dev server (`npm run dev`): confirm globe renders behind page content, rotation accelerates and camera dollies in while scrolling, mouse movement nudges the view subtly, `prefers-reduced-motion` shows a static frame, and no console errors from the new dependencies.
