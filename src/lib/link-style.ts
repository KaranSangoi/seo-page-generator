/**
 * Link styling helpers for generated internal/external links.
 *
 * Users can set an optional link color (client default, optionally overridden
 * per batch). The color is injected into inline `style` attributes of the <a>
 * tags we generate, so it MUST be sanitized to a strict hex format — an
 * unvalidated value would allow breaking out of the style attribute (XSS).
 */

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Returns a valid hex color string (e.g. "#1a73e8") or null if the input is
 * missing or not a strict 3/6-digit hex color. Used at BOTH storage time and
 * injection time (defense in depth).
 */
export function sanitizeLinkColor(color?: string | null): string | null {
  if (!color || typeof color !== 'string') return null;
  const c = color.trim();
  return HEX_COLOR.test(c) ? c : null;
}

/**
 * Resolve the effective link color for a page: per-batch override wins over the
 * client default; either may be absent. Returns a sanitized hex color or null.
 */
export function resolveLinkColor(
  batchColor?: string | null,
  clientColor?: string | null
): string | null {
  return sanitizeLinkColor(batchColor) ?? sanitizeLinkColor(clientColor);
}

/**
 * Inline style value for links that already carry underline + inline display.
 * Appends `color: <hex>;` only when a valid color is provided, so output is
 * byte-identical to the previous hardcoded string when no color is set.
 */
export function linkStyleValue(color?: string | null): string {
  const c = sanitizeLinkColor(color);
  return `text-decoration: underline; display: inline;${c ? ` color: ${c};` : ''}`;
}

/**
 * A ` style="color: <hex>"` attribute fragment (leading space included) or an
 * empty string. For markup that otherwise has no inline style (e.g. the classic
 * editor), so we only add an attribute when a color is actually set.
 */
export function linkColorAttr(color?: string | null): string {
  const c = sanitizeLinkColor(color);
  return c ? ` style="color: ${c};"` : '';
}
