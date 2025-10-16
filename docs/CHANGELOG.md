# Changelog

All notable changes to the SEO Page Generator project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
