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

  // Custom color (used only when mode=custom)
  game.settings.register(MODULE_ID, "customColor", {
    name: game.i18n.localize("pixie-border.settings.customColor.name"),
    hint: game.i18n.localize("pixie-border.settings.customColor.hint"),
    scope: "world",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Target Border Color
  game.settings.register(MODULE_ID, "targetColor", {
    name: game.i18n.localize("pixie-border.settings.targetColor.name"),
    hint: game.i18n.localize("pixie-border.settings.targetColor.hint"),
    scope: "world",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Border Glow Color
  game.settings.register(MODULE_ID, "glowColor", {
    name: game.i18n.localize("pixie-border.settings.glowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.glowColor.hint"),
    scope: "world",
    config: true,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  // Visual thickness (pixels)
  game.settings.register(MODULE_ID, "thickness", {
    name: game.i18n.localize("pixie-border.settings.thickness.name"),
    hint: game.i18n.localize("pixie-border.settings.thickness.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 5, step: 1 }
  });

  // Hide Foundry's default square token border
  game.settings.register(MODULE_ID, "hideDefaultBorder", {
    name: game.i18n.localize("pixie-border.settings.hideDefaultBorder.name"),
    hint: game.i18n.localize("pixie-border.settings.hideDefaultBorder.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true 
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

  // Enable border glow
  game.settings.register(MODULE_ID, "enableGlow", {
    name: game.i18n.localize("pixie-border.settings.enableGlow.name"),
    hint: game.i18n.localize("pixie-border.settings.enableGlow.hint"),
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

  // Glow strength
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


