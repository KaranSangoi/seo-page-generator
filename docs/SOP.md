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

**Character Length:** ≤155 characters (strictly enforced)

**Components:**

1. Company Name + Primary Keyword
2. Unique Selling Proposition (USP)
3. Call to Action: "Call now!"

**Examples:**

- Nested County: "Gikas Roofing offers premier roofing services in Rockland County, NY. Experienced professionals, quality materials, and excellence. Call now!"
- Broad Town: "Gikas Roofing is your go-to for superior roofing services in Pearl River, NY. Expertise in repair, installation, and maintenance. Call now!"
- Service Town: "Gikas Roofing offers premier roof installation services in Pearl River, NY. Our expert team ensures top-quality roof installations. Call now!"

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

- Include location + service + company name + primary keyword
- Example: "Why Choose [Company] as Your [Primary Keyword]?"

**Subheading:**

- Generic 4-5 word statement about company/services
- Example: "Quality. Precision. Reliable."

**3 Bullet Points:**

- Each bullet: **minimum 35+ words** (strictly enforced)
- Each starts with `<b>Topic Name:</b>` tag
- Focus on company's unique selling propositions
- Optimized with primary keyword
- **Must be unique** across pages for same company

---

### Why Section

**Heading (H2):**

- Include location + service + primary keyword
- Example: "Why Hire a [Primary Keyword]?"
- For Primary Service pages (no location): "Why Choose [Service]?"

**Subheading:**

- Generic 4-5 word statement
- Example: "Protection. Appeal. Durability."

**3 Bullet Points:**

- Each bullet: **minimum 35+ words** (strictly enforced)
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

**Requirements:**

- Provide 3 SEO-optimized questions and answers
- Specific to [service] in [location]
- **Must be unique** across pages for same company
- **Must be SEO-relevant** (not company promotional)
- **Must use primary keyword** in question or answer
- **Company name mentioned in 2nd half of answer only**

**Example:**
Q: "What services does a professional commercial glass installer in Sumner, WA provide?"
A: "A professional commercial glass installer in Sumner, WA offers storefront installation, office glass partitions, entrance door systems, display windows, and glass replacement. [Company Name] delivers full-service commercial glazing with attention to safety codes and aesthetic requirements."

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

**Format:** [Unique Adjective] + [Service] + "in" + [Location, State]

**Examples:**

- "Expert Roof Repair in Gilbert, AZ"
- "Professional Painting Services in Newberry, FL"
- "Trusted Commercial Glass Installer in Sumner, WA"

**Requirements:**

- Adjective must be unique per page in batch
- Adjectives generated by AI at start of batch
- Used throughout: meta title, meta description, H1, content

**Adjective Pool:**
Expert, Professional, Trusted, Reliable, Top-Rated, Affordable, Quality, Premier, Leading, Certified, Licensed, Experienced, Skilled, Proven, Dependable

---

## Validation Rules

**Strictly Enforced:**

1. Meta description ≤155 characters
2. Bullet points ≥30 words each
3. Hero description 50-60 words
4. Map description 50-60 words
5. FAQs must be SEO-relevant (not promotional)
6. Company name in 2nd half of FAQ answers only
7. Primary keyword used throughout content
8. Exactly 1 internal link per page
9. Exactly 1 external link per page
10. All bullets start with `<b>` tag

**If validation fails:** Regenerate content (max 3 attempts)

---

## Sample Reference Content

See: `docs/sample-content/commercial-glass-sumner-wa.md`

This shows expected quality, structure, and tone for all generated pages.
