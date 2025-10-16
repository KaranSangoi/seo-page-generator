# Complete Requirements Document

## Overview

Internal SEO tool for team to generate and publish location/service pages to client WordPress sites using AI (Claude Code).

---

## User Authentication

### Requirements

- Users can sign up with email + password
- Users can log in
- Users can log out
- Each user sees only their own data
- Protected routes (cannot access without login)

### Implementation

- Use Clerk for authentication
- Middleware protects all routes except /login and /signup
- User ID stored in database for data isolation

---

## Client Management

### Dashboard (Client List)

**Features:**

- Display all clients belonging to logged-in user
- Grid or table layout
- Each client shows:
  - Client name
  - Website URL
  - Last generation date
  - Total pages created
- Search/filter functionality
- "Add New Client" button
- Edit and Delete buttons per client
- Click client → Navigate to Client Detail page

**UI Elements:**

- Client cards with key info
- Status indicators (last activity)
- Quick actions (Edit, Delete, Generate)

### Add/Edit Client (Metadata)

**Required Fields (marked with \*):**

1. Client Name\*
2. Client Website\* (with validation: must be valid URL)
3. WordPress Admin URL\* (e.g., https://site.com/wp-admin)
4. WP Username\*
5. WP App Password\* (encrypted in database)
6. SEO Plugin\* (Radio: Yoast or RankMath)
7. Template Page ID\* (number input)

**Info Icons (ⓘ):**

- Next to each field
- Click/hover shows instructions
- Examples:
  - WP App Password: How to generate in WordPress
  - Template Page ID: How to find page ID in WordPress

**Actions:**

- Test Connection button (validates WP credentials)
- Save button (creates/updates client)
- Cancel button

**Validation:**

- All required fields must be filled
- URLs must be valid format
- Template ID must be numeric
- Test connection before saving (optional but recommended)

---

## Client Detail Page

### Tab Structure

**Three tabs:**

1. Metadata (view/edit client info)
2. Generate Pages (upload CSV and generate)
3. History (view past generations)

---

### Tab 1: Metadata

**Features:**

- Display all client metadata
- Edit mode toggle
- Info icons for each field
- Test connection button
- Save changes button
- Success/error messages

**Behavior:**

- Read-only by default
- Click Edit → Fields become editable
- Test connection validates WP credentials
- Save updates database and shows confirmation

---

### Tab 2: Generate Pages

**Upload Section:**

- File upload input (accepts .csv only)
- Browse button
- Drag & drop support
- File name display after selection

**Preview Section:**

- Parse CSV on upload
- Display first 5-10 rows in table
- Show all columns
- Validate structure:
  - Required columns present
  - No empty required fields
  - Valid page types
- Show validation errors if any

**Generation Controls:**

- Total pages count
- Estimated time (based on ~1min per page)
- "Start Generation" button (disabled if validation fails)
- Cancel button

**Progress Tracking:**

- Real-time progress bar (0-100%)
- List of pages with status:
  - ⏳ Pending
  - ⚙️ Generating content
  - ✓ Validating
  - 📤 Publishing
  - ✅ Success (with URL)
  - ❌ Failed (with error)
- Time elapsed
- Estimated time remaining
- Per-page time tracking

---

### Tab 3: History

**Features:**

- List all generation batches (newest first)
- Each batch shows:
  - Date & time
  - CSV filename
  - Total pages count
  - Success/warning/failure counts
  - Total time taken
  - Average time per page
- "View Details" button
- "Download Report" button (CSV)

**Batch Details (Modal/Page):**

- Full summary stats
- List of all pages:
  - Page name
  - Status (✅ ⚠️ ❌)
  - Published URL (if success)
  - Error message (if failed)
  - Time taken
- Downloadable CSV report
- "Retry Failed Pages" button (future feature)

---

## Content Generation Process

### Step 1: CSV Parsing

**Input CSV Structure:**

```csv
Client Name, Page Type, Page Name, External Link Section, Omit Sections
```

**Validation:**

- Client Name exists in database
- Page Type is valid (Primary Service, Nested Broad Stroke, Broad Stroke, Location Service)
- Page Name is not empty
- External Link Section (if provided) is valid
- Omit Sections (if provided) are valid section names

### Step 2: Adjective Generation

**Process:**

- Count total pages in batch
- Use Claude Code to generate unique adjectives
- One adjective per page
- Store for use in primary keyword

**Example Prompt:**

```
Generate [N] unique, professional adjectives for SEO keywords.
Adjectives should be: Expert, Professional, Trusted, Reliable, etc.
Return as JSON array: ["Expert", "Professional", ...]
```

### Step 3: Content Generation (Per Page)

**Process:**

- Extract service and location from page name
- Build primary keyword: [Adjective] + [Service] + "in" + [Location]
- Determine link placement based on batch position
- Use Claude Code with SOP to generate all content

**Claude Code Prompt Includes:**

- Page type
- Company name and website
- Service and location
- Primary keyword
- Sections to omit
- Link placement instructions
- Full SOP requirements

**Generated Content:**

- Meta title
- Meta description
- H1
- Hero description
- Benefits (heading, subheading, 3 bullets)
- Why (heading, subheading, 3 bullets)
- FAQs (3 Q&As)
- Map description (if not omitted)

### Step 4: Validation

**Checks:**

- Meta description ≤155 chars
- Bullet points ≥30 words
- Hero description 50-60 words
- Map description 50-60 words (if included)
- FAQs use primary keyword
- FAQs are SEO-relevant (not promotional)
- Company name in 2nd half of FAQ answers

**If Validation Fails:**

- Attempt regeneration (max 3 attempts)
- If still fails: Mark as failed with error
- Continue with next page

### Step 5: Link Insertion

**Internal Link:**

- Determine section based on rotation
- Find company name in that section
- Wrap in `<a>` tag with styling

**External Link:**

- Determine bullet based on rotation
- Find location name in that bullet
- Search for city official website
- Wrap in `<a>` tag with styling

### Step 6: WordPress Publishing

**Process:**

1. Fetch Elementor template via REST API
2. Parse template JSON
3. Update content in template:
   - Map generated content to element IDs
   - Replace text in widgets
   - Maintain structure
4. Set meta fields (Yoast or RankMath)
5. Create page via REST API
6. Set status to "publish"
7. Capture published URL

**Error Handling:**

- Invalid credentials: Stop and report
- Template not found: Report error
- Publishing failed: Report error and continue

### Step 7: Database Logging

**Save to Database:**

- Batch record with totals
- Individual page records with:
  - Page name, type
  - Status, URL
  - Time taken
  - Error message (if any)

---

## Link Rotation Logic

### Internal Links (Company Homepage)

**3-Page Batch:** [hero, faq-a1, map]
**5-Page Batch:** [hero, faq-a1, faq-a2, faq-a3, map]
**10-Page Batch:** Repeat 5-page pattern twice

**Fallback Rules:**

- If map omitted at position 3: use faq-a3
- If map omitted at position 5: use hero
- If both omitted: use first available section

### External Links (City Website)

**Rotation:** [benefits-1, benefits-2, benefits-3, why-1, why-2, why-3]

**Repeats for batches >6 pages**

**Fallback Rules:**

- If benefits section omitted: skip to why section
- If why section omitted: skip to benefits
- If both omitted: skip external link for this page

---

## Info Icon Instructions

### WP App Password

```
How to get WordPress App Password:

1. Log into WordPress admin
2. Go to Users → Your Profile
3. Scroll down to "Application Passwords"
4. Enter a name: "SEO Generator"
5. Click "Add New Application Password"
6. Copy the generated password
7. Paste it here

Note: This is different from your regular
WordPress password. It's more secure.
```

### Template Page ID

```
How to find Template Page ID:

1. Log into WordPress admin
2. Go to Pages → All Pages
3. Find your template page
4. Hover over the page title
5. Look at the bottom of your browser
6. You'll see: post.php?post=527&action=edit
7. The number (527) is your Template Page ID

Example URL:
.../wp-admin/post.php?post=527&action=edit
                           ↑↑↑
                      This is the ID
```

### SEO Plugin

```
Which SEO plugin do you use?

- Yoast SEO: Most popular WordPress SEO plugin
- Rank Math: Alternative SEO plugin

Check your WordPress:
1. Go to Plugins → Installed Plugins
2. Look for "Yoast SEO" or "Rank Math"
3. Select the one you have installed

If you have neither, you'll need to install one.
```

---

## CSV Structures

### Client Metadata CSV

```csv
Client Name, Client Website, WordPress URL, WP Username, WP App Password, SEO Plugin, Template Page ID
Kowalski Painting, https://kowalskipainting.com, https://kowalskipainting.com/wp-admin, admin, xxxx xxxx xxxx xxxx, Yoast, 527
```

### Pages CSV

```csv
Client Name, Page Type, Page Name, External Link Section, Omit Sections
Kowalski Painting, Location Service, Roof Repair in Gilbert AZ, benefits-2,
Kowalski Painting, Broad Stroke, Services in Maricopa County AZ, why-1, FAQ
Carter's Painting, Location Service, Painting in Newberry FL, benefits-1, Map
```

**Column Descriptions:**

- **Client Name:** Must match existing client in database
- **Page Type:** Primary Service | Nested Broad Stroke | Broad Stroke | Location Service
- **Page Name:** Format: "[Service] in [Location, State]"
- **External Link Section:** benefits-1 | benefits-2 | benefits-3 | why-1 | why-2 | why-3 (optional, uses rotation if empty)
- **Omit Sections:** Comma-separated: FAQ,Map,Why,Benefits (optional)

---

## Non-Functional Requirements

### Performance

- Page generation: ~1 minute per page
- Batch processing: Parallel where possible
- UI responsiveness during generation
- Database queries optimized

### Security

- All passwords encrypted (WP app passwords)
- Environment variables for secrets
- User data isolation
- HTTPS only in production
- Clerk handles auth security

### Reliability

- Error handling at each step
- Graceful failures (continue batch on single failure)
- Retry logic for transient errors
- Detailed error messages for debugging

### Usability

- Clean, intuitive UI
- Clear progress indicators
- Helpful error messages
- Info icons for guidance
- Responsive design (desktop-first)

---

## V2 Features (Ready for Activation)

**Status:** Fully implemented, tested, and ready. All code commented out by default.

### Dual-Mode Generation System

**Mode 1: Generate Directly** (Current Default)
- Same as v1 behavior
- Fast automatic publishing
- No content review step

**Mode 2: Preview & Publish** (New in v2)
- Generate content first
- Review in full-featured modal
- Regenerate any section
- Publish when ready (individual or bulk)

### Content Review Modal

**Features:**
- Page list sidebar with status indicators
- Collapsible content sections:
  - Meta (title + description)
  - Hero (H1 + description)
  - Benefits (heading + bullets)
  - Why (heading + bullets)
  - FAQs (all questions/answers)
  - Map description
- Section-level regeneration buttons
- Navigation between pages
- Individual and bulk publish controls

**User Flow:**
1. Upload CSV
2. Select "Preview & Publish" mode
3. Click "Generate Preview"
4. Review generated content in modal
5. Regenerate any section if needed
6. Publish individual pages or all at once

### New Backend APIs

**`/api/generate-preview`**
- Generates content for all pages without publishing
- Parallel generation for speed
- Returns validated content ready for review
- File: `src/app/api/generate-preview/route.ts`

**`/api/publish-reviewed`**
- Publishes previously reviewed content to WordPress
- Handles Elementor template replacement
- Sets SEO meta fields
- File: `src/app/api/publish-reviewed/route.ts`

**`/api/regenerate-section`**
- Regenerates specific content sections
- Supports: hero, benefits, why, FAQs, map
- Maintains other content unchanged
- File: `src/app/api/regenerate-section/route.ts`

### New Frontend Components

**ContentPreviewModal**
- Full-featured review modal
- ~600 lines of production-ready code
- Dark mode support
- Responsive design
- File: `src/app/clients/[id]/ContentPreviewModal.tsx`

### Integration

**GeneratePagesTab.tsx** - Modified with 6 integration points:
- Import statement (commented)
- State variables (commented)
- Handler functions (commented)
- Mode selector UI (commented)
- Conditional buttons (commented)
- Modal component usage (commented)

All v2 code marked with `// ==================== V2 FEATURE ====================`

### How to Activate V2

See `docs/V2_ACTIVATION_GUIDE.md` for complete instructions.

**Quick Summary:**
1. Uncomment 6 code sections in GeneratePagesTab.tsx
2. Test with 2-3 pages
3. Deploy when ready

**Time to activate:** ~5 minutes
**Risk:** Very low (all code isolated and marked)

---

## Future Enhancements (Post-V2)

- Bulk client import
- Scheduled generations
- Email notifications on completion
- Advanced analytics
- Template marketplace
- Multi-language support
- API for integrations
- Team collaboration features
- Content version history
- A/B testing for content variations

---

## Success Criteria

### V1.2 (Current) ✅
✅ Users can manage multiple clients
✅ CSV upload and validation works
✅ Content generation follows SOP exactly
✅ All validation rules enforced
✅ Link rotation works correctly
✅ WordPress publishing succeeds
✅ History tracking accurate
✅ Time tracking works
✅ Error handling robust
✅ Deployed to Vercel successfully
✅ Deterministic adjectives (100% consistency)
✅ Smart validation with auto-fix
✅ Page builder auto-detection

### V2.0 (Ready for Activation) ✅
✅ Dual-mode generation system implemented
✅ Content review modal functional
✅ Section-level regeneration working
✅ All APIs independently tested
✅ Integration points clearly marked
✅ Documentation complete
✅ No breaking changes to v1
✅ Easy activation process (~5 minutes)
