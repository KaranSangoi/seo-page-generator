/**
 * Admin Page Logs Endpoint
 * Get detailed logs for a specific page
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json({
        success: false,
        message: 'pageId parameter required'
      }, { status: 400 });
    }

    // Get page details
    const page = await prisma.generatedPage.findUnique({
      where: { id: pageId },
      include: {
        batch: {
          include: {
            user: { select: { name: true, email: true } },
            client: { select: { clientName: true } },
          },
        },
      },
    });

    if (!page) {
      return NextResponse.json({
        success: false,
        message: `Page ${pageId} not found`
      }, { status: 404 });
    }

    // Get all logs for this page
    const logs = await prisma.pageGenerationLog.findMany({
      where: { pageId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      page: {
        id: page.id,
        name: page.pageName,
        service: page.service,
        location: page.location,
        status: page.status,
        errorMessage: page.errorMessage,
        createdAt: page.createdAt,
        timeElapsed: page.timeElapsed,
        batch: {
          id: page.batch.id,
          status: page.batch.status,
          user: page.batch.user.name,
          client: page.batch.client.clientName,
        },
      },
      logs: logs.map(log => ({
        id: log.id,
        logLevel: log.logLevel,
        stage: log.stage,
        message: log.message,
        data: log.data ? JSON.parse(log.data) : null,
        duration: log.duration,
        createdAt: log.createdAt,
      })),
      summary: {
        totalLogs: logs.length,
        errorCount: logs.filter(l => l.logLevel === 'error').length,
        warnCount: logs.filter(l => l.logLevel === 'warn').length,
        stages: [...new Set(logs.map(l => l.stage))],
      },
    });
  } catch (error: any) {
    console.error('❌ Page logs query error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
