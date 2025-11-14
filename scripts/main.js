const MODULE_ID  = "pixie-border";

// Token flags
const OUTLINE_KEY = "_pixiOutlineFilter";
const HOVER_KEY   = "_pixiHover";
const TARGET_KEY  = "_pixiTarget";
const GLOW_KEY    = "_pixiGlowFilter";
const COMBAT_KEY  = "_pixiCombatActive";   // marks active combatant
const GUIDED_KEY  = "_pixiGuidedBorder";   // custom guided hover border

// Hardcoded PIXI settings
const OUTLINE_QUALITY = 1;
const OUTLINE_PADDING = 0;

// Guided border config
const GUIDED_COLOR   = 0x888888; // grey
const GUIDED_WIDTH   = 3;        // px
const GUIDED_PADDING = 4;        // extra padding around token
const GUIDED_DASH    = 8;        // dash length
const GUIDED_GAP     = 4;        // gap length

// Log helper
const LOG = "[pixie-border]";
const _onceSet = new Set();
const logOnce = (k, level, ...msg) => {
  if (_onceSet.has(k)) return;
  _onceSet.add(k);
  (console[level] || console.log)(LOG, ...msg);
};

/* =================================================================================
 * Settings helpers
 * ================================================================================= */

function getRenderable(token)  { return token?.mesh ?? token?.icon ?? null; }
function getMode()             { return game.settings.get(MODULE_ID, "mode"); }

// Colors (core) — client scoped
function getOutlineColor()       { return game.settings.get(MODULE_ID, "outlineColor"); }
function getTargetOutlineColor() { return game.settings.get(MODULE_ID, "targetOutlineColor"); }
function getGlowColor()          { return game.settings.get(MODULE_ID, "glowColor"); }
function getTargetGlowColor()    { return game.settings.get(MODULE_ID, "targetGlowColor"); }

// Colors (disposition) — client scoped
function getDispHostile()  { return game.settings.get(MODULE_ID, "dispositionHostileColor"); }
function getDispFriendly() { return game.settings.get(MODULE_ID, "dispositionFriendlyColor"); }
function getDispNeutral()  { return game.settings.get(MODULE_ID, "dispositionNeutralColor"); }
function getDispSecret()   { return game.settings.get(MODULE_ID, "dispositionSecretColor"); }

// Colors (condition) — client scoped
function getCondHigh() { return game.settings.get(MODULE_ID, "conditionHighColor"); }
function getCondMid()  { return game.settings.get(MODULE_ID, "conditionMidColor"); }
function getCondLow()  { return game.settings.get(MODULE_ID, "conditionLowColor"); }

// Toggles
function getDisableOutline()      { return !!game.settings.get(MODULE_ID, "disableOutline"); }
function getDisableGlow()         { return !!game.settings.get(MODULE_ID, "disableGlow"); }
function getEnableTarget()        { return !!game.settings.get(MODULE_ID, "enableTarget"); }
function getFoundryBorderMode() {
  const v = game.settings.get(MODULE_ID, "foundryBorder");
  // Backwards compat: if old value "hover" exists, treat it as "guided"
  if (v === "hover") return "guided";
  if (v === "enabled" || v === "guided" || v === "disabled") return v;
  return "disabled";
}
function getHideIndicator()       { return !!game.settings.get(MODULE_ID, "hideTargetIndicator"); }
function getEnableCombatBorder()  { return !!game.settings.get(MODULE_ID, "enableCombatBorder"); }

// 1 = slow pulse, 2 = medium pulse, 3 = rapid pulse
function getCombatBorderSpeed() {
  let s = Number(game.settings.get(MODULE_ID, "combatBorderSpeed"));
  if (!Number.isFinite(s)) s = 2;
  return Math.min(3, Math.max(1, Math.round(s)));
}

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

// Convert CSS color to integer
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

/** Fallback map if both module settings and CONFIG are unavailable */
const DISP_MAP = { [-1]:0xe74c3c, [0]:0xf1c40f, [1]:0x2ecc71, [2]:0x3498db, [3]:0x9b59b6 };

/** Resolve disposition color from client settings first, then CONFIG, then fallback */
function dispositionColorInt(token) {
  const disp = token?.document?.disposition ?? 0;

  let hexStr;
  if (disp === -1) hexStr = String(getDispHostile()  ?? "");
  else if (disp === 0) hexStr = String(getDispNeutral() ?? "");
  else if (disp === 1) hexStr = String(getDispFriendly() ?? "");
  else if (disp === 3) hexStr = String(getDispSecret()   ?? ""); // hidden/secret

  if (hexStr && hexStr !== "undefined") {
    const n = cssToInt(hexStr);
    if (n !== 0xffffff || /^#?ffffff$/i.test(hexStr) || /^#?fff$/i.test(hexStr)) return n;
  }

  // Next, Foundry’s configured disposition colors (if present)
  const cfg = CONFIG.Canvas?.dispositionColors ?? CONFIG.Token?.DISPOSITION_COLORS ?? null;
  const raw = cfg?.[disp] ?? cfg?.[String(disp)];
  if (raw != null) return cssToInt(String(raw));

  // Fallback to built-in map
  return DISP_MAP[disp] ?? 0xffffff;
}

// Condition thresholds
const HP_HIGH = 0.66;
const HP_MID  = 0.33;

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
  if (pct == null) return dispositionColorInt(token); // graceful fallback
  if (pct >= HP_HIGH) return cssToInt(String(getCondHigh() ?? "#2ecc71"));
  if (pct >= HP_MID)  return cssToInt(String(getCondMid()  ?? "#f1c40f"));
  return cssToInt(String(getCondLow() ?? "#e74c3c"));
}

function resolvedOutlineColorInt(token) {
  const isMyTarget = getEnableTarget() && !!token[TARGET_KEY];
  if (isMyTarget) {
    const tHex = getTargetOutlineColor?.();
    if (tHex) return cssToInt(String(tHex));
  }
  const mode = getMode();
  if (mode === "custom") {
    const hex = getOutlineColor?.() ?? "#88ccff";
    return cssToInt(String(hex));
  }
  if (mode === "condition") return conditionColorInt(token);
  return dispositionColorInt(token);
}

function resolvedGlowColorInt(token) {
  const isMyTarget = getEnableTarget() && !!token[TARGET_KEY];
  if (isMyTarget) {
    const tg = getTargetGlowColor?.();
    if (tg) return cssToInt(String(tg));
  }
  const mode = getMode();
  if (mode === "custom") {
    const base = getGlowColor?.() ?? getOutlineColor?.() ?? "#88ccff";
    return cssToInt(String(base));
  }
  return resolvedOutlineColorInt(token);
}

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
 * Guided hover border (custom dashed rectangle)
 * ================================================================================= */

function removeGuidedBorder(token) {
  const g = token?.[GUIDED_KEY];
  if (!g) return;
  try {
    if (g.parent) g.parent.removeChild(g);
    g.destroy?.({ children: true });
  } catch {}
  delete token[GUIDED_KEY];
}

// Draw dashed rectangle around token bounds
function drawDashedRect(g, x, y, w, h, dash, gap) {
  const totalH = dash + gap;
  // Top
  for (let i = 0; i < w; i += totalH) {
    const x1 = x + i;
    const x2 = Math.min(x + i + dash, x + w);
    g.moveTo(x1, y);
    g.lineTo(x2, y);
  }
  // Bottom
  for (let i = 0; i < w; i += totalH) {
    const x1 = x + i;
    const x2 = Math.min(x + i + dash, x + w);
    g.moveTo(x1, y + h);
    g.lineTo(x2, y + h);
  }
  // Left
  for (let i = 0; i < h; i += totalH) {
    const y1 = y + i;
    const y2 = Math.min(y + i + dash, y + h);
    g.moveTo(x, y1);
    g.lineTo(x, y2);
  }
  // Right
  for (let i = 0; i < h; i += totalH) {
    const y1 = y + i;
    const y2 = Math.min(y + i + dash, y + h);
    g.moveTo(x + w, y1);
    g.lineTo(x + w, y2);
  }
}

function applyGuidedBorder(token) {
  if (!token || token.destroyed) return;
  const mode = getFoundryBorderMode();
  if (mode !== "guided") {
    removeGuidedBorder(token);
    return;
  }

  // Only on hover, never while controlled
  const isControlled = !!token.controlled;
  const isHovered    = !!token[HOVER_KEY] || !!token.hover;
  if (!isHovered || isControlled) {
    removeGuidedBorder(token);
    return;
  }

  // Create or reuse graphics
  let g = token[GUIDED_KEY];
  if (!g || g.destroyed) {
    g = new PIXI.Graphics();
    g.zIndex = 1000; // above most things
    token[GUIDED_KEY] = g;
    token.addChild(g);
    token.sortChildren?.();
  }

  const pad = GUIDED_PADDING;
  const w = token.w + pad * 2;
  const h = token.h + pad * 2;

  // Token's display origin is typically (0,0) at top-left for border,
  // so we offset by -pad in both directions.
  const x = -pad;
  const y = -pad;

  g.clear();
  g.lineStyle(GUIDED_WIDTH, GUIDED_COLOR, 1);
  drawDashedRect(g, x, y, w, h, GUIDED_DASH, GUIDED_GAP);
}

/* =================================================================================
 * Combat highlighting (active turn flicker — smooth alpha pulse)
 * ================================================================================= */

const MIN_COMBAT_ALPHA = 0.25; // lowest visibility
const MAX_COMBAT_ALPHA = 1.0;  // full visibility

const CombatFX = {
  token: null,
  intervalId: null,
  alpha: MAX_COMBAT_ALPHA,
  dir: -1  // -1 = fade out, 1 = fade in
};

function getActiveCombat() {
  // v12+ uses game.combats.active; older still expose game.combat
  return game.combats?.active ?? game.combat ?? null;
}

// Step size per tick (not interval) for each speed setting
// 1 = current "slow" pulse, 2 & 3 are progressively faster
function getCombatStep() {
  const speed = getCombatBorderSpeed();
  if (speed <= 1) return 0.03;  // slow, gentle
  if (speed === 2) return 0.09; // ~3x faster than slow
  return 0.18;                  // ~6x faster than slow
}

function clearCombatInterval() {
  if (CombatFX.intervalId != null) {
    clearInterval(CombatFX.intervalId);
    CombatFX.intervalId = null;
  }
  CombatFX.alpha = MAX_COMBAT_ALPHA;
  CombatFX.dir   = -1;
}

/**
 * Mark which token is the active combatant and ensure filters exist.
 * Flicker is handled only by changing filter alpha in the interval.
 */
function setCombatToken(token) {
  const old = CombatFX.token;
  if (old === token) return;

  // Clear old token
  if (old) {
    old[COMBAT_KEY] = false;
    // Restore full alpha on old token's filters
    if (old[OUTLINE_KEY]) old[OUTLINE_KEY].alpha = MAX_COMBAT_ALPHA;
    if (old[GLOW_KEY])    old[GLOW_KEY].alpha    = MAX_COMBAT_ALPHA;
    if (!old.destroyed) refreshToken(old);
  }

  // Set new token
  CombatFX.token = (token && !token.destroyed) ? token : null;
  CombatFX.alpha = MAX_COMBAT_ALPHA;
  CombatFX.dir   = -1;

  if (CombatFX.token && getEnableCombatBorder()) {
    CombatFX.token[COMBAT_KEY] = true;
    // Ensure outline/glow applied for this token
    refreshToken(CombatFX.token);
    ensureCombatInterval();
  } else {
    clearCombatInterval();
  }
}

function ensureCombatInterval() {
  if (CombatFX.intervalId != null) return;

  // Fixed interval for smoothness; speed is handled by step size
  const interval = 50; // ~20 FPS

  CombatFX.intervalId = window.setInterval(() => {
    if (!getEnableCombatBorder()) {
      setCombatToken(null);
      return;
    }

    const t = CombatFX.token;
    if (!t || t.destroyed || !canvas?.ready) {
      setCombatToken(null);
      return;
    }

    // If the token is actively interacted with, pin alpha to full (no flicker)
    const hoverLike =
      t.controlled ||
      !!t[HOVER_KEY] ||
      (getEnableTarget() && !!t[TARGET_KEY]);

    if (hoverLike) {
      CombatFX.alpha = MAX_COMBAT_ALPHA;
      CombatFX.dir   = -1;
    } else {
      const step = getCombatStep();
      CombatFX.alpha += CombatFX.dir * step;

      if (CombatFX.alpha <= MIN_COMBAT_ALPHA) {
        CombatFX.alpha = MIN_COMBAT_ALPHA;
        CombatFX.dir   = 1;
      } else if (CombatFX.alpha >= MAX_COMBAT_ALPHA) {
        CombatFX.alpha = MAX_COMBAT_ALPHA;
        CombatFX.dir   = -1;
      }
    }

    const outline = t[OUTLINE_KEY];
    const glow    = t[GLOW_KEY];

    if (outline) outline.alpha = CombatFX.alpha;
    if (glow)    glow.alpha    = CombatFX.alpha;
    // No need to call refreshToken; PIXI redraws based on alpha change
  }, interval);
}

function updateCombatTokenFromCombat(combat) {
  if (!canvas?.ready || !canvas.scene) {
    setCombatToken(null);
    return;
  }

  if (!getEnableCombatBorder()) {
    setCombatToken(null);
    return;
  }

  combat = combat ?? getActiveCombat();
  if (!combat) {
    setCombatToken(null);
    return;
  }

  // If the combat exists but hasn't started (or has been reset), treat as no combat
  if (combat.started === false) {
    setCombatToken(null);
    return;
  }

  // Only care if this combat is on our current scene
  const sceneId = combat.scene?.id ?? combat.sceneId;
  if (sceneId && canvas.scene && sceneId !== canvas.scene.id) {
    setCombatToken(null);
    return;
  }

  const c = combat.combatant;
  if (!c) {
    setCombatToken(null);
    return;
  }

  const tokenId = c.token?.id ?? c.tokenId;
  const token   = canvas.tokens?.get?.(tokenId) ?? null;
  setCombatToken(token);
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

/**
 * Restore the border so Foundry can drive it again in "enabled" mode:
 * - renderable: true
 * - alpha: > 0
 * - DO NOT touch `visible` so Foundry can hide/show on hover/selection.
 */
function restoreNativeBorderForFoundry(token) {
  const b = token?.border;
  if (!b) return;
  b.renderable = true;
  if (b.alpha === 0) b.alpha = 1;
}

/**
 * Apply native border visibility according to the foundryBorder mode:
 * - "disabled": always hide the default Foundry border
 * - "enabled":  let Foundry behave normally (hover + selection),
 *               we only make sure it's not permanently hidden
 * - "guided":   same as disabled; we replace it with our own guided border
 */
function applyNativeBorderVisibility(token) {
  const mode = getFoundryBorderMode();
  const b = token?.border;
  if (!b) return;

  if (mode === "disabled" || mode === "guided") {
    hideNativeBorder(token);
    return;
  }

  if (mode === "enabled") {
    restoreNativeBorderForFoundry(token);
    return;
  }
}

function hideNativeIndicator(token) {
  const i = token?.target;
  if (!i) return;
  i.renderable = false;
  i.visible = false;
  i.alpha = 0;
  if (typeof i.clear === "function") i.clear();
}
function applyNativeTargetVisibility(token) {
  if (getHideIndicator()) hideNativeIndicator(token);
}

/* =================================================================================
 * Token refresh
 * ================================================================================= */

function refreshToken(token) {
  if (!token || token.destroyed) return;

  const show =
    token.controlled ||
    !!token[HOVER_KEY] ||
    (getEnableTarget() && !!token[TARGET_KEY]) ||
    (getEnableCombatBorder() && !!token[COMBAT_KEY]);  // active combatant

  const outlineColor = resolvedOutlineColorInt(token);
  const glowColor    = resolvedGlowColorInt(token);

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

  // Guided border (independent of outline/glow)
  if (getFoundryBorderMode() === "guided") {
    applyGuidedBorder(token);
  } else {
    removeGuidedBorder(token);
  }

  applyNativeBorderVisibility(token);
  applyNativeTargetVisibility(token);
}

/* =================================================================================
 * Hooks, Handlers & Wiring
 * ================================================================================= */

const Handlers = {};

Hooks.on("canvasReady", () => {
  if (Handlers._installed) return;
  Handlers._installed = true;

  logOnce("ready", "info", "ready — tokens:", canvas.tokens?.placeables?.length ?? 0);

  // Hover → show outline/glow (and sync native vis + guided)
  Handlers.hover = Hooks.on("hoverToken", (token, hovered) => {
    token[HOVER_KEY] = hovered;
    refreshToken(token);
  });

  // Control → same as hover (some systems only set .hover on control)
  Handlers.control = Hooks.on("controlToken", (token) => {
    token[HOVER_KEY] = !!token?.hover;
    refreshToken(token);
  });

  // Targeting (per-user) → recompute my target flag then refresh
  Handlers.target = Hooks.on("targetToken", (user, token) => {
    token[TARGET_KEY] = !!game.user?.targets?.has?.(token);
    refreshToken(token);
  });

  // Token disposition changes (relevant for disposition mode)
  Handlers.updateDoc = Hooks.on("updateToken", (doc, changes) => {
    if (getMode() !== "condition" && !("disposition" in changes)) return;
    const t = canvas.tokens?.get(doc.id);
    if (t) refreshToken(t);
  });

  // Actor HP/condition changes (relevant for condition mode)
  Handlers.updateActor = Hooks.on("updateActor", (actor) => {
    if (getMode() !== "condition") return;
    for (const t of canvas.tokens?.placeables ?? []) {
      if (t.document?.actorId === actor.id) refreshToken(t);
    }
  });

  // Settings changes → update native vis or full refresh
  Handlers.updateSetting = Hooks.on("updateSetting", (setting) => {
    if (!setting?.key?.startsWith?.(`${MODULE_ID}.`)) return;

    // Native visibility toggles / foundry border mode apply immediately
    if (setting.key === `${MODULE_ID}.foundryBorder` ||
        setting.key === `${MODULE_ID}.hideTargetIndicator`) {
      for (const t of canvas.tokens?.placeables ?? []) {
        applyNativeBorderVisibility(t);
        applyNativeTargetVisibility(t);
        // Guided mode depends on this too
        if (getFoundryBorderMode() === "guided") applyGuidedBorder(t);
        else removeGuidedBorder(t);
      }
      return;
    }

    // Combat flicker toggle / speed
    if (setting.key === `${MODULE_ID}.enableCombatBorder`) {
      if (!getEnableCombatBorder()) {
        setCombatToken(null);
      } else {
        updateCombatTokenFromCombat(getActiveCombat());
      }
    } else if (setting.key === `${MODULE_ID}.combatBorderSpeed`) {
      // Just reset alpha/dir; interval already running will pick new step
      CombatFX.alpha = MAX_COMBAT_ALPHA;
      CombatFX.dir   = -1;
    }

    // For mode, enableTarget, and any color changes, just refresh
    for (const t of canvas.tokens?.placeables ?? []) {
      if (setting.key === `${MODULE_ID}.enableTarget`) {
        t[TARGET_KEY] = !!game.user?.targets?.has?.(t);
      }
      refreshToken(t);
    }
  });

  // Foundry’s own token refresh → keep native visuals in sync
  Handlers.refreshToken = Hooks.on("refreshToken", (token) => {
    applyNativeBorderVisibility(token);
    applyNativeTargetVisibility(token);
    if (getFoundryBorderMode() === "guided") applyGuidedBorder(token);
  });

  // Clean up on token deletion
  Handlers.delete = Hooks.on("deleteToken", (scene, doc) => {
    const t = canvas.tokens?.get(doc.id);
    if (t) {
      removeGlow(t);
      removeOutline(t);
      removeGuidedBorder(t);
      if (CombatFX.token && CombatFX.token === t) {
        setCombatToken(null);
      }
    }
  });

  // Combat start → immediately highlight first combatant
  Handlers.combatStart = Hooks.on("combatStart", (combat) => {
    updateCombatTokenFromCombat(combat);
  });

  // Combat turn change → update active combatant flicker
  Handlers.combatTurn = Hooks.on("combatTurn", (combat) => {
    updateCombatTokenFromCombat(combat);
  });

  // Combat update → always re-evaluate active combatant
  Handlers.updateCombat = Hooks.on("updateCombat", (combat/*, changed*/) => {
    updateCombatTokenFromCombat(combat);
  });

  // Combat end → clear combat border completely
  Handlers.combatEnd = Hooks.on("combatEnd", (combat, options, userId) => {
    setCombatToken(null);
  });

  // Combat deleted → also clear combat border
  Handlers.deleteCombat = Hooks.on("deleteCombat", (combat, options, userId) => {
    setCombatToken(null);
  });

  // Initial pass across my scene tokens
  const myTargets = game.user?.targets ?? new Set();
  for (const t of canvas.tokens?.placeables ?? []) {
    t[HOVER_KEY]  = !!t?.hover;
    t[TARGET_KEY] = myTargets.has(t);
    refreshToken(t);
  }

  // If there is an active combat on this scene, start flicker
  updateCombatTokenFromCombat(getActiveCombat());
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
  off("combatStart",  Handlers.combatStart);
  off("combatTurn",   Handlers.combatTurn);
  off("updateCombat", Handlers.updateCombat);
  off("combatEnd",    Handlers.combatEnd);
  off("deleteCombat", Handlers.deleteCombat);

  clearCombatInterval();
  setCombatToken(null);

  for (const t of canvas.tokens?.placeables ?? []) {
    removeGlow(t);
    removeOutline(t);
    removeGuidedBorder(t);
  }
  Object.keys(Handlers).forEach(k => delete Handlers[k]);
  Handlers._installed = false;

  logOnce("shutdown", "info", "shutdown — handlers removed");
});
