/**
 * Regenerate Section API
 * Regenerates a specific section of content (FAQs, hero, bullets, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { regenerateField } from '@/lib/claude-api';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientId,
      pageData,
      currentContent,
      sectionToRegenerate,
      primaryKeyword,
    } = body;

    if (!clientId || !pageData || !currentContent || !sectionToRegenerate) {
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

    // Map section names to field names
    const sectionFieldMap: Record<string, 'faqs' | 'mapDescription' | 'heroDescription' | 'bullets'> = {
      'meta': 'faqs', // Not supported for regeneration yet
      'hero': 'heroDescription',
      'benefits': 'bullets',
      'why': 'bullets',
      'faqs': 'faqs',
      'map': 'mapDescription',
    };

    const fieldToRegenerate = sectionFieldMap[sectionToRegenerate];

    if (!fieldToRegenerate) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    // Regenerate the specific field
    const regeneratedContent = await regenerateField(
      {
        batchId: `regen_${Date.now()}`,
        pageType: pageData.pageType,
        companyName: client.clientName,
        companyWebsite: client.clientWebsite,
        service: pageData.service,
        location: pageData.location,
        primaryKeyword,
        omitSections: pageData.omitSections || [],
        seoPlugin: client.seoPlugin,
      },
      fieldToRegenerate,
      currentContent,
      'User requested regeneration'
    );

    // Merge regenerated content with current content
    const updatedContent = {
      ...currentContent,
      ...regeneratedContent,
    };

    return NextResponse.json({
      success: true,
      content: updatedContent,
      message: `${sectionToRegenerate} regenerated successfully`,
    });
  } catch (error) {
    console.error('Regeneration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to regenerate section',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
