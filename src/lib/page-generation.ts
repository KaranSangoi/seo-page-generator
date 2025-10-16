/**
 * Shared Page Generation Utilities
 * Core functions used by both v1 (direct generation) and v2 (preview & publish)
 *
 * This module extracts the reusable logic from simple-queue.ts so that:
 * - v1 mode can generate and publish immediately
 * - v2 mode can generate for preview, then publish after user approval
 */

import { generatePageContent, validateAndFixContent, regenerateField } from './claude-api';
import { replaceElementorContent } from './elementor-replacer';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get page name based on page type
 */
export function getPageName(pageType: string, service: string, location: string): string {
  const isBroadStroke = pageType === 'Broad Stroke' || pageType === 'Nested Broad Stroke';

  if (isBroadStroke) {
    // For Broad Stroke pages, use location (optionally with service)
    return service ? `${service} in ${location}` : location;
  }

  // For Service pages (Primary Service, Location Service), use service (optionally with location)
  return location ? `${service} in ${location}` : service;
}

/**
 * Generate slug based on page type
 */
export function generateSlug(pageType: string, service: string, location: string): string {
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
 * Get WordPress parent page ID by slug
 */
export async function getParentPageId(
  wordpressUrl: string,
  parentSlug: string,
  credentials: string
): Promise<number | null> {
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
 * Fetch Elementor template data from template page
 */
export async function fetchElementorTemplate(
  wordpressUrl: string,
  templatePageId: string,
  credentials: string
): Promise<any | null> {
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

    // Return full template page (not just Elementor data) for publishing
    return templatePage;
  } catch (error) {
    console.error('Error fetching Elementor template:', error);
    return null;
  }
}

/**
 * Fetch and parse sitemap from website
 */
export async function fetchSitemap(websiteUrl: string): Promise<string[]> {
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
export function findRelevantPage(sitemap: string[], service: string, location: string): string | null {
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
 * Generate city website URL from location
 * Uses Wikipedia as a reliable fallback since city .gov URLs vary widely
 */
export function generateCityWebsiteUrl(location: string): string {
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
 * Determine internal and external link placements based on batch position
 * Returns human-readable placement identifiers for AI prompt
 */
export function determineLinkPlacements(
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

// ============================================================================
// Core Generation Functions
// ============================================================================

export interface PageGenerationParams {
  batchId?: string;
  pageType: string;
  companyName: string;
  companyWebsite: string;
  service: string;
  location: string;
  primaryKeyword: string;
  omitSections: string[];
  seoPlugin: string;
  internalLinkPlacement: string;
  externalLinkPlacement: string;
}

export interface ContentValidationParams extends PageGenerationParams {
  previouslyUsedFAQs?: string[];
}

/**
 * Generate page content (just content generation, no publishing)
 * Reusable by both v1 and v2
 */
export async function generateContent(params: PageGenerationParams): Promise<any> {
  const generatedContent = await generatePageContent({
    batchId: params.batchId || `temp_${Date.now()}`,
    pageType: params.pageType,
    companyName: params.companyName,
    companyWebsite: params.companyWebsite,
    service: params.service,
    location: params.location,
    primaryKeyword: params.primaryKeyword,
    omitSections: params.omitSections,
    seoPlugin: params.seoPlugin,
    internalLinkPlacement: params.internalLinkPlacement,
    externalLinkPlacement: params.externalLinkPlacement,
  });

  return generatedContent;
}

/**
 * Validate and fix content
 * Reusable by both v1 and v2
 */
export async function validateContent(
  generatedContent: any,
  params: ContentValidationParams
): Promise<{
  content: any;
  autoFixed: string[];
  warnings: string[];
  needsRetry: Array<{ field: string; reason: string }>;
}> {
  const validation = await validateAndFixContent(generatedContent, {
    batchId: params.batchId || `temp_${Date.now()}`,
    pageType: params.pageType,
    companyName: params.companyName,
    companyWebsite: params.companyWebsite,
    service: params.service,
    location: params.location,
    primaryKeyword: params.primaryKeyword,
    omitSections: params.omitSections,
    seoPlugin: params.seoPlugin,
    previouslyUsedFAQs: params.previouslyUsedFAQs || [],
  });

  return validation;
}

/**
 * Regenerate specific fields that failed validation
 * Reusable by both v1 and v2
 */
export async function regenerateContentField(
  params: PageGenerationParams,
  field: 'faqs' | 'mapDescription' | 'heroDescription' | 'bullets',
  currentContent: any,
  reason: string
): Promise<any> {
  return await regenerateField(
    {
      batchId: params.batchId || `temp_${Date.now()}`,
      pageType: params.pageType,
      companyName: params.companyName,
      companyWebsite: params.companyWebsite,
      service: params.service,
      location: params.location,
      primaryKeyword: params.primaryKeyword,
      omitSections: params.omitSections,
      seoPlugin: params.seoPlugin,
    },
    field,
    currentContent,
    reason
  );
}

// ============================================================================
// Publishing Functions
// ============================================================================

export interface PublishParams {
  wordpressUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  templatePageId: string;
  seoPlugin: string;
  clientName: string;
  clientWebsite: string;
  pageData: {
    pageType: string;
    service: string;
    location: string;
    parentSlug?: string;
    customSlug?: string;
    rowNumber: number;
    omitSections: string[];
  };
  generatedContent: any;
  primaryKeyword: string;
  batchSize: number;
}

/**
 * Publish page to WordPress
 * Reusable by both v1 and v2
 */
export async function publishToWordPress(params: PublishParams): Promise<string> {
  const credentials = Buffer.from(`${params.wpUsername}:${params.wpAppPassword}`).toString('base64');
  const wpApiUrl = `${params.wordpressUrl}/wp-json/wp/v2/pages`;

  // Get parent page ID if parent slug is provided
  let parentId: number | null = null;
  if (params.pageData.parentSlug) {
    parentId = await getParentPageId(params.wordpressUrl, params.pageData.parentSlug, credentials);
  }

  // Generate slug based on page type (or use custom slug if provided)
  const slug = params.pageData.customSlug || generateSlug(
    params.pageData.pageType,
    params.pageData.service,
    params.pageData.location
  );

  // Fetch template page
  const templatePage = await fetchElementorTemplate(
    params.wordpressUrl,
    params.templatePageId,
    credentials
  );

  if (!templatePage) {
    throw new Error('Failed to fetch template page');
  }

  // Get Elementor data
  const elementorData = templatePage.meta?._elementor_data;
  if (!elementorData) {
    throw new Error('No Elementor data found in template page');
  }

  // Fetch sitemap for intelligent internal linking
  const sitemap = await fetchSitemap(params.clientWebsite);

  // Determine internal link URL based on rotation
  // Pattern: 40% homepage, 60% contextual pages
  // For 5 pages: [homepage, contextual, contextual, contextual, homepage]
  let internalLinkUrl = params.wordpressUrl; // default to homepage
  const rotation = params.pageData.rowNumber % 5;

  if (rotation >= 1 && rotation <= 3 && sitemap.length > 0) {
    // Use contextual page for rotations 1, 2, 3
    const relevantPage = findRelevantPage(sitemap, params.pageData.service, params.pageData.location);
    if (relevantPage) {
      internalLinkUrl = relevantPage;
    }
  }

  // Calculate link placements for this page
  const omitMap = params.pageData.omitSections.includes('Map');
  const { internalLinkPlacement, externalLinkPlacement } = determineLinkPlacements(
    params.pageData.rowNumber,
    params.batchSize,
    omitMap
  );

  // Parse and replace content
  const parsedElementorData = typeof elementorData === 'string' ? JSON.parse(elementorData) : elementorData;
  const updatedElementorData = replaceElementorContent(
    parsedElementorData,
    params.generatedContent,
    params.pageData.location,
    internalLinkUrl,
    params.clientName,
    params.pageData.service,
    internalLinkPlacement,
    externalLinkPlacement
  );

  // Build new page from template
  const pagePayload: any = {
    title: params.generatedContent.h1, // Use H1 as page title (metaTitle is for SEO only)
    slug: slug,
    status: 'publish',
    content: templatePage.content?.rendered || '',
    excerpt: params.generatedContent.metaDescription,
    featured_media: templatePage.featured_media || 0,
    comment_status: templatePage.comment_status || 'closed',
    ping_status: templatePage.ping_status || 'closed',
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

  // Add SEO plugin fields
  if (params.seoPlugin === 'yoast') {
    pagePayload.meta._yoast_wpseo_title = String(params.generatedContent.metaTitle);
    pagePayload.meta._yoast_wpseo_metadesc = String(params.generatedContent.metaDescription);
  } else if (params.seoPlugin === 'rank-math' || params.seoPlugin === 'rankmath') {
    pagePayload.meta.rank_math_title = String(params.generatedContent.metaTitle);
    pagePayload.meta.rank_math_description = String(params.generatedContent.metaDescription);
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
  try {
    const updatePayload: any = { meta: {} };

    if (params.seoPlugin === 'yoast') {
      updatePayload.meta._yoast_wpseo_title = String(params.generatedContent.metaTitle);
      updatePayload.meta._yoast_wpseo_metadesc = String(params.generatedContent.metaDescription);
    } else if (params.seoPlugin === 'rank-math' || params.seoPlugin === 'rankmath') {
      updatePayload.meta.rank_math_title = String(params.generatedContent.metaTitle);
      updatePayload.meta.rank_math_description = String(params.generatedContent.metaDescription);
    }

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
    console.warn('Failed to update SEO fields:', updateError);
  }

  return pageUrl;
}
