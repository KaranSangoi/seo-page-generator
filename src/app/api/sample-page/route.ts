/**
 * Sample Page Generation API
 * Creates a single test page from template so users can preview the style
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

// Sample content for test page
const SAMPLE_CONTENT = {
  h1: 'Professional Service Provider in Your Location',
  heroDescription: 'This is a sample page generated from your Elementor template. Review the styling, layout, and design to ensure it meets your needs before generating pages at scale. This content is for demonstration purposes only and showcases how your actual pages will look with proper formatting and structure.',
  metaTitle: 'Professional Service Provider in Your Location | Company Name',
  metaDescription: 'Company Name offers professional service in your location. Quality work, expert team, and reliable results. Call now!',
  benefitsHeading: 'Experience Excellence with Company Name',
  benefitsSubheading: 'Quality. Precision. Reliable.',
  benefitsBullets: [
    '<b>Custom Solutions for Every Need:</b> This is the first benefit bullet point with sample content to demonstrate how your actual benefit points will be displayed on the page. It includes enough text to meet the minimum word count requirements and follows the proper format with bold heading.',
    '<b>Professional Service Quality:</b> This is the second benefit bullet point showing how multiple benefits will be formatted and styled according to your template design. Notice the spacing and typography that will be applied to all your pages with consistent formatting throughout.',
    '<b>Trusted Local Expertise:</b> This is the third benefit bullet point completing the benefits section. Your actual pages will have custom content generated for each specific service and location while maintaining this exact styling and layout with proper bold headings.',
  ],
  whyHeading: 'Why Professional Service Matters in Your Location',
  whySubheading: 'Protection. Appeal. Durability.',
  whyBullets: [
    '<b>Protects Your Investment:</b> This is the first reason why customers should choose your services. The sample text demonstrates the formatting and styling that will be applied to all your generated pages. Real content will be customized for each location and service type.',
    '<b>Enhances Property Value:</b> This is the second reason highlighting your competitive advantages. The template styling you see here will be consistently applied across all pages, ensuring a professional and cohesive look throughout your website with proper formatting.',
    '<b>Prevents Costly Repairs:</b> This is the third reason completing this section. Your actual pages will contain unique, SEO-optimized content while preserving the exact design and layout you see in this sample page with bold topic headings.',
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
  mapDescription: 'This is the map section description demonstrating how location-specific content appears on your pages. Your actual pages will include relevant local information, service coverage details, and geographic specifics tailored to each target area. This helps establish local relevance and improves your search visibility in specific markets.',
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

      // Hero description - match IDs containing 'hero' and 'description' (check FIRST - more specific)
      if (cssId.includes('hero') && cssId.includes('description')) {
        // Handle text-editor widgets
        if (element.settings.editor) {
          let content = generatedContent.heroDescription;
          if (internalLinkSection === 0 && parentPageUrl && service) {
            content = insertInternalLink(content, parentPageUrl, service);
          }
          element.settings.editor = content;
        }
        // Handle heading widgets
        else if (element.settings.title) {
          let content = generatedContent.heroDescription;
          if (internalLinkSection === 0 && parentPageUrl && service) {
            content = insertInternalLink(content, parentPageUrl, service);
          }
          element.settings.title = content;
        }
      }

      // H1 heading - match IDs containing 'h1' (check AFTER hero description)
      else if (cssId.includes('h1')) {
        if (element.settings.title) {
          element.settings.title = generatedContent.h1;
        } else if (element.settings.editor) {
          element.settings.editor = generatedContent.h1;
        }
      }

      else if (cssId.includes('benefits')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          // Check if it's the main heading or subheading
          if (cssId.includes('subheading')) {
            element.settings.title = generatedContent.benefitsSubheading;
          } else {
            element.settings.title = generatedContent.benefitsHeading;
          }
        }
        // Handle text-editor for subheading
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
        // Handle icon-list widget (single ID for all bullets)
        if (element.widgetType === 'icon-list' && cssId.includes('bullets')) {
          if (element.settings.icon_list && Array.isArray(element.settings.icon_list)) {
            element.settings.icon_list.forEach((item: any, index: number) => {
              if (generatedContent.benefitsBullets[index]) {
                let content = generatedContent.benefitsBullets[index];
                // Add external link if this matches the external link section
                const sectionKey = `benefits-${index + 1}`;
                if (finalExternalLinkSection === sectionKey && location && cityWebsiteUrl) {
                  content = insertExternalLink(content, location, cityWebsiteUrl);
                }
                item.text = content;
              }
            });
          }
        }
      } else if (cssId.includes('why')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          // Check if it's the main heading or subheading
          if (cssId.includes('subheading')) {
            element.settings.title = generatedContent.whySubheading;
          } else {
            element.settings.title = generatedContent.whyHeading;
          }
        }
        // Handle text-editor for subheading
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
        // Handle icon-list widget (single ID for all bullets)
        if (element.widgetType === 'icon-list' && cssId.includes('bullets')) {
          if (element.settings.icon_list && Array.isArray(element.settings.icon_list)) {
            element.settings.icon_list.forEach((item: any, index: number) => {
              if (generatedContent.whyBullets[index]) {
                let content = generatedContent.whyBullets[index];
                // Add external link if this matches the external link section
                const sectionKey = `why-${index + 1}`;
                if (finalExternalLinkSection === sectionKey && location && cityWebsiteUrl) {
                  content = insertExternalLink(content, location, cityWebsiteUrl);
                }
                item.text = content;
              }
            });
          }
        }
      } else if (cssId.includes('faq')) {
        // Handle FAQ section - check by ID first, then adapt to structure

        // If this is the main FAQ container (ID contains 'questions')
        if (cssId.includes('questions')) {
          console.log('[DEBUG] Found FAQ container:', {
            cssId: cssId,
            widgetType: element.widgetType,
            hasSettings: !!element.settings,
            settingsKeys: element.settings ? Object.keys(element.settings) : [],
            hasTabs: !!element.settings.tabs,
            hasItems: !!element.settings.items,
            hasElements: !!element.elements,
            hasEkitAccordionItems: !!element.settings.ekit_accordion_items,
          });

          // Log ElementsKit accordion items structure if present
          if (element.settings.ekit_accordion_items) {
            console.log('[DEBUG] ElementsKit accordion items:', JSON.stringify(element.settings.ekit_accordion_items, null, 2));
          }

          // Check if it uses ElementsKit accordion structure
          if (element.settings.ekit_accordion_items && Array.isArray(element.settings.ekit_accordion_items)) {
            console.log('[DEBUG] FAQ uses ElementsKit accordion structure, updating items...');
            element.settings.ekit_accordion_items.forEach((item: any, index: number) => {
              if (generatedContent.faqs[index]) {
                item.acc_title = generatedContent.faqs[index].question;
                let content = generatedContent.faqs[index].answer;
                if (internalLinkSection === 1 && index === 0 && parentPageUrl && service) {
                  content = insertInternalLink(content, parentPageUrl, service);
                }
                // ElementsKit stores content with <p> tags
                item.acc_content = `<p>${content}</p>`;
                console.log(`[DEBUG] Updated ElementsKit FAQ ${index + 1}: ${generatedContent.faqs[index].question.substring(0, 60)}...`);
              }
            });
          }
          // Check if it uses tabs structure (classic accordion/toggle)
          else if (element.settings.tabs && Array.isArray(element.settings.tabs)) {
            console.log('[DEBUG] FAQ uses tabs structure (classic accordion), updating tabs...');
            element.settings.tabs.forEach((tab: any, index: number) => {
              if (generatedContent.faqs[index]) {
                tab.tab_title = generatedContent.faqs[index].question;
                let content = generatedContent.faqs[index].answer;
                if (internalLinkSection === 1 && index === 0 && parentPageUrl && service) {
                  content = insertInternalLink(content, parentPageUrl, service);
                }
                tab.tab_content = content;
                console.log(`[DEBUG] Updated FAQ ${index} in tabs`);
              }
            });
          }
          // Check if it uses items structure (nested-accordion might use this)
          else if (element.settings.items && Array.isArray(element.settings.items)) {
            console.log('[DEBUG] FAQ uses items structure, updating items...');
            element.settings.items.forEach((item: any, index: number) => {
              if (generatedContent.faqs[index]) {
                console.log(`[DEBUG] Item ${index} keys:`, Object.keys(item));
                // Try different possible field names
                if (item.item_title !== undefined) item.item_title = generatedContent.faqs[index].question;
                if (item.item_content !== undefined) item.item_content = generatedContent.faqs[index].answer;
                if (item.title !== undefined) item.title = generatedContent.faqs[index].question;
                if (item.content !== undefined) item.content = generatedContent.faqs[index].answer;
                console.log(`[DEBUG] Updated FAQ ${index} in items`);
              }
            });
          }
          // Nested accordion stores FAQs in child elements, not settings
          else if (element.elements && Array.isArray(element.elements)) {
            console.log('[DEBUG] FAQ uses nested elements structure - this is likely nested-accordion');
            console.log('[DEBUG] FAQ container has', element.elements.length, 'child elements');
            console.log('[DEBUG] Processing nested accordion child elements for questions and answers...');

            // Look for accordion item elements - each child is an accordion item/details element
            let faqIndex = 0;
            element.elements.forEach((childElement: any, childIdx: number) => {
              if (!childElement || !childElement.settings) return;

              console.log(`[DEBUG] Processing child element ${childIdx + 1}/${element.elements.length}`);

              // Each child element (details/accordion-item) represents one FAQ
              // Questions and answers are in nested child elements
              if (childElement.elements && Array.isArray(childElement.elements) && generatedContent.faqs[faqIndex]) {
                let foundQuestion = false;
                let foundAnswer = false;

                // Search for both question heading and answer content
                childElement.elements.forEach((nestedChild: any) => {
                  if (!nestedChild || !nestedChild.settings) return;

                  // Found the question heading
                  if (nestedChild.widgetType === 'heading' && nestedChild.settings.title) {
                    nestedChild.settings.title = generatedContent.faqs[faqIndex].question;
                    console.log(`[DEBUG] Updated nested FAQ ${faqIndex + 1} question: ${generatedContent.faqs[faqIndex].question.substring(0, 60)}...`);
                    foundQuestion = true;
                  }

                  // Found the answer content (text-editor or other content widget)
                  if (nestedChild.widgetType === 'text-editor' && nestedChild.settings.editor) {
                    let content = generatedContent.faqs[faqIndex].answer;
                    if (internalLinkSection === 1 && faqIndex === 0 && parentPageUrl && service) {
                      content = insertInternalLink(content, parentPageUrl, service);
                    }
                    nestedChild.settings.editor = content;
                    console.log(`[DEBUG] Updated nested FAQ ${faqIndex + 1} answer`);
                    foundAnswer = true;
                  }
                });

                // Only increment if we processed this FAQ
                if (foundQuestion || foundAnswer) {
                  faqIndex++;
                }
              }
            });
            console.log(`[DEBUG] Processed ${faqIndex} nested FAQ items (questions and answers)`);
          } else {
            console.log('[DEBUG] FAQ container found but unknown structure');
            console.log('[DEBUG] Full settings keys:', element.settings ? Object.keys(element.settings) : 'none');
          }
        }
        // Handle individual FAQ items (separate IDs for each question/answer)
        else {
          const faqIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
          if (generatedContent.faqs[faqIndex]) {
            if (element.widgetType === 'heading' && cssId.includes('question')) {
              element.settings.title = generatedContent.faqs[faqIndex].question;
              console.log(`[DEBUG] Updated individual FAQ ${faqIndex} question`);
            }
            if (element.widgetType === 'text-editor' && cssId.includes('answer')) {
              let content = generatedContent.faqs[faqIndex].answer;
              if (internalLinkSection === 1 && faqIndex === 0 && parentPageUrl && service) {
                content = insertInternalLink(content, parentPageUrl, service);
              }
              element.settings.editor = content;
              console.log(`[DEBUG] Updated individual FAQ ${faqIndex} answer`);
            }
          }
        }
      }
      // Map description - match IDs containing 'map' and 'description'
      else if (cssId.includes('map') && cssId.includes('description')) {
        console.log('[DEBUG] Found map description element:', {
          cssId: cssId,
          widgetType: element.widgetType,
          elType: element.elType,
          hasEditor: !!element.settings.editor,
          hasTitle: !!element.settings.title,
          settingsKeys: Object.keys(element.settings),
        });

        if (element.widgetType === 'text-editor') {
          let content = generatedContent.mapDescription || '';
          if (internalLinkSection === 2 && parentPageUrl && service) {
            content = insertInternalLink(content, parentPageUrl, service);
          }
          element.settings.editor = content;
          console.log('[DEBUG] Updated map description in text-editor widget (created editor field)');
        } else if (element.widgetType === 'heading') {
          let content = generatedContent.mapDescription || '';
          if (internalLinkSection === 2 && parentPageUrl && service) {
            content = insertInternalLink(content, parentPageUrl, service);
          }
          element.settings.title = content;
          console.log('[DEBUG] Updated map description in heading widget (created title field)');
        } else {
          console.log('[DEBUG] Map description element found but widget type not handled:', element.widgetType);
        }
      }

      // Replace Google Maps iframe - match IDs containing 'map' and 'iframe'
      if (cssId.includes('map') && cssId.includes('iframe')) {
        console.log('[DEBUG] Found map iframe element:', {
          cssId,
          widgetType: element.widgetType,
          hasHtml: !!element.settings.html,
          hasLocation: !!location,
        });

        if (location) {
          const encodedLocation = encodeURIComponent(location);

          // Create keyword-stuffed iframe closing tag for SEO
          const keywords = [
            service ? `${service} in ${location}` : location,
            service ? `${service} near me` : '',
            service || ''
          ].filter(Boolean).join(',');

          const mapUrl = `https://www.google.com/maps?q=${encodedLocation}&output=embed`;

          // If html exists, replace the src; otherwise create new iframe
          if (element.settings.html) {
            element.settings.html = element.settings.html.replace(
              /(<iframe[^>]*src=")([^"]*)("[^>]*>)([^<]*)<\/iframe>/gi,
              (match: string, prefix: string, oldSrc: string, middle: string, oldContent: string) => {
                console.log('[DEBUG] Replaced map iframe src with location:', location);
                return `${prefix}${mapUrl}${middle}${keywords}</iframe>`;
              }
            );
          } else {
            // Create new iframe if html field doesn't exist
            element.settings.html = `<iframe src="${mapUrl}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy">${keywords}</iframe>`;
            console.log('[DEBUG] Created new map iframe with location:', location);
          }
        } else {
          console.log('[DEBUG] Map iframe element but no location provided');
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

    // Log Yoast fields from template page to understand what's working
    console.log('[TEMPLATE YOAST FIELDS]', {
      hasYoastTitle: !!templatePage.meta?._yoast_wpseo_title,
      hasYoastDesc: !!templatePage.meta?._yoast_wpseo_metadesc,
      hasYoastFocus: !!templatePage.meta?._yoast_wpseo_focuskw,
      yoastTitle: templatePage.meta?._yoast_wpseo_title,
      yoastDesc: templatePage.meta?._yoast_wpseo_metadesc,
      yoastFocus: templatePage.meta?._yoast_wpseo_focuskw,
      allYoastFields: Object.keys(templatePage.meta || {}).filter(k => k.includes('yoast')),
    });

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

    // Log element structure to help debug FAQ issue
    console.log('[TEMPLATE ANALYSIS] Analyzing template structure...');
    const analyzedElements = {
      faqElements: [] as string[],
      allCssIds: [] as string[],
    };

    const analyzeElement = (element: any): void => {
      if (element?.settings) {
        const cssId = element.settings._element_id || element.settings.css_id || '';
        if (cssId) {
          analyzedElements.allCssIds.push(`${cssId} (${element.widgetType || element.elType})`);
          if (cssId.includes('faq')) {
            analyzedElements.faqElements.push(`${cssId} - type: ${element.widgetType || element.elType}`);
          }
        }
      }
      if (element?.elements && Array.isArray(element.elements)) {
        element.elements.forEach(analyzeElement);
      }
    };

    parsedElementorData.forEach(analyzeElement);
    console.log('[TEMPLATE ANALYSIS] FAQ elements found:', analyzedElements.faqElements.length > 0 ? analyzedElements.faqElements : 'NONE');
    console.log('[TEMPLATE ANALYSIS] Total elements with CSS IDs:', analyzedElements.allCssIds.length);
    if (analyzedElements.faqElements.length === 0) {
      console.warn('[WARNING] No FAQ elements found in template! Check template CSS IDs.');
    }

    const updatedElementorData = replaceElementorContent(
      parsedElementorData,
      SAMPLE_CONTENT,
      'Phoenix, AZ',
      undefined, // no parent page for sample
      undefined, // no service for sample
      1 // use rotation 1 for sample (will add internal link to FAQ)
    );

    // Inject meta description directly into page (fallback if Yoast doesn't output it)
    const metaDescriptionScript = `<script>
(function() {
  if (!document.querySelector('meta[name="description"]')) {
    var meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = '${SAMPLE_CONTENT.metaDescription.replace(/'/g, "\\'")}';
    document.head.appendChild(meta);
  }
})();
</script>`;

    // Add invisible HTML widget at the beginning of the first section for meta tag injection
    if (updatedElementorData && updatedElementorData.length > 0 && updatedElementorData[0].elements) {
      const firstSection = updatedElementorData[0];
      if (firstSection.elements.length > 0 && firstSection.elements[0].elements) {
        // Add HTML widget at the beginning of first column
        firstSection.elements[0].elements.unshift({
          id: 'meta-injection-' + Date.now(),
          elType: 'widget',
          settings: {
            html: metaDescriptionScript,
            _margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0' },
            _padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0' },
          },
          elements: [],
          widgetType: 'html',
        });
      }
    }

    // Generate unique slug
    const timestamp = Date.now();
    const slug = `sample-page-${timestamp}`;

    // Extract keyword only (before "|") to avoid duplicate company names
    // WordPress/SEO plugins have title templates that append site name automatically
    const sampleKeywordOnly = SAMPLE_CONTENT.metaTitle.split('|')[0].trim();

    // Build page payload
    const pagePayload: any = {
      title: sampleKeywordOnly, // Use keyword only, let WordPress/theme append site name
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
    // NOTE: Use keyword only to avoid duplicate company names
    const seoPlugin = client.seoPlugin?.toLowerCase();
    console.log('[SEO PLUGIN] Client SEO plugin setting:', client.seoPlugin, '(normalized:', seoPlugin, ')');
    if (seoPlugin === 'yoast') {
      console.log('[SEO PLUGIN] Using Yoast SEO fields');
      // Yoast SEO fields
      pagePayload.meta._yoast_wpseo_title = String(sampleKeywordOnly);
      pagePayload.meta._yoast_wpseo_metadesc = String(SAMPLE_CONTENT.metaDescription);
      pagePayload.meta._yoast_wpseo_focuskw = String(sampleKeywordOnly);
      console.log('[SEO PAYLOAD] Yoast fields being sent:', {
        title: pagePayload.meta._yoast_wpseo_title,
        metadesc: pagePayload.meta._yoast_wpseo_metadesc,
        focuskw: pagePayload.meta._yoast_wpseo_focuskw,
      });
    } else if (seoPlugin === 'rank-math' || seoPlugin === 'rankmath') {
      console.log('[SEO PLUGIN] Using Rank Math SEO fields');
      // Rank Math SEO fields
      pagePayload.meta.rank_math_title = String(sampleKeywordOnly);
      pagePayload.meta.rank_math_description = String(SAMPLE_CONTENT.metaDescription);
      pagePayload.meta.rank_math_focus_keyword = String(sampleKeywordOnly);
    } else {
      console.log('[SEO PLUGIN] No matching SEO plugin - value is:', client.seoPlugin);
    }

    // Create the sample page
    console.log('[REST API] Creating WordPress page...');
    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pagePayload),
    });

    console.log('[REST API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[REST API ERROR] WordPress returned error:', errorText);
      return NextResponse.json(
        { error: `WordPress API error: ${errorText}` },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('[REST API] WordPress page created successfully:', {
      pageId: result.id,
      pageUrl: result.link,
      hasElementorData: !!result.meta?._elementor_data,
    });
    const pageId = result.id;
    const pageUrl = result.link || result.guid?.rendered || 'Unknown URL';

    // WORKAROUND: Update the page again immediately to force Yoast/Rank Math to refresh
    // This helps Elementor's SEO UI display the fields correctly
    try {
      const updatePayload: any = {
        meta: {},
      };

      if (seoPlugin === 'yoast') {
        updatePayload.meta._yoast_wpseo_title = String(sampleKeywordOnly);
        updatePayload.meta._yoast_wpseo_metadesc = String(SAMPLE_CONTENT.metaDescription);
        updatePayload.meta._yoast_wpseo_focuskw = String(sampleKeywordOnly);
      } else if (seoPlugin === 'rank-math' || seoPlugin === 'rankmath') {
        updatePayload.meta.rank_math_title = String(sampleKeywordOnly);
        updatePayload.meta.rank_math_description = String(SAMPLE_CONTENT.metaDescription);
        updatePayload.meta.rank_math_focus_keyword = String(sampleKeywordOnly);
      }

      // Only update if we have SEO fields to set
      if (Object.keys(updatePayload.meta).length > 0) {
        console.log('[SEO UPDATE] Sending second update to refresh SEO fields:', updatePayload.meta);
        const updateResponse = await fetch(`${wpApiUrl}/${pageId}`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });
        console.log('[SEO UPDATE] Response status:', updateResponse.status, updateResponse.statusText);
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('[SEO UPDATE ERROR]:', errorText);
        }
      } else {
        console.log('[SEO UPDATE] Skipped - no SEO plugin configured or no fields to update');
      }
    } catch (updateError) {
      // Don't fail the whole operation if the update fails
      console.error('[SEO UPDATE] Failed to update SEO fields:', updateError);
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
