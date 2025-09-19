const MODULE_ID = "pixie-border";

Hooks.once("init", () => {
  // Color mode
  game.settings.register(MODULE_ID, "mode", {
    name: game.i18n.localize("pixie-border.settings.mode.name"),
    hint: game.i18n.localize("pixie-border.settings.mode.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "disposition",
    choices: {
      disposition: game.i18n.localize("pixie-border.settings.mode.choices.disposition"),
      custom: game.i18n.localize("pixie-border.settings.mode.choices.custom"),
      condition: game.i18n.localize("pixie-border.settings.mode.choices.condition")
    }
  });

  // Outline color (custom mode)
  game.settings.register(MODULE_ID, "outlineColor", {
    name: game.i18n.localize("pixie-border.settings.outlineColor.name"),
    hint: game.i18n.localize("pixie-border.settings.outlineColor.hint"),
    scope: "world",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Target outline color (custom mode + target)
  game.settings.register(MODULE_ID, "targetOutlineColor", {
    name: game.i18n.localize("pixie-border.settings.targetOutlineColor.name"),
    hint: game.i18n.localize("pixie-border.settings.targetOutlineColor.hint"),
    scope: "world",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Glow color (custom mode)
  game.settings.register(MODULE_ID, "glowColor", {
    name: game.i18n.localize("pixie-border.settings.glowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.glowColor.hint"),
    scope: "world",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Target glow color (custom mode + target)
  game.settings.register(MODULE_ID, "targetGlowColor", {
    name: game.i18n.localize("pixie-border.settings.targetGlowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.targetGlowColor.hint"),
    scope: "world",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Border thickness (pixels)
  game.settings.register(MODULE_ID, "thickness", {
    name: game.i18n.localize("pixie-border.settings.thickness.name"),
    hint: game.i18n.localize("pixie-border.settings.thickness.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 5, step: 1 }
  });

  // Hide Foundry's default selection border
  game.settings.register(MODULE_ID, "hideDefaultBorder", {
    name: game.i18n.localize("pixie-border.settings.hideDefaultBorder.name"),
    hint: game.i18n.localize("pixie-border.settings.hideDefaultBorder.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  // Disable outline (replaces enableOutline)
  game.settings.register(MODULE_ID, "disableOutline", {
    name: game.i18n.localize("pixie-border.settings.disableOutline.name"),
    hint: game.i18n.localize("pixie-border.settings.disableOutline.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Enable target border
  game.settings.register(MODULE_ID, "enableTarget", {
    name: game.i18n.localize("pixie-border.settings.enableTarget.name"),
    hint: game.i18n.localize("pixie-border.settings.enableTarget.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Disable glow (replaces enableGlow)
  game.settings.register(MODULE_ID, "disableGlow", {
    name: game.i18n.localize("pixie-border.settings.disableGlow.name"),
    hint: game.i18n.localize("pixie-border.settings.disableGlow.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Glow distance (pixels)
  game.settings.register(MODULE_ID, "glowDistance", {
    name: game.i18n.localize("pixie-border.settings.glowDistance.name"),
    hint: game.i18n.localize("pixie-border.settings.glowDistance.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: { min: 1, max: 64, step: 1 }
  });

  // Glow outer strength
  game.settings.register(MODULE_ID, "glowOuterStrength", {
    name: game.i18n.localize("pixie-border.settings.glowOuterStrength.name"),
    hint: game.i18n.localize("pixie-border.settings.glowOuterStrength.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 0, max: 10, step: 0.5 }
  });
});
