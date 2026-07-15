/* =========================================================
   Carlos Sanchez Bespoke — app logic
   - tailor-themed preloader + page reveal
   - i18n (EN / ES / FR / IT)
   - suit customizer with live SVG preview
   - measurements with automatic conversion to cm (Colombian standard)
   ========================================================= */

(function () {
  "use strict";

  /* ---------------- state ---------------- */

  const design = Object.assign(
    {
      fabric: "wool",
      color: "navy",
      pattern: "solid",
      style: "sb2",
      lapel: "notch",
      vents: "double",
      pockets: "flap",
      buttons: "darkhorn",
      lining: "burgundy",
      trousers: "flat",
      hem: "plain",
      vest: "none",
      monogram: ""
    },
    load("csb-design")
  );

  let unit = load("csb-unit") || "in";

  // language priority: ?lang= URL param (shareable/indexable) > saved choice > English
  const LANGS = ["en", "es", "fr", "it"];
  const urlLang = new URLSearchParams(window.location.search).get("lang");
  let lang = LANGS.includes(urlLang) ? urlLang : (load("csb-lang") || "en");
  const measurements = load("csb-meas") || {}; // stored keyed by field, values in the CURRENT unit

  // grouped per garment (progressive disclosure — jacket vs trousers)
  const MEAS_GROUPS = [
    { key: "jacket", fields: ["neck", "chest", "waist", "shoulders", "sleeve", "jacketLength", "wrist"] },
    { key: "trousers", fields: ["trouserWaist", "hips", "thigh", "inseam", "outseam"] },
    { key: "general", fields: ["height"] }
  ];
  const MEAS_FIELDS = MEAS_GROUPS.flatMap((g) => g.fields);

  const CLOTH = {
    navy:     { base: "#22304d", dark: "#182339", light: "#2e3f63" },
    charcoal: { base: "#3d3f43", dark: "#2b2d30", light: "#4c4f54" },
    black:    { base: "#1a1a1e", dark: "#0e0e11", light: "#26262c" },
    grey:     { base: "#7a7d83", dark: "#5f6268", light: "#8f929a" },
    brown:    { base: "#5a4531", dark: "#443322", light: "#6d5540" },
    burgundy: { base: "#5e2533", dark: "#471a26", light: "#733142" },
    olive:    { base: "#4d5138", dark: "#3a3d2a", light: "#5e6347" },
    cream:    { base: "#d9cdb4", dark: "#bcae90", light: "#e6ddc9" }
  };

  const BUTTON_COLORS = {
    darkhorn: "#2a2119",
    naturalhorn: "#8a6f4d",
    pearl: "#e8e4da",
    brass: "#a98a3f"
  };

  /* catalog lookups (data lives in js/catalog.js) */
  function fabricById(id) {
    return CATALOG.fabrics.find((f) => f.id === id) || CATALOG.fabrics[0];
  }
  function liningById(id) {
    return CATALOG.linings.find((l) => l.id === id) || CATALOG.linings[0];
  }

  /* ---------------- helpers ---------------- */

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }
  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  /* ---------------- preloader ---------------- */

  const PRELOADER_MIN_MS = 2000;
  const preloaderStart = Date.now();

  function finishPreloader() {
    const pre = $("#preloader");
    if (!pre) return;
    const wait = Math.max(0, PRELOADER_MIN_MS - (Date.now() - preloaderStart));
    setTimeout(() => {
      pre.classList.add("done");
      document.body.classList.add("loaded");
      // remove from the DOM once the curtain animation has played
      setTimeout(() => pre.remove(), 1600);
    }, wait);
  }

  window.addEventListener("load", finishPreloader);
  // safety: never trap the user behind the loader
  setTimeout(finishPreloader, 6000);

  /* ---------------- i18n ---------------- */

  function applyLang(next) {
    lang = next;
    save("csb-lang", lang);
    document.documentElement.lang = lang;

    $all("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (val) el.innerHTML = val;
    });
    $all("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const val = t(key);
      if (val) el.setAttribute("placeholder", val);
    });
    $all(".lang-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.lang === lang)
    );

    // SEO: localized title/description, self-referencing canonical, shareable URL
    document.title = t("meta.title");
    const md = $("#metaDescription");
    if (md) md.setAttribute("content", t("meta.description"));
    const canon = $("#canonicalLink");
    if (canon) {
      canon.setAttribute(
        "href",
        "https://carlossanchezbespoke.com/" + (lang === "en" ? "" : "?lang=" + lang)
      );
    }
    try {
      const url = new URL(window.location.href);
      if (lang === "en") url.searchParams.delete("lang");
      else url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
    } catch (e) { /* file:// or older browsers */ }

    renderCatalogUI();
    renderSummary();
    renderMeasurements();
  }

  /* ---------------- customizer ---------------- */

  // fabric cards + lining swatches, rendered from CATALOG (js/catalog.js)
  function renderCatalogUI() {
    const fabricGrid = $("#optFabric");
    if (fabricGrid) {
      fabricGrid.innerHTML = CATALOG.fabrics
        .map(
          (f) => `
        <button class="fabric-card ${f.id === design.fabric ? "active" : ""}" data-value="${f.id}">
          <span class="fc-name">${t(f.nameKey)}</span>
          <span class="fc-spec">${t(f.compKey)} · ${f.weight} g/m²</span>
          <span class="fc-meta">
            <span class="fc-code">${escapeHtml(f.mill)} ${escapeHtml(f.code)}</span>
            <span class="fc-season">${t(f.seasonKey)}</span>
          </span>
        </button>`
        )
        .join("");
    }

    const liningRow = $("#optLining");
    if (liningRow) {
      liningRow.innerHTML = CATALOG.linings
        .map(
          (l) => `
        <button class="swatch ${l.id === design.lining ? "active" : ""}"
                data-value="${l.id}" style="--sw:${l.hex}"
                title="${t(l.nameKey)}" aria-label="${t(l.nameKey)}"></button>`
        )
        .join("");
    }
    renderLiningCaption();
  }

  function renderLiningCaption() {
    const cap = $("#liningCaption");
    if (!cap) return;
    const l = liningById(design.lining);
    cap.textContent = `${t(l.nameKey)} · ${t(l.matKey)} (${l.code})`;
  }

  const OPTION_GROUPS = {
    optFabric: "fabric",
    optColor: "color",
    optPattern: "pattern",
    optStyle: "style",
    optLapel: "lapel",
    optVents: "vents",
    optPockets: "pockets",
    optButtons: "buttons",
    optLining: "lining",
    optTrousers: "trousers",
    optHem: "hem",
    optVest: "vest"
  };

  function bindOptionGroups() {
    Object.entries(OPTION_GROUPS).forEach(([groupId, prop]) => {
      const group = $("#" + groupId);
      if (!group) return;
      // restore saved state
      $all("button", group).forEach((b) =>
        b.classList.toggle("active", b.dataset.value === design[prop])
      );
      group.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-value]");
        if (!btn) return;
        design[prop] = btn.dataset.value;
        $all("button", group).forEach((b) => b.classList.toggle("active", b === btn));
        save("csb-design", design);
        renderSuit();
        renderSummary();
        if (prop === "lining") renderLiningCaption();
      });
    });

    const mono = $("#monogram");
    if (mono) {
      mono.value = design.monogram || "";
      mono.addEventListener("input", () => {
        design.monogram = mono.value.trim();
        save("csb-design", design);
        renderSuit();
        renderSummary();
      });
    }
  }

  /* ---------------- SVG suit preview ---------------- */
  /* Front view on a hanger at tailoring proportions.
     Draw order: shadow, hanger, trousers, torso, V-opening (shirt/tie/vest),
     closure, sleeves, lapels+collar, pockets, buttons, monogram. */

  function piece(d, fill, opts) {
    opts = opts || {};
    const stroke = opts.stroke || "rgba(5,9,18,0.5)";
    const sw = opts.strokeWidth != null ? opts.strokeWidth : 1;
    let out = `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    if (opts.pattern) {
      out += `<path d="${d}" fill="url(#${opts.pattern})" stroke="none"/>`;
    }
    return out;
  }

  function suitDefs(cloth) {
    return `<defs>
      <linearGradient id="gCloth" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${cloth.light}"/>
        <stop offset="0.45" stop-color="${cloth.base}"/>
        <stop offset="1" stop-color="${cloth.dark}"/>
      </linearGradient>
      <linearGradient id="gLapel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${cloth.light}"/>
        <stop offset="1" stop-color="${cloth.base}"/>
      </linearGradient>
      <linearGradient id="gTrouser" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${cloth.base}"/>
        <stop offset="1" stop-color="${cloth.dark}"/>
      </linearGradient>
      <radialGradient id="gShadow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="rgba(6,10,20,0.45)"/>
        <stop offset="1" stop-color="rgba(6,10,20,0)"/>
      </radialGradient>
      <linearGradient id="gShirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f4f5f7"/>
        <stop offset="1" stop-color="#d3d8df"/>
      </linearGradient>
    </defs>`;
  }

  function stanceInfo(style) {
    if (style === "sb3") return { breakY: 172, rows: [172, 192, 212] };
    if (style === "db") return { breakY: 186, rows: [186, 206, 226] };
    return { breakY: 190, rows: [190, 212] };
  }

  function refinedButton(x, y, color, r) {
    r = r || 3.4;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="rgba(5,9,18,0.55)" stroke-width="0.8"/>
            <circle cx="${x - r * 0.32}" cy="${y - r * 0.32}" r="${r * 0.3}" fill="rgba(255,255,255,0.35)"/>`;
  }

  function mirrorX(x) { return 300 - x; }

  function lapelMarkup(style, lapelType, cloth, patt) {
    const { breakY } = stanceInfo(style);
    const db = style === "db";
    const closL = db ? 164 : 150; // where the left (viewer) lapel sweeps to
    const closR = db ? 136 : 150;

    let leftLapel, rightLapel, leftCollar = "", rightCollar = "";

    if (lapelType === "shawl") {
      leftLapel = `M141 73 C 131 85 126 105 128 128 C 130 154 138 172 ${closL} ${breakY} L 140 75 Z`;
      rightLapel = `M159 73 C 169 85 174 105 172 128 C 170 154 162 172 ${closR} ${breakY} L 160 75 Z`;
    } else if (lapelType === "peak") {
      leftLapel = `M140 74 L 133 97 L 120 89 C 123 112 130 152 ${closL} ${breakY} Z`;
      rightLapel = `M160 74 L 167 97 L 180 89 C 177 112 170 152 ${closR} ${breakY} Z`;
      leftCollar = `M144 70 C 137 77 134 86 133 94 L 136 97 C 138 87 141 78 147 73 Z`;
      rightCollar = `M156 70 C 163 77 166 86 167 94 L 164 97 C 162 87 159 78 153 73 Z`;
    } else { // notch
      leftLapel = `M140 74 C 134 84 130 95 128 105 C 126 132 133 164 ${closL} ${breakY} Z`;
      rightLapel = `M160 74 C 166 84 170 95 172 105 C 174 132 167 164 ${closR} ${breakY} Z`;
      leftCollar = `M144 70 C 138 76 134 84 131 93 L 136 98 C 138 88 142 79 147 74 Z`;
      rightCollar = `M156 70 C 162 76 166 84 169 93 L 164 98 C 162 88 158 79 153 74 Z`;
    }

    let out = "";
    out += piece(leftLapel, "url(#gLapel)", { pattern: patt, strokeWidth: 0.9 });
    out += piece(rightLapel, "url(#gLapel)", { pattern: patt, strokeWidth: 0.9 });
    if (leftCollar) {
      out += piece(leftCollar, cloth.dark, { strokeWidth: 0.7 });
      out += piece(rightCollar, cloth.dark, { strokeWidth: 0.7 });
    }
    // under-collar at the back of the neck
    out += piece(`M144 69 Q150 74 156 69 L 154 75 Q 150 78 146 75 Z`, cloth.dark, { strokeWidth: 0.7 });
    // pick stitching along the lapel edges
    out += `<path d="M129 107 C 127 133 134 163 ${closL - 2} ${breakY - 5}"
              stroke="rgba(255,255,255,0.15)" stroke-width="0.7" fill="none" stroke-dasharray="1.6 2.8"/>
            <path d="M171 107 C 173 133 166 163 ${closR + 2} ${breakY - 5}"
              stroke="rgba(255,255,255,0.15)" stroke-width="0.7" fill="none" stroke-dasharray="1.6 2.8"/>`;
    return out;
  }

  function pocketsMarkup(type, cloth, patt) {
    const y = 232;
    const flap = (x) =>
      piece(`M${x} ${y} h32 a2 2 0 0 1 2 2 v4 q-18 5 -36 0 v-4 a2 2 0 0 1 2 -2 Z`,
        "url(#gLapel)", { pattern: patt, strokeWidth: 0.8 }) +
      `<path d="M${x - 1} ${y} h36" stroke="rgba(5,9,18,0.35)" stroke-width="0.8"/>`;
    const jet = (x) =>
      `<rect x="${x}" y="${y}" width="34" height="2.6" rx="1.3" fill="${cloth.dark}" stroke="rgba(5,9,18,0.4)" stroke-width="0.5"/>`;
    const patch = (x) =>
      piece(`M${x} ${y - 3} h30 v22 q-15 6 -30 0 Z`, "url(#gLapel)", { pattern: patt, strokeWidth: 0.8 }) +
      `<path d="M${x} ${y + 1} h30" stroke="rgba(5,9,18,0.25)" stroke-width="0.6"/>`;
    const fn = type === "jetted" ? jet : type === "patch" ? patch : flap;
    return fn(112) + fn(156);
  }

  function renderSuit() {
    const root = $("#svgRoot");
    if (!root) return;

    const cloth = CLOTH[design.color] || CLOTH.navy;
    const patt = design.pattern !== "solid" ? design.pattern : null;
    const btnColor = BUTTON_COLORS[design.buttons] || BUTTON_COLORS.darkhorn;
    const liningColor = liningById(design.lining).hex;
    const db = design.style === "db";
    const { breakY, rows } = stanceInfo(design.style);
    // the V of shirt/tie ends where the fronts meet
    const vApexY = db ? 158 : breakY - 2;

    let svg = suitDefs(cloth);

    /* floor shadow */
    svg += `<ellipse cx="150" cy="486" rx="62" ry="9" fill="url(#gShadow)"/>`;

    /* hanger */
    svg += `<path d="M150 46 v-12 q0 -8 8 -8" fill="none" stroke="#8f99ac" stroke-width="2.6" stroke-linecap="round"/>
            <path d="M72 64 Q150 30 228 64" fill="none" stroke="#8f99ac" stroke-width="3.2" stroke-linecap="round"/>
            <path d="M72 64 Q150 34 228 64" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-linecap="round"/>`;

    /* trousers */
    svg += piece(
      `M112 266 L147 266 C 148 280 149 290 150 300
       L 146 468 L 117 468 C 113 400 110 330 112 266 Z`,
      "url(#gTrouser)", { pattern: patt }
    );
    svg += piece(
      `M188 266 L153 266 C 152 280 151 290 150 300
       L 154 468 L 183 468 C 187 400 190 330 188 266 Z`,
      "url(#gTrouser)", { pattern: patt }
    );
    // gap between the legs
    svg += `<path d="M150 302 L146.5 468 L153.5 468 Z" fill="rgba(5,9,18,0.4)" stroke="none"/>`;
    // creases
    svg += `<path d="M130 290 L129 464" stroke="rgba(255,255,255,0.12)" stroke-width="1.6" fill="none"/>
            <path d="M132 290 L131 464" stroke="rgba(5,9,18,0.3)" stroke-width="0.8" fill="none"/>
            <path d="M170 290 L171 464" stroke="rgba(255,255,255,0.12)" stroke-width="1.6" fill="none"/>
            <path d="M168 290 L169 464" stroke="rgba(5,9,18,0.3)" stroke-width="0.8" fill="none"/>`;
    if (design.trousers === "pleated") {
      svg += `<path d="M138 268 L139 284 M162 268 L161 284" stroke="rgba(5,9,18,0.4)" stroke-width="1.1" fill="none"/>`;
    }
    if (design.hem === "cuffed") {
      svg += `<path d="M117.5 457 L146 457 L146 468 L117 468 Z" fill="${cloth.dark}" stroke="rgba(5,9,18,0.4)" stroke-width="0.7"/>
              <path d="M154 457 L182.5 457 L183 468 L154 468 Z" fill="${cloth.dark}" stroke="rgba(5,9,18,0.4)" stroke-width="0.7"/>`;
    }

    /* jacket torso */
    svg += piece(
      `M88 78
       C 96 71 124 65 139 67
       Q 150 73 161 67
       C 176 65 204 71 212 78
       C 210 92 205 104 202 116
       C 198 150 196 172 194 196
       C 195 228 192 252 190 272
       L 110 272
       C 108 252 105 228 106 196
       C 104 172 102 150 98 116
       C 95 104 90 92 88 78 Z`,
      "url(#gCloth)", { pattern: patt }
    );
    // side shading
    svg += `<path d="M98 116 C 104 172 106 228 110 272 L 120 272 C 115 220 113 160 112 118 Z"
              fill="rgba(5,9,18,0.16)" stroke="none"/>
            <path d="M202 116 C 196 172 194 228 190 272 L 180 272 C 185 220 187 160 188 118 Z"
              fill="rgba(5,9,18,0.16)" stroke="none"/>`;

    /* V opening: shirt, collar points, tie — then waistcoat over the shirt */
    svg += `<path d="M141 72 L159 72 L150 ${vApexY} Z" fill="url(#gShirt)" stroke="rgba(5,9,18,0.25)" stroke-width="0.6"/>`;
    svg += `<path d="M141 71 L150 87 L146 72 Z" fill="#e4e7ec" stroke="rgba(5,9,18,0.2)" stroke-width="0.5"/>
            <path d="M159 71 L150 87 L154 72 Z" fill="#e4e7ec" stroke="rgba(5,9,18,0.2)" stroke-width="0.5"/>`;
    const tieTip = design.vest === "vest" ? 132 : vApexY - 16;
    svg += `<path d="M145.5 77 L154.5 77 L157 89 L143 89 Z" fill="${liningColor}" stroke="rgba(5,9,18,0.35)" stroke-width="0.7"/>
            <path d="M146.5 89 L153.5 89 L152.5 ${tieTip} L150 ${tieTip + 9} L147.5 ${tieTip} Z" fill="${liningColor}" stroke="rgba(5,9,18,0.35)" stroke-width="0.7"/>
            <path d="M147 78 L150 88" stroke="rgba(255,255,255,0.28)" stroke-width="1" fill="none"/>`;

    if (design.vest === "vest") {
      svg += piece(
        `M141 94 L150 146 L159 94 L165 102
         C 164 128 158 148 152 ${vApexY - 2}
         L 148 ${vApexY - 2}
         C 142 148 136 128 135 102 Z`,
        cloth.dark, { pattern: patt, strokeWidth: 0.8 }
      );
      svg += [152, 163, 174].map((y) => refinedButton(150, y, btnColor, 2)).join("");
    }

    /* closure + quarters + darts */
    const closureX = db ? 164 : 150;
    svg += `<path d="M${closureX} ${breakY} L ${closureX + (db ? 1 : 0.5)} 268" stroke="rgba(5,9,18,0.4)" stroke-width="1" fill="none"/>
            <path d="M150 248 L145 272 L155 272 Z" fill="rgba(5,9,18,0.28)" stroke="none"/>`;
    if (db) {
      svg += `<path d="M172 110 L138 268" stroke="rgba(5,9,18,0.16)" stroke-width="1" fill="none"/>`;
    }
    svg += `<path d="M128 150 C 127 180 127 210 129 240 M172 150 C 173 180 173 210 171 240"
              stroke="rgba(5,9,18,0.18)" stroke-width="0.8" fill="none"/>`;

    /* sleeves */
    svg += piece(
      `M88 78 C 76 92 70 122 70 152 C 70 196 72 236 76 262
       C 77 271 82 274 90 274 C 98 274 101 269 102 260
       C 104 220 102 160 98 116 C 95 104 90 92 88 78 Z`,
      "url(#gCloth)", { pattern: patt }
    );
    svg += piece(
      `M212 78 C 224 92 230 122 230 152 C 230 196 228 236 224 262
       C 223 271 218 274 210 274 C 202 274 199 269 198 260
       C 196 220 198 160 202 116 C 205 104 210 92 212 78 Z`,
      "url(#gCloth)", { pattern: patt }
    );
    svg += `<path d="M98 116 C 102 170 103 225 101 258 L 96 258 C 96 210 95 160 93 120 Z"
              fill="rgba(5,9,18,0.2)" stroke="none"/>
            <path d="M202 116 C 198 170 197 225 199 258 L 204 258 C 204 210 205 160 207 120 Z"
              fill="rgba(5,9,18,0.2)" stroke="none"/>`;
    svg += [250, 257, 264].map((y) => refinedButton(84, y, btnColor, 1.9)).join("");
    svg += [250, 257, 264].map((y) => refinedButton(216, y, btnColor, 1.9)).join("");

    /* lapels + collar */
    svg += lapelMarkup(design.style, design.lapel, cloth, patt);

    /* breast pocket: square first, welt over its base */
    svg += `<path d="M117 150 l4 -6.5 l3.5 4.5 l4.5 -6 l3 5.5 l0.5 4.5 l-15 1.5 Z"
              fill="${liningColor}" stroke="rgba(5,9,18,0.3)" stroke-width="0.5"/>
            <path d="M114.5 153.5 L136 150.5" stroke="${cloth.dark}" stroke-width="3.6" stroke-linecap="round"/>`;

    /* hip pockets + front buttons */
    svg += pocketsMarkup(design.pockets, cloth, patt);
    if (db) {
      rows.forEach((y) => {
        svg += refinedButton(137, y, btnColor) + refinedButton(163, y, btnColor);
      });
    } else {
      rows.forEach((y) => { svg += refinedButton(150, y, btnColor); });
    }

    /* monogram */
    if (design.monogram) {
      svg += `<path d="M110 502 H132 M168 502 H190" stroke="rgba(157,184,240,0.4)" stroke-width="0.8"/>
              <text x="150" y="507" text-anchor="middle" font-size="15"
                fill="#c6cedd" font-family="Cormorant Garamond, Georgia, serif" font-style="italic"
                letter-spacing="2">${escapeHtml(design.monogram)}</text>`;
    }

    root.innerHTML = svg;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  /* ---------------- design summary ---------------- */

  const SUMMARY_ROWS = [
    ["cust.fabric", () => {
      const f = fabricById(design.fabric);
      return `${t(f.nameKey)} · ${f.weight} g/m² (${f.code})`;
    }],
    ["cust.color", () => t("cust.color." + design.color)],
    ["cust.pattern", () => t("cust.pattern." + design.pattern)],
    ["cust.style", () => t("cust.style." + design.style)],
    ["cust.lapel", () => t("cust.lapel." + design.lapel)],
    ["cust.vents", () => t("cust.vents." + design.vents)],
    ["cust.pockets", () => t("cust.pockets." + design.pockets)],
    ["cust.buttons", () => t("cust.buttons." + design.buttons)],
    ["cust.lining", () => {
      const l = liningById(design.lining);
      return `${t(l.nameKey)} · ${t(l.matKey)}`;
    }],
    ["cust.trousers", () => t("cust.trousers." + design.trousers) + " · " + t("cust.hem." + design.hem)],
    ["cust.vest", () => t("cust.vest." + design.vest)],
    ["cust.monogram", () => design.monogram || t("cust.none")]
  ];

  function summaryText() {
    return SUMMARY_ROWS
      .map(([key, val]) => `${t(key)}: ${val()}`)
      .join("\n");
  }

  function renderSummary() {
    const list = $("#summaryList");
    if (!list) return;
    list.innerHTML = SUMMARY_ROWS
      .map(
        ([key, val]) =>
          `<li><span class="k">${t(key)}</span><span class="v">${escapeHtml(val())}</span></li>`
      )
      .join("");
  }

  /* ---------------- measurements ---------------- */

  const IN_TO_CM = 2.54;

  function toCm(value) {
    if (value == null || value === "" || isNaN(value)) return null;
    const v = parseFloat(value);
    return unit === "in" ? v * IN_TO_CM : v;
  }

  function fmt(n) {
    return (Math.round(n * 10) / 10).toLocaleString(lang === "en" ? "en-US" : lang, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }

  function renderMeasurements() {
    const grid = $("#measGrid");
    if (!grid) return;
    grid.innerHTML = MEAS_GROUPS.map((group) => {
      const rows = group.fields.map((f) => {
        const val = measurements[f] != null ? measurements[f] : "";
        const cm = toCm(val);
        return `
        <div class="meas-row">
          <div class="meas-label">
            ${t("meas." + f)}
            <small>${t("meas." + f + ".hint")}</small>
          </div>
          <input class="meas-input" type="number" min="0" step="0.1"
                 inputmode="decimal" data-field="${f}" value="${val}"
                 aria-label="${t("meas." + f)} (${unit})" />
          <div class="meas-cm ${cm == null ? "empty" : ""}" data-cm-for="${f}"
               title="${t("meas.colHint")}">
            ${cm == null ? "— cm" : `${fmt(cm)} <span class="unit">cm</span>`}
          </div>
        </div>`;
      }).join("");
      return `<h3 class="meas-group-title">${t("meas.group." + group.key)}</h3>${rows}`;
    }).join("");

    $all(".meas-input", grid).forEach((input) => {
      input.addEventListener("input", () => {
        const f = input.dataset.field;
        measurements[f] = input.value === "" ? null : parseFloat(input.value);
        save("csb-meas", measurements);
        save("csb-unit", unit);
        const cell = $(`[data-cm-for="${f}"]`, grid);
        const cm = toCm(measurements[f]);
        cell.classList.toggle("empty", cm == null);
        cell.innerHTML = cm == null ? "— cm" : `${fmt(cm)} <span class="unit">cm</span>`;
      });
    });
  }

  function bindUnitToggle() {
    $all(".unit-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.unit === unit);
      btn.addEventListener("click", () => {
        const next = btn.dataset.unit;
        if (next === unit) return;
        // convert stored values in place so the numbers keep their meaning
        MEAS_FIELDS.forEach((f) => {
          if (measurements[f] != null && !isNaN(measurements[f])) {
            measurements[f] =
              Math.round(
                (next === "cm" ? measurements[f] * IN_TO_CM : measurements[f] / IN_TO_CM) * 10
              ) / 10;
          }
        });
        unit = next;
        save("csb-unit", unit);
        save("csb-meas", measurements);
        $all(".unit-btn").forEach((b) => b.classList.toggle("active", b === btn));
        renderMeasurements();
      });
    });
  }

  function measurementsTextCm() {
    return MEAS_FIELDS.filter((f) => measurements[f] != null && !isNaN(measurements[f]))
      .map((f) => `${t("meas." + f)}: ${fmt(toCm(measurements[f]))} cm`)
      .join("\n");
  }

  /* ---------------- contact form ---------------- */

  function bindForm() {
    const copyBtn = $("#copyMeasBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        save("csb-meas", measurements);
        save("csb-unit", unit);
        const flag = $("#measSaved");
        if (flag) {
          flag.hidden = false;
          setTimeout(() => (flag.hidden = true), 2500);
        }
        const contact = $("#contact");
        if (contact) contact.scrollIntoView({ behavior: "smooth" });
      });
    }

    const form = $("#quoteForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const attach = $("#attachDesign").checked;
      let body = `${data.get("name") || ""} <${data.get("email") || ""}>\n\n${data.get("message") || ""}\n`;
      if (attach) {
        body += `\n----- ${t("cust.summary")} -----\n${summaryText()}\n`;
        const meas = measurementsTextCm();
        if (meas) body += `\n----- ${t("meas.title")} (cm) -----\n${meas}\n`;
      }
      const mailto =
        "mailto:atelier@carlossanchezbespoke.com" +
        "?subject=" + encodeURIComponent("Quote request — Carlos Sanchez Bespoke") +
        "&body=" + encodeURIComponent(body);
      window.location.href = mailto;
      const status = $("#formStatus");
      if (status) {
        status.textContent = t("contact.sent");
        status.hidden = false;
      }
    });
  }

  /* ---------------- nav / language / reveal ---------------- */

  function bindNav() {
    const burger = $("#navBurger");
    const nav = $("#mainNav");
    if (burger && nav) {
      burger.addEventListener("click", () => nav.classList.toggle("open"));
      $all("a", nav).forEach((a) =>
        a.addEventListener("click", () => nav.classList.remove("open"))
      );
    }
    $all(".lang-btn").forEach((btn) =>
      btn.addEventListener("click", () => applyLang(btn.dataset.lang))
    );
  }

  function bindLightbox() {
    const box = $("#lightbox");
    const img = $("#lightboxImg");
    if (!box || !img) return;

    $all(".gallery-item").forEach((fig) => {
      fig.addEventListener("click", () => {
        const thumb = $("img", fig);
        img.src = fig.dataset.full || (thumb && thumb.src) || "";
        img.alt = (thumb && thumb.alt) || "";
        box.hidden = false;
        document.body.style.overflow = "hidden";
      });
    });

    function close() {
      box.hidden = true;
      img.src = "";
      document.body.style.overflow = "";
    }
    box.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !box.hidden) close();
    });
  }

  function bindReveal() {
    const observed = $all(".section .container, .hero-inner");
    // stagger cards inside sections for a choreographed entrance
    const items = $all(".service-card, .gallery-item, .stat, .faq-item");
    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 90}ms`;
    });
    const all = observed.concat(items);
    all.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in-view");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12 }
    );
    all.forEach((el) => io.observe(el));
  }

  function bindHeaderShrink() {
    const header = $(".site-header");
    if (!header) return;
    window.addEventListener(
      "scroll",
      () => header.classList.toggle("scrolled", window.scrollY > 50),
      { passive: true }
    );
  }

  /* ---------------- init ---------------- */

  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    renderCatalogUI();
    bindOptionGroups();
    bindUnitToggle();
    bindForm();
    bindLightbox();
    bindReveal();
    bindHeaderShrink();
    applyLang(lang);
    renderSuit();
  });
})();
