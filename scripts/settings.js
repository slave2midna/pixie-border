const MODULE_ID = "pixie-border";

/** Opens a lightweight dialog with all color pickers and saves to settings */
async function openColorCustomizer() {
  const get = (k) => game.settings.get(MODULE_ID, k) ?? "#88ccff";
  const defaults = {
    outlineColor: "#88ccff",
    targetOutlineColor: "#88ccff",
    glowColor: "#88ccff",
    targetGlowColor: "#88ccff"
  };

  const content = `
    <form class="pixie-border-colors" style="display:grid; gap:8px;">
      <div class="form-group">
        <label>${game.i18n.localize("pixie-border.settings.outlineColor.name")}</label>
        <input type="color" name="outlineColor" value="${foundry.utils.Color.fromString(get("outlineColor")).toString(16, "#")}" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("pixie-border.settings.targetOutlineColor.name")}</label>
        <input type="color" name="targetOutlineColor" value="${foundry.utils.Color.fromString(get("targetOutlineColor")).toString(16, "#")}" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("pixie-border.settings.glowColor.name")}</label>
        <input type="color" name="glowColor" value="${foundry.utils.Color.fromString(get("glowColor")).toString(16, "#")}" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("pixie-border.settings.targetGlowColor.name")}</label>
        <input type="color" name="targetGlowColor" value="${foundry.utils.Color.fromString(get("targetGlowColor")).toString(16, "#")}" />
      </div>
    </form>
  `;

  // Create dialog with Save + Reset buttons
  new Dialog({
    title: game.i18n.localize("pixie-border.settings.colorMenu.name"),
    content,
    buttons: {
      save: {
        label: game.i18n.localize("pixie-border.common.save"),
        icon: '<i class="fas fa-check"></i>',
        callback: async (html) => {
          const form = html[0].querySelector("form");
          const data = Object.fromEntries(new FormData(form).entries());
          await Promise.all(Object.entries(data).map(([k, v]) => game.settings.set(MODULE_ID, k, String(v))));
          ui.notifications?.info(game.i18n.localize("pixie-border.settings.colorMenu.saved"));
          for (const t of canvas.tokens?.placeables ?? []) {
            Hooks.callAll("updateSetting", { key: `${MODULE_ID}.outlineColor` });
          }
        }
      },
      reset: {
        label: game.i18n.localize("pixie-border.common.reset"),
        icon: '<i class="fas fa-undo"></i>',
        callback: async () => {
          await Promise.all(Object.entries(defaults).map(([k, v]) => game.settings.set(MODULE_ID, k, v)));
          ui.notifications?.info(game.i18n.localize("pixie-border.settings.colorMenu.reset"));
          for (const t of canvas.tokens?.placeables ?? []) {
            Hooks.callAll("updateSetting", { key: `${MODULE_ID}.outlineColor` });
          }
        }
      },
      cancel: {
        label: game.i18n.localize("pixie-border.common.cancel"),
        icon: '<i class="fas fa-times"></i>'
      }
    },
    default: "save",
    close: () => {}
  }).render(true);
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

  // --- Color submenu ------------------------------------------------------------

  game.settings.registerMenu(MODULE_ID, "customizeColors", {
    name: game.i18n.localize("pixie-border.settings.colorMenu.name"),
    label: game.i18n.localize("pixie-border.settings.colorMenu.label"),
    hint: game.i18n.localize("pixie-border.settings.colorMenu.hint"),
    icon: "fas fa-palette",
    restricted: false,
    onClick: () => openColorCustomizer()
  });

  // Hidden color fields (managed by submenu)
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
