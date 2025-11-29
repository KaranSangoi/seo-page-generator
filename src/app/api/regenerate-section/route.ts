/**
 * Regenerate Section API
 * Regenerates a specific section of content (FAQs, hero, bullets, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { regenerateField } from '@/lib/claude-api';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

/**
 * Calculate similarity between two strings using Jaccard similarity
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

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
      batchId, // ADDED: Need batch ID to fetch other FAQs
      internalLinkPlacement, // Link placement for company name linking
      externalLinkPlacement, // Link placement for city/location linking
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

    // Fetch other FAQs from the batch for uniqueness validation (only for FAQ regeneration)
    let previouslyUsedFAQs: string[] = [];
    if ((fieldToRegenerate === 'faqs' || fieldToRegenerate.startsWith('faq-')) && batchId) {
      console.log(`[REGENERATE] Fetching other FAQs from batch ${batchId} for uniqueness check...`);
      try {
        const otherPagesInBatch = await prisma.generatedPage.findMany({
          where: {
            batchId: batchId,
            generatedContent: { not: null },
          },
          select: {
            id: true,
            pageName: true,
            generatedContent: true,
            rowNumber: true,
          },
        });

        // Extract FAQ questions from other pages (exclude current page)
        for (const otherPage of otherPagesInBatch) {
          // Skip the current page if row numbers match
          if (otherPage.rowNumber === pageData.rowNumber) {
            continue;
          }

          try {
            if (otherPage.generatedContent) {
              const content = JSON.parse(otherPage.generatedContent as string);
              if (content.faqs && Array.isArray(content.faqs)) {
                content.faqs.forEach((faq: any) => {
                  if (faq.question) {
                    previouslyUsedFAQs.push(faq.question);
                  }
                });
              }
            }
          } catch (e) {
            console.warn(`[REGENERATE] Failed to parse content for page ${otherPage.id}:`, e);
          }
        }

        console.log(`[REGENERATE] Found ${previouslyUsedFAQs.length} previously used FAQs from ${otherPagesInBatch.length} pages`);
        if (previouslyUsedFAQs.length > 0) {
          console.log(`[REGENERATE] Previously used FAQs:`, previouslyUsedFAQs.map(q => q.substring(0, 60) + '...'));
        }
      } catch (error) {
        console.error('[REGENERATE] Failed to fetch other FAQs:', error);
        // Continue without uniqueness check
      }
    }

    // Regenerate with retry logic for FAQs
    const MAX_ATTEMPTS = 3;
    let regeneratedContent: any = null;
    let lastError: string = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`[REGENERATE] Attempt ${attempt}/${MAX_ATTEMPTS} for ${fieldToRegenerate}`);

      try {
        regeneratedContent = await regenerateField(
          {
            batchId: batchId || `regen_${Date.now()}`,
            pageType: pageData.pageType,
            companyName: client.clientName,
            companyWebsite: client.clientWebsite,
            service: pageData.service,
            location: pageData.location,
            primaryKeyword,
            omitSections: pageData.omitSections || [],
            seoPlugin: client.seoPlugin,
            previouslyUsedFAQs: previouslyUsedFAQs.length > 0 ? previouslyUsedFAQs : undefined,
            internalLinkPlacement, // Pass link placements for content regeneration
            externalLinkPlacement,
          },
          fieldToRegenerate,
          currentContent,
          attempt > 1 ? `User requested regeneration (retry ${attempt}): ${lastError}` : 'User requested regeneration'
        );

        // Validate FAQs if this is FAQ regeneration
        if (fieldToRegenerate === 'faqs' && regeneratedContent.faqs) {
          const validationErrors: string[] = [];
          const currentFAQs = currentContent.faqs || [];

          regeneratedContent.faqs.forEach((faq: any, idx: number) => {
            // Check 1: Company name should NOT be in the question
            const companyNameLower = client.clientName.toLowerCase();
            const questionLower = faq.question.toLowerCase();

            if (questionLower.includes(companyNameLower)) {
              validationErrors.push(`FAQ ${idx + 1} question contains company name "${client.clientName}"`);
            }

            // Check 2: Question should not be too similar to previously used FAQs in batch
            if (previouslyUsedFAQs.length > 0) {
              for (const usedFaq of previouslyUsedFAQs) {
                const similarity = calculateSimilarity(faq.question, usedFaq);
                if (similarity > 0.7) { // 70% similarity threshold
                  validationErrors.push(`FAQ ${idx + 1} question is too similar to existing FAQ in batch: "${usedFaq.substring(0, 60)}..."`);
                  break;
                }
              }
            }

            // Check 3: Question should not be too similar to current page's FAQs being replaced
            if (currentFAQs.length > 0) {
              for (const currentFaq of currentFAQs) {
                const similarity = calculateSimilarity(faq.question, currentFaq.question);
                if (similarity > 0.65) { // 65% threshold for same page (slightly lower to catch rephrases)
                  validationErrors.push(`FAQ ${idx + 1} question is too similar to current FAQ being replaced: "${currentFaq.question.substring(0, 60)}..."`);
                  break;
                }
              }
            }

            // Check 4: Answer should not be too similar to current page's FAQ answers (checking for topic diversity)
            if (currentFAQs.length > 0) {
              for (const currentFaq of currentFAQs) {
                const answerSimilarity = calculateSimilarity(faq.answer, currentFaq.answer);
                if (answerSimilarity > 0.6) { // 60% threshold for answer content
                  validationErrors.push(`FAQ ${idx + 1} answer is too similar to current FAQ answer (same topic). Generate DIFFERENT topic: "${currentFaq.question.substring(0, 60)}..."`);
                  break;
                }
              }
            }
          });

          if (validationErrors.length > 0) {
            lastError = validationErrors.join('; ');
            console.warn(`[REGENERATE] Validation failed (attempt ${attempt}):`, lastError);

            if (attempt === MAX_ATTEMPTS) {
              // Last attempt failed, return with warning
              return NextResponse.json(
                {
                  error: 'FAQ validation failed after multiple attempts',
                  details: lastError,
                },
                { status: 400 }
              );
            }

            // Continue to next attempt
            continue;
          }
        }

        // Validation passed or not applicable
        console.log(`[REGENERATE] Regeneration successful on attempt ${attempt}`);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[REGENERATE] Attempt ${attempt} failed:`, lastError);

        if (attempt === MAX_ATTEMPTS) {
          throw error; // Rethrow on last attempt
        }
      }
    }

    if (!regeneratedContent) {
      throw new Error('Failed to regenerate content after maximum attempts');
    }

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
