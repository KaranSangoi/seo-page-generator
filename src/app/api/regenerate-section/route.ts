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

    // Map section names to field names (for backward compatibility with whole-section regeneration)
    const sectionFieldMap: Record<string, string> = {
      'meta': 'meta', // Will regenerate both metaTitle and metaDescription
      'hero': 'heroDescription',
      'benefits': 'bullets',
      'why': 'bullets',
      'faqs': 'faqs',
      'map': 'mapDescription',
    };

    // Determine field to regenerate: use direct field name if it looks specific, otherwise map section name
    let fieldToRegenerate = sectionToRegenerate;

    // Check if this is a section-level regeneration or field-level
    if (sectionFieldMap[sectionToRegenerate]) {
      fieldToRegenerate = sectionFieldMap[sectionToRegenerate];
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
    let updatedContent = { ...currentContent };

    // Handle different regeneration types
    if (fieldToRegenerate.startsWith('benefitsBullet-')) {
      // Individual benefits bullet
      const bulletIndex = parseInt(fieldToRegenerate.split('-')[1]) - 1;
      updatedContent.benefitsBullets = [...currentContent.benefitsBullets];
      updatedContent.benefitsBullets[bulletIndex] = regeneratedContent.benefitsBullet;
    } else if (fieldToRegenerate.startsWith('whyBullet-')) {
      // Individual why bullet
      const bulletIndex = parseInt(fieldToRegenerate.split('-')[1]) - 1;
      updatedContent.whyBullets = [...currentContent.whyBullets];
      updatedContent.whyBullets[bulletIndex] = regeneratedContent.whyBullet;
    } else if (fieldToRegenerate.startsWith('faq-')) {
      // Individual FAQ
      const faqIndex = parseInt(fieldToRegenerate.split('-')[1]) - 1;
      updatedContent.faqs = [...currentContent.faqs];
      updatedContent.faqs[faqIndex] = regeneratedContent.faq;
    } else {
      // Whole section or simple field
      updatedContent = {
        ...currentContent,
        ...regeneratedContent,
      };
    }

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
