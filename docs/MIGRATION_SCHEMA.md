# Migration Guide: Adding Schema.org Structured Data

## Overview

This guide covers the v1.4.0 update that adds automatic schema.org structured data generation to all pages.

## What's New

### Features Added

1. **Schema.org JSON-LD Generation**
   - LocalBusiness schema for location-specific pages
   - FAQPage schema for FAQ rich snippets
   - Service schema for service-specific pages

2. **Business Metadata Fields**
   - Business Phone (optional)
   - Business Address (optional)
   - Business Type (optional)
   - Google Business Profile URL (optional)

3. **Universal Meta Title Fallback**
   - `metaTitle` now works without SEO plugins
   - Automatic fallback to WordPress core title field

4. **UI Improvements**
   - Warning badges on clients with incomplete metadata
   - Post-login notification banner
   - Business metadata section in client forms

## Database Migration

### Step 1: Run Migration

```bash
# Generate migration
npx prisma migrate dev --name add_business_metadata

# This creates and applies:
# - businessPhone (String, optional)
# - businessAddress (String, optional)
# - businessType (String, optional)
# - gbpUrl (String, optional)
```

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

### Step 3: Verify Migration

```bash
# Check that new fields exist
npx prisma studio

# Navigate to Client model
# Verify new fields: businessPhone, businessAddress, businessType, gbpUrl
```

## For Existing Clients

### Automatic Behavior

**Existing clients will work normally:**
- ✅ Pages still generate and publish
- ✅ No errors or breaking changes
- ⚠️ Schema will have minimal data (no business info)

**Schema generated without metadata:**
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",  // Generic type
      "name": "Client Name",
      "url": "https://clientwebsite.com"
      // No phone, address, or GBP link
    },
    {
      "@type": "FAQPage",
      "mainEntity": [...]  // FAQs still work!
    }
  ]
}
```

### Recommended: Add Business Metadata

**For each existing client:**

1. **Go to Dashboard** → Click client card
2. **Navigate to Metadata tab** → Click "Edit"
3. **Scroll to "Business Metadata" section**
4. **Fill in fields:**
   - Business Phone: `+1-555-123-4567`
   - Business Address: `123 Main St, City, State ZIP`
   - Business Type: Select from dropdown
   - GBP URL: `https://maps.google.com/?cid=...`
5. **Click "Save Changes"**

**For new pages:**
- All future generated pages will include complete schema

**For existing pages:**
- Option 1: Regenerate pages (recommended for important pages)
- Option 2: Leave as-is (schema still works, just less detailed)

## Testing After Migration

### 1. Create Test Page

```bash
# Generate a test page with complete metadata
```

1. Add business metadata to a client
2. Generate a single page
3. Check page source for schema

### 2. Verify Schema

**In page source (Ctrl+U):**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    // Should see LocalBusiness, FAQPage, Service
  ]
}
</script>
```

### 3. Test with Google

1. Visit: [Rich Results Test](https://search.google.com/test/rich-results)
2. Enter your test page URL
3. Verify: ✅ FAQPage, ✅ LocalBusiness, ✅ Service

## Rollback (If Needed)

**If you encounter issues:**

```bash
# Rollback database
npx prisma migrate rollback

# Or manually remove fields from prisma/schema.prisma:
# Delete these lines from Client model:
#   businessPhone    String?
#   businessAddress  String?
#   businessType     String?
#   gbpUrl           String?

# Then run:
npx prisma migrate dev --name remove_business_metadata
```

**Code Changes to Revert:**

1. Remove `src/lib/schema-generator.ts`
2. Revert changes in:
   - `src/lib/page-generation.ts`
   - `src/lib/simple-queue.ts`
   - `src/app/api/generate/route.ts`
   - `src/app/api/publish-reviewed/route.ts`

## Backward Compatibility

### API Endpoints

**All existing API calls work without changes:**

```typescript
// This still works (no business metadata)
POST /api/generate
{
  "clientId": "...",
  "pages": [...]
}

// New fields are optional
POST /api/generate
{
  "clientId": "...",  // Will use client's metadata if available
  "pages": [...]
}
```

### Generated Content

**Content structure unchanged:**
- All existing content fields still generate
- Schema is additive only (adds JSON-LD script)
- No changes to Elementor replacement logic

### WordPress Compatibility

**Works with:**
- ✅ With or without Yoast SEO
- ✅ With or without Rank Math
- ✅ Any WordPress theme
- ✅ Any page builder (Elementor tested)

## Performance Impact

### Build Time

- **Schema generation:** +5-10ms per page
- **Negligible impact** on total generation time

### Page Size

- **Schema adds:** ~1-2KB per page
- **Compressed (gzip):** ~500-800 bytes
- **Impact:** Minimal (rich snippets worth it!)

## Monitoring

### Check Schema Validity

**Weekly:**
1. Sample 5-10 recently generated pages
2. Test in [Rich Results Test](https://search.google.com/test/rich-results)
3. Verify no errors

### Track Performance

**Monthly:**
- Monitor CTR changes in Google Search Console
- Track rich snippet appearances
- Compare pre/post implementation metrics

## Common Issues

### Issue: Schema not appearing

**Diagnosis:** View page source, search for `@context`

**Solutions:**
1. Verify page was generated AFTER migration
2. Check database: client has `businessPhone` field
3. Regenerate page

### Issue: Invalid schema errors

**Diagnosis:** Rich Results Test shows errors

**Solutions:**
1. **Phone format:** Must be `+1-555-123-4567` (not `(555) 123-4567`)
2. **Address format:** Must include street, city, state, ZIP
3. **Business Type:** Use exact values from dropdown

### Issue: Warning badges not showing

**Diagnosis:** Client cards don't show "⚠️ SEO Setup" badge

**Solutions:**
1. Clear browser cache
2. Refresh dashboard (Ctrl+F5)
3. Verify client actually has incomplete metadata

## Support

### Documentation

- [Schema.org Guide](./SCHEMA_ORG.md)
- [SOP](./SOP.md) - Updated content spec
- [Database Schema](../prisma/schema.prisma)

### Debugging

**Enable debug logs:**
```typescript
// In page-generation.ts, look for:
console.log('[Publishing] Generated schema.org JSON-LD');
console.warn('[Publishing] Failed to generate schema:', error);
```

### Getting Help

If issues persist:
1. Check server logs for schema generation errors
2. Verify Prisma migration completed successfully
3. Test with minimal example (phone + address only)

## Changelog

### v1.4.0 (Current)

**Added:**
- Schema.org JSON-LD generation
- Business metadata fields (4 optional fields)
- Warning badges for incomplete metadata
- Post-login notification banner
- Universal meta title fallback

**Changed:**
- Page title now uses `metaTitle` instead of `h1`
- Schema script injected at top of page content

**Fixed:**
- Meta titles not working without SEO plugins

## Next Steps

1. ✅ Run database migration
2. ✅ Add business metadata to clients
3. ✅ Generate test pages
4. ✅ Verify schema in Rich Results Test
5. ✅ Monitor Search Console for rich snippets
6. 📈 Track CTR improvements!
