# Design System — Bloom

## Product Context
- **What this is:** Certificate personalization and email send workspace
- **Who it's for:** Educators, event organizers, HR teams sending bulk personalized certificates
- **Space/industry:** Productivity tools / document personalization / email campaigns
- **Project type:** Web app — canvas editor core + dashboard + forms

## Aesthetic Direction
- **Direction:** Warm Editorial Precision + Anime Landscape Identity
- **Decoration level:** Intentional
- **Mood:** A workspace that feels like stepping into a sunlit anime meadow — warm, alive, dreamy. Light mode draws from a Ghibli/Zelda-style sunlit field. Dark mode draws from a dramatic night valley with wildflower pops. The brand lives in the palette: orange bloom, teal stem, warm-paper light.
- **Landscape integration:**
  - Login/auth pages: full-bleed anime landscape background + glassmorphism card (add images to `public/images/bg-light.webp` and `public/images/bg-dark.webp`)
  - Surface grain: CSS SVG noise at 2.8% opacity (already in globals.css via `body::after`)
  - Editor canvas: Figma-style dark `#1e1e1e` + dot grid background
  - Dark mode: deep midnight `#060d0f` (night valley energy)

## Typography

| Role | Font | Variable | Usage |
|------|------|----------|-------|
| Display/Hero | **Fraunces** (variable, opsz) | `--font-fraunces` | Page titles, hero h1, cert-paper names, brand wordmark |
| Body/UI | **Instrument Sans** | `--font-instrument-sans` | All body text, labels, form fields, nav |
| Code/Technical | **JetBrains Mono** | `--font-jetbrains-mono` | Merge tags `{{column}}`, SMTP credentials, `<pre>` blocks |

Fonts are loaded via `next/font/google` in `app/layout.tsx`. Variables are injected on the `<html>` element and mapped to Tailwind utilities in `@theme inline` in `globals.css`.

**Scale:** 10px(nav-label) 12px(caption/meta) 13px(small) 14px(body) 18px(h3) 22px(h2) 28px(h1) 44px(display)

## Color

### Light mode (sunlit meadow)
| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#f4efe6` | Page background — warm paper |
| `--foreground` / `--ink` | `#1f1b15` | Primary text |
| `--card` / `--surface` | `#ffffff` | Cards, modals, panels |
| `--primary` | `#0f5d55` | Teal — structure, nav focus, pending states |
| `--primary-strong` | `#0a3d38` | Hover variant of primary |
| `--accent` | `#b85a33` | Burnt sienna — CTAs, sent badges, active states (the "bloom" color) |
| `--accent-soft` | `#e8b89a` | Soft peach for accent backgrounds |
| `--muted-foreground` / `--muted` | `#6b6358` | Muted text, borders (`--border: #e5ddc9`) |
| `--success` | `#4a6b3a` | Olive green |
| `--warning` | `#c89b2c` | Mustard |
| `--danger` / `--destructive` | `#a8412c` | Oxblood |

### Dark mode (night valley)
| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#060d0f` | Deep midnight — NOT generic gray |
| `--card` | `#0c1a18` | Surface cards |
| `--primary` | `#4ecdc4` | Vivid teal (readable against dark bg) |
| `--accent` | `#d06a3b` | Slightly brighter orange |

### Status color semantics (Bloom language)
- Sent / bloomed → accent orange (`--accent`)
- Pending / growing → primary teal (`--primary`)
- Failed → danger red (`--destructive`)

## Component Library
shadcn/ui v4 over Tailwind v4. All components in `components/ui/`. CSS variables power all theming — no Tailwind config needed.

Key components: `Button`, `Input`, `Textarea`, `Select`, `Label`, `Badge`, `Form`, `Card`, `Dialog`, `Sheet`, `Separator`.

Dark/light toggle: `components/common/theme-toggle.tsx` using `next-themes`.

## Forms
All forms use **React Hook Form** + **Zod** + shadcn `Form` / `FormField` / `FormItem` / `FormControl` / `FormMessage`. No `<form>` should use uncontrolled or raw `useState` for validation.

**Note on Zod + RHF number inputs:** Use `z.string()` for numeric HTML inputs and parse with `Number()` in `onSubmit`. Using `z.coerce.number()` causes TypeScript input/output type mismatch with `zodResolver`.

## Motion
- **Bloom easing:** `cubic-bezier(0.34, 1.56, 0.64, 1)` — spring overshoot, like a petal opening. Use for reveals, badge pop-ins.
- **Standard:** enter `ease-out` / exit `ease-in` / move `ease-in-out`
- **Duration:** micro 80ms · short 180ms · medium 280ms · long 400ms
- Auth landscape: subtle `scale(1→1.02)` breathing animation at 8s cycle (optional enhancement)

## Layout
- **Sidebar:** Fixed 240px + icon rail collapse on mobile via shadcn Sheet
- **Grid:** 12 columns, 24px gap, max-width 1200px
- **Border radius:** `sm:4px` / `md:6px (default)` / `lg:12px` / `xl:20px` / `full:9999px`
- Canvas stage: Figma-style `#1e1e1e` background + CSS dot grid

## Spacing
Base unit: 4px. Scale: 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px

## Surface texture
CSS SVG grain overlay in `body::after` at 2.8% opacity — gives every surface a subtle painterly quality without being loud. Already in `globals.css`.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-15 | Fraunces display font | Warm variable serif (opsz axis), distinctive, free on Google Fonts |
| 2026-05-15 | Instrument Sans body font | Warm humanist, reads like print, pairs well with Fraunces |
| 2026-05-15 | `#060d0f` dark mode background | Night valley from anime landscape reference — NOT generic gray |
| 2026-05-15 | Orange = bloom/sent moments | Semantic color tied to product name — every "bloom" moment is orange |
| 2026-05-15 | Figma-style canvas (dark + dot grid) | Editor = precision instrument; checkerboard felt like legacy design tools |
| 2026-05-15 | CSS grain at 2.8% | Painterly texture without being loud |
| 2026-05-15 | React Hook Form + Zod | shadcn Form built on RHF natively; Zod for co-located schema validation |
| 2026-05-15 | Tailwind v4 CSS variable theming | No tailwind.config needed; pure CSS custom properties |
| 2026-05-15 | Warm teal-tinted dark mode | Every other tool does neutral gray — this one is immediately identifiable |
