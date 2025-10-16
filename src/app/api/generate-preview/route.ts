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
import { getAdjectiveForRow } from '@/lib/adjectives';
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

    // Generate content for all pages (parallel for speed)
    const generatedPages = await Promise.all(
      pages.map(async (page: any, index: number) => {
        try {
          // Get deterministic adjective
          const adjective = getAdjectiveForRow(page.rowNumber);

          // Form primary keyword
          let primaryKeyword: string;
          if (page.customPrimaryKeyword) {
            primaryKeyword = page.customPrimaryKeyword;
          } else {
            if (page.service && page.location) {
              primaryKeyword = `${adjective} ${page.service} in ${page.location}`;
            } else if (page.service) {
              primaryKeyword = `${adjective} ${page.service}`;
            } else if (page.location) {
              primaryKeyword = `${adjective} ${page.location}`;
            } else {
              primaryKeyword = adjective;
            }
          }

          // Calculate link placements (for accurate preview)
          const omitMap = (page.omitSections || []).includes('Map');
          const { internalLinkPlacement, externalLinkPlacement } = determineLinkPlacements(
            page.rowNumber,
            pages.length,
            omitMap
          );

          // Build generation params
          const genParams: PageGenerationParams = {
            batchId: `preview_${Date.now()}`,
            pageType: page.pageType,
            companyName: client.clientName,
            companyWebsite: client.clientWebsite,
            service: page.service,
            location: page.location,
            primaryKeyword,
            omitSections: page.omitSections || [],
            seoPlugin: client.seoPlugin,
            internalLinkPlacement,
            externalLinkPlacement,
          };

          // Generate content using shared function
          const rawContent = await generateContent(genParams);

          // Validate and fix content using shared function
          const validationParams: ContentValidationParams = {
            ...genParams,
            previouslyUsedFAQs: [], // No FAQ uniqueness check in preview mode
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

          return {
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
        } catch (error) {
          console.error(`Error generating content for page ${page.rowNumber}:`, error);
          return {
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
        }
      })
    );

    // Create GeneratedPage records for history tracking
    const pageRecords = await Promise.all(
      generatedPages.map(async (genPage) => {
        try {
          const pageRecord = await prisma.generatedPage.create({
            data: {
              batchId: batch.id,
              pageName: genPage.pageName,
              pageType: genPage.rawData.pageType,
              service: genPage.service,
              location: genPage.location,
              parentSlug: genPage.rawData.parentSlug,
              rowNumber: genPage.rawData.rowNumber,
              status: genPage.status === 'ready' ? 'validating' : 'failed', // 'validating' = ready for review
              errorMessage: genPage.error,
              primaryKeyword: genPage.primaryKeyword,
              generatedContent: JSON.stringify(genPage.content),
              timeElapsed: 0, // Will be updated when published
            },
          });
          return { ...genPage, dbId: pageRecord.id }; // Add database ID to response
        } catch (dbError) {
          console.error('Failed to create page record:', dbError);
          return genPage; // Return original if DB insert fails
        }
      })
    );

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
      pages: pageRecords,
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
