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
  type PageGenerationParams,
  type ContentValidationParams
} from '@/lib/page-generation';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, pages } = body;

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

          return {
            pageId: `preview_${page.rowNumber}`,
            pageName,
            service: page.service,
            location: page.location,
            primaryKeyword,
            content: validated.content,
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

    return NextResponse.json({
      success: true,
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
