/* =========================================================
   Carlos Sanchez Bespoke — cloth & lining catalog
   =========================================================
   THIS IS THE FILE TO EDIT when adding real cloths.

   Each fabric entry:
     id        — stable key (also used for saved designs)
     nameKey   — i18n key for the display name (js/i18n.js)
     compKey   — i18n key for the composition line
     code      — bunch/article code as printed on the swatch
                 (e.g. "Toronto Comfort 4284 808719-02")
     mill      — mill or bunch name shown to the client
     weight    — grams per square metre
     seasonKey — i18n key: catalog.season.tropical | .fourseason | .winter

   Each lining entry:
     id, nameKey, hex (swatch colour), matKey (material i18n key), code
   ========================================================= */

const CATALOG = {
  /* -------------------------------------------------------
     Photo-layer preview (the path to a photoreal configurator).
     Flip `enabled` to true once layer images exist under
     assets/photo-layers/ — see the README in that folder for
     the exact shot list, naming and export specs.
     Layers compose bottom → top; {tokens} are filled from the
     current design. If any layer image is missing the preview
     falls back to the illustrated SVG automatically.
     ------------------------------------------------------- */
  photoLayers: {
    enabled: true,
    base: "assets/photo-layers/",
    // list every file that actually exists in assets/photo-layers/ —
    // the site only requests files on this list (no 404 probing)
    // navy is the atelier photograph; the other colours are the same
    // garment with the cloth re-tinted (shirt, tie and form untouched)
    available: [
      "base-sb2-navy.png", "base-sb2-charcoal.png", "base-sb2-black.png", "base-sb2-grey.png",
      "base-sb2-brown.png", "base-sb2-burgundy.png", "base-sb2-olive.png", "base-sb2-cream.png"
    ],
    // `optional` layers are skipped silently when their image is missing;
    // a missing base falls back to the illustrated preview.
    stack: [
      { id: "base", file: "base-{style}-{color}.png" },
      { id: "vest", file: "vest-{color}.png", optional: true, when: (d) => d.vest === "vest" },
      { id: "lapel", file: "lapel-{lapel}-{style}-{color}.png", optional: true },
      { id: "pockets", file: "pockets-{pockets}-{color}.png", optional: true }
    ]
  },

  /* Indicative pricing shown live in the Design Room (USD).
     PLACEHOLDER VALUES — Carlos should confirm these before launch.
     base = two-piece in house wool; modifiers add to it. */
  pricing: {
    currency: "USD",
    base: 1200,
    fabric: { wool: 0, linen: -100, cotton: -200, cashmere: 650, tropical: 150, flannel: 200 },
    vest: 350,
    doubleBreasted: 120,
    pattern: 60
  },

  fabrics: [
    {
      id: "wool",
      nameKey: "cust.fabric.wool",
      compKey: "catalog.comp.wool",
      code: "CS-130",
      mill: "House bunch",
      weight: 260,
      seasonKey: "catalog.season.fourseason"
    },
    {
      id: "linen",
      nameKey: "cust.fabric.linen",
      compKey: "catalog.comp.linen",
      code: "CS-LIN",
      mill: "House bunch",
      weight: 240,
      seasonKey: "catalog.season.tropical"
    },
    {
      id: "cotton",
      nameKey: "cust.fabric.cotton",
      compKey: "catalog.comp.cotton",
      code: "CS-CTW",
      mill: "House bunch",
      weight: 280,
      seasonKey: "catalog.season.fourseason"
    },
    {
      id: "cashmere",
      nameKey: "cust.fabric.cashmere",
      compKey: "catalog.comp.cashmere",
      code: "CS-WCA",
      mill: "House bunch",
      weight: 300,
      seasonKey: "catalog.season.winter"
    },
    {
      id: "tropical",
      nameKey: "cust.fabric.tropical",
      compKey: "catalog.comp.tropical",
      code: "CS-TRP",
      mill: "House bunch",
      weight: 220,
      seasonKey: "catalog.season.tropical"
    },
    {
      id: "flannel",
      nameKey: "cust.fabric.flannel",
      compKey: "catalog.comp.flannel",
      code: "CS-FLA",
      mill: "House bunch",
      weight: 320,
      seasonKey: "catalog.season.winter"
    }
  ],

  linings: [
    { id: "burgundy", nameKey: "cust.lining.burgundy", hex: "#6d1f31", matKey: "catalog.mat.viscose", code: "L-01" },
    { id: "royal",    nameKey: "cust.lining.royal",    hex: "#1f3f8f", matKey: "catalog.mat.silk",    code: "L-02" },
    { id: "gold",     nameKey: "cust.lining.gold",     hex: "#b98a2e", matKey: "catalog.mat.viscose", code: "L-03" },
    { id: "emerald",  nameKey: "cust.lining.emerald",  hex: "#1d5c45", matKey: "catalog.mat.viscose", code: "L-04" },
    { id: "plum",     nameKey: "cust.lining.plum",     hex: "#4b2a4e", matKey: "catalog.mat.viscose", code: "L-05" },
    { id: "black",    nameKey: "cust.lining.black",    hex: "#191919", matKey: "catalog.mat.viscose", code: "L-06" }
  ]
};
