/**
 * Admin Delete User API Endpoint
 * Allows admins to permanently delete users and all their data
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

export async function DELETE(request: NextRequest) {
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

    // Prevent admin from deleting themselves
    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Get target user info
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting other admins
    if (isAdmin(targetUser.email)) {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 400 });
    }

    // Delete user (cascades to clients, batches, pages, logs due to schema relations)
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(
      `🗑️ Admin ${currentUser.email} deleted user ${targetUser.email} (${targetUser.name || 'No name'})`
    );

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} has been permanently deleted`,
    });
  } catch (error) {
    console.error('Delete user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
