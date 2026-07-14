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
