const MODULE_ID  = "pixie-border";

// Token flags
const OUTLINE_KEY = "_pixiOutlineFilter";
const HOVER_KEY   = "_pixiHover";
const TARGET_KEY  = "_pixiTarget";
const GLOW_KEY    = "_pixiGlowFilter";

// PIXI filter defaults
const OUTLINE_QUALITY = 1;
const OUTLINE_PADDING = 0;

// Log helper
const LOG = "[pixie-border]";
const _onceSet = new Set();
const logOnce = (k, level, ...msg) => { if (_onceSet.has(k)) return; _onceSet.add(k); (console[level]||console.log)(LOG, ...msg); };

/* =================================================================================
 * Settings helpers (no backwards compatibility)
 * ================================================================================= */

function getRenderable(token)  { return token?.mesh ?? token?.icon ?? null; }
function getMode()             { return game.settings.get(MODULE_ID, "mode"); }

// Colors
function getOutlineColor()        { return game.settings.get(MODULE_ID, "outlineColor"); }
function getTargetOutlineColor()  { return game.settings.get(MODULE_ID, "targetOutlineColor"); }
function getGlowColor()           { return game.settings.get(MODULE_ID, "glowColor"); }
function getTargetGlowColor()     { return game.settings.get(MODULE_ID, "targetGlowColor"); }

// Toggles
function getDisableOutline()   { return !!game.settings.get(MODULE_ID, "disableOutline"); }
function getDisableGlow()      { return !!game.settings.get(MODULE_ID, "disableGlow"); }
function getEnableTarget()     { return !!game.settings.get(MODULE_ID, "enableTarget"); }
function getHideDefault()      { return !!game.settings.get(MODULE_ID, "hideDefaultBorder"); }

// Numbers
function getThickness() {
  let t = Number(game.settings.get(MODULE_ID, "thickness"));
  if (!Number.isFinite(t)) t = 3;
  return Math.min(5, Math.max(1, Math.round(t)));
}
function getGlowDistance() {
  let d = Number(game.settings.get(MODULE_ID, "glowDistance"));
  if (!Number.isFinite(d)) d = 10;
  return Math.min(64, Math.max(1, Math.round(d)));
}
function getGlowOuterStrength() {
  let s = Number(game.settings.get(MODULE_ID, "glowOuterStrength"));
  if (!Number.isFinite(s)) s = 4;
  return Math.min(10, Math.max(0, s));
}

// Convert #rrggbb to integer
function cssToInt(color) {
  if (typeof color === "string") {
    if (foundry?.utils?.colorStringToHex) {
      try { return foundry.utils.colorStringToHex(color); } catch {}
    }
    let c = color.trim();
    if (c.startsWith("#")) c = c.slice(1);
    if (c.length === 3 || c.length === 4) c = c.split("").map(ch => ch + ch).join("");
    if (c.length === 8) c = c.slice(0, 6);
    const n = parseInt(c, 16);
    if (Number.isFinite(n)) return n >>> 0;
  }
  return 0xffffff;
}

/* =================================================================================
 * Color resolvers
 * ================================================================================= */

const DISP_MAP = { [-1]:0xe74c3c, [0]:0xf1c40f, [1]:0x2ecc71, [2]:0x3498db, [3]:0x9b59b6 };
function dispositionColorInt(token) {
  const disp = token?.document?.disposition ?? 0;
  const cfg = CONFIG.Canvas?.dispositionColors ?? CONFIG.Token?.DISPOSITION_COLORS ?? null;
  const raw = cfg?.[disp] ?? cfg?.[String(disp)];
  return raw != null ? cssToInt(raw) : (DISP_MAP[disp] ?? 0xffffff);
}

const HEALTH_GREEN  = 0x2ecc71; // ≥ 50%
const HEALTH_YELLOW = 0xf1c40f; // ≥ 25%
const HEALTH_RED    = 0xe74c3c; // < 25%
function getHpPercent(token) {
  const doc = token?.document;
  if (!doc || typeof doc.getBarAttribute !== "function") return null;
  const bar = doc.getBarAttribute("bar1");
  if (!bar || bar.type !== "bar") return null;
  const v = Number(bar.value), m = Number(bar.max);
  if (!Number.isFinite(v) || !Number.isFinite(m) || m <= 0) return null;
  return Math.max(0, Math.min(1, v / m));
}
function conditionColorInt(token) {
  const pct = getHpPercent(token);
  if (pct == null) return dispositionColorInt(token);
  if (pct >= 0.50) return HEALTH_GREEN;
  if (pct >= 0.25) return HEALTH_YELLOW;
  return HEALTH_RED;
}

function resolvedOutlineColorInt(token) {
  const mode = getMode();
  if (mode === "custom") {
    const useTarget = getEnableTarget() && !!token[TARGET_KEY];
    const hex = useTarget ? getTargetOutlineColor() : getOutlineColor();
    return cssToInt(String(hex ?? "#88ccff"));
  }
  if (mode === "condition") return conditionColorInt(token);
  return dispositionColorInt(token);
}

function resolvedGlowColorInt(token) {
  if (getDisableGlow()) return null;
  const mode = getMode();
  if (mode === "custom") {
    const isMyTarget = getEnableTarget() && !!token[TARGET_KEY];
    const hex = isMyTarget
      ? (getTargetGlowColor() ?? getGlowColor() ?? getOutlineColor())
      : (getGlowColor() ?? getOutlineColor());
    return cssToInt(String(hex ?? "#88ccff"));
  }
  return resolvedOutlineColorInt(token);
}

// Legacy shim; retained only if referenced elsewhere
// function resolvedColorInt(token) { return resolvedOutlineColorInt(token); }

/* =================================================================================
 * PIXI filter helpers
 * ================================================================================= */

function getOutlineCtor() { return PIXI?.filters?.OutlineFilter || globalThis.OutlineFilter; }
function getGlowCtor()    { return PIXI?.filters?.GlowFilter   || globalThis.GlowFilter; }

// Outline
function applyOutline(token, colorInt) {
  const mesh = getRenderable(token);
  if (!mesh) return;

  const OutlineFilter = getOutlineCtor();
  if (!OutlineFilter) {
    logOnce("outline-missing", "warn", "OutlineFilter missing. Ensure scripts/pixi-filters.js is loaded before this script.");
    return;
  }

  let f = token[OUTLINE_KEY];
  if (!(f instanceof OutlineFilter)) {
    try {
      f = new OutlineFilter(getThickness(), colorInt, OUTLINE_QUALITY);
      token[OUTLINE_KEY] = f;
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

  mesh.refresh?.();
}
function removeOutline(token) {
  const mesh = getRenderable(token);
  const f = token[OUTLINE_KEY];
  if (!mesh || !f) return;
  try {
    const filters = mesh.filters;
    if (Array.isArray(filters) && filters.includes(f)) {
      mesh.filters = filters.filter(x => x !== f);
    }
  } catch {}
  delete token[OUTLINE_KEY];
  mesh.refresh?.();
}

// Glow
function applyGlow(token, colorInt) {
  const mesh = getRenderable(token);
  if (!mesh) return;

  const GlowFilter = getGlowCtor();
  if (!GlowFilter) {
    logOnce("glow-missing", "warn", "GlowFilter missing. Ensure scripts/pixi-filters.js is loaded before this script.");
    return;
  }

  const useColor = (typeof colorInt === "number" && Number.isFinite(colorInt)) ? colorInt : 0xffffff;

  let g = token[GLOW_KEY];
  if (!(g instanceof GlowFilter)) {
    try {
      g = new GlowFilter({
        distance: getGlowDistance(),
        innerStrength: 0,
        outerStrength: getGlowOuterStrength(),
        color: useColor,
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
  g.color         = useColor;

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

/* =================================================================================
 * Native border control
 * ================================================================================= */

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

/* =================================================================================
 * Token refresh
 * ================================================================================= */

function refreshToken(token) {
  if (!token) return;

  // Show state: controlled, hovered, or (optionally) targeted by me
  const show =
    token.controlled ||
    !!token[HOVER_KEY] ||
    (getEnableTarget() && !!token[TARGET_KEY]);

  const outlineColor = resolvedOutlineColorInt(token);
  const glowColor    = resolvedGlowColorInt(token); // may be null

  const outlineWanted = !getDisableOutline();
  const glowWanted    = !getDisableGlow();

  if (show) {
    // Outline
    if (outlineWanted) applyOutline(token, outlineColor);
    else removeOutline(token);

    // Glow
    if (glowWanted) applyGlow(token, glowColor ?? outlineColor);
    else removeGlow(token);
  } else {
    removeOutline(token);
    removeGlow(token);
  }

  applyNativeBorderVisibility(token);
}

/* =================================================================================
 * Hooks wiring
 * ================================================================================= */

const Handlers = {};

Hooks.on("canvasReady", () => {
  if (Handlers._installed) return;
  Handlers._installed = true;

  logOnce("ready", "info", `${LOG} ready — tokens:`, canvas.tokens?.placeables?.length ?? 0);

  Handlers.hover = Hooks.on("hoverToken", (token, hovered) => {
    token[HOVER_KEY] = hovered;
    refreshToken(token);
  });

  Handlers.control = Hooks.on("controlToken", (token) => {
    token[HOVER_KEY] = !!token?.hover;
    refreshToken(token);
  });

  Handlers.target = Hooks.on("targetToken", (user, token) => {
    token[TARGET_KEY] = !!game.user?.targets?.has?.(token);
    refreshToken(token);
  });

  Handlers.updateDoc = Hooks.on("updateToken", (doc, changes) => {
    if (getMode() !== "condition" && !("disposition" in changes)) return;
    const t = canvas.tokens?.get(doc.id);
    if (t) refreshToken(t);
  });

  Handlers.updateActor = Hooks.on("updateActor", (actor) => {
    if (getMode() !== "condition") return;
    for (const t of canvas.tokens?.placeables ?? []) {
      if (t.document?.actorId === actor.id) refreshToken(t);
    }
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
      for (const t of canvas.tokens?.placeables ?? []) {
        if (setting.key === `${MODULE_ID}.enableTarget`) {
          t[TARGET_KEY] = !!game.user?.targets?.has?.(t);
        }
        refreshToken(t);
      }
    }
  });

  Handlers.refreshToken = Hooks.on("refreshToken", (token) => {
    if (getHideDefault()) hideNativeBorder(token);
  });

  Handlers.delete = Hooks.on("deleteToken", (scene, doc) => {
    const t = canvas.tokens?.get(doc.id);
    if (t) { removeGlow(t); removeOutline(t); }
  });

  const myTargets = game.user?.targets ?? new Set();
  for (const t of canvas.tokens?.placeables ?? []) {
    t[HOVER_KEY]  = !!t?.hover;
    t[TARGET_KEY] = myTargets.has(t);
    refreshToken(t);
  }
});

Hooks.once("shutdown", () => {
  const off = (h, fn) => { if (fn) try { Hooks.off(h, fn); } catch {} };
  off("hoverToken",   Handlers.hover);
  off("controlToken", Handlers.control);
  off("targetToken",  Handlers.target);
  off("updateToken",  Handlers.updateDoc);
  off("updateActor",  Handlers.updateActor);
  off("updateSetting",Handlers.updateSetting);
  off("refreshToken", Handlers.refreshToken);
  off("deleteToken",  Handlers.delete);

  for (const t of canvas.tokens?.placeables ?? []) { removeGlow(t); removeOutline(t); }
  Object.keys(Handlers).forEach(k => delete Handlers[k]);
  Handlers._installed = false;

  logOnce("shutdown", "info", `${LOG} shutdown — handlers removed`);
});
