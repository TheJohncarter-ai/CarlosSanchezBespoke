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

  const LINING_COLORS = {
    burgundy: "#6d1f31", royal: "#1f3f8f", gold: "#b98a2e",
    emerald: "#1d5c45", plum: "#4b2a4e", black: "#191919"
  };

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

    renderSummary();
    renderMeasurements();
  }

  /* ---------------- customizer ---------------- */

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

  function piece(d, fill, opts) {
    opts = opts || {};
    const stroke = opts.stroke || "rgba(0,0,0,0.45)";
    const sw = opts.strokeWidth != null ? opts.strokeWidth : 1.2;
    let out = `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    if (opts.pattern) {
      out += `<path d="${d}" fill="url(#${opts.pattern})" stroke="none"/>`;
    }
    return out;
  }

  function lapelPaths(style, lapelType) {
    // Returns [leftLapelPath, rightLapelPath] as SVG path strings.
    // Coordinate frame: neck at (150, 78), button stance depth depends on style.
    const stanceY = style === "sb3" ? 150 : style === "db" ? 165 : 168;
    const cross = style === "db" ? 14 : 0; // double-breasted overlap

    if (lapelType === "shawl") {
      return [
        `M150 78 C136 84 124 96 121 112 C118 132 128 152 ${150 - cross} ${stanceY} L150 ${stanceY + 8} C142 140 136 108 150 78 Z`,
        `M150 78 C164 84 176 96 179 112 C182 132 172 152 ${150 + cross} ${stanceY} L150 ${stanceY + 8} C158 140 164 108 150 78 Z`
      ];
    }
    if (lapelType === "peak") {
      return [
        `M150 78 L126 92 L133 104 L112 100 L118 118 C116 138 128 154 ${150 - cross} ${stanceY} L150 ${stanceY + 8} C141 140 137 106 150 78 Z`,
        `M150 78 L174 92 L167 104 L188 100 L182 118 C184 138 172 154 ${150 + cross} ${stanceY} L150 ${stanceY + 8} C159 140 163 106 150 78 Z`
      ];
    }
    // notch (default)
    return [
      `M150 78 L128 94 L134 103 L124 112 C120 134 130 152 ${150 - cross} ${stanceY} L150 ${stanceY + 8} C141 140 138 106 150 78 Z`,
      `M150 78 L172 94 L166 103 L176 112 C180 134 170 152 ${150 + cross} ${stanceY} L150 ${stanceY + 8} C159 140 162 106 150 78 Z`
    ];
  }

  function buttonsMarkup(style, btnColor) {
    const r = 3.2;
    const stroke = "rgba(0,0,0,0.5)";
    if (style === "db") {
      const ys = [172, 192, 212];
      return ys
        .map(
          (y) =>
            `<circle cx="136" cy="${y}" r="${r}" fill="${btnColor}" stroke="${stroke}"/>` +
            `<circle cx="164" cy="${y}" r="${r}" fill="${btnColor}" stroke="${stroke}"/>`
        )
        .join("");
    }
    const ys = style === "sb3" ? [156, 176, 196] : [172, 192];
    return ys
      .map((y) => `<circle cx="150" cy="${y}" r="${r}" fill="${btnColor}" stroke="${stroke}"/>`)
      .join("");
  }

  function pocketsMarkup(type, cloth, patt) {
    const y = 208;
    const flap = (x) =>
      piece(`M${x} ${y} h34 v7 q-17 6 -34 0 Z`, cloth.light, { pattern: patt, strokeWidth: 1 });
    const jet = (x) =>
      `<rect x="${x}" y="${y}" width="34" height="3" rx="1.5" fill="${cloth.dark}"/>`;
    const patch = (x) =>
      piece(`M${x} ${y - 4} h32 v26 q-16 7 -32 0 Z`, cloth.light, { pattern: patt, strokeWidth: 1 });
    const fn = type === "jetted" ? jet : type === "patch" ? patch : flap;
    return fn(84) + fn(182);
  }

  function renderSuit() {
    const root = $("#svgRoot");
    if (!root) return;

    const cloth = CLOTH[design.color] || CLOTH.navy;
    const patt = design.pattern !== "solid" ? design.pattern : null;
    const btnColor = BUTTON_COLORS[design.buttons] || BUTTON_COLORS.darkhorn;
    const liningColor = LINING_COLORS[design.lining] || LINING_COLORS.burgundy;
    const db = design.style === "db";

    let svg = "";

    /* hanger bar */
    svg += `<path d="M150 18 q-4 -10 4 -12" fill="none" stroke="#8f8f96" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M60 52 Q150 14 240 52" fill="none" stroke="#8f8f96" stroke-width="3" stroke-linecap="round"/>`;

    /* trousers */
    const hemY = 396;
    const cuffH = 10;
    svg += piece(
      `M116 252 L184 252 L192 ${hemY} L158 ${hemY} L150 296 L142 ${hemY} L108 ${hemY} Z`,
      cloth.base,
      { pattern: patt }
    );
    // creases
    svg += `<path d="M129 262 L126 ${hemY - 4} M171 262 L174 ${hemY - 4}" stroke="rgba(0,0,0,0.28)" stroke-width="1" fill="none"/>`;
    if (design.trousers === "pleated") {
      svg += `<path d="M132 254 L134 274 M168 254 L166 274" stroke="rgba(0,0,0,0.4)" stroke-width="1.4" fill="none"/>`;
    }
    if (design.hem === "cuffed") {
      svg += `<rect x="108" y="${hemY - cuffH}" width="34.5" height="${cuffH}" fill="${cloth.dark}"/>
              <rect x="157.5" y="${hemY - cuffH}" width="34.5" height="${cuffH}" fill="${cloth.dark}"/>`;
    }

    /* shirt + tie */
    svg += `<path d="M136 76 L150 130 L164 76 L158 70 L142 70 Z" fill="#f4f2ec" stroke="rgba(0,0,0,0.2)"/>`;
    svg += `<path d="M146 74 L154 74 L157 84 L150 128 L143 84 Z" fill="${liningColor}" stroke="rgba(0,0,0,0.3)" stroke-width="0.8"/>`;

    /* waistcoat */
    if (design.vest === "vest") {
      svg += piece(
        `M132 92 L150 132 L168 92 L178 108 L172 236 L150 246 L128 236 L122 108 Z`,
        cloth.dark,
        { pattern: patt }
      );
      svg += [160, 180, 200, 218]
        .map((y) => `<circle cx="150" cy="${y}" r="2.4" fill="${btnColor}" stroke="rgba(0,0,0,0.5)"/>`)
        .join("");
    }

    /* jacket body */
    const stanceY = design.style === "sb3" ? 150 : db ? 165 : 168;
    // left front panel
    svg += piece(
      `M150 78 C138 92 132 120 ${db ? 164 : 150} ${stanceY}
       L${db ? 166 : 152} 250 L96 250 C90 210 86 150 92 108 C96 84 118 68 136 62
       C140 70 145 75 150 78 Z`,
      cloth.base,
      { pattern: patt }
    );
    // right front panel
    svg += piece(
      `M150 78 C162 92 168 120 ${db ? 136 : 150} ${stanceY}
       L${db ? 134 : 148} 250 L204 250 C210 210 214 150 208 108 C204 84 182 68 164 62
       C160 70 155 75 150 78 Z`,
      cloth.base,
      { pattern: patt }
    );
    // front closure shadow
    svg += `<path d="M${db ? 164 : 150} ${stanceY} L${db ? 166 : 151} 250" stroke="rgba(0,0,0,0.35)" stroke-width="1.2" fill="none"/>`;

    /* sleeves */
    svg += piece(
      `M92 106 C80 116 72 168 70 224 C69 240 72 248 84 248 C94 248 96 240 97 226 C99 180 98 140 96 112 Z`,
      cloth.base, { pattern: patt }
    );
    svg += piece(
      `M208 106 C220 116 228 168 230 224 C231 240 228 248 216 248 C206 248 204 240 203 226 C201 180 202 140 204 112 Z`,
      cloth.base, { pattern: patt }
    );
    // sleeve buttons
    svg += `<circle cx="84" cy="238" r="2" fill="${btnColor}"/><circle cx="84" cy="231" r="2" fill="${btnColor}"/>
            <circle cx="216" cy="238" r="2" fill="${btnColor}"/><circle cx="216" cy="231" r="2" fill="${btnColor}"/>`;

    /* collar + lapels */
    const [lL, lR] = lapelPaths(design.style, design.lapel);
    svg += piece(lL, cloth.light, { pattern: patt, strokeWidth: 1 });
    svg += piece(lR, cloth.light, { pattern: patt, strokeWidth: 1 });
    // collar
    svg += piece(`M136 62 C142 70 146 74 150 78 C154 74 158 70 164 62 C158 58 142 58 136 62 Z`, cloth.dark, {});

    /* breast pocket square (lining colour accent) */
    svg += `<path d="M97 148 l20 -2 l-2 10 l-17 1 Z" fill="${cloth.base}" stroke="rgba(0,0,0,0.3)"/>
            <path d="M99 147 l7 -6 l4 5 l5 -4 l2 4 Z" fill="${liningColor}"/>`;

    /* pockets + buttons */
    svg += pocketsMarkup(design.pockets, cloth, patt);
    svg += buttonsMarkup(design.style, btnColor);

    /* monogram */
    if (design.monogram) {
      svg += `<text x="150" y="414" text-anchor="middle" font-size="13"
                fill="#d4b76a" font-family="Georgia, serif" font-style="italic"
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
    ["cust.fabric", () => t("cust.fabric." + design.fabric)],
    ["cust.color", () => t("cust.color." + design.color)],
    ["cust.pattern", () => t("cust.pattern." + design.pattern)],
    ["cust.style", () => t("cust.style." + design.style)],
    ["cust.lapel", () => t("cust.lapel." + design.lapel)],
    ["cust.vents", () => t("cust.vents." + design.vents)],
    ["cust.pockets", () => t("cust.pockets." + design.pockets)],
    ["cust.buttons", () => t("cust.buttons." + design.buttons)],
    ["cust.lining", () => t("cust.lining." + design.lining)],
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

  function bindReveal() {
    const observed = $all(".section .container, .hero-inner");
    observed.forEach((el) => el.classList.add("reveal"));
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
    observed.forEach((el) => io.observe(el));
  }

  /* ---------------- init ---------------- */

  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindOptionGroups();
    bindUnitToggle();
    bindForm();
    bindReveal();
    applyLang(lang);
    renderSuit();
  });
})();
