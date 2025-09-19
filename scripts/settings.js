const MODULE_ID = "pixie-border";

Hooks.once("init", () => {
  
  // --- Visibility & toggles -----------------------------------------------------

  // Hide Default Foundry Border
  game.settings.register(MODULE_ID, "hideDefaultBorder", {
    name: game.i18n.localize("pixie-border.settings.hideDefaultBorder.name"),
    hint: game.i18n.localize("pixie-border.settings.hideDefaultBorder.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  // Hide Foundry's target indicator
  game.settings.register(MODULE_ID, "hideTargetIndicator", {
     name: game.i18n.localize("pixie-border.settings.hideTargetIndicator.name"),
     hint: game.i18n.localize("pixie-border.settings.hideTargetIndicator.hint"),
     scope: "client",
     config: true,
     type: Boolean,
     default: false,
     requiresReload: true
   });

  // Enable Target Border
  game.settings.register(MODULE_ID, "enableTarget", {
    name: game.i18n.localize("pixie-border.settings.enableTarget.name"),
    hint: game.i18n.localize("pixie-border.settings.enableTarget.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // Disable Outline Filter
  game.settings.register(MODULE_ID, "disableOutline", {
    name: game.i18n.localize("pixie-border.settings.disableOutline.name"),
    hint: game.i18n.localize("pixie-border.settings.disableOutline.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // Disable Glow Filter
  game.settings.register(MODULE_ID, "disableGlow", {
    name: game.i18n.localize("pixie-border.settings.disableGlow.name"),
    hint: game.i18n.localize("pixie-border.settings.disableGlow.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // --- Numeric controls ---------------------------------------------------------

  // Outline Thickness
  game.settings.register(MODULE_ID, "thickness", {
    name: game.i18n.localize("pixie-border.settings.thickness.name"),
    hint: game.i18n.localize("pixie-border.settings.thickness.hint"),
    scope: "client",
    config: true,
    type: Number,
    default: 1,
    range: { min: 1, max: 5, step: 1 }
  });

  // Glow Distance
  game.settings.register(MODULE_ID, "glowDistance", {
    name: game.i18n.localize("pixie-border.settings.glowDistance.name"),
    hint: game.i18n.localize("pixie-border.settings.glowDistance.hint"),
    scope: "client",
    config: true,
    type: Number,
    default: 10,
    range: { min: 1, max: 64, step: 1 }
  });

  // Glow Strength
  game.settings.register(MODULE_ID, "glowOuterStrength", {
    name: game.i18n.localize("pixie-border.settings.glowOuterStrength.name"),
    hint: game.i18n.localize("pixie-border.settings.glowOuterStrength.hint"),
    scope: "client",
    config: true,
    type: Number,
    default: 3,
    range: { min: 0, max: 10, step: 0.5 }
  });

  // --- Color mode & colors ------------------------------------------------------

  // Color Mode
  game.settings.register(MODULE_ID, "mode", {
    name: game.i18n.localize("pixie-border.settings.mode.name"),
    hint: game.i18n.localize("pixie-border.settings.mode.hint"),
    scope: "client",
    config: true,
    type: String,
    default: "disposition",
    choices: {
      disposition: game.i18n.localize("pixie-border.settings.mode.choices.disposition"),
      custom: game.i18n.localize("pixie-border.settings.mode.choices.custom"),
      condition: game.i18n.localize("pixie-border.settings.mode.choices.condition")
    }
  });

  // Outline Color
  game.settings.register(MODULE_ID, "outlineColor", {
    name: game.i18n.localize("pixie-border.settings.outlineColor.name"),
    hint: game.i18n.localize("pixie-border.settings.outlineColor.hint"),
    scope: "client",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Target Outline Color
  game.settings.register(MODULE_ID, "targetOutlineColor", {
    name: game.i18n.localize("pixie-border.settings.targetOutlineColor.name"),
    hint: game.i18n.localize("pixie-border.settings.targetOutlineColor.hint"),
    scope: "client",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Glow Color
  game.settings.register(MODULE_ID, "glowColor", {
    name: game.i18n.localize("pixie-border.settings.glowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.glowColor.hint"),
    scope: "client",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Target Glow Color
  game.settings.register(MODULE_ID, "targetGlowColor", {
    name: game.i18n.localize("pixie-border.settings.targetGlowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.targetGlowColor.hint"),
    scope: "client",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });
});

