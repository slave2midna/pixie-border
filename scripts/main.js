const MODULE_ID  = "pixie-border";
const FILTER_KEY = "_pixiOutlineFilter";
const FILTER_ON  = "_pixiOutlineActive";
const HOVER_KEY  = "_pixiHover";
const GLOW_KEY   = "_pixiGlowFilter";

const OUTLINE_QUALITY = 1;
const OUTLINE_PADDING = 0;

// Console Log
const LOG = "[pixie-border]";
const once = new Set();
const logOnce = (k, level, ...msg) => { if (once.has(k)) return; once.add(k); (console[level]||console.log)(LOG, ...msg); };

// Setting Helpers
function getRenderable(token) { return token?.mesh ?? token?.icon ?? null; }
function getMode()        { return game.settings.get(MODULE_ID, "mode"); }
function getCustomColor() { return game.settings.get(MODULE_ID, "customColor"); }
function getThickness()   {
  let t = Number(game.settings.get(MODULE_ID, "thickness"));
  if (!Number.isFinite(t)) t = 3;
  return Math.min(5, Math.max(1, Math.round(t)));
}
function getHideDefault() { return !!game.settings.get(MODULE_ID, "hideDefaultBorder"); }
function getEnableGlow()  { return !!game.settings.get(MODULE_ID, "enableGlow"); }
function getGlowDistance(){
  let d = Number(game.settings.get(MODULE_ID, "glowDistance"));
  if (!Number.isFinite(d)) d = 10;
  return Math.min(64, Math.max(1, Math.round(d)));
}
function getGlowOuterStrength(){
  let s = Number(game.settings.get(MODULE_ID, "glowOuterStrength"));
  if (!Number.isFinite(s)) s = 4;
  return Math.min(10, Math.max(0, s));
}

function cssToInt(color) {
  try { if (typeof color === "string" && foundry?.utils?.colorStringToHex) return foundry.utils.colorStringToHex(color); } catch {}
  if (typeof color === "number" && Number.isFinite(color)) return color >>> 0;
  if (typeof color !== "string") return 0xffffff;
  let c = color.trim().toLowerCase();
  if (c.startsWith("#")) {
    c = c.slice(1);
    if (c.length === 3 || c.length === 4) c = c.split("").map(ch => ch + ch).join("");
    if (c.length === 8) c = c.slice(0, 6);
    const n = parseInt(c, 16);
    return Number.isFinite(n) ? n : 0xffffff;
  }
  const m = c.match(/rgba?\s*\(\s*(\d+)[^0-9]+(\d+)[^0-9]+(\d+)/i);
  if (m) return ((+m[1]&255)<<16) + ((+m[2]&255)<<8) + (+m[3]&255);
  return 0xffffff;
}

const DISP_MAP = { [-1]:0xe74c3c, [0]:0xf1c40f, [1]:0x2ecc71, [2]:0x3498db, [3]:0x9b59b6 };
function dispositionColorInt(token) {
  const disp = token?.document?.disposition ?? 0;
  const cfg = CONFIG.Canvas?.dispositionColors ?? CONFIG.Token?.DISPOSITION_COLORS ?? null;
  const raw = cfg?.[disp] ?? cfg?.[String(disp)];
  return raw != null ? cssToInt(raw) : (DISP_MAP[disp] ?? 0xffffff);
}
function resolvedColorInt(token) {
  return (getMode() === "custom") ? cssToInt(getCustomColor()) : dispositionColorInt(token);
}

// Filter helpers
function getOutlineCtor() { return PIXI?.filters?.OutlineFilter || globalThis.OutlineFilter; }
function getGlowCtor()    { return PIXI?.filters?.GlowFilter   || globalThis.GlowFilter; }

// PIXI Outline filter
function applyOutline(token, colorInt) {
  const mesh = getRenderable(token);
  if (!mesh) return;

  const OutlineFilter = getOutlineCtor();
  if (!OutlineFilter) {
    logOnce("outline-missing", "warn", "OutlineFilter missing. Check that vendor/pixi-filters.min.js is loaded before this script.");
    return;
  }

  let f = token[FILTER_KEY];
  if (!(f instanceof OutlineFilter)) {
    try {
      f = new OutlineFilter(getThickness(), colorInt, OUTLINE_QUALITY);
      token[FILTER_KEY] = f;
    } catch (e) {
      logOnce("outline-ctor", "warn", "Failed to construct OutlineFilter:", e);
      return;
    }
  } else {
    f.thickness = getThickness();
    f.color     = colorInt;
  }
  f.quality = OUTLINE_QUALITY;
  f.padding = OUTLINE_PADDING;

  const filters = mesh.filters;
  if (!Array.isArray(filters) || !filters.includes(f)) {
    mesh.filters = Array.isArray(filters) ? filters.concat([f]) : [f];
  }

  token[FILTER_ON] = true;
  mesh.refresh?.();
}
function removeOutline(token) {
  const mesh = getRenderable(token);
  const f = token[FILTER_KEY];
  if (!mesh || !f) { token[FILTER_ON] = false; return; }
  try {
    const filters = mesh.filters;
    if (Array.isArray(filters) && filters.includes(f)) {
      mesh.filters = filters.filter(x => x !== f);
    }
  } catch {}
  delete token[FILTER_KEY];
  token[FILTER_ON] = false;
  mesh.refresh?.();
}

// PIXI Glow filter
function applyGlow(token, colorInt) {
  const mesh = getRenderable(token);
  if (!mesh) return;

  const GlowFilter = getGlowCtor();
  if (!GlowFilter) {
    logOnce("glow-missing", "warn", "GlowFilter missing. Check that vendor/pixi-filters.min.js is loaded before this script.");
    return;
  }

  let g = token[GLOW_KEY];
  if (!(g instanceof GlowFilter)) {
    try {
      g = new GlowFilter({
        distance: getGlowDistance(),
        innerStrength: 0,
        outerStrength: getGlowOuterStrength(),
        color: colorInt,
        alpha: 1,
        quality: 0.15,
        knockout: false
      });
      token[GLOW_KEY] = g;
    } catch (e) {
      logOnce("glow-ctor", "warn", "Failed to construct GlowFilter:", e);
      return;
    }
  }
  g.distance      = getGlowDistance();
  g.outerStrength = getGlowOuterStrength();
  g.innerStrength = 0;
  g.alpha         = 1;
  g.quality       = 0.15;
  g.knockout      = false;
  g.color         = colorInt;

  const filters = mesh.filters;
  if (!Array.isArray(filters) || !filters.includes(g)) {
    mesh.filters = Array.isArray(filters) ? filters.concat([g]) : [g];
  }
  mesh.refresh?.();
}
function removeGlow(token) {
  const mesh = getRenderable(token);
  const g = token[GLOW_KEY];
  if (!mesh || !g) return;
  try {
    const filters = mesh.filters;
    if (Array.isArray(filters) && filters.includes(g)) {
      mesh.filters = filters.filter(x => x !== g);
    }
  } catch {}
  delete token[GLOW_KEY];
  mesh.refresh?.();
}

// Native border control
function hideNativeBorder(token) {
  const b = token?.border;
  if (!b) return;
  b.renderable = false;
  b.visible = false;
  b.alpha = 0;
  if (typeof b.clear === "function") b.clear();
}
function applyNativeBorderVisibility(token) {
  if (getHideDefault()) hideNativeBorder(token);
}

// Token refresh
function refreshToken(token) {
  if (!token) return;
  const show = token.controlled || !!token[HOVER_KEY];
  const color = resolvedColorInt(token);

  if (show) {
    if (!token[FILTER_ON]) applyOutline(token, color);
    else if (token[FILTER_ON]) {
      const f = token[FILTER_KEY];
      if (f) { f.thickness = getThickness(); f.color = color; }
    }
    if (getEnableGlow()) applyGlow(token, color);
    else removeGlow(token);
  } else if (token[FILTER_ON]) {
    removeOutline(token);
    removeGlow(token);
  } else {
    removeGlow(token);
  }

  applyNativeBorderVisibility(token);
}

// Hooks and Handlers
const Handlers = {};

Hooks.on("canvasReady", () => {
  if (Handlers._installed) return;
  Handlers._installed = true;

  logOnce("ready", "info", `${LOG} ready — tokens:`, canvas.tokens?.placeables?.length ?? 0);

  Handlers.hover = Hooks.on("hoverToken", (token, hovered) => {
    token[HOVER_KEY] = hovered;
    refreshToken(token);
  });

  Handlers.control = Hooks.on("controlToken", (token, controlled) => {
    token[HOVER_KEY] = !!token?.hover;
    refreshToken(token);
  });

  Handlers.updateDoc = Hooks.on("updateToken", (doc, changes) => {
    if (!("disposition" in changes)) return;
    const t = canvas.tokens?.get(doc.id);
    if (t) refreshToken(t);
  });

  Handlers.updateSetting = Hooks.on("updateSetting", (setting) => {
    if (!setting?.key?.startsWith?.(`${MODULE_ID}.`)) return;
    if (setting.key === `${MODULE_ID}.hideDefaultBorder`) {
      const hide = !!setting.value;
      for (const t of canvas.tokens?.placeables ?? []) {
        if (hide) hideNativeBorder(t);
        else if (t.border) { t.border.renderable = true; t.border.alpha = 1; t.border.visible = true; t.refresh?.(); }
      }
    } else {
      for (const t of canvas.tokens?.placeables ?? []) refreshToken(t);
    }
  });

  Handlers.refreshToken = Hooks.on("refreshToken", (token) => {
    if (getHideDefault()) hideNativeBorder(token);
  });

  Handlers.delete = Hooks.on("deleteToken", (scene, doc) => {
    const t = canvas.tokens?.get(doc.id);
    if (t) { removeGlow(t); removeOutline(t); }
  });

  for (const t of canvas.tokens?.placeables ?? []) {
    t[HOVER_KEY] = !!t?.hover;
    refreshToken(t);
  }
});

Hooks.once("shutdown", () => {
  const off = (h, fn) => { if (fn) try { Hooks.off(h, fn); } catch {} };
  off("hoverToken",   Handlers.hover);
  off("controlToken", Handlers.control);
  off("updateToken",  Handlers.updateDoc);
  off("updateSetting",Handlers.updateSetting);
  off("refreshToken", Handlers.refreshToken);
  off("deleteToken",  Handlers.delete);

  for (const t of canvas.tokens?.placeables ?? []) { removeGlow(t); removeOutline(t); }
  Object.keys(Handlers).forEach(k => delete Handlers[k]);
  Handlers._installed = false;

  logOnce("shutdown", "info", `${LOG} shutdown — handlers removed`);
});

