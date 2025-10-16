# Smart Validation System

This document explains the smart validation system with auto-fix and selective retry capabilities.

---

## Overview

The smart validation system automatically corrects common content issues and regenerates only problematic sections, ensuring high-quality output while minimizing API costs and generation time.

## Three-Tier Validation Strategy

### 1. Auto-Fix (No AI Retry)

These fields are **automatically corrected programmatically** without requiring AI regeneration:

#### Meta Description
- **Ensures:**
  - Contains primary keyword
  - Contains company name
  - Ends with "Call now!"
  - Under 155 characters
- **How it fixes:**
  - Adds missing elements
  - Intelligently trims if too long
  - Preserves natural language flow

#### Meta Title
- **Format:** `{primary keyword} | {company name}`
- **Under 80 characters**
- **How it fixes:**
  - Removes adjective from primary keyword if too long
  - Trims company name if still too long
  - Always maintains proper format

#### H1
- **Forces:** Exactly the primary keyword (no company name)
- **How it fixes:** Replaces entire H1 with primary keyword

### 2. Selective Retry (AI Regeneration)

These sections trigger **AI regeneration** (max 2 attempts) if they don't meet criteria:

#### FAQs
**Retries if any FAQ has:**
- Missing primary keyword in question
- Missing company name in answer
- Promotional question ("why choose us")
- Answer length not 50-75 words

**Retry Process:**
1. Detects all FAQ issues
2. Sends focused prompt asking ONLY for FAQs
3. Provides specific requirements
4. Validates regenerated FAQs
5. Maximum 2 retry attempts
6. Falls back to original if retries fail

#### Map Description
**Retries if:**
- Word count not 50-60 words

**Retry Process:**
1. Detects word count issue
2. Sends focused prompt asking ONLY for map description
3. Emphasizes strict word count requirement
4. Maximum 2 retry attempts
5. Falls back to original if retries fail

### 3. Non-Blocking Warnings

These issues are **logged but don't block publishing**:

- Hero description word count (should be 50-60)
- Bullet points word count (should be ≥30)
- Benefits heading missing company name or primary keyword
- Why heading missing service or location

**Why warnings only?**
- Don't severely impact SEO
- Manual review can address if needed
- Avoids excessive regeneration

---

## Heading Validation Strategy

### Benefits H2
**Requirements:**
- MUST contain: Company name
- MUST contain: Primary keyword (or service)
- Can be ANY creative format

**Validation:**
- Checks for keyword presence only
- Warns if missing (doesn't auto-fix or retry)
- Allows creative, contextual variations

**Why no auto-fix?**
- Prevents monotonous headings across pages
- Allows contextual, engaging variations
- Company name and primary keyword presence is sufficient for SEO

### Why H2
**Requirements:**
- MUST contain: Service (without adjective)
- MUST contain: Location
- Can be ANY creative format

**Validation:**
- Checks for keyword presence only
- Warns if missing (doesn't auto-fix or retry)
- Allows creative, contextual variations

**Why no auto-fix?**
- Same reasons as Benefits H2
- Location-specific context is valuable
- Uniqueness improves user experience

---

## Implementation Flow

```
1. Generate Content
   ↓
2. Smart Validation
   ↓
3. Auto-Fix (Meta fields, H1)
   ↓
4. Check FAQs
   ├─ Issues found? → Retry (max 2 attempts)
   └─ No issues? → Continue
   ↓
5. Check Map Description
   ├─ Issues found? → Retry (max 2 attempts)
   └─ No issues? → Continue
   ↓
6. Log Warnings (non-blocking)
   ↓
7. Publish to WordPress
```

---

## Console Output

The system provides clear, emoji-coded console output:

```
✅ Auto-fixed fields for Page 1: metaDescription, metaTitle, h1
🔄 Retrying faqs for Page 1: FAQ 1 question missing primary keyword
✅ Successfully regenerated FAQs for Page 1 (attempt 1)
⚠️ Validation warnings for Page 1: Hero description has 48 words (should be 50-60)
```

**Emoji Legend:**
- ✅ = Success / Auto-fixed
- 🔄 = Retrying
- ⚠️ = Warning (non-blocking)
- ❌ = Error (blocking)

---

## Error Logging

All validation events are logged to the database:

### validation_warning
- Non-blocking issues (warnings)
- Logged for later review
- Page still publishes

### retry_failed
- Failed to regenerate after max attempts
- Falls back to original content
- Page still publishes

---

## API Cost Optimization

### Why This Approach?

1. **Auto-Fix** (meta fields, H1):
   - No API cost
   - Instant correction
   - Consistent format

2. **Selective Retry** (FAQs, map):
   - Only regenerates problematic sections
   - Much cheaper than full page regeneration
   - Typical FAQ retry: ~200 tokens vs 2000+ for full page

3. **No Retry** (headings):
   - AI already incentivized to include keywords
   - Creative variations are valuable
   - Warnings prompt manual review if needed

### Cost Comparison

**Full Page Regeneration:**
- Input: ~2000 tokens
- Output: ~1500 tokens
- Cost: ~$0.05 per retry

**Selective FAQ Retry:**
- Input: ~300 tokens
- Output: ~400 tokens
- Cost: ~$0.01 per retry

**Savings:** ~80% cost reduction for retries

---

## Best Practices

### For Content Quality

1. **Monitor warnings** - Review pages with multiple warnings
2. **Check retry logs** - If many FAQs need retry, improve main prompt
3. **Test regularly** - Generate sample pages to verify quality

### For Development

1. **Don't auto-fix headings** - Creative variations improve SEO
2. **Limit retry attempts** - 2 attempts is sufficient
3. **Log everything** - Helps identify systematic issues

---

## Configuration

### Retry Limits

Located in `src/lib/simple-queue.ts`:

```typescript
const MAX_RETRIES = 2;
```

Increase if you want more attempts (increases API cost).

### Auto-Fix Logic

Located in `src/lib/claude-api.ts`:

Functions:
- `autoFixMetaDescription()`
- `autoFixMetaTitle()`
- `autoFixH1()`

Modify these to adjust auto-fix behavior.

### Validation Checks

Located in `src/lib/claude-api.ts`:

Function: `validateAndFixContent()`

Add new checks or modify existing validation logic here.

---

## Future Enhancements

Potential improvements:

1. **Machine Learning** - Learn which content patterns succeed
2. **A/B Testing** - Test different heading formats
3. **Dynamic Thresholds** - Adjust word counts based on service/location
4. **Bulk Retry** - Retry failed pages in batch later
5. **Quality Scoring** - Rate content quality automatically

---

## Troubleshooting

### FAQs Keep Failing Retry

**Possible causes:**
- Primary keyword too long/complex
- Company name uncommon/hard to incorporate
- Questions too restrictive

**Solutions:**
- Review retry prompt in `regenerateField()`
- Add more examples to prompt
- Adjust FAQ validation criteria

### Auto-Fix Breaking Content

**Possible causes:**
- Edge cases in auto-fix logic
- Unusual company names or keywords

**Solutions:**
- Add special case handling
- Test with edge cases
- Fall back to warnings instead of auto-fix

### Too Many Warnings

**Possible causes:**
- Main prompt needs improvement
- Word count targets too strict
- AI model inconsistency

**Solutions:**
- Improve main generation prompt
- Adjust validation thresholds
- Use prompt caching for consistency

---

## Related Documentation

- [SOP.md](./SOP.md) - Content requirements and formats
- [REQUIREMENTS.md](./REQUIREMENTS.md) - System requirements
- [sample-content/](./sample-content/) - Reference examples
