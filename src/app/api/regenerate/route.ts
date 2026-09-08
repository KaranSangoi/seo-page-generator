/**
 * Regenerate API Endpoint
 * Allows regenerating a single failed page
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePageContent } from '@/lib/claude-api';
import { validateContent, type ContentValidationParams, determineLinkPlacements } from '@/lib/page-generation';
import { replaceElementorContent } from '@/lib/elementor-replacer';
import { resolveLinkColor } from '@/lib/link-style';
import { replaceDiviContent } from '@/lib/divi-replacer';
import { replaceFusionContent } from '@/lib/fusion-replacer';
import { generateStructuredData } from '@/lib/schema-generator';
import { randomBytes } from 'crypto';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

// Regenerate: full content generation (OpenAI) + WordPress publish.
// Roughly equivalent to one preview page + one publish, so ~60-90s worst case.
export const maxDuration = 180;

// Helper function to generate slug
function generateSlug(pageType: string, service: string, location: string): string {
  const isBroadStroke = pageType === 'Broad Stroke' || pageType === 'Nested Broad Stroke';
  const slugSource = isBroadStroke ? location : service;
  return slugSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to get parent page ID
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

// Helper function to fetch template page (supports Elementor, Divi, and Fusion Builder)
async function fetchTemplatePage(
  wordpressUrl: string,
  templatePageId: string,
  credentials: string
): Promise<{
  fullPage: any;
  builder: 'elementor' | 'divi' | 'fusion';
  templateData: any;
} | null> {
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

    // Detect builder
    const isElementor = !!templatePage.meta?._elementor_data;
    const isDivi = templatePage.meta?._et_pb_use_builder === 'on' ||
                   (templatePage.content?.rendered && templatePage.content.rendered.includes('[et_pb_'));

    if (isElementor) {
      const elementorData = templatePage.meta._elementor_data;
      const parsedData = typeof elementorData === 'string' ? JSON.parse(elementorData) : elementorData;
      console.log('[REGENERATE] Detected Elementor page builder');
      return {
        fullPage: templatePage,
        builder: 'elementor',
        templateData: parsedData,
      };
    } else if (isDivi) {
      console.log('[REGENERATE] Detected Divi page builder');
      return {
        fullPage: templatePage,
        builder: 'divi',
        templateData: templatePage.content?.rendered || '',
      };
    }

    // Check for Fusion Builder (Avada)
    const rawContent = templatePage.content?.raw || '';
    const isFusion = rawContent.includes('[fusion_builder_container') || rawContent.includes('[fusion_builder_row');
    if (isFusion) {
      console.log('[REGENERATE] Detected Fusion Builder (Avada)');
      return {
        fullPage: templatePage,
        builder: 'fusion',
        templateData: rawContent,
      };
    }

    console.error('Template page must use Elementor, Divi, or Fusion Builder');
    return null;
  } catch (error) {
    console.error('Error fetching template page:', error);
    return null;
  }
}

// Helper function to publish to WordPress
async function publishToWordPress(params: {
  wordpressUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  templatePageId: string;
  pageType: string;
  service: string;
  location: string;
  parentSlug: string;
  generatedContent: any;
  primaryKeyword: string;
  seoPlugin: string;
  companyName: string;
  companyWebsite: string;
  businessPhone?: string;
  businessAddress?: string;
  businessType?: string;
  gbpUrl?: string;
  internalLinkPlacement?: string;
  externalLinkPlacement?: string;
  omitSections?: string[];
  linkColor?: string | null;
}): Promise<string> {
  const { wordpressUrl, wpUsername, wpAppPassword, templatePageId, pageType, service, location, parentSlug, generatedContent, primaryKeyword, seoPlugin, companyName, companyWebsite, businessPhone, businessAddress, businessType, gbpUrl, internalLinkPlacement, externalLinkPlacement, omitSections, linkColor } = params;

  const wpApiUrl = `${wordpressUrl}/wp-json/wp/v2/pages`;
  const credentials = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');

  // Get parent page ID if parent slug is provided
  let parentId: number | null = null;
  if (parentSlug) {
    parentId = await getParentPageId(wordpressUrl, parentSlug, credentials);
  }

  // Generate slug based on page type
  const slug = generateSlug(pageType, service, location);

  // Fetch template page (supports Elementor, Divi, and Fusion Builder)
  const templateInfo = await fetchTemplatePage(wordpressUrl, templatePageId, credentials);

  if (!templateInfo) {
    throw new Error('Failed to fetch template page or unsupported page builder');
  }

  const { fullPage: fullTemplatePage, builder, templateData } = templateInfo;

  // Build page payload
  // NOTE: WordPress page title uses primaryKeyword, SEO meta title uses AI-generated metaTitle
  const pagePayload: any = {
    title: primaryKeyword, // WordPress page title (shown in admin)
    slug: slug,
    status: 'publish',
    meta: {
      ...(seoPlugin === 'yoast' ? {
        _yoast_wpseo_title: generatedContent.metaTitle, // SEO meta title (shown in search results)
        _yoast_wpseo_metadesc: generatedContent.metaDescription,
        _yoast_wpseo_focuskw: primaryKeyword,
      } : {
        rank_math_title: generatedContent.metaTitle, // SEO meta title (shown in search results)
        rank_math_description: generatedContent.metaDescription,
        rank_math_focus_keyword: primaryKeyword,
      }),
    },
  };

  // Process content based on builder
  try {

    // Get parent page URL for internal linking
    let parentPageUrl = '';
    if (parentSlug) {
      parentPageUrl = `${wordpressUrl}/${parentSlug}`;
    }

    // Replace content based on builder
    let updatedData: any = null;
    let replacementLog: any = null;

    if (builder === 'elementor') {
      // ELEMENTOR: Use Elementor replacer
      const { data, log } = replaceElementorContent(
        templateData,
        generatedContent,
        location,
        parentPageUrl, // internalLinkUrl
        companyName,
        service,
        internalLinkPlacement,
        externalLinkPlacement,
        omitSections || [],
        undefined,
        linkColor
      );
      updatedData = data;
      replacementLog = log;

      console.log('[REGENERATE] Elementor replacement log:', {
        sectionsFound: replacementLog.sectionsFound,
        sectionsUpdated: replacementLog.sectionsUpdated.length,
        totalElements: replacementLog.elementDetails.length,
      });
    } else if (builder === 'divi') {
      // DIVI: Use Divi replacer
      const { data, log } = replaceDiviContent(
        templateData,
        generatedContent,
        location,
        parentPageUrl, // internalLinkUrl
        companyName,
        service,
        internalLinkPlacement,
        externalLinkPlacement,
        omitSections || [],
        undefined,
        linkColor
      );
      updatedData = data;
      replacementLog = log;

      console.log('[REGENERATE] Divi replacement log:', {
        sectionsFound: replacementLog.sectionsFound,
        sectionsUpdated: replacementLog.sectionsUpdated.length,
        totalElements: replacementLog.elementDetails.length,
      });
    } else if (builder === 'fusion') {
      // FUSION: Use Fusion replacer
      const { data, log } = replaceFusionContent(
        templateData,
        generatedContent,
        location,
        parentPageUrl,
        companyName,
        service,
        internalLinkPlacement,
        externalLinkPlacement,
        omitSections || [],
        undefined,
        linkColor
      );
      updatedData = data;
      replacementLog = log;

      console.log('[REGENERATE] Fusion replacement log:', {
        sectionsFound: replacementLog.sectionsFound,
        sectionsUpdated: replacementLog.sectionsUpdated.length,
        totalElements: replacementLog.elementDetails.length,
      });
    }

    // Generate schema.org structured data (AFTER content is finalized)
    let schemaScript = '';
    try {
      const schemaData = generateStructuredData({
        companyName,
        companyWebsite,
        businessPhone,
        businessAddress,
        businessType,
        gbpUrl,
        service,
        location,
        primaryKeyword,
        pageType,
        faqs: generatedContent.faqs,
      });

      schemaScript = `<script type="application/ld+json">${JSON.stringify(schemaData, null, 2)}</script>`;
      console.log('[REGENERATE] Generated schema.org markup');
    } catch (schemaError) {
      console.warn('[REGENERATE] Schema generation failed:', schemaError);
      // Continue without schema (non-blocking)
    }

    // Copy common template settings
    pagePayload.excerpt = generatedContent.metaDescription; // Set excerpt to meta description for WordPress SEO
    pagePayload.featured_media = fullTemplatePage.featured_media || 0;
    pagePayload.comment_status = fullTemplatePage.comment_status || 'closed';
    pagePayload.ping_status = fullTemplatePage.ping_status || 'closed';
    pagePayload.template = fullTemplatePage.template || '';

    // Copy existing meta
    pagePayload.meta = {
      ...fullTemplatePage.meta,
      ...pagePayload.meta,
    };

    // Builder-specific payload
    if (builder === 'elementor') {
      // ELEMENTOR: Inject schema into first section
      if (schemaScript && updatedData.length > 0) {
        const firstSection = updatedData[0];
        if (!firstSection.settings) {
          firstSection.settings = {};
        }
        if (!firstSection.settings._custom_css) {
          firstSection.settings._custom_css = '';
        }
        // Inject schema into custom CSS field (HTML injection trick)
        firstSection.settings._custom_css += `\n/* Schema.org Structured Data */\n${schemaScript}`;
        console.log('[REGENERATE] Injected schema into Elementor template');
      }

      // Set Elementor-specific fields
      pagePayload.content = fullTemplatePage.content?.rendered || '';
      pagePayload.meta._elementor_data = JSON.stringify(updatedData);
      pagePayload.meta._elementor_edit_mode = 'builder';
      pagePayload.meta._elementor_template_type = 'wp-page';
      pagePayload.meta._elementor_version = fullTemplatePage.meta?._elementor_version || '3.25.0';
      pagePayload.meta._wp_page_template = fullTemplatePage.meta?._wp_page_template || 'elementor_canvas';
    } else if (builder === 'divi') {
      // DIVI: Inject schema at the beginning of content
      pagePayload.content = schemaScript + '\n\n' + updatedData;
      pagePayload.meta._et_pb_use_builder = 'on';
      pagePayload.meta._et_pb_old_content = ''; // Clear old content
      console.log('[REGENERATE] Injected schema into Divi content');
    } else if (builder === 'fusion') {
      // FUSION: Inject schema at the beginning of content
      pagePayload.content = schemaScript + '\n\n' + updatedData;
      console.log('[REGENERATE] Injected schema into Fusion content');
    }

  } catch (fetchError) {
    console.error('Error processing template:', fetchError);
    throw fetchError;
  }

  // Add parent if found
  if (parentId) {
    pagePayload.parent = parentId;
  }

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

  // ✅ Immediately update Yoast SEO fields (REST-only, no PHP needed)
if (seoPlugin === 'yoast') {
  try {
    await fetch(`${wordpressUrl}/wp-json/wp/v2/pages/${result.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meta: {
          _yoast_wpseo_title: primaryKeyword,
          _yoast_wpseo_metadesc: generatedContent.metaDescription,
          _yoast_wpseo_focuskw: primaryKeyword,
        },
      }),
    });
  } catch (e) {
    console.warn('Yoast meta update failed:', e);
  }
}

  return result.link || result.guid?.rendered || 'Unknown URL';


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
    const { pageId } = body;

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // Fetch page from database
    const page = await prisma.generatedPage.findUnique({
      where: { id: pageId },
      include: {
        batch: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!page || !page.batch || !page.batch.client) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Verify user owns this page
    if (page.batch.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const client = page.batch.client;

    // Update status to generating
    await prisma.generatedPage.update({
      where: { id: pageId },
      data: { status: 'generating', errorMessage: null },
    });

    const startTime = Date.now();

    // Reuse original adjective if available, otherwise use deterministic selection
    let adjective: string;
    if (page.primaryKeyword) {
      // Extract adjective from stored primaryKeyword (first word)
      const words = page.primaryKeyword.split(' ');
      adjective = words[0];
      console.log(`[REGENERATE] Reusing original adjective: "${adjective}" from primary keyword: "${page.primaryKeyword}"`);
    } else {
      // Fallback: Use deterministic adjective based on row number if primaryKeyword not stored
      const { getAdjectiveForRow } = await import('@/lib/adjectives');
      adjective = getAdjectiveForRow(page.rowNumber || 1);
      console.log(`[REGENERATE] Using deterministic adjective: "${adjective}" for row ${page.rowNumber || 1}`);
    }

    // Form primary keyword
    let primaryKeyword: string;
    if (page.service && page.location) {
      primaryKeyword = `${adjective} ${page.service} in ${page.location}`;
    } else if (page.service) {
      primaryKeyword = `${adjective} ${page.service}`;
    } else if (page.location) {
      primaryKeyword = `${adjective} ${page.location}`;
    } else {
      primaryKeyword = adjective;
    }

    // Fetch all other successful pages in this batch to get their FAQs (for uniqueness checking)
    console.log(`[REGENERATE] Fetching existing FAQs from batch ${page.batchId} for uniqueness checking...`);
    const otherPagesInBatch = await prisma.generatedPage.findMany({
      where: {
        batchId: page.batchId,
        status: 'success',
        id: { not: pageId }, // Exclude current page
        generatedContent: { not: null }, // Only pages with content
      },
      select: {
        id: true,
        pageName: true,
        generatedContent: true,
      },
    });

    // Extract FAQ questions from other pages
    const previouslyUsedFAQs: string[] = [];
    for (const otherPage of otherPagesInBatch) {
      try {
        if (otherPage.generatedContent) {
          const content = JSON.parse(otherPage.generatedContent as string);
          if (content.faqs && Array.isArray(content.faqs)) {
            content.faqs.forEach((faq: any) => {
              if (faq.question) {
                previouslyUsedFAQs.push(faq.question);
              }
            });
          }
        }
      } catch (e) {
        console.warn(`[REGENERATE] Failed to parse content for page ${otherPage.id}:`, e);
      }
    }

    console.log(`[REGENERATE] Found ${previouslyUsedFAQs.length} previously used FAQs from ${otherPagesInBatch.length} pages in batch`);
    if (previouslyUsedFAQs.length > 0) {
      console.log(`[REGENERATE] Previously used FAQs:`, previouslyUsedFAQs.map(q => q.substring(0, 60) + '...'));
    }

    // Calculate link placements based on row number and batch size
    const totalPagesInBatch = otherPagesInBatch.length + 1; // +1 for current page
    const omitMap = false; // TODO: Store this in DB
    const { internalLinkPlacement, externalLinkPlacement } = determineLinkPlacements(
      page.rowNumber || 1,
      totalPagesInBatch,
      omitMap
    );

    console.log(`[REGENERATE] Link placements for row ${page.rowNumber}:`, {
      internal: internalLinkPlacement,
      external: externalLinkPlacement,
      batchSize: totalPagesInBatch,
    });

    // Generate content
    const generatedContent = await generatePageContent({
      batchId: page.batchId,
      pageType: page.pageType,
      companyName: client.clientName,
      companyWebsite: client.clientWebsite,
      service: page.service || '',
      location: page.location || '',
      primaryKeyword,
      omitSections: [], // TODO: Store this in DB
      seoPlugin: client.seoPlugin,
      internalLinkPlacement, // Tell AI where internal link will be placed
      externalLinkPlacement, // Tell AI where external link will be placed
      previouslyUsedFAQs, // Pass previously used FAQs for uniqueness checking
    });

    // Update status to validating
    await prisma.generatedPage.update({
      where: { id: pageId },
      data: { status: 'validating' },
    });

    // Validate content with smart validation (includes FAQ uniqueness checking)
    const validationParams: ContentValidationParams = {
      batchId: page.batchId,
      pageType: page.pageType,
      companyName: client.clientName,
      companyWebsite: client.clientWebsite,
      service: page.service || '',
      location: page.location || '',
      primaryKeyword,
      omitSections: [], // TODO: Store this in DB
      seoPlugin: client.seoPlugin,
      internalLinkPlacement,
      externalLinkPlacement,
      previouslyUsedFAQs, // Include previously used FAQs for validation
    };

    const validation = await validateContent(generatedContent, validationParams);

    // Use the auto-fixed content
    const finalContent = validation.content;

    if (validation.autoFixed.length > 0) {
      console.log(`[REGENERATE] Auto-fixed fields for ${page.pageName}:`, validation.autoFixed);
    }

    if (validation.warnings.length > 0) {
      console.warn(`⚠️ Validation warnings for ${page.pageName}:`, validation.warnings);
      // Log warnings but continue
      await prisma.errorLog.create({
        data: {
          userId: user.id,
          clientId: client.id,
          errorType: 'validation_warning',
          errorMessage: `Validation warnings: ${validation.warnings.join(', ')}`,
          stackTrace: null,
          context: JSON.stringify({
            batchId: page.batchId,
            pageName: page.pageName,
            pageId: page.id,
            autoFixed: validation.autoFixed,
          }),
        },
      });
    }

    if (validation.needsRetry.length > 0) {
      console.warn(`⚠️ Fields need retry for ${page.pageName}:`, validation.needsRetry);
      // Log retry needs but continue (could implement retry logic here in the future)
      await prisma.errorLog.create({
        data: {
          userId: user.id,
          clientId: client.id,
          errorType: 'validation_retry_needed',
          errorMessage: `Fields need retry: ${validation.needsRetry.map(r => `${r.field} (${r.reason})`).join(', ')}`,
          stackTrace: null,
          context: JSON.stringify({
            batchId: page.batchId,
            pageName: page.pageName,
            pageId: page.id,
            retryNeeded: validation.needsRetry,
          }),
        },
      });
    }

    // Update status to publishing
    await prisma.generatedPage.update({
      where: { id: pageId },
      data: { status: 'publishing' },
    });

    // Publish to WordPress (use finalContent which has auto-fixes applied)
    const publishedUrl = await publishToWordPress({
      wordpressUrl: client.wordpressUrl,
      wpUsername: client.wpUsername,
      wpAppPassword: client.wpAppPassword,
      templatePageId: client.templatePageId,
      pageType: page.pageType,
      service: page.service || '',
      location: page.location || '',
      parentSlug: page.parentSlug || '',
      generatedContent: finalContent,
      primaryKeyword,
      seoPlugin: client.seoPlugin,
      companyName: client.clientName,
      companyWebsite: client.clientWebsite,
      businessPhone: client.businessPhone || undefined,
      businessAddress: client.businessAddress || undefined,
      businessType: client.businessType || undefined,
      gbpUrl: client.gbpUrl || undefined,
      internalLinkPlacement,
      externalLinkPlacement,
      omitSections: [], // TODO: Store this in DB
      // Per-batch override wins over the client default; either may be null.
      linkColor: resolveLinkColor(page.batch.linkColor, client.linkColor),
    });

    // Mark as success
    await prisma.generatedPage.update({
      where: { id: pageId },
      data: {
        status: 'success',
        publishedUrl,
        primaryKeyword,
        generatedContent: JSON.stringify(finalContent),
        timeElapsed: Date.now() - startTime,
        errorMessage: null,
      },
    });

    // Ensure this NBS/BS page has its card on the parent. Idempotent + non-fatal:
    // the engine skips if a card for this URL already exists.
    if (
      (page.pageType === 'Nested Broad Stroke' || page.pageType === 'Broad Stroke') &&
      page.parentSlug &&
      page.location
    ) {
      try {
        const { addLocationCards } = await import('@/lib/location-cards');
        const cardResult = await addLocationCards(client, [
          {
            parentSlug: page.parentSlug,
            location: page.location,
            publishedUrl,
            pageType: page.pageType,
            service: page.service,
          },
        ]);
        if (cardResult.ran) {
          console.log(`[REGENERATE] 🗺️ Location card: ${cardResult.cardsAdded} added, ${cardResult.cardsSkipped} skipped` + (cardResult.errors.length ? ` | errors: ${cardResult.errors.join('; ')}` : ''));
        }
      } catch (cardErr) {
        console.error('[REGENERATE] Location card step failed (non-fatal):', cardErr);
      }
    }

    return NextResponse.json({
      success: true,
      page: {
        id: page.id,
        pageName: page.pageName,
        status: 'success',
        publishedUrl,
        timeElapsed: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Regeneration error:', error);

    // Try to update page status
    try {
      const body = await request.json();
      if (body.pageId) {
        await prisma.generatedPage.update({
          where: { id: body.pageId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    } catch (updateError) {
      console.error('Failed to update page status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'Failed to regenerate page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
