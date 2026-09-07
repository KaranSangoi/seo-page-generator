/**
 * Location Cards API
 * Manually (re)run the parent-page location-card step for a completed batch.
 * Useful for testing and for backfilling batches that were published before this
 * feature existed. Idempotent — existing cards are skipped.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addLocationCardsForBatch } from '@/lib/location-cards';

export const dynamic = 'force-dynamic';
// Image generation + WordPress round-trips can take a while for many towns.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const batchId: string | undefined = body?.batchId;
    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    // Verify the batch belongs to the current user before touching WordPress.
    const batch = await prisma.generationBatch.findFirst({
      where: { id: batchId, userId: user.id },
      select: { id: true },
    });
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const result = await addLocationCardsForBatch(batchId);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('[API location-cards] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message },
      { status: 500 },
    );
  }
}
