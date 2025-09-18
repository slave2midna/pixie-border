const MODULE_ID = "pixie-border";

Hooks.once("init", () => {
  // Border Thickness
  game.settings.register(MODULE_ID, "thickness", {
    name: game.i18n.localize("pixie-border.settings.thickness.name"),
    hint: game.i18n.localize("pixie-border.settings.thickness.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 5, step: 1 }
  });

  // Disable Foundry Border
  game.settings.register(MODULE_ID, "hideDefaultBorder", {
    name: game.i18n.localize("pixie-border.settings.hideDefaultBorder.name"),
    hint: game.i18n.localize("pixie-border.settings.hideDefaultBorder.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  // Enable Target Border (per-user)
  game.settings.register(MODULE_ID, "enableTarget", {
    name: game.i18n.localize("pixie-border.settings.enableTarget.name"),
    hint: game.i18n.localize("pixie-border.settings.enableTarget.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // Enable Border Glow
  game.settings.register(MODULE_ID, "enableGlow", {
    name: game.i18n.localize("pixie-border.settings.enableGlow.name"),
    hint: game.i18n.localize("pixie-border.settings.enableGlow.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Glow Distance
  game.settings.register(MODULE_ID, "glowDistance", {
    name: game.i18n.localize("pixie-border.settings.glowDistance.name"),
    hint: game.i18n.localize("pixie-border.settings.glowDistance.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: { min: 1, max: 64, step: 1 }
  });

  // Glow Strength
  game.settings.register(MODULE_ID, "glowOuterStrength", {
    name: game.i18n.localize("pixie-border.settings.glowOuterStrength.name"),
    hint: game.i18n.localize("pixie-border.settings.glowOuterStrength.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 0, max: 10, step: 0.5 }
  });

  // Color Mode (with inline help)
  const modeDisp = game.i18n.localize("pixie-border.settings.mode.choices.disposition");
  const modeCust = game.i18n.localize("pixie-border.settings.mode.choices.custom");
  const modeCond = game.i18n.localize("pixie-border.settings.mode.choices.condition");
  const modeHint = `
<div style="margin-top:0.25rem">
  <div style="font-weight:600">${game.i18n.localize("pixie-border.settings.mode.hint")}</div>
  <ul style="margin:0.25rem 0 0.5rem 1.25rem; list-style: disc;">
    <li><b>${modeDisp}:</b> ${game.i18n.localize("pixie-border.mode.help.disposition")}</li>
    <li><b>${modeCust}:</b> ${game.i18n.localize("pixie-border.mode.help.custom")}</li>
    <li><b>${modeCond}:</b> ${game.i18n.localize("pixie-border.mode.help.condition")}</li>
  </ul>
</div>`.trim();

  game.settings.register(MODULE_ID, "mode", {
    name: game.i18n.localize("pixie-border.settings.mode.name"),
    hint: modeHint,
    scope: "world",
    config: true,
    type: String,
    default: "disposition",
    choices: { disposition: modeDisp, custom: modeCust, condition: modeCond }
  });

  // Custom color (String + hex; UI shows color input in v13)
  game.settings.register(MODULE_ID, "customColor", {
    name: game.i18n.localize("pixie-border.settings.customColor.name"),
    hint: game.i18n.localize("pixie-border.settings.customColor.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "#88ccff"
  });
});
