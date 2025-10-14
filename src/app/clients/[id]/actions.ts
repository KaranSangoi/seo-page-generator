'use server';

/**
 * Server Actions for Client Detail Page
 */

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
 * Test WordPress Connection
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
    const wpApiUrl = `${cleanWpUrl}/wp-json/wp/v2/users/me`;

    // Test connection
    const response = await fetch(wpApiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      const userData = await response.json();
      return {
        success: true,
        message: `✅ Connection successful!\n\nConnected as: ${userData.name || wpUsername}\nRole: ${userData.roles?.[0] || 'Unknown'}\nWordPress site is ready to accept page generation requests.`,
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
