/**
 * Simple In-Memory Job Queue
 * No Redis required - uses sequential generation with parallel validation/publishing
 */

import { generatePageContent, validateContent, generateAdjectives, clearBatchContext } from './claude-api';
import { prisma } from './prisma';

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
  };
  clientData: {
    clientName: string;
    clientWebsite: string;
    wordpressUrl: string;
    wpUsername: string;
    wpAppPassword: string;
    seoPlugin: string;
    templatePageId: string;
  };
  adjective: string;
}

// In-memory storage for active batches
const activeBatches = new Map<string, { status: string; totalPages: number }>();

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
    const urlMatches = xmlText.matchAll(/<loc>(.*?)<\/loc>/g);
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
 */
function generateCityWebsiteUrl(location: string): string {
  if (!location) return '';

  // Extract city name (before comma)
  const cityName = location.split(',')[0].trim();
  const citySlug = cityName.toLowerCase().replace(/\s+/g, '');

  // Common patterns for city websites
  return `https://www.${citySlug}.gov`;
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
  externalLinkSection?: string,
  rowNumber?: number
): any {
  if (!elementorData || !Array.isArray(elementorData)) return elementorData;

  // Deep clone to avoid modifying original
  const clonedData = JSON.parse(JSON.stringify(elementorData));

  // Determine which section gets the internal link based on batch size rotation
  // For 3-page batch: [hero=0, faq-a1=1, map=2]
  // For 5-page batch: [hero=0, faq-a1=1, faq-a2=2, faq-a3=3, map=4]
  const internalLinkSection = rowNumber ? rowNumber % 5 : 0;

  // Determine external link section - use CSV value or default rotation
  // Default rotation: benefits-1, benefits-2, benefits-3, why-1, why-2, why-3
  let finalExternalLinkSection = externalLinkSection;
  if (!finalExternalLinkSection && rowNumber !== undefined) {
    const externalRotation = ['benefits-1', 'benefits-2', 'benefits-3', 'why-1', 'why-2', 'why-3'];
    finalExternalLinkSection = externalRotation[rowNumber % 6];
  }

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
            // Add internal link if this is the hero section's turn (rotation 0)
            if (internalLinkSection === 0 && internalLinkUrl && companyName) {
              content = insertInternalLink(content, internalLinkUrl, companyName);
            }
            element.settings.editor = content;
          }
        }
      } else if (cssId.includes('benefits')) {
        // Replace benefits content
        if (element.widgetType === 'heading' && element.settings.title) {
          element.settings.title = generatedContent.benefitsHeading;
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.benefitsSubheading;
          } else if (cssId.includes('bullet')) {
            // Replace bullet points
            const bulletIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
            if (generatedContent.benefitsBullets[bulletIndex]) {
              let content = generatedContent.benefitsBullets[bulletIndex];
              // Add external link if this matches the external link section (CSV or default rotation)
              if (finalExternalLinkSection && cssId.includes(finalExternalLinkSection) && location && cityWebsiteUrl) {
                content = insertExternalLink(content, location, cityWebsiteUrl);
              }
              element.settings.editor = content;
            }
          }
        }
      } else if (cssId.includes('why')) {
        // Replace why content
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
              // Add external link if this matches the external link section (CSV or default rotation)
              if (finalExternalLinkSection && cssId.includes(finalExternalLinkSection) && location && cityWebsiteUrl) {
                content = insertExternalLink(content, location, cityWebsiteUrl);
              }
              element.settings.editor = content;
            }
          }
        }
      } else if (cssId.includes('faq')) {
        // Replace FAQ content
        const faqIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
        if (generatedContent.faqs[faqIndex]) {
          if (element.widgetType === 'heading' && cssId.includes('question')) {
            element.settings.title = generatedContent.faqs[faqIndex].question;
          }
          if (element.widgetType === 'text-editor' && cssId.includes('answer')) {
            let content = generatedContent.faqs[faqIndex].answer;
            // Add internal link based on rotation
            // rotation 1 = faq-a1, rotation 2 = faq-a2, rotation 3 = faq-a3
            if (internalLinkUrl && companyName) {
              if ((internalLinkSection === 1 && faqIndex === 0) ||
                  (internalLinkSection === 2 && faqIndex === 1) ||
                  (internalLinkSection === 3 && faqIndex === 2)) {
                content = insertInternalLink(content, internalLinkUrl, companyName);
              }
            }
            element.settings.editor = content;
          }
        }
      } else if (cssId.includes('map')) {
        // Replace map description
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          let content = generatedContent.mapDescription || '';
          // Add internal link if this is the map section's turn (rotation 4 for 5-page batch, or 2 for 3-page batch)
          if (internalLinkSection === 4 && internalLinkUrl && companyName) {
            content = insertInternalLink(content, internalLinkUrl, companyName);
          }
          // For 3-page batches, rotation 2 goes to map
          if (internalLinkSection === 2 && internalLinkUrl && companyName) {
            content = insertInternalLink(content, internalLinkUrl, companyName);
          }
          element.settings.editor = content;
        }
      }

      // Replace Google Maps iframe in custom HTML widget
      if (cssId.includes('map-iframe') && element.widgetType === 'html' && location) {
        if (element.settings.html) {
          // Generate new Google Maps embed URL for the location
          const encodedLocation = encodeURIComponent(location);
          const newIframeSrc = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodedLocation}`;

          // Replace iframe src in the HTML
          const iframeRegex = /(<iframe[^>]*src=")([^"]*)(")/gi;
          element.settings.html = element.settings.html.replace(iframeRegex, (match: string, prefix: string, oldSrc: string, suffix: string) => {
            // For now, use the simpler Google Maps URL format (no API key needed)
            const simpleMapUrl = `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
            return prefix + simpleMapUrl + suffix;
          });
        }
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
}): Promise<string> {
  const { clientData, pageData, generatedContent, primaryKeyword } = params;

  const wpApiUrl = `${clientData.wordpressUrl}/wp-json/wp/v2/pages`;
  const credentials = Buffer.from(`${clientData.wpUsername}:${clientData.wpAppPassword}`).toString('base64');

  // Get parent page ID if parent slug is provided
  let parentId: number | null = null;
  if (pageData.parentSlug) {
    parentId = await getParentPageId(clientData.wordpressUrl, pageData.parentSlug, credentials);
  }

  // Generate slug based on page type
  const slug = generateSlug(pageData.pageType, pageData.service, pageData.location);

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

    // Parse and replace content
    const parsedElementorData = typeof elementorData === 'string' ? JSON.parse(elementorData) : elementorData;
    const updatedElementorData = replaceElementorContent(
      parsedElementorData,
      generatedContent,
      pageData.location,
      internalLinkUrl,
      clientData.clientName,
      pageData.service,
      pageData.externalLinkSection,
      pageData.rowNumber
    );

    // Build new page from template - duplicate all template settings
    const pagePayload: any = {
      title: generatedContent.metaTitle, // Use meta title as page title
      slug: slug,
      status: 'publish',
      content: templatePage.content?.rendered || '', // Keep original content as fallback
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
    if (clientData.seoPlugin === 'yoast') {
      // Yoast SEO fields
      pagePayload.meta._yoast_wpseo_title = String(generatedContent.metaTitle);
      pagePayload.meta._yoast_wpseo_metadesc = String(generatedContent.metaDescription);
    } else if (clientData.seoPlugin === 'rank-math' || clientData.seoPlugin === 'rankmath') {
      // Rank Math SEO fields
      pagePayload.meta.rank_math_title = String(generatedContent.metaTitle);
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
        updatePayload.meta._yoast_wpseo_title = String(generatedContent.metaTitle);
        updatePayload.meta._yoast_wpseo_metadesc = String(generatedContent.metaDescription);
      } else if (clientData.seoPlugin === 'rank-math' || clientData.seoPlugin === 'rankmath') {
        updatePayload.meta.rank_math_title = String(generatedContent.metaTitle);
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
}): Promise<string> {
  return duplicateTemplateAndPublish(params);
}

/**
 * Process a single page (content generation only)
 * Validation + publishing happen in parallel async
 */
async function processPage(job: PageJob): Promise<void> {
  const startTime = Date.now();

  // Get page name based on page type
  const pageName = getPageName(job.pageData.pageType, job.pageData.service, job.pageData.location);

  // Get service and location for content generation
  const service = job.pageData.service;
  const location = job.pageData.location;

  // Form primary keyword: adjective + service + in + location (for all page types)
  let primaryKeyword: string;

  if (service && location) {
    primaryKeyword = `${job.adjective} ${service} in ${location}`;
  } else if (service) {
    primaryKeyword = `${job.adjective} ${service}`;
  } else if (location) {
    primaryKeyword = `${job.adjective} ${location}`;
  } else {
    primaryKeyword = job.adjective;
  }

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

    // STEP 1: Generate content (WAIT for this - sequential)
    // Pass batchId for context caching (saves ~75% on input tokens)
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
    });

    // STEP 2: Validate + Publish (ASYNC - don't wait!)
    // Fire off validation and publishing in the background
    validateAndPublish(job, generatedContent, primaryKeyword, startTime).catch(err => {
      console.error('Validation/Publishing error:', err);
    });

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
  }
}

/**
 * Validate and publish (runs async in background)
 */
async function validateAndPublish(
  job: PageJob,
  generatedContent: any,
  primaryKeyword: string,
  startTime: number
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

    // Validate content (warnings only - don't block publishing)
    const validation = validateContent(
      generatedContent,
      job.pageData.omitSections,
      job.clientData.clientName,
      job.pageData.location
    );
    if (!validation.isValid) {
      console.warn(`⚠️ Validation warnings for ${pageName}:`, validation.errors);
      // Log warnings but continue publishing
      await prisma.errorLog.create({
        data: {
          userId: job.userId,
          clientId: job.clientId,
          errorType: 'validation_warning',
          errorMessage: `Validation warnings: ${validation.errors.join(', ')}`,
          stackTrace: null,
          context: JSON.stringify({
            batchId: job.batchId,
            pageName,
            rowNumber: job.pageData.rowNumber,
          }),
        },
      });
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

    // Publish to WordPress
    const publishedUrl = await publishToWordPress({
      clientData: job.clientData,
      pageData: job.pageData,
      generatedContent,
      primaryKeyword,
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
        generatedContent: JSON.stringify(generatedContent),
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
    // Generate adjectives for all pages
    const adjectives = await generateAdjectives(pages.length);

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
 * Process batch pages sequentially
 */
async function processBatchSequentially(
  batchId: string,
  pages: any[],
  adjectives: string[],
  clientData: any,
  clientId: string,
  userId: string
) {
  for (let i = 0; i < pages.length; i++) {
    const job: PageJob = {
      batchId,
      clientId,
      userId,
      pageData: pages[i],
      clientData,
      adjective: adjectives[i],
    };

    await processPage(job);
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
