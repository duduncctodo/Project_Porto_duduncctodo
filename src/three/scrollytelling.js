// Pure scroll math for the four-scene scrollytelling background.
// No React or three.js imports — fully unit-testable.

// One entry per scene, in page order. Each scene owns one or more of the
// page's section ids (from NAV_LINKS in src/data.js).
export const SCENE_SECTION_IDS = [['hero', 'intro'], ['work'], ['uni'], ['contact']]

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x))
}

function ramp(x, a, b) {
  return clamp((x - a) / (b - a), 0, 1)
}

// groups: one array of section rects ({ top, height } in document pixels)
// per scene, in page order. Returns contiguous bands — interior boundaries
// sit at the midpoint of the gap between adjacent scenes' sections, the
// first band starts at 0 and the last ends at the bottom of its sections,
// so every scroll position belongs to exactly one band.
export function buildBands(groups) {
  const spans = groups.map((sections) => ({
    top: Math.min(...sections.map((s) => s.top)),
    bottom: Math.max(...sections.map((s) => s.top + s.height)),
  }))
  return spans.map((span, i) => ({
    start: i === 0 ? 0 : (spans[i - 1].bottom + spans[i].top) / 2,
    end: i === spans.length - 1 ? span.bottom : (span.bottom + spans[i + 1].top) / 2,
  }))
}

// scrollCenter: scrollY + viewportHeight/2. fade: half-width of the
// crossfade zone in pixels. Weight is a trapezoid per band — rises over
// [start-fade, start+fade], full inside, falls over [end-fade, end+fade] —
// so two adjacent scenes always sum to 1 through a transition. The first
// band's start edge and last band's end edge are clamped fully on, so the
// page top/bottom never show an un-faded scene.
export function sceneStates(bands, scrollCenter, fade) {
  return bands.map(({ start, end }, i) => {
    const wIn = i === 0 ? 1 : ramp(scrollCenter, start - fade, start + fade)
    const wOut = i === bands.length - 1 ? 1 : 1 - ramp(scrollCenter, end - fade, end + fade)
    return {
      weight: Math.min(wIn, wOut),
      progress: clamp((scrollCenter - start) / (end - start), 0, 1),
    }
  })
}
