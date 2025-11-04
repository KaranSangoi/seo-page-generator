/**
 * WPBakery Page Builder Implementation of Universal Page Builder Interface
 *
 * Handles WPBakery's shortcode-based structure stored in post_content
 */

import {
  PageBuilderStrategy,
  TemplateData,
  ContentMap,
  WordPressCredentials,
} from '../universal-interface';

export class WPBakeryStrategy implements PageBuilderStrategy {
  readonly name = 'WPBakery Page Builder Strategy';
  readonly builder = 'wpbakery' as const;

  /**
   * Fetch template - EXACT SAME as Elementor and Divi (REST API is universal)
   */
  async fetchTemplate(
    templateId: string,
    credentials: WordPressCredentials
  ): Promise<TemplateData> {
    const { wordpressUrl, wpUsername, wpAppPassword } = credentials;

    let cleanUrl = wordpressUrl.trim().replace(/\/wp-json\/?.*$/, '').replace(/\/$/, '');
    const url = `${cleanUrl}/wp-json/wp/v2/pages/${templateId}?context=edit`;

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

    // Validate WPBakery data exists
    if (!pageData.content?.rendered || !pageData.content.rendered.includes('[vc_')) {
      throw new Error('Template page does not have WPBakery shortcodes');
    }

    return {
      id: pageData.id,
      rawData: pageData,
      builder: 'wpbakery',
    };
  }

  /**
   * Replace content by IDs - WPBAKERY SPECIFIC (Shortcode parsing with Regex)
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
      // Pattern 1: Column text with ID
      // [vc_column_text id="hero"]Old content[/vc_column_text]
      const columnTextPattern = new RegExp(
        `(\\[vc_column_text[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/vc_column_text\\])`,
        'g'
      );

      if (columnTextPattern.test(content)) {
        console.log(`  ✅ Found WPBakery column_text with ID "${cssId}" - replacing content`);
        content = content.replace(columnTextPattern, `$1${newContent}$3`);
      }

      // Pattern 2: Custom heading with ID
      // [vc_custom_heading id="hero-h1"]Old heading[/vc_custom_heading]
      const headingPattern = new RegExp(
        `(\\[vc_custom_heading[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/vc_custom_heading\\])`,
        'g'
      );

      if (headingPattern.test(content)) {
        console.log(`  ✅ Found WPBakery custom_heading with ID "${cssId}" - replacing content`);
        content = content.replace(headingPattern, `$1${newContent}$3`);
      }

      // Pattern 3: Column text with el_id (alternative ID attribute)
      // [vc_column_text el_id="hero"]Old content[/vc_column_text]
      const elIdTextPattern = new RegExp(
        `(\\[vc_column_text[^\\]]*el_id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/vc_column_text\\])`,
        'g'
      );

      if (elIdTextPattern.test(content)) {
        console.log(`  ✅ Found WPBakery column_text with el_id "${cssId}" - replacing content`);
        content = content.replace(elIdTextPattern, `$1${newContent}$3`);
      }

      // Pattern 4: Custom heading with el_id
      // [vc_custom_heading el_id="hero-h1"]Old heading[/vc_custom_heading]
      const elIdHeadingPattern = new RegExp(
        `(\\[vc_custom_heading[^\\]]*el_id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/vc_custom_heading\\])`,
        'g'
      );

      if (elIdHeadingPattern.test(content)) {
        console.log(`  ✅ Found WPBakery custom_heading with el_id "${cssId}" - replacing content`);
        content = content.replace(elIdHeadingPattern, `$1${newContent}$3`);
      }

      // Pattern 5: Text block (another common WPBakery element)
      // [vc_text_block id="content"]Old content[/vc_text_block]
      const textBlockPattern = new RegExp(
        `(\\[vc_text_block[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/vc_text_block\\])`,
        'g'
      );

      if (textBlockPattern.test(content)) {
        console.log(`  ✅ Found WPBakery text_block with ID "${cssId}" - replacing content`);
        content = content.replace(textBlockPattern, `$1${newContent}$3`);
      }

      // Pattern 6: Toggle/Accordion (like Elementor FAQ and Divi toggle)
      // [vc_toggle id="faq-1" title="Question"]Answer[/vc_toggle]
      const togglePattern = new RegExp(
        `(\\[vc_toggle[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/vc_toggle\\])`,
        'g'
      );

      if (togglePattern.test(content)) {
        console.log(`  ✅ Found WPBakery toggle with ID "${cssId}" - replacing content`);
        content = content.replace(togglePattern, `$1${newContent}$3`);
      }

      // Pattern 7: Accordion section (alternative to toggle)
      // [vc_accordion_tab id="faq-1" title="Question"]Answer[/vc_accordion_tab]
      const accordionPattern = new RegExp(
        `(\\[vc_accordion_tab[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/vc_accordion_tab\\])`,
        'g'
      );

      if (accordionPattern.test(content)) {
        console.log(`  ✅ Found WPBakery accordion_tab with ID "${cssId}" - replacing content`);
        content = content.replace(accordionPattern, `$1${newContent}$3`);
      }

      // Pattern 8: Icon box (like Elementor icon-box or Divi blurb)
      // [vc_icon_box id="benefit-1"]Content[/vc_icon_box]
      const iconBoxPattern = new RegExp(
        `(\\[vc_icon_box[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/vc_icon_box\\])`,
        'g'
      );

      if (iconBoxPattern.test(content)) {
        console.log(`  ✅ Found WPBakery icon_box with ID "${cssId}" - replacing content`);
        content = content.replace(iconBoxPattern, `$1${newContent}$3`);
      }

      // Pattern 9: Message box (common element)
      // [vc_message id="callout"]Content[/vc_message]
      const messagePattern = new RegExp(
        `(\\[vc_message[^\\]]*id="${cssId}"[^\\]]*\\])([\\s\\S]*?)(\\[\\/vc_message\\])`,
        'g'
      );

      if (messagePattern.test(content)) {
        console.log(`  ✅ Found WPBakery message with ID "${cssId}" - replacing content`);
        content = content.replace(messagePattern, `$1${newContent}$3`);
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

    // Build payload with WPBakery-specific fields
    const payload = {
      title: metadata.title,
      slug: metadata.slug,
      status: metadata.status,
      content: template.rawData.content.rendered, // Updated shortcodes
      meta: {
        _wpb_vc_js_status: 'true', // Enable WPBakery editor
      },
    };

    // Add Yoast SEO meta if provided
    if (metadata.metaTitle || metadata.metaDescription) {
      payload.meta = {
        ...payload.meta,
        ...(metadata.metaTitle && { _yoast_wpseo_title: metadata.metaTitle }),
        ...(metadata.metaDescription && { _yoast_wpseo_metadesc: metadata.metaDescription }),
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to publish: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      pageId: result.id,
      pageUrl: result.link,
    };
  }
}
