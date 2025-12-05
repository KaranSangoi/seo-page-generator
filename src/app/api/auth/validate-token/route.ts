/**
 * Validate Invite Token API
 * Checks if an invite token is valid and not expired
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find user with this invite token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        name: true,
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

    return NextResponse.json({
      valid: true,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json({ error: 'Failed to validate token' }, { status: 500 });
  }
}
