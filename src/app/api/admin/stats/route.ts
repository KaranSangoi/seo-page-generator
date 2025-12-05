/**
 * Admin Stats API Endpoint
 * Provides system statistics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getQueueStats, getActiveJobs, checkQueueHealth } from '@/lib/simple-queue';
import { checkApiHealth } from '@/lib/claude-api';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

// Helper to check if user is admin
function isAdmin(userEmail: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim()) || [];
  return adminEmails.includes(userEmail);
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate and verify admin
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get('userId') || undefined;
    const errorPage = parseInt(searchParams.get('errorPage') || '1', 10);
    const errorLimit = parseInt(searchParams.get('errorLimit') || '20', 10);

    // Auto-delete error logs older than 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const deletedCount = await prisma.errorLog.deleteMany({
      where: {
        createdAt: {
          lt: threeDaysAgo,
        },
      },
    });

    if (deletedCount.count > 0) {
      console.log(`🗑️ Auto-deleted ${deletedCount.count} error logs older than 3 days`);
    }

    // Get system health
    const [apiHealthy, queueHealthy] = await Promise.all([
      checkApiHealth(),
      checkQueueHealth(),
    ]);

    // Check database health
    let dbHealthy = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Get queue stats
    const queueStats = await getQueueStats();

    // Get active jobs
    const activeJobs = await getActiveJobs();

    // Get usage stats (today, this week, this month)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build where clause for user filtering
    const userFilter = filterUserId ? { batch: { userId: filterUserId } } : {};
    const batchFilter = filterUserId ? { userId: filterUserId } : {};

    const [
      pagesToday,
      pagesWeek,
      pagesMonth,
      successToday,
      failedToday,
      recentBatches,
      totalErrors,
      recentErrors,
      activeUsers,
      allUsers,
    ] = await Promise.all([
      // Pages generated today
      prisma.generatedPage.count({
        where: {
          createdAt: { gte: todayStart },
          ...userFilter,
        },
      }),
      // Pages generated this week
      prisma.generatedPage.count({
        where: {
          createdAt: { gte: weekStart },
          ...userFilter,
        },
      }),
      // Pages generated this month
      prisma.generatedPage.count({
        where: {
          createdAt: { gte: monthStart },
          ...userFilter,
        },
      }),
      // Successful pages today
      prisma.generatedPage.count({
        where: {
          createdAt: { gte: todayStart },
          status: 'success',
          ...userFilter,
        },
      }),
      // Failed pages today
      prisma.generatedPage.count({
        where: {
          createdAt: { gte: todayStart },
          status: 'failed',
          ...userFilter,
        },
      }),
      // Recent batches
      prisma.generationBatch.findMany({
        take: 10,
        where: batchFilter,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          client: {
            select: {
              clientName: true,
            },
          },
        },
      }),
      // Total error count (for pagination)
      prisma.errorLog.count({
        where: filterUserId ? { userId: filterUserId } : {},
      }),
      // Recent errors (with pagination)
      prisma.errorLog.findMany({
        take: errorLimit,
        skip: (errorPage - 1) * errorLimit,
        where: filterUserId ? { userId: filterUserId } : {},
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          client: {
            select: {
              clientName: true,
            },
          },
        },
      }),
      // Active users (users with activity in last 24 hours)
      prisma.user.count({
        where: {
          generationBatches: {
            some: {
              createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            },
          },
        },
      }),
      // All users (for filter dropdown and user management)
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          isBlocked: true,
        },
        orderBy: {
          email: 'asc',
        },
      }),
    ]);

    // Calculate success rate
    const successRate = pagesToday > 0 ? (successToday / pagesToday) * 100 : 0;

    // Calculate average time per page (today)
    const avgTimeResult = await prisma.generatedPage.aggregate({
      where: {
        createdAt: { gte: todayStart },
        status: 'success',
        ...userFilter,
      },
      _avg: {
        timeElapsed: true,
      },
    });

    const avgTimePerPage = avgTimeResult._avg.timeElapsed || 0;

    // Estimate API cost (rough estimate: $0.015 per 1K tokens, ~4K tokens per page)
    const costPerPage = 0.06; // $0.06 per page (approximate)
    const costToday = pagesToday * costPerPage;
    const costMonth = pagesMonth * costPerPage;

    // Calculate pagination info
    const totalErrorPages = Math.ceil(totalErrors / errorLimit);

    return NextResponse.json({
      success: true,
      systemHealth: {
        claudeApi: apiHealthy,
        queue: queueHealthy,
        database: dbHealthy,
      },
      queue: {
        ...queueStats,
        activeJobs: activeJobs.map((job: any) => ({
          id: job.id,
          batchId: job.batchId,
          pageName: job.pageName,
          progress: job.progress,
          elapsed: Date.now() - job.timestamp,
        })),
      },
      usage: {
        today: {
          pages: pagesToday,
          successful: successToday,
          failed: failedToday,
          successRate: Math.round(successRate * 100) / 100,
          avgTimePerPage: Math.round(avgTimePerPage / 1000), // Convert to seconds
          estimatedCost: Math.round(costToday * 100) / 100,
        },
        week: {
          pages: pagesWeek,
        },
        month: {
          pages: pagesMonth,
          estimatedCost: Math.round(costMonth * 100) / 100,
        },
      },
      activity: {
        activeUsers,
        recentBatches: recentBatches.map((batch) => ({
          id: batch.id,
          userId: batch.user.id,
          user: batch.user.name || batch.user.email,
          client: batch.client.clientName,
          status: batch.status,
          totalPages: batch.totalPages,
          successfulPages: batch.successfulPages,
          failedPages: batch.failedPages,
          createdAt: batch.createdAt,
        })),
      },
      errors: {
        data: recentErrors.map((error) => ({
          id: error.id,
          userId: error.user.id,
          user: error.user.name || error.user.email,
          client: error.client?.clientName || 'N/A',
          type: error.errorType,
          message: error.errorMessage,
          createdAt: error.createdAt,
        })),
        pagination: {
          total: totalErrors,
          page: errorPage,
          limit: errorLimit,
          totalPages: totalErrorPages,
          hasNext: errorPage < totalErrorPages,
          hasPrev: errorPage > 1,
        },
      },
      users: allUsers.map((u) => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        isBlocked: u.isBlocked,
      })),
      filterUserId: filterUserId || null,
    });
  } catch (error) {
    console.error('Admin stats API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch admin stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
