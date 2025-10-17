# V2 Feature Activation Guide
## Preview & Publish Mode

**Status:** Ready for activation (code complete, UI commented out)
**Target Version:** v2.0.0

---

## Overview

The "Preview & Publish" mode is fully implemented but disabled by default. All code is in place and ready to activate when needed for v2 release.

### What's Ready

✅ **Backend APIs** (fully functional):
- `/api/generate-preview` - Generates content without publishing
- `/api/publish-reviewed` - Publishes reviewed content
- `/api/regenerate-section` - Regenerates specific sections

✅ **Frontend Components** (ready to use):
- `ContentPreviewModal.tsx` - Full-featured review modal
- `elementor-replacer.ts` - Reusable content replacement utility

✅ **Integration Points** (commented in code):
- Mode selector UI in GeneratePagesTab
- Preview generation handlers
- Section regeneration logic
- Publish controls (individual & bulk)

---

## How to Activate V2 Features

### Step 1: Enable the Import

In `src/app/clients/[id]/GeneratePagesTab.tsx`, uncomment line ~10:

```typescript
// BEFORE (commented):
// import ContentPreviewModal from './ContentPreviewModal';

// AFTER (uncommented):
import ContentPreviewModal from './ContentPreviewModal';
```

### Step 2: Enable State Variables

Uncomment lines ~78-82:

```typescript
// BEFORE (commented):
// const [generationMode, setGenerationMode] = useState<'direct' | 'preview'>('direct');
// const [contentPreviewPages, setContentPreviewPages] = useState<any[]>([]);
// ...

// AFTER (uncommented):
const [generationMode, setGenerationMode] = useState<'direct' | 'preview'>('direct');
const [contentPreviewPages, setContentPreviewPages] = useState<any[]>([]);
const [showContentPreview, setShowContentPreview] = useState(false);
const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
```

### Step 3: Enable Handler Functions

Uncomment the entire handler functions section (~lines 430-520):

```typescript
// Uncomment these functions:
// - startPreviewGeneration
// - handleRegenerateSection
// - handlePublishPage
// - handlePublishAll
```

### Step 4: Enable Mode Selector UI

In the Generation Controls section (~line 790), uncomment the mode selector:

```typescript
// Uncomment the radio button group for mode selection
<div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
  <label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
    Generation Mode
  </label>
  // ... rest of mode selector UI
</div>
```

### Step 5: Enable Conditional Buttons

Replace the default button with the conditional logic (~line 820):

```typescript
// BEFORE (default direct mode only):
<button onClick={showGenerationPreview}>
  Preview & Start Generation
</button>

// AFTER (mode-based buttons):
{generationMode === 'direct' ? (
  <button onClick={showGenerationPreview}>
    Preview & Start Generation
  </button>
) : (
  <button onClick={startPreviewGeneration}>
    {isGeneratingPreview ? 'Generating Preview...' : 'Generate Preview'}
  </button>
)}
```

### Step 6: Enable Content Preview Modal

Uncomment the modal component near the end (~line 930):

```typescript
// BEFORE (commented):
// {showContentPreview && (
//   <ContentPreviewModal ... />
// )}

// AFTER (uncommented):
{showContentPreview && (
  <ContentPreviewModal
    pages={contentPreviewPages}
    onClose={() => setShowContentPreview(false)}
    onRegenerateSection={handleRegenerateSection}
    onPublishPage={handlePublishPage}
    onPublishAll={handlePublishAll}
  />
)}
```

---

## Testing After Activation

1. **Upload a test CSV** with 2-3 pages
2. **Select "Preview & Publish" mode**
3. **Click "Generate Preview"**
   - ✅ **NEW (v1.3.2):** Modal opens immediately with placeholder pages
   - Watch pages transition from "Waiting..." to "Generating..." to "Ready"
   - No more blocking overlay - see progress right away!
4. **Test navigation** between pages
   - Browse pages while generation is in progress
   - Pages show loading state until content is ready
5. **Test section regeneration**:
   - Click "🔄 Regenerate" on any section
   - Verify new content appears
6. **Test publishing**:
   - Click "Publish This Page" for single page
   - Click "Publish All Ready Pages" for bulk
7. **Verify published pages** in WordPress

### New UX Features (v1.3.2)

**Immediate Modal Display:**
- Modal opens instantly when clicking "Generate Preview"
- Shows all pages with status indicators
- Users can see progress as it happens

**Status Indicators:**
- ⏱️ **Waiting...** - Page queued
- ⚙️ **Generating...** - AI working
- ⏳ **Ready** - Can review now
- ✅ **Published** - Already live

**Benefits:**
- No more staring at a "wait" overlay
- Can start reviewing as soon as first page is ready
- Better visibility into generation progress

---

## Default Behavior (Current)

- **Mode:** Direct generation (no review)
- **Flow:** CSV upload → Validate → Preview slugs/keywords → Generate & publish automatically
- **User Experience:** Fast, no interruptions, pages go live immediately

---

## V2 Behavior (After Activation)

### Mode 1: Direct Generation (unchanged)
- Same as current behavior
- Fast, automatic publishing

### Mode 2: Preview & Publish (new)
- **Flow:** CSV upload → Validate → Preview slugs/keywords → Generate content → **Review modal** → Publish when ready
- **User Experience:** Full control, can regenerate sections, publish one by one or all at once

---

## File Locations

### Backend APIs
```
src/app/api/
├── generate-preview/route.ts    ✅ Ready
├── publish-reviewed/route.ts    ✅ Ready
└── regenerate-section/route.ts  ✅ Ready
```

### Frontend Components
```
src/app/clients/[id]/
├── ContentPreviewModal.tsx      ✅ Ready
└── GeneratePagesTab.tsx         🔧 Needs activation
```

### Utilities
```
src/lib/
└── elementor-replacer.ts        ✅ Ready
```

---

## Rollback Instructions

If you need to disable v2 features after activation:

1. Re-comment the import
2. Re-comment all state variables
3. Re-comment all handler functions
4. Re-comment the mode selector UI
5. Restore the default button
6. Re-comment the ContentPreviewModal usage

**Tip:** Use Git to compare with the current version to see all changes.

---

## Notes

- All v2 code is marked with `V2 FEATURE` comments
- No breaking changes to existing functionality
- APIs are independent and can be tested separately
- Modal component is fully self-contained
- All TypeScript types are properly defined

---

## Support

If you encounter issues after activation:
1. Check browser console for errors
2. Check Next.js dev server logs
3. Verify all commented sections were uncommented
4. Test APIs independently using Postman/curl

---

**Ready to ship v2! 🚀**
