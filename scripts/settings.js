const MODULE_ID = "pixie-border";
const TEMPLATE_PATH = `modules/pixie-border/templates/colorConfig.hbs`;

// Key groups
const CORE_KEYS = [
  "outlineColor",
  "targetOutlineColor",
  "glowColor",
  "targetGlowColor"
];
const DISP_KEYS = [
  "dispositionHostileColor",
  "dispositionFriendlyColor",
  "dispositionNeutralColor",
  "dispositionSecretColor"
];
const COND_KEYS = [
  "conditionHighColor",
  "conditionMidColor",
  "conditionLowColor"
];
const ALL_COLOR_KEYS = [...CORE_KEYS, ...DISP_KEYS, ...COND_KEYS];

// Color defaults
const COLOR_DEFAULTS = {
  outlineColor: "#88ccff",
  targetOutlineColor: "#88ccff",
  glowColor: "#88ccff",
  targetGlowColor: "#88ccff",
  dispositionHostileColor: "#ff3a3a",
  dispositionFriendlyColor: "#2ecc71",
  dispositionNeutralColor: "#f1c40f",
  dispositionSecretColor: "#9b59b6",
  conditionHighColor: "#2ecc71",
  conditionMidColor: "#f1c40f",
  conditionLowColor: "#e74c3c"
};

// Normalize color objects to hex string
function asHexString(v, fallback = "#88ccff") {
  try {
    // If already a Foundry Color, just stringify
    if (v instanceof foundry.utils.Color) {
      return v.toString(16, "#");
    }

    // Otherwise parse whatever we got
    return foundry.utils.Color.fromString(v ?? fallback).toString(16, "#");
  } catch {
    // If it's already a plausible hex string, trust it; else fallback
    if (typeof v === "string" && /^#?[0-9a-f]{3,8}$/i.test(v)) {
      return v.startsWith("#") ? v : `#${v}`;
    }
    return fallback;
  }
}

// Color configuration form application
class PixieBorderColorConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pixie-border-color-config",
      title: game.i18n.localize("pixie-border.settings.colorMenu.name"),
      template: TEMPLATE_PATH,
      classes: ["pixie-border", "sheet"],
      width: 500,
      height: "600",
      submitOnChange: false,
      closeOnSubmit: true
    });
  }

  // Provide client values to the template
  async getData() {
    const g = (k) => asHexString(game.settings.get(MODULE_ID, k), COLOR_DEFAULTS[k]);
    return {
      // Core (client)
      outlineColor: g("outlineColor"),
      targetOutlineColor: g("targetOutlineColor"),
      glowColor: g("glowColor"),
      targetGlowColor: g("targetGlowColor"),

      // Disposition (client)
      dispositionHostileColor: g("dispositionHostileColor"),
      dispositionFriendlyColor: g("dispositionFriendlyColor"),
      dispositionNeutralColor: g("dispositionNeutralColor"),
      dispositionSecretColor: g("dispositionSecretColor"),

      // Condition (client)
      conditionHighColor: g("conditionHighColor"),
      conditionMidColor: g("conditionMidColor"),
      conditionLowColor: g("conditionLowColor")
    };
  }

  /** Wire up Reset and Cancel + live sync between color/hex inputs */
  activateListeners(html) {
    super.activateListeners(html);

    // Reset to defaults
    html.find('[data-action="reset"]').on("click", async () => {
      for (const k of ALL_COLOR_KEYS) {
        const v = COLOR_DEFAULTS[k];
        html.find(`input[name="${k}"]`).val(v);
        html.find(`input.color-hex[data-mirror="${k}"]`).val(v);
      }
      await Promise.all(
        ALL_COLOR_KEYS.map(k => game.settings.set(MODULE_ID, k, COLOR_DEFAULTS[k]))
      );
      ui.notifications?.info(game.i18n.localize("pixie-border.settings.colorMenu.reset"));
    });

    html.find('[data-action="cancel"]').on("click", () => this.close());

    const normalizeHex = (v) => {
      try {
        if (v instanceof foundry.utils.Color) {
          return v.toString(16, "#");
        }
        return foundry.utils.Color.fromString(v).toString(16, "#");
      } catch {
        return null;
      }
    };

    // Color → Hex
    html.find('input[type="color"]').on("input change", (ev) => {
      const name = ev.currentTarget.name;
      html.find(`input.color-hex[data-mirror="${name}"]`).val(ev.currentTarget.value);
    });

    // Hex → Color
    html.find('input.color-hex').on("change", (ev) => {
      const target = ev.currentTarget;
      const name = target.dataset.mirror;
      const normalized = normalizeHex(target.value);
      if (normalized) {
        target.value = normalized;
        html.find(`input[name="${name}"]`).val(normalized);
      } else {
        target.value = html.find(`input[name="${name}"]`).val();
        ui.notifications?.warn(
          game.i18n.localize("pixie-border.settings.colorMenu.invalidHex") ??
          "Please enter a valid color (e.g., #88ccff)."
        );
      }
    });
  }

  // Save on submit
  async _updateObject(_event, formData) {
    await Promise.all(
      Object.entries(formData).map(([k, v]) =>
        game.settings.set(MODULE_ID, k, String(v))
      )
    );
    ui.notifications?.info(game.i18n.localize("pixie-border.settings.colorMenu.saved"));
  }
}

Hooks.once("init", () => {
  loadTemplates?.([TEMPLATE_PATH]);

  // --- Color mode ---------------------------------------------------
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

  game.settings.registerMenu(MODULE_ID, "customizeColors", {
    name: game.i18n.localize("pixie-border.settings.colorMenu.name"),
    label: game.i18n.localize("pixie-border.settings.colorMenu.label"),
    hint: game.i18n.localize("pixie-border.settings.colorMenu.hint"),
    icon: "fas fa-palette",
    restricted: false,
    type: PixieBorderColorConfig
  });

  // --- Visibility & toggles --------------------------------------------

  game.settings.register(MODULE_ID, "foundryBorder", {
    name: game.i18n.localize("pixie-border.settings.foundryBorder.name"),
    hint: game.i18n.localize("pixie-border.settings.foundryBorder.hint"),
    scope: "client",
    config: true,
    type: String,
    default: "disabled",
    choices: {
      disabled: game.i18n.localize("pixie-border.settings.foundryBorder.choices.disabled"),
      enabled: game.i18n.localize("pixie-border.settings.foundryBorder.choices.enabled"),
      hover: game.i18n.localize("pixie-border.settings.foundryBorder.choices.hover")
    }
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

  // Combat border toggle
  game.settings.register(MODULE_ID, "enableCombatBorder", {
    name: game.i18n.localize("pixie-border.settings.enableCombatBorder.name"),
    hint: game.i18n.localize("pixie-border.settings.enableCombatBorder.hint"),
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

  // Combat border speed (1–3)
  game.settings.register(MODULE_ID, "combatBorderSpeed", {
    name: game.i18n.localize("pixie-border.settings.combatBorderSpeed.name"),
    hint: game.i18n.localize("pixie-border.settings.combatBorderSpeed.hint"),
    scope: "client",
    config: true,
    type: Number,
    default: 2,
    range: { min: 1, max: 3, step: 1 }
  });

  // --- Numeric controls ----------------------------------------------
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

  // --- Color fields ----------------------------------------
  const colorField = foundry.data.fields.ColorField;

  for (const k of CORE_KEYS) {
    game.settings.register(MODULE_ID, k, {
      name: game.i18n.localize(`pixie-border.settings.${k}.name`),
      hint: game.i18n.localize(`pixie-border.settings.${k}.hint`),
      scope: "client",
      config: false,
      type: new colorField({ initial: COLOR_DEFAULTS[k] })
    });
  }

  for (const k of DISP_KEYS) {
    game.settings.register(MODULE_ID, k, {
      name: game.i18n.localize(`pixie-border.settings.${k}.name`),
      hint: game.i18n.localize(`pixie-border.settings.${k}.hint`),
      scope: "client",
      config: false,
      type: new colorField({ initial: COLOR_DEFAULTS[k] })
    });
  }

  for (const k of COND_KEYS) {
    game.settings.register(MODULE_ID, k, {
      name: game.i18n.localize(`pixie-border.settings.${k}.name`),
      hint: game.i18n.localize(`pixie-border.settings.${k}.hint`),
      scope: "client",
      config: false,
      type: new colorField({ initial: COLOR_DEFAULTS[k] })
    });
  }
});
