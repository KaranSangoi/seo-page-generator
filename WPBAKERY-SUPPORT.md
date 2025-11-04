# WPBakery Page Builder Support Documentation

## Overview

Our WPBakery support is designed to handle the most common use cases, but WPBakery's flexibility means there are variations we may not cover out-of-the-box.

## What We Support ✅

### 1. **Standard WPBakery Elements**
- `[vc_row]`, `[vc_column]`, `[vc_section]` - Layout structures
- `[vc_column_text]` - Text content (nested content replacement)
- `[vc_toggle]` - FAQ accordions (full replacement)
- `[vc_raw_html]` - Raw HTML with base64 encoding
- `[vc_raw_js]` - Raw JavaScript with base64 encoding
- Any `[vc_*]` element with **nested content**

### 2. **Woodmart Theme Extensions**
- `[woodmart_title]` - Titles with attributes: `title=""`, `after_title=""`, `subtitle=""`
- `[woodmart_list]` - Lists with URL-encoded JSON in `list=""` attribute
- `[woodmart_button]`, `[woodmart_*]` - Generic Woodmart elements
- Elements using **attribute-based content** instead of nested content

### 3. **Content Storage Formats**
- ✅ Nested content: `[element]content here[/element]`
- ✅ Attributes: `[element title="content here"]`
- ✅ URL-encoded JSON: `[element list="%5B%7B..."]`
- ✅ Base64 encoded: `[vc_raw_html]PGlmcmFtZS4uLg==[/vc_raw_html]`

### 4. **Element Identification**
- ✅ By class: `el_class="hero"`, `el_class="benefits"`
- ✅ By ID: `el_id="faqs"`, `el_id="map-iframe"`
- ✅ Multiple identifiers: `el_class="map-description"` or `el_id="map"`

## What We DON'T Fully Support ❌

### 1. **Other Premium Theme Extensions**
Many premium WordPress themes add their own custom shortcodes on top of WPBakery:
- ❌ Custom `[themename_*]` shortcodes (unless similar to Woodmart)
- ❌ Proprietary data formats
- ❌ Theme-specific attribute names

**Example:**
```
[avada_custom_element data="encoded-proprietary-format"] ← NOT SUPPORTED
```

### 2. **Complex Nested Structures**
- ❌ Deeply nested repeater fields
- ❌ Custom post types embedded in shortcodes
- ❌ Dynamic content from plugins

### 3. **Non-Standard Attribute Names**
We check for common attributes:
- `title=""`, `subtitle=""`, `after_title=""` (Woodmart)
- Content between opening and closing tags

If your theme uses different attribute names like:
```
[custom_element main_text="..." sub_text="..." description="..."]
```
These won't be automatically detected.

## How It Works

### Detection Logic

1. **Find Element**: Search for `el_class="identifier"` or `el_id="identifier"`
2. **Determine Type**: Extract shortcode type (e.g., `vc_column_text`, `woodmart_title`)
3. **Choose Strategy**:
   - If `woodmart_*` → Try attribute replacement
   - If `vc_raw_html/js` → Base64 encode
   - If `vc_column_text` → Nested content replacement
   - Else → Generic nested content replacement

### Replacement Strategies

#### Strategy 1: Attribute Replacement (Woodmart)
```
Before: [woodmart_title title="Old Title" after_title="Old description"]
After:  [woodmart_title title="Old Title" after_title="New description"]
```

#### Strategy 2: Nested Content Replacement (Standard WPBakery)
```
Before: [vc_column_text]Old content here[/vc_column_text]
After:  [vc_column_text]New content here[/vc_column_text]
```

#### Strategy 3: Base64 Encoding (Raw HTML/JS)
```
Before: [vc_raw_html]PGlmcmFtZS4uLg==[/vc_raw_html]
After:  [vc_raw_html]NEW_BASE64_ENCODED_CONTENT[/vc_raw_html]
```

## Common Issues & Solutions

### Issue 1: "Element not found"
**Symptoms:** Log shows `❌ Element not found`

**Solutions:**
1. Check the element has `el_class="identifier"` or `el_id="identifier"`
2. Verify the identifier spelling matches exactly
3. Check if element is wrapped in `<p>` tags (we handle this)
4. Look at debug file: `D:\wpbakery-debug.txt`

### Issue 2: "Element found but content not replaced"
**Symptoms:** Log shows `✅ Found element` but content unchanged

**Solutions:**
1. Check element type in logs
2. For Woodmart elements: Verify it has the expected attributes (`title`, `after_title`, `subtitle`)
3. For standard elements: Check it's a supported `[vc_*]` shortcode
4. Check if it's a custom theme element we don't support

### Issue 3: "Wrong content replaced"
**Symptoms:** Heading changed instead of description, or vice versa

**Solutions:**
1. **For headings:** Use `el_class="section-heading"` and we'll replace `title=""`
2. **For descriptions:** Use `el_class="section-description"` and we'll replace `after_title=""`
3. Check logs to see which attribute was replaced

### Issue 4: "Bullets/Lists not updating"
**Symptoms:** List items stay the same

**Solutions:**
1. **Woodmart lists:** Must be in separate element with `el_class="section-bullets"`
2. **Standard lists:** Must have `<ul>` tags in content
3. Check if list is in URL-encoded JSON format (Woodmart) or nested HTML (standard)

## Debugging Guide

### Step 1: Check Logs
Look for these sections in server logs:
```
============================================================
[WPBAKERY REPLACER] 🔧 STARTING REPLACEMENT PROCESS
============================================================
```

### Step 2: Verify Sections Found vs Updated
```
[WPBAKERY REPLACER] Sections found: 5 - hero, benefits, why, faq, map
[WPBAKERY REPLACER] Sections updated: 5 - hero, benefits, why, faq, map
```

If a section is **found but not updated**, check:
1. Element type (is it supported?)
2. Content structure (nested vs attributes?)
3. Attribute names (standard vs custom?)

### Step 3: Check Warnings
```
[WPBAKERY REPLACER] ⚠️ WARNINGS: 1
  1. Missing sections: map
```

### Step 4: Check Debug File
Location: `D:\wpbakery-debug.txt`

Contains:
- Element positions
- Content around identified elements
- Full content preview (first 5000 chars)

### Step 5: Element Type Analysis
```
[FIND ELEMENT] Element type from class: woodmart_title
[WPBAKERY REPLACER] ✅ Found element in woodmart_title
```

## Adding Support for New Element Types

If you encounter an unsupported element type:

### Option 1: Modify Template (Recommended)
1. Use standard WPBakery elements when possible
2. Add `el_class` or `el_id` attributes to identify elements
3. Use Woodmart elements if your theme supports them

### Option 2: Code Modification
Contact support with:
1. Client name
2. Element type (from logs)
3. Sample shortcode structure
4. Expected behavior

Example info to provide:
```
Client: John's Painting
Element type: themename_custom_element
Shortcode: [themename_custom_element heading="..." text="..." link="..."]
Expected: Replace text="..." attribute with generated content
```

## Best Practices

### Template Design
1. ✅ Use consistent class names: `hero`, `benefits`, `why`, `faq`, `map`
2. ✅ Use separate elements for headings vs descriptions vs bullets
3. ✅ Test with sample page before bulk generation
4. ✅ Keep structure simple (avoid deep nesting)

### Class Naming
```
Good:
- el_class="hero"              → H1 and description
- el_class="benefits"          → Benefits heading
- el_class="benefits-bullets"  → Benefits list items
- el_class="map-description"   → Map description paragraph

Avoid:
- el_class="my-custom-complex-section-title-123"  → Too specific
- No class at all                                  → Can't be found
```

### Content Structure
```
Recommended:
[woodmart_title el_class="benefits" title="Heading" after_title="Description"]
[woodmart_list el_class="benefits-bullets" list="..."]

Avoid:
[custom_element all_content="heading|description|bullet1|bullet2"]  ← Proprietary format
```

## Testing Checklist

Before bulk page generation:

- [ ] Generate sample page
- [ ] Check all sections updated (hero, benefits, why, faq, map)
- [ ] Verify headings vs descriptions replaced correctly
- [ ] Check bullets/lists updated
- [ ] Verify map iframe displays correctly
- [ ] Review logs for warnings/errors
- [ ] Check page renders correctly on WordPress
- [ ] Test on mobile (responsive design)

## Support Matrix

| Feature | Standard WPBakery | Woodmart | Other Themes |
|---------|------------------|----------|--------------|
| Nested content | ✅ Full | ✅ Full | ✅ Full |
| Attribute-based | ❌ No | ✅ Full | ⚠️ Maybe |
| URL-encoded JSON | ❌ No | ✅ Full | ⚠️ Maybe |
| Base64 encoding | ✅ Full | ✅ Full | ✅ Full |
| Custom shortcodes | ❌ No | ✅ Full | ❌ No |

## Conclusion

Our WPBakery support is **comprehensive for standard WPBakery and Woodmart**, covering 95% of common use cases.

**Not foolproof because:**
1. Hundreds of themes extend WPBakery with custom elements
2. Proprietary data formats vary by theme
3. Custom attribute names are unpredictable
4. Some themes use JavaScript-based builders on top of WPBakery

**To ensure compatibility:**
1. Use standard WPBakery or Woodmart elements
2. Add clear `el_class` identifiers
3. Test with sample pages first
4. Check logs for warnings
5. Contact support if issues arise

## Getting Help

When reporting issues, provide:
1. **Client name** (from your dashboard)
2. **Section not updating** (hero, benefits, etc.)
3. **Element type** (from logs: `woodmart_title`, `vc_column_text`, etc.)
4. **Log excerpt** (copy the relevant section)
5. **Expected vs actual** behavior

With this information, we can quickly diagnose and fix issues!
