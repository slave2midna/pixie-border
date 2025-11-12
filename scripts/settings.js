const MODULE_ID = "pixie-border";
const TEMPLATE_PATH = `modules/pixie-border/templates/colorConfig.hbs`;

/** Defaults for reset (safe, adjustable later to match your in-module defaults) */
const COLOR_DEFAULTS = {
  // Core outline/glow
  outlineColor: "#88ccff",
  targetOutlineColor: "#88ccff",
  glowColor: "#88ccff",
  targetGlowColor: "#88ccff",

  // Disposition colors (outline+glow share one)
  dispositionHostileColor: "#ff3a3a",
  dispositionFriendlyColor: "#2ecc71",
  dispositionNeutralColor: "#f1c40f",
  dispositionSecretColor: "#9b59b6",

  // Condition colors (high/mid/low HP%)
  conditionHighColor: "#2ecc71",
  conditionMidColor: "#f1c40f",
  conditionLowColor: "#e74c3c"
};

/** Normalize to hex string (handles Foundry Color objects or plain strings) */
function asHexString(v, fallback = "#88ccff") {
  try {
    return foundry.utils.Color.fromString(v ?? fallback).toString(16, "#");
  } catch {
    return fallback;
  }
}

/** Color configuration form application */
class PixieBorderColorConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pixie-border-color-config",
      title: game.i18n.localize("pixie-border.settings.colorMenu.name"),
      template: TEMPLATE_PATH,
      classes: ["pixie-border", "sheet"],
      width: 520,
      height: "auto",
      submitOnChange: false,
      closeOnSubmit: true
    });
  }

  /** Provide current values to the template */
  async getData() {
    const g = (k) => asHexString(game.settings.get(MODULE_ID, k), COLOR_DEFAULTS[k]);
    return {
      // Core
      outlineColor: g("outlineColor"),
      targetOutlineColor: g("targetOutlineColor"),
      glowColor: g("glowColor"),
      targetGlowColor: g("targetGlowColor"),

      // Disposition
      dispositionHostileColor: g("dispositionHostileColor"),
      dispositionFriendlyColor: g("dispositionFriendlyColor"),
      dispositionNeutralColor: g("dispositionNeutralColor"),
      dispositionSecretColor: g("dispositionSecretColor"),

      // Condition (HP%)
      conditionHighColor: g("conditionHighColor"),
      conditionMidColor: g("conditionMidColor"),
      conditionLowColor: g("conditionLowColor")
    };
  }

  /** Wire up Reset and Cancel buttons + live sync between color/hex inputs */
  activateListeners(html) {
    super.activateListeners(html);

    // --- Reset button ---
    html.find('[data-action="reset"]').on("click", async () => {
      for (const [k, v] of Object.entries(COLOR_DEFAULTS)) {
        html.find(`input[name="${k}"]`).val(v);
        html.find(`input.color-hex[data-mirror="${k}"]`).val(v);
      }
      await Promise.all(Object.entries(COLOR_DEFAULTS).map(([k, v]) =>
        game.settings.set(MODULE_ID, k, v)
      ));
      ui.notifications?.info(game.i18n.localize("pixie-border.settings.colorMenu.reset"));
      this._refreshTokens();
    });

    // --- Cancel button ---
    html.find('[data-action="cancel"]').on("click", () => this.close());

    // --- Live sync helpers ---
    const normalizeHex = (v) => {
      try { return foundry.utils.Color.fromString(v).toString(16, "#"); }
      catch { return null; }
    };

    // Color → Hex
    html.find('input[type="color"]').on("input change", (ev) => {
      const name = ev.currentTarget.name;
      const hex = ev.currentTarget.value;
      html.find(`input.color-hex[data-mirror="${name}"]`).val(hex);
    });

    // Hex → Color (validate and mirror)
    html.find('input.color-hex').on("change", (ev) => {
      const target = ev.currentTarget;
      const name = target.dataset.mirror;
      const normalized = normalizeHex(target.value);
      if (normalized) {
        target.value = normalized;
        html.find(`input[name="${name}"]`).val(normalized);
      } else {
        // Revert and warn
        target.value = html.find(`input[name="${name}"]`).val();
        ui.notifications?.warn(
          game.i18n.localize("pixie-border.settings.colorMenu.invalidHex") ??
          "Please enter a valid color (e.g., #88ccff)."
        );
      }
    });
  }

  /** Save on submit */
  async _updateObject(_event, formData) {
    await Promise.all(Object.entries(formData).map(([k, v]) =>
      game.settings.set(MODULE_ID, k, String(v))
    ));
    ui.notifications?.info(game.i18n.localize("pixie-border.settings.colorMenu.saved"));
    this._refreshTokens();
  }

  /** Light refresh for immediate visual feedback */
  _refreshTokens() {
    for (const t of canvas.tokens?.placeables ?? []) {
      Hooks.callAll("updateSetting", { key: `${MODULE_ID}.outlineColor` });
    }
  }
}

Hooks.once("init", () => {
  // Preload template
  loadTemplates?.([TEMPLATE_PATH]);

  // --- Color mode & customization ------------------------------------------------

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

  // Submenu directly after Color Mode
  game.settings.registerMenu(MODULE_ID, "customizeColors", {
    name: game.i18n.localize("pixie-border.settings.colorMenu.name"),
    label: game.i18n.localize("pixie-border.settings.colorMenu.label"),
    hint: game.i18n.localize("pixie-border.settings.colorMenu.hint"),
    icon: "fas fa-palette",
    restricted: false,
    type: PixieBorderColorConfig
  });


  // --- Visibility & toggles -----------------------------------------------------

  game.settings.register(MODULE_ID, "hideDefaultBorder", {
    name: game.i18n.localize("pixie-border.settings.hideDefaultBorder.name"),
    hint: game.i18n.localize("pixie-border.settings.hideDefaultBorder.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  game.settings.register(MODULE_ID, "hideTargetIndicator", {
    name: game.i18n.localize("pixie-border.settings.hideTargetIndicator.name"),
    hint: game.i18n.localize("pixie-border.settings.hideTargetIndicator.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  game.settings.register(MODULE_ID, "enableTarget", {
    name: game.i18n.localize("pixie-border.settings.enableTarget.name"),
    hint: game.i18n.localize("pixie-border.settings.enableTarget.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "disableOutline", {
    name: game.i18n.localize("pixie-border.settings.disableOutline.name"),
    hint: game.i18n.localize("pixie-border.settings.disableOutline.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "disableGlow", {
    name: game.i18n.localize("pixie-border.settings.disableGlow.name"),
    hint: game.i18n.localize("pixie-border.settings.disableGlow.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // --- Numeric controls ---------------------------------------------------------

  game.settings.register(MODULE_ID, "thickness", {
    name: game.i18n.localize("pixie-border.settings.thickness.name"),
    hint: game.i18n.localize("pixie-border.settings.thickness.hint"),
    scope: "client",
    config: true,
    type: Number,
    default: 1,
    range: { min: 1, max: 5, step: 1 }
  });

  game.settings.register(MODULE_ID, "glowDistance", {
    name: game.i18n.localize("pixie-border.settings.glowDistance.name"),
    hint: game.i18n.localize("pixie-border.settings.glowDistance.hint"),
    scope: "client",
    config: true,
    type: Number,
    default: 10,
    range: { min: 1, max: 64, step: 1 }
  });

  game.settings.register(MODULE_ID, "glowOuterStrength", {
    name: game.i18n.localize("pixie-border.settings.glowOuterStrength.name"),
    hint: game.i18n.localize("pixie-border.settings.glowOuterStrength.hint"),
    scope: "client",
    config: true,
    type: Number,
    default: 3,
    range: { min: 0, max: 10, step: 0.5 }
  });

  // --- Color fields -----------------------------------------------------------

  // Core
  game.settings.register(MODULE_ID, "outlineColor", {
    name: game.i18n.localize("pixie-border.settings.outlineColor.name"),
    hint: game.i18n.localize("pixie-border.settings.outlineColor.hint"),
    scope: "client",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.outlineColor })
  });

  game.settings.register(MODULE_ID, "targetOutlineColor", {
    name: game.i18n.localize("pixie-border.settings.targetOutlineColor.name"),
    hint: game.i18n.localize("pixie-border.settings.targetOutlineColor.hint"),
    scope: "client",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.targetOutlineColor })
  });

  game.settings.register(MODULE_ID, "glowColor", {
    name: game.i18n.localize("pixie-border.settings.glowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.glowColor.hint"),
    scope: "client",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.glowColor })
  });

  game.settings.register(MODULE_ID, "targetGlowColor", {
    name: game.i18n.localize("pixie-border.settings.targetGlowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.targetGlowColor.hint"),
    scope: "client",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.targetGlowColor })
  });

  // Disposition
  game.settings.register(MODULE_ID, "dispositionHostileColor", {
    name: game.i18n.localize("pixie-border.settings.dispositionHostileColor.name"),
    hint: game.i18n.localize("pixie-border.settings.dispositionHostileColor.hint"),
    scope: "world",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.dispositionHostileColor })
  });

  game.settings.register(MODULE_ID, "dispositionFriendlyColor", {
    name: game.i18n.localize("pixie-border.settings.dispositionFriendlyColor.name"),
    hint: game.i18n.localize("pixie-border.settings.dispositionFriendlyColor.hint"),
    scope: "world",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.dispositionFriendlyColor })
  });

  game.settings.register(MODULE_ID, "dispositionNeutralColor", {
    name: game.i18n.localize("pixie-border.settings.dispositionNeutralColor.name"),
    hint: game.i18n.localize("pixie-border.settings.dispositionNeutralColor.hint"),
    scope: "world",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.dispositionNeutralColor })
  });

  game.settings.register(MODULE_ID, "dispositionSecretColor", {
    name: game.i18n.localize("pixie-border.settings.dispositionSecretColor.name"),
    hint: game.i18n.localize("pixie-border.settings.dispositionSecretColor.hint"),
    scope: "world",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.dispositionSecretColor })
  });

  // Condition (HP%)
  game.settings.register(MODULE_ID, "conditionHighColor", {
    name: game.i18n.localize("pixie-border.settings.conditionHighColor.name"),
    hint: game.i18n.localize("pixie-border.settings.conditionHighColor.hint"),
    scope: "world",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.conditionHighColor })
  });

  game.settings.register(MODULE_ID, "conditionMidColor", {
    name: game.i18n.localize("pixie-border.settings.conditionMidColor.name"),
    hint: game.i18n.localize("pixie-border.settings.conditionMidColor.hint"),
    scope: "world",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.conditionMidColor })
  });

  game.settings.register(MODULE_ID, "conditionLowColor", {
    name: game.i18n.localize("pixie-border.settings.conditionLowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.conditionLowColor.hint"),
    scope: "world",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: COLOR_DEFAULTS.conditionLowColor })
  });
});
