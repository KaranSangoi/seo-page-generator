/**
 * Admin Impersonation API Endpoint
 * Allows admins to login as another user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, impersonateUser } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper to check if user is admin
function isAdmin(userEmail: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim()) || [];
  return adminEmails.includes(userEmail);
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate and verify admin
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(currentUser.email)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get target user ID from request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admin from impersonating themselves (pointless)
    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'Cannot impersonate yourself' }, { status: 400 });
    }

    // Impersonate the user
    const result = await impersonateUser(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Impersonation failed' }, { status: 400 });
    }

    console.log(`🎭 Admin ${currentUser.email} impersonating ${result.user?.email}`);

    return NextResponse.json({
      success: true,
      message: `Now logged in as ${result.user?.name || result.user?.email}`,
      user: result.user,
    });
  } catch (error) {
    console.error('Impersonation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
