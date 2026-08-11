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
import { resolveLinkColor } from '@/lib/link-style';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

// WordPress API round-trips (template fetch, page create, SEO meta update) can
// take 20-60s on slow hosts. Default 15s Vercel timeout bites here.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let dbId: string | undefined;
  let clientId: string | undefined;

  try {
    user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pageData, generatedContent, primaryKeyword, externalLinkUrl } = body;
    clientId = body.clientId;
    dbId = body.dbId;

    if (!clientId || !pageData || !generatedContent) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    console.log(`[PUBLISH] 🚀 START user=${user.email} clientId=${clientId} pageRow=${pageData.rowNumber} service="${pageData.service}" location="${pageData.location}"`);

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

    // Fetch original batch size for proper link placement rotation
    // This ensures links follow the same pattern as during initial generation
    let batchSize = 1; // Default fallback
    let batchLinkColor: string | null = null; // Per-batch link color override
    if (dbId) {
      try {
        const page = await prisma.generatedPage.findUnique({
          where: { id: dbId },
          include: { batch: true },
        });
        if (page?.batch) {
          batchSize = page.batch.totalPages;
          batchLinkColor = page.batch.linkColor;
        }
      } catch (error) {
        console.warn('Could not fetch batch size, using default:', error);
      }
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
      // Business metadata for schema.org (optional)
      businessPhone: client.businessPhone ?? undefined,
      businessAddress: client.businessAddress ?? undefined,
      businessType: client.businessType ?? undefined,
      gbpUrl: client.gbpUrl ?? undefined,
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
      batchSize, // Use original batch size for proper link rotation
      externalLinkUrlOverride: externalLinkUrl, // User-edited external link URL
      // Per-batch override wins over client default; either may be null.
      linkColor: resolveLinkColor(batchLinkColor, client.linkColor),
    };

    // Publish using shared function (same logic as v1)
    const pageUrl = await publishToWordPress(publishParams);

    const publishSec = Math.floor((Date.now() - startTime) / 1000);
    console.log(`[PUBLISH] ✅ Published in ${publishSec}s → ${pageUrl}`);

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
        console.error('[PUBLISH] Failed to update page record:', dbError);
        // Don't fail the whole operation if DB update fails
      }
    }

    return NextResponse.json({
      success: true,
      pageUrl,
      message: 'Page published successfully',
    });
  } catch (error) {
    const totalSec = Math.floor((Date.now() - startTime) / 1000);
    const errMsg = error instanceof Error ? error.message : 'Publishing failed';
    console.error(`[PUBLISH] ❌ Failed after ${totalSec}s: ${errMsg}`);
    console.error(error);

    // Update page record with error (use dbId from request, not error object)
    if (dbId) {
      try {
        await prisma.generatedPage.update({
          where: { id: dbId },
          data: {
            status: 'failed',
            errorMessage: errMsg,
            timeElapsed: Date.now() - startTime,
          },
        });
      } catch (dbError) {
        console.error('[PUBLISH] Failed to update error in DB:', dbError);
      }
    }

    // Log to errorLog for admin visibility
    if (user) {
      try {
        await prisma.errorLog.create({
          data: {
            userId: user.id,
            clientId: clientId ?? null,
            errorType: 'publish',
            errorMessage: errMsg,
            stackTrace: error instanceof Error ? error.stack : null,
            context: JSON.stringify({
              dbId,
              endpoint: '/api/publish-reviewed',
              durationSec: totalSec,
              budgetSec: maxDuration,
            }),
          },
        });
      } catch (logErr) {
        console.error('[PUBLISH] Failed to write error log:', logErr);
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to publish page',
        details: errMsg,
      },
      { status: 500 }
    );
  }
}
