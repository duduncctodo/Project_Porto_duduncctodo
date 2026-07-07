---
name: Obsidian Technical
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c5c6d0'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e909a'
  outline-variant: '#44464f'
  surface-tint: '#b0c6ff'
  primary: '#d9e2ff'
  on-primary: '#162f5e'
  primary-container: '#b0c6ff'
  on-primary-container: '#3b5183'
  inverse-primary: '#475d90'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#e3e3e3'
  on-tertiary: '#2f3131'
  tertiary-container: '#c6c7c7'
  on-tertiary-container: '#515353'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001944'
  on-primary-fixed-variant: '#2f4576'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 80px
  grid-gutter: 24px
  grid-margin: 32px
---

## Brand & Style
The design system is engineered for high-performance technical portfolios, blending **Minimalism** with **Glassmorphism** and a hint of **Cyberpunk Brutalism**. The personality is precise, authoritative, and developer-centric. 

The aesthetic is characterized by an "Obsidian" base—a deep, void-like black—punctuated by vibrant, luminous accents that suggest a high-tech interface or a terminal HUD. Visual hierarchy is established through structural grid lines and varying levels of background blur rather than traditional drop shadows. The goal is to evoke a sense of focused immersion, mimicking the environment of a sophisticated IDE or a modern dashboard.

## Colors
The palette is rooted in a deep `dark` mode. The primary background is a pure #0a0a0a to ensure perfect black levels on OLED displays. 

- **Primary Blue (#b0c6ff):** Used for critical actions, active states, and high-energy accents. It should appear to "emit light" against the dark background.
- **Surface Neutrals:** Use low-opacity grays for glassmorphic layers to maintain depth without sacrificing the obsidian feel.
- **Structural Lines:** Use a faint blue-tinted border for grid lines and dividers to reinforce the technical, "under-the-hood" aesthetic.

## Typography
Typography is the primary tool for communicating technical precision. 

- **Geist (Sans)**: Utilized for all narrative content and headlines. It provides a clean, neutral, and highly legible foundation that feels contemporary and engineered.
- **JetBrains Mono**: Reserved for labels, tags, metadata, and "code-like" UI elements. This font signals the "technical" nature of the content.
- **Scalability**: Headlines use tight letter-spacing for impact, while labels use expanded tracking for clarity at small sizes. All typography should prioritize high contrast against the dark background.

## Layout & Spacing
This design system utilizes a **Fixed Grid** on desktop (12 columns) and a **Fluid Grid** on mobile (4 columns). 

- **Grid-Line Background:** The background should feature a subtle, fixed 24px or 48px square grid drawn with `1px` stroke at 5% opacity. Elements should align strictly to these grid intersections.
- **Rhythm:** A 4px base unit drives all spacing. Use `lg` and `xl` spacing for section breathing room to maintain the minimalist feel.
- **Mobile Reflow:** On mobile, margins reduce to 16px and stack components vertically, removing complex horizontal alignments to focus on content legibility.

## Elevation & Depth
Depth is created through **Glassmorphism** and layering rather than shadows. 

- **Level 0 (Base):** Pure obsidian (#0a0a0a) with background grid lines.
- **Level 1 (Cards/Panels):** Semi-transparent surfaces (`rgba(255, 255, 255, 0.03)`) with a `backdrop-filter: blur(12px)`. Borders are `1px` solid at low opacity.
- **Level 2 (Modals/Popovers):** Higher opacity background blur (24px) with a brighter primary-blue border (`0.2` opacity) to indicate active focus.
- **The "Glow":** Hover states on interactive elements should trigger a subtle `box-shadow` using the primary blue color with a high blur radius and very low opacity (10-15%) to simulate a soft neon glow.

## Shapes
Shapes are disciplined and sharp, favoring a "Soft" approach (0.25rem/4px radius) that feels modern but retains structural integrity. 

- **Primary Elements:** Buttons and cards use a 4px radius. 
- **Interactive States:** Use sharp angles for focus rings to maintain the technical aesthetic.
- **Micro-Elements:** Small tags or badges can use a slightly larger radius (8px) for contrast, but avoid full pill shapes to keep the professional tone.

## Components
- **Buttons:** Solid primary blue for main actions with black text. Ghost buttons use a `1px` primary blue border and transparent background.
- **Glass Cards:** Always feature a `1px` border (top and left slightly brighter to simulate light hit) and `backdrop-filter`.
- **Inputs:** Darker than the background or matching the surface level, with a 1px border that turns vibrant blue on focus. Use JetBrains Mono for placeholder text.
- **Chips/Tags:** Monospace font, all-caps, with a faint border and no background fill.
- **Grid Dividers:** Use `1px` lines that extend to the edge of the viewport where possible, reinforcing the systemic nature of the layout.
- **Data Visuals:** Use the primary blue for lines and charts; any secondary data points should use a muted desaturated version of the blue or white.