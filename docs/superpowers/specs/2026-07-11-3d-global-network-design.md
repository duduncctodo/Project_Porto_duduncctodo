# 3D Background: Global Network (globe-and-hub journey)

## Context

The site's background (`src/components/BackgroundCanvas.jsx`) currently
implements "Circuit Journey" (see
[2026-07-11-3d-circuit-journey-design.md](2026-07-11-3d-circuit-journey-design.md)):
a microcontroller chip and PCB grid in the Hero/Intro sections, connected by
a camera path to two reused network-graph clusters and a final connector
point. That version leans on a Computer Engineering / chip-and-PCB metaphor.

This spec replaces the chip/PCB metaphor with a more universally recognizable
"computer network" visual — a rotating globe of nodes connected by arcs,
representing a global network — while **reusing the proven camera/scroll
mechanism from Circuit Journey almost unchanged**: the section-weighted `t`
along a fixed `CatmullRomCurve3`, the lerp-smoothing, the tiered
responsiveness, and — critically — the existing node/edge/packet cluster
system, which fits the new theme even better than the old one (a cluster now
reads as "the local network inside one global hub" rather than an arbitrary
landmark).

Research references (see Sources): Google Cloud's WebGL infrastructure
visualization (globe + arcs representing a global network), `three-globe` /
`globe.gl` community patterns for globe + arc rendering in Three.js (used
here as a pattern reference only — no new dependency is added; arcs and the
point-sphere are built from primitive Three.js the same way the existing
network clusters are).

## Design: Global Network

### Story mapping (per section)

1. **Hero** — A globe made of points (Fibonacci-sphere distribution, even
   coverage, no geographic texture — an abstract "network globe" not a
   literal Earth) with a handful of brighter/larger **hub markers** and
   curved **arcs** (`QuadraticBezierCurve3`, elevated midpoint, sampled into
   a `Line`) connecting hub pairs — read as a global network backbone. The
   globe self-rotates slowly and continuously (independent of scroll,
   `group.rotation.y += delta` each frame) for a "live network" feel. Camera
   starts pulled back, seeing the whole globe.
2. **Intro** — Camera moves toward one specific hub marker on the globe
   (the same hub marker mesh, enlarged/brighter than the others) — reads as
   "entering" one node of the network.
3. **Work Experience** — Camera passes through that hub into a network-graph
   cluster (the existing `createNetworkCluster` system, unchanged) — the
   "local network" inside that global hub.
4. **Uni Things** — A second, distinct cluster instance at a different point
   along the curve — a different hub's local network.
5. **Contact** — Curve terminates at the existing glowing connector point
   (unchanged from Circuit Journey) — the end of the journey.

Mouse-driven X/Y parallax offset, per-tier responsive counts
(sm/md/lg), and mobile canvas opacity all carry over unchanged from the
current implementation.

### Reuse vs. new code

Reused **unchanged**: `createNetworkCluster` (both cluster instances),
the connector point, the section-weighted `t` calculation
(`targetTFromScroll`, reading `NAV_LINKS` section elements), the lerp
smoothing pattern, the mouse parallax offset, the resize handler, the
tiering-by-viewport-width-at-mount approach.

New/changed:

- `createChip()` → `createGlobe(pointCount, hubCount)`: replaces the chip
  body/pins/traces with a `Points` sphere (Fibonacci distribution) plus
  `hubCount` brighter marker points and `Line`-based arcs connecting random
  hub pairs. Same color palette as the rest of the scene (`#b0c6ff` points,
  `#eaf0ff` for the brightest hub, `#44464f`/low-opacity for arcs) — no new
  colors introduced.
- The `GridHelper` (Circuit Journey's "Intro" PCB-plane landmark) is
  replaced by a single enlarged/brighter hub-marker mesh — the "entry
  point" the camera zooms toward during the Intro section. It is one of the
  markers already produced by `createGlobe`, just referenced separately so
  it can be repositioned as its own landmark at the Intro curve anchor.
- Curve control points (`CatmullRomCurve3`) are adjusted so the path orbits
  around the globe first before diving toward the hub/cluster landmarks,
  instead of the straight PCB-trace-style path used in Circuit Journey. The
  curve mechanism itself (`getPointAt`/`getTangentAt`, section-weighted
  anchors) is not changed.

### Responsive / performance

Identical approach to Circuit Journey: globe point count and hub count are
tiered once at mount by `window.innerWidth` (sm/md/lg), not recomputed on
resize. Globe self-rotation and curve evaluation are both O(1)-ish per
frame, no added cost of consequence over the current implementation.

### Implementation scope

- Edit `src/components/BackgroundCanvas.jsx` only: replace `createChip`
  with `createGlobe`, remove the standalone `GridHelper`, adjust curve
  control points, wire the new hub-marker landmark into the existing
  `landmarkTargets` positioning loop. `createNetworkCluster`, the connector,
  and the scroll/animate logic are untouched.
- No new dependencies, no other component changes.

### Explicitly skipped (YAGNI)

- Real Earth texture/geography on the globe — an abstract point-globe reads
  as "network," not "map," and avoids sourcing/loading a texture asset;
  revisit only if the abstract look reads as unclear in practice.
- A separate "traveling pulse" animation along the arcs — the existing
  packet-along-edge animation inside each network cluster already
  communicates data movement; an arc-pulse would be a second, redundant
  system for the same idea.
- `three-globe` / `globe.gl` as a dependency — used only as a research
  reference; the existing primitive-geometry approach (already used for
  clusters) covers the same visual with zero new dependencies.
- Dynamic re-tiering on resize — consistent with the current
  implementation's mount-once tiering.

## Alternatives Considered

- **Fiber-Optic Tunnel** — camera flies down a glowing light tunnel, with
  section transitions as tunnel "rooms." Structurally very close to Circuit
  Journey (still a curve-through-a-tube feel); rejected in this round in
  favor of a more visually distinct metaphor (globe/hub vs. tunnel/curve).
- **Data Center Server Rack** — camera flies between glowing server racks
  ending at a core switch. Most literal "network infrastructure" visual,
  but rack/LED/cable geometry is harder to read cleanly from primitive
  Three.js shapes without looking crude; rejected in favor of the
  simpler, cleaner point/arc globe.

## Sources

- [How we built the Google Cloud Infrastructure WebGL experience (Hello Monday, Medium)](https://medium.com/@hellomondaycom/how-we-built-the-google-cloud-infrastructure-webgl-experience-dec3ce7cd209)
- [three-globe (GitHub)](https://github.com/vasturiano/three-globe)
- [globe.gl](https://globe.gl/)
- [Interactive 3D Globe (Three.js + GLSL + GSAP) — CodePen](https://codepen.io/ksenia-k/pen/QWadgoY)
- [More Than a Portfolio: Building a Scroll-Driven 3D World with Something to Say (Codrops)](https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/)
