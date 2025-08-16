const MODULE_ID = "pixie-border";

Hooks.once("init", () => {
  // Color mode
  game.settings.register(MODULE_ID, "mode", {
    name: "Border color mode",
    hint: "Use foundry disposition colors, a custom color, or player colors.",
    scope: "world",
    config: true,
    type: String,
    default: "disposition",
    choices: {
      disposition: "Disposition colors",
      custom: "Custom color"
    }
  });

  // Custom color (used only when mode=custom)
  game.settings.register(MODULE_ID, "customColor", {
    name: "Custom color (hex or CSS)",
    hint: "Used only when Color mode = Custom. Examples: #88ccff or rgb(136,204,255).",
    scope: "world",
    config: true,
    type: String,
    default: "#88ccff"
  });

  // Visual thickness (pixels)
  game.settings.register(MODULE_ID, "thickness", {
    name: "Border thickness",
    hint: "Outline thickness in pixels.",
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 5, step: 1 }
  });

  // Hide Foundry's default square token border
  game.settings.register(MODULE_ID, "hideDefaultBorder", {
    name: "Hide Default Foundry Border",
    hint: "Hide Foundry’s built-in selection border on tokens (client-side).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true 
  });
});