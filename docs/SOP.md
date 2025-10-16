# SEO On-Page Content Generation SOP

## Page Types & URL Structure

### 1. Top Level Service Areas Page

- **Purpose:** Overview of all service areas with clickable links
- **URL Example:** `https://example.com/service-areas/`
- **Title Tag:** "Company Name Service Areas"

### 2. Top Level Services Page

- **Purpose:** Overview of all services offered
- **URL Example:** `https://example.com/services/`
- **Title Tag:** "Company Name Services"

### 3. Primary Service Pages

- **Purpose:** Main service page (not location-specific)
- **URL Example:** `https://example.com/services/roof-repair/`
- **Title Tag:** "Service Name | Business Name"
- **Linked from:** Top Level Services Page
- **Content Focus:** Service-focused, not location-specific

### 4. Nested Broad Stroke (County-level)

- **Purpose:** General overview of services for the county
- **URL Example:** `https://example.com/service-areas/kerr-county-tx/`
- **Title Tag:** "Service | County, State | Business Name"

### 5. Broad Stroke (Town-level)

- **Purpose:** General overview of services for the town
- **URL Example:** `https://example.com/service-areas/kerr-county-tx/pearland/`
- **Title Tag:** "Service | Town, State | Business Name"

### 6. Location Service Pages

- **Purpose:** Specific service in specific town
- **URL Example:** `https://example.com/service-areas/kerr-county-tx/pearland/landscape-lighting/`
- **Title Tag:** "Service | Location | Business Name"

---

## Content Structure Requirements

### Meta Description

**Character Length:** 120-155 characters INCLUDING "Call now!" at the end (strictly enforced)

**Components:**

1. Company Name + Primary Keyword
2. Unique Selling Proposition (USP)
3. Call to Action: "Call now!" (MUST be included within the 120-155 character limit)

**Format:** "{CompanyName} provides {service} in {location}. [Brief benefit]. Call now!"

**Examples:**

- Nested County: "Gikas Roofing offers premier roofing services in Rockland County, NY. Experienced professionals, quality materials, and excellence. Call now!" (149 chars)
- Broad Town: "Gikas Roofing is your go-to for superior roofing services in Pearl River, NY. Expertise in repair, installation, and maintenance. Call now!" (147 chars)
- Service Town: "Gikas Roofing offers premier roof installation services in Pearl River, NY. Our expert team ensures top-quality installations. Call now!" (143 chars)

**Tone:** Professional, trustworthy, local, clear, action-oriented

---

### Hero Section

**H1 Tag:**

- Primary headline of the page
- **MUST include:** location + service
- Critical SEO element

**Hero Description:**

- 50-60 words
- Contains primary keyword
- Professional tone
- Describes service offering

---

### Benefits Section

**Heading (H2):**

- **MUST include BOTH:** Company name + Primary keyword (EXACT phrase)
- **Be creative and contextual!** Avoid monotonous, repetitive formats
- Make it unique to the page and engaging

**Good Examples (Primary keyword: "Professional Plumber in Carlsbad, CA"):**
- "Experience Excellence with [Company Name] - Your Professional Plumber in Carlsbad, CA"
- "[Company Name]: Leading Professional Plumber in Carlsbad, CA"
- "Why Choose [Company Name] for Professional Plumber in Carlsbad, CA"
- "Trust [Company Name] as Your Professional Plumber in Carlsbad, CA"

**Bad Examples (Avoid):**
- "Why Choose [Company Name]?" (missing primary keyword)
- "Our Services" (missing primary keyword)
- Using the same format for every page

**Subheading:**

- Generic 4-5 word statement about company/services
- Example: "Quality. Precision. Reliable."

**3 Bullet Points:**

- Each bullet: **minimum 30+ words** (strictly enforced)
- Each starts with `<b>Topic Name:</b>` tag
- Focus on company's unique selling propositions
- Optimized with primary keyword
- **Must be unique** across pages for same company

---

### Why Section

**Heading (H2):**

- **MUST include:** Primary keyword (EXACT phrase) ONLY
- **DO NOT include company name** - this section is about service importance, not the company
- **Be creative and contextual!** Avoid monotonous, repetitive formats
- Make it relevant to why this service matters in this specific location

**Good Examples (Primary keyword: "Professional Plumber in Carlsbad, CA"):**
- "Why Professional Plumber in Carlsbad, CA Matters for Your Property"
- "The Importance of Professional Plumber in Carlsbad, CA"
- "Why Carlsbad Needs Professional Plumber in Carlsbad, CA"
- "The Critical Role of Professional Plumber in Carlsbad, CA"

**Bad Examples (Avoid):**
- "Why Choose Us?" (missing primary keyword, company-focused)
- "Our Benefits" (not contextual, missing primary keyword)
- "Why [Company Name] is the Best..." (includes company name - NOT allowed)

**For Primary Service Pages (no location):**
- Focus on the importance of the service generally
- Example: "Why Quality [Service] Matters for Your Business"

**Subheading:**

- Generic 4-5 word statement
- Example: "Protection. Appeal. Durability."

**3 Bullet Points:**

- Each bullet: **minimum 30+ words** (strictly enforced)
- Each starts with `<b>Topic Name:</b>` tag
- **CRITICAL:** Focus on **why [service] is important in [location]**
- **NOT about the company** - about the service itself
- **NOT "why choose us"** - about why the service matters
- For Primary Service pages: why this service is important generally
- Optimized with primary keyword
- **Must be unique** across pages for same company

**Example (Location Service - Correct):**
<b>Prevents Weather Damage:</b> Hiring a roof repair specialist in Austin protects your home from Texas heat, storms, and humidity that can cause leaks and structural damage.

**Example (Wrong - About Company):**
❌ <b>Experienced Team:</b> Our company has 20 years of experience and certified technicians who provide quality service.

**Example (Primary Service - Correct):**
<b>Protects Your Investment:</b> Regular roof maintenance prevents costly repairs and extends the lifespan of your roofing system, saving thousands in replacement costs.

---

### FAQ Section

**Template Setup (Elementor):**

- Use Elementor **Accordion widget** for FAQ section
- **Enable "FAQ Schema" toggle** in accordion settings (Style tab)
- This automatically adds proper FAQ schema markup for SERP features
- Set CSS IDs: `faq-1-question`, `faq-1-answer`, `faq-2-question`, `faq-2-answer`, `faq-3-question`, `faq-3-answer`

**Content Requirements:**

- Provide **exactly 3 SEO-optimized questions and answers**
- Specific to [service] in [location]
- **Must be unique** across pages for same company
- **Must be SEO-relevant** (not company promotional)
- **FAQ Questions:** Use service and location WITHOUT the adjective from the primary keyword
  - Example: If primary keyword is "Professional Plumber in Carlsbad, CA", FAQ questions should use "plumber in Carlsbad, CA"
  - Remove adjectives like "Professional", "Expert", "Trusted", etc. from questions
- **FAQ Answers:** Can use the full primary keyword naturally when relevant
- **Company name mentioned in 2nd half of answer only**
- **CRITICAL: Use company name instead of "we", "our", "us" in answers**
  - ✅ Say: "[Company Name] provides..."
  - ❌ Don't say: "We provide..."
  - Better for SEO visibility and brand recognition

**SERP Optimization (Critical for Featured Snippets & PAA):**

1. **Question Format:**
   - Natural language (how people search)
   - Start with: "How much", "How long", "Do you", "What", "When", "Can I"
   - Include service + location in question
   - Target common customer concerns: cost, time, availability, process

2. **Answer Format:**
   - **First sentence:** Direct answer (1-2 sentences, 15-25 words)
   - **Second part:** Supporting details with specifics (25-35 words)
   - **Total length:** 50-75 words per answer
   - Include location name 2-3 times naturally
   - End with benefit or call-to-action element

3. **Topic Coverage (Choose 3 from these common patterns):**
   - **Cost/Pricing:** "How much does [service] cost in [location]?"
   - **Timeframe:** "How long does [service] take in [location]?"
   - **Availability:** "Do you offer emergency/24-7 [service] in [location]?"
   - **Process:** "What does the [service] process involve in [location]?"
   - **Coverage Area:** "Do you serve [location] and surrounding areas?"
   - **Materials/Methods:** "What materials/methods do you use for [service]?"

**Examples (Commercial Glass Repair in Seattle, WA):**

**Q1:** "How much does commercial glass repair cost in Seattle?"
**A1:** "Commercial glass repair in Seattle typically costs between $200-$800, depending on the size and type of damage. [Company Name] provides free quotes and same-day service for most repairs, offering competitive pricing with high-quality materials to ensure glass is restored to perfect condition, minimizing business disruption."

**Q2:** "How long does commercial glass repair take in Seattle?"
**A2:** "Most commercial glass repairs in Seattle are completed within 2-4 hours. For emergency situations, [Company Name] can often complete repairs the same day. The experienced technicians work efficiently while maintaining the highest quality standards, getting businesses back to normal quickly and safely."

**Q3:** "Do you offer emergency glass repair services in Seattle?"
**A3:** "Yes, [Company Name] provides 24/7 emergency commercial glass repair services throughout Seattle and surrounding areas. The rapid response team can be on-site within 1-2 hours for urgent situations. Broken glass poses security and safety risks, so [Company Name] prioritizes emergency calls to protect businesses and property."

**Bad Example (Too promotional):**
❌ Q: "Why choose [Company Name] for glass repair?"
❌ A: "Because we have 20 years of experience and the best team!" (Not SERP-optimized)

**Good Example (SERP-optimized):**
✅ Q: "What types of commercial glass can be repaired in Seattle?"
✅ A: "Most commercial glass types can be repaired in Seattle, including storefront windows, office partitions, entrance doors, and display glass. Small cracks, chips, and minor damage are typically repairable, while severely shattered glass requires replacement. [Company Name] assesses each situation and recommends the most cost-effective solution for specific business needs."

**Note:** All examples use "[Company Name]" instead of "we/our" for better SEO visibility and brand recognition.

---

### Map Section

**Heading (H2):**

- Include service + location

**Description:**

- 50-60 words (strictly enforced)
- Include primary keyword
- Describes service coverage in location

---

## Link Requirements

### External Linking

**Purpose:** Enhance local SEO by linking to relevant authoritative sources

**Rules:**

- **Only 1 external link per page** (mandatory)
- Link to official city website or Wikipedia page
- Natural integration in content
- Use `<a>` tag with `target="_blank"` and `style="text-decoration: underline; display: inline;"`

**Anchor Text:**

- Use full location name (e.g., "Camarillo, CA" not just "Camarillo")

**Example:**

```html
<b>Environmental Benefits:</b> Cleaner Streets uses eco-friendly equipment and
techniques to minimize pollution. Regular sweeping prevents trash and
contaminants from entering
<a
  href="https://www.cityofcamarillo.org/"
  target="_blank"
  style="text-decoration: underline; display: inline;"
  >Camarillo, CA</a
>'s storm drains, protecting the local ecosystem.
```

**Placement:**

- Rotates among: Benefits-1, Benefits-2, Benefits-3, Why-1, Why-2, Why-3
- Can be specified in CSV "External Link Section" column for each page
- **If CSV column is empty:** Uses default rotation based on row number
  - Row 0: benefits-1
  - Row 1: benefits-2
  - Row 2: benefits-3
  - Row 3: why-1
  - Row 4: why-2
  - Row 5: why-3
  - Pattern repeats every 6 pages (row number % 6)

---

### Internal Linking

**Purpose:** Enhance SEO and user navigation with intelligent contextual linking

**Rules:**

- **Only 1 internal link per page** (mandatory)
- **Intelligent Link Distribution:**
  - **40% links → Homepage** (company website root)
  - **60% links → Contextual pages** (relevant service pages from sitemap)
- Embedded on company name
- Use `<a>` tag with `style="text-decoration: underline; display: inline;"`

**Link Selection Algorithm:**

1. **Sitemap Fetch:** System automatically fetches website sitemap.xml at batch start
2. **Contextual Matching:** For each page, finds most relevant service page based on:
   - Service keyword matching in URL
   - Relevance scoring (keyword matches = higher score)
3. **Rotation Pattern (5-page batch):**
   - Page 1 (row 0): Homepage
   - Page 2 (row 1): Contextual page (highest relevance score)
   - Page 3 (row 2): Contextual page
   - Page 4 (row 3): Contextual page
   - Page 5 (row 4): Homepage
4. **Fallback:** If no relevant contextual page found, defaults to homepage

**Anchor Text:**

- Company name occurring naturally in text
- Do NOT create artificial link phrases like "click here" or "learn more"

**Example (Homepage Link):**

```html
Trust
<a
  href="https://www.cleanerstreets.com/"
  style="text-decoration: underline; display: inline;"
  >Cleaner Streets</a
>
to deliver reliable street sweeping services in Ojai, CA.
```

**Example (Contextual Page Link):**

```html
<a
  href="https://www.cleanerstreets.com/services/parking-lot-sweeping/"
  style="text-decoration: underline; display: inline;"
  >Cleaner Streets</a
>
provides professional street sweeping services tailored to your needs.
```

**Placement (Rotation):**

- For 3-page batch: [hero, faq-a1, map]
- For 5-page batch: [hero, faq-a1, faq-a2, faq-a3, map]
- For 10-page batch: repeat 5-page pattern twice
- If map omitted: use faq-a3 instead
- Automatically determined by batch position (row number % 5)

---

## Primary Keyword Generation

**Format:** [Deterministic Adjective] + [Service] + "in" + [Location, State]

**Examples:**

- Row 1: "Professional Roof Repair in Gilbert, AZ"
- Row 2: "Expert Painting Services in Newberry, FL"
- Row 3: "Trusted Commercial Glass Installer in Sumner, WA"

**How Adjectives are Determined:**

- **Deterministic Selection:** Each CSV row is assigned a specific adjective based on its row number
- **Consistency Guaranteed:** Preview shows exact adjective that will be used in generation
- **No AI Randomness:** Adjectives are pre-selected from a curated list, not AI-generated
- **Row-Based Formula:** `adjective = ADJECTIVES[(row_number - 1) % 50]`

**Complete Adjective List (50 total):**

```
Row 1-10:   Professional, Expert, Trusted, Reliable, Certified,
            Licensed, Experienced, Quality, Top-Rated, Premier

Row 11-20:  Leading, Specialized, Skilled, Qualified, Affordable,
            Local, Reputable, Proven, Dependable, Elite

Row 21-30:  Superior, Outstanding, Exceptional, First-Class, High-Quality,
            Accredited, Vetted, Recommended, Award-Winning, Industry-Leading

Row 31-40:  Full-Service, Comprehensive, Custom, Tailored, Personalized,
            Fast, Quick, Same-Day, Emergency, 24/7

Row 41-50:  Responsive, Timely, Prompt, Efficient, Effective,
            Guaranteed, Insured, Bonded, Background-Checked, Verified
```

**Usage in Content:**

- **CRITICAL:** AI is provided with the complete primary keyword and must use it EXACTLY as given
- **NO modifications allowed:** AI cannot change the adjective, reorder words, or create variations
- **Example:** If given "Professional Plumber in Carlsbad, CA", AI must use that exact phrase
- ❌ WRONG: "Expert Plumber in Carlsbad, CA" (changed adjective)
- ❌ WRONG: "Plumber Professional in Carlsbad, CA" (changed order)
- ✅ CORRECT: "Professional Plumber in Carlsbad, CA" (exact match)

**Benefits:**

- **100% Consistency:** Preview → Generation → Regeneration all use same adjective
- **Predictable:** Same row = same adjective every time
- **No Surprises:** Users see exactly what they'll get before generation
- **Faster:** No API calls needed for adjective generation

**Technical Details:**

See: `docs/ADJECTIVE_SYSTEM.md` for complete implementation details

---

## Validation Rules

### Auto-Fixed (No Retry):
These are automatically corrected without AI regeneration:

1. **Meta description** - Ensures primary keyword, company name, "Call now!", 120-155 chars total (including CTA)
2. **Meta title** - Format: `{primary keyword} | {company name}`, under 80 chars
3. **H1** - Forces to be exactly the primary keyword (no company name)
4. **Benefits heading** - Warns if missing company name or primary keyword (does not enforce format)
5. **Why heading** - Warns if missing service or location (does not enforce format)

### Selective Retry (AI Regeneration, max 2 attempts):
These trigger AI regeneration if they don't meet criteria:

1. **FAQs** - Retries if:
   - Missing primary keyword in questions
   - Missing company name in answers
   - Too promotional ("why choose us")
   - Answer length not 50-75 words

2. **Map description** - Retries if not 50-60 words

### Non-Blocking Warnings:
These log warnings but don't stop publishing:

1. Hero description word count (should be 50-60)
2. Bullet points word count (should be ≥30)
3. Heading keyword presence (benefits/why)

### Always Enforced:
1. Primary keyword used throughout content
2. Exactly 1 internal link per page
3. Exactly 1 external link per page
4. All bullets start with `<b>` tag
5. Company name in 2nd half of FAQ answers

---

## Sample Reference Content

See: `docs/sample-content/commercial-glass-sumner-wa.md`

This shows expected quality, structure, and tone for all generated pages.
