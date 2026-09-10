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

  const DESIGN_DEFAULTS = {
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
  };
  const DESIGN_KEYS = Object.keys(DESIGN_DEFAULTS);
  const DESIGN_VALID = {
    fabric: ["wool", "linen", "cotton", "cashmere", "tropical", "flannel"],
    color: ["navy", "charcoal", "black", "grey", "brown", "burgundy", "olive", "cream"],
    pattern: ["solid", "pinstripe", "windowpane", "herringbone"],
    style: ["sb2", "sb3", "db"],
    lapel: ["notch", "peak", "shawl"],
    vents: ["none", "single", "double"],
    pockets: ["flap", "jetted", "patch"],
    buttons: ["darkhorn", "naturalhorn", "pearl", "brass"],
    lining: ["burgundy", "royal", "gold", "emerald", "plum", "black"],
    trousers: ["flat", "pleated"],
    hem: ["plain", "cuffed"],
    vest: ["none", "vest"]
  };

  // ?d=fabric.color.pattern.style.lapel.vents.pockets.buttons.lining.trousers.hem.vest.monogram
  function decodeDesign(str) {
    if (!str) return null;
    const parts = str.split(".");
    const out = {};
    DESIGN_KEYS.forEach((k, i) => {
      const v = parts[i];
      if (v == null) return;
      if (k === "monogram") out[k] = decodeURIComponent(v).slice(0, 4);
      else if (DESIGN_VALID[k].includes(v)) out[k] = v;
    });
    return out;
  }
  function encodeDesign(d) {
    return DESIGN_KEYS.map((k) => (k === "monogram" ? encodeURIComponent(d[k] || "") : d[k])).join(".");
  }

  const design = Object.assign(
    {},
    DESIGN_DEFAULTS,
    load("csb-design"),
    decodeDesign(new URLSearchParams(window.location.search).get("d"))
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
      if (url.searchParams.has("d")) url.searchParams.set("d", encodeDesign(design));
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
    if (typeof bindTilt === "function") bindTilt($("#optFabric"));
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
        if (prop === "lining") renderLiningCaption();
        onDesignChange();
      });
    });

    const mono = $("#monogram");
    if (mono) {
      mono.value = design.monogram || "";
      mono.addEventListener("input", () => {
        design.monogram = mono.value.trim();
        onDesignChange();
      });
    }
  }

  function onDesignChange() {
    save("csb-design", design);
    renderSuit();
    renderSummary();
    // keep the address bar shareable once a design has been touched
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("d", encodeDesign(design));
      history.replaceState(null, "", url);
    } catch (e) { /* file:// */ }
  }

  /* ---------------- SVG suit preview ---------------- */
  /* Worn fashion-flat (invisible figure), after the client's reference:
     shirt collar + tie, sloped shoulders, arms at the sides with hands,
     open front quarters over full-length trousers ending in shoes.
     Canvas 300x580. Draw order: shadow, trousers+shoes, torso, V-opening
     (shirt/tie/vest), quarters/closure, sleeves+hands, lapels, pockets. */

  function piece(d, fill, opts) {
    opts = opts || {};
    const stroke = opts.stroke || "rgba(5,9,18,0.5)";
    const sw = opts.strokeWidth != null ? opts.strokeWidth : 1;
    let out = `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    if (opts.pattern) {
      out += `<path d="${d}" fill="url(#${opts.pattern})" stroke="none"/>`;
    }
    if (opts.weave) {
      // woven-cloth texture: fine twill diagonal + irregular yarn grain
      out += `<path d="${d}" fill="url(#gTwill)" stroke="none"/>`;
      out += `<path d="${d}" fill="url(#gGrain)" stroke="none"/>`;
    }
    return out;
  }

  // soft fold: paired dark/light strokes read as a cloth wrinkle
  function fold(d, strength) {
    const k = strength || 1;
    return `<path d="${d}" stroke="rgba(5,9,18,${0.14 * k})" stroke-width="2.6" fill="none" stroke-linecap="round"/>
            <path d="${d}" transform="translate(0,-1.6)" stroke="rgba(255,255,255,${0.05 * k})" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
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
        <stop offset="0" stop-color="${cloth.dark}"/>
        <stop offset="0.5" stop-color="${cloth.base}"/>
        <stop offset="1" stop-color="${cloth.dark}"/>
      </linearGradient>
      <radialGradient id="gShadow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="rgba(6,10,20,0.5)"/>
        <stop offset="1" stop-color="rgba(6,10,20,0)"/>
      </radialGradient>
      <linearGradient id="gShirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f4f5f7"/>
        <stop offset="1" stop-color="#d3d8df"/>
      </linearGradient>
      <linearGradient id="gShoe" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a3423"/>
        <stop offset="1" stop-color="#241708"/>
      </linearGradient>
      <pattern id="gTwill" patternUnits="userSpaceOnUse" width="3" height="3"
               patternTransform="rotate(0)">
        <path d="M0 3 L3 0" stroke="rgba(255,255,255,0.045)" stroke-width="0.7"/>
      </pattern>
      <pattern id="gGrain" patternUnits="userSpaceOnUse" width="46" height="46">
        <rect width="46" height="46" fill="transparent"/>
        <circle cx="7" cy="11" r="0.5" fill="rgba(255,255,255,0.06)"/>
        <circle cx="21" cy="4" r="0.4" fill="rgba(0,0,0,0.10)"/>
        <circle cx="33" cy="17" r="0.5" fill="rgba(255,255,255,0.05)"/>
        <circle cx="12" cy="27" r="0.4" fill="rgba(0,0,0,0.08)"/>
        <circle cx="39" cy="33" r="0.5" fill="rgba(255,255,255,0.06)"/>
        <circle cx="26" cy="40" r="0.4" fill="rgba(0,0,0,0.10)"/>
        <circle cx="4" cy="41" r="0.4" fill="rgba(255,255,255,0.05)"/>
        <circle cx="43" cy="8" r="0.4" fill="rgba(0,0,0,0.08)"/>
      </pattern>
    </defs>`;
  }

  function stanceInfo(style) {
    // y of the top closure button / lapel break point on the worn figure
    if (style === "sb3") return { breakY: 182, rows: [182, 204, 226] };
    if (style === "db") return { breakY: 194, rows: [192, 212, 232] };
    return { breakY: 198, rows: [198, 224] };
  }

  function refinedButton(x, y, color, r) {
    r = r || 3.2;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="rgba(5,9,18,0.55)" stroke-width="0.8"/>
            <circle cx="${x - r * 0.32}" cy="${y - r * 0.32}" r="${r * 0.3}" fill="rgba(255,255,255,0.35)"/>`;
  }

  function lapelMarkup(style, lapelType, cloth, patt) {
    const { breakY } = stanceInfo(style);
    const db = style === "db";
    const closL = db ? 163 : 150;
    const closR = db ? 137 : 150;

    let leftLapel, rightLapel, leftCollar = "", rightCollar = "";

    if (lapelType === "shawl") {
      leftLapel = `M142 52 C 130 68 124 90 126 116 C 128 150 136 178 ${closL} ${breakY} L 141 56 Z`;
      rightLapel = `M158 52 C 170 68 176 90 174 116 C 172 150 164 178 ${closR} ${breakY} L 159 56 Z`;
    } else if (lapelType === "peak") {
      leftLapel = `M141 54 L 131 100 L 116 92 C 120 122 130 165 ${closL} ${breakY} Z`;
      rightLapel = `M159 54 L 169 100 L 184 92 C 180 122 170 165 ${closR} ${breakY} Z`;
      leftCollar = `M145 46 C 137 56 133 74 131 96 L 134 99 C 137 76 141 58 149 50 Z`;
      rightCollar = `M155 46 C 163 56 167 74 169 96 L 166 99 C 163 76 159 58 151 50 Z`;
    } else { // notch
      leftLapel = `M141 54 C 134 70 130 88 128 106 C 126 140 134 172 ${closL} ${breakY} Z`;
      rightLapel = `M159 54 C 166 70 170 88 172 106 C 174 140 166 172 ${closR} ${breakY} Z`;
      leftCollar = `M145 46 C 138 56 133 72 130 94 L 135 100 C 138 78 142 60 149 50 Z`;
      rightCollar = `M155 46 C 162 56 167 72 170 94 L 165 100 C 162 78 158 60 151 50 Z`;
    }

    let out = "";
    out += piece(leftLapel, "url(#gLapel)", { pattern: patt, weave: true, strokeWidth: 0.9 });
    out += piece(rightLapel, "url(#gLapel)", { pattern: patt, weave: true, strokeWidth: 0.9 });
    if (leftCollar) {
      out += piece(leftCollar, cloth.dark, { strokeWidth: 0.7 });
      out += piece(rightCollar, cloth.dark, { strokeWidth: 0.7 });
    }
    // pick stitching along the lapel edges
    out += `<path d="M129 108 C 127 140 135 170 ${closL - 2} ${breakY - 5}"
              stroke="rgba(255,255,255,0.15)" stroke-width="0.7" fill="none" stroke-dasharray="1.6 2.8"/>
            <path d="M171 108 C 173 140 165 170 ${closR + 2} ${breakY - 5}"
              stroke="rgba(255,255,255,0.15)" stroke-width="0.7" fill="none" stroke-dasharray="1.6 2.8"/>`;
    return out;
  }

  function pocketsMarkup(type, cloth, patt) {
    const y = 272;
    const flap = (x) =>
      piece(`M${x} ${y} h30 a2 2 0 0 1 2 2 v4 q-17 5 -34 0 v-4 a2 2 0 0 1 2 -2 Z`,
        cloth.base, { pattern: patt, strokeWidth: 0.8 }) +
      `<path d="M${x - 1} ${y} h34" stroke="rgba(5,9,18,0.35)" stroke-width="0.8"/>`;
    const jet = (x) =>
      `<rect x="${x}" y="${y}" width="32" height="2.6" rx="1.3" fill="${cloth.dark}" stroke="rgba(5,9,18,0.4)" stroke-width="0.5"/>`;
    const patch = (x) =>
      piece(`M${x} ${y - 3} h28 v20 q-14 6 -28 0 Z`, cloth.base, { pattern: patt, strokeWidth: 0.8 }) +
      `<path d="M${x} ${y + 1} h28" stroke="rgba(5,9,18,0.25)" stroke-width="0.6"/>`;
    const fn = type === "jetted" ? jet : type === "patch" ? patch : flap;
    return fn(116) + fn(152);
  }

  function handMarkup(cx, topY) {
    // minimal mannequin fist below the shirt cuff
    return `<path d="M${cx - 9} ${topY}
              C ${cx - 11} ${topY + 8} ${cx - 10} ${topY + 18} ${cx - 6} ${topY + 24}
              C ${cx - 2} ${topY + 28} ${cx + 5} ${topY + 28} ${cx + 8} ${topY + 23}
              C ${cx + 11} ${topY + 16} ${cx + 11} ${topY + 7} ${cx + 9} ${topY}
              Z"
              fill="#1b2334" stroke="rgba(5,9,18,0.55)" stroke-width="0.8"/>
            <path d="M${cx - 6} ${topY + 10} q4 2.5 8 0 M${cx - 6} ${topY + 16} q4 2.5 8 0"
              stroke="rgba(5,9,18,0.4)" stroke-width="0.7" fill="none"/>`;
  }

  function shoeMarkup(side) {
    // side: -1 left leg, 1 right leg; toes angle slightly outward
    if (side < 0) {
      return `<path d="M126 508 L145 508 C 148 513 149 520 146 525
                C 141 533 126 538 111 538 C 99 538 90 534 89 528
                C 88 522 95 515 108 511 C 115 509 121 508 126 508 Z"
                fill="url(#gShoe)" stroke="rgba(5,9,18,0.55)" stroke-width="1"/>
              <path d="M90 531 C 102 537 130 535 145 524" stroke="rgba(0,0,0,0.5)" stroke-width="1.5" fill="none"/>
              <path d="M124 512 C 116 512 106 515 100 519" stroke="rgba(255,255,255,0.16)" stroke-width="1" fill="none"/>`;
    }
    return `<path d="M174 508 L155 508 C 152 513 151 520 154 525
              C 159 533 174 538 189 538 C 201 538 210 534 211 528
              C 212 522 205 515 192 511 C 185 509 179 508 174 508 Z"
              fill="url(#gShoe)" stroke="rgba(5,9,18,0.55)" stroke-width="1"/>
            <path d="M210 531 C 198 537 170 535 155 524" stroke="rgba(0,0,0,0.5)" stroke-width="1.5" fill="none"/>
            <path d="M176 512 C 184 512 194 515 200 519" stroke="rgba(255,255,255,0.16)" stroke-width="1" fill="none"/>`;
  }

  /* ---- photo-layer preview (photoreal path; falls back to SVG) ---- */

  let previewMode = load("csb-preview") || "photo";

  // exact style+colour photo, else the nearest photographed garment in that colour
  function findBasePhoto() {
    const pl = CATALOG.photoLayers;
    if (!pl || !pl.enabled || !pl.available) return null;
    const exact = `base-${design.style}-${design.color}.png`;
    if (pl.available.includes(exact)) return { name: exact, approx: false };
    for (const st of ["sb2", "sb3", "db"]) {
      const n = `base-${st}-${design.color}.png`;
      if (pl.available.includes(n)) return { name: n, approx: true };
    }
    return null;
  }

  function photoLayerFiles() {
    const pl = CATALOG.photoLayers;
    const base = findBasePhoto();
    if (!base) return null;
    const files = [];
    for (const l of pl.stack) {
      if (l.when && !l.when(design)) continue;
      let name;
      if (l.id === "base") name = base.name;
      else {
        name = l.file
          .replace("{style}", design.style)
          .replace("{color}", design.color)
          .replace("{lapel}", design.lapel)
          .replace("{pockets}", design.pockets);
        if (!pl.available.includes(name)) continue; // option not photographed yet — skip silently
      }
      const path = pl.base + name;
      // bundled previews (artifacts) inject data URIs here
      const data = window.__PHOTO_LAYER_DATA__ && window.__PHOTO_LAYER_DATA__[path];
      files.push({ src: data || path, optional: l.id !== "base" });
    }
    files.approx = base.approx;
    return files;
  }

  function setPreviewCaption(mode) {
    // mode: "photo" | "approx" | "illustration"
    const cap = $(".preview-caption");
    if (cap) {
      const key = mode === "photo" ? "cust.previewCaption.photo"
        : mode === "approx" ? "cust.previewCaption.approx" : "cust.previewCaption";
      cap.setAttribute("data-i18n", key);
      cap.innerHTML = t(key);
    }
    const hasPhoto = !!findBasePhoto();
    const toggle = $("#previewToggle");
    if (toggle) {
      toggle.hidden = !hasPhoto;
      $all(".pt-btn", toggle).forEach((b) =>
        b.classList.toggle("active", b.dataset.mode === (mode === "illustration" ? "illustration" : "photo"))
      );
    }
    const jump = $("#photoJump");
    if (jump) jump.hidden = hasPhoto || !firstPhotoTarget();
  }

  // first combination that has a real base photo, e.g. {style:"sb2", color:"navy"}
  function firstPhotoTarget() {
    const pl = CATALOG.photoLayers;
    if (!pl || !pl.enabled || !pl.available) return null;
    for (const name of pl.available) {
      const m = name.match(/^base-([a-z0-9]+)-([a-z0-9]+)\.png$/);
      if (m) return { style: m[1], color: m[2] };
    }
    return null;
  }

  function syncOptionButtons() {
    Object.entries(OPTION_GROUPS).forEach(([groupId, prop]) => {
      const group = $("#" + groupId);
      if (!group) return;
      $all("button", group).forEach((b) =>
        b.classList.toggle("active", b.dataset.value === design[prop])
      );
    });
  }

  function bindPhotoJump() {
    const jump = $("#photoJump");
    if (jump) {
      jump.addEventListener("click", () => {
        const target = firstPhotoTarget();
        if (!target) return;
        design.style = target.style;
        design.color = target.color;
        save("csb-design", design);
        syncOptionButtons();
        renderSuit();
        renderSummary();
      });
    }
    $all("#previewToggle .pt-btn").forEach((b) =>
      b.addEventListener("click", () => {
        previewMode = b.dataset.mode;
        save("csb-preview", previewMode);
        renderSuit();
      })
    );
  }

  function showIllustration() {
    const wrap = $("#photoPreview");
    const svgEl = $("#suitPreview");
    if (wrap) wrap.hidden = true;
    if (svgEl) svgEl.style.display = "";
    setPreviewCaption("illustration");
  }

  function renderPhotoPreview() {
    const wrap = $("#photoPreview");
    const svgEl = $("#suitPreview");
    if (!wrap || !svgEl) return false;
    const files = previewMode === "photo" ? photoLayerFiles() : null;
    if (!files || !files.length) { showIllustration(); return false; }
    wrap.innerHTML = files
      .map((f, i) => `<img src="${f.src}" alt="" style="z-index:${i + 1}" draggable="false" ${f.optional ? 'data-optional="1"' : ""}/>`)
      .join("");
    let failed = false;
    $all("img", wrap).forEach((im) =>
      im.addEventListener("error", () => {
        if (im.dataset.optional) { im.remove(); return; }
        if (failed) return;
        failed = true;
        showIllustration();
      })
    );
    wrap.hidden = false;
    svgEl.style.display = "none";
    setPreviewCaption(files.approx ? "approx" : "photo");
    return true;
  }

  function renderSuit() {
    const root = $("#svgRoot");
    if (!root) return;

    if (CATALOG.photoLayers && CATALOG.photoLayers.enabled) {
      renderPhotoPreview();
      // keep rendering the SVG below as the live fallback
    }

    const cloth = CLOTH[design.color] || CLOTH.navy;
    const patt = design.pattern !== "solid" ? design.pattern : null;
    const btnColor = BUTTON_COLORS[design.buttons] || BUTTON_COLORS.darkhorn;
    const liningColor = liningById(design.lining).hex;
    const db = design.style === "db";
    const { breakY, rows } = stanceInfo(design.style);
    const vApexY = db ? 172 : breakY - 2;

    let svg = suitDefs(cloth);

    /* floor shadow */
    svg += `<ellipse cx="150" cy="544" rx="78" ry="10" fill="url(#gShadow)"/>`;

    /* trousers (visible between and below the open quarters) */
    svg += piece(
      `M121 240 L149 240 C 150 268 150 296 150 322
       L 145 508 L 126 508 C 121 430 119 330 121 240 Z`,
      "url(#gTrouser)", { pattern: patt, weave: true }
    );
    svg += piece(
      `M179 240 L151 240 C 150 268 150 296 150 322
       L 155 508 L 174 508 C 179 430 181 330 179 240 Z`,
      "url(#gTrouser)", { pattern: patt, weave: true }
    );
    // gap between the legs
    svg += `<path d="M150 324 L146.5 508 L153.5 508 Z" fill="rgba(5,9,18,0.4)" stroke="none"/>`;
    // creases
    svg += `<path d="M136 330 L135 504" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" fill="none"/>
            <path d="M138 330 L137 504" stroke="rgba(5,9,18,0.3)" stroke-width="0.8" fill="none"/>
            <path d="M164 330 L165 504" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" fill="none"/>
            <path d="M162 330 L163 504" stroke="rgba(5,9,18,0.3)" stroke-width="0.8" fill="none"/>`;
    // drape at the knees and calf
    svg += fold("M128 398 C 133 402 140 402 144 399", 0.8);
    svg += fold("M156 398 C 160 402 167 402 172 399", 0.8);
    svg += fold("M129 448 C 133 451 139 451 143 449", 0.5);
    svg += fold("M157 448 C 161 451 167 451 171 449", 0.5);

    if (design.trousers === "pleated") {
      svg += `<path d="M142 318 L143 336 M158 318 L157 336" stroke="rgba(5,9,18,0.4)" stroke-width="1.1" fill="none"/>`;
    }
    if (design.hem === "cuffed") {
      svg += `<path d="M126.5 497 L145.3 497 L145 508 L126 508 Z" fill="${cloth.dark}" stroke="rgba(5,9,18,0.4)" stroke-width="0.7"/>
              <path d="M154.7 497 L173.5 497 L174 508 L155 508 Z" fill="${cloth.dark}" stroke="rgba(5,9,18,0.4)" stroke-width="0.7"/>`;
    }

    /* shoes */
    svg += shoeMarkup(-1) + shoeMarkup(1);

    /* jacket torso — sloped shoulders, waist suppression, open quarters */
    svg += piece(
      `M150 46
       C 143 45 136 46 132 49
       C 112 56 92 64 76 74
       C 86 90 96 106 102 122
       C 106 152 108 178 110 204
       C 111 240 114 278 118 306
       C 124 314 131 317 138 316
       C 143 306 147 282 150 246
       C 153 282 157 306 162 316
       C 169 317 176 314 182 306
       C 186 278 189 240 190 204
       C 192 178 194 152 198 122
       C 204 106 214 90 224 74
       C 208 64 188 56 168 49
       C 164 46 157 45 150 46 Z`,
      "url(#gCloth)", { pattern: patt, weave: true }
    );
    // side shading
    svg += `<path d="M102 122 C 106 176 111 250 118 306 L 126 313 C 119 250 115 176 112 126 Z"
              fill="rgba(5,9,18,0.16)" stroke="none"/>
            <path d="M198 122 C 194 176 189 250 182 306 L 174 313 C 181 250 185 176 188 126 Z"
              fill="rgba(5,9,18,0.16)" stroke="none"/>`;

    /* V opening: shirt, collar points, tie — then waistcoat */
    svg += `<path d="M141 48 L159 48 L150 ${vApexY} Z" fill="url(#gShirt)" stroke="rgba(5,9,18,0.25)" stroke-width="0.6"/>`;
    // shirt collar
    svg += `<path d="M140 44 L150 66 L145 47 Z" fill="#e4e7ec" stroke="rgba(5,9,18,0.25)" stroke-width="0.6"/>
            <path d="M160 44 L150 66 L155 47 Z" fill="#e4e7ec" stroke="rgba(5,9,18,0.25)" stroke-width="0.6"/>
            <path d="M140 44 Q150 38.5 160 44" fill="none" stroke="rgba(5,9,18,0.3)" stroke-width="0.8"/>`;
    const tieTip = design.vest === "vest" ? 158 : vApexY - 14;
    svg += `<path d="M146 54 L154 54 L156.5 66 L143.5 66 Z" fill="${liningColor}" stroke="rgba(5,9,18,0.35)" stroke-width="0.7"/>
            <path d="M147 66 L153 66 L152.3 ${tieTip} L150 ${tieTip + 8} L147.7 ${tieTip} Z" fill="${liningColor}" stroke="rgba(5,9,18,0.35)" stroke-width="0.7"/>
            <path d="M147.5 55 L150 65" stroke="rgba(255,255,255,0.28)" stroke-width="1" fill="none"/>`;

    if (design.vest === "vest") {
      svg += piece(
        `M142 68 L150 124 L158 68 L166 80
         C 165 112 160 148 152 ${vApexY - 2}
         L 148 ${vApexY - 2}
         C 140 148 135 112 134 80 Z`,
        cloth.dark, { pattern: patt, strokeWidth: 0.8 }
      );
      svg += [134, 148, 162].map((y) => refinedButton(150, y, btnColor, 2)).join("");
    }

    /* closure + quarter shadows + darts */
    const closureX = db ? 163 : 150;
    svg += `<path d="M${closureX} ${breakY} L ${db ? 161 : 150} 246" stroke="rgba(5,9,18,0.4)" stroke-width="1" fill="none"/>
            <path d="M150 246 C 147 280 144 302 139 315" stroke="rgba(5,9,18,0.4)" stroke-width="1" fill="none"/>
            <path d="M150 246 C 153 280 156 302 161 315" stroke="rgba(5,9,18,0.4)" stroke-width="1" fill="none"/>`;
    if (db) {
      svg += `<path d="M170 112 L142 288" stroke="rgba(5,9,18,0.16)" stroke-width="1" fill="none"/>`;
    }
    svg += `<path d="M130 162 C 129 196 129 232 132 274 M170 162 C 171 196 171 232 168 274"
              stroke="rgba(5,9,18,0.18)" stroke-width="0.8" fill="none"/>`;
    // tension folds pulling from the fastened button
    const bx = rows[0];
    svg += fold(`M${db ? 163 : 150} ${bx} C 143 ${bx + 7} 134 ${bx + 12} 126 ${bx + 13}`, 0.7);
    svg += fold(`M${db ? 137 : 150} ${bx} C 157 ${bx + 7} 166 ${bx + 12} 174 ${bx + 13}`, 0.7);
    // soft chest drape
    svg += fold("M124 128 C 122 152 121 176 122 198", 0.5);
    svg += fold("M176 128 C 178 152 179 176 178 198", 0.5);
    // shadow the jacket casts on the trousers at the hem
    svg += `<path d="M120 306 C 128 315 136 318 141 317 L 141 322 C 133 323 126 320 118 312 Z" fill="rgba(5,9,18,0.28)" stroke="none"/>
            <path d="M180 306 C 172 315 164 318 159 317 L 159 322 C 167 323 174 320 182 312 Z" fill="rgba(5,9,18,0.28)" stroke="none"/>`;

    /* sleeves: hang at the sides, separate from the body below the armpit */
    svg += piece(
      `M76 74 C 64 92 58 118 57 148 C 55 198 60 262 66 316
       C 67 325 72 329 82 329 C 91 329 95 325 96 317
       C 100 260 100 200 100 124 C 96 106 86 90 76 74 Z`,
      "url(#gCloth)", { pattern: patt, weave: true }
    );
    svg += piece(
      `M224 74 C 236 92 242 118 243 148 C 245 198 240 262 234 316
       C 233 325 228 329 218 329 C 209 329 205 325 204 317
       C 200 260 200 200 200 124 C 204 106 214 90 224 74 Z`,
      "url(#gCloth)", { pattern: patt, weave: true }
    );
    // separation between arm and body (reads as the gap in the flat)
    svg += `<path d="M100 126 C 101 192 103 258 107 308" stroke="rgba(5,9,18,0.55)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
            <path d="M200 126 C 199 192 197 258 193 308" stroke="rgba(5,9,18,0.55)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    // elbow drape
    svg += fold("M62 210 C 68 214 76 215 82 212", 0.9);
    svg += fold("M64 232 C 70 235 77 236 82 233", 0.6);
    svg += fold("M238 210 C 232 214 224 215 218 212", 0.9);
    svg += fold("M236 232 C 230 235 223 236 218 233", 0.6);
    // shoulder roll highlight
    svg += `<path d="M80 78 C 90 70 104 64 118 60" stroke="rgba(255,255,255,0.09)" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M220 78 C 210 70 196 64 182 60" stroke="rgba(255,255,255,0.09)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    // cuff buttons
    svg += [306, 313, 320].map((y) => refinedButton(70, y, btnColor, 1.8)).join("");
    svg += [306, 313, 320].map((y) => refinedButton(230, y, btnColor, 1.8)).join("");

    /* shirt cuffs + hands */
    svg += `<path d="M70 329 L94 329 L93 336 L71 336 Z" fill="url(#gShirt)" stroke="rgba(5,9,18,0.3)" stroke-width="0.6"/>
            <path d="M206 329 L230 329 L229 336 L207 336 Z" fill="url(#gShirt)" stroke="rgba(5,9,18,0.3)" stroke-width="0.6"/>`;
    svg += handMarkup(82, 336) + handMarkup(218, 336);

    /* lapels + jacket collar */
    svg += lapelMarkup(design.style, design.lapel, cloth, patt);
    svg += piece(`M142 46 Q150 41.5 158 46 L 155 51.5 Q 150 49 145 51.5 Z`, cloth.dark, { strokeWidth: 0.7 });

    // lapel roll: soft shadow along the breakline gives the fold depth
    svg += `<path d="M147 60 C 143 110 143 150 ${db ? 160 : 147} ${breakY - 8}"
              stroke="rgba(5,9,18,0.22)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
            <path d="M153 60 C 157 110 157 150 ${db ? 140 : 153} ${breakY - 8}"
              stroke="rgba(5,9,18,0.22)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    // lapel buttonhole (wearer's left lapel = viewer left)
    svg += `<path d="M133 112 L139 110" stroke="rgba(5,9,18,0.55)" stroke-width="1.4" stroke-linecap="round"/>
            <path d="M133 112 L139 110" transform="translate(0,-0.9)" stroke="rgba(255,255,255,0.12)" stroke-width="0.6" stroke-linecap="round"/>`;

    /* breast welt + pocket square — wearer's left chest (viewer right) */
    svg += `<path d="M167 142 l4 -6.5 l3.5 4.5 l4.5 -6 l3 5.5 l0.5 4.5 l-15 1.5 Z"
              fill="${liningColor}" stroke="rgba(5,9,18,0.3)" stroke-width="0.5"/>
            <path d="M164.5 145.5 L186 142.5" stroke="${cloth.dark}" stroke-width="3.4" stroke-linecap="round"/>`;

    /* hip pockets + front buttons */
    svg += pocketsMarkup(design.pockets, cloth, patt);
    // shadow under the pocket flaps
    if (design.pockets === "flap") {
      svg += `<path d="M115 279 q17 5 34 0 l0 2 q-17 5 -34 0 Z" fill="rgba(5,9,18,0.3)" stroke="none"/>
              <path d="M151 279 q17 5 34 0 l0 2 q-17 5 -34 0 Z" fill="rgba(5,9,18,0.3)" stroke="none"/>`;
    }
    if (db) {
      rows.forEach((y) => {
        svg += `<path d="M144 ${y} h5" stroke="rgba(5,9,18,0.4)" stroke-width="1"/>`;
        svg += refinedButton(138, y, btnColor) + refinedButton(162, y, btnColor);
      });
    } else {
      rows.forEach((y) => {
        svg += `<path d="M153 ${y} h5" stroke="rgba(5,9,18,0.4)" stroke-width="1"/>`;
        svg += refinedButton(150, y, btnColor);
      });
    }

    /* monogram */
    if (design.monogram) {
      svg += `<path d="M105 566 H130 M170 566 H195" stroke="rgba(157,184,240,0.4)" stroke-width="0.8"/>
              <text x="150" y="571" text-anchor="middle" font-size="15"
                fill="#c6cedd" font-family="Cormorant Garamond, Georgia, serif" font-style="italic"
                letter-spacing="2">${escapeHtml(design.monogram)}</text>`;
    }

    root.innerHTML = svg;

    // settle animation on every change so the preview feels alive
    const frame = $(".preview-frame");
    if (frame) {
      frame.classList.remove("pulse");
      void frame.offsetWidth;
      frame.classList.add("pulse");
    }
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

  let lastSummary = {};

  function renderSummary() {
    const rows = SUMMARY_ROWS.map(([key, val]) => [key, val()]);
    const html = rows
      .map(
        ([key, v]) =>
          `<li class="${lastSummary[key] != null && lastSummary[key] !== v ? "changed" : ""}">
             <span class="k">${t(key)}</span><span class="v">${escapeHtml(v)}</span></li>`
      )
      .join("");
    $all(".summary-list").forEach((list) => { list.innerHTML = html; });
    rows.forEach(([key, v]) => { lastSummary[key] = v; });
    renderPrice();

    const sub = $("#designBarSub");
    if (sub) {
      const f = fabricById(design.fabric);
      sub.textContent = `${t("cust.color." + design.color)} · ${t("cust.style." + design.style)} · ${t(f.nameKey)}`;
    }
  }

  /* indicative price — table lives in js/catalog.js (owner-editable) */
  function estimatePrice() {
    const pr = CATALOG.pricing;
    if (!pr) return null;
    let total = pr.base + (pr.fabric[design.fabric] || 0);
    if (design.vest === "vest") total += pr.vest;
    if (design.style === "db") total += pr.doubleBreasted;
    if (design.pattern !== "solid") total += pr.pattern;
    return total;
  }

  function renderPrice() {
    const total = estimatePrice();
    $all("[data-price]").forEach((el) => {
      el.textContent = total == null ? "" :
        t("cust.priceFrom") + " " + total.toLocaleString(lang === "en" ? "en-US" : lang, {
          style: "currency", currency: CATALOG.pricing.currency, maximumFractionDigits: 0
        });
    });
  }

  /* stepped configurator */
  let step = 0;
  function showStep(next, dir) {
    const panels = $all(".step-panel");
    if (!panels.length) return;
    step = Math.max(0, Math.min(panels.length - 1, next));
    panels.forEach((p) => {
      const on = Number(p.dataset.step) === step;
      p.classList.toggle("active", on);
      p.classList.toggle("back", on && dir < 0);
    });
    $all(".step-btn").forEach((b) => {
      const i = Number(b.dataset.step);
      b.classList.toggle("active", i === step);
      b.classList.toggle("done", i < step);
    });
    const prog = $("#stepProgress");
    if (prog) prog.style.width = ((step + 1) / panels.length) * 100 + "%";
    const back = $("#stepBack");
    const nxt = $("#stepNext");
    if (back) back.disabled = step === 0;
    if (nxt) {
      const last = step === panels.length - 1;
      nxt.setAttribute("data-i18n", last ? "cust.next" : "cust.nextStep");
      nxt.textContent = t(last ? "cust.next" : "cust.nextStep");
    }
    save("csb-step", step);
  }

  function bindSteps() {
    $all(".step-btn").forEach((b) =>
      b.addEventListener("click", () => showStep(Number(b.dataset.step), Number(b.dataset.step) > step ? 1 : -1))
    );
    const back = $("#stepBack");
    const nxt = $("#stepNext");
    if (back) back.addEventListener("click", () => showStep(step - 1, -1));
    if (nxt) nxt.addEventListener("click", () => {
      if (step === $all(".step-panel").length - 1) {
        const m = $("#measurements");
        if (m) m.scrollIntoView({ behavior: "smooth" });
        return;
      }
      showStep(step + 1, 1);
      // on phones keep the options in view under the sticky preview
      if (window.matchMedia("(max-width: 820px)").matches) {
        const nav = $(".step-nav");
        if (nav) nav.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    const saved = load("csb-step");
    showStep(typeof saved === "number" ? saved : 0, 1);
  }

  /* share link, reset, mobile bar + sheet */
  function bindDesignActions() {
    $all("[data-share-design]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const url = new URL(window.location.href);
        url.hash = "customize";
        url.searchParams.set("d", encodeDesign(design));
        const link = url.toString();
        try {
          await navigator.clipboard.writeText(link);
        } catch (e) {
          window.prompt(t("cust.share"), link);
        }
        const label = btn.textContent;
        btn.textContent = t("cust.shared");
        btn.classList.add("done");
        setTimeout(() => { btn.textContent = label; btn.classList.remove("done"); }, 2200);
      })
    );
    $all("[data-reset-design]").forEach((btn) =>
      btn.addEventListener("click", () => {
        Object.assign(design, DESIGN_DEFAULTS);
        const mono = $("#monogram");
        if (mono) mono.value = "";
        syncOptionButtons();
        renderCatalogUI();
        onDesignChange();
        showStep(0, -1);
      })
    );

    const bar = $("#designBar");
    const sheet = $("#designSheet");
    const section = $("#customize");
    if (bar && section) {
      bar.hidden = false;
      const io = new IntersectionObserver(
        (entries) => entries.forEach((en) => bar.classList.toggle("show", en.isIntersecting)),
        { threshold: 0.08 }
      );
      io.observe(section);
    }
    if (bar && sheet) {
      const open = () => { sheet.hidden = false; document.body.style.overflow = "hidden"; };
      const close = () => { sheet.hidden = true; document.body.style.overflow = ""; };
      $("#designBarOpen").addEventListener("click", open);
      $all("[data-sheet-close]", sheet).forEach((el) => el.addEventListener("click", close));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) close(); });
    }
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

  // plausible adult ranges in inches — outside → gentle "double-check" hint
  const MEAS_RANGE = {
    neck: [12, 22], chest: [30, 60], waist: [24, 58], shoulders: [14, 24], sleeve: [20, 30],
    jacketLength: [24, 36], wrist: [5, 10], trouserWaist: [24, 58], hips: [30, 60],
    thigh: [16, 34], inseam: [24, 40], outseam: [34, 50], height: [55, 84]
  };

  function measWarning(f, val) {
    if (val == null || isNaN(val)) return false;
    const r = MEAS_RANGE[f];
    if (!r) return false;
    const inches = unit === "in" ? val : val / IN_TO_CM;
    return inches < r[0] || inches > r[1];
  }

  function renderMeasProgress() {
    const done = MEAS_FIELDS.filter((f) => measurements[f] != null && !isNaN(measurements[f])).length;
    const txt = $("#measProgressText");
    const fill = $("#measProgressFill");
    if (txt) txt.textContent = t("meas.progress").replace("{n}", done).replace("{total}", MEAS_FIELDS.length);
    if (fill) fill.style.width = (done / MEAS_FIELDS.length) * 100 + "%";
  }

  function renderMeasurements() {
    const grid = $("#measGrid");
    if (!grid) return;
    grid.innerHTML = MEAS_GROUPS.map((group) => {
      const rows = group.fields.map((f) => {
        const val = measurements[f] != null ? measurements[f] : "";
        const cm = toCm(val);
        const warn = measWarning(f, measurements[f]);
        return `
        <div class="meas-row ${cm != null ? "filled" : ""} ${warn ? "warn" : ""}" data-row="${f}">
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
          <p class="meas-warn" ${warn ? "" : "hidden"}>${t("meas.warn")}</p>
        </div>`;
      }).join("");
      return `<h3 class="meas-group-title">${t("meas.group." + group.key)}</h3>${rows}`;
    }).join("");
    renderMeasProgress();

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
        const row = $(`[data-row="${f}"]`, grid);
        const warn = measWarning(f, measurements[f]);
        row.classList.toggle("warn", warn);
        row.classList.toggle("filled", cm != null);
        $(".meas-warn", row).hidden = !warn;
        renderMeasProgress();
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
      const status = $("#formStatus");
      const nameEl = form.elements.name;
      const emailEl = form.elements.email;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim());
      nameEl.classList.toggle("invalid", !nameEl.value.trim());
      emailEl.classList.toggle("invalid", !emailOk);
      if (!nameEl.value.trim() || !emailOk) {
        if (status) { status.textContent = t("contact.invalid"); status.className = "form-status error"; status.hidden = false; }
        (!nameEl.value.trim() ? nameEl : emailEl).focus();
        return;
      }
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
      if (status) {
        status.textContent = t("contact.sent");
        status.className = "form-status";
        status.hidden = false;
      }
    });
    ["name", "email"].forEach((n) =>
      form.elements[n].addEventListener("input", () => form.elements[n].classList.remove("invalid"))
    );
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
    const items = $all(".gallery-item");
    if (!items.length) return;
    let index = 0;

    function show(i) {
      index = (i + items.length) % items.length;
      const fig = items[index];
      const thumb = $("img", fig);
      const cap = $("figcaption", fig);
      img.src = fig.dataset.full || (thumb && thumb.src) || "";
      img.alt = (thumb && thumb.alt) || "";
      $("#lightboxCaption").textContent = cap ? cap.textContent.trim() : "";
      $("#lightboxCount").textContent = `${index + 1} / ${items.length}`;
      // preload neighbours for instant paging
      [index + 1, index - 1].forEach((n) => {
        const f = items[(n + items.length) % items.length];
        const pre = new Image();
        pre.src = f.dataset.full || ($("img", f) || {}).src || "";
      });
    }
    function open(i) {
      show(i);
      box.hidden = false;
      document.body.style.overflow = "hidden";
    }
    function close() {
      box.hidden = true;
      img.src = "";
      document.body.style.overflow = "";
    }

    items.forEach((fig, i) => fig.addEventListener("click", () => open(i)));
    $(".lightbox-close", box).addEventListener("click", close);
    $(".lightbox-prev", box).addEventListener("click", (e) => { e.stopPropagation(); show(index - 1); });
    $(".lightbox-next", box).addEventListener("click", (e) => { e.stopPropagation(); show(index + 1); });
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "ArrowLeft") show(index - 1);
    });
    let touchX = null;
    box.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (e) => {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 40) show(dx < 0 ? index + 1 : index - 1);
    }, { passive: true });
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

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COARSE_POINTER = window.matchMedia("(pointer: coarse)").matches;

  function bindTilt(root) {
    if (REDUCED_MOTION || COARSE_POINTER) return;
    $all(".gallery-item, .fabric-card, .service-card", root).forEach((el) => {
      if (el.dataset.tilt) return;
      el.dataset.tilt = "1";
      el.classList.add("tiltable");
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = "transform 0.12s ease";
        el.style.transform =
          `perspective(700px) rotateY(${(x * 5).toFixed(2)}deg) rotateX(${(y * -5).toFixed(2)}deg) translateY(-3px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform 0.35s ease";
        el.style.transform = "";
      });
    });
  }

  function bindCounters() {
    $all(".stat-num").forEach((el) => {
      const raw = el.textContent;
      const m = raw.match(/([\d,]+)/);
      if (!m) return;
      const target = parseInt(m[1].replace(/,/g, ""), 10);
      if (REDUCED_MOTION || !isFinite(target)) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          io.unobserve(el);
          const t0 = performance.now();
          const DUR = 1400;
          (function tick(now) {
            const p = Math.min(1, (now - t0) / DUR);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = raw.replace(
              m[1],
              Math.round(target * eased).toLocaleString("en-US")
            );
            if (p < 1) requestAnimationFrame(tick);
          })(t0);
        });
      }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  function bindScrollThread() {
    const thread = $("#scrollThread");
    if (!thread) return;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      thread.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
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
    bindSteps();
    bindDesignActions();
    bindUnitToggle();
    bindForm();
    bindPhotoJump();
    bindLightbox();
    bindReveal();
    bindHeaderShrink();
    bindTilt();
    bindCounters();
    bindScrollThread();
    applyLang(lang);
    renderSuit();
  });
})();
