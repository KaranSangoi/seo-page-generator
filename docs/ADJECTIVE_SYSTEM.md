# Deterministic Adjective System

**Date:** 2025-10-15
**Status:** ✅ Implemented

## Overview

The SEO Page Generator uses a **deterministic adjective system** to ensure complete consistency between preview and actual page generation. This system eliminates the previous issue where preview would show one adjective (e.g., "Professional") but the generated page would use a different one (e.g., "Specialized").

## How It Works

### 1. Predefined Adjective List

Located in: `src/lib/adjectives.ts`

The system uses a curated list of 50 professional adjectives suitable for SEO keywords:

```typescript
const ADJECTIVES = [
  'Professional', 'Expert', 'Trusted', 'Reliable', 'Certified',
  'Licensed', 'Experienced', 'Quality', 'Top-Rated', 'Premier',
  'Leading', 'Specialized', 'Skilled', 'Qualified', 'Affordable',
  'Local', 'Reputable', 'Proven', 'Dependable', 'Elite',
  // ... 30 more adjectives
];
```

### 2. Row-Based Selection

Each page's adjective is determined by its **row number in the CSV file**:

- **Row 1** → "Professional"
- **Row 2** → "Expert"
- **Row 3** → "Trusted"
- **Row 51** → "Professional" (cycles back)

Formula: `adjective = ADJECTIVES[(rowNumber - 1) % 50]`

### 3. Primary Keyword Construction

The complete primary keyword is constructed before any AI generation:

```
Primary Keyword = [Adjective] + [Service] + "in" + [Location]

Example:
- Row 5: "Certified Plumber in Carlsbad, CA"
- Row 12: "Specialized HVAC Services in Phoenix, AZ"
```

## Implementation Details

### Preview Modal (`GeneratePagesTab.tsx`)

```typescript
const showGenerationPreview = () => {
  import('@/lib/adjectives').then(({ getAdjectiveForRow }) => {
    const preview = parsedPages.map((page) => {
      const adjective = getAdjectiveForRow(page.rowNumber);
      return {
        primaryKeyword: `${adjective} ${page.service} in ${page.location}`,
        // ... other fields
      };
    });
    setPreviewData(preview);
    setShowPreviewModal(true);
  });
};
```

### Batch Generation (`simple-queue.ts`)

```typescript
// Get adjectives deterministically based on row numbers
const { getAdjectiveForRow } = await import('./adjectives');
const adjectives = pages.map(page => getAdjectiveForRow(page.rowNumber));

console.log(`✅ Using deterministic adjectives:`, adjectives);
```

### Regeneration (`regenerate/route.ts`)

```typescript
// Reuse original adjective from stored primaryKeyword
let adjective: string;
if (page.primaryKeyword) {
  const words = page.primaryKeyword.split(' ');
  adjective = words[0]; // Extract first word
} else {
  // Fallback to deterministic selection
  adjective = getAdjectiveForRow(page.rowNumber);
}
```

## AI Prompt Updates

The system prompt (`claude-api.ts`) has been updated to enforce strict primary keyword usage:

```
**PRIMARY KEYWORD - ABSOLUTE REQUIREMENT (CRITICAL):**
- You will be provided with an EXACT PRIMARY KEYWORD that has already been determined
- **DO NOT modify, change, or vary this keyword in ANY way**
- **DO NOT generate your own adjectives or alternative phrasings**
- **DO NOT rearrange the word order**
- Use the PRIMARY KEYWORD exactly as provided throughout ALL content
```

This ensures AI uses the exact primary keyword we've already determined, not generating its own variation.

## Benefits

### ✅ Complete Consistency
- Preview shows **exact** adjectives used in generation
- No surprises or mismatches
- User sees what they get

### ✅ Predictable & Repeatable
- Same CSV row = same adjective every time
- Easy to reproduce results
- Simplifies debugging

### ✅ No AI Randomness
- AI doesn't generate adjectives
- No API calls wasted on adjective generation
- Faster processing

### ✅ Maintains Quality Through Regeneration
- Failed pages reuse original adjective
- Consistency maintained across retries
- Brand voice remains consistent

## Migration from Old System

### Before (AI-Generated Adjectives)

```typescript
// ❌ Old way - AI generates different adjectives each time
const adjectives = await generateAdjectives(pages.length);
// Result: ['Expert', 'Professional', 'Certified', ...]
```

**Problems:**
- Preview used hardcoded list
- Batch generation used AI-generated list
- Regeneration generated new adjectives
- No consistency guaranteed

### After (Deterministic Selection)

```typescript
// ✅ New way - deterministic based on row number
const adjectives = pages.map(page => getAdjectiveForRow(page.rowNumber));
// Result: ['Professional', 'Expert', 'Trusted', ...] (always the same)
```

**Improvements:**
- Preview uses `getAdjectiveForRow()`
- Batch generation uses `getAdjectiveForRow()`
- Regeneration extracts from stored keyword
- 100% consistency across entire lifecycle

## Testing

### Test Scenario 1: Preview Consistency

1. Upload CSV with 3 pages
2. View preview modal
3. Note adjectives shown (e.g., Row 1: "Professional", Row 2: "Expert", Row 3: "Trusted")
4. Start generation
5. ✅ Verify generated pages use exact same adjectives

### Test Scenario 2: Regeneration Consistency

1. Generate a page (e.g., Row 1: "Professional Plumber in Carlsbad, CA")
2. Simulate failure and regenerate
3. ✅ Verify regenerated page still uses "Professional" (not "Expert" or "Specialized")

### Test Scenario 3: Large Batches

1. Upload CSV with 100 pages
2. Check preview for Row 1, Row 51, Row 101
3. ✅ Verify Row 1 and Row 51 use "Professional" (cycling works correctly)

## File Structure

```
src/
├── lib/
│   ├── adjectives.ts           # ✅ New - Predefined adjective list
│   ├── claude-api.ts            # ✅ Updated - Enforces exact keyword usage
│   └── simple-queue.ts          # ✅ Updated - Uses deterministic adjectives
├── app/
│   ├── api/
│   │   ├── generate/route.ts    # ✅ Updated - Passes complete primary keyword
│   │   ├── regenerate/route.ts  # ✅ Updated - Reuses original adjective
│   │   └── sample-page/route.ts # Uses same system
│   └── clients/[id]/
│       └── GeneratePagesTab.tsx # ✅ Updated - Preview uses deterministic logic
```

## API

### `getAdjectiveByIndex(index: number): string`
Get adjective by 0-based index.

```typescript
getAdjectiveByIndex(0); // "Professional"
getAdjectiveByIndex(11); // "Specialized"
```

### `getAdjectiveForRow(rowNumber: number): string`
Get adjective for a CSV row (1-indexed).

```typescript
getAdjectiveForRow(1); // "Professional"
getAdjectiveForRow(2); // "Expert"
getAdjectiveForRow(51); // "Professional" (cycles)
```

### `getAdjectives(count: number, startIndex?: number): string[]`
Get multiple adjectives starting from an index.

```typescript
getAdjectives(3, 0); // ["Professional", "Expert", "Trusted"]
getAdjectives(3, 10); // ["Leading", "Specialized", "Skilled"]
```

### `getAdjectiveCount(): number`
Get total number of adjectives available.

```typescript
getAdjectiveCount(); // 50
```

## Deprecated Functions

### `generateAdjectives(count: number)` in `claude-api.ts`

**Status:** ⚠️ Deprecated
**Reason:** Replaced by deterministic system
**Action:** Function remains for backward compatibility but should not be used

```typescript
/**
 * @deprecated This function is no longer used.
 * Use deterministic adjectives from @/lib/adjectives instead.
 */
export async function generateAdjectives(count: number): Promise<string[]>
```

## Future Enhancements

### Custom Adjective Lists Per Client
Allow clients to define their own adjective list:

```typescript
interface Client {
  customAdjectives?: string[]; // Override default list
}
```

### Adjective Rotation Strategies
- Sequential (current)
- Random but consistent (seeded)
- Weighted (prefer certain adjectives)
- Per-service mapping

### Admin UI for Adjective Management
- View/edit global adjective list
- Add/remove adjectives
- Reorder for priority
- Preview impact on existing pages

## Conclusion

The deterministic adjective system provides **complete consistency** from preview through generation to regeneration. By pre-determining adjectives based on row numbers and passing the exact primary keyword to AI, we eliminate all randomness and ensure users see exactly what they'll get.

This is a **fundamental improvement** to the reliability and predictability of the SEO Page Generator.
