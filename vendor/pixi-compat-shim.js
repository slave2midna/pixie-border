// Provide PIXI.deprecation used by pixi-filters v6.x so it won’t crash under Foundry v13’s PIXI.
(function () {
  const P = globalThis.PIXI || (globalThis.PIXI = {});
  if (typeof P.deprecation !== "function") {
    const utils = P.utils || {};
    P.deprecation = function deprecation(version, message) {
      // If PIXI provides its own deprecation util, use it; otherwise fallback to console.warn.
      const fn = typeof utils.deprecation === "function" ? utils.deprecation : null;
      if (fn) fn(version, message);
      else if (console?.warn) console.warn(`[PIXI ${version}] ${message}`);
    };
  }
})();
