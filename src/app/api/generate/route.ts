/**
 * Generation API Endpoint
 * Accepts batch generation requests and adds them to the queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queueBatchGeneration } from '@/lib/simple-queue';
import { randomBytes } from 'crypto';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { clientId, pages } = body;

    if (!clientId || !pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. clientId and pages array are required.' },
        { status: 400 }
      );
    }

    // Verify client exists and user owns it
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or you do not have permission to access it.' },
        { status: 404 }
      );
    }

    // Generate batch ID
    const batchId = `batch_${Date.now()}_${randomBytes(8).toString('hex')}`;

    // Add rowNumber to each page if not present, include custom values
    const pagesWithRowNumber = pages.map((page, index) => ({
      pageType: page.pageType,
      service: page.service || '',
      location: page.location || '',
      parentSlug: page.parentSlug || '',
      externalLinkSection: page.externalLinkSection || '',
      omitSections: page.omitSections || [],
      rowNumber: page.rowNumber || index + 1,
      customSlug: page.customSlug, // Custom slug from user edit
      customPrimaryKeyword: page.customPrimaryKeyword, // Custom primary keyword from user edit
    }));

    // Queue the batch for processing
    await queueBatchGeneration({
      batchId,
      clientId,
      userId: user.id,
      pages: pagesWithRowNumber,
      clientData: {
        clientName: client.clientName,
        clientWebsite: client.clientWebsite,
        wordpressUrl: client.wordpressUrl,
        wpUsername: client.wpUsername,
        wpAppPassword: client.wpAppPassword,
        seoPlugin: client.seoPlugin,
        templatePageId: client.templatePageId,
        // Business metadata for schema.org (optional)
        businessPhone: client.businessPhone ?? undefined,
        businessAddress: client.businessAddress ?? undefined,
        businessType: client.businessType ?? undefined,
        gbpUrl: client.gbpUrl ?? undefined,
      },
    });

    return NextResponse.json({
      success: true,
      batchId,
      message: `Batch queued successfully. ${pages.length} pages will be generated.`,
    });
  } catch (error) {
    console.error('Generation API error:', error);

    // Try to log error to database if we have user context
    try {
      const user = await getCurrentUser();
      if (user) {
        await prisma.errorLog.create({
          data: {
            userId: user.id,
            errorType: 'api',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            stackTrace: error instanceof Error ? error.stack : null,
            context: JSON.stringify({ endpoint: '/api/generate' }),
          },
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      {
        error: 'Failed to queue generation batch',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get batch status
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get batch ID from query params
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    // Fetch batch from database
    const batch = await prisma.generationBatch.findFirst({
      where: {
        id: batchId,
        userId: user.id,
      },
      include: {
        generatedPages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      batch: {
        id: batch.id,
        status: batch.status,
        totalPages: batch.totalPages,
        successfulPages: batch.successfulPages,
        failedPages: batch.failedPages,
        pages: batch.generatedPages.map((page) => ({
          id: page.id,
          pageName: page.pageName,
          pageType: page.pageType,
          status: page.status,
          publishedUrl: page.publishedUrl,
          errorMessage: page.errorMessage,
          timeElapsed: page.timeElapsed,
          rowNumber: page.rowNumber,
        })),
      },
    });
  } catch (error) {
    console.error('Get batch status error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch batch status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
