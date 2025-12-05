/**
 * Set Password API
 * Allows users with valid invite tokens to set their password
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validate inputs
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    // Find user with this invite token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        inviteTokenExpiry: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
    }

    // Check if token has expired
    if (user.inviteTokenExpiry && new Date() > user.inviteTokenExpiry) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 410 });
    }

    // Check if user already has a password set
    if (user.passwordHash && user.passwordHash !== '') {
      return NextResponse.json(
        { error: 'Password has already been set for this account' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Update user with password and clear invite token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        inviteToken: null,
        inviteTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password set successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Error setting password:', error);
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}
