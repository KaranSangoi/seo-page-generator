/**
 * Builder Factory
 *
 * Auto-detects the page builder and returns the appropriate strategy.
 * This allows ONE workflow to work with ALL builders!
 */

import { PageBuilderStrategy, WordPressCredentials } from './universal-interface';
import { ElementorStrategy } from './strategies/elementor-strategy';
import { DiviStrategy } from './strategies/divi-strategy';
import { WPBakeryStrategy } from './strategies/wpbakery-strategy';
import { detectPageBuilder } from './detector';

/**
 * Get the appropriate strategy for a template page
 *
 * This auto-detects which builder is being used and returns the right strategy.
 * Your main workflow doesn't need to know which builder - just use the strategy!
 */
export async function getBuilderStrategy(
  templatePageId: string,
  credentials: WordPressCredentials
): Promise<PageBuilderStrategy> {

  const { wordpressUrl, wpUsername, wpAppPassword } = credentials;

  // Auto-detect which builder this template uses
  console.log('🔍 Auto-detecting page builder...');
  const detection = await detectPageBuilder(
    templatePageId,
    wordpressUrl,
    wpUsername,
    wpAppPassword
  );

  console.log(`✅ Detected: ${detection.builder} (${detection.confidence} confidence)`);

  // Return the appropriate strategy
  switch (detection.builder) {
    case 'elementor':
      return new ElementorStrategy();

    case 'divi':
      return new DiviStrategy();

    case 'wpbakery':
      return new WPBakeryStrategy();

    case 'gutenberg':
      throw new Error('Gutenberg support coming soon!');

    case 'beaver-builder':
      throw new Error('Beaver Builder support coming soon!');

    case 'oxygen':
      throw new Error('Oxygen support coming soon!');

    case 'html':
      throw new Error('Plain HTML pages are not supported. Please use a page builder.');

    default:
      throw new Error(`Unknown page builder: ${detection.builder}`);
  }
}

/**
 * Example usage in your generation workflow:
 *
 * // Instead of hardcoded Elementor logic:
 * const template = await fetchElementorTemplate(...)
 * const updated = replaceElementorContent(...)
 * await publishElementorPage(...)
 *
 * // Use universal workflow that works for ALL builders:
 * const strategy = await getBuilderStrategy('123', credentials);
 * const template = await strategy.fetchTemplate('123', credentials);
 * const updated = strategy.replaceContentByIds(template, contentMap);
 * const result = await strategy.publishPage(updated, metadata, credentials);
 *
 * // Works for Elementor, Divi, Gutenberg, etc. - same code!
 */
