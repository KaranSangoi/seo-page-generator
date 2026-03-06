/**
 * Models API - List available AI models from OpenAI
 * Caches the result in-memory for 24 hours to avoid repeated API calls
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory cache
let cachedModels: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchAvailableModels(): Promise<string[]> {
  // Return cache if fresh
  if (cachedModels && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedModels;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return ['gpt-5.4'];
  }

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.error('Failed to fetch models:', res.status);
      return ['gpt-5.4'];
    }

    const data = await res.json();
    const models = (data.data as Array<{ id: string }>)
      .map((m) => m.id)
      .filter((id) =>
        /^gpt-[45]/.test(id) &&
        !/(audio|realtime|tts|transcribe|image|search|instruct|codex|nano|chat-latest)/i.test(id) &&
        !/\d{4}-\d{2}/.test(id) && // exclude dated snapshots like gpt-5.4-2026-03-05
        !/^\w+-\d+-\d{4}/.test(id) && // exclude legacy versioned like gpt-4-0613, gpt-4-0125-preview
        !/-preview$/.test(id) // exclude preview variants
      )
      .sort((a, b) => {
        // Sort newest/highest version first
        const versionA = a.match(/gpt-(\d+\.?\d*)/)?.[1] || '0';
        const versionB = b.match(/gpt-(\d+\.?\d*)/)?.[1] || '0';
        const diff = parseFloat(versionB) - parseFloat(versionA);
        if (diff !== 0) return diff;
        return a.localeCompare(b);
      });

    cachedModels = models;
    cacheTimestamp = Date.now();
    return models;
  } catch (error) {
    console.error('Error fetching models:', error);
    return ['gpt-5.4'];
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const models = await fetchAvailableModels();

  return NextResponse.json({
    success: true,
    models,
    default: 'gpt-5.4',
  });
}
