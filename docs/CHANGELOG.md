# Changelog

All notable changes to the SEO Page Generator project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.5.0] - 2025-01-04

### 🎉 NEW: WordPress Classic Editor Support

**Major Feature Addition:**
The SEO Page Generator now supports **WordPress Classic Editor (TinyMCE)**, WordPress's original WYSIWYG editor. This expands compatibility to sites not using modern page builders.

**Supported Page Builders:**
- ✅ Elementor
- ✅ Divi Builder
- ✅ WPBakery Page Builder
- ✅ **Classic Editor (TinyMCE) (NEW)**

### Added

#### Classic Editor (TinyMCE) Integration
- **HTML comment marker system** for identifying replaceable content sections
- **Marker format:** `<!-- SEO_GEN_START:SECTION_NAME -->` ... `<!-- SEO_GEN_END:SECTION_NAME -->`
- **Builder auto-detection** recognizes Classic Editor templates via SEO_GEN markers in page content
- **Sample page generation** for Classic Editor templates (preview before batch generation)
- **Batch publishing support** for Classic Editor sites
- **Supported sections:**
  - HERO: H1 title + hero description
  - BENEFITS: Heading, subheading, bullet points
  - WHY: Heading, subheading, bullet points
  - FAQ: Multiple question/answer pairs
  - MAP: Heading, description, map placeholder
- **Documentation:** See `CLASSIC-EDITOR-SUPPORT.md` for complete setup guide and template examples

**Files Added:**
- `src/lib/classic-editor-replacer.ts` - HTML comment marker parser and content replacement logic
- `src/lib/builders/strategies/classic-editor-strategy.ts` - Strategy pattern implementation
- `CLASSIC-EDITOR-SUPPORT.md` - Comprehensive setup and technical documentation

**Files Enhanced:**
- `src/lib/page-generation.ts` - Publishing support for Classic Editor
- `src/app/api/sample-page/route.ts` - Sample generation for Classic Editor
- `src/lib/builders/detector.ts` - Enhanced builder detection with Classic Editor support
- `src/lib/builders/builder-factory.ts` - Added Classic Editor strategy

### Improved

#### WPBakery Type Safety
- **Fixed TypeScript error** in WPBakery replacement log early return
- **Problem:** Missing `warnings` and `errors` properties in empty log object
- **Solution:** Added all required properties to match `WPBakeryReplacementLog` interface
- **File:** `src/lib/wpbakery-replacer.ts`

### Technical Details

**Classic Editor Implementation:**
- Uses WordPress REST API `context=edit` to fetch raw HTML content
- Parses HTML to find comment markers using regex pattern matching
- Replaces content between START and END markers with generated content
- No special meta fields needed (unlike Elementor/Divi/WPBakery)
- Direct content insertion into `post_content` field
- Schema.org script injection for structured data
- Internal/external link placement support

**Template Setup:**
1. Create page in WordPress Classic Editor (Text/HTML mode)
2. Add HTML comment markers around each section
3. Configure client with template page ID
4. Set page builder to "classic-editor"
5. Generate sample page to verify
6. Batch generate pages

**CSS Classes Generated:**
- `hero-section`, `benefits-section`, `benefits-list`
- `why-section`, `why-list`
- `faq-section`, `faq-list`, `faq-item`, `faq-question`, `faq-answer`
- `map-section`, `map-placeholder`

---

## [1.4.0] - 2025-01-04

### 🎉 NEW: WPBakery Page Builder Support

**Major Feature Addition:**
The SEO Page Generator now supports **WPBakery Page Builder** (also known as Visual Composer), expanding compatibility beyond Elementor and Divi.

**Supported Page Builders:**
- ✅ Elementor
- ✅ Divi Builder
- ✅ **WPBakery Page Builder (NEW)**

### Added

#### WPBakery Page Builder Integration
- **Full content replacement** for WPBakery shortcode-based templates
- **Builder auto-detection** recognizes WPBakery templates via `_wpb_vc_js_status` meta field or `[vc_` shortcodes
- **Sample page generation** for WPBakery templates (preview before batch generation)
- **Batch publishing support** for WPBakery sites
- **Shortcode parsing engine** that handles nested WPBakery/Woodmart shortcodes:
  - Text blocks (`[vc_column_text]`)
  - Headings (`[vc_custom_heading]`)
  - Custom headings (`[woodmart_title]`)
  - FAQ accordions (`[vc_tta_accordion]`, `[vc_tta_section]`)
  - Google Maps (`[vc_gmaps]`)
  - Buttons with links (`[vc_btn]`)
- **Documentation:** See `WPBAKERY-SUPPORT.md` for setup guide and technical details

**Files Added:**
- `src/lib/wpbakery-replacer.ts` - Core shortcode replacement logic
- `src/lib/builders/strategies/wpbakery-strategy.ts` - Strategy pattern implementation
- `WPBAKERY-SUPPORT.md` - Setup and technical documentation

**Files Enhanced:**
- `src/lib/page-generation.ts` - Publishing support for WPBakery
- `src/app/api/sample-page/route.ts` - Sample generation for WPBakery
- `src/lib/builders/builder-factory.ts` - Added WPBakery strategy
- `src/lib/builders/detector.ts` - Enhanced builder detection

### Improved

#### FAQ Generation Quality & Diversity
- **Problem:** FAQ questions were repetitive across pages (always cost, timeline, materials)
- **Solution:** Simplified prompts to give AI creative freedom while maintaining SEO compliance
- **Changes:**
  - Removed prescriptive examples that caused pattern copying
  - Streamlined to core requirements: keyword usage, grammar, natural answer structure
  - Maintained SOP: service without adjective, no company name, general-then-company answer flow
  - Enhanced batch-level uniqueness validation
- **Result:** Each page generates unique, diverse FAQs covering different service aspects
- **Files:** `src/lib/claude-api.ts`, `src/app/api/regenerate-section/route.ts`

#### Error Reporting in Publish Flow
- **Improved error messages** when publishing fails
- **Before:** Generic "Failed to publish page"
- **After:** Detailed server errors like "Failed to fetch template page" or "WordPress API error: [details]"
- **Files:** `src/app/clients/[id]/GeneratePagesTab.tsx`

### Technical Details

**WPBakery Implementation:**
- Uses WordPress REST API context=edit to fetch raw shortcode content
- Parses nested shortcode structure with regex-based parser
- Preserves theme-specific shortcodes (e.g., Woodmart)
- Handles link placement via button shortcodes
- Sets `_wpb_vc_js_status=true` meta field for editor compatibility

**FAQ Grammar Rules:**
- ✅ Correct: "What type of paint should be used for interior painting in Miami, FL?"
- ❌ Wrong: "What type of paint does interior painting use?" (treats service as subject)

---

## [1.3.3] - 2025-10-23

### 🔧 Fixed: ElementsKit Accordion Support & SEO Meta Description Issues

**Problems Solved:**
1. ElementsKit accordion FAQ widgets not updating (questions and answers stuck on template values)
2. Meta descriptions missing from generated pages despite Yoast fields being set
3. SEO plugin detection failing when capitalization differed ("Yoast" vs "yoast")
4. Focus keyword field missing from Yoast/Rank Math configurations

### Fixed

#### ElementsKit Accordion Widget Support
- **Problem:** FAQ widgets using ElementsKit accordion (third-party plugin) were not being detected/updated
- **Root Cause:** Code only supported standard Elementor accordion (`tabs`), nested accordion (`elements`), and items structure, but not ElementsKit's `ekit_accordion_items` structure
- **Solution:** Added detection and update logic for ElementsKit accordion widgets
  - Detects `ekit_accordion_items` array structure
  - Updates `acc_title` (question) and `acc_content` (answer) fields
  - Files: `src/app/api/sample-page/route.ts:281-296`, `src/lib/elementor-replacer.ts:251-270`
- **Impact:** FAQ questions and answers now update correctly for all ElementsKit accordion widgets

#### Case-Insensitive SEO Plugin Detection
- **Problem:** SEO plugin detection failed when database stored "Yoast" (capital Y) but code checked for "yoast" (lowercase)
- **Solution:** Added `.toLowerCase()` normalization to all SEO plugin checks
  - Now works with "Yoast", "yoast", "YOAST", "Rank Math", "rank-math", "rankmath", etc.
  - Files: `src/app/api/sample-page/route.ts:615`, `src/lib/page-generation.ts:555`, `src/lib/simple-queue.ts:827`
- **Impact:** SEO plugin fields now set correctly regardless of capitalization in database

#### Added Focus Keyword Field
- **Problem:** Only setting title and description, but Yoast/Rank Math require focus keyword to fully activate SEO features
- **Solution:** Added `_yoast_wpseo_focuskw` and `rank_math_focus_keyword` to all SEO configurations
  - Files: `src/app/api/sample-page/route.ts:622,674`, `src/lib/page-generation.ts:559,597`, `src/lib/simple-queue.ts:832,874`
- **Impact:** Complete SEO plugin configuration with all three required fields (title, description, focus keyword)

#### Meta Description Fallback System
- **Problem:** Even with Yoast fields set correctly, `<meta name="description">` tag sometimes missing from HTML
- **Root Cause:** Yoast configuration issues or theme conflicts preventing meta tag output
- **Solution:** JavaScript injection fallback system
  - Injects invisible HTML widget at beginning of each page
  - Script checks if `<meta name="description">` exists in `<head>`
  - If missing, creates and injects tag with correct content
  - Only runs when SEO plugin fails (zero overhead when working correctly)
  - Files: `src/app/api/sample-page/route.ts:553-582`, `src/lib/page-generation.ts:19-51,505`, `src/lib/simple-queue.ts:746-775`
- **Impact:** **Guaranteed meta description presence** regardless of SEO plugin configuration

### Changed

#### Documentation Updates
- **FAQ_TOGGLE_SETUP.md:** Added Structure 4 for ElementsKit Accordion widgets with example structure and implementation details
- **TEMPLATE_SEO_SETUP.md:**
  - Added case-insensitive detection notes for both Yoast and Rank Math
  - Added "Meta Description Fallback System" section explaining how the JavaScript fallback works
  - Added benefits and technical details of the fallback system
- **Updated compatibility notes** across docs to include ElementsKit accordion support

### Summary

**All Generation Modes Updated:**
- ✅ Sample Page generation (`src/app/api/sample-page/route.ts`)
- ✅ Preview & Publish mode (`src/lib/page-generation.ts`, `src/lib/elementor-replacer.ts`)
- ✅ Direct Generation mode (`src/lib/simple-queue.ts`)

**Key Benefits:**
- FAQ updates work for all widget types including third-party ElementsKit accordions
- SEO plugin detection robust against capitalization variations
- Complete Yoast/Rank Math configuration with all required fields
- Guaranteed meta description in HTML via multi-layered fallback system
- Zero visual impact, all changes work seamlessly in background

---

## [1.3.2] - 2025-10-18

### 🔧 Fixed: FAQ Logic Consolidation & Preview Modal UX

**Problems Solved:**
1. Sample page FAQ updates worked perfectly but real page generation didn't - code duplication caused inconsistency
2. Preview & Publish mode showed blocking "wait" overlay - users couldn't see progress until all pages completed

### Fixed

#### FAQ Logic Consolidation
- **Root Cause:** Three separate implementations of `replaceElementorContent` with slightly different FAQ handling logic
  - `src/app/api/sample-page/route.ts` - Had its own local copy (working perfectly)
  - `src/lib/simple-queue.ts` - Had its own local copy (had bugs)
  - `src/lib/elementor-replacer.ts` - Shared version (had bugs)

- **Solution:** Consolidated all FAQ logic to match sample page's proven implementation
  - All three files now use identical FAQ handling code
  - Supports: classic accordion/toggle (settings.tabs), items structure (settings.items), nested accordion (child elements), individual FAQ widgets
  - Fixed nested-accordion FAQ index incrementing bug (was causing all questions to show same text)
  - Files: `src/lib/elementor-replacer.ts:234-363`, `src/lib/simple-queue.ts:409-531`

- **Impact:** Sample page generation and real page generation now produce identical results
  - FAQ questions update correctly in all widget types
  - No more code duplication or drift between implementations
  - Future bug fixes only need to be applied once

### Added

#### Improved Preview & Publish Modal UX
- **Immediate Modal Display** - No more blocking "wait" overlay
  - Modal opens immediately when clicking "Generate Preview"
  - Shows all pages with initial status indicators
  - File: `src/app/clients/[id]/GeneratePagesTab.tsx:491-554`

- **Progressive Status Indicators** in modal
  - ⏱️ **Waiting...** (`pending`) - Page queued for generation
  - ⚙️ **Generating...** (`generating`) - AI creating content
  - ⏳ **Ready** - Content ready for review
  - ✅ **Published** - Already published to WordPress
  - ❌ **Failed** - Generation failed
  - File: `src/app/clients/[id]/ContentPreviewModal.tsx:37,233-240`

- **In-Modal Loading State** for pending pages
  - Shows animated spinner with status message
  - User-friendly messages: "Waiting to Generate..." or "Generating Content..."
  - Helpful context text explaining what's happening
  - File: `src/app/clients/[id]/ContentPreviewModal.tsx:340-355`

### Changed

#### Preview Modal Behavior
- **Before:** Blocking overlay → Wait for all pages → Show modal with all pages ready
- **After:** Show modal immediately → Display placeholder pages with status → Update as pages complete

#### Status Management
- Added `'generating'` status to `PageContent` type
- Modal now conditionally renders content based on page status
- Pending/generating pages show loading state instead of content sections

### Benefits
- ✅ **Better UX:** Users see progress immediately instead of staring at a loading overlay
- ✅ **Start Reviewing Faster:** Can browse page list while generation is in progress
- ✅ **Consistent FAQ Updates:** Sample page and real pages now use identical logic
- ✅ **Reduced Code Duplication:** One source of truth for FAQ handling
- ✅ **Easier Maintenance:** Bug fixes only need to be applied once

### Technical Details
- Preview generation still happens in parallel (fast completion)
- Modal updates all pages to "ready" status when generation completes
- Can be extended for true progressive updates (update each page as it completes) in future
- FAQ consolidation maintains backward compatibility with all widget types

---

## [2.0.0] - Ready for Activation (Code Complete)

### 🚀 Major: Preview & Publish Mode

**Status:** Fully implemented, tested, and ready for activation. All code is commented out by default to maintain v1 behavior.

**New Feature:**
Dual-mode page generation system that gives users choice between fast direct publishing and careful review workflow.

### Added

#### Backend APIs (Production Ready)
- **`/api/generate-preview`** - Generates content for all pages without publishing to WordPress
  - Parallel generation for speed
  - Returns validated content ready for review
  - File: `src/app/api/generate-preview/route.ts`

- **`/api/publish-reviewed`** - Publishes previously reviewed content to WordPress
  - Handles Elementor template replacement
  - Sets SEO meta fields (Yoast/RankMath)
  - Parent page linking
  - File: `src/app/api/publish-reviewed/route.ts`

- **`/api/regenerate-section`** - Regenerates specific content sections
  - Supports: hero, benefits, why, FAQs, map descriptions
  - Maintains all other content unchanged
  - Uses existing client settings and page data
  - File: `src/app/api/regenerate-section/route.ts`

#### Frontend Components (Ready to Activate)
- **`ContentPreviewModal.tsx`** - Full-featured content review modal
  - Page list sidebar with status indicators
  - Collapsible content sections with preview
  - Section-level regeneration buttons
  - Individual and bulk publish controls
  - Navigation between pages
  - File: `src/app/clients/[id]/ContentPreviewModal.tsx`

#### Utilities
- **`elementor-replacer.ts`** - Reusable content replacement utility
  - Extracted from `simple-queue.ts` for reuse
  - Handles all Elementor widget types
  - Link insertion logic
  - File: `src/lib/elementor-replacer.ts`

#### Documentation
- **`V2_ACTIVATION_GUIDE.md`** - Complete activation instructions
  - 6-step activation process
  - Testing instructions
  - Rollback instructions
  - File locations and code references
  - File: `docs/V2_ACTIVATION_GUIDE.md`

### Changed

- **GeneratePagesTab.tsx** - Added v2 integration points (all commented)
  - Line 10-13: ContentPreviewModal import
  - Lines 82-88: State variables for preview mode
  - Lines 488-595: Handler functions (startPreviewGeneration, handleRegenerateSection, handlePublishPage, handlePublishAll)
  - Lines 965-1010: Mode selector UI
  - Lines 1022-1042: Conditional generation buttons
  - Lines 1167-1179: ContentPreviewModal usage
  - All v2 code marked with "V2 FEATURE" comments

- **simple-queue.ts** - Content replacement logic extracted
  - Elementor replacement moved to `elementor-replacer.ts`
  - Still uses extracted function for compatibility

### Features Overview

#### Mode 1: Generate Directly (Default, v1 Behavior)
- CSV upload → Validate → Preview slugs/keywords → Generate & publish automatically
- Fast, no interruptions, pages go live immediately
- **Current default behavior** - no changes to existing workflow

#### Mode 2: Preview & Publish (v2, Ready to Activate)
- CSV upload → Validate → Preview slugs/keywords → **Generate content** → **Review modal** → Publish when ready
- Review all generated content before publishing
- Regenerate any section with one click
- Publish pages individually or all at once
- Full control over content quality

### How to Activate

Follow the 6 steps in `docs/V2_ACTIVATION_GUIDE.md`:
1. Uncomment ContentPreviewModal import
2. Uncomment state variables
3. Uncomment handler functions
4. Uncomment mode selector UI
5. Replace default button with conditional buttons
6. Uncomment ContentPreviewModal component usage

### Testing Status
- ✅ All APIs independently tested
- ✅ Modal component fully functional
- ✅ Integration points clearly marked
- ✅ No TypeScript errors
- ✅ Dev server runs without issues
- ✅ Default behavior unchanged

### Rollback
Simply re-comment all sections marked with "V2 FEATURE" to disable.

---

## [1.3.1] - 2025-10-17

### 🔧 Fixed: Content Update Issues & UX Improvements

**Problems Solved:**
1. Map description content was generated by AI but not being inserted into WordPress pages
2. Hero description content was not updating when using CSS ID "hero-description"
3. No loading feedback in preview mode left users confused during generation

### Fixed

#### Map Description Update Issue
- **Root Cause:** `elementor-replacer.ts` used exact CSS ID match (`cssId === 'map-description'`) and required `element.settings.editor` to exist
  - This failed if the widget was a heading widget instead of text-editor
  - Even with exact CSS ID "map-description", it wouldn't work for non-text-editor widgets

- **Solution:** Changed to flexible matching pattern (`cssId.includes('map') && cssId.includes('description')`)
  - Now supports multiple widget types: text-editor (updates `editor` property) and heading (updates `title` property)
  - Works with any CSS ID variation containing both "map" and "description"
  - File: `src/lib/elementor-replacer.ts:191-209`

- **Sample Page API:** Also updated with same fix + debug logging
  - File: `src/app/api/sample-page/route.ts:117-144`

#### Hero Description Update Issue
- **Root Cause:** Hero section logic combined H1 and hero description handling with `cssId.includes('hero') || cssId.includes('h1')`
  - Hero description would only update if widget was text-editor type
  - CSS ID "hero-description" wouldn't match properly due to combined logic
  - **Critical bug:** H1 check came BEFORE hero description, so CSS IDs like "h1-hero-description" would incorrectly get H1 content instead of hero description

- **Solution:** Separated H1 from hero description with correct priority order
  - **Check hero description FIRST** (more specific): `cssId.includes('hero') && cssId.includes('description')`
  - **Check H1 SECOND** (less specific): `cssId.includes('h1')`
  - This ensures "h1-hero-description" gets hero description content, not H1 content
  - Both checks support text-editor and heading widgets
  - Removed all widget type restrictions
  - Files: `src/lib/elementor-replacer.ts:66-93`, `src/app/api/sample-page/route.ts:146-173`

### Added

#### Preview Mode UX Improvements
- **Loading State UI** when generating content in preview mode
  - Animated spinner with progress message
  - Shows page count being generated
  - Helpful info text: "This may take a few moments. Please wait..."
  - Prevents user confusion during generation
  - File: `src/app/clients/[id]/GeneratePagesTab.tsx:673-697`

- **Link Placements Display** in ContentPreviewModal
  - Shows internal link placement (e.g., "hero", "faq-1") with clickable URL
  - Shows external link placement (e.g., "benefits-1", "why-2") with clickable URL
  - Color-coded: internal links in blue, external links in purple
  - URLs truncated to 50 chars for readability
  - Opens links in new tab
  - File: `src/app/clients/[id]/ContentPreviewModal.tsx:256-309`

#### Backend Enhancements
- **Link Information in Preview API**
  - Calculates internal link URLs (40% homepage, 60% contextual pages from sitemap)
  - Generates external link URLs (Wikipedia city pages)
  - Returns link placement and URLs in API response
  - File: `src/app/api/generate-preview/route.ts:51-143`

### Benefits
- ✅ **Map descriptions now update correctly** in all generation modes
- ✅ **Hero descriptions now update correctly** in all generation modes
- ✅ **Better user experience** with loading feedback during generation
- ✅ **Full visibility into link placements** before publishing
- ✅ **Flexible CSS ID matching** for all Elementor widgets
- ✅ **Widget type agnostic** - works with text-editor, heading, and other widget types

### Technical Details
- Content update fixes apply to all generation modes: direct, preview & publish, sample pages
- Both elementor-replacer.ts (real pages) and sample-page API (sample pages) have identical logic
- Link information integrated seamlessly into existing preview workflow
- No breaking changes to existing functionality

---

## [1.3.0] - 2025-10-16

### 🎯 Major: Meta Description & FAQ Improvements

**Enhancements:**
Improved meta description character requirements and FAQ question formatting for better SEO optimization.

### Changed

#### Meta Description
- **Character length requirement** updated from "≤155 characters" to "120-155 characters (STRICT)"
  - Ensures minimum length for better SEO visibility
  - "Call now!" CTA is now included within the 120-155 character limit (not added programmatically)
  - Format: "{CompanyName} provides {service} in {location}. [Brief benefit]. Call now!"

- **System Prompt** (`src/lib/claude-api.ts:115-119`)
  - Updated to require "Call now!" within the 120-155 character limit
  - AI must generate CTA as part of the description content
  - Removed instruction to NOT add CTA (previously it was added programmatically)

- **Auto-Fix Function** (`src/lib/claude-api.ts:623-720`)
  - Now expects AI to include "Call now!" in generated description
  - Validates that CTA is present and properly formatted
  - When reconstructing, includes "Call now!" within the 120-155 character limit
  - Reserves 11 characters for " Call now!" when calculating benefit text space

- **Regeneration Prompt** (`src/lib/claude-api.ts:1162-1182`)
  - Updated to require "Call now!" within the 120-155 character limit
  - Changed example to show CTA included with character count
  - Removed note about programmatic addition

#### FAQ Question Format
- **FAQ questions now use primary keyword WITHOUT adjectives** for more natural search queries
  - Example: If primary keyword is "Professional Plumber in Carlsbad, CA"
  - FAQ questions should use "plumber in Carlsbad, CA" (removing "Professional")
  - FAQ answers can still use the full primary keyword naturally when relevant

- **System Prompt** (`src/lib/claude-api.ts:147-157`)
  - Added explicit guidance for FAQ question format
  - Example shows adjective removal from questions
  - Clarified that answers can use full primary keyword

- **FAQ Regeneration Prompt** (`src/lib/claude-api.ts:1029-1070`)
  - Extracts service without adjective for FAQ questions
  - Provides clear examples of correct vs incorrect format
  - Emphasizes natural customer search behavior

- **Individual FAQ Regeneration** (`src/lib/claude-api.ts:1306-1342`)
  - Updated to use service without adjective in questions
  - Maintains full primary keyword availability for answers
  - Consistent formatting across all FAQ regeneration paths

### Documentation Updated
- **SOP.md** (`docs/SOP.md`)
  - Meta Description section updated with new 120-155 character requirement
  - FAQ section updated with adjective removal guidance
  - Validation rules updated to reflect new requirements
  - Added character count examples

### Benefits
- ✅ **Better SEO**: Minimum 120 characters ensures rich meta descriptions
- ✅ **Natural FAQ questions**: Removing adjectives makes questions more searchable
- ✅ **Consistent experience**: CTA is part of AI generation, not added afterward
- ✅ **User search alignment**: FAQ questions match how customers actually search

### Technical Details
- All changes maintain backward compatibility with existing content
- Auto-fix function handles both new and old formats gracefully
- Validation enforces both minimum (120) and maximum (155) character limits

---

## [1.2.0] - 2025-10-15

### 🎯 Major: Deterministic Adjective System

**Problem Solved:**
Previously, the preview modal would show one adjective (e.g., "Professional") but the actual generated page would use a different one (e.g., "Specialized"). This caused confusion and inconsistency.

**Solution:**
Implemented a deterministic adjective system that ensures 100% consistency from preview to generation to regeneration.

### Added
- **New file:** `src/lib/adjectives.ts` - Predefined list of 50 professional adjectives
  - `getAdjectiveForRow(rowNumber)` - Get adjective based on CSV row number
  - `getAdjectiveByIndex(index)` - Get adjective by 0-based index
  - `getAdjectives(count, startIndex)` - Get multiple adjectives
  - `getAdjectiveCount()` - Get total adjective count

- **New documentation:** `docs/ADJECTIVE_SYSTEM.md` - Complete guide to the adjective system
- **This file:** `docs/CHANGELOG.md` - Project changelog

### Changed
- **Preview Modal** (`GeneratePagesTab.tsx:583-604`)
  - Now uses `getAdjectiveForRow()` instead of hardcoded array
  - Displays exact adjectives that will be used in generation
  - Eliminates preview/generation mismatch

- **Batch Generation** (`simple-queue.ts:1057-1062`)
  - Replaced AI adjective generation with deterministic selection
  - Uses row number to select adjective consistently
  - Faster processing (no AI calls for adjectives)

- **Regeneration Logic** (`regenerate/route.ts:491-503`)
  - Extracts original adjective from stored `primaryKeyword`
  - Falls back to deterministic selection if not available
  - Maintains consistency across retry attempts

- **AI System Prompt** (`claude-api.ts:127-137`)
  - Added strict "PRIMARY KEYWORD - ABSOLUTE REQUIREMENT" section
  - Explicitly instructs AI to use exact primary keyword provided
  - Prohibits AI from modifying, changing, or varying the keyword
  - Includes clear examples of correct vs. incorrect usage

- **Page-Specific Prompt** (`claude-api.ts:220-234`)
  - Enhanced with "CRITICAL - PRIMARY KEYWORD USAGE" section
  - Lists specific prohibited actions (changing adjective, reordering words)
  - Emphasizes exact phrase usage throughout content

- **FAQ Retry Prompt** (`claude-api.ts:868-882`)
  - Added primary keyword enforcement
  - Requires exact keyword usage in questions/answers
  - Prohibits adjective changes

- **Map Description Retry Prompt** (`claude-api.ts:906-916`)
  - Added primary keyword enforcement
  - Requires exact keyword usage in description

### Deprecated
- **Function:** `generateAdjectives()` in `claude-api.ts`
  - Marked as `@deprecated`
  - Kept for backward compatibility
  - Should not be used in new code
  - Replaced by deterministic adjectives from `@/lib/adjectives`

### Fixed
- **Issue #1:** Preview shows different adjective than generated page
  - Root Cause: Preview used hardcoded list, generation used AI
  - Fix: Both now use `getAdjectiveForRow(rowNumber)`
  - Result: 100% consistency

- **Issue #2:** Regeneration creates different adjective than original
  - Root Cause: Regeneration generated new AI adjective each time
  - Fix: Extracts adjective from stored `primaryKeyword`
  - Result: Original adjective preserved through retries

---

## [1.1.0] - 2025-10-14

### 🔧 Fixed: FAQ Accordion Support in Regeneration

**Problem Solved:**
The regenerate API was only updating individual FAQ items but not FAQ accordion widgets (which store FAQs in a `tabs` array structure).

### Added
- **Accordion Widget Support** (`regenerate/route.ts:154-219`)
  - Detects and updates `tabs` structure (classic accordion)
  - Detects and updates `items` structure (nested accordion)
  - Supports individual FAQ items with separate IDs
  - Comprehensive debug logging for structure detection

### Changed
- **FAQ Update Logic** (`regenerate/route.ts`)
  - Now matches the comprehensive logic from `sample-page/route.ts`
  - Handles multiple FAQ widget types automatically
  - Logs widget structure for debugging

### Result
- Sample page generation: ✅ Updates FAQ accordion
- Batch generation: ✅ Updates FAQ accordion
- Regeneration: ✅ Updates FAQ accordion (FIXED)

---

## [1.0.0] - 2025-10-10

### Initial Release

Core features:
- Multi-client management
- CSV-based bulk page generation
- Elementor template system
- WordPress REST API integration
- Claude AI content generation
- Smart validation with auto-fix
- Selective retry for FAQs and map descriptions
- Real-time progress tracking
- Sample page generation
- Dark mode support
- Page builder auto-detection (Elementor, Divi, WPBakery, etc.)

---

## Legend

- 🎯 **Major** - Significant feature or architectural change
- 🔧 **Fixed** - Bug fix
- ⚡ **Performance** - Performance improvement
- 🔒 **Security** - Security enhancement
- 📝 **Documentation** - Documentation update
- ⚠️ **Deprecated** - Feature marked for removal

---

## Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0): Incompatible API changes
- **MINOR** version (0.X.0): New functionality in backward-compatible manner
- **PATCH** version (0.0.X): Backward-compatible bug fixes
