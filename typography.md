# Typography Rules & Best Practices

A comprehensive guide to standard typographic principles, visual hierarchy, micro-typography, accessibility, and implementation rules for web, digital UI, and print.

---

## 1. Typeface Selection & Pairing

### Core Principles
- **Limit Type Families:** Stick to **1 to 2 typeface families** per project. Rarely do you need 3.
- **Contrast, Not Conflict:** When pairing two fonts, choose typefaces with distinct visual contrast (e.g., a high-contrast Serif for headings and a clean Sans-Serif for body text). Avoid pairing typefaces that look almost identical but have subtle, jarring differences.
- **Matching X-Heights:** When mixing fonts inline or across components, select typefaces with compatible x-heights to maintain vertical rhythm and structural balance.
- **Match Tone to Purpose:**
  - **Geometric Sans:** Modern, technical, minimalist (e.g., Inter, SF Pro, Montserrat).
  - **Humanist Sans:** Warm, readable, organic (e.g., Open Sans, Fira Sans, Lato).
  - **Transitional / Modern Serif:** Authoritative, editorial, refined (e.g., Georgia, Merriweather, Playfair Display).
  - **Monospace:** Technical, code, tabular data, precise alignment (e.g., JetBrains Mono, Fira Code).

---

## 2. Comprehensive Font Sizes & Visual Hierarchy

### Type Scales
Establish a mathematical scale for consistent proportional sizing rather than selecting arbitrary pixel values. Common ratios include:
- **Minor Third (1.200):** Subtle contrast, optimal for dense UI dashboards and complex enterprise applications.
- **Major Third (1.250):** Balanced contrast, ideal for standard web applications and mobile UIs.
- **Perfect Fourth (1.333):** Strong contrast, default standard for marketing websites and articles.
- **Augmented Fourth (1.414) / Golden Ratio (1.618):** High dramatic contrast, great for editorial sites, display headings, and hero landing pages.

### Complete Desktop Type Scale (Base: 16px / Perfect Fourth - 1.333)

| Level / Token | Font Size (rem / px) | Font Weight | Line Height | Letter Spacing | Usage Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | `3.157rem` (50.5px) | Bold (700) | 1.1 (55.5px) | `-0.02em` | Hero banners, high-impact splash headlines |
| **Heading 1 (H1)** | `2.369rem` (37.9px) | Bold (700) | 1.2 (45.5px) | `-0.015em` | Page title, primary section container |
| **Heading 2 (H2)** | `1.777rem` (28.4px) | SemiBold (600) | 1.25 (35.5px) | `-0.01em` | Section headings, modal title headers |
| **Heading 3 (H3)** | `1.333rem` (21.3px) | SemiBold (600) | 1.3 (27.7px) | `0em` | Subsections, card titles, table headers |
| **Heading 4 (H4)** | `1.125rem` (18.0px) | SemiBold / Medium | 1.35 (24.3px) | `0em` | In-page widgets, sub-card group headers |
| **Body Large** | `1.125rem` (18.0px) | Regular (400) | 1.5 (27.0px) | `0em` | Lead paragraphs, intro text, prominent copy |
| **Body Base** | `1.000rem` (16.0px) | Regular (400) | 1.55 (24.8px) | `0em` | Main body copy, paragraphs, form labels |
| **Body Small** | `0.875rem` (14.0px) | Regular (400) | 1.45 (20.3px) | `0em` | Secondary information, table row data, inputs |
| **Caption / Helper**| `0.750rem` (12.0px) | Regular / Medium | 1.4 (16.8px) | `0.01em` | Metadata, helper text, timestamps, tags |
| **Overline / Label**| `0.750rem` (12.0px) | SemiBold (600) | 1.2 (14.4px) | `0.08em` | ALL CAPS category labels, section taglines |
| **Micro / Badge** | `0.6875rem` (11.0px)| Medium (500) | 1.2 (13.2px) | `0.05em` | Status badges, compact data indicators |

### Fluid Typography & Mobile Responsive Scale

When designing across viewports, use CSS `clamp()` or scale adjustments on mobile screens to prevent headings from overflowing small devices:

```css
:root {
  /* Dynamic Fluid Font Sizes: clamp(min, preferred, max) */
  --font-size-display: clamp(2.25rem, 5vw + 1rem, 3.157rem);
  --font-size-h1: clamp(1.75rem, 3.5vw + 1rem, 2.369rem);
  --font-size-h2: clamp(1.35rem, 2vw + 0.8rem, 1.777rem);
  --font-size-h3: clamp(1.15rem, 1vw + 0.8rem, 1.333rem);
  --font-size-body: 1rem;
  --font-size-small: 0.875rem;
  --font-size-caption: 0.75rem;
}
```

---

## 3. Spacing, Line Height & Measure

### Line Length (Measure)
- **Optimal Range:** Aim for **45 to 75 characters per line** (including spaces). The absolute sweet spot for long-form reading is **66 characters**.
- **CSS Tip:** Set `max-width: 65ch;` or `max-width: 70ch;` on long-form content blocks to automatically prevent lines from stretching too wide on desktop viewports.

### Line Height (Leading)
- **Body Text:** Use **1.4 to 1.6** (140%–160%) relative to font size.
- **Headings / Display Text:** Tighten leading to **1.1 to 1.25**. Large text requires tighter line height to avoid looking fragmented.
- **Small Text / Captions:** Increase leading slightly to **1.5 to 1.6** for improved legibility at small scale.

### Paragraph Spacing
- Use paragraph margins (e.g., `margin-bottom: 1em` or `1.25em`) rather than indenting paragraphs in digital contexts.
- Avoid using empty carriage returns (`<br><br>`) to create paragraph spacing.

---

## 4. Letter Spacing (Tracking) & Kerning

- **Display & Headings:** Large font sizes require **negative letter-spacing** (e.g., `-0.01em` to `-0.025em`) to appear tight and cohesive.
- **Body Text:** Default tracking (`0` or `normal`) is usually ideal.
- **Small / ALL CAPS:** Small text (under 12px) and ALL CAPS text require positive tracking (e.g., `+0.05em` to `+0.1em`) to maintain character clarity and readability.
- **Font Feature Settings:** Enable kerning explicitly in CSS using `font-kerning: normal;` and `font-variant-numeric: tabular-nums;` for alignment of monetary figures in tables.

---

## 5. Micro-Typography & Punctuation Rules

### Correct Punctuation & Characters
- **Smart Quotes:** Always use curly quotes (`“ ”`, `‘ ’`) for dialogue and quotations—never straight feet/inch marks (`" "`, `' '`).
- **Primes:** Use prime symbols (`′`, `″`) for feet, inches, minutes, and seconds.
- **Hyphen (`-`):** Used strictly for compound words (e.g., *well-designed*).
- **En-dash (`–`):** Used for ranges of numbers or dates (e.g., *pages 12–45*, *1999–2026*). CSS/HTML: `&ndash;`.
- **Em-dash (`—`):** Used to indicate a pause, breakdown, or parenthetical thought without spaces (e.g., *The solution—though unexpected—worked perfectly*). CSS/HTML: `&mdash;`.
- **Ellipsis (`…`):** Use the dedicated ellipsis character (`…` or `&hellip;`), not three consecutive periods (`...`).

### Widows & Orphans
- **Widow:** A single word or short line left alone at the bottom of a paragraph or column.
- **Orphan:** A single word or opening line left at the top of a page/column.
- **Prevention in CSS:** Use `text-wrap: balance;` on headings and `text-wrap: pretty;` on body text to automatically balance lines and prevent widows.

---

## 6. Color, Contrast & Accessibility (WCAG Compliance)

### Contrast Ratios (WCAG 2.1)
- **Normal Text (below 18pt / ~24px):** Minimum contrast ratio of **4.5:1** (Level AA) or **7:1** (Level AAA).
- **Large Text (18pt+ or 14pt+ Bold):** Minimum contrast ratio of **3:1** (Level AA) or **4.5:1** (Level AAA).

### Best Practices for Color
- **Avoid Pure Black on Pure White:** `#000000` text on `#ffffff` causes eye strain due to extreme glare. Use soft dark tones such as `#121316`, `#1a1d20`, or `#22252a`.
- **Never Rely Solely on Color:** Use font weight, underlines, or icons to convey meaning (e.g., error messages, active states, inline links).
- **Maintain Contrast in Dark Mode:** Do not simply invert colors. Adjust font weights slightly lighter if dark backgrounds cause visual choking.

---

## 7. CSS Rules & Code Quick Reference

```css
/* Core Typographic Base & Comprehensive Font Tokens */
:root {
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  
  /* Font Size Scale Tokens */
  --fs-micro: 0.6875rem;   /* 11px */
  --fs-caption: 0.75rem;    /* 12px */
  --fs-small: 0.875rem;    /* 14px */
  --fs-base: 1rem;         /* 16px */
  --fs-body-lg: 1.125rem;  /* 18px */
  --fs-h4: 1.125rem;       /* 18px */
  --fs-h3: 1.333rem;       /* 21.3px */
  --fs-h2: 1.777rem;       /* 28.4px */
  --fs-h1: 2.369rem;       /* 37.9px */
  --fs-display: 3.157rem;  /* 50.5px */
}

body {
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  line-height: 1.55;
  color: #1c1e21;
  background-color: #fafafa;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Heading Hierarchy & Line Wrapping */
h1, h2, h3, h4 {
  color: #0f1115;
  line-height: 1.2;
  letter-spacing: -0.02em;
  text-wrap: balance;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

h1 { font-size: var(--fs-h1); font-weight: 700; }
h2 { font-size: var(--fs-h2); font-weight: 600; }
h3 { font-size: var(--fs-h3); font-weight: 600; }
h4 { font-size: var(--fs-h4); font-weight: 600; }

/* Body Variants */
p {
  max-width: 65ch;
  margin-bottom: 1.25em;
  text-wrap: pretty;
}

.body-large {
  font-size: var(--fs-body-lg);
  line-height: 1.5;
}

.body-small {
  font-size: var(--fs-small);
  line-height: 1.45;
}

/* ALL CAPS & Overlines */
.overline, .uppercase-label {
  font-size: var(--fs-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Tabular Numbers for Data Tables */
.numeric-data {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

---

## 8. Typography Checklist

- [ ] Is there clear visual hierarchy between H1, H2, H3, H4, and Body?
- [ ] Are font size tokens defined using responsive `rem` units?
- [ ] Is line length restricted between 45–75 characters?
- [ ] Is line height proportional (1.1–1.25 for headings, 1.4–1.6 for body)?
- [ ] Does text-color contrast pass WCAG AA standards (>= 4.5:1)?
- [ ] Are smart quotes, em-dashes, and proper punctuation used?
- [ ] Is ALL CAPS text styled with added letter-spacing (`0.05em`–`0.1em`)?
- [ ] Are numbers in data tables set to `tabular-nums` or monospace?
- [ ] Have widows and orphans been prevented using proper CSS wrapping or non-breaking spaces (`&nbsp;`)?
