/**
 * Regenerate API Endpoint
 * Allows regenerating a single failed page
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePageContent, validateContent } from '@/lib/claude-api';
import { randomBytes } from 'crypto';

// Helper function to generate slug
function generateSlug(pageType: string, service: string, location: string): string {
  const isBroadStroke = pageType === 'Broad Stroke' || pageType === 'Nested Broad Stroke';
  const slugSource = isBroadStroke ? location : service;
  return slugSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to get parent page ID
async function getParentPageId(wordpressUrl: string, parentSlug: string, credentials: string): Promise<number | null> {
  if (!parentSlug) return null;

  try {
    const searchUrl = `${wordpressUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(parentSlug)}`;
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok) return null;

    const pages = await response.json();
    return pages.length > 0 ? pages[0].id : null;
  } catch (error) {
    console.error('Error fetching parent page:', error);
    return null;
  }
}

// Helper function to fetch Elementor template
async function fetchElementorTemplate(wordpressUrl: string, templatePageId: string, credentials: string): Promise<any | null> {
  if (!templatePageId) return null;

  try {
    const templateUrl = `${wordpressUrl}/wp-json/wp/v2/pages/${templatePageId}?context=edit`;
    const response = await fetch(templateUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch template page: ${response.statusText}`);
      return null;
    }

    const templatePage = await response.json();
    const elementorData = templatePage.meta?._elementor_data;
    if (!elementorData) {
      console.error('No Elementor data found in template page');
      return null;
    }

    return typeof elementorData === 'string' ? JSON.parse(elementorData) : elementorData;
  } catch (error) {
    console.error('Error fetching Elementor template:', error);
    return null;
  }
}

// Helper function to insert internal link
function insertInternalLink(text: string, parentPageUrl: string, service: string): string {
  if (!text || !parentPageUrl || !service) return text;

  const linkText = `<a href="${parentPageUrl}">${service}</a>`;
  const servicePattern = new RegExp(`\\b${service}\\b`, 'i');

  if (servicePattern.test(text)) {
    return text.replace(servicePattern, linkText);
  }

  return text + ` Learn more about our <a href="${parentPageUrl}">${service}</a> services.`;
}

// Helper function to replace Elementor content
function replaceElementorContent(
  elementorData: any,
  generatedContent: any,
  location?: string,
  parentPageUrl?: string,
  service?: string,
  rowNumber?: number
): any {
  if (!elementorData || !Array.isArray(elementorData)) return elementorData;

  const clonedData = JSON.parse(JSON.stringify(elementorData));

  // Determine which section gets the internal link (rotate: hero=0, faq=1, map=2)
  const internalLinkSection = rowNumber ? rowNumber % 3 : 0;

  function replaceInElement(element: any): void {
    if (!element || typeof element !== 'object') return;

    if (element.settings) {
      const cssId = element.settings._element_id || element.settings.css_id || '';

      if (cssId.includes('hero') || cssId.includes('h1')) {
        if (element.widgetType === 'heading' || element.elType === 'widget') {
          if (element.settings.title) {
            element.settings.title = generatedContent.h1;
          }
        }
        if (element.widgetType === 'text-editor') {
          if (element.settings.editor) {
            let content = generatedContent.heroDescription;
            if (internalLinkSection === 0 && parentPageUrl && service) {
              content = insertInternalLink(content, parentPageUrl, service);
            }
            element.settings.editor = content;
          }
        }
      } else if (cssId.includes('benefits')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          element.settings.title = generatedContent.benefitsHeading;
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.benefitsSubheading;
          } else if (cssId.includes('bullet')) {
            const bulletIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
            if (generatedContent.benefitsBullets[bulletIndex]) {
              element.settings.editor = generatedContent.benefitsBullets[bulletIndex];
            }
          }
        }
      } else if (cssId.includes('why')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          element.settings.title = generatedContent.whyHeading;
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.whySubheading;
          } else if (cssId.includes('bullet')) {
            const bulletIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
            if (generatedContent.whyBullets[bulletIndex]) {
              element.settings.editor = generatedContent.whyBullets[bulletIndex];
            }
          }
        }
      } else if (cssId.includes('faq')) {
        // Handle FAQ section - check by ID first, then adapt to structure

        // If this is the main FAQ container (ID contains 'questions')
        if (cssId.includes('questions')) {
          console.log('[REGENERATE DEBUG] Found FAQ container:', {
            cssId: cssId,
            widgetType: element.widgetType,
            hasSettings: !!element.settings,
            settingsKeys: element.settings ? Object.keys(element.settings) : [],
            hasTabs: !!element.settings.tabs,
            hasItems: !!element.settings.items,
          });

          // Check if it uses tabs structure (classic accordion/toggle)
          if (element.settings.tabs && Array.isArray(element.settings.tabs)) {
            console.log('[REGENERATE DEBUG] FAQ uses tabs structure (classic accordion), updating tabs...');
            element.settings.tabs.forEach((tab: any, index: number) => {
              if (generatedContent.faqs[index]) {
                tab.tab_title = generatedContent.faqs[index].question;
                let content = generatedContent.faqs[index].answer;
                if (internalLinkSection === 1 && index === 0 && parentPageUrl && service) {
                  content = insertInternalLink(content, parentPageUrl, service);
                }
                tab.tab_content = content;
                console.log(`[REGENERATE DEBUG] Updated FAQ ${index} in tabs`);
              }
            });
          }
          // Check if it uses items structure (nested-accordion might use this)
          else if (element.settings.items && Array.isArray(element.settings.items)) {
            console.log('[REGENERATE DEBUG] FAQ uses items structure, updating items...');
            element.settings.items.forEach((item: any, index: number) => {
              if (generatedContent.faqs[index]) {
                console.log(`[REGENERATE DEBUG] Item ${index} keys:`, Object.keys(item));
                // Try different possible field names
                if (item.item_title !== undefined) item.item_title = generatedContent.faqs[index].question;
                if (item.item_content !== undefined) item.item_content = generatedContent.faqs[index].answer;
                if (item.title !== undefined) item.title = generatedContent.faqs[index].question;
                if (item.content !== undefined) item.content = generatedContent.faqs[index].answer;
                console.log(`[REGENERATE DEBUG] Updated FAQ ${index} in items`);
              }
            });
          } else {
            console.log('[REGENERATE DEBUG] FAQ container found but unknown structure');
            console.log('[REGENERATE DEBUG] Full settings keys:', element.settings ? Object.keys(element.settings) : 'none');
          }
        }
        // Handle individual FAQ items (separate IDs for each question/answer)
        else {
          const faqIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
          if (generatedContent.faqs[faqIndex]) {
            if (element.widgetType === 'heading' && cssId.includes('question')) {
              console.log(`[REGENERATE DEBUG] Updating individual FAQ ${faqIndex} question`);
              element.settings.title = generatedContent.faqs[faqIndex].question;
            }
            if (element.widgetType === 'text-editor' && cssId.includes('answer')) {
              console.log(`[REGENERATE DEBUG] Updating individual FAQ ${faqIndex} answer`);
              let content = generatedContent.faqs[faqIndex].answer;
              if (internalLinkSection === 1 && faqIndex === 0 && parentPageUrl && service) {
                content = insertInternalLink(content, parentPageUrl, service);
              }
              element.settings.editor = content;
            }
          }
        }
      } else if (cssId.includes('map')) {
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          let content = generatedContent.mapDescription || '';
          if (internalLinkSection === 2 && parentPageUrl && service) {
            content = insertInternalLink(content, parentPageUrl, service);
          }
          element.settings.editor = content;
        }
      }

      // Replace Google Maps iframe in custom HTML widget
      if (cssId.includes('map-iframe') && element.widgetType === 'html' && location) {
        if (element.settings.html) {
          const encodedLocation = encodeURIComponent(location);
          const iframeRegex = /(<iframe[^>]*src=")([^"]*)(")/gi;
          element.settings.html = element.settings.html.replace(iframeRegex, (match: string, prefix: string, oldSrc: string, suffix: string) => {
            const simpleMapUrl = `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
            return prefix + simpleMapUrl + suffix;
          });
        }
      }
    }

    if (element.elements && Array.isArray(element.elements)) {
      element.elements.forEach(replaceInElement);
    }
  }

  clonedData.forEach(replaceInElement);
  return clonedData;
}

// Helper function to publish to WordPress
async function publishToWordPress(params: {
  wordpressUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  templatePageId: string;
  pageType: string;
  service: string;
  location: string;
  parentSlug: string;
  generatedContent: any;
  primaryKeyword: string;
  seoPlugin: string;
}): Promise<string> {
  const { wordpressUrl, wpUsername, wpAppPassword, templatePageId, pageType, service, location, parentSlug, generatedContent, primaryKeyword, seoPlugin } = params;

  const wpApiUrl = `${wordpressUrl}/wp-json/wp/v2/pages`;
  const credentials = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');

  // Get parent page ID if parent slug is provided
  let parentId: number | null = null;
  if (parentSlug) {
    parentId = await getParentPageId(wordpressUrl, parentSlug, credentials);
  }

  // Generate slug based on page type
  const slug = generateSlug(pageType, service, location);

  // Fetch Elementor template
  const elementorTemplate = await fetchElementorTemplate(wordpressUrl, templatePageId, credentials);

  // Build page payload
  const pagePayload: any = {
    title: generatedContent.h1,
    slug: slug,
    status: 'publish',
    meta: {
      ...(seoPlugin === 'yoast' ? {
        _yoast_wpseo_title: generatedContent.metaTitle,
        _yoast_wpseo_metadesc: generatedContent.metaDescription,
        _yoast_wpseo_focuskw: primaryKeyword,
      } : {
        rank_math_title: generatedContent.metaTitle,
        rank_math_description: generatedContent.metaDescription,
        rank_math_focus_keyword: primaryKeyword,
      }),
    },
  };

  // Fetch full template page to duplicate it properly
  try {
    const fullTemplateUrl = `${wordpressUrl}/wp-json/wp/v2/pages/${templatePageId}?context=edit`;
    const fullTemplateResponse = await fetch(fullTemplateUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!fullTemplateResponse.ok) {
      throw new Error('Failed to fetch full template page');
    }

    const fullTemplatePage = await fullTemplateResponse.json();

    // Get parent page URL for internal linking
    let parentPageUrl = '';
    if (parentSlug) {
      parentPageUrl = `${wordpressUrl}/${parentSlug}`;
    }

    // If Elementor template exists, use it
    if (elementorTemplate) {
      const updatedElementorData = replaceElementorContent(
        elementorTemplate,
        generatedContent,
        location,
        parentPageUrl,
        service,
        undefined // No row number for regenerated pages (internal link rotation not applicable)
      );

      // Copy all template settings
      pagePayload.content = fullTemplatePage.content?.rendered || '';
      pagePayload.excerpt = generatedContent.metaDescription; // Set excerpt to meta description for WordPress SEO
      pagePayload.featured_media = fullTemplatePage.featured_media || 0;
      pagePayload.comment_status = fullTemplatePage.comment_status || 'closed';
      pagePayload.ping_status = fullTemplatePage.ping_status || 'closed';
      pagePayload.template = fullTemplatePage.template || '';

      // Copy all meta and update Elementor data
      pagePayload.meta = {
        ...fullTemplatePage.meta,
        ...pagePayload.meta,
        _elementor_data: JSON.stringify(updatedElementorData),
        _elementor_edit_mode: 'builder',
        _elementor_template_type: 'wp-page',
        _elementor_version: fullTemplatePage.meta?._elementor_version || '3.25.0',
        _wp_page_template: fullTemplatePage.meta?._wp_page_template || 'elementor_canvas',
      };
    } else {
      // Fallback to plain HTML
      console.warn('No Elementor template found, using plain HTML');
      pagePayload.content = `
      <div class="hero">
        <h1>${generatedContent.h1}</h1>
        <p>${generatedContent.heroDescription}</p>
      </div>
      ${generatedContent.benefitsHeading ? `
      <div class="benefits">
        <h2>${generatedContent.benefitsHeading}</h2>
        <p>${generatedContent.benefitsSubheading}</p>
        <ul>
          ${generatedContent.benefitsBullets.map((bullet: string) => `<li>${bullet}</li>`).join('\n')}
        </ul>
      </div>` : ''}
      ${generatedContent.whyHeading ? `
      <div class="why">
        <h2>${generatedContent.whyHeading}</h2>
        <p>${generatedContent.whySubheading}</p>
        <ul>
          ${generatedContent.whyBullets.map((bullet: string) => `<li>${bullet}</li>`).join('\n')}
        </ul>
      </div>` : ''}
      ${generatedContent.faqs && generatedContent.faqs.length > 0 ? `
      <div class="faqs">
        <h2>Frequently Asked Questions</h2>
        ${generatedContent.faqs.map((faq: any) => `
          <div class="faq">
            <h3>${faq.question}</h3>
            <p>${faq.answer}</p>
          </div>
        `).join('\n')}
      </div>` : ''}
      ${generatedContent.mapDescription ? `
      <div class="map">
        <p>${generatedContent.mapDescription}</p>
      </div>` : ''}
    `;
    }
  } catch (fetchError) {
    console.error('Error fetching full template page:', fetchError);
    // Continue with basic pagePayload already defined
  }

  // Add parent if found
  if (parentId) {
    pagePayload.parent = parentId;
  }

  const response = await fetch(wpApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pagePayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WordPress API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // ✅ Immediately update Yoast SEO fields (REST-only, no PHP needed)
if (seoPlugin === 'yoast') {
  try {
    await fetch(`${wordpressUrl}/wp-json/wp/v2/pages/${result.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meta: {
          _yoast_wpseo_title: generatedContent.metaTitle,
          _yoast_wpseo_metadesc: generatedContent.metaDescription,
          _yoast_wpseo_focuskw: primaryKeyword,
        },
      }),
    });
  } catch (e) {
    console.warn('Yoast meta update failed:', e);
  }
}

  return result.link || result.guid?.rendered || 'Unknown URL';


}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { pageId } = body;

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // Fetch page from database
    const page = await prisma.generatedPage.findUnique({
      where: { id: pageId },
      include: {
        batch: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!page || !page.batch || !page.batch.client) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Verify user owns this page
    if (page.batch.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const client = page.batch.client;

    // Update status to generating
    await prisma.generatedPage.update({
      where: { id: pageId },
      data: { status: 'generating', errorMessage: null },
    });

    const startTime = Date.now();

    // Reuse original adjective if available, otherwise use deterministic selection
    let adjective: string;
    if (page.primaryKeyword) {
      // Extract adjective from stored primaryKeyword (first word)
      const words = page.primaryKeyword.split(' ');
      adjective = words[0];
      console.log(`[REGENERATE] Reusing original adjective: "${adjective}" from primary keyword: "${page.primaryKeyword}"`);
    } else {
      // Fallback: Use deterministic adjective based on row number if primaryKeyword not stored
      const { getAdjectiveForRow } = await import('@/lib/adjectives');
      adjective = getAdjectiveForRow(page.rowNumber || 1);
      console.log(`[REGENERATE] Using deterministic adjective: "${adjective}" for row ${page.rowNumber || 1}`);
    }

    // Form primary keyword
    let primaryKeyword: string;
    if (page.service && page.location) {
      primaryKeyword = `${adjective} ${page.service} in ${page.location}`;
    } else if (page.service) {
      primaryKeyword = `${adjective} ${page.service}`;
    } else if (page.location) {
      primaryKeyword = `${adjective} ${page.location}`;
    } else {
      primaryKeyword = adjective;
    }

    // Generate content
    const generatedContent = await generatePageContent({
      batchId: page.batchId,
      pageType: page.pageType,
      companyName: client.clientName,
      companyWebsite: client.clientWebsite,
      service: page.service || '',
      location: page.location || '',
      primaryKeyword,
      omitSections: [], // TODO: Store this in DB
      seoPlugin: client.seoPlugin,
    });

    // Update status to validating
    await prisma.generatedPage.update({
      where: { id: pageId },
      data: { status: 'validating' },
    });

    // Validate content (warnings only)
    const validation = validateContent(generatedContent, []);
    if (!validation.isValid) {
      console.warn(`⚠️ Validation warnings for ${page.pageName}:`, validation.errors);
      // Log warnings but continue
      await prisma.errorLog.create({
        data: {
          userId: user.id,
          clientId: client.id,
          errorType: 'validation_warning',
          errorMessage: `Validation warnings: ${validation.errors.join(', ')}`,
          stackTrace: null,
          context: JSON.stringify({
            batchId: page.batchId,
            pageName: page.pageName,
            pageId: page.id,
          }),
        },
      });
    }

    // Update status to publishing
    await prisma.generatedPage.update({
      where: { id: pageId },
      data: { status: 'publishing' },
    });

    // Publish to WordPress
    const publishedUrl = await publishToWordPress({
      wordpressUrl: client.wordpressUrl,
      wpUsername: client.wpUsername,
      wpAppPassword: client.wpAppPassword,
      templatePageId: client.templatePageId,
      pageType: page.pageType,
      service: page.service || '',
      location: page.location || '',
      parentSlug: page.parentSlug || '',
      generatedContent,
      primaryKeyword,
      seoPlugin: client.seoPlugin,
    });

    // Mark as success
    await prisma.generatedPage.update({
      where: { id: pageId },
      data: {
        status: 'success',
        publishedUrl,
        primaryKeyword,
        generatedContent: JSON.stringify(generatedContent),
        timeElapsed: Date.now() - startTime,
        errorMessage: null,
      },
    });

    return NextResponse.json({
      success: true,
      page: {
        id: page.id,
        pageName: page.pageName,
        status: 'success',
        publishedUrl,
        timeElapsed: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Regeneration error:', error);

    // Try to update page status
    try {
      const body = await request.json();
      if (body.pageId) {
        await prisma.generatedPage.update({
          where: { id: body.pageId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    } catch (updateError) {
      console.error('Failed to update page status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'Failed to regenerate page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
