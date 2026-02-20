/**
 * Generate Preview API - Content Generation WITHOUT Publishing
 * Generates all content for pages and returns for user review
 * Does not publish to WordPress - that happens after user approval
 *
 * V2 Feature: Uses shared page-generation.ts utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  generateContent,
  validateContent,
  getPageName,
  determineLinkPlacements,
  fetchSitemap,
  findRelevantPage,
  generateCityWebsiteUrl,
  type PageGenerationParams,
  type ContentValidationParams
} from '@/lib/page-generation';
import { getAdjectiveForRow } from '@/lib/adjectives';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, pages, csvFilename } = body;

    if (!clientId || !pages || !Array.isArray(pages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
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

    // Create generation batch for history tracking
    const batch = await prisma.generationBatch.create({
      data: {
        clientId: client.id,
        userId: user.id,
        csvFilename: csvFilename || `preview_${Date.now()}.csv`,
        totalPages: pages.length,
        status: 'in_progress',
      },
    });

    // Fetch sitemap once for all pages (for intelligent internal linking)
    const sitemap = await fetchSitemap(client.clientWebsite);

    // Generate content SEQUENTIALLY for FAQ uniqueness and better UX
    // User can review Page 1 while Page 2 is still generating!
    console.log(`[PREVIEW] Generating ${pages.length} pages sequentially for FAQ uniqueness...`);

    const generatedPages: any[] = [];
    const previouslyUsedFAQs: string[] = []; // Track FAQs across pages

    for (let index = 0; index < pages.length; index++) {
      const page = pages[index];

      try {
        console.log(`[PREVIEW] Generating page ${index + 1}/${pages.length}: ${page.service} in ${page.location}`);

        // Calculate link placements (for accurate preview)
        const omitMap = (page.omitSections || []).includes('Map');
        const { internalLinkPlacement, externalLinkPlacement } = determineLinkPlacements(
          page.rowNumber,
          pages.length,
          omitMap
        );

        // Determine adjective priority: user edit > AI-selected > static fallback
        let existingAdjective: string;
        if (page.customPrimaryKeyword) {
          // User manually edited the primary keyword — extract adjective from first word
          existingAdjective = page.customPrimaryKeyword.split(' ')[0];
        } else if (page.aiAdjective) {
          // AI-selected smart adjective (from /api/select-adjectives call)
          existingAdjective = page.aiAdjective;
        } else {
          // Static fallback from deterministic list
          existingAdjective = getAdjectiveForRow(page.rowNumber);
        }

        // Build generation params - adjective is pre-assigned for consistency with preview
        const genParams: PageGenerationParams = {
          batchId: batch.id, // Use actual batch ID for tracking
          pageType: page.pageType,
          companyName: client.clientName,
          companyWebsite: client.clientWebsite,
          service: page.service,
          location: page.location,
          primaryKeyword: '', // Will be constructed after generation using pre-assigned adjective
          omitSections: page.omitSections || [],
          seoPlugin: client.seoPlugin,
          internalLinkPlacement,
          externalLinkPlacement,
          previouslyUsedFAQs, // Pass FAQs from previous pages for uniqueness!
          existingAdjective, // Always pass pre-assigned adjective for consistency
        };

        // Generate content using shared function - AI selects appropriate adjective
        const rawContent = await generateContent(genParams);

        // Construct primary keyword using AI-selected adjective
        const selectedAdjective = rawContent.selectedAdjective || 'Professional';
        let primaryKeyword: string;
        if (page.customPrimaryKeyword) {
          primaryKeyword = page.customPrimaryKeyword;
        } else if (page.service && page.location) {
          primaryKeyword = `${selectedAdjective} ${page.service} in ${page.location}`;
        } else if (page.service) {
          primaryKeyword = `${selectedAdjective} ${page.service}`;
        } else if (page.location) {
          primaryKeyword = `${selectedAdjective} ${page.location}`;
        } else {
          primaryKeyword = selectedAdjective;
        }

        console.log(`[PREVIEW] AI selected adjective: "${selectedAdjective}" -> Primary keyword: "${primaryKeyword}"`);

        // Update genParams with actual primary keyword for validation
        genParams.primaryKeyword = primaryKeyword;

        // Validate and fix content using shared function
        const validationParams: ContentValidationParams = {
          ...genParams,
          previouslyUsedFAQs, // Include for validation too
        };
        const validated = await validateContent(rawContent, validationParams);

        // Get page name using shared function
        const pageName = getPageName(page.pageType, page.service, page.location);

        // Determine internal link URL (40% homepage, 60% contextual pages)
        let internalLinkUrl = client.clientWebsite; // default to homepage
        const rotation = page.rowNumber % 5;

        if (rotation >= 1 && rotation <= 3 && sitemap.length > 0) {
          // Use contextual page for rotations 1, 2, 3
          const relevantPage = findRelevantPage(sitemap, page.service, page.location);
          if (relevantPage) {
            internalLinkUrl = relevantPage;
          }
        }

        // Determine external link URL (city website)
        const externalLinkUrl = generateCityWebsiteUrl(page.location);

        const generatedPage: {
          pageId: string;
          pageName: string;
          service: string;
          location: string;
          primaryKeyword: string;
          content: any;
          internalLinkPlacement: string;
          internalLinkUrl: string;
          externalLinkPlacement: string;
          externalLinkUrl: string;
          rawData: any;
          status: string;
          warnings: string[];
          autoFixed: string[];
          dbId?: string;
        } = {
          pageId: `preview_${page.rowNumber}`,
          pageName,
          service: page.service,
          location: page.location,
          primaryKeyword,
          content: validated.content,
          internalLinkPlacement,
          internalLinkUrl,
          externalLinkPlacement,
          externalLinkUrl,
          rawData: page, // Store original page data for later publishing
          status: 'ready', // Ready for review
          warnings: validated.warnings,
          autoFixed: validated.autoFixed,
        };

        generatedPages.push(generatedPage);

        // Save to database immediately for progressive UI updates
        try {
          const pageRecord = await prisma.generatedPage.create({
            data: {
              batchId: batch.id,
              pageName: generatedPage.pageName,
              pageType: page.pageType,
              service: page.service,
              location: page.location,
              parentSlug: page.parentSlug,
              rowNumber: page.rowNumber,
              status: 'validating', // 'validating' = ready for review in preview mode
              primaryKeyword,
              generatedContent: JSON.stringify(generatedPage.content),
              timeElapsed: 0, // Will be updated when published
            },
          });
          generatedPage.dbId = pageRecord.id; // Add DB ID to the object
          console.log(`[PREVIEW] 💾 Saved page ${index + 1} to database (ID: ${pageRecord.id})`);
        } catch (dbError) {
          console.error(`[PREVIEW] Failed to save page ${index + 1} to database:`, dbError);
        }

        // Extract FAQs from this page and add to previouslyUsedFAQs for next page
        if (validated.content.faqs && Array.isArray(validated.content.faqs)) {
          const newFAQs = validated.content.faqs.map((faq: any) => faq.question);
          previouslyUsedFAQs.push(...newFAQs);
          console.log(`[PREVIEW] Stored ${newFAQs.length} FAQs from page ${index + 1}. Total tracked: ${previouslyUsedFAQs.length}`);
        }

        console.log(`[PREVIEW] ✅ Page ${index + 1}/${pages.length} generated successfully`);

      } catch (error) {
        console.error(`[PREVIEW] ❌ Error generating page ${index + 1}:`, error);
        const failedPage: {
          pageId: string;
          pageName: string;
          service: string;
          location: string;
          primaryKeyword: string;
          content: null;
          rawData: any;
          status: string;
          error: string;
          dbId?: string;
        } = {
          pageId: `preview_${page.rowNumber}`,
          pageName: page.service || page.location || 'Unknown',
          service: page.service,
          location: page.location,
          primaryKeyword: '',
          content: null,
          rawData: page,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Failed to generate content',
        };
        generatedPages.push(failedPage);

        // Save failed page to database immediately for UI updates
        try {
          const pageRecord = await prisma.generatedPage.create({
            data: {
              batchId: batch.id,
              pageName: failedPage.pageName,
              pageType: page.pageType,
              service: page.service,
              location: page.location,
              parentSlug: page.parentSlug,
              rowNumber: page.rowNumber,
              status: 'failed',
              errorMessage: failedPage.error,
              primaryKeyword: '',
              generatedContent: null,
              timeElapsed: 0,
            },
          });
          failedPage.dbId = pageRecord.id;
          console.log(`[PREVIEW] 💾 Saved failed page ${index + 1} to database`);
        } catch (dbError) {
          console.error(`[PREVIEW] Failed to save failed page to database:`, dbError);
        }
      }
    }

    console.log(`[PREVIEW] ✅ All ${pages.length} pages generated!`);

    // Pages are already saved to database as they completed (progressive saves)
    // generatedPages array now has dbId for each page

    // Count successful and failed pages
    const successfulPages = generatedPages.filter(p => p.status === 'ready').length;
    const failedPages = generatedPages.filter(p => p.status === 'failed').length;
    const timeTakenSeconds = Math.floor((Date.now() - startTime) / 1000);

    // Update batch with stats
    await prisma.generationBatch.update({
      where: { id: batch.id },
      data: {
        successfulPages,
        failedPages,
        timeTakenSeconds,
        status: failedPages === generatedPages.length ? 'failed' : 'completed',
      },
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id, // Return batch ID for publishing
      pages: generatedPages,
      message: 'Content generated successfully. Review and publish when ready.',
    });
  } catch (error) {
    console.error('Preview generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate preview',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
