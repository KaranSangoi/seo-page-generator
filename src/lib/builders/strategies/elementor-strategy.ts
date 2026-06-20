/**
 * Elementor Implementation of Universal Page Builder Interface
 *
 * Handles Elementor's JSON-based structure stored in meta._elementor_data
 */

import {
  PageBuilderStrategy,
  TemplateData,
  ContentMap,
  WordPressCredentials,
} from '../universal-interface';

export class ElementorStrategy implements PageBuilderStrategy {
  readonly name = 'Elementor Strategy';
  readonly builder = 'elementor' as const;

  /**
   * Fetch template - same REST API for all builders
   */
  async fetchTemplate(
    templateId: string,
    credentials: WordPressCredentials
  ): Promise<TemplateData> {
    const { wordpressUrl, wpUsername, wpAppPassword } = credentials;

    // Clean URL
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

    // Validate Elementor data exists
    if (!pageData.meta?._elementor_data) {
      throw new Error('Template page does not have Elementor data');
    }

    return {
      id: pageData.id,
      rawData: pageData,
      builder: 'elementor',
    };
  }

  /**
   * Replace content by IDs - ELEMENTOR SPECIFIC (JSON parsing)
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
    const elementorData = template.rawData.meta._elementor_data;

    // Parse JSON string to object
    let elements = typeof elementorData === 'string'
      ? JSON.parse(elementorData)
      : elementorData;

    // Clone to avoid mutations
    elements = JSON.parse(JSON.stringify(elements));

    // Recursively find and replace elements by CSS ID
    const replaceInElements = (els: any[]): any[] => {
      return els.map((el) => {
        // Check if this element has a CSS ID we're looking for
        const cssId = el.settings?._element_id;

        if (cssId && contentMap[cssId]) {
          console.log(`  ✅ Found element with ID "${cssId}" - replacing content`);

          // Replace content based on widget type
          if (el.widgetType === 'heading' || el.widgetType === 'text-editor') {
            el.settings.editor = contentMap[cssId];
          } else if (el.widgetType === 'icon-list') {
            // Handle bullet lists
            // Implementation from existing elementor-replacer.ts
          }
        }

        // Recursively process child elements
        if (el.elements && Array.isArray(el.elements)) {
          el.elements = replaceInElements(el.elements);
        }

        return el;
      });
    };

    // Process all elements
    const updatedElements = replaceInElements(elements);

    // Update template with modified data
    template.rawData.meta._elementor_data = JSON.stringify(updatedElements);

    return template;
  }

  /**
   * Publish page - same REST API for all builders
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

    // Build payload with Elementor-specific meta fields
    const payload = {
      title: metadata.title,
      slug: metadata.slug,
      status: metadata.status,
      meta: {
        ...template.rawData.meta, // Copy all existing meta
        _elementor_data: template.rawData.meta._elementor_data, // Updated content
        _elementor_edit_mode: 'builder',
        _elementor_template_type: 'wp-page',
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
