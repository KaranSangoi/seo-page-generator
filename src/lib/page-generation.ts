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
import { replaceDiviContent } from './divi-replacer';
import { replaceWPBakeryContent } from './wpbakery-replacer';
import { replaceClassicEditorContent } from './classic-editor-replacer';
import { replaceFusionContent } from './fusion-replacer';
import { generateStructuredData } from './schema-generator';

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
    // _cb cache-buster: avoid stale cached template from WP edge/page cache.
    const templateUrl = `${wordpressUrl}/wp-json/wp/v2/pages/${templatePageId}?context=edit&_cb=${Date.now()}`;
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

    // Check for Elementor data (stored in meta._elementor_data)
    const hasElementorData = !!templatePage.meta?._elementor_data;

    // Check for Divi data (stored in meta._et_pb_use_builder)
    const hasDiviData = templatePage.meta?._et_pb_use_builder === 'on' ||
                        (typeof templatePage.content === 'object' && templatePage.content?.raw?.includes('[et_pb_'));

    // Check for WPBakery data (stored in meta._wpb_vc_js_status or [vc_ shortcodes)
    const hasWPBakeryData = templatePage.meta?._wpb_vc_js_status === 'true' ||
                            (typeof templatePage.content === 'object' && templatePage.content?.raw?.includes('[vc_'));

    // Check for Classic Editor (SEO_GEN markers in content)
    const rawContent = typeof templatePage.content === 'object' ? templatePage.content?.raw || '' : '';
    const hasClassicEditorMarkers = rawContent.includes('<!-- SEO_GEN_START:') || rawContent.includes('<!-- SEO_GEN_END:');

    // Check for Fusion Builder (Avada) shortcodes in raw content
    const hasFusionData = rawContent.includes('[fusion_builder_container') || rawContent.includes('[fusion_builder_row');

    if (!hasElementorData && !hasDiviData && !hasWPBakeryData && !hasFusionData && !hasClassicEditorMarkers) {
      console.error('No Elementor, Divi, WPBakery, Fusion, or Classic Editor data found in template page');
      return null;
    }

    const detectedBuilder = hasElementorData ? 'Elementor' : hasWPBakeryData ? 'WPBakery' : hasFusionData ? 'Fusion Builder' : hasClassicEditorMarkers ? 'Classic Editor' : 'Divi';
    console.log(`[FETCH TEMPLATE] Detected builder: ${detectedBuilder}`);

    // Return full template page for publishing
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

  // Internal link placement patterns - exclude 'map' if omitMap is true
  // 5-page pattern: hero, faq-1, faq-2, faq-3, map (or cycle back to hero if map omitted)
  const internalLinkRotation5 = omitMap
    ? ['hero', 'faq-1', 'faq-2', 'faq-3', 'hero'] // Cycle back to hero instead of map
    : ['hero', 'faq-1', 'faq-2', 'faq-3', 'map'];

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
  previouslyUsedFAQs?: string[];
  existingAdjective?: string; // If provided, AI reuses this adjective (for regeneration)
  model?: string; // AI model to use (e.g. "gpt-5.4")
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
    previouslyUsedFAQs: params.previouslyUsedFAQs,
    existingAdjective: params.existingAdjective,
    model: params.model,
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
  // Business metadata for schema.org (optional)
  businessPhone?: string;
  businessAddress?: string;
  businessType?: string;
  gbpUrl?: string;
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
  // Optional override for external link URL (user-edited)
  externalLinkUrlOverride?: string;
  // Effective link color (hex) for generated internal/external links. Null =
  // keep theme default styling.
  linkColor?: string | null;
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

  // Detect which builder is being used
  const hasElementorData = !!templatePage.meta?._elementor_data;
  const hasDiviData = templatePage.meta?._et_pb_use_builder === 'on' ||
                      (typeof templatePage.content === 'object' && templatePage.content?.raw?.includes('[et_pb_'));
  const hasWPBakeryData = templatePage.meta?._wpb_vc_js_status === 'true' ||
                          (typeof templatePage.content === 'object' && templatePage.content?.raw?.includes('[vc_'));
  const rawContentCheck = typeof templatePage.content === 'object' ? templatePage.content?.raw || '' : '';
  const hasClassicEditor = rawContentCheck.includes('<!-- SEO_GEN_START:') || rawContentCheck.includes('<!-- SEO_GEN_END:');
  const hasFusionData = rawContentCheck.includes('[fusion_builder_container') || rawContentCheck.includes('[fusion_builder_row');

  const builderType = hasElementorData ? 'elementor' : hasWPBakeryData ? 'wpbakery' : hasFusionData ? 'fusion' : hasClassicEditor ? 'classic-editor' : hasDiviData ? 'divi' : null;

  if (!builderType) {
    throw new Error('No Elementor, WPBakery, Fusion, Classic Editor, or Divi data found in template page');
  }

  console.log(`[Publishing] Detected ${builderType} builder`);

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
  const { internalLinkPlacement, externalLinkPlacement} = determineLinkPlacements(
    params.pageData.rowNumber,
    params.batchSize,
    omitMap
  );

  // Parse and replace content based on builder type
  let updatedContent: any;
  let replacementLog: any;

  if (builderType === 'elementor') {
    const elementorData = templatePage.meta?._elementor_data;
    const parsedElementorData = typeof elementorData === 'string' ? JSON.parse(elementorData) : elementorData;
    const { data, log } = replaceElementorContent(
      parsedElementorData,
      params.generatedContent,
      params.pageData.location,
      internalLinkUrl,
      params.clientName,
      params.pageData.service,
      internalLinkPlacement,
      externalLinkPlacement,
      params.pageData.omitSections,
      params.externalLinkUrlOverride,
      params.linkColor
    );
    updatedContent = data;
    replacementLog = log;

    // Meta description is handled by SEO plugins (Yoast, RankMath, All in One SEO)
    // via the meta fields we set below, no need to inject into page content

    console.log('[Publishing] Elementor replacement summary:', {
      sectionsFound: replacementLog.sectionsFound,
      sectionsUpdated: replacementLog.sectionsUpdated,
      totalElements: replacementLog.elementDetails.length,
    });
  } else if (builderType === 'wpbakery') {
    // WPBakery Page Builder
    const wpbakeryContent = templatePage.content?.raw || '';
    const { data, log } = replaceWPBakeryContent(
      wpbakeryContent,
      params.generatedContent,
      params.pageData.location,
      internalLinkUrl,
      params.clientName,
      params.pageData.service,
      internalLinkPlacement,
      externalLinkPlacement,
      params.pageData.omitSections,
      params.externalLinkUrlOverride,
      params.linkColor
    );
    updatedContent = data;
    replacementLog = log;

    console.log('[Publishing] WPBakery replacement summary:', {
      sectionsFound: replacementLog.sectionsFound,
      sectionsUpdated: replacementLog.sectionsUpdated,
      totalElements: replacementLog.elementDetails.length,
    });
  } else if (builderType === 'fusion') {
    // Fusion Builder (Avada)
    const fusionContent = templatePage.content?.raw || '';
    const { data, log } = replaceFusionContent(
      fusionContent,
      params.generatedContent,
      params.pageData.location,
      internalLinkUrl,
      params.clientName,
      params.pageData.service,
      internalLinkPlacement,
      externalLinkPlacement,
      params.pageData.omitSections,
      params.externalLinkUrlOverride,
      params.linkColor
    );
    updatedContent = data;
    replacementLog = log;

    console.log('[Publishing] Fusion Builder replacement summary:', {
      sectionsFound: replacementLog.sectionsFound,
      sectionsUpdated: replacementLog.sectionsUpdated,
      totalElements: replacementLog.elementDetails.length,
    });
  } else if (builderType === 'classic-editor') {
    // Classic Editor (TinyMCE)
    const classicEditorContent = templatePage.content?.raw || '';
    const { data, log } = replaceClassicEditorContent(
      classicEditorContent,
      params.generatedContent,
      params.pageData.location,
      internalLinkUrl,
      params.clientName,
      params.pageData.service,
      internalLinkPlacement,
      externalLinkPlacement,
      params.pageData.omitSections,
      params.externalLinkUrlOverride,
      params.linkColor
    );
    updatedContent = data;
    replacementLog = log;

    console.log('[Publishing] Classic Editor replacement summary:', {
      sectionsFound: replacementLog.sectionsFound,
      sectionsUpdated: replacementLog.sectionsUpdated,
      errors: replacementLog.errors.length,
    });
  } else {
    // Divi builder
    const diviContent = templatePage.content?.raw || '';
    const { data, log } = replaceDiviContent(
      diviContent,
      params.generatedContent,
      params.pageData.location,
      internalLinkUrl,
      params.clientName,
      params.pageData.service,
      internalLinkPlacement,
      externalLinkPlacement,
      params.pageData.omitSections,
      params.externalLinkUrlOverride,
      params.linkColor
    );
    updatedContent = data;
    replacementLog = log;

    console.log('[Publishing] Divi replacement summary:', {
      sectionsFound: replacementLog.sectionsFound,
      sectionsUpdated: replacementLog.sectionsUpdated,
      totalElements: replacementLog.elementDetails.length,
    });
  }

  // Generate schema.org structured data
  let schemaScript = '';
  try {
    const schemaData = generateStructuredData({
      companyName: params.clientName,
      companyWebsite: params.clientWebsite,
      businessPhone: params.businessPhone,
      businessAddress: params.businessAddress,
      businessType: params.businessType,
      gbpUrl: params.gbpUrl,
      service: params.pageData.service,
      location: params.pageData.location,
      primaryKeyword: params.primaryKeyword,
      pageType: params.pageData.pageType,
      faqs: params.pageData.omitSections.includes('FAQ') ? undefined : params.generatedContent.faqs,
    });

    schemaScript = `<script type="application/ld+json">\n${JSON.stringify(schemaData, null, 2)}\n</script>\n\n`;
    console.log('[Publishing] Generated schema.org JSON-LD');
  } catch (error) {
    console.warn('[Publishing] Failed to generate schema:', error);
    // Continue without schema if generation fails
  }

  // Build new page from template
  const pagePayload: any = {
    title: params.primaryKeyword, // Use primaryKeyword only - WordPress/theme will append site name via title template
    slug: slug,
    status: 'publish',
    excerpt: params.generatedContent.metaDescription,
    featured_media: templatePage.featured_media || 0,
    comment_status: templatePage.comment_status || 'closed',
    ping_status: templatePage.ping_status || 'closed',
    template: templatePage.template || '',
    meta: {
      ...templatePage.meta,
    },
  };

  // Add builder-specific fields
  if (builderType === 'elementor') {
    pagePayload.content = schemaScript + (templatePage.content?.rendered || '');
    pagePayload.meta._elementor_data = JSON.stringify(updatedContent);
    pagePayload.meta._elementor_edit_mode = 'builder';
    pagePayload.meta._elementor_template_type = 'wp-page';
    pagePayload.meta._elementor_version = templatePage.meta?._elementor_version || '3.25.0';
    pagePayload.meta._wp_page_template = templatePage.meta?._wp_page_template || 'elementor_canvas';
  } else if (builderType === 'wpbakery') {
    // WPBakery: content goes directly into the content field (raw shortcodes)
    pagePayload.content = schemaScript + updatedContent;
    pagePayload.meta._wpb_vc_js_status = 'true'; // Enable WPBakery editor
  } else if (builderType === 'fusion') {
    // Fusion Builder (Avada): content goes directly into the content field (shortcodes)
    pagePayload.content = schemaScript + updatedContent;
    // Fusion Builder reads shortcodes from post_content, no special meta needed
  } else if (builderType === 'classic-editor') {
    // Classic Editor: content goes directly into the content field (HTML)
    pagePayload.content = schemaScript + updatedContent;
    // No special meta fields needed for Classic Editor
  } else {
    // Divi: content goes directly into the content field
    pagePayload.content = schemaScript + updatedContent;
    pagePayload.meta._et_pb_use_builder = 'on';
    pagePayload.meta._et_pb_old_content = '';
  }

  // Add SEO plugin fields
  // NOTE: Use primaryKeyword only (not full metaTitle) to avoid duplicate company names
  // SEO plugins (Yoast/RankMath) have title templates that append site name automatically
  const seoPlugin = params.seoPlugin?.toLowerCase();
  if (seoPlugin === 'yoast') {
    pagePayload.meta._yoast_wpseo_title = String(params.primaryKeyword);
    pagePayload.meta._yoast_wpseo_metadesc = String(params.generatedContent.metaDescription);
    pagePayload.meta._yoast_wpseo_focuskw = String(params.primaryKeyword);
  } else if (seoPlugin === 'rank-math' || seoPlugin === 'rankmath') {
    pagePayload.meta.rank_math_title = String(params.primaryKeyword);
    pagePayload.meta.rank_math_description = String(params.generatedContent.metaDescription);
    pagePayload.meta.rank_math_focus_keyword = String(params.primaryKeyword);
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

    if (seoPlugin === 'yoast') {
      updatePayload.meta._yoast_wpseo_title = String(params.primaryKeyword);
      updatePayload.meta._yoast_wpseo_metadesc = String(params.generatedContent.metaDescription);
      updatePayload.meta._yoast_wpseo_focuskw = String(params.primaryKeyword);
    } else if (seoPlugin === 'rank-math' || seoPlugin === 'rankmath') {
      updatePayload.meta.rank_math_title = String(params.primaryKeyword);
      updatePayload.meta.rank_math_description = String(params.generatedContent.metaDescription);
      updatePayload.meta.rank_math_focus_keyword = String(params.primaryKeyword);
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
