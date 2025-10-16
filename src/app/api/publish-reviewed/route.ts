/**
 * Publish Reviewed Content API
 * Publishes previously generated and reviewed content to WordPress
 *
 * V2 Feature: Uses shared page-generation.ts utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publishToWordPress, type PublishParams } from '@/lib/page-generation';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, pageData, generatedContent, primaryKeyword, dbId } = body;

    if (!clientId || !pageData || !generatedContent) {
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

    // Build publish params using shared function
    const publishParams: PublishParams = {
      wordpressUrl: client.wordpressUrl,
      wpUsername: client.wpUsername,
      wpAppPassword: client.wpAppPassword,
      templatePageId: client.templatePageId,
      seoPlugin: client.seoPlugin,
      clientName: client.clientName,
      clientWebsite: client.clientWebsite,
      pageData: {
        pageType: pageData.pageType,
        service: pageData.service,
        location: pageData.location,
        parentSlug: pageData.parentSlug,
        customSlug: pageData.customSlug,
        rowNumber: pageData.rowNumber || 1,
        omitSections: pageData.omitSections || [],
      },
      generatedContent,
      primaryKeyword,
      batchSize: 1, // Single page publish
    };

    // Publish using shared function (same logic as v1)
    const pageUrl = await publishToWordPress(publishParams);

    // Update page record in database if dbId provided
    if (dbId) {
      try {
        const timeElapsed = Date.now() - startTime;
        await prisma.generatedPage.update({
          where: { id: dbId },
          data: {
            publishedUrl: pageUrl,
            status: 'success',
            timeElapsed,
          },
        });
      } catch (dbError) {
        console.error('Failed to update page record:', dbError);
        // Don't fail the whole operation if DB update fails
      }
    }

    return NextResponse.json({
      success: true,
      pageUrl,
      message: 'Page published successfully',
    });
  } catch (error) {
    console.error('Publish error:', error);

    // Update page record with error if dbId provided
    if ((error as any).dbId) {
      try {
        await prisma.generatedPage.update({
          where: { id: (error as any).dbId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Publishing failed',
          },
        });
      } catch (dbError) {
        console.error('Failed to update error in DB:', dbError);
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to publish page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
