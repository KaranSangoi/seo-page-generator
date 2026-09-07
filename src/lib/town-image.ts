/**
 * Town/County image generation for Location Cards.
 *
 * Pipeline: OpenAI gpt-image-1 (aerial town view, Google-Maps-ish) ->
 * sharp resize + WebP compress under a size cap -> upload to the client's
 * WordPress media library -> return { url, id } for use in an Elementor card.
 *
 * NOTE: Image generation ALWAYS uses OpenAI (OPENAI_API_KEY), even when page
 * content is generated with Claude (ANTHROPIC_API_KEY). If OPENAI_API_KEY is
 * missing, image generation is skipped and the card is created without an image.
 */

import OpenAI from 'openai';
import sharp from 'sharp';

const MAX_IMAGE_BYTES = 100 * 1024; // 100KB target per requirement
const TARGET_WIDTH = 1200; // starting card image width; scaled down if needed

// Dedicated OpenAI client keyed on OPENAI_API_KEY (independent of the content
// provider, which may be Claude).
function getImageClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export function isImageGenerationAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Build the image prompt for a town (Broad Stroke) or county (Nested Broad Stroke).
 * `location` is expected like "Waynesboro, GA" or "Burke County, GA".
 */
function buildPrompt(location: string, pageType: string): string {
  const isCounty = /county/i.test(location) || pageType === 'Nested Broad Stroke';
  const subject = isCounty
    ? `the ${location} area`
    : `the town of ${location}`;
  return [
    `Aerial drone photograph of ${subject}, USA.`,
    `Wide establishing daytime shot, like a Google Earth / real-estate hero image:`,
    isCounty
      ? `rolling landscape with small residential neighborhoods, trees, roads winding through countryside, and distant hills.`
      : `a small American town nestled in its natural landscape — residential homes, a main street, greenery, and distant hills or a river.`,
    `Natural warm daylight, realistic, high detail, photographic, no text, no watermark, no logos, no captions, no close-up people.`,
  ].join(' ');
}

/**
 * Generate a raw PNG buffer via OpenAI gpt-image-1. Returns null if OpenAI is
 * not configured or the call fails (caller then creates a card without image).
 */
async function generateRawImage(location: string, pageType: string): Promise<Buffer | null> {
  const client = getImageClient();
  if (!client) {
    console.warn('[town-image] OPENAI_API_KEY not set — skipping image generation');
    return null;
  }
  try {
    const result = await client.images.generate({
      model: 'gpt-image-1',
      prompt: buildPrompt(location, pageType),
      size: '1536x1024', // landscape
      quality: 'medium', // low | medium | high — medium keeps cost ~$0.05/image
      n: 1,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      console.error('[town-image] No image data returned from OpenAI');
      return null;
    }
    return Buffer.from(b64, 'base64');
  } catch (error) {
    console.error(`[town-image] OpenAI image generation failed for "${location}":`, error);
    return null;
  }
}

/**
 * Resize + WebP-compress until under MAX_IMAGE_BYTES. Drops quality first, then
 * width, so we keep as much resolution as the size budget allows.
 */
export async function optimizeUnderCap(input: Buffer, maxBytes = MAX_IMAGE_BYTES): Promise<Buffer> {
  let width = TARGET_WIDTH;
  let best: Buffer | null = null;

  for (const w of [width, 1000, 900, 800, 700, 600]) {
    for (const quality of [80, 70, 60, 50, 40, 30]) {
      const out = await sharp(input)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      best = out; // keep last attempt as fallback
      if (out.length <= maxBytes) {
        return out;
      }
    }
    width = w;
  }
  // Could not get under the cap even at the smallest settings — return the
  // smallest we produced rather than failing the whole card.
  console.warn(`[town-image] Could not compress under ${maxBytes} bytes; using ${best?.length} bytes`);
  return best as Buffer;
}

export interface UploadedImage {
  id: number;
  url: string;
}

/**
 * Upload a WebP buffer to the client's WordPress media library and set alt text.
 * Returns the media { id, url } or null on failure.
 */
export async function uploadToWordPressMedia(
  wordpressUrl: string,
  credentials: string,
  buffer: Buffer,
  filename: string,
  altText: string,
): Promise<UploadedImage | null> {
  try {
    const mediaUrl = `${wordpressUrl}/wp-json/wp/v2/media`;
    const res = await fetch(mediaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'image/webp',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[town-image] Media upload failed (${res.status}): ${text.slice(0, 300)}`);
      return null;
    }

    const media = await res.json();
    const id: number = media.id;
    const url: string = media.source_url;

    // Set alt text (Elementor Image Box pulls alt from the media attachment).
    try {
      await fetch(`${mediaUrl}/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alt_text: altText, title: altText }),
      });
    } catch (e) {
      console.warn('[town-image] Failed to set alt text on media (non-fatal):', e);
    }

    return { id, url };
  } catch (error) {
    console.error('[town-image] Media upload error:', error);
    return null;
  }
}

function slugifyLocation(location: string): string {
  return location
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * End-to-end: generate -> optimize -> upload. Returns the uploaded media or null
 * if any step fails (caller creates the card without an image).
 */
export async function generateAndUploadTownImage(params: {
  location: string;
  pageType: string;
  service: string;
  wordpressUrl: string;
  credentials: string;
}): Promise<UploadedImage | null> {
  const { location, pageType, service, wordpressUrl, credentials } = params;

  const raw = await generateRawImage(location, pageType);
  if (!raw) return null;

  const optimized = await optimizeUnderCap(raw);
  const filename = `${slugifyLocation(service)}-${slugifyLocation(location)}.webp`;
  const altText = `${service} in ${location}`;

  return uploadToWordPressMedia(wordpressUrl, credentials, optimized, filename, altText);
}
