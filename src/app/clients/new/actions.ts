'use server';

/**
 * Server Actions for New Client Form
 *
 * SCALE: When migrating to Clerk:
 * - Replace getCurrentUser() with auth() from @clerk/nextjs
 * - Update to use clerkId for user association
 * - Add organization-level client creation
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface FormState {
  error?: string;
  success?: boolean;
}

/**
 * Test WordPress connection with provided credentials
 */
export async function testConnectionAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const wpSiteUrl = formData.get('wpSiteUrl') as string;
    const wpUsername = formData.get('wpUsername') as string;
    let wpAppPassword = formData.get('wpAppPassword') as string;

    if (!wpSiteUrl || !wpUsername || !wpAppPassword) {
      return {
        success: false,
        message: 'Please fill in all WordPress connection fields',
      };
    }

    // Remove all spaces from the application password
    // WordPress displays them with spaces but they need to be removed for API use
    wpAppPassword = wpAppPassword.replace(/\s/g, '');

    // Clean up the URL - remove common WordPress paths and trailing slashes
    let baseUrl = wpSiteUrl.trim()
      .replace(/\/+$/, '')           // Remove trailing slashes
      .replace(/\/wp-json\/?.*$/, '') // Remove /wp-json and everything after
      .replace(/\/wp-admin\/?.*$/, '') // Remove /wp-admin and everything after
      .replace(/\/wp-login\.php.*$/, ''); // Remove /wp-login.php

    console.log('Testing connection to:', baseUrl);
    console.log('Username:', wpUsername);
    console.log('Password length:', wpAppPassword.length);

    // First, test if REST API is accessible
    console.log('Step 1: Testing base REST API...');
    const baseRestUrl = `${baseUrl}/wp-json/wp/v2`;
    try {
      const baseResponse = await fetch(baseRestUrl, { signal: AbortSignal.timeout(5000) });
      console.log('Base REST API status:', baseResponse.status);
    } catch (e) {
      console.log('Base REST API error:', e);
    }

    // Test connection to WordPress REST API with auth
    console.log('Step 2: Testing authenticated endpoint...');
    const authString = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');

    const testUrl = `${baseUrl}/wp-json/wp/v2/users/me`;
    console.log('Full URL:', testUrl);
    console.log('Auth header:', `Basic ${authString.substring(0, 20)}...`);

    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SEO-Page-Generator/1.0',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);

    // If 500 error, try to get response body for debugging
    let errorBody = '';
    if (response.status === 500) {
      try {
        errorBody = await response.text();
        console.log('500 Error body:', errorBody.substring(0, 500));

        // Check if it's actually an authentication error disguised as 500
        if (errorBody.includes('incorrect_password') || errorBody.includes('incorrect password')) {
          return {
            success: false,
            message: '❌ Application Password Authentication Failed\n\nWordPress REST API rejected the Application Password.\n\n✅ QUICK FIX - Try your regular WordPress password instead:\n\n⚠️ Application Passwords may be disabled on this host.\nTry using your REGULAR WordPress login password in the field above.\n\n🔒 Security note: While Application Passwords are more secure,\nmany hosts disable them. Using regular password still works\nand credentials are encrypted in transit.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nAlternatively, if you want to enable Application Passwords:\n\n1. **Contact your hosting provider** to enable Application Passwords\n\n2. **Check security plugins:**\n   - Wordfence, iThemes Security, etc.\n   - Look for "REST API" settings\n   - Allow authenticated REST API requests\n\n3. **Check .htaccess** (if you have access):\n   - Authorization header might be stripped\n   - Add: SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1',
          };
        }
      } catch (e) {
        console.log('Could not read error body');
      }
    }

    if (!response.ok) {
      // Return early with specific error messages without trying to read body
      if (response.status === 401) {
        return {
          success: false,
          message: '❌ Authentication Failed\n\nThe username or Application Password is incorrect.\n\n✅ Steps to fix:\n1. Use WordPress USERNAME (not email)\n2. Go to WordPress Admin → Users → Profile\n3. Scroll to "Application Passwords"\n4. Generate a new password (name it "SEO Generator")\n5. Copy the password exactly as shown\n6. Paste it here and try again\n\n⚠️ Note: Do NOT use your regular WordPress password!',
        };
      }
      if (response.status === 404) {
        return {
          success: false,
          message: `❌ WordPress REST API Not Found\n\nThe site "${baseUrl}" doesn't appear to be a WordPress site or the REST API is disabled.\n\n✅ Steps to fix:\n1. Verify the URL is correct (use just the domain, e.g., https://example.com)\n2. Don't include /wp-admin or /wp-json in the URL\n3. Check that WordPress REST API is enabled\n4. Try accessing ${baseUrl}/wp-json/wp/v2 in your browser - you should see JSON data`,
        };
      }
      if (response.status === 403) {
        return {
          success: false,
          message: '❌ Access Forbidden\n\nYour WordPress user doesn\'t have permission to access the REST API.\n\n✅ Steps to fix:\n1. Log into WordPress Admin\n2. Go to Users → All Users\n3. Make sure your user has "Administrator" or "Editor" role\n4. If role is correct, try generating a new Application Password',
        };
      }
      if (response.status === 500) {
        return {
          success: false,
          message: `❌ WordPress Server Error\n\nThe WordPress site is experiencing an internal error.\n\n✅ Steps to fix:\n1. Check WordPress error logs (in wp-content/debug.log)\n2. Temporarily disable security plugins (Wordfence, Sucuri, etc.)\n3. Check if REST API is blocked by server firewall\n4. Try accessing ${baseUrl}/wp-json/wp/v2 in browser - should show JSON\n5. Contact your hosting provider if issue persists\n\n⚠️ Common causes:\n• Security plugin blocking REST API\n• Server firewall/WAF rules\n• PHP errors in WordPress\n• Memory limit issues`,
        };
      }
      return {
        success: false,
        message: `❌ Connection Failed (Status ${response.status})\n\n✅ Steps to fix:\n1. Check the WordPress site URL is correct\n2. Make sure the site is accessible (try opening it in your browser)\n3. Verify your credentials are correct\n4. Contact your hosting provider if the issue persists`,
      };
    }

    const userData = await response.json();
    console.log('Connection successful! User:', userData.name);

    return {
      success: true,
      message: `✓ Connection successful! Authenticated as: ${userData.name}`,
    };
  } catch (error) {
    console.error('Connection test error:', error);

    if (error instanceof Error) {
      // Check for network/timeout errors
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: '❌ Connection Timed Out\n\nThe WordPress site took too long to respond.\n\n✅ Steps to fix:\n1. Check if the site is online (open it in your browser)\n2. Check if your internet connection is stable\n3. The site may be slow - try again in a few moments\n4. Contact your hosting provider if the site is consistently slow',
        };
      }
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          success: false,
          message: '❌ Network Error\n\nCouldn\'t connect to the WordPress site.\n\n✅ Steps to fix:\n1. Check your internet connection\n2. Verify the WordPress URL is correct and accessible\n3. Make sure the site is online (open it in your browser)\n4. Check if the site has any firewall or security plugins blocking REST API',
        };
      }
      return {
        success: false,
        message: `❌ Unexpected Error\n\n${error.message}\n\n✅ Steps to fix:\n1. Check all fields are filled correctly\n2. Verify the WordPress site URL\n3. Try testing the connection again\n4. If the issue persists, contact support`,
      };
    }

    return {
      success: false,
      message: '❌ Connection Failed\n\n✅ Steps to fix:\n1. Verify the WordPress site URL is correct\n2. Check your internet connection\n3. Make sure the WordPress site is online\n4. Try again in a few moments',
    };
  }
}

/**
 * Create a new client with WordPress credentials and template metadata
 *
 * SCALE: Add multi-organization support with Clerk
 */
export async function createClientAction(
  prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: 'Unauthorized. Please log in.' };
    }

    // Extract and validate form data
    const clientName = formData.get('clientName') as string;
    const clientWebsite = formData.get('clientWebsite') as string;
    const wpSiteUrl = formData.get('wpSiteUrl') as string;
    const wpUsername = formData.get('wpUsername') as string;
    let wpAppPassword = formData.get('wpAppPassword') as string;
    const templatePageUrl = formData.get('templatePageUrl') as string;
    const templatePageId = formData.get('templatePageId') as string;

    // Remove spaces from application password (WordPress shows them with spaces)
    wpAppPassword = wpAppPassword.replace(/\s/g, '');

    // Validate required fields
    if (!clientName || !clientWebsite || !wpSiteUrl || !wpUsername || !wpAppPassword || !templatePageUrl || !templatePageId) {
      return { error: 'All fields are required' };
    }

    // Validate template page ID is a number
    const templateIdNum = parseInt(templatePageId, 10);
    if (isNaN(templateIdNum) || templateIdNum < 1) {
      return { error: 'Template Page ID must be a positive number' };
    }

    // Validate URLs
    try {
      new URL(clientWebsite);
      new URL(wpSiteUrl);
      new URL(templatePageUrl);
    } catch {
      return { error: 'Invalid URL format. Please ensure all URLs start with http:// or https://' };
    }

    // Clean up WordPress URL for duplicate checking
    const cleanWpUrl = wpSiteUrl.trim()
      .replace(/\/+$/, '')           // Remove trailing slashes
      .replace(/\/wp-json\/?.*$/, '') // Remove /wp-json and everything after
      .replace(/\/wp-admin\/?.*$/, '') // Remove /wp-admin and everything after
      .replace(/\/wp-login\.php.*$/, ''); // Remove /wp-login.php

    // Check for duplicate client (by WordPress URL or client name)
    const existingClient = await prisma.client.findFirst({
      where: {
        userId: user.id,
        OR: [
          { wordpressUrl: cleanWpUrl },
          { clientName: clientName },
        ],
      },
    });

    if (existingClient) {
      if (existingClient.wordpressUrl === cleanWpUrl) {
        return { error: `A client with WordPress URL "${cleanWpUrl}" already exists. Each client must have a unique WordPress site.` };
      }
      return { error: `A client named "${clientName}" already exists. Please use a different name.` };
    }

    // Create the client in the database
    await prisma.client.create({
      data: {
        clientName,
        clientWebsite,
        wordpressUrl: wpSiteUrl.replace(/\/wp-json\/?$/, ''), // Clean up URL
        wpUsername,
        wpAppPassword, // In production, encrypt this!
        seoPlugin: 'Yoast', // Default to Yoast for now
        templatePageId: templatePageId, // Keep as string
        userId: user.id,
      },
    });

    // Return success - redirect will be handled by client
    return { success: true };
  } catch (error) {
    console.error('Error creating client:', error);

    // Check for unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { error: 'A client with this information already exists' };
    }

    return { error: 'Failed to create client. Please try again.' };
  }
}
