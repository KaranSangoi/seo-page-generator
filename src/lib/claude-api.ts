/**
 * AI Content Generation Client
 * Supports Claude (with prompt caching) and OpenAI
 * Uses whichever API key is available
 *
 * Context Caching: Saves ~75% on input tokens by caching SOP and client data
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Determine which provider to use
const PROVIDER = process.env.ANTHROPIC_API_KEY
  ? "claude"
  : process.env.OPENAI_API_KEY
  ? "openai"
  : null;

if (!PROVIDER) {
  console.warn(
    "⚠️ No AI API key found. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY"
  );
}

// Initialize clients
const anthropic =
  PROVIDER === "claude"
    ? new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    : null;

const openai =
  PROVIDER === "openai"
    ? new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    : null;

// Context cache for batch sessions (saves ~75% on input tokens)
interface BatchContext {
  batchId: string;
  provider: "claude" | "openai";
  systemPrompt: string;
  clientInfo: string;
  createdAt: number;
  // For OpenAI: maintain conversation history
  messages?: OpenAI.Chat.ChatCompletionMessageParam[];
}

const batchContextCache = new Map<string, BatchContext>();

// Clear old contexts (> 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [batchId, context] of Array.from(batchContextCache.entries())) {
    if (now - context.createdAt > 3600000) {
      // 1 hour
      batchContextCache.delete(batchId);
    }
  }
}, 300000); // Check every 5 minutes

export interface GeneratedContent {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  heroDescription: string;
  benefitsHeading: string;
  benefitsSubheading: string;
  benefitsBullets: string[];
  whyHeading: string;
  whySubheading: string;
  whyBullets: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  mapDescription?: string;
}

export interface ContentGenerationParams {
  batchId?: string; // For context caching
  pageType: string;
  companyName: string;
  companyWebsite: string;
  service: string;
  location: string;
  primaryKeyword: string;
  omitSections: string[];
  seoPlugin: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Build system prompt for context caching (sent once per batch)
 */
function buildSystemPrompt(params: ContentGenerationParams): string {
  const { companyName, companyWebsite, pageType, seoPlugin } = params;

  return `You are an expert SEO content writer creating service pages for ${companyName} (${companyWebsite}).

**Page Type:** ${pageType}
**SEO Plugin:** ${seoPlugin}

**Standard Operating Procedure (SOP):**

1. **Meta Description:** Must be ≤155 characters
2. **Hero Description:** Must be 50-60 words (STRICT - count your words!)
   Example (52 words): "Our professional dumpster rental services in Phoenix provide reliable waste management solutions for residential and commercial projects. With same-day delivery, flexible rental periods, and competitive pricing, we make waste disposal easy. Contact us today for a free quote and experience hassle-free service from Phoenix's most trusted waste management company."
3. **Bullet Points:** Each must be ≥30 words (STRICT - count your words!)
   Example (38 words): "We offer flexible rental periods from 3 days to 4 weeks, allowing you to complete your project at your own pace without rushing. Need more time? Simply contact us to extend your rental period with no hassle or hidden fees."
4. **Map Description:** Must be 50-60 words (STRICT - count your words!)
5. **Primary Keyword Usage:** Use naturally throughout all content
6. **Company Name:** MUST mention company name naturally at least once in hero/FAQ/map sections (for internal linking)
7. **Location Name:** MUST mention full location naturally in benefits/why sections (for external linking to city websites)
8. **FAQs:** Must be SEO-relevant questions (not promotional). Mention company name in the 2nd half of answers.
9. **Tone:** Professional, helpful, and authoritative
10. **Quality:** High-quality, unique content that provides value to readers

**CRITICAL:** Count words carefully before responding. Double-check all word counts!

**LINKING REQUIREMENTS:**
- Internal links (company name) and external links (location name) will be added programmatically
- Ensure natural placement of company name and location in content for link insertion

**JSON Output Format:**
Always return ONLY valid JSON with this exact structure (omit sections as instructed):
{
  "metaTitle": "string",
  "metaDescription": "string (max 155 chars)",
  "h1": "string",
  "heroDescription": "string (50-60 words)",
  "benefitsHeading": "string",
  "benefitsSubheading": "string",
  "benefitsBullets": ["string (35+ words)", "string (35+ words)", "string (35+ words)"],
  "whyHeading": "string",
  "whySubheading": "string",
  "whyBullets": ["string (35+ words)", "string (35+ words)", "string (35+ words)"],
  "faqs": [{"question": "string", "answer": "string"}, {"question": "string", "answer": "string"}, {"question": "string", "answer": "string"}],
  "mapDescription": "string (50-60 words)"
}`;
}

/**
 * Build page-specific prompt (sent for each page)
 */
function buildPagePrompt(params: ContentGenerationParams): string {
  const { service, location, primaryKeyword, omitSections } = params;

  const includeMap = !omitSections.includes("Map");
  const includeFAQ = !omitSections.includes("FAQ");
  const includeBenefits = !omitSections.includes("Benefits");
  const includeWhy = !omitSections.includes("Why");

  return `Generate content for this specific page:

**Service:** ${service}
**Location:** ${location}
**Primary Keyword:** ${primaryKeyword}

**Sections to Include:**
- Meta Title & Description
- H1
- Hero Description${
    includeBenefits
      ? "\n- Benefits Section (heading, subheading, 3 bullets)"
      : ""
  }${includeWhy ? "\n- Why Section (heading, subheading, 3 bullets)" : ""}${
    includeFAQ ? "\n- 3 FAQs" : ""
  }${includeMap ? "\n- Map Description" : ""}

${!includeBenefits ? "⚠️ OMIT Benefits section entirely" : ""}${
    !includeWhy ? "\n⚠️ OMIT Why section entirely" : ""
  }${!includeFAQ ? "\n⚠️ OMIT FAQs entirely" : ""}${
    !includeMap ? "\n⚠️ OMIT Map description entirely" : ""
  }

Return ONLY the JSON object as specified in the SOP.`;
}

/**
 * Generate content using Claude with prompt caching
 */
async function generateWithClaude(
  params: ContentGenerationParams
): Promise<GeneratedContent> {
  if (!anthropic) throw new Error("Claude API not initialized");

  const { batchId } = params;
  const systemPrompt = buildSystemPrompt(params);
  const pagePrompt = buildPagePrompt(params);

  // For Claude, we use prompt caching on the system prompt
  // This saves ~75% on input tokens after the first request
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    temperature: 0.7,
    system: [
      {
        type: "text",
        text: systemPrompt,
        // Enable prompt caching for this block
        cache_control: { type: "ephemeral" } as any,
      },
    ],
    messages: [
      {
        role: "user",
        content: pagePrompt,
      },
    ],
  });

  // Store context for potential future use
  if (batchId) {
    batchContextCache.set(batchId, {
      batchId,
      provider: "claude",
      systemPrompt,
      clientInfo: "",
      createdAt: Date.now(),
    });
  }

  return parseAIResponse(message.content[0]);
}

/**
 * Generate content using OpenAI with conversation context
 */
async function generateWithOpenAI(
  params: ContentGenerationParams
): Promise<GeneratedContent> {
  if (!openai) throw new Error("OpenAI API not initialized");

  const { batchId } = params;
  const systemPrompt = buildSystemPrompt(params);
  const pagePrompt = buildPagePrompt(params);

  // Check if we have existing context for this batch
  let context = batchId ? batchContextCache.get(batchId) : null;

  let messages: OpenAI.Chat.ChatCompletionMessageParam[];

  if (context && context.messages) {
    // Reuse existing conversation context
    messages = [...context.messages, { role: "user", content: pagePrompt }];
  } else {
    // Start new conversation
    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: pagePrompt },
    ];
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages,
    temperature: 0.7,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Store context for next request in this batch
  if (batchId) {
    batchContextCache.set(batchId, {
      batchId,
      provider: "openai",
      systemPrompt,
      clientInfo: "",
      createdAt: Date.now(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: pagePrompt },
        { role: "assistant", content },
      ],
    });
  }

  return JSON.parse(content);
}

/**
 * Parse AI response (handles both Claude and OpenAI formats)
 */
function parseAIResponse(content: any): GeneratedContent {
  let jsonText: string;

  if (typeof content === "string") {
    jsonText = content;
  } else if (content.type === "text") {
    jsonText = content.text;
  } else {
    throw new Error("Unexpected response format from AI");
  }

  // Extract JSON from response (handles markdown code blocks)
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from AI response");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate content for a single page
 * Automatically uses available provider (Claude or OpenAI)
 * Implements context caching to save ~75% on input tokens
 */
export async function generatePageContent(
  params: ContentGenerationParams
): Promise<GeneratedContent> {
  if (!PROVIDER) {
    throw new Error(
      "No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY"
    );
  }

  try {
    let generated: GeneratedContent;

    if (PROVIDER === "claude") {
      generated = await generateWithClaude(params);
    } else {
      generated = await generateWithOpenAI(params);
    }

    // Ensure omitted sections return empty defaults
    const { omitSections } = params;
    if (omitSections.includes("Benefits")) {
      generated.benefitsHeading = "";
      generated.benefitsSubheading = "";
      generated.benefitsBullets = [];
    }
    if (omitSections.includes("Why")) {
      generated.whyHeading = "";
      generated.whySubheading = "";
      generated.whyBullets = [];
    }
    if (omitSections.includes("FAQ")) {
      generated.faqs = [];
    }
    if (omitSections.includes("Map")) {
      generated.mapDescription = undefined;
    }

    return generated;
  } catch (error) {
    console.error(`${PROVIDER} API error:`, error);
    throw new Error(
      `Failed to generate content: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Validate generated content against requirements
 */
export function validateContent(
  content: GeneratedContent,
  omitSections: string[],
  companyName?: string,
  location?: string
): ValidationResult {
  const errors: string[] = [];

  // Meta description length
  if (content.metaDescription.length > 155) {
    errors.push(
      `Meta description too long (${content.metaDescription.length} chars, max 155)`
    );
  }

  // Hero description word count
  const heroWords = content.heroDescription.split(/\s+/).length;
  if (heroWords < 50 || heroWords > 60) {
    errors.push(`Hero description has ${heroWords} words (should be 50-60)`);
  }

  // Check for company name in content (for internal linking)
  if (companyName) {
    const allContent = [
      content.heroDescription,
      ...content.faqs.map(f => f.answer),
      content.mapDescription || ''
    ].join(' ');

    if (!allContent.toLowerCase().includes(companyName.toLowerCase())) {
      errors.push(`Company name "${companyName}" not found in hero/FAQ/map sections`);
    }
  }

  // Check for location in benefits/why sections (for external linking)
  if (location && !omitSections.includes("Benefits") && !omitSections.includes("Why")) {
    const benefitsWhyContent = [
      ...content.benefitsBullets,
      ...content.whyBullets
    ].join(' ');

    if (!benefitsWhyContent.toLowerCase().includes(location.toLowerCase())) {
      errors.push(`Location "${location}" not found in benefits/why sections`);
    }
  }

  // Benefits bullets
  if (!omitSections.includes("Benefits")) {
    content.benefitsBullets.forEach((bullet, idx) => {
      const words = bullet.split(/\s+/).length;
      if (words < 35) {
        errors.push(
          `Benefits bullet ${idx + 1} has ${words} words (minimum 35)`
        );
      }
    });
  }

  // Why bullets
  if (!omitSections.includes("Why")) {
    content.whyBullets.forEach((bullet, idx) => {
      const words = bullet.split(/\s+/).length;
      if (words < 35) {
        errors.push(`Why bullet ${idx + 1} has ${words} words (minimum 35)`);
      }
    });
  }

  // Map description
  if (!omitSections.includes("Map") && content.mapDescription) {
    const mapWords = content.mapDescription.split(/\s+/).length;
    if (mapWords < 50 || mapWords > 60) {
      errors.push(`Map description has ${mapWords} words (should be 50-60)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate adjectives for batch of pages
 */
export async function generateAdjectives(count: number): Promise<string[]> {
  if (!PROVIDER) {
    throw new Error("No AI API key configured");
  }

  const prompt = `Generate ${count} unique, professional adjectives suitable for SEO keywords for service-based businesses.

Examples: Expert, Professional, Trusted, Reliable, Certified, Licensed, Experienced, Quality, Top-Rated, Premier

Return ONLY a JSON array of ${count} adjectives:
["Adjective1", "Adjective2", "Adjective3", ...]`;

  try {
    if (PROVIDER === "claude" && anthropic) {
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        temperature: 0.8,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON array");
      }

      return JSON.parse(jsonMatch[0]);
    } else if (PROVIDER === "openai" && openai) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("Empty response");

      // OpenAI with json_object mode might wrap it
      const parsed = JSON.parse(content);
      return parsed.adjectives || parsed;
    }

    throw new Error("No provider available");
  } catch (error) {
    console.error("Adjective generation error:", error);
    throw new Error(
      `Failed to generate adjectives: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Clear batch context (call when batch is complete)
 */
export function clearBatchContext(batchId: string): void {
  batchContextCache.delete(batchId);
}

/**
 * Get current provider info
 */
export function getProviderInfo(): {
  provider: string | null;
  hasCaching: boolean;
} {
  return {
    provider: PROVIDER,
    hasCaching: PROVIDER === "claude", // Only Claude has prompt caching
  };
}

/**
 * Search for city official website (simplified mock for now)
 * TODO: Implement actual search using search API
 */
export async function searchCityWebsite(
  city: string,
  state: string
): Promise<string | null> {
  // For MVP, return constructed URL
  // In production, use search API to find official city website
  const citySlug = city.toLowerCase().replace(/\s+/g, "-");
  const stateCode = state.toLowerCase();

  // Common patterns for city websites
  return `https://www.${citySlug}${stateCode}.gov`;
}

/**
 * Check AI API health
 */
export async function checkApiHealth(): Promise<boolean> {
  if (!PROVIDER) return false;

  try {
    if (PROVIDER === "claude" && anthropic) {
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Respond with OK",
          },
        ],
      });

      return message.content[0].type === "text";
    } else if (PROVIDER === "openai" && openai) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: "Respond with OK" }],
        max_tokens: 10,
      });

      return !!completion.choices[0].message.content;
    }

    return false;
  } catch (error) {
    console.error("API health check failed:", error);
    return false;
  }
}
