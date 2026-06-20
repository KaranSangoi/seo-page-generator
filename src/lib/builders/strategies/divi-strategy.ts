/**
 * Divi Builder Implementation of Universal Page Builder Interface
 *
 * Handles Divi's shortcode-based structure stored in post_content
 */

import {
  PageBuilderStrategy,
  TemplateData,
  ContentMap,
  WordPressCredentials,
} from '../universal-interface';

export class DiviStrategy implements PageBuilderStrategy {
  readonly name = 'Divi Builder Strategy';
  readonly builder = 'divi' as const;

  /**
   * Fetch template - EXACT SAME as Elementor (REST API is universal)
   */
  async fetchTemplate(
    templateId: string,
    credentials: WordPressCredentials
  ): Promise<TemplateData> {
    const { wordpressUrl, wpUsername, wpAppPassword } = credentials;

    let cleanUrl = wordpressUrl.trim().replace(/\/wp-json\/?.*$/, '').replace(/\/$/, '');
    // _cb cache-buster: avoid stale cached template from WP edge/page cache.
    const url = `${cleanUrl}/wp-json/wp/v2/pages/${templateId}?context=edit&_cb=${Date.now()}`;

    const auth = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    const pageData = await response.json();

    // Validate Divi data exists
    if (!pageData.content?.rendered || !pageData.content.rendered.includes('[et_pb_')) {
      throw new Error('Template page does not have Divi shortcodes');
    }

    return {
      id: pageData.id,
      rawData: pageData,
      builder: 'divi',
    };
  }

  /**
   * Replace content by IDs - DIVI SPECIFIC (Shortcode parsing with Regex)
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
  ): TemplateData {
    let content = template.rawData.content.rendered;

    // For each ID in the contentMap, find and replace in shortcodes
    Object.entries(contentMap).forEach(([cssId, newContent]) => {
      // Pattern 1: Text module with ID
      // [et_pb_text id="hero"]Old content[/et_pb_text]
      const textPattern = new RegExp(
        `(\\[et_pb_text[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/et_pb_text\\])`,
        'g'
      );

      if (textPattern.test(content)) {
        console.log(`  ✅ Found Divi text module with ID "${cssId}" - replacing content`);
        content = content.replace(textPattern, `$1${newContent}$3`);
      }

      // Pattern 2: Heading with custom ID
      // [et_pb_text id="hero-h1"]Old heading[/et_pb_text]
      const headingPattern = new RegExp(
        `(\\[et_pb_text[^\\]]*css_id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/et_pb_text\\])`,
        'g'
      );

      if (headingPattern.test(content)) {
        console.log(`  ✅ Found Divi element with css_id "${cssId}" - replacing content`);
        content = content.replace(headingPattern, `$1${newContent}$3`);
      }

      // Pattern 3: Blurb module (like Elementor icon-list)
      // [et_pb_blurb id="benefit-1"]Content[/et_pb_blurb]
      const blurbPattern = new RegExp(
        `(\\[et_pb_blurb[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/et_pb_blurb\\])`,
        'g'
      );

      if (blurbPattern.test(content)) {
        console.log(`  ✅ Found Divi blurb with ID "${cssId}" - replacing content`);
        content = content.replace(blurbPattern, `$1${newContent}$3`);
      }

      // Pattern 4: Accordion/Toggle (like Elementor FAQ)
      // [et_pb_toggle id="faq-1" title="Question"]Answer[/et_pb_toggle]
      const togglePattern = new RegExp(
        `(\\[et_pb_toggle[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/et_pb_toggle\\])`,
        'g'
      );

      if (togglePattern.test(content)) {
        console.log(`  ✅ Found Divi toggle with ID "${cssId}" - replacing content`);
        content = content.replace(togglePattern, `$1${newContent}$3`);
      }
    });

    // Update template with modified content
    template.rawData.content.rendered = content;

    return template;
  }

  /**
   * Publish page - SAME REST API, just different payload structure
   */
  async publishPage(
    template: TemplateData,
    metadata: {
      title: string;
      slug: string;
      status: 'publish' | 'draft';
      metaTitle?: string;
      metaDescription?: string;
    },
    credentials: WordPressCredentials
  ): Promise<{ pageId: number; pageUrl: string }> {
    const { wordpressUrl, wpUsername, wpAppPassword } = credentials;

    let cleanUrl = wordpressUrl.trim().replace(/\/wp-json\/?.*$/, '').replace(/\/$/, '');
    const url = `${cleanUrl}/wp-json/wp/v2/pages`;

    const auth = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');

    // Build payload with Divi-specific fields
    const payload = {
      title: metadata.title,
      slug: metadata.slug,
      status: metadata.status,
      content: template.rawData.content.rendered, // Updated shortcodes
      meta: {
        _et_pb_use_builder: 'on', // Enable Divi builder
        _et_pb_old_content: '', // Clear old content
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to publish: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      pageId: result.id,
      pageUrl: result.link,
    };
  }
}
