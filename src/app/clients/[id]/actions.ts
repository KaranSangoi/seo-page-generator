'use server';

/**
 * Server Actions for Client Detail Page
 */

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sanitizeLinkColor } from '@/lib/link-style';

/**
 * Update Client Metadata
 */
export async function updateClientAction(prevState: any, formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'You must be logged in to update clients.' };
    }

    // Extract form data
    const clientId = formData.get('clientId') as string;
    const clientName = formData.get('clientName') as string;
    const clientWebsite = formData.get('clientWebsite') as string;
    const wpSiteUrl = formData.get('wpSiteUrl') as string;
    const wpUsername = formData.get('wpUsername') as string;
    const wpAppPassword = formData.get('wpAppPassword') as string;
    const seoPlugin = formData.get('seoPlugin') as string;
    const templatePageId = formData.get('templatePageId') as string;
    const pageBuilder = formData.get('pageBuilder') as string;
    const builderDetected = formData.get('builderDetected') === 'true';

    // Extract optional business metadata fields
    const businessPhone = (formData.get('businessPhone') as string) || null;
    const businessAddress = (formData.get('businessAddress') as string) || null;
    const businessType = (formData.get('businessType') as string) || null;
    const gbpUrl = (formData.get('gbpUrl') as string) || null;
    // Default link color (hex); sanitized, invalid/empty -> null.
    const linkColor = sanitizeLinkColor(formData.get('linkColor') as string);

    // Validate required fields
    if (!clientId || !clientName || !clientWebsite || !wpSiteUrl || !wpUsername || !wpAppPassword || !seoPlugin || !templatePageId) {
      return { error: 'All fields are required.' };
    }

    // Clean WordPress URL
    let cleanWpUrl = wpSiteUrl.trim();
    cleanWpUrl = cleanWpUrl.replace(/\/wp-json\/?.*$/, '');
    cleanWpUrl = cleanWpUrl.replace(/\/wp-admin\/?.*$/, '');
    cleanWpUrl = cleanWpUrl.replace(/\/$/, '');

    // Verify client exists and user owns it
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
    });

    if (!existingClient) {
      return { error: 'Client not found or you do not have permission to update it.' };
    }

    // Check for duplicate WordPress URL or client name (excluding current client)
    const duplicateClient = await prisma.client.findFirst({
      where: {
        userId: user.id,
        id: { not: clientId },
        OR: [
          { wordpressUrl: cleanWpUrl },
          { clientName: clientName },
        ],
      },
    });

    if (duplicateClient) {
      if (duplicateClient.wordpressUrl === cleanWpUrl) {
        return { error: `Another client is already using the WordPress URL "${cleanWpUrl}". Each client must have a unique WordPress site.` };
      }
      return { error: `Another client is already named "${clientName}". Please use a different name.` };
    }

    // Update client
    await prisma.client.update({
      where: { id: clientId },
      data: {
        clientName,
        clientWebsite,
        wordpressUrl: cleanWpUrl,
        wpUsername,
        wpAppPassword,
        seoPlugin,
        templatePageId,
        pageBuilder: pageBuilder || 'elementor',
        builderDetected,
        // Business metadata (optional)
        businessPhone,
        businessAddress,
        businessType,
        gbpUrl,
        linkColor,
      },
    });

    // Revalidate the page to show updated data
    revalidatePath(`/clients/${clientId}`);

    return { success: true };
  } catch (error) {
    console.error('Error updating client:', error);
    return { error: 'Failed to update client. Please try again.' };
  }
}

/**
 * Get Generation Batches for Client
 */
export async function getBatchesAction(clientId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'You must be logged in.' };
    }

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
    });

    if (!client) {
      return { error: 'Client not found or access denied.' };
    }

    // Fetch all batches for this client
    const batches = await prisma.generationBatch.findMany({
      where: {
        clientId: clientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            generatedPages: true,
          },
        },
      },
    });

    return { success: true, batches };
  } catch (error) {
    console.error('Error fetching batches:', error);
    return { error: 'Failed to fetch generation history.' };
  }
}

/**
 * Get Batch Details with All Pages
 */
export async function getBatchDetailsAction(batchId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'You must be logged in.' };
    }

    // Fetch batch with all pages
    const batch = await prisma.generationBatch.findFirst({
      where: {
        id: batchId,
        userId: user.id,
      },
      include: {
        generatedPages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        client: {
          select: {
            clientName: true,
            clientWebsite: true,
          },
        },
      },
    });

    if (!batch) {
      return { error: 'Batch not found or access denied.' };
    }

    return { success: true, batch };
  } catch (error) {
    console.error('Error fetching batch details:', error);
    return { error: 'Failed to fetch batch details.' };
  }
}

/**
 * Test WordPress Connection and Detect Page Builder
 */
export async function testConnectionAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'You must be logged in to test connections.',
      };
    }

    const wpSiteUrl = formData.get('wpSiteUrl') as string;
    const wpUsername = formData.get('wpUsername') as string;
    const wpAppPassword = formData.get('wpAppPassword') as string;
    const templatePageId = formData.get('templatePageId') as string;
    const clientId = formData.get('clientId') as string; // Get clientId for auto-update

    if (!wpSiteUrl || !wpUsername || !wpAppPassword) {
      return {
        success: false,
        message: 'WordPress URL, username, and app password are required.',
      };
    }

    // Clean WordPress URL
    let cleanWpUrl = wpSiteUrl.trim();
    cleanWpUrl = cleanWpUrl.replace(/\/wp-json\/?.*$/, '');
    cleanWpUrl = cleanWpUrl.replace(/\/wp-admin\/?.*$/, '');
    cleanWpUrl = cleanWpUrl.replace(/\/$/, '');

    // Construct Basic Auth header
    const credentials = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');
    const authHeaders = {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
    // Probe an auth-gated endpoint the app actually uses (context=edit requires an
    // authenticated user with edit capability) rather than /users/me, which many
    // sites block via user-enumeration hardening — that produced false "Access
    // Forbidden" failures even when credentials were valid.
    const wpApiUrl = `${cleanWpUrl}/wp-json/wp/v2/pages?per_page=1&context=edit`;

    // Test connection
    const response = await fetch(wpApiUrl, {
      method: 'GET',
      headers: authHeaders,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      // Credentials + edit permission confirmed. Best-effort: fetch display name
      // and role for a friendlier message; skip silently if /users is blocked.
      let displayName = wpUsername;
      let role = '';
      try {
        const meRes = await fetch(`${cleanWpUrl}/wp-json/wp/v2/users/me`, {
          headers: authHeaders,
          signal: AbortSignal.timeout(5000),
        });
        if (meRes.ok) {
          const me = await meRes.json();
          displayName = me?.name || wpUsername;
          role = me?.roles?.[0] || '';
        }
      } catch {
        // /users endpoint blocked or slow — ignore, auth is already verified.
      }

      let successMessage = `✅ Connection successful!\n\nConnected as: ${displayName}${role ? `\nRole: ${role}` : ''}`;

      // Try to detect page builder if template ID is provided
      let detectedBuilder: string | null = null;
      let builderDetails: string | null = null;
      let builderSupported = false;

      if (templatePageId) {
        try {
          const { detectPageBuilder, getBuilderDisplayName, getBuilderIcon, getBuilderSupportStatus, isBuilderSupported } = await import('@/lib/builders/detector');

          const detection = await detectPageBuilder(
            templatePageId,
            cleanWpUrl,
            wpUsername,
            wpAppPassword
          );

          detectedBuilder = detection.builder;
          builderDetails = detection.details;
          const builderName = getBuilderDisplayName(detection.builder);
          const builderIcon = getBuilderIcon(detection.builder);
          const supportStatus = getBuilderSupportStatus(detection.builder);
          builderSupported = isBuilderSupported(detection.builder);

          successMessage += `\n\n${builderIcon} Page Builder Detected: ${builderName}\nConfidence: ${detection.confidence}\n${supportStatus}`;

          if (!builderSupported) {
            successMessage += `\n\n⚠️ Note: Currently Elementor, Divi, WPBakery, Avada Fusion Builder, and Classic Editor are supported. ${builderName} support is coming soon!`;
          }

          // Auto-update the client's page builder if clientId is provided
          if (clientId && detectedBuilder) {
            try {
              await prisma.client.update({
                where: { id: clientId },
                data: {
                  pageBuilder: detectedBuilder,
                  builderDetected: true,
                },
              });
              console.log(`[TEST CONNECTION] Auto-updated client ${clientId} page builder to: ${detectedBuilder}`);

              // Revalidate the page to show the updated builder
              revalidatePath(`/clients/${clientId}`);

              successMessage += `\n\n✅ Page builder automatically updated to ${builderName}.`;
            } catch (updateError) {
              console.warn('[TEST CONNECTION] Failed to auto-update page builder:', updateError);
              // Don't fail the connection test if the update fails
            }
          }
        } catch (detectionError: any) {
          // Don't fail the connection test if detection fails
          console.warn('Builder detection failed:', detectionError);
          successMessage += `\n\n⚠️ Could not detect page builder automatically.\nError: ${detectionError.message || 'Unknown error'}`;
        }
      } else {
        successMessage += `\n\n💡 Tip: Enter a Template Page ID to automatically detect which page builder you're using.`;
      }

      successMessage += `\n\nWordPress site is ready to accept page generation requests.`;

      return {
        success: true,
        message: successMessage,
        detectedBuilder,
        builderDetails,
        builderSupported,
      };
    }

    // Handle specific error codes
    if (response.status === 401) {
      return {
        success: false,
        message: `❌ Authentication Failed (401 Unauthorized)\n\nThe WordPress site rejected your credentials.\n\n✅ Steps to fix:\n1. Verify your WordPress username is correct\n2. Generate a new Application Password:\n   • Go to: ${cleanWpUrl}/wp-admin/profile.php\n   • Scroll to "Application Passwords"\n   • Create a new password (name it "SEO Generator")\n   • Copy the password and paste it here (include spaces)\n3. Make sure the user has Administrator or Editor role`,
      };
    }

    if (response.status === 403) {
      return {
        success: false,
        message: `❌ Access Forbidden (403)\n\nYour account doesn't have permission to access the WordPress API.\n\n✅ Steps to fix:\n1. Ensure your WordPress user has Administrator or Editor role\n2. Check if any security plugins are blocking API access\n3. Verify Application Passwords are enabled in WordPress`,
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        message: `❌ WordPress Site Not Found (404)\n\nCouldn't reach the WordPress REST API at:\n${wpApiUrl}\n\n✅ Steps to fix:\n1. Verify the WordPress URL is correct (should be the site's base URL)\n2. Check if the site is live and accessible\n3. Ensure WordPress REST API is not disabled\n4. Try accessing ${cleanWpUrl}/wp-json/ in your browser`,
      };
    }

    // Generic error
    const errorText = await response.text();
    return {
      success: false,
      message: `❌ Connection Failed (${response.status})\n\nThe WordPress site returned an error.\n\nError details: ${errorText.substring(0, 200)}`,
    };
  } catch (error: any) {
    console.error('Connection test error:', error);

    // Handle timeout
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return {
        success: false,
        message: `❌ Connection Timeout\n\nCouldn't reach the WordPress site within 10 seconds.\n\n✅ Steps to fix:\n1. Check if the WordPress site is online\n2. Verify the URL is correct\n3. Check your internet connection\n4. The site might be temporarily slow - try again`,
      };
    }

    // Handle network errors
    if (error.cause?.code === 'ENOTFOUND' || error.message?.includes('fetch failed')) {
      return {
        success: false,
        message: `❌ Cannot Reach WordPress Site\n\nThe domain couldn't be found or isn't accessible.\n\n✅ Steps to fix:\n1. Verify the WordPress URL is correct\n2. Check if the site is online (try opening it in a browser)\n3. Ensure you're using the full URL (https://example.com)\n4. Check your internet connection`,
      };
    }

    return {
      success: false,
      message: `❌ Connection Test Failed\n\nAn unexpected error occurred: ${error.message || 'Unknown error'}\n\nPlease check your WordPress site URL and credentials.`,
    };
  }
}
