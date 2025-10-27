/**
 * Universal Page Builder Interface
 *
 * This abstraction allows ONE workflow to work with ALL page builders.
 * Each builder implements these methods differently under the hood.
 */

export interface WordPressCredentials {
  wordpressUrl: string;
  wpUsername: string;
  wpAppPassword: string;
}

export interface TemplateData {
  id: number;
  rawData: any; // The full page object from WordPress
  builder: 'elementor' | 'divi' | 'wpbakery' | 'gutenberg' | 'beaver-builder';
}

export interface ContentMap {
  [cssId: string]: string; // e.g., { 'hero-h1': 'New heading', 'benefits-1': 'New text' }
}

/**
 * Universal Page Builder Strategy
 *
 * All builders implement this interface with their specific logic
 */
export interface PageBuilderStrategy {
  readonly name: string;
  readonly builder: 'elementor' | 'divi' | 'wpbakery' | 'gutenberg' | 'beaver-builder';

  /**
   * Fetch template page from WordPress
   * Same REST API call for all builders
   */
  fetchTemplate(
    templateId: string,
    credentials: WordPressCredentials
  ): Promise<TemplateData>;

  /**
   * Replace content by CSS IDs
   * Different implementation per builder (JSON vs shortcodes vs blocks)
   */
  replaceContentByIds(
    template: TemplateData,
    contentMap: ContentMap,
    options?: {
      location?: string;
      service?: string;
      companyName?: string;
      internalLinkUrl?: string;
    }
  ): TemplateData;

  /**
   * Publish updated page to WordPress
   * Same REST API call for all builders (just different payload structure)
   */
  publishPage(
    template: TemplateData,
    metadata: {
      title: string;
      slug: string;
      status: 'publish' | 'draft';
      metaTitle?: string;
      metaDescription?: string;
    },
    credentials: WordPressCredentials
  ): Promise<{ pageId: number; pageUrl: string }>;
}

/**
 * Universal Publishing Workflow
 *
 * This function works for ALL builders - just pass the right strategy!
 */
export async function publishWithBuilder(
  strategy: PageBuilderStrategy,
  templateId: string,
  contentMap: ContentMap,
  metadata: {
    title: string;
    slug: string;
    status: 'publish' | 'draft';
    metaTitle?: string;
    metaDescription?: string;
  },
  credentials: WordPressCredentials
): Promise<{ pageId: number; pageUrl: string }> {

  // 1. Fetch template (same for all builders)
  console.log(`[${strategy.name}] Fetching template ${templateId}...`);
  const template = await strategy.fetchTemplate(templateId, credentials);

  // 2. Replace content by IDs (builder-specific logic hidden here)
  console.log(`[${strategy.name}] Replacing content...`);
  const updatedTemplate = strategy.replaceContentByIds(template, contentMap);

  // 3. Publish (same REST API, different payload per builder)
  console.log(`[${strategy.name}] Publishing page...`);
  const result = await strategy.publishPage(updatedTemplate, metadata, credentials);

  console.log(`[${strategy.name}] ✅ Published: ${result.pageUrl}`);
  return result;
}

/**
 * Example Usage:
 *
 * // Works with Elementor
 * const elementorStrategy = new ElementorStrategy();
 * await publishWithBuilder(elementorStrategy, '123', contentMap, metadata, creds);
 *
 * // Works with Divi (exact same code!)
 * const diviStrategy = new DiviStrategy();
 * await publishWithBuilder(diviStrategy, '456', contentMap, metadata, creds);
 *
 * // Works with Gutenberg (exact same code!)
 * const gutenbergStrategy = new GutenbergStrategy();
 * await publishWithBuilder(gutenbergStrategy, '789', contentMap, metadata, creds);
 */
