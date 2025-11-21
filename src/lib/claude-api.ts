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
  internalLinkPlacement?: string; // Where internal link will be placed (e.g., "hero", "faq-1", "map")
  externalLinkPlacement?: string; // Where external link will be placed (e.g., "benefits-2", "why-1")
  previouslyUsedFAQs?: string[]; // FAQ questions already used in this batch (to ensure uniqueness)
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

1. **Meta Description:** Must be 120-155 characters INCLUDING "Call now!" at the end (STRICT - count carefully!)
   - Focus on describing the service, company value proposition, and benefits
   - MUST naturally include BOTH company name and primary keyword
   - **MUST end with "Call now!" within the 120-155 character limit**
   - Format: "{CompanyName} provides {service} in {location}. [Brief benefit]. Call now!"
2. **Hero Description:** Must be 50-60 words (STRICT - count your words!)
   Example (52 words): "Our professional dumpster rental services in Phoenix provide reliable waste management solutions for residential and commercial projects. With same-day delivery, flexible rental periods, and competitive pricing, we make waste disposal easy. Contact us today for a free quote and experience hassle-free service from Phoenix's most trusted waste management company."
3. **Bullet Points:** Each must be ≥30 words (STRICT - count your words! Aim for 40-50 words)
   **CRITICAL FORMAT:** Each bullet MUST start with "<b>Topic Name:</b>" tag
   - Do NOT forget the opening "<b>" and closing "</b>" tags
   - Do NOT use other formats like bold markdown or asterisks
   - The format is: "<b>Topic:</b> Description text"

   Example (50 words): "<b>Custom Glass Solutions for All Commercial Needs:</b> As a professional commercial glass installer in Sumner, WA, we provide storefront glass, office partitions, entrance doors, and display windows. Every installation is measured and fitted to exact specifications, ensuring seamless integration with your building's design and long-lasting durability across all commercial applications."

   ❌ WRONG: "Custom Solutions: We provide..."
   ❌ WRONG: "**Custom Solutions:** We provide..."
   ✅ CORRECT: "<b>Custom Solutions:</b> We provide..."
4. **Map Description:** Must be 50-60 words (STRICT - count your words!)
5. **PRIMARY KEYWORD - ABSOLUTE REQUIREMENT (CRITICAL):**
   - You will be provided with an EXACT PRIMARY KEYWORD that has already been determined
   - **DO NOT modify, change, or vary this keyword in ANY way**
   - **DO NOT generate your own adjectives or alternative phrasings**
   - **DO NOT rearrange the word order**
   - Use the PRIMARY KEYWORD exactly as provided throughout ALL content
   - The keyword must appear verbatim in: H1, meta title, meta description, bullets, FAQs
   - Example: If given "Professional Plumber in Carlsbad, CA" - use EXACTLY that phrase
   - ❌ WRONG: "Expert Plumber in Carlsbad, CA" (changed adjective)
   - ❌ WRONG: "Plumber Professional in Carlsbad, CA" (changed order)
   - ✅ CORRECT: "Professional Plumber in Carlsbad, CA" (exact match)
6. **Company Name:** MUST mention company name naturally at least once in hero/FAQ/map sections (for internal linking)
7. **Location Name:** MUST mention full location naturally in benefits/why sections (for external linking to city websites)
8. **FAQs:** Generate SEO-relevant questions that real customers would actually search on Google.
   - **CRITICAL: Each FAQ must be UNIQUE across all pages in this batch - be creative and diverse**
   - **DO NOT use promotional questions** (avoid "why choose us", "what makes you special", etc.)
   - **FAQ Questions:**
     - Use the service WITHOUT the adjective from the primary keyword
     - Example: If primary keyword is "Professional Plumber in Carlsbad, CA", use "plumber in Carlsbad, CA" in questions
     - Include location naturally for local SEO
     - Phrase questions asking ABOUT the service (good grammar), not treating service as a subject performing actions
     - NO company name in questions
   - **FAQ Answers - NATURAL STRUCTURE (NOT PROMOTIONAL):**
     - **First half (30-40 words):** Answer in a GENERAL, educational way. Provide useful information without mentioning the company.
     - **Latter half (20-35 words):** Naturally mention ${companyName} and how they handle this. Make it organic, not forced.
     - Total: 50-75 words
     - Use company name instead of "we/our/us"
9. **Tone:** Professional, helpful, and authoritative
10. **Quality:** High-quality, unique content that provides value to readers

**CRITICAL HEADING FORMATS:**
- **H1:** Use the PRIMARY KEYWORD exactly as provided. DO NOT add company name to H1.
  Example: "Professional Commercial Glass Installer in Sumner, WA"

- **Benefits H2:** Create a compelling, contextual heading that MUST include BOTH:
  1. Company name
  2. Primary keyword (the EXACT phrase as provided)
  Focus: Why choose THIS COMPANY for this service
  Be creative! Avoid monotonous formats. Make it engaging and unique to the page.
  ✅ Good examples (assuming primary keyword is "Professional Plumber in Carlsbad, CA"):
    - "Experience Excellence with Parmley Plumbing - Your Professional Plumber in Carlsbad, CA"
    - "Parmley Plumbing: Leading Professional Plumber in Carlsbad, CA"
    - "Why Choose Parmley Plumbing for Professional Plumber in Carlsbad, CA"
    - "Trust Parmley Plumbing as Your Professional Plumber in Carlsbad, CA"
  ❌ Bad (too generic/missing primary keyword):
    - "Why Choose [Company Name]?"
    - "Our Services"

- **Why H2:** Create a compelling, contextual heading that MUST include primary keyword ONLY:
  1. Primary keyword (the EXACT phrase as provided)
  2. DO NOT include company name in Why heading
  Focus: Why this SERVICE is important in this LOCATION (not about the company)
  Be creative! Make it relevant to why this service matters in this specific location.
  ✅ Good examples (assuming primary keyword is "Professional Plumber in Carlsbad, CA"):
    - "Why Professional Plumber in Carlsbad, CA Matters for Your Property"
    - "The Importance of Professional Plumber in Carlsbad, CA"
    - "Why Carlsbad Needs Professional Plumber in Carlsbad, CA"
    - "The Critical Role of Professional Plumber in Carlsbad, CA"
  ❌ Bad (too generic/missing primary keyword/includes company name):
    - "Why Choose Us?" (missing primary keyword, includes company focus)
    - "Our Benefits" (missing primary keyword, includes company focus)
    - "Why Parmley Plumbing..." (includes company name - NOT allowed in Why heading)

**CRITICAL:** Count words carefully before responding. Double-check all word counts!

**LINKING REQUIREMENTS:**
- Internal links (company name) and external links (location name) will be added programmatically
- Ensure natural placement of company name and location in content for link insertion

**JSON Output Format:**
Always return ONLY valid JSON with this exact structure (omit sections as instructed):
{
  "metaTitle": "string",
  "metaDescription": "string (120-155 chars, must include company name, primary keyword, and end with 'Call now!')",
  "h1": "string",
  "heroDescription": "string (50-60 words)",
  "benefitsHeading": "string",
  "benefitsSubheading": "string",
  "benefitsBullets": ["<b>Topic:</b> text (30+ words)", "<b>Topic:</b> text (30+ words)", "<b>Topic:</b> text (30+ words)"],
  "whyHeading": "string",
  "whySubheading": "string",
  "whyBullets": ["<b>Topic:</b> text (30+ words)", "<b>Topic:</b> text (30+ words)", "<b>Topic:</b> text (30+ words)"],
  "faqs": [{"question": "string", "answer": "string"}, {"question": "string", "answer": "string"}, {"question": "string", "answer": "string"}],
  "mapDescription": "string (50-60 words)"
}

**REMEMBER:** ALL bullet points in benefitsBullets and whyBullets MUST start with "<b>Topic Name:</b>"`;
}

/**
 * Build page-specific prompt (sent for each page)
 */
function buildPagePrompt(params: ContentGenerationParams): string {
  const { service, location, primaryKeyword, omitSections, companyName, internalLinkPlacement, externalLinkPlacement, previouslyUsedFAQs } = params;

  const includeMap = !omitSections.includes("Map");
  const includeFAQ = !omitSections.includes("FAQ");
  const includeBenefits = !omitSections.includes("Benefits");
  const includeWhy = !omitSections.includes("Why");

  // Build link placement instructions
  let linkInstructions = '';
  if (internalLinkPlacement || externalLinkPlacement) {
    linkInstructions = '\n\n**LINK PLACEMENT CONTEXT (CRITICAL FOR NATURAL WRITING):**\n';

    if (internalLinkPlacement) {
      const sectionMap: Record<string, string> = {
        'hero': 'Hero Description',
        'faq-1': 'FAQ Answer 1',
        'faq-2': 'FAQ Answer 2',
        'faq-3': 'FAQ Answer 3',
        'map': 'Map Description'
      };
      const sectionName = sectionMap[internalLinkPlacement] || internalLinkPlacement;
      linkInstructions += `- An internal link will be added to the company name "${companyName}" in the ${sectionName} section.\n`;
      linkInstructions += `  **ACTION REQUIRED:** Ensure "${companyName}" appears naturally in the ${sectionName} section so the link can be inserted seamlessly.\n`;
    }

    if (externalLinkPlacement) {
      const sectionMap: Record<string, string> = {
        'benefits-1': 'Benefits Bullet 1',
        'benefits-2': 'Benefits Bullet 2',
        'benefits-3': 'Benefits Bullet 3',
        'why-1': 'Why Bullet 1',
        'why-2': 'Why Bullet 2',
        'why-3': 'Why Bullet 3'
      };
      const sectionName = sectionMap[externalLinkPlacement] || externalLinkPlacement;
      linkInstructions += `- An external link will be added to the location name "${location}" in the ${sectionName} section.\n`;
      linkInstructions += `  **ACTION REQUIRED:** Ensure the full location "${location}" appears naturally in the ${sectionName} section so the link can be inserted seamlessly.\n`;
    }
  }

  return `Generate content for this specific page:

**Company Name:** ${companyName}
**Service:** ${service}
**Location:** ${location}
**Primary Keyword:** ${primaryKeyword}

**CRITICAL - PRIMARY KEYWORD USAGE:**
The primary keyword "${primaryKeyword}" has been pre-determined by our system.
- ✅ USE THIS EXACT PHRASE: "${primaryKeyword}"
- ❌ DO NOT modify it in any way
- ❌ DO NOT change the adjective (first word)
- ❌ DO NOT rearrange word order
- ❌ DO NOT create alternative phrasings

**CRITICAL INSTRUCTIONS:**
1. H1 must be EXACTLY: "${primaryKeyword}" (no variations, no company name added)
2. Benefits H2 MUST include BOTH (MANDATORY):
   - Company name: "${companyName}"
   - Primary keyword: "${primaryKeyword}" (use the EXACT phrase)
   - Focus: Why choose THIS COMPANY for this service
   - Example: "Experience Excellence with ${companyName} - Your ${primaryKeyword}"
   - Example: "${companyName}: Leading ${primaryKeyword}"
   - Example: "Why Choose ${companyName} for ${primaryKeyword}"
3. Why H2 MUST include primary keyword ONLY (MANDATORY - DO NOT SKIP):
   - Primary keyword: "${primaryKeyword}" (use the EXACT phrase)
   - DO NOT include company name in Why heading
   - Focus: Why this SERVICE is important in this LOCATION (not about the company)
   - Be creative and contextual!
   - Example: "Why ${primaryKeyword} Matters for Your Property"
   - Example: "The Importance of ${primaryKeyword}"
   - Example: "Why ${location} Needs ${primaryKeyword}"
4. Use the EXACT phrase "${primaryKeyword}" multiple times throughout bullets, FAQs, and BOTH section headings
5. When referencing in natural text, you may use "${service}" alone, but when stating the full keyword, use "${primaryKeyword}" exactly
6. Make headings unique and engaging - avoid repetitive formats across pages
${linkInstructions}
${previouslyUsedFAQs && previouslyUsedFAQs.length > 0 ? `
**CRITICAL - FAQ UNIQUENESS:**
The following FAQ questions have ALREADY been used in previous pages in this batch:
${previouslyUsedFAQs.map((faq, idx) => `${idx + 1}. ${faq}`).join('\n')}

Generate completely DIFFERENT FAQ questions - NOT similar to the ones above. Be creative and choose entirely different topics.
` : ''}
**FAQ REQUIREMENTS:**

**MANDATORY PHRASE (MUST APPEAR IN EVERY QUESTION):**
"${primaryKeyword.split(' ').slice(1).join(' ')}"

YOU MUST USE THIS EXACT PHRASE IN EVERY QUESTION. DO NOT USE:
❌ "${primaryKeyword.split(' ')[1] || 'service'} inspections in ${primaryKeyword.split('in')[1]?.trim() || 'location'}"
❌ "${primaryKeyword.split(' ')[1] || 'service'} repair in ${primaryKeyword.split('in')[1]?.trim() || 'location'}"
❌ "${primaryKeyword.split(' ')[1] || 'service'} cleaning in ${primaryKeyword.split('in')[1]?.trim() || 'location'}"
❌ "${primaryKeyword.split(' ')[1] || 'service'} caps in ${primaryKeyword.split('in')[1]?.trim() || 'location'}"
❌ "${primaryKeyword.split(' ')[1] || 'service'} needs repairs in ${primaryKeyword.split('in')[1]?.trim() || 'location'}"

ONLY USE: "${primaryKeyword.split(' ').slice(1).join(' ')}" (EXACTLY AS SHOWN)

**UNIQUENESS CHECK:**
- If previouslyUsedFAQs are provided above, ensure your questions ask about DIFFERENT topics
- Do NOT reword the same question - ask about a DIFFERENT aspect of the service

**QUESTION REQUIREMENTS:**
- Use the EXACT phrase shown above in every question
- Ask SEO-relevant questions real customers would search
- NO company name in questions
- Be creative with topics while keeping the EXACT phrase

**ANSWER FORMAT:**
- First half (30-40 words): General, educational answer (no company mention)
- Latter half (20-35 words): Naturally mention ${companyName}
**Sections to Include:**
- Meta Title & Description
- H1 (exactly: "${primaryKeyword}")
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
    console.log(`[AI] Generating content with primaryKeyword: "${params.primaryKeyword}"`);

    let generated: GeneratedContent;

    if (PROVIDER === "claude") {
      generated = await generateWithClaude(params);
    } else {
      generated = await generateWithOpenAI(params);
    }

    console.log(`[AI] Generated content:`, {
      h1: generated.h1,
      metaTitle: generated.metaTitle,
      benefitsHeading: generated.benefitsHeading?.substring(0, 60) + '...',
      whyHeading: generated.whyHeading?.substring(0, 60) + '...',
      faqQuestions: generated.faqs?.map(f => f.question.substring(0, 50) + '...'),
    });

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
 * @deprecated Use validateAndFixContent for smart validation with auto-fix
 */
export function validateContent(
  content: GeneratedContent,
  omitSections: string[],
  companyName?: string,
  location?: string
): ValidationResult {
  const errors: string[] = [];

  // Meta description length (120-155 chars)
  if (content.metaDescription.length < 120) {
    errors.push(
      `Meta description too short (${content.metaDescription.length} chars, minimum 120)`
    );
  }
  if (content.metaDescription.length > 155) {
    errors.push(
      `Meta description too long (${content.metaDescription.length} chars, maximum 155)`
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
      if (words < 30) {
        errors.push(
          `Benefits bullet ${idx + 1} has ${words} words (minimum 30)`
        );
      }
    });
  }

  // Why bullets
  if (!omitSections.includes("Why")) {
    content.whyBullets.forEach((bullet, idx) => {
      const words = bullet.split(/\s+/).length;
      if (words < 30) {
        errors.push(`Why bullet ${idx + 1} has ${words} words (minimum 30)`);
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
 * Smart validation result with auto-fix and retry info
 */
export interface SmartValidationResult {
  content: GeneratedContent; // Fixed content
  autoFixed: string[]; // List of fields that were auto-fixed
  needsRetry: { field: string; reason: string }[]; // Fields that need AI retry
  warnings: string[]; // Non-blocking warnings
}

/**
 * Auto-fix meta description
 * Ensures: primary keyword, company name, "Call now!" at end, 120-155 chars total
 * The AI should already include "Call now!" - this just validates and fixes if needed
 * Format: "{CompanyName} provides {service} in {location}. [Brief benefit]. Call now!"
 */
function autoFixMetaDescription(
  metaDescription: string,
  primaryKeyword: string,
  companyName: string
): string {
  const targetMinLength = 120;
  const targetMaxLength = 155;

  // Check if description already has company name, keyword, and "Call now!"
  const hasCompany = metaDescription.toLowerCase().includes(companyName.toLowerCase());
  const hasKeyword = metaDescription.toLowerCase().includes(primaryKeyword.toLowerCase());
  const hasCTA = /call\s+(now|us|today)!?$/i.test(metaDescription);

  // If everything is present and length is good, return as-is
  if (hasCompany && hasKeyword && hasCTA) {
    if (metaDescription.length >= targetMinLength && metaDescription.length <= targetMaxLength) {
      return metaDescription;
    }
  }

  // Otherwise, reconstruct from scratch
  // Extract service and location from primary keyword
  const keywordParts = primaryKeyword.split(' in ');
  const service = keywordParts[0] || primaryKeyword;
  const location = keywordParts[1] || '';

  // Build base description
  let fixed: string;
  if (location) {
    // Format: "{CompanyName} provides {service} in {location}"
    fixed = `${companyName} provides ${service.toLowerCase()} in ${location}`;
  } else {
    // Format: "{CompanyName} offers {service}"
    fixed = `${companyName} offers ${service.toLowerCase()}`;
  }

  // Add period if not present
  if (!fixed.endsWith('.')) {
    fixed += '.';
  }

  // Calculate space for benefits (we need to reserve space for " Call now!" = 11 chars)
  const ctaLength = 11; // " Call now!"
  const currentLength = fixed.length;
  const maxContentLength = targetMaxLength - ctaLength;
  const minContentLength = targetMinLength - ctaLength;

  // Try to extract benefits from original description if we have room
  if (currentLength < maxContentLength - 20) {
    // Clean the original description to extract useful benefit text
    let cleanDesc = metaDescription
      .replace(/call\s+(now|us|today)!?\.?$/i, '')
      .replace(/contact\s+us!?\.?$/i, '')
      .trim();

    // Extract benefit phrases
    const benefitMatch = cleanDesc.match(/(?:with|offering|featuring|providing)\s+([^.]+)/i);
    if (benefitMatch && benefitMatch[1]) {
      const benefit = benefitMatch[1].trim();
      const additionalText = ` ${benefit}`;

      if ((fixed.length + additionalText.length + ctaLength) <= targetMaxLength) {
        fixed = fixed.replace(/\.$/, '') + additionalText + '.';
      }
    }
  }

  // Ensure we meet minimum length before adding CTA
  if (fixed.length < minContentLength) {
    // Add generic benefit to reach minimum
    const genericBenefit = " Professional service with quality results";
    if ((fixed.length + genericBenefit.length + ctaLength) <= targetMaxLength) {
      fixed = fixed.replace(/\.$/, '') + genericBenefit + '.';
    }
  }

  // Add CTA
  fixed += " Call now!";

  // Final length check - trim if too long (keep CTA intact)
  if (fixed.length > targetMaxLength) {
    // Calculate how much to trim
    const excessLength = fixed.length - targetMaxLength;
    // Remove from before the CTA
    const contentWithoutCTA = fixed.substring(0, fixed.length - 11); // Remove " Call now!"
    const trimmedContent = contentWithoutCTA.substring(0, contentWithoutCTA.length - excessLength);
    // Ensure it ends with a period before CTA
    fixed = trimmedContent.replace(/\.*$/, '.') + " Call now!";
  }

  return fixed;
}

/**
 * Auto-fix meta title
 * Format: {primary keyword} | {company name}, under 80 chars
 * If too long: remove adjective, then trim company name
 *
 * NOTE: For SEO plugin fields, use only primaryKeyword to avoid duplicates
 * when the plugin has title templates enabled.
 */
function autoFixMetaTitle(
  metaTitle: string,
  primaryKeyword: string,
  companyName: string
): string {
  const idealFormat = `${primaryKeyword} | ${companyName}`;

  // If already in correct format and under 80 chars, return as-is
  if (idealFormat.length <= 80) {
    return idealFormat;
  }

  // Try removing adjective from primary keyword
  const words = primaryKeyword.split(" ");
  if (words.length > 1) {
    // Remove first word (adjective)
    const keywordWithoutAdjective = words.slice(1).join(" ");
    const withoutAdj = `${keywordWithoutAdjective} | ${companyName}`;
    if (withoutAdj.length <= 80) {
      return withoutAdj;
    }
  }

  // Still too long, trim company name
  const keywordPart = words.slice(1).join(" ") || primaryKeyword;
  const availableSpace = 80 - keywordPart.length - 3; // -3 for " | "
  const trimmedCompany =
    companyName.length > availableSpace
      ? companyName.substring(0, availableSpace - 3) + "..."
      : companyName;

  return `${keywordPart} | ${trimmedCompany}`;
}

/**
 * Auto-fix H1
 * Should be: primary keyword only (no company name)
 */
function autoFixH1(h1: string, primaryKeyword: string): string {
  return primaryKeyword;
}

/**
 * Auto-fix Benefits heading
 * Format: "Why Choose [Company Name] as Your [Primary Keyword]?"
 */
function autoFixBenefitsHeading(
  heading: string,
  primaryKeyword: string,
  companyName: string
): string {
  return `Why Choose ${companyName} as Your ${primaryKeyword}?`;
}

/**
 * Auto-fix Why heading
 * Format: "Why Is [Service] Important in [Location]?" (no adjective)
 */
function autoFixWhyHeading(
  heading: string,
  service: string,
  location: string
): string {
  return `Why Is ${service} Important in ${location}?`;
}

/**
 * Smart validation with auto-fix and selective retry
 * Auto-fixes: meta description, meta title, H1, benefits heading, why heading
 * Retries: FAQs, map section
 */
export async function validateAndFixContent(
  content: GeneratedContent,
  params: ContentGenerationParams
): Promise<SmartValidationResult> {
  const { primaryKeyword, companyName, service, location, omitSections } =
    params;
  const autoFixed: string[] = [];
  const needsRetry: { field: string; reason: string }[] = [];
  const warnings: string[] = [];

  // Make a copy to modify
  const fixed = { ...content };

  // 1. AUTO-FIX: Meta Description
  const originalMetaDesc = fixed.metaDescription;
  fixed.metaDescription = autoFixMetaDescription(
    fixed.metaDescription,
    primaryKeyword,
    companyName
  );
  if (fixed.metaDescription !== originalMetaDesc) {
    autoFixed.push("metaDescription");
    console.log("[AUTO-FIX] Meta description fixed");
  }

  // 2. AUTO-FIX: Meta Title
  const originalMetaTitle = fixed.metaTitle;
  fixed.metaTitle = autoFixMetaTitle(
    fixed.metaTitle,
    primaryKeyword,
    companyName
  );
  if (fixed.metaTitle !== originalMetaTitle) {
    autoFixed.push("metaTitle");
    console.log("[AUTO-FIX] Meta title fixed");
  }

  // 3. AUTO-FIX: H1
  const originalH1 = fixed.h1;
  fixed.h1 = autoFixH1(fixed.h1, primaryKeyword);
  if (fixed.h1 !== originalH1) {
    autoFixed.push("h1");
    console.log("[AUTO-FIX] H1 fixed");
  }

  // 4. CHECK: Benefits Heading (warn if missing company name or primary keyword)
  if (!omitSections.includes("Benefits")) {
    const hasCompany = fixed.benefitsHeading.toLowerCase().includes(companyName.toLowerCase());
    const hasKeyword = fixed.benefitsHeading.toLowerCase().includes(primaryKeyword.toLowerCase());

    if (!hasCompany) {
      warnings.push(`Benefits heading missing company name: "${companyName}"`);
    }
    if (!hasKeyword) {
      warnings.push(`Benefits heading missing primary keyword: "${primaryKeyword}"`);
    }
  }

  // 5. CHECK: Why Heading (warn if missing primary keyword, or if it includes company name)
  if (!omitSections.includes("Why")) {
    const hasCompany = fixed.whyHeading.toLowerCase().includes(companyName.toLowerCase());
    const hasKeyword = fixed.whyHeading.toLowerCase().includes(primaryKeyword.toLowerCase());

    if (hasCompany) {
      warnings.push(`Why heading should NOT include company name (it's about service importance, not the company)`);
    }
    if (!hasKeyword) {
      warnings.push(`Why heading missing primary keyword: "${primaryKeyword}"`);
    }
  }

  // 6. CHECK FAQs (selective retry if issues)
  if (!omitSections.includes("FAQ")) {
    let faqIssues: string[] = [];

    fixed.faqs.forEach((faq, idx) => {
      // Check if at least ONE FAQ uses primary keyword (not all FAQs need it - be flexible)
      // We'll check this after the loop

      // Check if answer mentions company name in latter half
      const hasCompanyName = faq.answer
        .toLowerCase()
        .includes(companyName.toLowerCase());
      if (!hasCompanyName) {
        faqIssues.push(`FAQ ${idx + 1} answer missing company name`);
      }

      // Check if answer is too promotional (multiple promotional phrases)
      const promotionalPhrases = ["why choose", "why select", "what makes us", "what sets us apart"];
      const isPromotional = promotionalPhrases.some(phrase => faq.question.toLowerCase().includes(phrase));
      if (isPromotional) {
        faqIssues.push(`FAQ ${idx + 1} is promotional - use customer-focused questions instead`);
      }

      // Check answer length (should be 50-75 words)
      const answerWords = faq.answer.split(/\s+/).length;
      if (answerWords < 40 || answerWords > 90) {
        faqIssues.push(
          `FAQ ${idx + 1} answer has ${answerWords} words (should be 50-75)`
        );
      }

      // Check similarity to previously used FAQs (if provided)
      if (params.previouslyUsedFAQs && params.previouslyUsedFAQs.length > 0) {
        const currentQuestion = faq.question.toLowerCase();

        for (const previousFaq of params.previouslyUsedFAQs) {
          const previousQuestion = previousFaq.toLowerCase();

          // Calculate simple similarity: check if questions share significant words
          const currentWords = currentQuestion.split(/\s+/).filter(w => w.length > 3);
          const previousWords = previousQuestion.split(/\s+/).filter(w => w.length > 3);

          // Count matching words (excluding common words)
          const commonWords = new Set(['what', 'when', 'where', 'who', 'why', 'how', 'does', 'can', 'will', 'the', 'is', 'are', 'for', 'in', 'on', 'at', 'to', 'from', 'with', 'your', 'our']);
          const matchingWords = currentWords.filter(w =>
            !commonWords.has(w) && previousWords.includes(w)
          ).length;

          // If more than 50% of significant words match, questions are too similar
          const similarityThreshold = Math.floor(currentWords.length * 0.5);
          if (matchingWords >= similarityThreshold && matchingWords >= 2) {
            faqIssues.push(`FAQ ${idx + 1} is too similar to a previously used FAQ: "${previousFaq.substring(0, 50)}..."`);
            break; // Only report once per FAQ
          }
        }
      }
    });

    // Check if at least ONE FAQ uses primary keyword or service (flexible - not all need it)
    const hasAnyKeyword = fixed.faqs.some(faq => {
      const q = faq.question.toLowerCase();
      return q.includes(primaryKeyword.toLowerCase()) || q.includes(service.toLowerCase());
    });
    if (!hasAnyKeyword) {
      faqIssues.push(`At least one FAQ should mention the primary keyword or service`);
    }

    if (faqIssues.length > 0) {
      needsRetry.push({
        field: "faqs",
        reason: faqIssues.join("; "),
      });
    }
  }

  // 7. CHECK Map Description (selective retry if wrong length)
  if (!omitSections.includes("Map") && fixed.mapDescription) {
    const mapWords = fixed.mapDescription.split(/\s+/).length;
    if (mapWords < 50 || mapWords > 60) {
      needsRetry.push({
        field: "mapDescription",
        reason: `Map description has ${mapWords} words (should be 50-60)`,
      });
    }
  }

  // 8. Hero description word count (target 50-60 words, only retry if critically low)
  const heroWords = fixed.heroDescription.split(/\s+/).length;
  if (heroWords < 30 || heroWords > 60) {
    needsRetry.push({
      field: "heroDescription",
      reason: `Hero description has ${heroWords} words (target 50-60 words, minimum 30)`,
    });
  }

  // 9. Bullet point lengths (target 30+ words, only retry if critically low)
  const bulletIssues: string[] = [];

  if (!omitSections.includes("Benefits")) {
    fixed.benefitsBullets.forEach((bullet, idx) => {
      const words = bullet.split(/\s+/).length;
      if (words < 26) {
        bulletIssues.push(
          `Benefits bullet ${idx + 1} has ${words} words (target 30+, minimum 26)`
        );
      }
    });
  }

  if (!omitSections.includes("Why")) {
    fixed.whyBullets.forEach((bullet, idx) => {
      const words = bullet.split(/\s+/).length;
      if (words < 26) {
        bulletIssues.push(`Why bullet ${idx + 1} has ${words} words (target 30+, minimum 26)`);
      }
    });
  }

  if (bulletIssues.length > 0) {
    needsRetry.push({
      field: "bullets",
      reason: bulletIssues.join("; "),
    });
  }

  return {
    content: fixed,
    autoFixed,
    needsRetry,
    warnings,
  };
}

/**
 * Regenerate specific field only (selective retry)
 * Supports granular field regeneration:
 * - Individual meta fields: metaTitle, metaDescription
 * - Individual hero fields: h1, heroDescription
 * - Individual section headings: benefitsHeading, benefitsSubheading, whyHeading, whySubheading
 * - Individual bullets: benefitsBullet-1, benefitsBullet-2, benefitsBullet-3, whyBullet-1, whyBullet-2, whyBullet-3
 * - Individual FAQs: faq-1, faq-2, faq-3
 * - Whole sections: faqs, mapDescription, bullets
 */
export async function regenerateField(
  params: ContentGenerationParams,
  field: string, // Changed to string for flexibility
  previousContent: GeneratedContent,
  reason: string
): Promise<any> {
  if (!PROVIDER) {
    throw new Error("No AI API key configured");
  }

  const {primaryKeyword, companyName, service, location } = params;

  let retryPrompt = "";

  if (field === "faqs") {
    // Extract service without adjective for FAQ questions
    const serviceWithoutAdjective = primaryKeyword.split(' ').slice(1).join(' ') || service;

    // Get list of previously used FAQs from OTHER pages in batch
    const previousFAQsList = params.previouslyUsedFAQs && params.previouslyUsedFAQs.length > 0
      ? `\n\n**PREVIOUSLY USED FAQ QUESTIONS IN THIS BATCH (DO NOT REPEAT OR BE TOO SIMILAR):**\n${params.previouslyUsedFAQs.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    // Get current page's FAQs that need to be replaced
    const currentFAQs = previousContent.faqs || [];
    const currentFAQsList = currentFAQs.length > 0
      ? `\n\n**CURRENT FAQs BEING REPLACED (GENERATE COMPLETELY DIFFERENT TOPICS):**\n${currentFAQs.map((faq: any, i: number) => `${i + 1}. Q: ${faq.question}\n   A: ${faq.answer.substring(0, 100)}...`).join('\n\n')}`
      : '';

    retryPrompt = `The previously generated FAQs have issues: ${reason}

You MUST generate COMPLETELY NEW FAQs with DIFFERENT TOPICS than what was previously generated.

Please regenerate ONLY the 3 FAQs following these STRICT requirements:

**Primary Keyword (for reference):** ${primaryKeyword}
**Service (without adjective):** ${serviceWithoutAdjective}
**Company Name:** ${companyName}
**Location:** ${location}${previousFAQsList}${currentFAQsList}

**CRITICAL - GENERATE FRESH, UNIQUE TOPICS:**
- DO NOT reuse the same topics from current FAQs above
- DO NOT answer the same questions in different words
- Choose COMPLETELY DIFFERENT aspects of the service to address
- Be creative and diverse with your FAQ topics

**MANDATORY PHRASE (MUST APPEAR IN EVERY QUESTION):**
"${serviceWithoutAdjective} in ${location}"

YOU MUST USE THIS EXACT PHRASE IN EVERY QUESTION. DO NOT USE:
❌ "${serviceWithoutAdjective.split(' ')[0]} inspections in ${location}"
❌ "${serviceWithoutAdjective.split(' ')[0]} repair in ${location}"
❌ "${serviceWithoutAdjective.split(' ')[0]} cleaning in ${location}"
❌ "${serviceWithoutAdjective.split(' ')[0]} caps in ${location}"
❌ "${serviceWithoutAdjective.split(' ')[0]} needs repairs in ${location}"

ONLY USE: "${serviceWithoutAdjective} in ${location}" (EXACTLY AS SHOWN)

**UNIQUENESS CHECK:**
- The current FAQs above are being replaced because they are duplicate or not relevant
- Generate questions about COMPLETELY DIFFERENT topics than those shown above
- Do NOT reword the same questions - choose ENTIRELY different aspects to ask about

**QUESTION REQUIREMENTS:**
- Use the EXACT phrase shown above in every question
- Ask SEO-relevant questions real customers would search
- NO company name in questions
- Be creative with topics while keeping the EXACT phrase

**FAQ ANSWER FORMAT (NATURAL, NOT PROMOTIONAL):**
- **First half (30-40 words):** General, educational answer. Do NOT mention company.
- **Latter half (20-35 words):** Naturally mention "${companyName}" and how they handle this.
- Total: 50-75 words
- Be natural and organic, not promotional

Return ONLY a JSON object with this structure:
{
  "faqs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}`;
  } else if (field === "mapDescription") {
    retryPrompt = `The previously generated map description has an issue: ${reason}

Please regenerate ONLY the map description following these requirements:

**Primary Keyword (USE EXACTLY AS PROVIDED):** ${primaryKeyword}
**Company Name:** ${companyName}
**Service:** ${service}
**Location:** ${location}

**CRITICAL - PRIMARY KEYWORD USAGE:**
The primary keyword "${primaryKeyword}" is pre-determined. DO NOT modify it.
- ✅ USE EXACTLY: "${primaryKeyword}"
- ❌ DO NOT change the adjective

**Map Description Requirements:**
1. MUST be exactly 50-60 words (STRICT - count carefully!)
2. Include the exact primary keyword "${primaryKeyword}" naturally in the text
3. Describe service coverage in the location
4. Mention company name "${companyName}" at least once
5. Professional, informative tone

Return ONLY a JSON object with this structure:
{
  "mapDescription": "Your 50-60 word description here..."
}`;
  } else if (field === "heroDescription") {
    retryPrompt = `The previously generated hero description has an issue: ${reason}

Please regenerate ONLY the hero description following these requirements:

**Primary Keyword (USE EXACTLY AS PROVIDED):** ${primaryKeyword}
**Company Name:** ${companyName}
**Service:** ${service}
**Location:** ${location}

**CRITICAL - PRIMARY KEYWORD USAGE:**
The primary keyword "${primaryKeyword}" is pre-determined. DO NOT modify it.
- ✅ USE EXACTLY: "${primaryKeyword}"
- ❌ DO NOT change the adjective

**Hero Description Requirements:**
1. MUST be exactly 50-60 words (STRICT - count carefully!)
2. Include the exact primary keyword "${primaryKeyword}" naturally in the text
3. Describe the service and its benefits
4. Mention company name "${companyName}" at least once
5. Professional, engaging tone
6. DO NOT include call-to-action phrases like "Call now!" - these are added programmatically

Return ONLY a JSON object with this structure:
{
  "heroDescription": "Your 50-60 word description here..."
}`;
  } else if (field === "bullets") {
    retryPrompt = `The previously generated bullet points have issues: ${reason}

Please regenerate ONLY the bullet points that don't meet the word count requirement.

**Primary Keyword (USE EXACTLY AS PROVIDED):** ${primaryKeyword}
**Company Name:** ${companyName}
**Service:** ${service}
**Location:** ${location}

**CRITICAL - PRIMARY KEYWORD USAGE:**
The primary keyword "${primaryKeyword}" is pre-determined. DO NOT modify it.
- ✅ USE EXACTLY: "${primaryKeyword}"
- ❌ DO NOT change the adjective

**Bullet Point Requirements:**
1. Each bullet MUST be at least 30 words (aim for 40-50 words for safety)
2. Each bullet MUST start with "<b>Topic Name:</b>" format (HTML bold tags)
3. Include the exact primary keyword "${primaryKeyword}" naturally in the text
4. Provide specific, valuable information about the service
5. Professional, informative tone

**Example Format:**
"<b>Custom Glass Solutions for All Commercial Needs:</b> As a professional commercial glass installer in Sumner, WA, we provide storefront glass, office partitions, entrance doors, and display windows. Every installation is measured and fitted to exact specifications, ensuring seamless integration with your building's design and long-lasting durability across all commercial applications."

Return ONLY a JSON object with this structure (regenerate ALL 6 bullets):
{
  "benefitsBullets": ["<b>Topic:</b> 30+ words here...", "<b>Topic:</b> 30+ words here...", "<b>Topic:</b> 30+ words here..."],
  "whyBullets": ["<b>Topic:</b> 30+ words here...", "<b>Topic:</b> 30+ words here...", "<b>Topic:</b> 30+ words here..."]
}`;
  }
  // Individual field regeneration
  else if (field === "metaTitle") {
    retryPrompt = `Regenerate ONLY the meta title.

**Primary Keyword:** ${primaryKeyword}
**Company Name:** ${companyName}

**Requirements:**
- Format: "${primaryKeyword} | ${companyName}"
- Must be under 80 characters
- Use the exact primary keyword as provided

Return ONLY a JSON object:
{"metaTitle": "..."}`;
  }
  else if (field === "metaDescription") {
    retryPrompt = `Regenerate ONLY the meta description.

**Primary Keyword:** ${primaryKeyword}
**Company Name:** ${companyName}
**Service:** ${service}
**Location:** ${location}

**CRITICAL Requirements:**
- MUST be 120-155 characters INCLUDING "Call now!" at the end (STRICT - count carefully!)
- MUST naturally include BOTH the company name "${companyName}" AND the primary keyword "${primaryKeyword}"
- MUST end with "Call now!" within the 120-155 character limit
- Focus on benefits and value proposition
- Format: "${companyName} provides ${primaryKeyword.toLowerCase()}. [Brief benefit]. Call now!"

**Example (good - 145 characters):**
"ABC Roofing provides expert roof repair in Phoenix, AZ with 25+ years of experience, licensed contractors, and same-day service. Call now!"

Return ONLY a JSON object:
{"metaDescription": "..."}`;
  }
  else if (field === "h1") {
    retryPrompt = `Regenerate ONLY the H1 heading.

**Primary Keyword:** ${primaryKeyword}

**Requirements:**
- H1 must be EXACTLY the primary keyword: "${primaryKeyword}"
- No company name, no variations

Return ONLY a JSON object:
{"h1": "${primaryKeyword}"}`;
  }
  else if (field === "benefitsHeading") {
    retryPrompt = `Regenerate ONLY the Benefits section heading.

**Primary Keyword:** ${primaryKeyword}
**Company Name:** ${companyName}

**Requirements:**
- MUST include BOTH company name and exact primary keyword
- Focus: Why choose THIS COMPANY for this service
- Be creative and engaging
- Example: "Experience Excellence with ${companyName} - Your ${primaryKeyword}"

Return ONLY a JSON object:
{"benefitsHeading": "..."}`;
  }
  else if (field === "benefitsSubheading") {
    retryPrompt = `Regenerate ONLY the Benefits section subheading.

**Primary Keyword:** ${primaryKeyword}
**Company Name:** ${companyName}
**Service:** ${service}

**Requirements:**
- Brief, engaging subtitle for the benefits section
- Should complement the main heading

Return ONLY a JSON object:
{"benefitsSubheading": "..."}`;
  }
  else if (field === "whyHeading") {
    retryPrompt = `Regenerate ONLY the Why section heading.

**Primary Keyword:** ${primaryKeyword}
**Location:** ${location}

**Requirements:**
- MUST include the exact primary keyword
- DO NOT include company name (this is about service importance, not the company)
- Focus: Why this SERVICE matters in this LOCATION
- Example: "Why ${primaryKeyword} Matters for Your Property"

Return ONLY a JSON object:
{"whyHeading": "..."}`;
  }
  else if (field === "whySubheading") {
    retryPrompt = `Regenerate ONLY the Why section subheading.

**Primary Keyword:** ${primaryKeyword}
**Service:** ${service}
**Location:** ${location}

**Requirements:**
- Brief, engaging subtitle for the why section
- Should complement the main heading

Return ONLY a JSON object:
{"whySubheading": "..."}`;
  }
  else if (field.startsWith("benefitsBullet-")) {
    const bulletIndex = parseInt(field.split("-")[1]) - 1;
    const currentBullet = previousContent.benefitsBullets[bulletIndex] || "";

    retryPrompt = `Regenerate ONLY Benefits bullet #${bulletIndex + 1}.

**Current bullet:** ${currentBullet}
**Issue:** ${reason}

**Primary Keyword:** ${primaryKeyword}
**Service:** ${service}
**Location:** ${location}

**Requirements:**
- MUST be at least 30 words (aim for 40-50 words)
- MUST start with "<b>Topic Name:</b>" format (HTML bold tags)
- Include the exact primary keyword naturally if relevant
- Provide specific, valuable information
- Professional tone

Return ONLY a JSON object with the single bullet:
{"benefitsBullet": "<b>Topic:</b> 30+ words here..."}`;
  }
  else if (field.startsWith("whyBullet-")) {
    const bulletIndex = parseInt(field.split("-")[1]) - 1;
    const currentBullet = previousContent.whyBullets[bulletIndex] || "";

    retryPrompt = `Regenerate ONLY Why bullet #${bulletIndex + 1}.

**Current bullet:** ${currentBullet}
**Issue:** ${reason}

**Primary Keyword:** ${primaryKeyword}
**Service:** ${service}
**Location:** ${location}

**Requirements:**
- MUST be at least 30 words (aim for 40-50 words)
- MUST start with "<b>Topic Name:</b>" format (HTML bold tags)
- Include the exact primary keyword naturally if relevant
- Provide specific, valuable information about why this service matters
- Professional tone

Return ONLY a JSON object with the single bullet:
{"whyBullet": "<b>Topic:</b> 30+ words here..."}`;
  }
  else if (field.startsWith("faq-")) {
    const faqIndex = parseInt(field.split("-")[1]) - 1;
    const currentFaq = previousContent.faqs[faqIndex] || { question: "", answer: "" };
    // Extract service without adjective for FAQ questions
    const serviceWithoutAdjective = primaryKeyword.split(' ').slice(1).join(' ') || service;

    retryPrompt = `Regenerate ONLY FAQ #${faqIndex + 1}.

**Current FAQ:**
Q: ${currentFaq.question}
A: ${currentFaq.answer}

**Issue:** ${reason}

**Primary Keyword (for reference):** ${primaryKeyword}
**Service (without adjective):** ${serviceWithoutAdjective}
**Company Name:** ${companyName}
**Location:** ${location}

**FAQ Requirements:**
- Question must use "${serviceWithoutAdjective}" (service WITHOUT adjective)
- NO company name in question
- Question should be what real customers search on Google
- Use good grammar - ask ABOUT the service
- Answer: 50-75 words (First half = general/educational 30-40 words, Latter half = mention ${companyName} naturally 20-35 words)
- Be creative and SEO-relevant, NOT promotional

Return ONLY a JSON object with the single FAQ:
{"faq": {"question": "...", "answer": "..."}}`;
  }

  try {
    if (PROVIDER === "claude" && anthropic) {
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: retryPrompt,
          },
        ],
      });

      return parseAIResponse(message.content[0]);
    } else if (PROVIDER === "openai" && openai) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("Empty response");
      return JSON.parse(content);
    }

    throw new Error("No provider available");
  } catch (error) {
    console.error(`Retry for ${field} failed:`, error);
    throw new Error(
      `Failed to regenerate ${field}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate adjectives for batch of pages
 * @deprecated This function is no longer used. Use deterministic adjectives from @/lib/adjectives instead.
 * The system now uses a predefined list of adjectives for consistency between preview and generation.
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
