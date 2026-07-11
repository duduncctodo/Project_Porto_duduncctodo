# 3D Background: Network Graph + Depth Parallax

## Context

The portfolio (React + Vite + Three.js + Lenis) already has a full-page 3D
background (`src/components/BackgroundCanvas.jsx`): a generic random
particle network with random-pair edges and mouse parallax, rendered on a
fixed full-viewport canvas behind all sections (Hero, Intro, Work
Experience, Uni Things, Contact). The site belongs to a Computer Engineering
student and should reflect that domain (computer networks specifically)
instead of a generic particle effect, following the existing "Obsidian
Technical" theme (`reference/DESIGN.md`).

This was the first direction brainstormed for the background replacement —
a static network-graph topology present for the whole scroll, with camera
movement (not shape change) carrying the scroll narrative. It was later
superseded by a morph concept (see
[2026-07-11-3d-background-signal-network-morph-design.md](2026-07-11-3d-background-signal-network-morph-design.md))
that ties in the microcontroller side of the brief as well. This spec
documents the pure-network direction on its own, in case it's built instead
of, or before, the morph version.

## Design

### Visual: Network Graph

- Nodes: glowing points (`THREE.Points`), primary blue `#b0c6ff`, additive
  blending — matches the existing "emit light" primary color usage in
  `reference/DESIGN.md`.
- Edges: `THREE.LineSegments` connecting each node to its k-nearest
  neighbors (not random pairs like the current implementation), so the
  layout reads as an intentional topology rather than noise. Color
  `#44464f` (outline-variant), low opacity — reuses the existing
  `lineMaterial` treatment.
- Data packets: a subset of edges carry a moving "packet" — a bright point
  (additive blending, larger than a regular node) that lerps along the edge
  from one endpoint to the other, looping to a new random edge/speed on
  arrival. This is what makes the graph read as a live computer network
  rather than a static diagram.

### Scroll: Depth parallax

- `scrollY / documentHeight` is read directly inside the existing
  `animate()` rAF loop (no new scroll listener), lerped smoothly toward a
  target camera Z offset each frame — the camera "flies through" the graph
  as the page scrolls from Hero to Contact.
- Existing mouse-driven X/Y parallax is retained unchanged, layered on top
  of the scroll-driven Z movement.

### Responsive behavior

- Node/edge count is tiered once at mount based on `window.innerWidth`
  (small / medium / full tiers) — not recomputed on resize/orientation
  change.
- Mobile: remove the `opacity: 0 !important` override in
  `src/index.css:263-267` that currently fully hides the canvas under
  768px. Replace with a lower base opacity (~0.3–0.4) so the 3D background
  stays visible on mobile without hurting text readability, paired with the
  smaller node/edge tier for performance.

### Implementation scope

- Rewrite `src/components/BackgroundCanvas.jsx` (still pure Three.js,
  no new dependency — `lenis`, `three` already installed).
- Small tweak to the mobile media query in `src/index.css`.
- No other components change; the background is global and covers all
  sections by construction (fixed full-viewport canvas already established).

### Explicitly skipped (YAGNI)

- Dynamic re-tiering of node/edge count on resize/orientation change — add
  if users actually rotate mid-scroll and it becomes a visible problem.
- Per-section reactivity (e.g., node color/intensity changing based on which
  section is active) — the camera depth-parallax already carries the scroll
  narrative; adding per-section sync would require wiring into the existing
  `IntersectionObserver` active-nav logic for marginal benefit.

## Note

This direction is purely atmospheric — the network-graph shape is present
for the entire scroll with no visual tie to the microcontroller side of the
brief. If a narrative connecting both microcontroller and computer-network
themes is wanted, prefer the morph spec instead.
