/**
 * Admin Toggle User Block API Endpoint
 * Allows admins to block or unblock users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get target user ID and block status from request body
    const body = await request.json();
    const { userId, shouldBlock } = body;

    if (!userId || typeof shouldBlock !== 'boolean') {
      return NextResponse.json(
        { error: 'User ID and shouldBlock (boolean) are required' },
        { status: 400 }
      );
    }

    // Prevent admin from blocking themselves
    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // Prevent blocking other admins
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (isAdmin(targetUser.email)) {
      return NextResponse.json({ error: 'Cannot block admin users' }, { status: 400 });
    }

    // Update user's blocked status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: shouldBlock },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
      },
    });

    console.log(
      `🔒 Admin ${currentUser.email} ${shouldBlock ? 'blocked' : 'unblocked'} user ${updatedUser.email}`
    );

    return NextResponse.json({
      success: true,
      message: `User ${shouldBlock ? 'blocked' : 'unblocked'} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Toggle block API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
