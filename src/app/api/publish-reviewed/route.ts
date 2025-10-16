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
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, pageData, generatedContent, primaryKeyword } = body;

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

    return NextResponse.json({
      success: true,
      pageUrl,
      message: 'Page published successfully',
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      {
        error: 'Failed to publish page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
