# Page Builder Auto-Detection

## Overview

Instead of asking users to manually select their page builder, we can **automatically detect** which builder is being used by analyzing the template page they provide.

## ✅ YES - Auto-Detection is 100% Feasible!

Each page builder has **unique signatures** in the WordPress page data that we can identify programmatically.

---

## Detection Signatures

### 1. Elementor
**Meta Field**: `_elementor_data` (contains JSON)
**Meta Field**: `_elementor_edit_mode` = "builder"

```json
{
  "meta": {
    "_elementor_data": "[{\"id\":\"...\", \"elType\":\"section\", ...}]",
    "_elementor_edit_mode": "builder",
    "_elementor_version": "3.25.0"
  }
}
```

### 2. Divi Builder
**Post Content**: Shortcodes starting with `[et_pb_`
**Meta Field**: `_et_pb_use_builder` = "on"

```json
{
  "content": {
    "rendered": "[et_pb_section][et_pb_row][et_pb_column]..."
  },
  "meta": {
    "_et_pb_use_builder": "on",
    "_et_pb_old_content": "..."
  }
}
```

### 3. WPBakery Page Builder
**Post Content**: Shortcodes starting with `[vc_`
**Meta Field**: `_wpb_vc_js_status` (sometimes)

```json
{
  "content": {
    "rendered": "[vc_row][vc_column][vc_column_text]..."
  },
  "meta": {
    "_wpb_vc_js_status": "true"
  }
}
```

### 4. Avada Fusion Builder
**Post Content (raw)**: Shortcodes starting with `[fusion_`
**No special meta fields** (Avada processes shortcodes server-side, so `content.rendered` is HTML)

```json
{
  "content": {
    "raw": "[fusion_builder_container][fusion_builder_row][fusion_builder_column][fusion_title id=\"hero-h1\"]<h1>Title</h1>[/fusion_title][/fusion_builder_column][/fusion_builder_row][/fusion_builder_container]",
    "rendered": "<div class=\"fusion-fullwidth\">..."
  }
}
```

**Note:** Detection must check `content.raw` (not `content.rendered`) because Avada renders shortcodes into HTML on the server.

### 5. Gutenberg (Block Editor)
**Post Content**: HTML comments with `<!-- wp:`
**No special meta fields** (native WordPress)

```json
{
  "content": {
    "rendered": "<!-- wp:heading -->\n<h1>Title</h1>\n<!-- /wp:heading -->"
  }
}
```

### 5. Beaver Builder
**Meta Field**: `_fl_builder_data` (contains serialized PHP or JSON)
**Meta Field**: `_fl_builder_enabled` = "1"

```json
{
  "meta": {
    "_fl_builder_data": "[{\"node\":\"...\", \"settings\":...}]",
    "_fl_builder_enabled": "1"
  }
}
```

### 6. Oxygen Builder
**Meta Field**: `ct_builder_shortcodes` (contains JSON)
**Meta Field**: `ct_builder_json` (contains JSON)

```json
{
  "meta": {
    "ct_builder_shortcodes": "[ct_section id=\"...\"]...",
    "ct_builder_json": "{\"id\":1, \"name\":\"root\", ...}"
  }
}
```

### 7. None / Plain HTML
**No builder signatures detected**
**Fallback**: Use plain HTML content replacement

---

## Detection Algorithm

```typescript
async function detectPageBuilder(templatePageId: string, credentials: string, wordpressUrl: string): Promise<string> {
  // Fetch template page with edit context (to get meta fields)
  const url = `${wordpressUrl}/wp-json/wp/v2/pages/${templatePageId}?context=edit`;
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${credentials}` }
  });

  const page = await response.json();
  const meta = page.meta || {};
  const content = page.content?.rendered || '';

  // Check in priority order (most specific to least specific)

  // 1. Elementor - Check for _elementor_data
  if (meta._elementor_data || meta._elementor_edit_mode === 'builder') {
    return 'elementor';
  }

  // 2. Beaver Builder - Check for _fl_builder_data
  if (meta._fl_builder_data || meta._fl_builder_enabled === '1') {
    return 'beaver-builder';
  }

  // 3. Oxygen - Check for ct_builder_json
  if (meta.ct_builder_json || meta.ct_builder_shortcodes) {
    return 'oxygen';
  }

  // 4. Divi - Check for Divi shortcodes
  if (meta._et_pb_use_builder === 'on' || content.includes('[et_pb_')) {
    return 'divi';
  }

  // 5. WPBakery - Check for WPBakery shortcodes
  if (content.includes('[vc_row') || content.includes('[vc_column')) {
    return 'wpbakery';
  }

  // 6. Gutenberg - Check for block comments
  if (content.includes('<!-- wp:')) {
    return 'gutenberg';
  }

  // 7. None - Plain HTML or unknown builder
  return 'html';
}
```

---

## Detection Priority

**Order matters!** Check in this sequence:

1. **Meta fields first** (most reliable):
   - Elementor: `_elementor_data`
   - Beaver Builder: `_fl_builder_data`
   - Oxygen: `ct_builder_json`
   - Divi: `_et_pb_use_builder`

2. **Content patterns** (for builders that store in post_content):
   - Divi: `[et_pb_` shortcodes
   - WPBakery: `[vc_` shortcodes
   - Gutenberg: `<!-- wp:` comments

3. **Fallback**: Plain HTML

---

## User Experience Flow

### Current Flow (Manual Selection):
```
1. User enters template page ID
2. User selects page builder from dropdown
3. System fetches template
4. System generates pages
```

### New Flow (Auto-Detection):
```
1. User enters template page ID
2. User clicks "Test Connection" button
3. System fetches template AND detects builder automatically
4. System shows: "✅ Detected: Elementor"
5. User confirms or manually overrides if needed
6. System generates pages
```

---

## Implementation

### Step 1: Add Detection Function

Create `src/lib/builders/detector.ts`:

```typescript
export type PageBuilder =
  | 'elementor'
  | 'divi'
  | 'wpbakery'
  | 'gutenberg'
  | 'beaver-builder'
  | 'oxygen'
  | 'html';

export async function detectPageBuilder(
  templatePageId: string,
  wordpressUrl: string,
  wpUsername: string,
  wpAppPassword: string
): Promise<PageBuilder> {
  const credentials = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');
  const url = `${wordpressUrl}/wp-json/wp/v2/pages/${templatePageId}?context=edit`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${credentials}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    const page = await response.json();
    const meta = page.meta || {};
    const content = page.content?.rendered || '';

    // Detection logic (as shown above)
    if (meta._elementor_data || meta._elementor_edit_mode === 'builder') {
      return 'elementor';
    }

    if (meta._fl_builder_data || meta._fl_builder_enabled === '1') {
      return 'beaver-builder';
    }

    if (meta.ct_builder_json || meta.ct_builder_shortcodes) {
      return 'oxygen';
    }

    if (meta._et_pb_use_builder === 'on' || content.includes('[et_pb_')) {
      return 'divi';
    }

    if (content.includes('[vc_row') || content.includes('[vc_column')) {
      return 'wpbakery';
    }

    if (content.includes('<!-- wp:')) {
      return 'gutenberg';
    }

    return 'html';

  } catch (error) {
    console.error('Builder detection error:', error);
    throw error;
  }
}

export function getBuilderDisplayName(builder: PageBuilder): string {
  const names: Record<PageBuilder, string> = {
    'elementor': 'Elementor',
    'divi': 'Divi Builder',
    'wpbakery': 'WPBakery Page Builder',
    'gutenberg': 'Gutenberg (Block Editor)',
    'beaver-builder': 'Beaver Builder',
    'oxygen': 'Oxygen Builder',
    'html': 'Plain HTML',
  };
  return names[builder];
}
```

### Step 2: Update Client Setup UI

**Before** (Manual):
```tsx
<select name="pageBuilder">
  <option value="elementor">Elementor</option>
  <option value="divi">Divi Builder</option>
  <option value="wpbakery">WPBakery</option>
</select>
```

**After** (Auto-Detected):
```tsx
{/* Template Page ID field */}
<input
  type="text"
  name="templatePageId"
  onChange={handleTemplateIdChange}
/>

{/* Auto-detect on blur or button click */}
<button onClick={detectBuilder}>
  🔍 Detect Builder
</button>

{/* Show detected builder */}
{detectedBuilder && (
  <div className="detected-builder">
    ✅ Detected: {getBuilderDisplayName(detectedBuilder)}

    {/* Optional: Allow manual override */}
    <button onClick={() => setShowOverride(true)}>
      Change
    </button>
  </div>
)}
```

### Step 3: Update Test Connection Action

Combine detection with connection test:

```typescript
export async function testConnectionAction(formData: FormData) {
  // ... existing connection test code ...

  // After connection succeeds, detect builder
  const templatePageId = formData.get('templatePageId') as string;

  if (templatePageId) {
    try {
      const builder = await detectPageBuilder(
        templatePageId,
        wpSiteUrl,
        wpUsername,
        wpAppPassword
      );

      return {
        success: true,
        message: `✅ Connection successful!\n\nDetected page builder: ${getBuilderDisplayName(builder)}`,
        detectedBuilder: builder,
      };
    } catch (detectionError) {
      return {
        success: true,
        message: `✅ Connection successful!\n\n⚠️ Could not detect page builder automatically. Please select manually.`,
      };
    }
  }

  return {
    success: true,
    message: `✅ Connection successful!`,
  };
}
```

---

## Database Changes

Update `Client` model:

```prisma
model Client {
  // ... existing fields

  pageBuilder       String  // "elementor", "divi", "wpbakery", etc.
  builderDetected   Boolean @default(true) // Was it auto-detected or manually set?
}
```

---

## Benefits

### For Users:
✅ **No need to know** which builder they're using
✅ **Fewer fields** to fill in
✅ **Less errors** (can't select wrong builder)
✅ **Faster setup** (automatic detection)

### For Development:
✅ **Better UX** (smart system)
✅ **Future-proof** (easy to add new builders)
✅ **Debugging** (can log detected vs actual builder)

---

## Edge Cases

### What if detection fails?
- Show manual selection dropdown as fallback
- Log the error for debugging
- User can still proceed by selecting manually

### What if user has multiple builders?
- Detect the one used in the template page
- If template uses Builder A, all generated pages use Builder A
- User can create multiple clients for different builders

### What if template page doesn't exist?
- Detection fails gracefully
- Show error: "Template page not found"
- User fixes the template ID

---

## Recommended UX

### Option 1: Auto-Detect on Test Connection
```
1. User enters WordPress credentials + template ID
2. User clicks "Test Connection"
3. System tests connection AND detects builder
4. Shows: "✅ Connected! Detected: Elementor"
5. User saves (builder is auto-saved)
```

### Option 2: Detect on Save
```
1. User enters all fields
2. User clicks "Save Client"
3. System fetches template and detects builder
4. Saves client with detected builder
5. Shows success with detected builder
```

### Option 3: Hybrid (Recommended)
```
1. User enters credentials
2. User clicks "Test Connection"
3. Shows connection status
4. User enters template ID
5. Auto-detects builder on blur
6. Shows: "Detected: Elementor" (with option to change)
7. User saves
```

---

## Implementation Timeline

- **Detection function**: 2 hours
- **UI updates**: 3 hours
- **Testing with real sites**: 2 hours
- **Documentation**: 1 hour

**Total**: ~1 day of work

---

## Conclusion

✅ **YES - Auto-detection is 100% feasible and recommended!**

**Benefits:**
- Better user experience
- Fewer errors
- Faster setup
- Professional appearance

**Trade-offs:**
- Requires fetching template page during setup (already doing this)
- Need fallback for detection failures (easy to add)

**Recommendation**: Implement auto-detection with manual override option.
