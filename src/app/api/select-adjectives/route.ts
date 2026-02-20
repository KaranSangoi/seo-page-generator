/**
 * Select Adjectives API - Smart AI-powered adjective selection for batch pages
 * Makes a single lightweight AI call to pick unique, grammatically correct,
 * SEO-relevant adjectives for each page in the batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { selectAdjectivesForBatch } from '@/lib/claude-api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  pages: z.array(
    z.object({
      service: z.string().min(1),
      location: z.string().min(1),
      rowNumber: z.number().int().positive(),
    })
  ).min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = requestSchema.parse(body);

    const adjectives = await selectAdjectivesForBatch(validated.pages);

    return NextResponse.json({ success: true, adjectives });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Adjective selection error:', error);
    return NextResponse.json(
      {
        error: 'Failed to select adjectives',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
