/**
 * Sample Page Generation API
 * Creates a single test page from template so users can preview the style
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Sample content for test page
const SAMPLE_CONTENT = {
  h1: 'Sample Page - Test Your Template Style',
  heroDescription: 'This is a sample page generated from your Elementor template. Review the styling, layout, and design to ensure it meets your needs before generating pages at scale. This content is for demonstration purposes only and showcases how your actual pages will look.',
  metaTitle: 'Sample Page - Template Preview',
  metaDescription: 'Preview your Elementor template styling with this sample page. Test the design and layout before generating pages at scale.',
  benefitsHeading: 'Sample Benefits Section',
  benefitsSubheading: 'This section demonstrates how your benefits content will appear on generated pages',
  benefitsBullets: [
    'This is the first benefit bullet point with sample content to demonstrate how your actual benefit points will be displayed on the page. It includes enough text to meet the minimum word count requirements.',
    'This is the second benefit bullet point showing how multiple benefits will be formatted and styled according to your template design. Notice the spacing and typography that will be applied to all your pages.',
    'This is the third benefit bullet point completing the benefits section. Your actual pages will have custom content generated for each specific service and location while maintaining this exact styling and layout.',
  ],
  whyHeading: 'Why Choose Us - Sample Section',
  whySubheading: 'This section shows how your "why choose us" content will be presented',
  whyBullets: [
    'This is the first reason why customers should choose your services. The sample text demonstrates the formatting and styling that will be applied to all your generated pages. Real content will be customized for each location.',
    'This is the second reason highlighting your competitive advantages. The template styling you see here will be consistently applied across all pages, ensuring a professional and cohesive look throughout your website.',
    'This is the third reason completing this section. Your actual pages will contain unique, SEO-optimized content while preserving the exact design and layout you see in this sample page.',
  ],
  faqs: [
    {
      question: 'What is this sample page for?',
      answer: 'This sample page allows you to preview how your Elementor template will look with generated content. Check the styling, fonts, colors, and layout to ensure everything appears as expected before generating pages at scale.',
    },
    {
      question: 'Will my actual pages look exactly like this?',
      answer: 'Yes! Your generated pages will use this exact template design and styling. Only the content will be different - customized for each specific service and location you specify in your CSV file.',
    },
    {
      question: 'Can I modify the template after seeing this sample?',
      answer: 'Absolutely! If you notice any styling issues or want to make changes, simply update your Elementor template page in WordPress, then generate a new sample page to preview the changes.',
    },
  ],
  mapDescription: 'This is the map section description that demonstrates how location-specific content will appear. Your actual pages will include relevant local information and details specific to each geographic area you are targeting with your SEO strategy.',
};

// Helper to generate slug
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to get parent page ID
async function getParentPageId(wordpressUrl: string, parentSlug: string, credentials: string): Promise<number | null> {
  if (!parentSlug) return null;

  try {
    const searchUrl = `${wordpressUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(parentSlug)}`;
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok) return null;
    const pages = await response.json();
    return pages.length > 0 ? pages[0].id : null;
  } catch (error) {
    console.error('Error fetching parent page:', error);
    return null;
  }
}

// Helper to insert internal link
function insertInternalLink(text: string, parentPageUrl: string, service: string): string {
  if (!text || !parentPageUrl || !service) return text;

  const linkText = `<a href="${parentPageUrl}">${service}</a>`;
  const servicePattern = new RegExp(`\\b${service}\\b`, 'i');

  if (servicePattern.test(text)) {
    return text.replace(servicePattern, linkText);
  }

  return text + ` Learn more about our <a href="${parentPageUrl}">${service}</a> services.`;
}

// Helper to insert external link
function insertExternalLink(text: string, location: string, cityWebsiteUrl: string): string {
  if (!text || !location || !cityWebsiteUrl) return text;

  const linkHtml = `<a href="${cityWebsiteUrl}" target="_blank" style="text-decoration: underline; display: inline;">${location}</a>`;
  const locationPattern = new RegExp(`\\b${location}\\b`, 'i');

  if (locationPattern.test(text)) {
    return text.replace(locationPattern, linkHtml);
  }

  return text;
}

// Helper to generate city website URL
function generateCityWebsiteUrl(location: string): string {
  if (!location) return '';

  const cityName = location.split(',')[0].trim();
  const citySlug = cityName.toLowerCase().replace(/\s+/g, '');

  return `https://www.${citySlug}.gov`;
}

// Helper to replace Elementor content
function replaceElementorContent(
  elementorData: any,
  generatedContent: any,
  location?: string,
  parentPageUrl?: string,
  service?: string,
  rowNumber?: number,
  externalLinkSection?: string
): any {
  if (!elementorData || !Array.isArray(elementorData)) return elementorData;

  const clonedData = JSON.parse(JSON.stringify(elementorData));

  const internalLinkSection = rowNumber ? rowNumber % 5 : 0;

  // Determine external link section - use provided value or default rotation
  let finalExternalLinkSection = externalLinkSection;
  if (!finalExternalLinkSection && rowNumber !== undefined) {
    const externalRotation = ['benefits-1', 'benefits-2', 'benefits-3', 'why-1', 'why-2', 'why-3'];
    finalExternalLinkSection = externalRotation[rowNumber % 6];
  }

  // Generate city website URL for external link
  const cityWebsiteUrl = location ? generateCityWebsiteUrl(location) : '';

  function replaceInElement(element: any): void {
    if (!element || typeof element !== 'object') return;

    if (element.settings) {
      const cssId = element.settings._element_id || element.settings.css_id || '';

      if (cssId.includes('hero') || cssId.includes('h1')) {
        if (element.widgetType === 'heading' || element.elType === 'widget') {
          if (element.settings.title) {
            element.settings.title = generatedContent.h1;
          }
        }
        if (element.widgetType === 'text-editor') {
          if (element.settings.editor) {
            let content = generatedContent.heroDescription;
            if (internalLinkSection === 0 && parentPageUrl && service) {
              content = insertInternalLink(content, parentPageUrl, service);
            }
            element.settings.editor = content;
          }
        }
      } else if (cssId.includes('benefits')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          element.settings.title = generatedContent.benefitsHeading;
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.benefitsSubheading;
          } else if (cssId.includes('bullet')) {
            const bulletIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
            if (generatedContent.benefitsBullets[bulletIndex]) {
              let content = generatedContent.benefitsBullets[bulletIndex];
              // Add external link if this matches the external link section
              if (finalExternalLinkSection && cssId.includes(finalExternalLinkSection) && location && cityWebsiteUrl) {
                content = insertExternalLink(content, location, cityWebsiteUrl);
              }
              element.settings.editor = content;
            }
          }
        }
      } else if (cssId.includes('why')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          element.settings.title = generatedContent.whyHeading;
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.whySubheading;
          } else if (cssId.includes('bullet')) {
            const bulletIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
            if (generatedContent.whyBullets[bulletIndex]) {
              let content = generatedContent.whyBullets[bulletIndex];
              // Add external link if this matches the external link section
              if (finalExternalLinkSection && cssId.includes(finalExternalLinkSection) && location && cityWebsiteUrl) {
                content = insertExternalLink(content, location, cityWebsiteUrl);
              }
              element.settings.editor = content;
            }
          }
        }
      } else if (cssId.includes('faq')) {
        const faqIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
        if (generatedContent.faqs[faqIndex]) {
          if (element.widgetType === 'heading' && cssId.includes('question')) {
            element.settings.title = generatedContent.faqs[faqIndex].question;
          }
          if (element.widgetType === 'text-editor' && cssId.includes('answer')) {
            let content = generatedContent.faqs[faqIndex].answer;
            if (internalLinkSection === 1 && faqIndex === 0 && parentPageUrl && service) {
              content = insertInternalLink(content, parentPageUrl, service);
            }
            element.settings.editor = content;
          }
        }
      } else if (cssId.includes('map')) {
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          let content = generatedContent.mapDescription || '';
          if (internalLinkSection === 2 && parentPageUrl && service) {
            content = insertInternalLink(content, parentPageUrl, service);
          }
          element.settings.editor = content;
        }
      }

      // Replace Google Maps iframe in custom HTML widget
      if (cssId.includes('map-iframe') && element.widgetType === 'html' && location) {
        if (element.settings.html) {
          const encodedLocation = encodeURIComponent(location);
          const iframeRegex = /(<iframe[^>]*src=")([^"]*)(")/gi;
          element.settings.html = element.settings.html.replace(iframeRegex, (match: string, prefix: string, oldSrc: string, suffix: string) => {
            const simpleMapUrl = `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
            return prefix + simpleMapUrl + suffix;
          });
        }
      }
    }

    if (element.elements && Array.isArray(element.elements)) {
      element.elements.forEach(replaceInElement);
    }
  }

  clonedData.forEach(replaceInElement);
  return clonedData;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Fetch client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!client.templatePageId) {
      return NextResponse.json({ error: 'No template page configured for this client' }, { status: 400 });
    }

    // WordPress credentials
    const wpApiUrl = `${client.wordpressUrl}/wp-json/wp/v2/pages`;
    const credentials = Buffer.from(`${client.wpUsername}:${client.wpAppPassword}`).toString('base64');

    // Fetch template page with edit context to get meta fields
    const templateUrl = `${client.wordpressUrl}/wp-json/wp/v2/pages/${client.templatePageId}?context=edit`;
    const templateResponse = await fetch(templateUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!templateResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch template page: ${templateResponse.statusText}` },
        { status: 500 }
      );
    }

    const templatePage = await templateResponse.json();

    // Get Elementor data
    const elementorData = templatePage.meta?._elementor_data;
    if (!elementorData) {
      return NextResponse.json(
        { error: 'No Elementor data found in template page' },
        { status: 400 }
      );
    }

    // Parse and replace content
    const parsedElementorData = typeof elementorData === 'string' ? JSON.parse(elementorData) : elementorData;
    const updatedElementorData = replaceElementorContent(
      parsedElementorData,
      SAMPLE_CONTENT,
      'Phoenix, AZ',
      undefined, // no parent page for sample
      undefined, // no service for sample
      1 // use rotation 1 for sample (will add internal link to FAQ)
    );

    // Generate unique slug
    const timestamp = Date.now();
    const slug = `sample-page-${timestamp}`;

    // Build page payload
    const pagePayload: any = {
      title: SAMPLE_CONTENT.h1,
      slug: slug,
      status: 'publish',
      content: templatePage.content?.rendered || '',
      excerpt: SAMPLE_CONTENT.metaDescription, // Set excerpt to meta description for WordPress SEO
      featured_media: templatePage.featured_media || 0,
      comment_status: 'closed',
      ping_status: 'closed',
      template: templatePage.template || '',
      meta: {
        ...templatePage.meta,
        _elementor_data: JSON.stringify(updatedElementorData),
        _elementor_edit_mode: 'builder',
        _elementor_template_type: 'wp-page',
        _elementor_version: templatePage.meta?._elementor_version || '3.25.0',
        _wp_page_template: templatePage.meta?._wp_page_template || 'elementor_canvas',
      },
    };

    // Add SEO plugin fields - ONLY meta title and meta description
    if (client.seoPlugin === 'yoast') {
      // Yoast SEO fields
      pagePayload.meta._yoast_wpseo_title = String(SAMPLE_CONTENT.metaTitle);
      pagePayload.meta._yoast_wpseo_metadesc = String(SAMPLE_CONTENT.metaDescription);
    } else if (client.seoPlugin === 'rank-math' || client.seoPlugin === 'rankmath') {
      // Rank Math SEO fields
      pagePayload.meta.rank_math_title = String(SAMPLE_CONTENT.metaTitle);
      pagePayload.meta.rank_math_description = String(SAMPLE_CONTENT.metaDescription);
    }

    // Create the sample page
    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pagePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `WordPress API error: ${errorText}` },
        { status: 500 }
      );
    }

    const result = await response.json();
    const pageId = result.id;
    const pageUrl = result.link || result.guid?.rendered || 'Unknown URL';

    // WORKAROUND: Update the page again immediately to force Yoast/Rank Math to refresh
    // This helps Elementor's SEO UI display the fields correctly
    try {
      const updatePayload: any = {
        meta: {},
      };

      if (client.seoPlugin === 'yoast') {
        updatePayload.meta._yoast_wpseo_title = String(SAMPLE_CONTENT.metaTitle);
        updatePayload.meta._yoast_wpseo_metadesc = String(SAMPLE_CONTENT.metaDescription);
      } else if (client.seoPlugin === 'rank-math' || client.seoPlugin === 'rankmath') {
        updatePayload.meta.rank_math_title = String(SAMPLE_CONTENT.metaTitle);
        updatePayload.meta.rank_math_description = String(SAMPLE_CONTENT.metaDescription);
      }

      // Only update if we have SEO fields to set
      if (Object.keys(updatePayload.meta).length > 0) {
        await fetch(`${wpApiUrl}/${pageId}`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });
      }
    } catch (updateError) {
      // Don't fail the whole operation if the update fails
      console.warn('Failed to update SEO fields:', updateError);
    }

    return NextResponse.json({
      success: true,
      pageUrl,
      pageId,
      message: 'Sample page created successfully',
    });

  } catch (error) {
    console.error('Sample page generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate sample page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
