/**
 * Simple In-Memory Job Queue
 * No Redis required - uses sequential generation with parallel validation/publishing
 */

import { generatePageContent, validateContent, validateAndFixContent, regenerateField, generateAdjectives, clearBatchContext } from './claude-api';
import { prisma } from './prisma';
import { generateStructuredData } from './schema-generator';

interface PageJob {
  batchId: string;
  clientId: string;
  userId: string;
  pageData: {
    pageType: string;
    service: string;
    location: string;
    parentSlug: string;
    externalLinkSection: string;
    omitSections: string[];
    rowNumber: number;
    customSlug?: string; // User-edited slug from preview modal
    customPrimaryKeyword?: string; // User-edited primary keyword from preview modal
  };
  clientData: {
    clientName: string;
    clientWebsite: string;
    wordpressUrl: string;
    wpUsername: string;
    wpAppPassword: string;
    seoPlugin: string;
    templatePageId: string;
    // Business metadata for schema.org (optional)
    businessPhone?: string;
    businessAddress?: string;
    businessType?: string;
    gbpUrl?: string;
  };
  adjective: string;
}

// In-memory storage for active batches
const activeBatches = new Map<string, { status: string; totalPages: number }>();

// Track pending validation/publishing promises for each batch
const pendingPublishPromises = new Map<string, Promise<void>[]>();

// Track FAQs used in each batch to ensure uniqueness across pages
const batchFAQs = new Map<string, string[]>();

// Rate limiting: Track last API call
let lastApiCall = 0;
const MIN_INTERVAL_MS = 20000; // 20 seconds between generations (3 per minute)

/**
 * Get page name based on page type
 */
function getPageName(pageType: string, service: string, location: string): string {
  const isBroadStroke = pageType === 'Broad Stroke' || pageType === 'Nested Broad Stroke';

  if (isBroadStroke) {
    // For Broad Stroke pages, use location (optionally with service)
    return service ? `${service} in ${location}` : location;
  }

  // For Service pages (Primary Service, Location Service), use service (optionally with location)
  return location ? `${service} in ${location}` : service;
}

/**
 * Get WordPress parent page ID by slug
 */
async function getParentPageId(wordpressUrl: string, parentSlug: string, credentials: string): Promise<number | null> {
  if (!parentSlug) return null;

  try {
    const searchUrl = `${wordpressUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(parentSlug)}`;
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch parent page: ${response.statusText}`);
      return null;
    }

    const pages = await response.json();
    return pages.length > 0 ? pages[0].id : null;
  } catch (error) {
    console.error('Error fetching parent page:', error);
    return null;
  }
}

/**
 * Generate slug based on page type
 */
function generateSlug(pageType: string, service: string, location: string): string {
  const isBroadStroke = pageType === 'Broad Stroke' || pageType === 'Nested Broad Stroke';

  // Broad Stroke/Nested Broad Stroke: use location as slug
  // Primary Service/Location Service: use service as slug
  const slugSource = isBroadStroke ? location : service;

  return slugSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Fetch Elementor template data from template page
 */
async function fetchElementorTemplate(wordpressUrl: string, templatePageId: string, credentials: string): Promise<any | null> {
  if (!templatePageId) return null;

  try {
    const templateUrl = `${wordpressUrl}/wp-json/wp/v2/pages/${templatePageId}?context=edit`;
    const response = await fetch(templateUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch template page: ${response.statusText}`);
      return null;
    }

    const templatePage = await response.json();

    // Elementor data is stored in meta._elementor_data
    const elementorData = templatePage.meta?._elementor_data;
    if (!elementorData) {
      console.error('No Elementor data found in template page');
      return null;
    }

    // Parse Elementor data (it's usually a JSON string)
    return typeof elementorData === 'string' ? JSON.parse(elementorData) : elementorData;
  } catch (error) {
    console.error('Error fetching Elementor template:', error);
    return null;
  }
}

/**
 * Fetch and parse sitemap from website
 */
async function fetchSitemap(websiteUrl: string): Promise<string[]> {
  try {
    const sitemapUrl = `${websiteUrl}/sitemap.xml`;
    const response = await fetch(sitemapUrl);

    if (!response.ok) {
      console.warn(`Failed to fetch sitemap from ${sitemapUrl}`);
      return [];
    }

    const xmlText = await response.text();

    // Parse XML to extract URLs (simple regex-based parsing)
    const urlMatches = Array.from(xmlText.matchAll(/<loc>(.*?)<\/loc>/g));
    const urls: string[] = [];

    for (const match of urlMatches) {
      urls.push(match[1]);
    }

    return urls;
  } catch (error) {
    console.error('Error fetching sitemap:', error);
    return [];
  }
}

/**
 * Find contextually relevant page from sitemap based on service
 */
function findRelevantPage(sitemap: string[], service: string, location: string): string | null {
  if (!sitemap.length || !service) return null;

  const serviceKeywords = service.toLowerCase().split(/\s+/);

  // Score each URL based on relevance
  const scoredUrls = sitemap.map(url => {
    let score = 0;
    const urlLower = url.toLowerCase();

    // Higher score for URLs containing service keywords
    serviceKeywords.forEach(keyword => {
      if (urlLower.includes(keyword)) {
        score += 10;
      }
    });

    // Avoid linking to the same page or homepage
    if (urlLower.endsWith('/') || urlLower === sitemap[0]) {
      score -= 100;
    }

    return { url, score };
  });

  // Get highest scoring URL
  scoredUrls.sort((a, b) => b.score - a.score);

  return scoredUrls[0]?.score > 0 ? scoredUrls[0].url : null;
}

/**
 * Insert internal link to company name
 * Links to homepage or contextual page based on rotation
 */
function insertInternalLink(text: string, linkUrl: string, companyName: string): string {
  if (!text || !linkUrl || !companyName) return text;

  // Create internal link with proper styling as per SOP
  const linkHtml = `<a href="${linkUrl}" style="text-decoration: underline; display: inline;">${companyName}</a>`;

  // Try to find and replace the company name with a link
  const companyPattern = new RegExp(`\\b${companyName}\\b`, 'i');
  if (companyPattern.test(text)) {
    return text.replace(companyPattern, linkHtml);
  }

  // If company name not found, prepend a natural sentence with the link
  return `Trust ${linkHtml} to deliver reliable services. ${text}`;
}

/**
 * Insert external link to city website
 * Links to official city website, naturally embedded in location name
 */
function insertExternalLink(text: string, location: string, cityWebsiteUrl: string): string {
  if (!text || !location || !cityWebsiteUrl) return text;

  // Create external link with proper styling as per SOP
  const linkHtml = `<a href="${cityWebsiteUrl}" target="_blank" style="text-decoration: underline; display: inline;">${location}</a>`;

  // Try to find and replace the location with a link
  const locationPattern = new RegExp(`\\b${location}\\b`, 'i');
  if (locationPattern.test(text)) {
    return text.replace(locationPattern, linkHtml);
  }

  return text;
}

/**
 * Generate city website URL from location
 * Uses Wikipedia as a reliable fallback since city .gov URLs vary widely
 */
function generateCityWebsiteUrl(location: string): string {
  if (!location) return '';

  // Extract city name and state (e.g., "Carlsbad, CA" -> "Carlsbad" and "CA")
  const parts = location.split(',').map(p => p.trim());
  const cityName = parts[0];
  const state = parts[1] || '';

  // Format for Wikipedia URL: spaces become underscores
  const citySlug = cityName.replace(/\s+/g, '_');
  const stateSlug = state.replace(/\s+/g, '_');

  // Use Wikipedia URL as reliable fallback
  // Format: https://en.wikipedia.org/wiki/City_Name,_State
  if (state) {
    return `https://en.wikipedia.org/wiki/${citySlug},_${stateSlug}`;
  } else {
    return `https://en.wikipedia.org/wiki/${citySlug}`;
  }
}

/**
 * Replace content in Elementor template structure
 * Maps generated content to template sections using CSS IDs
 */
function replaceElementorContent(
  elementorData: any,
  generatedContent: any,
  location?: string,
  internalLinkUrl?: string,
  companyName?: string,
  service?: string,
  internalLinkPlacement?: string,
  externalLinkPlacement?: string
): any {
  if (!elementorData || !Array.isArray(elementorData)) return elementorData;

  // Deep clone to avoid modifying original
  const clonedData = JSON.parse(JSON.stringify(elementorData));

  // Use pre-calculated link placements
  // Internal: 'hero', 'faq-1', 'faq-2', 'faq-3', 'map'
  // External: 'benefits-1', 'benefits-2', 'benefits-3', 'why-1', 'why-2', 'why-3'

  // Generate city website URL for external link
  const cityWebsiteUrl = location ? generateCityWebsiteUrl(location) : '';

  // Recursive function to find and replace content in widgets
  function replaceInElement(element: any): void {
    if (!element || typeof element !== 'object') return;

    // Check for settings with id attributes that match our sections
    if (element.settings) {
      const cssId = element.settings._element_id || element.settings.css_id || '';

      // Replace based on section ID
      if (cssId.includes('hero') || cssId.includes('h1')) {
        // Replace H1 and hero description
        if (element.widgetType === 'heading' || element.elType === 'widget') {
          if (element.settings.title) {
            element.settings.title = generatedContent.h1;
          }
        }
        if (element.widgetType === 'text-editor') {
          if (element.settings.editor) {
            let content = generatedContent.heroDescription;
            // Add internal link if this section is designated for internal link
            if (internalLinkPlacement === 'hero' && internalLinkUrl && companyName) {
              content = insertInternalLink(content, internalLinkUrl, companyName);
            }
            element.settings.editor = content;
          }
        }
      } else if (cssId.includes('benefits')) {
        // Replace benefits content
        if (element.widgetType === 'heading' && element.settings.title) {
          // Check if it's the main heading or subheading
          if (cssId.includes('subheading')) {
            element.settings.title = generatedContent.benefitsSubheading;
          } else {
            element.settings.title = generatedContent.benefitsHeading;
          }
        }
        // Handle text-editor for subheading and individual bullets
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.benefitsSubheading;
          } else if (cssId.includes('bullet')) {
            // Replace bullet points
            const bulletIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
            if (generatedContent.benefitsBullets[bulletIndex]) {
              let content = generatedContent.benefitsBullets[bulletIndex];
              // Add external link if this matches the external link placement
              const sectionKey = `benefits-${bulletIndex + 1}`;
              if (externalLinkPlacement === sectionKey && location && cityWebsiteUrl) {
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
                // Add external link if this matches the external link placement
                const sectionKey = `benefits-${index + 1}`;
                if (externalLinkPlacement === sectionKey && location && cityWebsiteUrl) {
                  content = insertExternalLink(content, location, cityWebsiteUrl);
                }
                item.text = content;
              }
            });
          }
        }
      } else if (cssId.includes('why')) {
        // Replace why content
        if (element.widgetType === 'heading' && element.settings.title) {
          // Check if it's the main heading or subheading
          if (cssId.includes('subheading')) {
            element.settings.title = generatedContent.whySubheading;
          } else {
            element.settings.title = generatedContent.whyHeading;
          }
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.whySubheading;
          } else if (cssId.includes('bullet')) {
            const bulletIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
            if (generatedContent.whyBullets[bulletIndex]) {
              let content = generatedContent.whyBullets[bulletIndex];
              // Add external link if this matches the external link placement
              const sectionKey = `why-${bulletIndex + 1}`;
              if (externalLinkPlacement === sectionKey && location && cityWebsiteUrl) {
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
                // Add external link if this matches the external link placement
                const sectionKey = `why-${index + 1}`;
                if (externalLinkPlacement === sectionKey && location && cityWebsiteUrl) {
                  content = insertExternalLink(content, location, cityWebsiteUrl);
                }
                item.text = content;
              }
            });
          }
        }
      } else if (cssId.includes('faq')) {
        // Handle FAQ section - check by ID first, then adapt to structure (matching sample page logic)

        // If this is the main FAQ container (ID contains 'questions')
        if (cssId.includes('questions')) {
          console.log('[BATCH DEBUG] Found FAQ container:', {
            cssId: cssId,
            widgetType: element.widgetType,
            hasSettings: !!element.settings,
            settingsKeys: element.settings ? Object.keys(element.settings) : [],
            hasTabs: !!element.settings.tabs,
            hasItems: !!element.settings.items,
            hasElements: !!element.elements,
          });

          // Check if it uses tabs structure (classic accordion/toggle)
          if (element.settings.tabs && Array.isArray(element.settings.tabs)) {
            console.log('[BATCH DEBUG] FAQ uses tabs structure (classic accordion), updating tabs...');
            element.settings.tabs.forEach((tab: any, index: number) => {
              if (generatedContent.faqs[index]) {
                tab.tab_title = generatedContent.faqs[index].question;
                let content = generatedContent.faqs[index].answer;
                if (internalLinkUrl && companyName) {
                  const faqKey = `faq-${index + 1}`;
                  if (internalLinkPlacement === faqKey) {
                    content = insertInternalLink(content, internalLinkUrl, companyName);
                  }
                }
                tab.tab_content = content;
                console.log(`[BATCH DEBUG] Updated FAQ ${index} in tabs`);
              }
            });
          }
          // Check if it uses items structure (nested-accordion might use this)
          else if (element.settings.items && Array.isArray(element.settings.items)) {
            console.log('[BATCH DEBUG] FAQ uses items structure, updating items...');
            element.settings.items.forEach((item: any, index: number) => {
              if (generatedContent.faqs[index]) {
                console.log(`[BATCH DEBUG] Item ${index} keys:`, Object.keys(item));
                // Try different possible field names
                if (item.item_title !== undefined) item.item_title = generatedContent.faqs[index].question;
                if (item.item_content !== undefined) {
                  let content = generatedContent.faqs[index].answer;
                  if (internalLinkUrl && companyName) {
                    const faqKey = `faq-${index + 1}`;
                    if (internalLinkPlacement === faqKey) {
                      content = insertInternalLink(content, internalLinkUrl, companyName);
                    }
                  }
                  item.item_content = content;
                }
                if (item.title !== undefined) item.title = generatedContent.faqs[index].question;
                if (item.content !== undefined) {
                  let content = generatedContent.faqs[index].answer;
                  if (internalLinkUrl && companyName) {
                    const faqKey = `faq-${index + 1}`;
                    if (internalLinkPlacement === faqKey) {
                      content = insertInternalLink(content, internalLinkUrl, companyName);
                    }
                  }
                  item.content = content;
                }
                console.log(`[BATCH DEBUG] Updated FAQ ${index} in items`);
              }
            });
          }
          // Nested accordion stores FAQs in child elements, not settings
          else if (element.elements && Array.isArray(element.elements)) {
            console.log('[BATCH DEBUG] FAQ uses nested elements structure - this is likely nested-accordion');
            console.log('[BATCH DEBUG] FAQ container has', element.elements.length, 'child elements');
            console.log('[BATCH DEBUG] Processing nested accordion child elements for questions...');

            // Look for accordion item elements - each child is an accordion item/details element
            let faqIndex = 0;
            element.elements.forEach((childElement: any, childIdx: number) => {
              if (!childElement || !childElement.settings) return;

              console.log(`[BATCH DEBUG] Processing child element ${childIdx + 1}/${element.elements.length}`);

              // Each child element (details/accordion-item) represents one FAQ
              // Questions are in nested child elements
              if (childElement.elements && Array.isArray(childElement.elements)) {
                // Search for heading widget containing the question
                childElement.elements.forEach((nestedChild: any) => {
                  if (!nestedChild || !nestedChild.settings) return;

                  // Found the question heading
                  if (nestedChild.widgetType === 'heading' && nestedChild.settings.title && generatedContent.faqs[faqIndex]) {
                    nestedChild.settings.title = generatedContent.faqs[faqIndex].question;
                    console.log(`[BATCH DEBUG] Updated nested FAQ ${faqIndex + 1} question: ${generatedContent.faqs[faqIndex].question.substring(0, 60)}...`);
                    faqIndex++;
                  }
                });
              }
            });
            console.log(`[BATCH DEBUG] Processed ${faqIndex} nested FAQ questions`);
          } else {
            console.log('[BATCH DEBUG] FAQ container found but unknown structure');
            console.log('[BATCH DEBUG] Full settings keys:', element.settings ? Object.keys(element.settings) : 'none');
          }
        }
        // Handle individual FAQ items (separate IDs for each question/answer)
        else {
          const faqIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
          if (generatedContent.faqs[faqIndex]) {
            if (element.widgetType === 'heading' && cssId.includes('question')) {
              element.settings.title = generatedContent.faqs[faqIndex].question;
              console.log(`[BATCH DEBUG] Updated individual FAQ ${faqIndex} question`);
            }
            if (element.widgetType === 'text-editor' && cssId.includes('answer')) {
              let content = generatedContent.faqs[faqIndex].answer;
              if (internalLinkUrl && companyName) {
                const faqKey = `faq-${faqIndex + 1}`;
                if (internalLinkPlacement === faqKey) {
                  content = insertInternalLink(content, internalLinkUrl, companyName);
                }
              }
              element.settings.editor = content;
              console.log(`[BATCH DEBUG] Updated individual FAQ ${faqIndex} answer`);
            }
          }
        }
      } else if (cssId === 'map-description' && element.settings.editor) {
        // Replace map description - match specific ID, no widget type check
        let content = generatedContent.mapDescription || '';
        if (internalLinkPlacement === 'map' && internalLinkUrl && companyName) {
          content = insertInternalLink(content, internalLinkUrl, companyName);
        }
        element.settings.editor = content;
      }

      // Replace Google Maps iframe - match specific ID
      else if (cssId === 'map-iframe' && element.settings.html && location) {
        // Generate new Google Maps embed URL for the location
        const encodedLocation = encodeURIComponent(location);

        // Create keyword-stuffed iframe closing tag for SEO
        const keywords = [
          service ? `${service} in ${location}` : location,
          service ? `${service} near me` : '',
          service || ''
        ].filter(Boolean).join(',');

        // Replace iframe src and add keywords before closing tag
        element.settings.html = element.settings.html.replace(
          /(<iframe[^>]*src=")([^"]*)("[^>]*>)([^<]*)<\/iframe>/gi,
          (match: string, prefix: string, oldSrc: string, middle: string, oldContent: string) => {
            const simpleMapUrl = `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
            return `${prefix}${simpleMapUrl}${middle}${keywords}</iframe>`;
          }
        );
      }
    }

    // Recursively process children elements
    if (element.elements && Array.isArray(element.elements)) {
      element.elements.forEach(replaceInElement);
    }
  }

  // Process all sections
  clonedData.forEach(replaceInElement);

  return clonedData;
}

/**
 * Duplicate template page and replace content
 */
async function duplicateTemplateAndPublish(params: {
  clientData: PageJob['clientData'];
  pageData: PageJob['pageData'];
  generatedContent: any;
  primaryKeyword: string;
  batchSize: number;
}): Promise<string> {
  const { clientData, pageData, generatedContent, primaryKeyword, batchSize } = params;

  const wpApiUrl = `${clientData.wordpressUrl}/wp-json/wp/v2/pages`;
  const credentials = Buffer.from(`${clientData.wpUsername}:${clientData.wpAppPassword}`).toString('base64');

  // Get parent page ID if parent slug is provided
  let parentId: number | null = null;
  if (pageData.parentSlug) {
    parentId = await getParentPageId(clientData.wordpressUrl, pageData.parentSlug, credentials);
  }

  // Generate slug based on page type (or use custom slug if provided)
  const slug = pageData.customSlug || generateSlug(pageData.pageType, pageData.service, pageData.location);

  // Fetch the full template page (to duplicate it)
  if (!clientData.templatePageId) {
    throw new Error('No template page ID configured');
  }

  try {
    const templateUrl = `${clientData.wordpressUrl}/wp-json/wp/v2/pages/${clientData.templatePageId}?context=edit`;
    const templateResponse = await fetch(templateUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!templateResponse.ok) {
      throw new Error(`Failed to fetch template page: ${templateResponse.statusText}`);
    }

    const templatePage = await templateResponse.json();

    // Get Elementor data
    const elementorData = templatePage.meta?._elementor_data;
    if (!elementorData) {
      throw new Error('No Elementor data found in template page');
    }

    // Fetch sitemap for intelligent internal linking
    const sitemap = await fetchSitemap(clientData.wordpressUrl);

    // Determine internal link URL based on rotation
    // Pattern: 40% homepage, 60% contextual pages
    // For 5 pages: [homepage, contextual, contextual, contextual, homepage]
    let internalLinkUrl = clientData.wordpressUrl; // default to homepage
    const rotation = pageData.rowNumber % 5;

    if (rotation >= 1 && rotation <= 3 && sitemap.length > 0) {
      // Use contextual page for rotations 1, 2, 3
      const relevantPage = findRelevantPage(sitemap, pageData.service, pageData.location);
      if (relevantPage) {
        internalLinkUrl = relevantPage;
      }
    }

    // Calculate link placements for this page (needed for link insertion in template)
    // This must match the placements calculated in processPage() for AI prompt
    const omitMap = pageData.omitSections.includes('Map');
    const { internalLinkPlacement, externalLinkPlacement } = determineLinkPlacements(
      pageData.rowNumber,
      batchSize,
      omitMap
    );

    // Parse and replace content
    const parsedElementorData = typeof elementorData === 'string' ? JSON.parse(elementorData) : elementorData;
    const updatedElementorData = replaceElementorContent(
      parsedElementorData,
      generatedContent,
      pageData.location,
      internalLinkUrl,
      clientData.clientName,
      pageData.service,
      internalLinkPlacement,
      externalLinkPlacement
    );

    // Generate schema.org structured data
    let schemaScript = '';
    try {
      const schemaData = generateStructuredData({
        companyName: clientData.clientName,
        companyWebsite: clientData.clientWebsite,
        businessPhone: clientData.businessPhone,
        businessAddress: clientData.businessAddress,
        businessType: clientData.businessType,
        gbpUrl: clientData.gbpUrl,
        service: pageData.service,
        location: pageData.location,
        primaryKeyword: primaryKeyword,
        pageType: pageData.pageType,
        faqs: pageData.omitSections.includes('FAQ') ? undefined : generatedContent.faqs,
      });

      schemaScript = `<script type="application/ld+json">\n${JSON.stringify(schemaData, null, 2)}\n</script>\n\n`;
      console.log('[Publishing] Generated schema.org JSON-LD');
    } catch (error) {
      console.warn('[Publishing] Failed to generate schema:', error);
      // Continue without schema if generation fails
    }

    // Build new page from template - duplicate all template settings
    const pagePayload: any = {
      title: primaryKeyword, // Use primaryKeyword only - WordPress/theme will append site name via title template
      slug: slug,
      status: 'publish',
      content: schemaScript + (templatePage.content?.rendered || ''), // CHANGED: Inject schema at top of content
      excerpt: generatedContent.metaDescription, // Set excerpt to meta description
      featured_media: templatePage.featured_media || 0,
      comment_status: templatePage.comment_status || 'closed',
      ping_status: templatePage.ping_status || 'closed',
      template: templatePage.template || '',
      meta: {
        // Copy all existing meta from template (but we'll override SEO fields)
        ...templatePage.meta,
        // Update Elementor data with new content
        _elementor_data: JSON.stringify(updatedElementorData),
        _elementor_edit_mode: 'builder',
        _elementor_template_type: 'wp-page',
        _elementor_version: templatePage.meta?._elementor_version || '3.25.0',
        _wp_page_template: templatePage.meta?._wp_page_template || 'elementor_canvas',
      },
    };

    // Add SEO plugin fields - ONLY meta title and meta description
    // NOTE: Use primaryKeyword only (not full metaTitle) to avoid duplicate company names
    // SEO plugins (Yoast/RankMath) have title templates that append site name automatically
    if (clientData.seoPlugin === 'yoast') {
      // Yoast SEO fields
      pagePayload.meta._yoast_wpseo_title = String(primaryKeyword);
      pagePayload.meta._yoast_wpseo_metadesc = String(generatedContent.metaDescription);
    } else if (clientData.seoPlugin === 'rank-math' || clientData.seoPlugin === 'rankmath') {
      // Rank Math SEO fields
      pagePayload.meta.rank_math_title = String(primaryKeyword);
      pagePayload.meta.rank_math_description = String(generatedContent.metaDescription);
    }

    // Add parent if found
    if (parentId) {
      pagePayload.parent = parentId;
    }

    // Create the new page
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
      throw new Error(`WordPress API error (${response.status}): ${errorText}`);
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

      if (clientData.seoPlugin === 'yoast') {
        updatePayload.meta._yoast_wpseo_title = String(primaryKeyword);
        updatePayload.meta._yoast_wpseo_metadesc = String(generatedContent.metaDescription);
      } else if (clientData.seoPlugin === 'rank-math' || clientData.seoPlugin === 'rankmath') {
        updatePayload.meta.rank_math_title = String(primaryKeyword);
        updatePayload.meta.rank_math_description = String(generatedContent.metaDescription);
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

    return pageUrl;

  } catch (error) {
    console.error('Error duplicating template:', error);
    throw error;
  }
}

/**
 * Publish page to WordPress with Elementor template (wrapper for backward compatibility)
 */
async function publishToWordPress(params: {
  clientData: PageJob['clientData'];
  pageData: PageJob['pageData'];
  generatedContent: any;
  primaryKeyword: string;
  batchSize: number;
}): Promise<string> {
  return duplicateTemplateAndPublish(params);
}

/**
 * Determine internal and external link placements based on batch position
 * Returns human-readable placement identifiers for AI prompt
 */
function determineLinkPlacements(
  rowNumber: number,
  batchSize: number,
  omitMap: boolean
): { internalLinkPlacement: string; externalLinkPlacement: string } {
  // Calculate 0-indexed position in batch
  const position = (rowNumber - 1) % batchSize;

  // Internal link placement (5-page pattern: hero, faq-1, faq-2, faq-3, map)
  const internalLinkRotation5 = ['hero', 'faq-1', 'faq-2', 'faq-3', 'map'];

  // For 3-page batches: hero, faq-1, map (if not omitted) or faq-2 (if map omitted)
  const internalLinkRotation3 = omitMap
    ? ['hero', 'faq-1', 'faq-2']
    : ['hero', 'faq-1', 'map'];

  // External link placement for 3-page vs 5+ page batches
  const externalLinkRotation3 = ['benefits-1', 'why-1', 'why-3'];
  const externalLinkRotation6 = [
    'benefits-1',
    'benefits-2',
    'benefits-3',
    'why-1',
    'why-2',
    'why-3',
  ];

  const internalLinkPlacement =
    batchSize <= 3
      ? internalLinkRotation3[position % 3]
      : internalLinkRotation5[position % 5];

  const externalLinkPlacement =
    batchSize <= 3
      ? externalLinkRotation3[position % 3]
      : externalLinkRotation6[position % 6];

  return { internalLinkPlacement, externalLinkPlacement };
}

/**
 * Process a single page (content generation only)
 * Returns generated content for sequential FAQ validation
 */
async function processPage(
  job: PageJob,
  batchSize: number
): Promise<{ job: PageJob; generatedContent: any; primaryKeyword: string; startTime: number } | null> {
  const startTime = Date.now();

  // Get page name based on page type
  const pageName = getPageName(job.pageData.pageType, job.pageData.service, job.pageData.location);

  // Get service and location for content generation
  const service = job.pageData.service;
  const location = job.pageData.location;

  // Form primary keyword: use custom if provided, otherwise adjective + service + in + location
  let primaryKeyword: string;

  if (job.pageData.customPrimaryKeyword) {
    // Use user-edited primary keyword
    primaryKeyword = job.pageData.customPrimaryKeyword;
  } else {
    // Generate default primary keyword
    if (service && location) {
      primaryKeyword = `${job.adjective} ${service} in ${location}`;
    } else if (service) {
      primaryKeyword = `${job.adjective} ${service}`;
    } else if (location) {
      primaryKeyword = `${job.adjective} ${location}`;
    } else {
      primaryKeyword = job.adjective;
    }
  }

  // Determine link placements BEFORE content generation (so AI knows where to place company name and location)
  const omitMap = job.pageData.omitSections.includes('Map');
  const { internalLinkPlacement, externalLinkPlacement } = determineLinkPlacements(
    job.pageData.rowNumber,
    batchSize,
    omitMap
  );

  console.log(`[BATCH] Generating page with:`, {
    adjective: job.adjective,
    service: service,
    location: location,
    primaryKeyword: primaryKeyword,
    pageName: pageName,
    internalLinkPlacement,
    externalLinkPlacement,
  });

  try {
    // Update status to generating
    await prisma.generatedPage.updateMany({
      where: {
        batchId: job.batchId,
        rowNumber: job.pageData.rowNumber,
      },
      data: {
        status: 'generating',
      },
    });

    // Rate limiting: Wait if needed
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    if (timeSinceLastCall < MIN_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - timeSinceLastCall));
    }
    lastApiCall = Date.now();

    // STEP 1: Generate content in parallel (no FAQ uniqueness check yet - done during validation)
    // Pass batchId for context caching (saves ~75% on input tokens)
    // IMPORTANT: Pass link placements so AI knows where to naturally include company name and location
    const generatedContent = await generatePageContent({
      batchId: job.batchId,
      pageType: job.pageData.pageType,
      companyName: job.clientData.clientName,
      companyWebsite: job.clientData.clientWebsite,
      service,
      location,
      primaryKeyword,
      omitSections: job.pageData.omitSections,
      seoPlugin: job.clientData.seoPlugin,
      internalLinkPlacement,
      externalLinkPlacement,
    });

    // Check for "undefined" in generated content
    const contentString = JSON.stringify(generatedContent);
    if (contentString.includes('undefined')) {
      console.error(`[BATCH ERROR] "undefined" found in generated content for ${pageName}`);
      console.error(`Full content:`, generatedContent);
    }

    // Return the generated content for sequential validation/publishing
    // This allows parallel content generation while maintaining FAQ uniqueness checks
    return {
      job,
      generatedContent,
      primaryKeyword,
      startTime
    };

  } catch (error) {
    // Log generation error
    await prisma.errorLog.create({
      data: {
        userId: job.userId,
        clientId: job.clientId,
        errorType: 'generation',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stackTrace: error instanceof Error ? error.stack : null,
        context: JSON.stringify({
          batchId: job.batchId,
          pageName,
          rowNumber: job.pageData.rowNumber,
        }),
      },
    });

    // Mark page as failed
    await prisma.generatedPage.updateMany({
      where: {
        batchId: job.batchId,
        rowNumber: job.pageData.rowNumber,
      },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timeElapsed: Date.now() - startTime,
      },
    });

    return null; // Failed to generate content
  }
}

/**
 * Validate and publish (with FAQ uniqueness tracking)
 */
async function validateAndPublish(
  job: PageJob,
  generatedContent: any,
  primaryKeyword: string,
  startTime: number,
  batchSize: number,
  previouslyUsedFAQs: string[]
): Promise<void> {
  const pageName = getPageName(job.pageData.pageType, job.pageData.service, job.pageData.location);

  try {
    // Update to validating
    await prisma.generatedPage.updateMany({
      where: {
        batchId: job.batchId,
        rowNumber: job.pageData.rowNumber,
      },
      data: {
        status: 'validating',
      },
    });

    // Smart validation with auto-fix and selective retry (pass previously used FAQs for uniqueness check)
    const smartValidation = await validateAndFixContent(generatedContent, {
      batchId: job.batchId,
      pageType: job.pageData.pageType,
      companyName: job.clientData.clientName,
      companyWebsite: job.clientData.clientWebsite,
      service: job.pageData.service,
      location: job.pageData.location,
      primaryKeyword,
      omitSections: job.pageData.omitSections,
      seoPlugin: job.clientData.seoPlugin,
      previouslyUsedFAQs,
    });

    // Use the fixed content
    let finalContent = smartValidation.content;

    // Log auto-fixes
    if (smartValidation.autoFixed.length > 0) {
      console.log(`✅ Auto-fixed fields for ${pageName}:`, smartValidation.autoFixed.join(', '));
    }

    // Log warnings
    if (smartValidation.warnings.length > 0) {
      console.warn(`⚠️ Validation warnings for ${pageName}:`, smartValidation.warnings);
      await prisma.errorLog.create({
        data: {
          userId: job.userId,
          clientId: job.clientId,
          errorType: 'validation_warning',
          errorMessage: `Validation warnings: ${smartValidation.warnings.join(', ')}`,
          stackTrace: null,
          context: JSON.stringify({
            batchId: job.batchId,
            pageName,
            rowNumber: job.pageData.rowNumber,
          }),
        },
      });
    }

    // Handle retries (FAQs and map section)
    const MAX_RETRIES = 2;
    for (const retry of smartValidation.needsRetry) {
      console.log(`🔄 Retrying ${retry.field} for ${pageName}: ${retry.reason}`);

      let retrySuccess = false;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const regenerated = await regenerateField(
            {
              batchId: job.batchId,
              pageType: job.pageData.pageType,
              companyName: job.clientData.clientName,
              companyWebsite: job.clientData.clientWebsite,
              service: job.pageData.service,
              location: job.pageData.location,
              primaryKeyword,
              omitSections: job.pageData.omitSections,
              seoPlugin: job.clientData.seoPlugin,
            },
            retry.field as "faqs" | "mapDescription" | "heroDescription" | "bullets",
            finalContent,
            retry.reason
          );

          // Update the content with regenerated field
          if (retry.field === "faqs" && regenerated.faqs) {
            finalContent.faqs = regenerated.faqs;
            console.log(`✅ Successfully regenerated FAQs for ${pageName} (attempt ${attempt})`);
            retrySuccess = true;
            break;
          } else if (retry.field === "mapDescription" && regenerated.mapDescription) {
            finalContent.mapDescription = regenerated.mapDescription;
            console.log(`✅ Successfully regenerated map description for ${pageName} (attempt ${attempt})`);
            retrySuccess = true;
            break;
          } else if (retry.field === "heroDescription" && regenerated.heroDescription) {
            finalContent.heroDescription = regenerated.heroDescription;
            console.log(`✅ Successfully regenerated hero description for ${pageName} (attempt ${attempt})`);
            retrySuccess = true;
            break;
          } else if (retry.field === "bullets" && (regenerated.benefitsBullets || regenerated.whyBullets)) {
            if (regenerated.benefitsBullets) {
              finalContent.benefitsBullets = regenerated.benefitsBullets;
            }
            if (regenerated.whyBullets) {
              finalContent.whyBullets = regenerated.whyBullets;
            }
            console.log(`✅ Successfully regenerated bullet points for ${pageName} (attempt ${attempt})`);
            retrySuccess = true;
            break;
          }
        } catch (error) {
          console.error(`❌ Retry attempt ${attempt} failed for ${retry.field}:`, error);
          if (attempt === MAX_RETRIES) {
            // Log final retry failure but continue with original content
            await prisma.errorLog.create({
              data: {
                userId: job.userId,
                clientId: job.clientId,
                errorType: 'retry_failed',
                errorMessage: `Failed to regenerate ${retry.field} after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
                stackTrace: error instanceof Error ? error.stack : null,
                context: JSON.stringify({
                  batchId: job.batchId,
                  pageName,
                  rowNumber: job.pageData.rowNumber,
                  field: retry.field,
                  reason: retry.reason,
                }),
              },
            });
          }
        }
      }
    }

    // Update to publishing
    await prisma.generatedPage.updateMany({
      where: {
        batchId: job.batchId,
        rowNumber: job.pageData.rowNumber,
      },
      data: {
        status: 'publishing',
      },
    });

    // Publish to WordPress (use finalContent with all fixes and retries applied)
    const publishedUrl = await publishToWordPress({
      clientData: job.clientData,
      pageData: job.pageData,
      generatedContent: finalContent,
      primaryKeyword,
      batchSize,
    });

    // Mark as success
    await prisma.generatedPage.updateMany({
      where: {
        batchId: job.batchId,
        rowNumber: job.pageData.rowNumber,
      },
      data: {
        status: 'success',
        publishedUrl,
        primaryKeyword,
        generatedContent: JSON.stringify(finalContent), // Save the fixed content
        timeElapsed: Date.now() - startTime,
      },
    });

    // Update batch success count
    await prisma.generationBatch.update({
      where: { id: job.batchId },
      data: {
        successfulPages: { increment: 1 },
      },
    });

    // Store FAQ questions in batch tracker for next pages (AFTER successful validation)
    if (finalContent.faqs && finalContent.faqs.length > 0) {
      const currentFAQs = batchFAQs.get(job.batchId) || [];
      const newQuestions = finalContent.faqs.map((faq: any) => faq.question);
      batchFAQs.set(job.batchId, [...currentFAQs, ...newQuestions]);
      console.log(`[FAQ TRACKING] Stored ${newQuestions.length} FAQ questions for batch ${job.batchId}. Total: ${currentFAQs.length + newQuestions.length}`);
    }

  } catch (error) {
    // Log error
    await prisma.errorLog.create({
      data: {
        userId: job.userId,
        clientId: job.clientId,
        errorType: error instanceof Error && error.message.includes('Validation') ? 'validation' : 'wordpress',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stackTrace: error instanceof Error ? error.stack : null,
        context: JSON.stringify({
          batchId: job.batchId,
          pageName,
          rowNumber: job.pageData.rowNumber,
        }),
      },
    });

    // Mark as failed
    await prisma.generatedPage.updateMany({
      where: {
        batchId: job.batchId,
        rowNumber: job.pageData.rowNumber,
      },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timeElapsed: Date.now() - startTime,
      },
    });

    // Update batch failed count
    await prisma.generationBatch.update({
      where: { id: job.batchId },
      data: {
        failedPages: { increment: 1 },
      },
    });
  }
}

/**
 * Queue a batch for processing
 */
export async function queueBatchGeneration(params: {
  batchId: string;
  clientId: string;
  userId: string;
  pages: Array<{
    pageType: string;
    service: string;
    location: string;
    parentSlug: string;
    externalLinkSection: string;
    omitSections: string[];
    rowNumber: number;
    customSlug?: string;
    customPrimaryKeyword?: string;
  }>;
  clientData: {
    clientName: string;
    clientWebsite: string;
    wordpressUrl: string;
    wpUsername: string;
    wpAppPassword: string;
    seoPlugin: string;
    templatePageId: string;
  };
}) {
  const { batchId, clientId, userId, pages, clientData } = params;

  try {
    // Get adjectives deterministically based on row numbers
    // This ensures preview and actual generation use the same adjectives
    const { getAdjectiveForRow } = await import('./adjectives');
    const adjectives: string[] = pages.map(page => getAdjectiveForRow(page.rowNumber));
    console.log(`✅ Using deterministic adjectives for batch:`, adjectives);

    // Create batch record
    await prisma.generationBatch.create({
      data: {
        id: batchId,
        clientId,
        userId,
        csvFilename: 'upload.csv',
        totalPages: pages.length,
        successfulPages: 0,
        failedPages: 0,
        status: 'in_progress',
      },
    });

    // Create page records
    for (const page of pages) {
      const pageName = getPageName(page.pageType, page.service, page.location);

      await prisma.generatedPage.create({
        data: {
          batchId,
          pageName,
          pageType: page.pageType,
          service: page.service,
          location: page.location,
          parentSlug: page.parentSlug,
          rowNumber: page.rowNumber,
          status: 'pending',
        },
      });
    }

    // Mark batch as active
    activeBatches.set(batchId, {
      status: 'processing',
      totalPages: pages.length,
    });

    // Process pages sequentially (but validation+publishing happens in parallel)
    processBatchSequentially(batchId, pages, adjectives, clientData, clientId, userId);

    return { success: true };
  } catch (error) {
    await prisma.errorLog.create({
      data: {
        userId,
        clientId,
        errorType: 'queue',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stackTrace: error instanceof Error ? error.stack : null,
        context: JSON.stringify({ batchId }),
      },
    });
    throw error;
  }
}

/**
 * Process batch pages: parallel content generation, then sequential validation/publishing
 * This maximizes speed while maintaining FAQ uniqueness checks
 */
async function processBatchSequentially(
  batchId: string,
  pages: any[],
  adjectives: string[],
  clientData: any,
  clientId: string,
  userId: string
) {
  const batchSize = pages.length;
  console.log(`[BATCH] Processing ${batchSize} pages with ${adjectives.length} adjectives`);
  console.log(`[BATCH] Adjectives array:`, adjectives);

  // STEP 1: Generate ALL content in PARALLEL (faster!)
  console.log(`[BATCH] 🚀 Generating content for all ${batchSize} pages in parallel...`);
  const jobs: PageJob[] = pages.map((page, i) => ({
    batchId,
    clientId,
    userId,
    pageData: page,
    clientData,
    adjective: adjectives[i],
  }));

  const generationResults = await Promise.all(
    jobs.map(job => processPage(job, batchSize))
  );

  console.log(`[BATCH] ✅ All ${batchSize} pages generated! Now validating and publishing sequentially...`);

  // STEP 2: Validate and publish SEQUENTIALLY (to maintain FAQ uniqueness tracking)
  const previouslyUsedFAQs: string[] = [];

  for (let i = 0; i < generationResults.length; i++) {
    const result = generationResults[i];

    if (!result) {
      console.log(`[BATCH] ⚠️ Skipping page ${i + 1} (generation failed)`);
      continue;
    }

    const { job, generatedContent, primaryKeyword, startTime } = result;

    console.log(`[BATCH] Validating and publishing page ${i + 1}/${batchSize}: ${job.pageData.service} in ${job.pageData.location}`);

    // Validate and publish with FAQ uniqueness check
    await validateAndPublish(job, generatedContent, primaryKeyword, startTime, batchSize, previouslyUsedFAQs);

    // Add this page's FAQs to the list for next page's validation
    // (This is redundant since validateAndPublish also does it, but keeping for clarity)
  }

  // Mark batch as completed
  await prisma.generationBatch.update({
    where: { id: batchId },
    data: {
      status: 'completed',
      timeTakenSeconds: Math.floor((Date.now() - parseInt(batchId.split('_')[1])) / 1000),
    },
  });

  // Clear context cache to free memory
  clearBatchContext(batchId);
  activeBatches.delete(batchId);
  batchFAQs.delete(batchId); // Clean up FAQ tracking

  console.log(`[BATCH] ✅ Batch ${batchId} completed!`);
}

/**
 * Get active batch count
 */
export function getActiveBatchCount(): number {
  return activeBatches.size;
}

/**
 * Check if a batch is active
 */
export function isBatchActive(batchId: string): boolean {
  return activeBatches.has(batchId);
}

/**
 * Get queue statistics for admin dashboard
 */
export async function getQueueStats() {
  // For simple queue, we just return active batch count
  return {
    waiting: 0, // Simple queue doesn't have a "waiting" concept
    active: activeBatches.size,
    completed: 0, // Would need to track this separately
    failed: 0, // Would need to track this separately
    delayed: 0, // Not applicable for simple queue
  };
}

/**
 * Get active jobs for admin dashboard
 */
export async function getActiveJobs() {
  const jobs: Array<{
    id: string;
    batchId: string;
    pageName: string;
    progress: number;
    timestamp: number;
  }> = [];

  // For simple queue, we can get active batches from database
  for (const [batchId, batch] of Array.from(activeBatches.entries())) {
    const pages = await prisma.generatedPage.findMany({
      where: { batchId },
      select: {
        pageName: true,
        status: true,
        createdAt: true,
      },
    });

    // Add currently processing pages
    const processingPages = pages.filter(p =>
      ['generating', 'validating', 'publishing'].includes(p.status)
    );

    for (const page of processingPages) {
      jobs.push({
        id: `${batchId}-${page.pageName}`,
        batchId,
        pageName: page.pageName,
        progress: page.status === 'generating' ? 33 : page.status === 'validating' ? 66 : 90,
        timestamp: page.createdAt.getTime(),
      });
    }
  }

  return jobs;
}

/**
 * Check queue health
 */
export async function checkQueueHealth(): Promise<boolean> {
  // Simple queue is always healthy if the process is running
  return true;
}
