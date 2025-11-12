const MODULE_ID = "pixie-border";

/** Inline template for the color application (rendered via data: URL) */
const COLOR_APP_TEMPLATE = `
<form class="pixie-border-colors" autocomplete="off">
  <div class="form-group">
    <label>{{localize "pixie-border.settings.outlineColor.name"}}</label>
    <input type="color" name="outlineColor" value="{{outlineColor}}" />
    <p class="notes">{{localize "pixie-border.settings.outlineColor.hint"}}</p>
  </div>

  <div class="form-group">
    <label>{{localize "pixie-border.settings.targetOutlineColor.name"}}</label>
    <input type="color" name="targetOutlineColor" value="{{targetOutlineColor}}" />
    <p class="notes">{{localize "pixie-border.settings.targetOutlineColor.hint"}}</p>
  </div>

  <div class="form-group">
    <label>{{localize "pixie-border.settings.glowColor.name"}}</label>
    <input type="color" name="glowColor" value="{{glowColor}}" />
    <p class="notes">{{localize "pixie-border.settings.glowColor.hint"}}</p>
  </div>

  <div class="form-group">
    <label>{{localize "pixie-border.settings.targetGlowColor.name"}}</label>
    <input type="color" name="targetGlowColor" value="{{targetGlowColor}}" />
    <p class="notes">{{localize "pixie-border.settings.targetGlowColor.hint"}}</p>
  </div>

  <footer class="sheet-footer flexrow" style="gap:.5rem;">
    <button type="submit" class="flex1">
      <i class="fas fa-check"></i> {{localize "pixie-border.common.save"}}
    </button>
    <button type="button" data-action="reset" class="flex1">
      <i class="fas fa-undo"></i> {{localize "pixie-border.common.reset"}}
    </button>
    <button type="button" data-action="cancel">
      <i class="fas fa-times"></i> {{localize "pixie-border.common.cancel"}}
    </button>
  </footer>
</form>
`;

/** Create a data: URL for the inline template (so FormApplication can fetch it) */
const COLOR_APP_TEMPLATE_URL =
  `data:text/html;charset=utf-8,${encodeURIComponent(COLOR_APP_TEMPLATE)}`;

/** Defaults for reset */
const COLOR_DEFAULTS = {
  outlineColor: "#88ccff",
  targetOutlineColor: "#88ccff",
  glowColor: "#88ccff",
  targetGlowColor: "#88ccff"
};

/** Utility to normalize a setting to a hex string (handles Foundry Color objects) */
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
      template: COLOR_APP_TEMPLATE_URL,
      classes: ["pixie-border", "sheet"],
      width: 420,
      height: "auto",
      submitOnChange: false,
      closeOnSubmit: true
    });
  }

  /** Provide current values to the template */
  async getData(options) {
    return {
      outlineColor: asHexString(game.settings.get(MODULE_ID, "outlineColor")),
      targetOutlineColor: asHexString(game.settings.get(MODULE_ID, "targetOutlineColor")),
      glowColor: asHexString(game.settings.get(MODULE_ID, "glowColor")),
      targetGlowColor: asHexString(game.settings.get(MODULE_ID, "targetGlowColor"))
    };
  }

  /** Wire up Reset and Cancel buttons */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="reset"]').on("click", async () => {
      // Set inputs back to defaults visually
      for (const [k, v] of Object.entries(COLOR_DEFAULTS)) {
        html.find(`input[name="${k}"]`).val(v);
      }
      // Persist defaults
      await Promise.all(Object.entries(COLOR_DEFAULTS).map(([k, v]) =>
        game.settings.set(MODULE_ID, k, v)
      ));
      ui.notifications?.info(game.i18n.localize("pixie-border.settings.colorMenu.reset"));
      this._refreshTokens();
      // Keep the window open after reset so user can continue tweaking
    });

    html.find('[data-action="cancel"]').on("click", () => this.close());
  }

  /** Save on submit */
  async _updateObject(_event, formData) {
    // formData is a flat object with color strings
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

  // --- Color mode & colors ------------------------------------------------------

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

  // Submenu that opens the Application (v13-safe)
  game.settings.registerMenu(MODULE_ID, "customizeColors", {
    name: game.i18n.localize("pixie-border.settings.colorMenu.name"),
    label: game.i18n.localize("pixie-border.settings.colorMenu.label"),
    hint: game.i18n.localize("pixie-border.settings.colorMenu.hint"),
    icon: "fas fa-palette",
    restricted: false,
    type: PixieBorderColorConfig   // <<< this is the key change
  });

  // Hidden color fields (managed by the app)
  game.settings.register(MODULE_ID, "outlineColor", {
    name: game.i18n.localize("pixie-border.settings.outlineColor.name"),
    hint: game.i18n.localize("pixie-border.settings.outlineColor.hint"),
    scope: "client",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  game.settings.register(MODULE_ID, "targetOutlineColor", {
    name: game.i18n.localize("pixie-border.settings.targetOutlineColor.name"),
    hint: game.i18n.localize("pixie-border.settings.targetOutlineColor.hint"),
    scope: "client",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  game.settings.register(MODULE_ID, "glowColor", {
    name: game.i18n.localize("pixie-border.settings.glowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.glowColor.hint"),
    scope: "client",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });

  game.settings.register(MODULE_ID, "targetGlowColor", {
    name: game.i18n.localize("pixie-border.settings.targetGlowColor.name"),
    hint: game.i18n.localize("pixie-border.settings.targetGlowColor.hint"),
    scope: "client",
    config: false,
    type: new foundry.data.fields.ColorField({ initial: "#88ccff" })
  });
});
