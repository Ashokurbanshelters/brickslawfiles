# Bricks Law LLP — website

A complete, dependency-free rebuild of the site. The repository previously held only the CSS/JS
assets of an off-the-shelf template (`style.css`, Bootstrap, jQuery, Owl, AOS, Fancybox, icon fonts)
with **no HTML at all**, and that stylesheet was half-broken: the hero `h1` was coloured black on a
dark background, an orange accent clashed with the brand gold, and the icon fonts it referenced
(`icomoon`, `Flaticon.eot/.woff/.ttf/.svg`) were never committed, so every glyph 404'd.

Everything below now works from a single hand-authored stylesheet, a single 8 KB script, and images
generated for the brand.

```
.
├── index.html                     home
├── practice-areas.html            eight practices: scope, engagements, published fees
├── attorneys.html                 partner roster with practice-group filtering
├── results.html                   representative matters + forum data + method
├── about.html                     story, principles, gallery, community, careers, policies
├── insights.html                  article index with topic filtering
├── insight-notice-provisions.html ┐ two long-form articles (prose, sticky TOC,
├── insight-payment-bonds.html      ┘  drop cap, JSON-LD BlogPosting)
├── contact.html                   intake form, response targets, offices, FAQ
├── sitemap.html / 404.html
├── assets/
│   ├── css/style.css              design system: tokens, components, motion, print
│   ├── js/site.js                 header, drawer, reveals, counters, lightbox, filters, validation
│   ├── img/                       responsive derivatives (.jpg + .webp at 1400/900/640)
│   └── img/raw/                   full-resolution sources for the build script
└── scripts/build-images.sh        regenerates every derivative from assets/img/raw
```

## Run it

No build step — these are static files.

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

## Editing content

* **Copy** lives inline in each `.html` file, marked with section comments (`<!-- HERO -->`,
  `<!-- PRACTICE AREAS -->`, …).
* **Design** is driven by the CSS custom properties at the top of `assets/css/style.css`
  (surfaces, brand brass/clay, fluid type scale, spacing rhythm). Change `--brass` once and the whole
  site follows, including gradients, focus rings and the scroll-progress bar.
* **Icons** are `<symbol>`s in `assets/img/sprite.svg`, used as
  `<svg class="ico"><use href="assets/img/sprite.svg#i-scale"/></svg>`. They inherit `currentColor`.
* **Images**: drop a new file into `assets/img/raw/`, run `./scripts/build-images.sh`, then reference
  `assets/img/<name>-1400.jpg` (or use the `<picture>` pattern already used throughout).

## What was upgraded

**Structure & content**
* Ten pages of real, sector-specific copy instead of a template shell: practice areas with scope,
  typical engagements and published fee bands; anonymised representative matters with a stated
  methodology; attorney biographies with bar admissions and matter history; an intake form matched to
  the questions a law firm actually needs answered; a 1,200-word sample article pair with a table of
  contents.
* Conversion-first homepage: hero with inline callback request, "what happens next" timeline,
  outcome table, testimonial cards, deadline-focused CTA band, sticky mobile call bar.

**Design**
* Dark brass/clay palette on a token system, fluid `clamp()` type scale, a Fraunces + Rubik pairing,
  a brick-course motif reused in the logo, eyebrows, section rules and the map graphic.
* Cards, chips, tables, accordions, tab filters, gallery and lightbox styled as one system rather
  than a theme bolted onto a framework.

**Performance**
* 0 KB of third-party CSS/JS: Bootstrap, jQuery, Popper, Owl Carousel, AOS, Fancybox, waypoints and
  animateNumber were all removed (scroll reveals, counters, sliders and the lightbox are ~350 lines
  of vanilla JS). The original library files are untouched in the repository's first commit — restore any
  of them with e.g. `git show 79c30d4:bootstrap.min.css > bootstrap.min.css`.
* Every raster image ships as WebP with a JPEG fallback and three widths (`srcset` + `sizes`); the
  LCP hero is preloaded with `fetchpriority="high"`; below-the-fold media is lazy; all images carry
  `width`/`height` so nothing shifts.

**Accessibility**
* Skip link, landmarks, one `h1` per page, visible focus ring everywhere, `aria-current`/
  `aria-expanded`/`aria-pressed` states, focus trap and `Esc` for the mobile drawer, keyboard
  lightbox with arrow keys, labelled form controls with inline errors announced via `role="alert"`,
  `prefers-reduced-motion` and `prefers-contrast` support, and a print stylesheet.
* Content is readable with JavaScript disabled: reveals are opt-in, accordions are native
  `<details>`, and no content is injected by script.

**SEO & sharing**
* Unique titles/descriptions within SERP limits, canonicals, Open Graph + Twitter cards, an `og-cover`
  image, `LegalService`, `FAQPage` and `BlogPosting` JSON-LD, `robots.txt`, `sitemap.xml`,
  `sitemap.html` and a styled `404.html`.

**Reliability**
* `scripts/` for reproducible image builds, `.nojekyll` for GitHub Pages, favicon set in SVG, PNG and
  ICO (no more missing-font 404s), and no filenames with spaces (the old `icomoon (1).ttf`).

## Before you publish

This is a demo build with **fictional content** — Bricks Law LLP, its attorneys, matters, results,
ratings and offices are invented for demonstration. Replace before going live:

1. Firm identity, addresses, phone numbers, emails, and the domain in every `rel="canonical"`,
   `og:url` and `sitemap.xml`.
2. Attorney names, photos (currently monogram avatars), bar admissions and biographies.
3. Representative matters and results — only publish outcomes you may ethically publish, with the
   disclosures your state bar requires, and delete the "illustrative sample content" notes.
4. Ratings/recognition block on `about.html` (currently fictional) and the placeholder map on
   `contact.html`.
5. Wire the two forms to a real endpoint: see the marked block in `assets/js/site.js` (Formspree,
   Netlify Forms or your practice-management intake all work). The site deliberately stores nothing.

### Deploy to GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`. `.nojekyll` is already
present, so no Jekyll build is triggered.

### Validation

`scripts/check-site.py` re-runs the structural audit used to build this site (nesting, dead links,
missing anchors, duplicate ids, alt/dimension attributes, JSON-LD, unstyled classes, JS syntax):

```bash
python3 scripts/check-site.py      # ✅ no issues found
```

`scripts/` is intentionally dependency-free, but a quick structural check is useful after edits:

```bash
python3 - <<'PY'          # links, anchors, duplicate ids, alt text, JSON-LD
import re, json, sys
from pathlib import Path
from collections import Counter
root = Path('.')
bad = []
for page in root.glob('*.html'):
    s = page.read_text()
    for href in set(re.findall(r'href="(?!https?:|mailto:|tel:)([^"#]+\.html)(?:#[^"]*)?"', s)):
        if not (root / href).exists(): bad.append(f'{page}: broken link {href}')
    for m in set(re.findall(r'(?:src|data-full)="(assets/[^"]+?)"', s)):
        if not (root / m.split('#')[0]).exists(): bad.append(f'{page}: missing asset {m}')
    ids = re.findall(r'id="([^"]+)"', s)
    dupes = [i for i, n in Counter(ids).items() if n > 1]
    if dupes: bad.append(f'{page}: duplicate ids {dupes}')
    for alt in re.findall(r'<img (?![^>]*alt=)[^>]*>', s): bad.append(f'{page}: img without alt: {alt[:60]}')
    for ld in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try: json.loads(ld)
        except Exception as e: bad.append(f'{page}: bad JSON-LD {e}')
print('\n'.join(bad) or 'all pages OK')
PY
```
