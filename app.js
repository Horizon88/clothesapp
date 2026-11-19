/* Tall Order: swipe-to-style app logic. */
(function () {
  "use strict";

  const D = window.TO_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ state */

  const LS_KEY = "tallorder.v1";
  const DEFAULT_PROFILE = {
    dept: "both",          // m | w | both
    units: "cm",           // cm | in
    height: null,          // cm
    weight: null,          // kg
    usualSize: "",         // XL, 2XL ...
    tallSize: "",          // regular | tall | bigtall
    len: null,             // tee body length, shoulder to hem, cm
    chest: null,           // tee chest, pit to pit (flat), cm
    sleeve: null,          // shoulder seam to cuff, cm
    inseam: null,          // cm
    waist: null,           // waistband flat x2, cm
    outseam: null,         // cm
    shoe: null,            // EU
    regions: ["TH", "US", "CN"],
    allowSemi: false,
    allowStretch: false,
    organic: true,
    climate: "hot"         // hot | mixed | ac
  };

  function defaultState() {
    return { v: 1, profile: { ...DEFAULT_PROFILE }, swipes: {}, history: [], custom: [], queue: [], updatedAt: 0 };
  }

  function normalize(raw) {
    const s = defaultState();
    if (!raw || typeof raw !== "object") return s;
    s.profile = { ...DEFAULT_PROFILE, ...(raw.profile || {}) };
    if (!Array.isArray(s.profile.regions)) s.profile.regions = DEFAULT_PROFILE.regions.slice();
    s.swipes = raw.swipes && typeof raw.swipes === "object" ? { ...raw.swipes } : {};
    s.history = Array.isArray(raw.history) ? raw.history.slice(-300) : [];
    s.custom = Array.isArray(raw.custom) ? raw.custom.filter(validCustom).slice(-80) : [];
    s.queue = Array.isArray(raw.queue) ? raw.queue.slice(0, 40) : [];
    s.updatedAt = Number(raw.updatedAt) || 0;
    return s;
  }

  function loadLocal() {
    try { const t = localStorage.getItem(LS_KEY); return t ? normalize(JSON.parse(t)) : null; } catch (e) { return null; }
  }
  function saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: cloud or memory only */ }
  }

  let S = loadLocal() || defaultState();

  /* --------------------------------------------------------- cloud sync (db) */

  const cloud = { ref: null, ok: false, writing: Promise.resolve(), timer: null, readOnly: false };

  function setSync(text, state) {
    const el = $("#sync");
    el.textContent = text;
    el.dataset.state = state || "";
  }

  async function initCloud() {
    if (!window.claude || typeof window.claude.use !== "function") return;
    let db, user;
    try { [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]); } catch (e) { return; }
    if (!db || !user) return;
    let uid = null;
    try { uid = await user.id(); } catch (e) { uid = null; }
    if (!uid) return;
    try { cloud.ref = db.doc("closets/" + uid); } catch (e) { return; }

    setSync("Connecting…", "busy");
    const slow = setTimeout(() => { if (!cloud.ok) setSync("Saved on this device", ""); }, 10000);
    try {
      const snap = await cloud.ref.get();
      clearTimeout(slow);
      cloud.ok = true;
      if (snap.exists) {
        const remote = normalize(JSON.parse(JSON.stringify(snap.data())));
        if (remote.updatedAt > S.updatedAt) {
          S = remote;
          saveLocal();
          rebuildDeck(0);
          renderAll();
        } else if (S.updatedAt > remote.updatedAt) {
          queueCloudSave();
        }
      } else if (S.updatedAt > 0) {
        queueCloudSave();
      }
      setSync("Synced to your Claude account", "ok");
    } catch (e) {
      clearTimeout(slow);
      cloud.ref = null;
      setSync("Saved on this device", "");
    }
  }

  function queueCloudSave() {
    if (!cloud.ref || cloud.readOnly) return;
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(() => {
      const body = JSON.parse(JSON.stringify(S));
      cloud.writing = cloud.writing.then(() => cloud.ref.set(body)).then(
        () => setSync("Synced to your Claude account", "ok"),
        (e) => {
          if (e && e.code === "invalid_argument") { cloud.readOnly = true; setSync("Saved on this device", ""); }
          else if (e && e.code === "quota_exceeded") { setSync("Cloud storage full; saved on this device", "warn"); }
          else { setSync("Offline; saved on this device", "warn"); }
        }
      );
    }, 900);
  }

  function persist() {
    S.updatedAt = Date.now();
    saveLocal();
    queueCloudSave();
  }

  /* ---------------------------------------------------------------- cards */

  function validCustom(c) {
    return c && typeof c.id === "string" && D.CATEGORIES[c.cat] && D.FABRICS[c.fabric] && Array.isArray(c.colors) && c.colors.length;
  }

  function allItems() {
    return D.ITEMS.concat(S.custom);
  }

  // One card per item colourway.
  function buildCards() {
    const cards = [];
    for (const item of allItems()) {
      for (const color of item.colors) {
        if (!D.COLORS[color]) continue;
        cards.push({ id: item.id + "~" + color, item, color });
      }
    }
    return cards;
  }

  let CARDS = buildCards();
  let CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

  function refreshCards() {
    CARDS = buildCards();
    CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));
  }

  function eligible(card) {
    const p = S.profile;
    const f = D.FABRICS[card.item.fabric];
    if (!f) return false;
    if (f.kind === "semi" && !p.allowSemi) return false;
    if (f.kind === "stretch" && !p.allowStretch) return false;
    if (card.item.dept === "w" && p.dept === "m") return false;
    if (card.item.dept === "m" && p.dept === "w") return false;
    return true;
  }

  function featuresOf(card) {
    const it = card.item;
    const fab = D.FABRICS[it.fabric];
    const feats = [
      ["cat:" + it.cat, 1.0],
      ["fab:" + it.fabric, 0.7],
      ["fib:" + fab.fiber, 0.6],
      ["fam:" + D.COLORS[card.color].fam, 0.5],
      ["clr:" + card.color, 0.3]
    ];
    for (const v of it.vibe || []) feats.push(["vib:" + v, 0.5]);
    return feats;
  }

  const ACTION_DELTA = { like: 1, love: 2, nope: -1 };

  function tasteWeights() {
    const w = Object.create(null);
    for (const [id, sw] of Object.entries(S.swipes)) {
      const card = CARD_BY_ID.get(id);
      if (!card) continue;
      const d = ACTION_DELTA[sw.a] || 0;
      for (const [f] of featuresOf(card)) w[f] = (w[f] || 0) + d;
    }
    return w;
  }

  const jitter = new Map();
  function jit(id) {
    if (!jitter.has(id)) jitter.set(id, Math.random() * 0.6);
    return jitter.get(id);
  }

  function scoreCard(card, w) {
    let s = 0;
    for (const [f, k] of featuresOf(card)) s += k * Math.tanh((w[f] || 0) / 2) * 2;
    const fab = D.FABRICS[card.item.fabric];
    const p = S.profile;
    const heat = p.climate === "hot" ? 0.45 : p.climate === "mixed" ? 0.2 : 0;
    s += heat * (fab.breath - 3);
    if (p.organic && (fab.organic || /organic/i.test(card.item.name))) s += 0.4;
    if (card.item.custom) s += 0.3;
    return s + jit(card.id);
  }

  let deckOrder = [];

  // Rebuild the deck. The first `lock` visible cards stay put so the stack does not jump.
  function rebuildDeck(lock) {
    const w = tasteWeights();
    const pool = CARDS.filter((c) => eligible(c) && !S.swipes[c.id]);
    const poolIds = new Set(pool.map((c) => c.id));
    const kept = deckOrder.slice(0, lock).filter((id) => poolIds.has(id));
    const used = new Set(kept);
    const out = kept.slice();

    for (const id of S.queue) {
      if (poolIds.has(id) && !used.has(id)) { out.push(id); used.add(id); }
    }
    S.queue = S.queue.filter((id) => poolIds.has(id) && !S.swipes[id]);

    const scored = pool.filter((c) => !used.has(c.id)).map((c) => ({ c, s: scoreCard(c, w) }));
    // Greedy pick with a variety penalty so the deck does not show five tees in a row.
    while (scored.length) {
      const recent = out.slice(-3).map((id) => CARD_BY_ID.get(id)).filter(Boolean);
      let best = -1, bestS = -Infinity;
      const lim = Math.min(scored.length, 60);
      for (let i = 0; i < lim; i++) {
        const { c, s } = scored[i];
        let pen = 0;
        for (const r of recent) {
          if (r.item.id === c.item.id) pen += 2.5;
          else if (r.item.cat === c.item.cat) pen += 0.9;
          if (D.CATEGORIES[r.item.cat].group === D.CATEGORIES[c.item.cat].group) pen += 0.25;
        }
        if (s - pen > bestS) { bestS = s - pen; best = i; }
      }
      out.push(scored[best].c.id);
      scored.splice(best, 1);
      if (out.length % 15 === 0) scored.sort((a, b) => b.s - a.s);
    }
    deckOrder = out;
  }

  /* ------------------------------------------------------------- measures */

  const UNIT = () => S.profile.units === "in" ? "in" : "cm";
  function fmtLen(cm, withUnit = true) {
    if (cm == null || cm === "") return "";
    const v = UNIT() === "in" ? cm / 2.54 : cm;
    const r = UNIT() === "in" ? Math.round(v * 2) / 2 : Math.round(v);
    return withUnit ? r + " " + UNIT() : String(r);
  }

  const FIT_LABEL = { len: "length", chest: "chest", sleeve: "sleeve", inseam: "inseam", waist: "waist", outseam: "outseam", height: "height", shoe: "shoe", torso: "torso" };

  function fitKeys(item) {
    let keys = (D.CATEGORIES[item.cat] || {}).fit || [];
    if (item.sleeve === "short") keys = keys.filter((k) => k !== "sleeve");
    return keys;
  }

  // "len ≥ 81 · chest ≥ 64 cm" using the profile, or null when nothing is known.
  function tallCheck(item) {
    const p = S.profile;
    const parts = [];
    for (const k of fitKeys(item)) {
      if (k === "shoe") { if (p.shoe) parts.push("EU " + p.shoe + "+"); continue; }
      if (k === "height") { if (p.height) parts.push("made for " + fmtLen(p.height)); continue; }
      if (k === "waist") { if (p.waist) parts.push("waist " + fmtLen(p.waist, false)); continue; }
      if (k === "torso") continue;
      const v = p[k];
      if (v) parts.push(FIT_LABEL[k] + " ≥ " + fmtLen(v, false));
    }
    if (!parts.length) return null;
    const needsUnit = parts.some((x) => /≥|waist/.test(x));
    return parts.join(" · ") + (needsUnit ? " " + UNIT() : "");
  }

  function tapeTarget(item) {
    const p = S.profile;
    for (const k of fitKeys(item)) {
      if (["len", "inseam", "outseam"].includes(k) && p[k]) return { key: k, cm: p[k] };
    }
    return null;
  }

  /* ---------------------------------------------------------- garment art */

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    return "#" + [f(r), f(g), f(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  function lum(hex) {
    const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function texPattern(tex, pid, pc) {
    const P = (w, h, body) => `<pattern id="${pid}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${body}</pattern>`;
    const L = (d, sw = 1, op = 1) => `<path d="${d}" stroke="${pc}" stroke-width="${sw}" stroke-opacity="${op}" fill="none"/>`;
    switch (tex) {
      case "jersey": return P(5, 5, L("M2.5 0.6 L2.5 3.4", 0.7, 0.55));
      case "slub": return P(44, 14, L("M0 4 H17 M23 4 H44 M3 10 H13 M19 10 H40", 0.8, 0.7) + L("M7 4 H12 M28 10 H33", 2, 0.5));
      case "linen": return P(26, 10, L("M0 3 H26 M0 8 H9 M13 8 H26", 0.8, 0.8) + L("M5 3 H9 M17 8 H22", 2, 0.45) + L("M7 0 V10 M19 0 V10", 0.6, 0.35));
      case "hemp": return P(9, 9, L("M0 2 H9 M0 6.5 H9 M2 0 V9 M6.5 0 V9", 1, 0.55));
      case "gauze": return P(30, 9, L("M0 4.5 Q7.5 0.5 15 4.5 T30 4.5", 0.9, 0.75));
      case "seersucker": return P(14, 14, `<rect x="0" y="0" width="6" height="14" fill="${pc}" fill-opacity="0.35"/>` + L("M6 0 Q7.5 3.5 6 7 T6 14", 0.8, 0.6));
      case "waffle": return P(9, 9, `<rect x="1.2" y="1.2" width="6.6" height="6.6" rx="1" fill="none" stroke="${pc}" stroke-width="1" stroke-opacity="0.7"/>`);
      case "terry": return P(6, 6, `<circle cx="3" cy="3" r="0.9" fill="${pc}" fill-opacity="0.7"/>`);
      case "poplin": return P(4, 4, L("M2 0 V4", 0.5, 0.35));
      case "twill": return P(7, 7, L("M0 7 L7 0 M-2 2 L2 -2 M5 9 L9 5", 1, 0.6));
      case "cord": return P(6, 6, L("M3 0 V6", 2.6, 0.45));
      case "knit": return P(10, 9, L("M0 2 L5 7 L10 2", 1, 0.6));
      case "rib": return P(4, 4, L("M2 0 V4", 1.3, 0.55));
      case "plaid": return P(30, 30,
        `<rect x="0" y="0" width="10" height="30" fill="${pc}" fill-opacity="0.38"/>` +
        `<rect x="0" y="0" width="30" height="10" fill="${pc}" fill-opacity="0.38"/>` +
        L("M20 0 V30 M0 20 H30", 1.2, 0.6));
      default: return P(10, 10, "");
    }
  }

  const TEE = "M84 30 Q100 46 116 30 L146 38 L176 74 L156 96 L146 86 L146 248 L54 248 L54 86 L44 96 L24 74 L54 38 Z";
  const LONGTEE = "M84 30 Q100 46 116 30 L146 38 L182 162 L164 168 L146 102 L146 248 L54 248 L54 102 L36 168 L18 162 L54 38 Z";
  const SHIRT = "M84 28 L116 28 L146 38 L182 166 L164 172 L146 104 L146 236 Q124 254 100 242 Q76 254 54 236 L54 104 L36 172 L18 166 L54 38 Z";
  const CAMP = "M80 28 L120 28 L150 38 L178 84 L156 100 L150 92 L150 246 L50 246 L50 92 L44 100 L22 84 L50 38 Z";
  const PANTS = "M60 18 L140 18 L148 250 L108 250 L100 76 L92 250 L52 250 Z";

  const buttons = (x, y0, y1, n, r = 2.2) => {
    let s = "";
    for (let i = 0; i < n; i++) {
      const y = y0 + ((y1 - y0) * i) / Math.max(1, n - 1);
      s += `<circle cx="${x}" cy="${y}" r="${r}" class="btn-dot"/>`;
    }
    return s;
  };
  const cuffsLong = `<path d="M160 156 L178 150 M22 150 L40 156"/>`;

  function shapeFor(item) {
    const short = item.sleeve === "short";
    switch (item.cat) {
      case "tee": return { body: [TEE], detail: `<path d="M84 30 Q100 46 116 30"/><path d="M57 240 H143" stroke-dasharray="3 3"/>` + (item.id.includes("pocket") ? `<path d="M112 70 h20 v22 h-20 z"/>` : "") };
      case "tank": return { body: ["M78 22 Q100 58 122 22 L134 22 Q134 66 150 86 L150 248 L50 248 L50 86 Q66 66 66 22 Z"], detail: `<path d="M57 240 H143" stroke-dasharray="3 3"/>` };
      case "longtee": return { body: [LONGTEE], detail: `<path d="M84 30 Q100 46 116 30"/>` + cuffsLong };
      case "henley": return { body: [short ? TEE : LONGTEE], detail: `<path d="M84 30 Q100 46 116 30"/><path d="M95 40 V84 H105 V40"/>` + buttons(100, 52, 76, 3) + (short ? "" : cuffsLong) };
      case "polo": return { body: [TEE], detail: `<path d="M84 30 L100 44 L88 54 L77 37 Z M116 30 L100 44 L112 54 L123 37 Z" class="fill-d"/><path d="M96 44 V80 H104 V44"/>` + buttons(100, 56, 72, 2) };
      case "camp": return { body: [CAMP], detail: `<path d="M80 28 L70 46 L100 76 Z M120 28 L130 46 L100 76 Z" class="fill-d"/><path d="M100 76 V246"/>` + buttons(103, 92, 228, 6) };
      case "shirt": return { body: [SHIRT], detail: `<path d="M84 28 L100 44 L87 54 L78 34 Z M116 28 L100 44 L113 54 L122 34 Z" class="fill-d"/><path d="M100 44 V244"/>` + buttons(103, 60, 226, 7) + cuffsLong };
      case "workshirt": return { body: [LONGTEE], detail: `<path d="M84 30 Q100 44 116 30"/><path d="M100 40 V248"/>` + buttons(103, 56, 140, 5, 2.6) + `<path d="M62 168 h28 v34 h-28 z M110 168 h28 v34 h-28 z"/>` + cuffsLong };
      case "overshirt": return { body: [LONGTEE.replace("Q100 46 116 30", "L116 30")], detail: `<path d="M84 30 L100 44 L87 54 L78 34 Z M116 30 L100 44 L113 54 L122 34 Z" class="fill-d"/><path d="M100 44 V248"/>` + buttons(103, 60, 232, 7) + `<path d="M62 76 h26 v26 h-26 z M112 76 h26 v26 h-26 z M62 76 h26 l-2 8 h-22 z M112 76 h26 l-2 8 h-22 z"/>` + (item.id.includes("chore") ? `<path d="M62 168 h28 v32 h-28 z M110 168 h28 v32 h-28 z"/>` : "") + cuffsLong };
      case "kurta": return { body: ["M86 28 Q100 38 114 28 L144 38 L178 158 L160 164 L144 104 L148 254 L52 254 L56 104 L40 164 L22 158 L56 38 Z"], detail: `<path d="M86 28 Q100 38 114 28"/><path d="M100 34 V96"/>` + buttons(103, 46, 88, 4) + `<path d="M147 220 V254 M53 220 V254"/>` };
      case "hoodie": return { body: ["M74 36 Q70 4 100 4 Q130 4 126 36 Z", LONGTEE], detail: `<path d="M82 32 Q100 58 118 32"/><path d="M94 46 L92 82 M106 46 L108 82"/><path d="M68 172 H132 L142 214 H58 Z"/><path d="M54 232 H146"/>` + cuffsLong };
      case "sweat": return { body: [LONGTEE], detail: `<path d="M84 30 Q100 46 116 30 M88 34 Q100 50 112 34"/><path d="M54 232 H146"/>` + cuffsLong };
      case "cardigan": return { body: [LONGTEE], detail: `<path d="M84 30 L100 104 V248 M116 30 L100 104"/>` + buttons(105, 116, 228, 5) + `<path d="M62 188 h24 v26 h-24 z M114 188 h24 v26 h-24 z"/><path d="M54 236 H146"/>` + cuffsLong };
      case "pants": return { body: [PANTS], detail: `<path d="M60 32 H140"/><path d="M95 32 Q91 46 86 54 M105 32 Q109 46 114 54"/><path d="M66 32 Q74 52 63 70 M134 32 Q126 52 137 70"/>` };
      case "widepants": return { body: ["M58 18 L142 18 L168 250 L106 250 L100 86 L94 250 L32 250 Z"], detail: `<path d="M58 32 H142"/><path d="M95 32 Q91 46 86 54 M105 32 Q109 46 114 54"/>` };
      case "fisherman": return { body: ["M40 18 L160 18 L174 250 L106 250 L100 98 L94 250 L26 250 Z"], detail: `<path d="M40 18 H160 V42 H40 Z" class="fill-d"/><path d="M146 42 L158 92 M154 42 L170 86"/>` };
      case "joggers": return { body: ["M60 18 L140 18 L136 236 L108 236 L100 76 L92 236 L64 236 Z", "M64 236 H92 V252 H64 Z M108 236 H136 V252 H108 Z"], detail: `<path d="M60 32 H140"/><path d="M95 32 Q91 46 86 54 M105 32 Q109 46 114 54"/><path d="M70 236 V252 M76 236 V252 M82 236 V252 M86 236 V252 M114 236 V252 M120 236 V252 M126 236 V252 M130 236 V252"/>` };
      case "shorts": return { body: ["M56 74 L144 74 L154 184 L106 184 L100 132 L94 184 L46 184 Z"], detail: `<path d="M56 88 H144"/><path d="M95 88 Q91 102 86 110 M105 88 Q109 102 114 110"/>` };
      case "boxers": return { body: ["M58 84 L142 84 L150 172 L106 172 L100 138 L94 172 L50 172 Z", "M58 84 H142 V98 H58 Z"], detail: `<path d="M100 98 V130"/>` + buttons(100, 106, 120, 2) };
      case "pajama": return {
        body: [],
        detail: "",
        compose: [
          { cat: "camp", t: "translate(-2,8) scale(0.6)" },
          { cat: "pants", t: "translate(84,40) scale(0.62)" }
        ]
      };
      case "robe": return { body: ["M84 26 L116 26 L148 36 L184 136 L160 150 L148 110 L152 252 L48 252 L52 110 L40 150 L16 136 L52 36 Z"], detail: `<path d="M84 26 L112 146 M116 26 L96 124"/><path d="M50 140 H150 V152 H50 Z" class="fill-d"/><path d="M122 152 L114 198 M128 152 L136 194"/>` };
      case "socks": return { body: ["M54 22 H86 V150 Q86 170 106 178 L136 190 Q152 198 146 214 Q140 228 120 222 L68 200 Q54 194 54 176 Z", "M96 12 H128 V140 Q128 160 148 168 L170 177 Q186 185 180 201 Q174 215 156 209 L110 190 Q96 184 96 166 Z"], detail: `<path d="M54 40 H86 M96 30 H128"/><path d="M60 22 V40 M66 22 V40 M72 22 V40 M78 22 V40 M102 12 V30 M108 12 V30 M114 12 V30 M120 12 V30"/>` };
      case "wrap": return { body: ["M44 46 L156 46 L164 252 L36 252 Z"], detail: `<path d="M100 8 Q110 8 110 16 Q110 22 100 26 L38 46 H162 L100 26"/><path d="M70 46 L64 252 M130 46 L136 252"/>` };
      case "dress": return { body: ["M82 24 Q100 42 118 24 L132 28 L138 92 L136 112 L170 254 L30 254 L64 112 L62 92 L68 28 Z"], detail: `<path d="M82 24 Q100 42 118 24"/><path d="M64 112 H136"/><path d="M100 36 V112"/>` + buttons(103, 48, 104, 5) };
      case "jumpsuit": return { body: ["M80 22 Q100 44 120 22 L134 26 L140 112 L152 254 L106 254 L100 152 L94 254 L48 254 L60 112 L66 26 Z"], detail: `<path d="M80 22 Q100 44 120 22"/><path d="M60 112 H140"/><path d="M118 112 L126 150 M124 112 L136 144"/>` };
      default: return { body: [TEE], detail: "" };
    }
  }

  let svgSeq = 0;
  function garmentSVG(item, colorKey, cls = "garment") {
    const hex = (D.COLORS[colorKey] || D.COLORS.raw).hex;
    const fab = D.FABRICS[item.fabric] || D.FABRICS["cotton-jersey"];
    const uid = "g" + (++svgSeq);
    const dark = shade(hex, -0.38);
    const pc = lum(hex) > 0.45 ? "#1d1a14" : "#ffffff";
    const tex = fab.tex;
    const texOp = tex === "plaid" ? 0.75 : lum(hex) > 0.45 ? 0.32 : 0.28;

    const draw = (it, transform) => {
      const sh = shapeFor(it);
      if (sh.compose) return sh.compose.map((c) => draw({ ...it, cat: c.cat, id: it.id }, c.t)).join("");
      const body = sh.body.map((d) => `<path d="${d}" fill="${hex}"/>`).join("");
      const texd = sh.body.map((d) => `<path d="${d}" fill="url(#${uid}p)" opacity="${texOp}"/>`).join("");
      const sheen = tex === "silk" ? sh.body.map((d) => `<path d="${d}" fill="url(#${uid}s)"/>`).join("") : "";
      const outline = sh.body.map((d) => `<path d="${d}" fill="none" stroke="${dark}" stroke-width="1.6" stroke-linejoin="round"/>`).join("");
      return `<g${transform ? ` transform="${transform}"` : ""}>${body}${texd}${sheen}${outline}<g class="dt" fill="none" stroke="${dark}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="--d:${dark};--f:${shade(hex, -0.12)}">${sh.detail}</g></g>`;
    };

    return `<svg class="${cls}" viewBox="0 0 200 260" role="img" aria-label="${esc(D.COLORS[colorKey]?.name + " " + item.name)}">` +
      `<defs>${texPattern(tex, uid + "p", pc)}<linearGradient id="${uid}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
      draw(item) + `</svg>`;
  }

  /* --------------------------------------------------------------- render */

  function heatDots(n) {
    let s = "";
    for (let i = 1; i <= 5; i++) s += `<i class="${i <= n ? "on" : ""}"></i>`;
    return s;
  }

  function tapeHTML(target) {
    // 0–120 cm tape running down the art panel.
    let ticks = "";
    for (let cm = 10; cm < 120; cm += 10) ticks += `<span class="tnum" style="top:${(cm / 120) * 100}%">${cm}</span>`;
    let mark = "";
    if (target) {
      const pct = clamp((target.cm / 120) * 100, 4, 96);
      mark = `<span class="tmark" style="top:${pct}%"><b>${esc(FIT_LABEL[target.key])} ${esc(fmtLen(target.cm))}</b></span>`;
    }
    return `<div class="tape" aria-hidden="true">${ticks}</div>${mark}`;
  }

  function cardHTML(card, depth) {
    const it = card.item;
    const fab = D.FABRICS[it.fabric];
    const col = D.COLORS[card.color];
    const cat = D.CATEGORIES[it.cat];
    const check = tallCheck(it);
    const flags = [];
    if (fab.kind === "semi") flags.push(`<span class="flag flag-warn">Semi-synthetic</span>`);
    if (fab.kind === "stretch") flags.push(`<span class="flag flag-warn">5% stretch</span>`);
    if (fab.organic || /organic/i.test(it.name)) flags.push(`<span class="flag">Look for GOTS</span>`);
    if (it.custom) flags.push(`<span class="flag flag-stylist">From your stylist</span>`);

    return `<article class="card" data-id="${esc(card.id)}" data-depth="${depth}" aria-label="${esc(col.name + " " + it.name)}" ${depth ? 'aria-hidden="true"' : ""}>
      <div class="card-art">
        ${tapeHTML(tapeTarget(it))}
        ${garmentSVG(it, card.color)}
        <div class="heat" title="How it handles Thai heat"><span>Heat</span><span class="dots">${heatDots(fab.breath)}</span></div>
        <span class="stamp stamp-like">Like</span>
        <span class="stamp stamp-nope">Pass</span>
        <span class="stamp stamp-love">Love</span>
      </div>
      <div class="card-info">
        <p class="eyebrow">${esc(fab.label)} · ${esc(cat.label)} · ${esc(col.name)}</p>
        <h2 class="card-name">${esc(it.name)}</h2>
        <p class="card-why">${esc(it.why)}</p>
        <div class="card-foot">
          ${check ? `<p class="check"><span>Tall check</span> ${esc(check)}</p>` : `<p class="check check-empty"><span>Tall check</span> add your measurements in Fit</p>`}
          ${flags.length ? `<div class="flags">${flags.join("")}</div>` : ""}
        </div>
      </div>
    </article>`;
  }

  function renderDeck() {
    const deck = $("#deck");
    const top3 = deckOrder.slice(0, 3);
    if (!top3.length) {
      const swiped = Object.keys(S.swipes).length;
      deck.innerHTML = `<div class="deck-empty">
        <h2>That's the whole rack.</h2>
        <p>You've seen ${swiped} cards. Ask your stylist for new ideas, or allow more fabrics in Fit.</p>
        <div class="row"><a class="btn btn-primary" href="#stylist">Ask the stylist</a><a class="btn" href="#closet">Open closet</a></div>
      </div>`;
      $("#btnNope").disabled = $("#btnLike").disabled = $("#btnLove").disabled = true;
    } else {
      deck.innerHTML = top3.map((id, i) => cardHTML(CARD_BY_ID.get(id), i)).reverse().join("");
      $("#btnNope").disabled = $("#btnLike").disabled = $("#btnLove").disabled = false;
      bindDrag($(".card[data-depth='0']", deck));
    }
    $("#btnUndo").disabled = !S.history.length;
    const p = S.profile;
    $("#setupNudge").hidden = !!(p.height || p.len || p.inseam);
  }

  /* ---------------------------------------------------------------- swipe */

  let busy = false;

  function bindDrag(el) {
    if (!el) return;
    let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, pid = null;
    const likeS = $(".stamp-like", el), nopeS = $(".stamp-nope", el), loveS = $(".stamp-love", el);

    const paint = () => {
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
      likeS.style.opacity = clamp(dx / 110, 0, 1);
      nopeS.style.opacity = clamp(-dx / 110, 0, 1);
      loveS.style.opacity = clamp(-dy / 110 - Math.abs(dx) / 220, 0, 1);
    };

    el.addEventListener("pointerdown", (e) => {
      if (busy || e.button > 0) return;
      dragging = true; pid = e.pointerId;
      sx = e.clientX; sy = e.clientY; dx = dy = 0;
      el.setPointerCapture(pid);
      el.classList.add("dragging");
    });
    el.addEventListener("pointermove", (e) => {
      if (!dragging || e.pointerId !== pid) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      paint();
    });
    const end = (e) => {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false;
      el.classList.remove("dragging");
      const W = el.offsetWidth;
      const thr = Math.min(120, W * 0.28);
      if (dx > thr) fling(el, "like", dx, dy);
      else if (dx < -thr) fling(el, "nope", dx, dy);
      else if (dy < -thr && Math.abs(dx) < thr) fling(el, "love", dx, dy);
      else {
        el.style.transition = "transform .28s cubic-bezier(.2,.9,.3,1.2)";
        dx = dy = 0; paint();
        setTimeout(() => (el.style.transition = ""), 300);
      }
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  function fling(el, action, dx = 0, dy = 0) {
    if (busy) return;
    busy = true;
    const id = el.dataset.id;
    const W = window.innerWidth;
    let tx = dx, ty = dy;
    if (action === "like") { tx = W; ty = dy + 40; }
    if (action === "nope") { tx = -W; ty = dy + 40; }
    if (action === "love") { tx = dx; ty = -window.innerHeight; }
    const stamp = $(".stamp-" + action, el);
    if (stamp) stamp.style.opacity = 1;
    const ms = reduceMotion ? 0 : 320;
    el.style.transition = `transform ${ms}ms ease-in, opacity ${ms}ms ease-in`;
    el.style.transform = `translate(${tx}px, ${ty}px) rotate(${tx / 18}deg)`;
    el.style.opacity = reduceMotion ? 0 : 0.6;
    setTimeout(() => { commitSwipe(id, action); busy = false; }, ms);
  }

  function swipeTop(action) {
    const el = $("#deck .card[data-depth='0']");
    if (!el) return;
    if (action === "love") { const s = $(".stamp-love", el); if (s) s.style.opacity = 1; }
    fling(el, action);
  }

  function commitSwipe(id, action) {
    S.swipes[id] = { a: action, t: Date.now() };
    S.history.push(id);
    if (S.history.length > 300) S.history = S.history.slice(-300);
    S.queue = S.queue.filter((q) => q !== id);
    persist();
    deckOrder = deckOrder.filter((x) => x !== id);
    rebuildDeck(2);
    renderDeck();
    renderTaste();
    renderCount(action !== "nope");
    if (currentView === "closet") renderCloset();
  }

  function undo() {
    if (busy) return;
    const id = S.history.pop();
    if (!id) return;
    delete S.swipes[id];
    persist();
    deckOrder = [id].concat(deckOrder.filter((x) => x !== id));
    rebuildDeck(1);
    renderDeck();
    renderTaste();
    renderCount(false);
    toast("Brought back " + (CARD_BY_ID.get(id)?.item.name || "the last card"));
  }

  /* ---------------------------------------------------------------- taste */

  function featureLabel(f) {
    const [k, v] = f.split(":");
    if (k === "cat") return D.CATEGORIES[v]?.label || v;
    if (k === "fab") return D.FABRICS[v]?.label || v;
    if (k === "fib") return { cotton: "Cotton", linen: "Linen", hemp: "Hemp", wool: "Wool", silk: "Silk", lyocell: "Lyocell" }[v] || v;
    if (k === "fam") return D.COLOR_FAMILIES[v] || v;
    if (k === "clr") return D.COLORS[v]?.name || v;
    if (k === "vib") return D.VIBES[v] || v;
    return v;
  }

  function counts() {
    let like = 0, love = 0, nope = 0;
    for (const sw of Object.values(S.swipes)) {
      if (sw.a === "like") like++; else if (sw.a === "love") love++; else if (sw.a === "nope") nope++;
    }
    return { like, love, nope, total: like + love + nope };
  }

  function topFeatures(w, prefix, n, sign = 1) {
    return Object.entries(w)
      .filter(([f, v]) => f.startsWith(prefix) && v * sign > 0)
      .sort((a, b) => (b[1] - a[1]) * sign)
      .slice(0, n);
  }

  function renderTaste() {
    const c = counts();
    $("#tasteStats").textContent = c.total
      ? `${c.total} swiped · ${c.like + c.love} kept · ${c.love} loved`
      : "Swipe a few cards and this fills in.";
    const w = tasteWeights();
    const groups = [
      ["fib:", "Fibres"],
      ["cat:", "Pieces"],
      ["fam:", "Colours"],
      ["vib:", "Mood"]
    ];
    const max = Math.max(1, ...Object.values(w).map(Math.abs));
    let html = "";
    if (!c.total) {
      html = `<ul class="taste-tips">
        <li>Right if you would wear it at home this week.</li>
        <li>Up for the ones you would buy today.</li>
        <li>Left on anything that is not you. Passing teaches the stylist too.</li>
      </ul>`;
    } else {
      for (const [pre, label] of groups) {
        const pos = topFeatures(w, pre, 3, 1);
        if (!pos.length) continue;
        html += `<div class="tg"><h3>${label}</h3>` + pos.map(([f, v]) =>
          `<div class="bar"><span class="bar-l">${esc(featureLabel(f))}</span><span class="bar-t"><i style="width:${Math.round((v / max) * 100)}%"></i></span></div>`).join("") + `</div>`;
      }
      const neg = Object.entries(w).filter(([f, v]) => v < 0 && !f.startsWith("clr:") && !f.startsWith("fab:")).sort((a, b) => a[1] - b[1]).slice(0, 4);
      if (neg.length) html += `<div class="tg tg-neg"><h3>Skipping</h3><p>${neg.map(([f]) => esc(featureLabel(f))).join(", ")}</p></div>`;
    }
    $("#tasteBody").innerHTML = html;
  }

  function renderCount(bump) {
    const c = counts();
    const el = $("#closetCount");
    el.textContent = c.like + c.love;
    if (bump && !reduceMotion) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }

  /* ---------------------------------------------------------------- stores */

  function storeQuery(store, item) {
    if (store.query) return store.query(item, D.FABRICS[item.fabric]);
    const t = item.terms || {};
    const base = t[store.lang] || t.en || item.name;
    return (store.prefix ? store.prefix + " " : "") + base + (store.suffix ? " " + store.suffix : "");
  }

  function storeLinks(item) {
    const p = S.profile;
    const regions = new Set(p.regions || []);
    const group = (D.CATEGORIES[item.cat] || {}).group;
    return D.STORES.filter((s) => {
      if (s.region !== "Global" && !regions.has(s.region)) return false;
      if (s.dept && s.dept !== "both" && p.dept !== "both" && s.dept !== p.dept) return false;
      if (s.groups && !s.groups.includes(group)) return false;
      if (s.match && !s.match(item, D.FABRICS[item.fabric])) return false;
      return true;
    }).map((s) => {
      const q = storeQuery(s, item);
      const url = s.url.replace("{q}", encodeURIComponent(q));
      return { s, q, url };
    });
  }

  /* --------------------------------------------------------------- closet */

  function keptCards() {
    const out = [];
    for (const [id, sw] of Object.entries(S.swipes)) {
      const c = CARD_BY_ID.get(id);
      if (c && (sw.a === "like" || sw.a === "love")) out.push({ c, a: sw.a, t: sw.t });
    }
    return out.sort((a, b) => (a.a === b.a ? b.t - a.t : a.a === "love" ? -1 : 1));
  }

  function closetItemHTML({ c, a }) {
    const it = c.item;
    const fab = D.FABRICS[it.fabric];
    const check = tallCheck(it);
    const links = storeLinks(it);
    const byRegion = {};
    for (const l of links) (byRegion[l.s.region] = byRegion[l.s.region] || []).push(l);
    const regionName = { TH: "Thailand", US: "USA", CN: "China", Global: "Ships worldwide" };
    const linkHTML = ["TH", "US", "CN", "Global"].filter((r) => byRegion[r]).map((r) =>
      `<div class="store-row"><span class="store-region">${regionName[r]}</span><div class="store-links">` +
      byRegion[r].map((l) => `<a class="store" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" title="${esc(l.s.note || "")}">${esc(l.s.name)}<span aria-hidden="true">↗</span></a>`).join("") +
      `</div></div>`).join("");
    const t = it.terms || {};
    return `<li class="ci" data-id="${esc(c.id)}">
      <div class="ci-art">${garmentSVG(it, c.color, "thumb")}</div>
      <div class="ci-body">
        <p class="eyebrow">${a === "love" ? '<span class="pill pill-love">Loved</span>' : '<span class="pill">Liked</span>'} ${esc(fab.label)} · ${esc(D.COLORS[c.color].name)}</p>
        <h3>${esc(it.name)}</h3>
        ${check ? `<p class="check"><span>Tall check</span> ${esc(check)}</p>` : ""}
        <details class="shop">
          <summary>Where to look</summary>
          ${linkHTML || `<p class="muted">Turn on a region in Fit to see store searches.</p>`}
          <div class="terms">
            ${t.th ? `<button type="button" class="term" data-copy="${esc(t.th + " ไซส์ใหญ่")}"><span>Thai</span>${esc(t.th)} ไซส์ใหญ่</button>` : ""}
            ${t.zh ? `<button type="button" class="term" data-copy="${esc(t.zh + " 加长 大码")}"><span>Chinese</span>${esc(t.zh)} 加长 大码</button>` : ""}
          </div>
          <p class="muted small">Tap a search word to copy it into the Shopee, Lazada or Taobao app. Check every listing's measurement chart against your tall check, not the letter size.</p>
        </details>
      </div>
      <button type="button" class="ci-x" data-unkeep="${esc(c.id)}" aria-label="Remove ${esc(it.name)} from closet" title="Remove">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </li>`;
  }

  function renderCloset() {
    const kept = keptCards();
    const c = counts();
    const body = $("#closetBody");
    if (!kept.length) {
      body.innerHTML = `<div class="empty">
        <p>Nothing kept yet. Swipe right on things you'd wear and they land here with store searches attached.</p>
        <a class="btn btn-primary" href="#swipe">Start swiping</a>
      </div>`;
      $("#btnCopyList").disabled = true;
      return;
    }
    $("#btnCopyList").disabled = false;
    const loved = kept.filter((k) => k.a === "love");
    const liked = kept.filter((k) => k.a === "like");
    let html = "";
    if (loved.length) html += `<h2 class="sec">Loved <span>${loved.length}</span></h2><ul class="closet-list">${loved.map(closetItemHTML).join("")}</ul>`;
    if (liked.length) html += `<h2 class="sec">Liked <span>${liked.length}</span></h2><ul class="closet-list">${liked.map(closetItemHTML).join("")}</ul>`;
    if (c.nope) {
      const passed = Object.entries(S.swipes).filter(([, s]) => s.a === "nope").map(([id]) => CARD_BY_ID.get(id)).filter(Boolean);
      html += `<details class="passed"><summary>Passed <span>${passed.length}</span></summary><ul>` +
        passed.map((p) => `<li><span>${esc(D.COLORS[p.color].name)} ${esc(p.item.name)}</span><button type="button" class="link" data-bringback="${esc(p.id)}">Put back in deck</button></li>`).join("") +
        `</ul></details>`;
    }
    html += storeGuideHTML();
    body.innerHTML = html;
  }

  function storeGuideHTML() {
    const regions = new Set(S.profile.regions || []);
    const names = { TH: "Thailand", US: "USA", CN: "China", Global: "Ships worldwide" };
    const rows = D.STORES.filter((s) => (s.region === "Global" || regions.has(s.region)) && !(s.dept && S.profile.dept !== "both" && s.dept !== S.profile.dept));
    const imports = regions.has("US") || regions.has("CN");
    return `<section class="guide">
      <h2 class="sec">Store guide</h2>
      ${imports ? `<p class="guide-note"><b>Import costs.</b> Since 1 January 2026, Thailand charges import duty plus 7% VAT on every parcel, whatever its value. J.Crew includes duties in its price; elsewhere, budget for it. <a href="https://www.nationthailand.com/business/trade/40060170" target="_blank" rel="noopener noreferrer">Nation Thailand ↗</a></p>` : ""}
      <dl class="guide-list">${rows.map((s) => `<div><dt>${esc(s.name)} <span>${names[s.region]}</span></dt><dd>${esc(s.note || "")}</dd></div>`).join("")}</dl>
    </section>`;
  }

  function shoppingListText() {
    const lines = ["TALL ORDER: shopping list", ""];
    const p = S.profile;
    const meas = [];
    if (p.height) meas.push("height " + fmtLen(p.height));
    if (p.len) meas.push("tee length " + fmtLen(p.len));
    if (p.chest) meas.push("pit-to-pit " + fmtLen(p.chest));
    if (p.sleeve) meas.push("sleeve " + fmtLen(p.sleeve));
    if (p.inseam) meas.push("inseam " + fmtLen(p.inseam));
    if (meas.length) lines.push("My fit: " + meas.join(", "), "");
    for (const { c, a } of keptCards()) {
      const it = c.item;
      lines.push(`${a === "love" ? "★" : "•"} ${D.COLORS[c.color].name} ${it.name} (${D.FABRICS[it.fabric].label})`);
      const chk = tallCheck(it);
      if (chk) lines.push("   tall check: " + chk);
      if (it.terms) {
        lines.push("   EN: " + it.terms.en);
        if (it.terms.th) lines.push("   TH: " + it.terms.th + " ไซส์ใหญ่");
        if (it.terms.zh) lines.push("   CN: " + it.terms.zh + " 加长 大码");
      }
    }
    lines.push("", "No polyester. Natural fibres only.");
    return lines.join("\n");
  }

  /* ------------------------------------------------------------------ fit */

  const FIELDS = [
    { k: "height", label: "Height", hint: "Barefoot", unit: "len" },
    { k: "weight", label: "Weight", hint: "Taobao charts use it", unit: "wt" },
    { k: "len", label: "Tee length", hint: "Highest point of the shoulder, beside the collar, straight down to the hem", unit: "len" },
    { k: "chest", label: "Tee chest", hint: "Lay flat, armpit to armpit", unit: "len" },
    { k: "sleeve", label: "Sleeve", hint: "Shoulder seam to cuff, on a long-sleeve that fits", unit: "len" },
    { k: "inseam", label: "Inseam", hint: "Crotch seam to hem, on trousers that fit", unit: "len" },
    { k: "waist", label: "Waist", hint: "Waistband laid flat, times two", unit: "len" },
    { k: "outseam", label: "Outseam", hint: "Top of waistband to hem, outside leg", unit: "len" },
    { k: "shoe", label: "Shoe size", hint: "EU size", unit: "eu" }
  ];

  function fieldValue(f) {
    const v = S.profile[f.k];
    if (v == null || v === "") return "";
    if (f.unit === "len") return fmtLen(v, false);
    if (f.unit === "wt") return S.profile.units === "in" ? Math.round(v * 2.20462) : Math.round(v);
    return v;
  }

  function renderFitForm() {
    const p = S.profile;
    const lenU = UNIT();
    const wtU = p.units === "in" ? "lb" : "kg";
    const radio = (name, val, label) => `<label class="seg-opt"><input type="radio" name="${name}" id="${name}-${val}" value="${val}" ${String(p[name]) === val ? "checked" : ""}><span>${label}</span></label>`;
    const check = (name, label, hint) => `<label class="tog"><input type="checkbox" name="${name}" id="f-${name}" ${p[name] ? "checked" : ""}><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ""}</span></label>`;
    const region = (r, label, hint) => `<label class="tog"><input type="checkbox" name="region" id="f-region-${r}" value="${r}" ${p.regions.includes(r) ? "checked" : ""}><span><b>${label}</b><small>${hint}</small></span></label>`;

    $("#fitForm").innerHTML = `
      <fieldset class="fs">
        <legend>Shop for</legend>
        <div class="seg">${radio("dept", "m", "Menswear")}${radio("dept", "w", "Womenswear")}${radio("dept", "both", "Both")}</div>
        <div class="seg">${radio("units", "cm", "cm · kg")}${radio("units", "in", "inches · lb")}</div>
      </fieldset>

      <fieldset class="fs">
        <legend>Your body</legend>
        <div class="grid2">
          ${FIELDS.slice(0, 2).map((f) => numField(f, f.unit === "wt" ? wtU : lenU)).join("")}
        </div>
        <div class="grid2">
          <label class="field"><span class="fl">Usual size</span>
            <select id="f-usualSize" name="usualSize">${["", "L", "XL", "2XL", "3XL", "4XL", "5XL"].map((s) => `<option value="${s}" ${p.usualSize === s ? "selected" : ""}>${s || "Choose"}</option>`).join("")}</select>
          </label>
          <label class="field"><span class="fl">In US stores</span>
            <select id="f-tallSize" name="tallSize">${[["", "Choose"], ["regular", "Regular fits"], ["tall", "Tall (LT, XLT)"], ["bigtall", "Big & tall"]].map(([v, l]) => `<option value="${v}" ${p.tallSize === v ? "selected" : ""}>${l}</option>`).join("")}</select>
          </label>
        </div>
      </fieldset>

      <fieldset class="fs">
        <legend>Clothes that already fit you</legend>
        <p class="fs-hint">Grab your best-fitting tee and trousers and a tape measure. Blank is fine; fill what you can.</p>
        <div class="grid2">${FIELDS.slice(2).map((f) => numField(f, f.unit === "eu" ? "EU" : lenU)).join("")}</div>
      </fieldset>

      <fieldset class="fs">
        <legend>Where you'll order from</legend>
        <div class="togs">
          ${region("TH", "Thailand", "Shopee, Lazada, local tailors")}
          ${region("US", "USA", "Tall specialists; check shipping to Thailand")}
          ${region("CN", "China", "Taobao, with height and weight charts")}
        </div>
      </fieldset>

      <fieldset class="fs">
        <legend>Fabric rules</legend>
        <p class="fs-hint">Polyester, nylon and acrylic are never shown. Neither is "bamboo", which is almost always viscose rayon.</p>
        <div class="togs">
          ${check("organic", "Prefer organic", "Pushes GOTS-certifiable cotton up the deck")}
          ${check("allowSemi", "Allow lyocell (Tencel)", "Wood-pulp fibre made in a closed-loop process; not natural, not plastic")}
          ${check("allowStretch", "Allow a little stretch", "Cotton with up to 5% elastane")}
        </div>
        <div class="seg seg-wrap" role="radiogroup" aria-label="Home climate">
          ${radio("climate", "hot", "Hot, fans")}${radio("climate", "mixed", "Some AC")}${radio("climate", "ac", "Mostly AC")}
        </div>
      </fieldset>

      <fieldset class="fs fs-danger">
        <legend>Start over</legend>
        <p class="fs-hint">Clears swipes, closet and stylist cards. Measurements stay.</p>
        <div class="row">
          <button type="button" class="btn" id="btnReset">Reset swipes</button>
          <span class="confirm" id="resetConfirm" hidden>Sure? <button type="button" class="btn btn-danger" id="btnResetYes">Yes, clear</button> <button type="button" class="btn btn-quiet" id="btnResetNo">Keep</button></span>
        </div>
      </fieldset>
    `;
  }

  function numField(f, unit) {
    return `<label class="field" for="f-${f.k}">
      <span class="fl">${f.label}</span>
      <span class="numwrap"><input id="f-${f.k}" name="${f.k}" type="number" inputmode="decimal" min="0" step="any" value="${esc(fieldValue(f))}"><span class="unit">${unit}</span></span>
      <small>${f.hint}</small>
    </label>`;
  }

  function readFitField(name, raw) {
    const p = S.profile;
    const f = FIELDS.find((x) => x.k === name);
    if (!f) return;
    const n = parseFloat(raw);
    if (!isFinite(n) || n <= 0) { p[name] = null; return; }
    if (f.unit === "len") p[name] = p.units === "in" ? Math.round(n * 2.54 * 10) / 10 : n;
    else if (f.unit === "wt") p[name] = p.units === "in" ? Math.round((n / 2.20462) * 10) / 10 : n;
    else p[name] = n;
  }

  let fitTimer = null;
  function onFitChange(e) {
    const t = e.target;
    const p = S.profile;
    if (!t.name) return;
    let rerenderForm = false, rebuild = false;
    if (t.type === "radio") {
      p[t.name] = t.value;
      if (t.name === "units") rerenderForm = true;
      if (t.name === "dept" || t.name === "climate") rebuild = true;
    } else if (t.type === "checkbox") {
      if (t.name === "region") {
        const set = new Set(p.regions);
        t.checked ? set.add(t.value) : set.delete(t.value);
        p.regions = ["TH", "US", "CN"].filter((r) => set.has(r));
      } else { p[t.name] = t.checked; rebuild = true; }
    } else if (t.tagName === "SELECT") {
      p[t.name] = t.value;
    } else {
      readFitField(t.name, t.value);
    }
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => {
      persist();
      if (rebuild) rebuildDeck(1);
      renderDeck();
      renderConvert();
      renderBrief();
    }, e.type === "input" ? 400 : 0);
    if (rerenderForm) renderFitForm();
  }

  function renderConvert() {
    const p = S.profile;
    const rows = [];
    if (p.height || p.weight) {
      const jin = p.weight ? Math.round(p.weight * 2) : null;
      rows.push(`<div class="cv">
        <h3>Taobao size charts</h3>
        <p>Chinese listings size by height and weight. Weight is in 斤 (jin): 1 jin is half a kilo.</p>
        <dl>
          ${p.height ? `<div><dt>身高 height</dt><dd>${Math.round(p.height)} cm</dd></div>` : ""}
          ${jin ? `<div><dt>体重 weight</dt><dd>${jin} 斤</dd></div>` : ""}
          ${p.height ? `<div><dt>号 (height) on labels</dt><dd>${Math.round(p.height / 5) * 5}/…</dd></div>` : ""}
        </dl>
        <p class="small muted">Labels read like <b>${p.height ? Math.round(p.height / 5) * 5 : 190}/104B</b>: body height, then chest (or waist on trousers) in cm, then body type. Y is slim, A average, B and C give more room at the waist. Ignore letter sizes, which run small.</p>
      </div>`);
    }
    if (p.chest || p.len || p.waist) {
      const inch = (cm) => Math.round(cm / 2.54);
      rows.push(`<div class="cv">
        <h3>Shopee and Lazada charts</h3>
        <p>Thai sellers usually give the garment's measurements in inches (นิ้ว).</p>
        <dl>
          ${p.chest ? `<div><dt>อก chest, all round</dt><dd>${inch(p.chest * 2)} นิ้ว or more</dd></div>` : ""}
          ${p.len ? `<div><dt>ยาว length</dt><dd>${inch(p.len)} นิ้ว or more</dd></div>` : ""}
          ${p.waist ? `<div><dt>เอว waist</dt><dd>about ${inch(p.waist)} นิ้ว</dd></div>` : ""}
        </dl>
      </div>`);
    }
    if (p.height) {
      const inches = p.height / 2.54;
      const ftin = Math.floor(Math.round(inches) / 12) + "′" + (Math.round(inches) % 12) + "″";
      const womens = p.dept === "w";
      const bands = womens
        ? [[69, 73, "Tall"], [74, 78, "Extra Tall"]]
        : [[72, 75, "Semi-Tall"], [75, 79, "Tall"], [80, 85, "Extra Tall"]];
      const band = bands.slice().reverse().find(([lo]) => inches >= lo - 0.25);
      rows.push(`<div class="cv">
        <h3>US stores</h3>
        <p>You're <b>${ftin}</b>. ${band
          ? `American Tall's ${womens ? "women's" : "men's"} <b>${band[2]}</b> range (${Math.floor(band[0] / 12)}′${band[0] % 12}″–${Math.floor(band[1] / 12)}′${band[1] % 12}″) is cut for you. Elsewhere, filter for Tall (LT, XLT, 2XLT): about 2 in more body length.`
          : "Regular US sizes may fit your body; check sleeve and inseam, which run out first."}</p>
        ${p.inseam ? `<p class="small">Your inseam is about <b>${Math.round(p.inseam / 2.54)} in</b>. Many regular trousers stop at 32–34 in.</p>` : ""}
      </div>`);
    }
    $("#convert").innerHTML = rows.length
      ? `<h2 class="sec">Your size in other systems</h2><div class="cv-grid">${rows.join("")}</div>`
      : `<div class="cv cv-empty"><h3>Size translator</h3><p>Add height, weight and a tee measurement. This turns them into Taobao jin and Thai inch charts.</p></div>`;
  }

  function renderWhyNatural() {
    const refs = D.REFS || [];
    if (!refs.length) { $("#whyNatural").innerHTML = ""; return; }
    $("#whyNatural").innerHTML = `<h2 class="sec">Why the polyester ban holds up</h2>
      <ul class="refs">${refs.map((r) => `<li><p>${esc(r.claim)}</p><p class="cite">${esc(r.cite)} <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Source ↗</a></p></li>`).join("")}</ul>`;
  }

  /* -------------------------------------------------------------- stylist */

  function profileSummary() {
    const p = S.profile;
    const m = [];
    const L = (cm) => cm ? Math.round(cm) + " cm" : null;
    m.push("Shops: " + ({ m: "menswear", w: "womenswear", both: "menswear and womenswear" }[p.dept]));
    if (p.height) m.push("Height " + L(p.height));
    if (p.weight) m.push("Weight " + Math.round(p.weight) + " kg");
    if (p.usualSize) m.push("Usual size " + p.usualSize + (p.tallSize ? " (" + p.tallSize + ")" : ""));
    if (p.len) m.push("Tee body length that fits: " + L(p.len));
    if (p.chest) m.push("Tee chest pit-to-pit: " + L(p.chest));
    if (p.sleeve) m.push("Sleeve shoulder-to-cuff: " + L(p.sleeve));
    if (p.inseam) m.push("Inseam: " + L(p.inseam));
    if (p.waist) m.push("Waist: " + L(p.waist));
    if (p.outseam) m.push("Outseam: " + L(p.outseam));
    if (p.shoe) m.push("Shoe EU " + p.shoe);
    m.push("Orders from: " + (p.regions.join(", ") || "nowhere set"));
    m.push("Home climate: " + ({ hot: "hot, mostly fans", mixed: "some air-con", ac: "mostly air-con" }[p.climate]));
    m.push("Fabric rules: natural fibres only, never polyester/nylon/acrylic/bamboo-viscose" +
      (p.allowSemi ? "; lyocell allowed" : "; no lyocell") + (p.allowStretch ? "; up to 5% elastane allowed" : "; no elastane") +
      (p.organic ? "; prefers organic" : ""));
    return m.join("\n");
  }

  function tasteSummary() {
    const w = tasteWeights();
    const pos = Object.entries(w).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f, v]) => featureLabel(f) + " +" + v);
    const neg = Object.entries(w).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]).slice(0, 8).map(([f, v]) => featureLabel(f) + " " + v);
    const kept = keptCards().map(({ c, a }) => `${a === "love" ? "LOVED" : "liked"}: ${D.COLORS[c.color].name} ${c.item.name} [${c.item.id}]`);
    const passed = Object.entries(S.swipes).filter(([, s]) => s.a === "nope").map(([id]) => CARD_BY_ID.get(id)).filter(Boolean).slice(-25).map((c) => `${D.COLORS[c.color].name} ${c.item.name}`);
    return [
      "Leans toward: " + (pos.join(", ") || "not enough swipes yet"),
      "Leans away from: " + (neg.join(", ") || "nothing yet"),
      "Kept items:\n" + (kept.join("\n") || "none yet"),
      "Recently passed: " + (passed.join("; ") || "none")
    ].join("\n");
  }

  function catalogSummary() {
    return allItems().map((it) => `${it.id}: ${it.name} (${D.FABRICS[it.fabric]?.label}; colours ${it.colors.join("/")})`).join("\n");
  }

  function renderBrief() {
    const text = [
      "You are my personal stylist. I'm tall and wear extra-large sizes, I live in Thailand, and I mostly lounge at home in hot, humid weather. I avoid polyester and want natural fibres (organic where possible). I can order from Thailand (Shopee, Lazada, tailors), the USA, or China (Taobao).",
      "",
      "MY PROFILE",
      profileSummary(),
      "",
      "WHAT MY SWIPES SAY",
      tasteSummary(),
      "",
      "Please suggest outfits and specific things to search for, with the measurements I should check in each listing."
    ].join("\n");
    $("#briefText").textContent = text;
    return text;
  }

  const STYLIST_RULES = () => `You are the stylist inside "Tall Order", a swipe app for one person: tall, wears extra-large sizes, lives in Thailand, mostly lounges at home in hot and humid weather, hates hunting for clothes that fit, and avoids polyester.

Rules:
- Recommend natural fibres only: cotton (organic where possible), linen, hemp, wool, silk${S.profile.allowSemi ? ", plus lyocell since they allow it" : ""}${S.profile.allowStretch ? ", plus cotton with up to 5% elastane since they allow it" : ""}. Never polyester, nylon, acrylic, or "bamboo" (it is almost always viscose rayon).
- You cannot browse. Never invent product names, prices, stock or links. Recommend kinds of items, what words to search, and which measurement to check in a listing. Their Closet tab already has store search links for anything they like.
- Use their measurements. For Taobao, weight charts use jin (1 jin = 0.5 kg). Thai listings usually give garment chest and length in inches.
- Be warm and direct, like a good friend who styles people. Keep replies under 170 words unless asked for more. Short bullet lists are fine. Plain text with **bold** only; no headings, no tables.
- Tools: add_cards puts new item ideas at the top of their swipe deck; queue_cards moves existing catalog items to the top. Use them when they ask for ideas, more options, or "show me". After using one, tell them to open the Swipe tab.

Their profile:
${profileSummary()}

What their swipes say:
${tasteSummary()}

Catalog ids you can queue:
${catalogSummary()}

Valid values for add_cards: category one of [${Object.keys(D.CATEGORIES).join(", ")}]; fabric one of [${Object.keys(D.FABRICS).filter((k) => {
    const f = D.FABRICS[k]; return f.kind === "natural" || (f.kind === "semi" && S.profile.allowSemi) || (f.kind === "stretch" && S.profile.allowStretch);
  }).join(", ")}]; colors from [${Object.keys(D.COLORS).join(", ")}]; vibe from [${Object.keys(D.VIBES).join(", ")}].`;

  const chat = { sample: null, turns: [], ctl: null, tools: false };

  function mdLite(s) {
    const lines = esc(s).split(/\n/);
    let html = "", inList = false;
    for (const raw of lines) {
      const line = raw.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
      const m = line.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)$/);
      if (m) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${m[1]}</li>`; continue; }
      if (inList) { html += "</ul>"; inList = false; }
      if (line.trim()) html += `<p>${line}</p>`;
    }
    if (inList) html += "</ul>";
    return html;
  }

  function addBubble(role, html, cls = "") {
    const el = document.createElement("div");
    el.className = `msg msg-${role} ${cls}`;
    el.innerHTML = html;
    $("#chatLog").appendChild(el);
    el.scrollIntoView({ block: "end", behavior: reduceMotion ? "auto" : "smooth" });
    return el;
  }

  const CHIPS = [
    "Build me 3 outfits for lounging at home from what I liked",
    "What exactly should I search on Taobao, and which chart rows fit me?",
    "Add 5 new cards for hot nights and sleeping",
    "Which of my liked items is most likely to fit badly?"
  ];

  function renderChips() {
    $("#chatChips").innerHTML = chat.turns.length ? "" : CHIPS.map((c) => `<button type="button" class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join("");
  }

  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item"; }

  function stylistTools() {
    return [
      {
        name: "add_cards",
        description: "Create new item ideas and put them at the top of the person's swipe deck. Each card is a kind of garment to hunt for, not a specific product. Returns the ids added.",
        inputSchema: {
          type: "object",
          properties: {
            cards: {
              type: "array",
              maxItems: 6,
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Short item name, e.g. 'Gauze camp shirt, extra long'" },
                  category: { type: "string" },
                  fabric: { type: "string" },
                  colors: { type: "array", items: { type: "string" }, maxItems: 2 },
                  vibe: { type: "array", items: { type: "string" }, maxItems: 2 },
                  why: { type: "string", description: "One sentence, why this suits a tall person in Thai heat" },
                  search_en: { type: "string" },
                  search_th: { type: "string", description: "Thai search words for Shopee/Lazada" },
                  search_zh: { type: "string", description: "Chinese search words for Taobao" }
                },
                required: ["name", "category", "fabric", "colors", "why", "search_en"]
              }
            }
          },
          required: ["cards"]
        },
        execute(input) {
          const list = Array.isArray(input && input.cards) ? input.cards.slice(0, 6) : [];
          const added = [], rejected = [];
          for (const c of list) {
            const cat = String(c.category || "").trim();
            const fabric = String(c.fabric || "").trim();
            const f = D.FABRICS[fabric];
            if (!D.CATEGORIES[cat]) { rejected.push(`${c.name}: unknown category ${cat}`); continue; }
            if (!f) { rejected.push(`${c.name}: unknown fabric ${fabric}`); continue; }
            if ((f.kind === "semi" && !S.profile.allowSemi) || (f.kind === "stretch" && !S.profile.allowStretch)) { rejected.push(`${c.name}: fabric not allowed by their rules`); continue; }
            const colors = (Array.isArray(c.colors) ? c.colors : []).map(String).filter((k) => D.COLORS[k]).slice(0, 2);
            if (!colors.length) colors.push("raw");
            const vibe = (Array.isArray(c.vibe) ? c.vibe : []).map(String).filter((k) => D.VIBES[k]).slice(0, 2);
            const id = "c-" + slug(c.name) + "-" + Math.random().toString(36).slice(2, 6);
            const item = {
              id, custom: true, name: String(c.name).slice(0, 60), cat, fabric, colors, vibe,
              dept: "any", why: String(c.why || "").slice(0, 160),
              terms: { en: String(c.search_en || c.name).slice(0, 80), th: c.search_th ? String(c.search_th).slice(0, 80) : "", zh: c.search_zh ? String(c.search_zh).slice(0, 60) : "" }
            };
            S.custom.push(item);
            for (const col of colors) S.queue.unshift(id + "~" + col);
            added.push(id);
          }
          if (S.custom.length > 80) S.custom = S.custom.slice(-80);
          S.queue = S.queue.slice(0, 40);
          refreshCards();
          persist();
          rebuildDeck(0);
          renderDeck();
          if (added.length) toast(`Stylist added ${added.length} card${added.length > 1 ? "s" : ""} to your deck`);
          return { added, rejected };
        }
      },
      {
        name: "queue_cards",
        description: "Move existing catalog items (by catalog id) to the top of the swipe deck. Returns which ids were found.",
        inputSchema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, maxItems: 8 } }, required: ["ids"] },
        execute(input) {
          const ids = Array.isArray(input && input.ids) ? input.ids.map(String) : [];
          const found = [];
          for (const iid of ids) {
            const cards = CARDS.filter((c) => c.item.id === iid && !S.swipes[c.id] && eligible(c));
            if (cards.length) { found.push(iid); for (const c of cards.reverse()) S.queue.unshift(c.id); }
          }
          S.queue = Array.from(new Set(S.queue)).slice(0, 40);
          persist();
          rebuildDeck(0);
          renderDeck();
          if (found.length) toast("Stylist moved " + found.length + " item" + (found.length > 1 ? "s" : "") + " to the top of your deck");
          return { queued: found, not_found_or_already_swiped: ids.filter((i) => !found.includes(i)) };
        }
      }
    ];
  }

  const ERR_COPY = {
    rate_limited: "Too many questions at once. Give it a minute, then send again.",
    session_expired: "Your Claude session expired. Sign in again, then resend.",
    refused: "The stylist couldn't answer that one. Try asking another way.",
    empty_completion: "No answer came back. Try a shorter question.",
    prompt_too_large: "Your history is too long to send. Try resetting a few swipes.",
    upstream_error: "The connection dropped. Send again when you're ready."
  };

  async function sendChat(text) {
    text = String(text || "").trim();
    if (!text || !chat.sample || chat.ctl) return;
    chat.turns.push({ role: "user", content: text });
    addBubble("user", `<p>${esc(text)}</p>`);
    renderChips();
    $("#chatInput").value = "";
    const bubble = addBubble("assistant", `<p class="thinking">Thinking…</p>`);
    chat.ctl = new AbortController();
    $("#btnStop").hidden = false;
    $("#btnSend").disabled = true;

    const turns = chat.turns.slice(-12);
    const input = [{ role: "user", content: STYLIST_RULES() }].concat(turns[0] && turns[0].role === "assistant" ? turns.slice(1) : turns);
    const opts = { cache: false, signal: chat.ctl.signal, onText: ({ text: t }) => { bubble.innerHTML = mdLite(t); } };
    if (chat.tools) { opts.tools = stylistTools(); delete opts.cache; }
    try {
      const res = await chat.sample(input, opts);
      bubble.innerHTML = mdLite(res.text);
      if (res.truncated) bubble.insertAdjacentHTML("beforeend", `<p class="note">Cut short. Ask for less at a time.</p>`);
      chat.turns.push({ role: "assistant", content: res.text });
    } catch (e) {
      const code = e && e.code;
      if (code === "not_granted" || code === "sampling_disabled" || code === "not_declared" || code === "capability_disabled" || code === "capability_removed") {
        bubble.remove();
        chat.turns.pop();
        disableChat("The live stylist isn't switched on for this view. Use the brief below in any Claude chat instead.");
      } else if (code === "tools_unavailable") {
        chat.tools = false;
        bubble.innerHTML = `<p class="note">This view can't let the stylist edit your deck. Send again for advice only.</p>`;
        chat.turns.pop();
      } else if (code === "cancelled") {
        bubble.innerHTML = e.text ? mdLite(e.text) + `<p class="note">Stopped.</p>` : `<p class="note">Stopped.</p>`;
        if (e.text) chat.turns.push({ role: "assistant", content: e.text }); else chat.turns.pop();
      } else {
        bubble.innerHTML = (e && e.text ? mdLite(e.text) : "") + `<p class="note">${esc(ERR_COPY[code] || ERR_COPY.upstream_error)}</p>`;
        if (code === "refused") bubble.innerHTML = `<p class="note">${esc(ERR_COPY.refused)}</p>`;
        if (e && e.text && code !== "refused") chat.turns.push({ role: "assistant", content: e.text }); else chat.turns.pop();
      }
    } finally {
      chat.ctl = null;
      $("#btnStop").hidden = true;
      $("#btnSend").disabled = false;
      renderChips();
    }
  }

  function disableChat(why) {
    $("#chat").hidden = true;
    $("#brief").hidden = false;
    $("#briefWhy").textContent = why;
  }

  async function initStylist() {
    renderBrief();
    if (!window.claude || typeof window.claude.use !== "function") {
      $("#briefWhy").textContent = "The live stylist runs when this page is opened in Claude. Meanwhile, paste this brief into any Claude chat for the same advice.";
      return;
    }
    let sample = null;
    try { sample = await window.claude.use("sample"); } catch (e) { sample = null; }
    if (!sample) {
      $("#briefWhy").textContent = "The live stylist isn't available in this view. Paste this brief into any Claude chat for the same advice.";
      return;
    }
    chat.sample = sample;
    try { const lim = await sample.limits(); chat.tools = !!(lim && lim.tools); } catch (e) { chat.tools = false; }
    $("#chat").hidden = false;
    $("#brief").hidden = true;
    renderChips();
    if (!chat.turns.length) {
      addBubble("assistant", mdLite("Hi. I've read your fit profile and every swipe. Ask me for outfits, what to search in Thai or Chinese, or say **show me more** and I'll put new cards in your deck."), "intro");
    }
  }

  /* ---------------------------------------------------------------- views */

  const VIEWS = ["swipe", "closet", "stylist", "fit"];
  let currentView = "swipe";

  function showView(name) {
    if (!VIEWS.includes(name)) name = "swipe";
    currentView = name;
    for (const v of $$(".view")) v.hidden = v.dataset.view !== name;
    for (const t of $$(".tab")) t.setAttribute("aria-current", t.dataset.view === name ? "page" : "false");
    document.body.dataset.view = name;
    if (name === "closet") renderCloset();
    if (name === "stylist") renderBrief();
    if (name === "fit") { renderConvert(); }
  }

  function route() { showView((location.hash || "#swipe").slice(1)); }

  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg || "Copied");
    } catch (e) {
      toast("Copy blocked here. Select the text and copy it manually.");
      return false;
    }
    return true;
  }

  function renderAll() {
    renderDeck();
    renderTaste();
    renderCount(false);
    renderFitForm();
    renderConvert();
    renderWhyNatural();
    renderBrief();
    if (currentView === "closet") renderCloset();
  }

  /* ----------------------------------------------------------------- wire */

  function wire() {
    $("#btnNope").addEventListener("click", () => swipeTop("nope"));
    $("#btnLike").addEventListener("click", () => swipeTop("like"));
    $("#btnLove").addEventListener("click", () => swipeTop("love"));
    $("#btnUndo").addEventListener("click", undo);

    document.addEventListener("keydown", (e) => {
      if (currentView !== "swipe" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); swipeTop("like"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); swipeTop("nope"); }
      else if (e.key === "ArrowUp") { e.preventDefault(); swipeTop("love"); }
      else if (e.key === "z" || e.key === "Z") { e.preventDefault(); undo(); }
    });

    $("#closetBody").addEventListener("click", (e) => {
      const copy = e.target.closest("[data-copy]");
      if (copy) { copyText(copy.dataset.copy, "Search words copied"); return; }
      const un = e.target.closest("[data-unkeep]");
      if (un) {
        const id = un.dataset.unkeep;
        S.swipes[id] = { a: "nope", t: Date.now() };
        persist(); rebuildDeck(2); renderCloset(); renderTaste(); renderCount(false); renderDeck();
        toast("Removed from closet");
        return;
      }
      const bb = e.target.closest("[data-bringback]");
      if (bb) {
        const id = bb.dataset.bringback;
        delete S.swipes[id];
        S.history = S.history.filter((h) => h !== id);
        S.queue.unshift(id);
        persist(); rebuildDeck(0); renderCloset(); renderTaste(); renderDeck();
        toast("Back at the top of your deck");
      }
    });

    $("#btnCopyList").addEventListener("click", () => copyText(shoppingListText(), "Shopping list copied"));
    $("#btnCopyBrief").addEventListener("click", () => {
      copyText(renderBrief(), "Brief copied. Paste it into Claude.").then((ok) => {
        if (!ok) { const r = document.createRange(); r.selectNodeContents($("#briefText")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
      });
    });

    const form = $("#fitForm");
    form.addEventListener("input", onFitChange);
    form.addEventListener("change", (e) => { if (e.target.type !== "number") onFitChange(e); });
    form.addEventListener("submit", (e) => e.preventDefault());
    form.addEventListener("click", (e) => {
      if (e.target.id === "btnReset") { $("#resetConfirm").hidden = false; }
      if (e.target.id === "btnResetNo") { $("#resetConfirm").hidden = true; }
      if (e.target.id === "btnResetYes") {
        S.swipes = {}; S.history = []; S.custom = []; S.queue = [];
        refreshCards(); persist(); deckOrder = []; rebuildDeck(0); renderAll();
        $("#resetConfirm").hidden = true;
        toast("Swipes cleared. Fresh deck.");
      }
    });

    $("#composer").addEventListener("submit", (e) => { e.preventDefault(); sendChat($("#chatInput").value); });
    $("#chatInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat($("#chatInput").value); }
    });
    $("#btnStop").addEventListener("click", () => chat.ctl && chat.ctl.abort());
    $("#chatChips").addEventListener("click", (e) => { const c = e.target.closest("[data-chip]"); if (c) sendChat(c.dataset.chip); });

    window.addEventListener("hashchange", route);
  }

  /* ----------------------------------------------------------------- boot */

  rebuildDeck(0);
  wire();
  renderAll();
  route();
  initCloud();
  initStylist();
})();
