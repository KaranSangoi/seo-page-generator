/**
 * Admin Error Logs Endpoint
 * Query ErrorLog table for debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const clientId = searchParams.get('clientId');
    const errorType = searchParams.get('errorType');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (errorType) where.errorType = errorType;

    // If batchId provided, find it in context
    if (batchId) {
      const errors = await prisma.errorLog.findMany({
        where: {
          ...where,
          context: {
            contains: batchId,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
          client: { select: { clientName: true } },
        },
      });

      return NextResponse.json({
        success: true,
        count: errors.length,
        errors: errors.map(err => ({
          id: err.id,
          errorType: err.errorType,
          errorMessage: err.errorMessage,
          context: err.context ? JSON.parse(err.context) : null,
          user: err.user.name,
          client: err.client?.clientName,
          createdAt: err.createdAt,
          stackTrace: err.stackTrace?.substring(0, 500), // Truncate for readability
        })),
      });
    }

    // Otherwise get recent errors
    const errors = await prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        client: { select: { clientName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      count: errors.length,
      errors: errors.map(err => ({
        id: err.id,
        errorType: err.errorType,
        errorMessage: err.errorMessage,
        context: err.context ? JSON.parse(err.context) : null,
        user: err.user.name,
        client: err.client?.clientName,
        createdAt: err.createdAt,
        stackTrace: err.stackTrace?.substring(0, 500),
      })),
    });
  } catch (error: any) {
    console.error('❌ Error logs query error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
