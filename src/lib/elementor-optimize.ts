/**
 * Strip editor-only cached blobs from Elementor data before publishing.
 *
 * Some Elementor add-ons cache large, redundant data into element settings that
 * is only used by the editor UI and is NOT needed to render the page. The worst
 * offender is Premium Addons' `premium_shapes_data`, which caches the ENTIRE
 * shape-divider library (~110KB, all ~51 shapes) into EVERY container — the same
 * blob repeated. A template with 6 containers carries ~670KB of it.
 *
 * This bloat makes every publish POST body huge, and some WordPress hosts have a
 * WAF request-body size limit (~600-700KB) that then returns "403 Forbidden hws"
 * on publish. Stripping these keys cuts a typical template from ~850KB to ~170KB,
 * keeping publish bodies safely under host limits.
 *
 * Safe to strip: the selected shape is stored in separate settings, and Premium
 * Addons re-derives `premium_shapes_data` in the editor on load. Front-end
 * rendering does not use it (verified: a stripped page publishes and renders).
 */

const BLOAT_SETTINGS_KEYS = ['premium_shapes_data'];

export function stripElementorBloat(elements: any): { removed: number; bytesSaved: number } {
  let removed = 0;
  let bytesSaved = 0;
  const walk = (el: any) => {
    if (el && el.settings && typeof el.settings === 'object') {
      for (const k of BLOAT_SETTINGS_KEYS) {
        if (el.settings[k] !== undefined) {
          try { bytesSaved += JSON.stringify(el.settings[k]).length; } catch { /* ignore */ }
          delete el.settings[k];
          removed++;
        }
      }
    }
    if (Array.isArray(el?.elements)) el.elements.forEach(walk);
  };
  if (Array.isArray(elements)) elements.forEach(walk);
  return { removed, bytesSaved };
}
