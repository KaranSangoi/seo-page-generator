/**
 * Admin API: Invite User
 * Creates a new user with an invite token for password setup
 * Only accessible to admins (ADMIN_EMAILS)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

// Check if user is admin
function isAdmin(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

// Generate a secure random token
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    if (!isAdmin(currentUser.email)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // If user exists but hasn't set password, generate new token
      if (existingUser.passwordHash === '') {
        const inviteToken = generateInviteToken();
        const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            inviteToken,
            inviteTokenExpiry,
            name: name?.trim() || existingUser.name,
          },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteLink = `${appUrl}/set-password?token=${inviteToken}`;

        return NextResponse.json({
          success: true,
          message: 'Invite link regenerated for existing user',
          inviteLink,
          user: {
            id: existingUser.id,
            email: normalizedEmail,
            name: name?.trim() || existingUser.name,
          },
        });
      }

      return NextResponse.json(
        { error: 'User already exists and has set their password' },
        { status: 409 }
      );
    }

    // Generate invite token (valid for 7 days)
    const inviteToken = generateInviteToken();
    const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create the user with empty password hash
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: '', // Empty until they set password
        name: name?.trim() || null,
        inviteToken,
        inviteTokenExpiry,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Generate the invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/set-password?token=${inviteToken}`;

    return NextResponse.json({
      success: true,
      message: 'User invited successfully',
      inviteLink,
      user,
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 }
    );
  }
}
