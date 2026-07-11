# 3D Background: Signal → Network Morph

## Context

The portfolio (React + Vite + Three.js + Lenis) already has a full-page 3D
background (`src/components/BackgroundCanvas.jsx`): a generic random particle
network with random-pair edges and mouse parallax, rendered on a fixed
full-viewport canvas behind all sections (Hero, Intro, Work Experience, Uni
Things, Contact). The site belongs to a Computer Engineering student and
should reflect that domain (microcontrollers, computer networks) instead of a
generic particle effect, following the existing "Obsidian Technical" theme
(`reference/DESIGN.md`).

Goal: replace the background's visual concept and scroll behavior so it
narrates the CE domain, stays responsive, and works within the existing
Three.js/Lenis/IntersectionObserver setup without new dependencies.

## Chosen Design: Signal → Network Morph

A single set of `THREE.Points` starts arranged as an oscilloscope/sine-wave
shape (representing a raw microcontroller signal) at the Hero section. As the
user scrolls down through the page, each point's position interpolates from
its wave position to a position in a network-graph layout (representing a
computer network) — the visual itself narrates "from embedded signal to
networked system," tying the two CE themes (microcontroller, computer
networks) into one continuous scroll-driven animation.

### Morph mechanics

- `t = scrollY / documentHeight`, read directly inside the existing
  `animate()` rAF loop (no new scroll listener), smoothed with a lerp toward
  the target `t` each frame for continuity.
- Each point has two precomputed target positions: `wavePos` (on the sine
  wave) and `networkPos` (in the graph layout). Per frame, the point's
  render position is `lerp(wavePos, networkPos, smoothedT)`.
- Network layout: nodes connected via k-nearest-neighbor edges (not random
  pairs like the current implementation) so the end state reads as an
  intentional topology.

### Edges and data packets

- Edge lines (`THREE.LineSegments`, existing pattern) connect k-nearest
  neighbors in `networkPos` space.
- A subset of edges carry a moving "packet" — a bright point
  (additive blending) that lerps along the edge from one endpoint to the
  other, looping to a new random edge/speed on arrival.
- Both edges and packets fade in opacity as `smoothedT` increases — at `t=0`
  (Hero, wave state) they are invisible; by `t=1` (bottom of page, graph
  state) they are fully visible. This avoids showing "network connections"
  between points that are still visually a wave.

### Color

Consistent with `reference/DESIGN.md`:
- Nodes/packets: primary blue `#b0c6ff`, additive blending, matches existing
  "emit light" primary color usage.
- Edges: `#44464f` (outline-variant), low opacity — matches existing
  `lineMaterial` treatment.

### Camera

Camera stays relatively static: only the existing mouse-driven X/Y parallax
is retained, unchanged. No scroll-driven Z dolly. The morph itself is the
sole scroll-driven signal — combining a shape morph with a camera flythrough
was considered but rejected as visually noisy and heavier on mobile (see
Alternatives).

### Responsive behavior

- Point/edge count is tiered once at mount based on `window.innerWidth`
  (small / medium / full tiers) — not recomputed on resize/orientation
  change.
- Mobile: remove the `opacity: 0 !important` override in
  `src/index.css:263-267` that currently fully hides the canvas under
  768px. Replace with a lower base opacity (~0.3–0.4) so the 3D background
  stays visible on mobile without hurting text readability, paired with the
  smaller point/edge tier for performance.

### Implementation scope

- Rewrite `src/components/BackgroundCanvas.jsx` (still pure Three.js,
  no new dependency — `lenis`, `three` already installed).
- Small tweak to the mobile media query in `src/index.css`.
- No other components change; the background is global and covers all
  sections by construction (fixed full-viewport canvas already established).

### Explicitly skipped (YAGNI)

- Dynamic re-tiering of point/edge count on resize/orientation change —
  add if users actually rotate mid-scroll and it becomes a visible problem.
- Per-section reactivity (e.g., node color/intensity changing based on which
  section is active) — the morph progress already carries the scroll
  narrative; adding per-section sync would require wiring into the existing
  `IntersectionObserver` active-nav logic for marginal benefit.
- Separate "signal pulse" traveling along the wave curve before the network
  state — packets only activate once edges are meaningful (network state),
  rather than building a second pulse system for the wave state.

## Alternatives Considered

### 1. Generic network graph + camera depth-parallax (earlier direction)

The original direction before the pivot: nodes/edges laid out as a static
network graph from the start (no morph), with scroll driving a camera dolly
along Z to create a "flying through the network" sensation, plus mouse
parallax as already implemented.

Rejected in favor of the morph because it didn't narrate anything specific
to the CE domain — the network-graph shape was present for the entire scroll
with no connection to the "microcontroller" side of the brief, it was purely
atmospheric.

### 2. Exploded PCB Assembly

A 3D PCB board built from Three.js primitives (`BoxGeometry` for the board
and chip, `CylinderGeometry` for pins — no external model loading needed).
Starts fully assembled at Hero; scrolling down causes components to drift
apart ("exploded view") while rotating slowly, with trace lines lighting up
between them.

Most literal and visually "branded" option, and still asset-free (procedural
geometry only). Not chosen because solid meshes are heavier to render than
points, requiring more careful mobile performance tuning, and the user
preferred the lighter, more narrative morph concept.

### 3. Circuit Tunnel

Camera flies through a tunnel of glowing PCB-trace grid lines that pulse
with light, evoking a cyberpunk "signal traveling down a wire" feel,
matching the "Cyberpunk Brutalism" note already in `reference/DESIGN.md`.

Most dramatic/immersive option but purely atmospheric — no narrative arc
tying microcontroller and network themes together the way the morph does.
Not chosen for that reason.
