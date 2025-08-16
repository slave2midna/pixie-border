const MODULE_ID  = "pixie-border";
const FILTER_KEY = "_pixiOutlineFilter";
const FILTER_ON  = "_pixiOutlineActive";
const HOVER_KEY  = "_pixiHover";

const OUTLINE_QUALITY = 1;
const OUTLINE_PADDING = 0;

function getRenderable(token) { return token?.mesh ?? token?.icon ?? null; }

// ---- settings getters ----
function getMode()         { return game.settings.get(MODULE_ID, "mode"); }
function getCustomColor()  { return game.settings.get(MODULE_ID, "customColor"); }
function getThickness()    {
  let t = Number(game.settings.get(MODULE_ID, "thickness"));
  if (!Number.isFinite(t)) t = 3;
  return Math.min(5, Math.max(1, Math.round(t)));
}
function getHideDefault()  { return !!game.settings.get(MODULE_ID, "hideDefaultBorder"); } // client-scope

// ---- color helpers ----
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

// Foundry v13 disposition map
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

// ---- filter ops (unchanged outline logic) ----
function applyOutline(token, colorInt) {
  const mesh = getRenderable(token);
  if (!mesh) return;
  const OutlineFilter = PIXI?.filters?.OutlineFilter || globalThis.OutlineFilter;
  if (!OutlineFilter) { ui.notifications?.warn?.("PIXI OutlineFilter not found. Ensure vendor/pixi-filters.min.js loads before scripts/main.js."); return; }

  let f = token[FILTER_KEY];
  if (!(f instanceof OutlineFilter)) {
    f = new OutlineFilter(getThickness(), colorInt, OUTLINE_QUALITY);
    token[FILTER_KEY] = f;
  }
  f.thickness = getThickness();
  f.color     = colorInt;
  f.quality   = OUTLINE_QUALITY;
  f.padding   = OUTLINE_PADDING;

  const filters = mesh.filters ?? [];
  if (!filters.includes(f)) mesh.filters = filters.concat([f]);

  token[FILTER_ON] = true;
  mesh.refresh?.();
}
function removeOutline(token) {
  const mesh = getRenderable(token);
  const f = token[FILTER_KEY];
  if (!mesh || !f) { token[FILTER_ON] = false; return; }
  try { mesh.filters = (mesh.filters ?? []).filter(x => x !== f); } catch {}
  delete token[FILTER_KEY];
  token[FILTER_ON] = false;
  mesh.refresh?.();
}

// ---- native Foundry border visibility control ----
function hideNativeBorder(token) {
  const b = token?.border;
  if (!b) return;
  // Strong hide: prevent rendering and nuke current stroke
  b.renderable = false;
  b.visible = false;
  b.alpha = 0;
  if (typeof b.clear === "function") b.clear();
}
// IMPORTANT: when the setting is OFF, do not force any values;
// let Foundry manage visibility based on hover/selection again.
function applyNativeBorderVisibility(token) {
  if (getHideDefault()) hideNativeBorder(token);
}

function refreshToken(token) {
  if (!token) return;
  const show = token.controlled || !!token[HOVER_KEY];
  if (show && !token[FILTER_ON]) applyOutline(token, resolvedColorInt(token));
  else if (show && token[FILTER_ON]) {
    const f = token[FILTER_KEY];
    if (f) { f.thickness = getThickness(); f.color = resolvedColorInt(token); }
  } else if (!show && token[FILTER_ON]) removeOutline(token);

  // Enforce native border hide only when the setting is enabled
  applyNativeBorderVisibility(token);
}

// ---- hooks ----
const Handlers = {};

Hooks.on("canvasReady", () => {
  if (Handlers._installed) return;
  Handlers._installed = true;

  Handlers.hover = Hooks.on("hoverToken", (token, hovered) => {
    token[HOVER_KEY] = hovered;
    refreshToken(token);
  });

  Handlers.control = Hooks.on("controlToken", (token, controlled) => {
    token[HOVER_KEY] = !!token?.hover;
    refreshToken(token);
  });

  // Recolor on disposition change
  Handlers.updateDoc = Hooks.on("updateToken", (doc, changes) => {
    if (!("disposition" in changes)) return;
    const t = canvas.tokens?.get(doc.id);
    if (t) refreshToken(t);
  });

  // React to our settings changing (mode/customColor/thickness/hideDefaultBorder)
  Handlers.updateSetting = Hooks.on("updateSetting", (setting) => {
    if (!setting?.key?.startsWith?.(`${MODULE_ID}.`)) return;

    // If hideDefaultBorder toggled, either hide now or restore via token refresh
    if (setting.key === `${MODULE_ID}.hideDefaultBorder`) {
      const hide = !!setting.value;
      for (const t of canvas.tokens?.placeables ?? []) {
        if (hide) {
          hideNativeBorder(t);
        } else {
          // Restore to Foundry defaults by asking it to redraw
          // (don't force visible=true; let core decide)
          t.border && (t.border.renderable = true, t.border.alpha = 1, t.border.visible = true);
          t.refresh?.();
        }
      }
    } else {
      // other settings: just refresh our outline parameters
      for (const t of canvas.tokens?.placeables ?? []) refreshToken(t);
    }
  });

  // After Foundry redraws a token, if the setting is ON, stomp the border again
  Handlers.refreshToken = Hooks.on("refreshToken", (token) => {
    if (getHideDefault()) hideNativeBorder(token);
  });

  Handlers.delete = Hooks.on("deleteToken", (scene, doc) => {
    const t = canvas.tokens?.get(doc.id);
    if (t) removeOutline(t);
  });

  // Initial pass
  for (const t of canvas.tokens?.placeables ?? []) {
    t[HOVER_KEY] = !!t?.hover;
    refreshToken(t);
  }

  ui.notifications?.info?.("Pixie Border enabled (PIXI Outline; Hide Default Border fixed toggle).");
});

Hooks.once("shutdown", () => {
  const off = (h, fn) => { if (fn) try { Hooks.off(h, fn); } catch {} };
  off("hoverToken",   Handlers.hover);
  off("controlToken", Handlers.control);
  off("updateToken",  Handlers.updateDoc);
  off("updateSetting",Handlers.updateSetting);
  off("refreshToken", Handlers.refreshToken);
  off("deleteToken",  Handlers.delete);

  for (const t of canvas.tokens?.placeables ?? []) removeOutline(t);
  Object.keys(Handlers).forEach(k => delete Handlers[k]);
  Handlers._installed = false;
});