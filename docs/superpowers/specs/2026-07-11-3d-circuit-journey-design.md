# 3D Background: Circuit Journey (camera-path-per-section)

## Context

The site currently has the "pure network graph" background implemented
(`src/components/BackgroundCanvas.jsx`, see
[2026-07-11-3d-background-network-graph-design.md](2026-07-11-3d-background-network-graph-design.md)):
nodes with k-nearest-neighbor edges, moving data packets, and a camera Z
dolly driven by a single global scroll fraction. After building it, the
site is missing the microcontroller side of the Computer Engineering brief
entirely — the graph reads as generic network visualization with no
literal microcontroller presence, and the scroll effect is one continuous
camera move rather than a felt transition from the Hero section into the
sections below it.

This spec redesigns the background around two real-world reference
techniques found via research (see Sources): scroll progression mapped to
camera movement through a series of distinct per-section "scenes" (Codrops
scroll-driven 3D portfolio case study), and a literal circuit/PCB journey
metaphor that a user travels through as they scroll (JReyes MC's
Awwwards-honored "Educational Minecraft Folio", which uses a circuit-travel
conceit for its own scroll sections). Both are adapted to this project's
existing pure-Three.js stack — no GSAP, no Blender/GLTF assets, no new
dependencies (`three` and `lenis` already installed).

## Design: Circuit Journey

### Curve and scroll mapping

- A single `THREE.CatmullRomCurve3` built from a fixed list of control
  points, winding like a PCB trace (right-angle-ish bends achieved by
  control point placement, not literal 90° geometry).
- Scroll progress `t` along the curve is **weighted per section**, not a
  flat `scrollY / documentHeight` fraction: each section's DOM element
  (queried via the existing `NAV_LINKS` ids from `src/data.js`, the same
  pattern `App.jsx` already uses for its active-nav `IntersectionObserver`)
  contributes a proportional slice of `t` based on its rendered height. This
  makes each section a distinct "stop" along the curve rather than an
  arbitrary point in a continuous blend.
- `t` is smoothed with the same lerp-toward-target pattern already used in
  the current implementation (`smoothedT += (targetT - smoothedT) * 0.05`),
  read directly inside the existing `animate()` rAF loop — no new scroll
  listener.

### Camera

- Position: `curve.getPointAt(smoothedT)`.
- Look direction: `curve.getTangentAt(smoothedT)` — the camera faces along
  the direction of travel, producing a "flying through the circuit" feel
  (chosen over a fixed look-at-landmark approach for immersion, per
  research reference).
- Existing mouse-driven X/Y parallax is retained as a small offset added on
  top of the curve position, not a replacement for it.

### Landmarks per section

Built from primitive Three.js geometry only (no external models):

1. **Hero** — a microcontroller chip close-up: chip body (`BoxGeometry`,
   dark), rows of pins on two sides (`BoxGeometry` or `CylinderGeometry`).
   Trace lines emanate from the chip outward, establishing it as the
   "source" of the network.
2. **Intro** — camera pulls back enough to reveal the chip sitting on a
   thin flat PCB plane (simple textured/grid plane).
3. **Work Experience** — the trace arrives at a network-graph cluster
   (reuses the existing node + k-NN edge + moving-packet system from the
   current implementation, relocated to sit along the curve at this
   section's `t` range instead of filling the whole scene).
4. **Uni Things** — a second, distinct network-graph cluster further along
   the curve (same reused system, different cluster instance).
5. **Contact** — the curve terminates at a glowing "connector port" (a
   brighter, larger glowing point marking the end of the journey).

### Reuse from current implementation

The node/edge/packet system already built for the pure network graph is
**not discarded** — it becomes the Work Experience and Uni Things
landmarks instead of the entire background. The k-NN edge generation,
packet-lerp-along-edge animation, and color scheme
(`#b0c6ff` nodes/packets, `#44464f` edges) carry over unchanged.

### Responsive behavior

- Same tiering approach as the current implementation: node/edge counts
  per network-graph cluster, and chip pin count, are set once at mount
  based on `window.innerWidth` (small/medium/full tiers) — not recomputed
  on resize.
- Curve evaluation (`getPointAt`/`getTangentAt`) and section-weighted `t`
  calculation are cheap (O(1) per frame plus a one-time per-section
  `getBoundingClientRect` read), so this doesn't add meaningful cost over
  the current implementation on mobile.
- Current mobile opacity (~0.3–0.4, already active per the network-graph
  spec) is kept as-is.

### Implementation scope

- Rewrite `src/components/BackgroundCanvas.jsx` again: add the curve, the
  chip landmark geometry, section-weighted `t` calculation (reading
  section elements via `NAV_LINKS` ids from `src/data.js`), and reposition
  the existing network-graph system into two cluster instances along the
  curve instead of filling the whole scene.
- No new dependencies, no other component changes.

### Explicitly skipped (YAGNI)

- Snap-block scrolling at landmark transitions (used by the Codrops
  reference for "critical moments") — continuous scroll with
  section-weighted `t` is simpler and avoids fighting the existing Lenis
  smooth-scroll setup; add only if landmark transitions feel too blurry in
  practice.
- GLTF/Blender-modeled chip and PCB — primitive geometry (boxes/cylinders)
  keeps this dependency-free and matches the existing procedural approach;
  revisit only if the primitive look reads as too crude once built.
- Dynamic re-tiering or re-weighting `t` on resize — computed once at
  mount, consistent with the existing implementation's approach.

## Alternatives Considered

- **Signal → Network Morph**
  ([2026-07-11-3d-background-signal-network-morph-design.md](2026-07-11-3d-background-signal-network-morph-design.md)) —
  a single shape morphing from a signal wave into a network graph. Not
  chosen this round because the user wanted a felt transition *between*
  Hero and the sections below specifically, which a per-section camera
  journey communicates more directly than a shape morph with a static
  camera.
- **Simplified landmark-only version** — chip in Hero + the existing
  network graph filling the rest of the page, without a connecting curve
  or camera path. Considered lighter-weight, but rejected in favor of the
  full Circuit Journey per user's explicit approval of that direction.

## Sources

- [More Than a Portfolio: Building a Scroll-Driven 3D World with Something to Say (Codrops)](https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/)
- [JReyes MC Portfolio - Awwwards Honorable Mention](https://www.awwwards.com/sites/jreyes-mc-portfolio)
- [Best Three.js Websites & Portfolio Examples (CreativeDevJobs)](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025)
- [Scroll 3D Animation - Awwwards inspiration collection](https://www.awwwards.com/inspiration/scroll-3d-animation)
