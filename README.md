# Carlos Sanchez Bespoke

Website for Carlos Sanchez's bespoke Colombian tailoring business.

A self-contained static site — no build step, no dependencies. Open `index.html`
in a browser, or serve the folder with any static host (GitHub Pages, Netlify, etc.).

## Features

- **Tailor-themed preloader** — animated monogram ring, sewing needle and thread,
  followed by a curtain-split page reveal.
- **Suit design room** (`#customize`) — fully customize fabric, cloth colour,
  pattern, jacket style, lapel, vents, pockets, buttons, lining, trousers,
  waistcoat and monogram, with a live SVG preview and a running design summary.
- **Measurements** (`#measurements`) — enter measurements in inches or
  centimetres; everything is automatically converted to centimetres, the metric
  standard used in Colombia. Values persist in `localStorage`.
- **Multilingual** — English by default with a Spanish / French / Italian toggle
  (`js/i18n.js`). Language choice persists.
- **Quote request** — the contact form composes an email that includes the suit
  design and converted measurements.

## Brand system

Drawn from the Carlos Sanchez "A la Medida" identity (CS crest):

- **Colors** — deep navy `#0a1424`/`#101f3c`, royal sapphire `#2f5fd0`,
  periwinkle `#9db8f0`, platinum silver `#c6cedd`, cool paper `#f6f7fa`.
- **Type** — Cormorant Garamond (display serif) + Jost (letterspaced
  geometric sans), self-hosted in `assets/fonts/` — no third-party requests.
- **Crest** — `assets/crest.svg`, used in the header and favicon.

## Structure

```
index.html      — single-page site (hero, atelier, gallery, customizer, measurements, FAQ, contact)
css/styles.css  — all styling, responsive + reduced-motion support
css/fonts.css   — self-hosted @font-face declarations
js/i18n.js      — EN/ES/FR/IT translation dictionaries
js/app.js       — preloader, i18n, customizer + SVG preview, unit conversion, gallery lightbox, form
assets/         — crest, favicon, social image, gallery photos, fonts
```

## Local preview

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
