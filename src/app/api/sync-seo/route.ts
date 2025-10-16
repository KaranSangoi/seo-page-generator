/**
 * Sync SEO UI API
 * Re-saves a page to force Yoast/Rank Math UI to recognize and display SEO fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { pageUrl, clientId } = body;

    if (!pageUrl || !clientId) {
      return NextResponse.json({ error: 'pageUrl and clientId are required' }, { status: 400 });
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

    // WordPress credentials
    const credentials = Buffer.from(`${client.wpUsername}:${client.wpAppPassword}`).toString('base64');

    // Extract page ID from URL or slug
    let pageId: number | null = null;

    try {
      // Try to get page by URL
      const urlParts = pageUrl.split('/').filter(Boolean);
      const slug = urlParts[urlParts.length - 1];

      const searchUrl = `${client.wordpressUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&context=edit`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      if (!searchResponse.ok) {
        throw new Error('Page not found');
      }

      const pages = await searchResponse.json();
      if (pages.length === 0) {
        throw new Error('Page not found');
      }

      pageId = pages[0].id;
    } catch (error) {
      return NextResponse.json(
        { error: 'Could not find page. Please ensure the page URL is correct.' },
        { status: 404 }
      );
    }

    // Fetch the page to get its SEO fields
    const pageUrl_api = `${client.wordpressUrl}/wp-json/wp/v2/pages/${pageId}?context=edit`;
    const pageResponse = await fetch(pageUrl_api, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!pageResponse.ok) {
      throw new Error('Failed to fetch page');
    }

    const page = await pageResponse.json();

    // Get current SEO values
    let seoTitle = '';
    let seoDescription = '';

    if (client.seoPlugin === 'yoast') {
      seoTitle = page.meta?._yoast_wpseo_title || page.title?.rendered || '';
      seoDescription = page.meta?._yoast_wpseo_metadesc || page.excerpt?.rendered || '';
    } else if (client.seoPlugin === 'rank-math' || client.seoPlugin === 'rankmath') {
      seoTitle = page.meta?.rank_math_title || page.title?.rendered || '';
      seoDescription = page.meta?.rank_math_description || page.excerpt?.rendered || '';
    }

    // Re-save the page with the same SEO values
    // This triggers WordPress's update hooks which refreshes Yoast/Rank Math's UI cache
    const updatePayload: any = {
      title: page.title?.rendered,
      status: page.status,
      meta: {},
    };

    if (client.seoPlugin === 'yoast') {
      updatePayload.meta._yoast_wpseo_title = String(seoTitle);
      updatePayload.meta._yoast_wpseo_metadesc = String(seoDescription);
    } else if (client.seoPlugin === 'rank-math' || client.seoPlugin === 'rankmath') {
      updatePayload.meta.rank_math_title = String(seoTitle);
      updatePayload.meta.rank_math_description = String(seoDescription);
    }

    const updateResponse = await fetch(`${client.wordpressUrl}/wp-json/wp/v2/pages/${pageId}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to sync: ${errorText}`);
    }

    return NextResponse.json({
      success: true,
      message: 'SEO UI synced successfully. The fields should now appear in Yoast/Rank Math UI when editing the page.',
      seoTitle,
      seoDescription,
    });

  } catch (error) {
    console.error('SEO sync error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync SEO UI',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
