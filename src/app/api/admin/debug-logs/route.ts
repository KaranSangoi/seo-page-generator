/**
 * Admin Debug Logs Endpoint
 * Query logs for stuck batches and pages to debug Ibrahim's issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userName = searchParams.get('userName');
    const clientName = searchParams.get('clientName');
    const status = searchParams.get('status');

    console.log('🔍 Debug Logs Query:', { userName, clientName, status });

    // Find user by name (case insensitive)
    let user = null;
    if (userName) {
      user = await prisma.user.findFirst({
        where: {
          name: {
            contains: userName,
            mode: 'insensitive',
          },
        },
      });

      if (!user) {
        return NextResponse.json({
          success: false,
          message: `User "${userName}" not found`
        });
      }
    }

    // Find batches with stuck pages
    const batchesQuery: any = {};
    if (user) batchesQuery.userId = user.id;
    if (status) batchesQuery.status = status;

    const batches = await prisma.generationBatch.findMany({
      where: batchesQuery,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            clientName: true,
          },
        },
        generatedPages: {
          select: {
            id: true,
            pageName: true,
            service: true,
            location: true,
            status: true,
            errorMessage: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    // Analyze each batch for stuck pages
    const analysis = batches.map(batch => {
      const stuckPages = batch.generatedPages.filter(
        p => ['pending', 'generating', 'validating', 'publishing'].includes(p.status)
      );

      const successPages = batch.generatedPages.filter(p => p.status === 'success');
      const failedPages = batch.generatedPages.filter(p => p.status === 'failed');

      return {
        batchId: batch.id,
        user: batch.user.name,
        client: batch.client.clientName,
        batchStatus: batch.status,
        totalPages: batch.totalPages,
        createdAt: batch.createdAt,
        stats: {
          success: successPages.length,
          failed: failedPages.length,
          stuck: stuckPages.length,
        },
        stuckPages: stuckPages.map(p => ({
          id: p.id,
          name: p.pageName,
          service: p.service,
          location: p.location,
          status: p.status,
          error: p.errorMessage,
          createdAt: p.createdAt,
        })),
        // Flag: Batch marked "completed" but has stuck pages
        isInconsistent: batch.status === 'completed' && stuckPages.length > 0,
      };
    });

    // Get error logs for stuck pages
    const stuckPageIds = analysis
      .flatMap(a => a.stuckPages)
      .map(p => p.id);

    const errorLogs = await prisma.pageGenerationLog.findMany({
      where: {
        pageId: { in: stuckPageIds },
        logLevel: { in: ['error', 'warn'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      include: {
        page: {
          select: {
            pageName: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalBatches: batches.length,
        inconsistentBatches: analysis.filter(a => a.isInconsistent).length,
        totalStuckPages: analysis.reduce((sum, a) => sum + a.stats.stuck, 0),
      },
      batches: analysis,
      errorLogs: errorLogs.map(log => ({
        pageId: log.pageId,
        pageName: log.page.pageName,
        pageStatus: log.page.status,
        logLevel: log.logLevel,
        stage: log.stage,
        message: log.message,
        data: log.data ? JSON.parse(log.data) : null,
        createdAt: log.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('❌ Debug logs query error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
