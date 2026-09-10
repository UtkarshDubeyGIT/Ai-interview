# Technical violet design theme

This theme was derived from the rendered `the referenced source page` page on 10 September 2026. It captures the visual system, not the site's copy or brand assets.

## Visual direction

- **Mood:** technical, assured, infrastructure-grade, slightly futuristic.
- **Foundation:** near-black `#071013` with deep indigo/violet atmospheric gradients.
- **Accent:** electric violet `#6b3eff`; green `#10b981` is reserved for savings and positive status.
- **Typography:** Space Grotesk at 600 for large display headings; Inter for product UI and body copy.
- **Shape:** generous 16–24px card rounding and fully rounded buttons/chips.
- **Depth:** restrained borders and glows. Avoid large, soft SaaS shadows.
- **Layout:** centered hero, compact copy width, 1168px maximum content container, roomy 80–120px section spacing.

## Recommended component rules

1. Keep dark sections predominantly black; violet should feel like emitted light, not a flat wallpaper.
2. Use white for the highest-emphasis secondary action and the violet gradient for the primary action.
3. Use bordered translucent chips for compact proof points and product attributes.
4. On light sections, use `#262b30` text, `#65717b` secondary copy, and `#dbe4eb` dividers.
5. Prefer 48px/1.2 desktop section headings; scale to 40px and 32px at narrower breakpoints.
6. Keep motion quick and functional: 150ms for hover/focus, 250ms for overlays and reveals.

## Usage

Import `theme.tokens.css`, then build with semantic tokens:

```css
@import "./theme.tokens.css";

.hero {
  color: var(--theme-text-inverse);
  background: var(--theme-gradient-glow), var(--theme-gradient-hero);
}

.card {
  border: 1px solid var(--theme-border-inverse);
  border-radius: var(--theme-radius-lg);
  background: rgb(19 25 33 / 72%);
}
```

The JSON file follows the Design Tokens Community Group structure for import into token tooling. Font files are intentionally not bundled; load licensed copies of Inter and Space Grotesk or use the included fallbacks.
