# Universal Page Builder Workflow

## The Vision: One Workflow for ALL Builders

Instead of separate code for each builder, we have ONE workflow that works with Elementor, Divi, WPBakery, Gutenberg, etc.

---

## ❌ OLD WAY: Separate Code for Each Builder

```typescript
// Different code for each builder - hard to maintain!

if (builder === 'elementor') {
  const template = await fetchElementorTemplate(id, creds);
  const elementorData = JSON.parse(template.meta._elementor_data);
  const updated = replaceElementorContent(elementorData, content);
  await publishElementorPage(updated, creds);
}

if (builder === 'divi') {
  const template = await fetchDiviTemplate(id, creds);
  const shortcodes = template.content.rendered;
  const updated = replaceDiviShortcodes(shortcodes, content);
  await publishDiviPage(updated, creds);
}

// ... repeat for every builder
```

**Problems:**
- Duplicated REST API calls
- Hard to add new builders
- Main workflow needs to know builder-specific details
- Lots of if/else statements

---

## ✅ NEW WAY: Universal Workflow with Strategy Pattern

```typescript
import { getBuilderStrategy } from '@/lib/builders/builder-factory';
import { publishWithBuilder } from '@/lib/builders/universal-interface';

/**
 * This function works for ALL builders!
 * No need to know if it's Elementor, Divi, or anything else.
 */
async function generatePage(
  templateId: string,
  service: string,
  location: string,
  credentials: WordPressCredentials
) {
  // 1. Auto-detect builder and get appropriate strategy
  const strategy = await getBuilderStrategy(templateId, credentials);
  // ✅ Works for Elementor, Divi, Gutenberg, etc.!

  // 2. Define what content to replace (same for all builders)
  const contentMap = {
    'hero-h1': `${service} in ${location}`,
    'hero-description': `Get professional ${service.toLowerCase()} services in ${location}.`,
    'benefits-1': 'Fast and reliable service',
    'benefits-2': 'Licensed professionals',
    'benefits-3': 'Affordable pricing',
    'faq-1': 'What areas do you serve?',
  };

  // 3. Metadata (same for all builders)
  const metadata = {
    title: `${service} in ${location}`,
    slug: `${service}-${location}`.toLowerCase().replace(/\s+/g, '-'),
    status: 'publish' as const,
    metaTitle: `Best ${service} in ${location} | Your Company`,
    metaDescription: `Professional ${service} in ${location}. Call today!`,
  };

  // 4. Publish with universal workflow
  const result = await publishWithBuilder(
    strategy,
    templateId,
    contentMap,
    metadata,
    credentials
  );
  // ✅ Works regardless of builder!

  console.log(`✅ Published: ${result.pageUrl}`);
  return result;
}
```

---

## How It Works Behind the Scenes

### Step 1: Auto-Detection
```typescript
const strategy = await getBuilderStrategy('123', credentials);
```

**What happens:**
1. Fetches template page via REST API (universal)
2. Checks for builder signatures:
   - Elementor: `meta._elementor_data` exists
   - Divi: `meta._et_pb_use_builder === 'on'`
   - Gutenberg: `content` has `<!-- wp:` blocks
3. Returns the right strategy instance

### Step 2: Fetch Template
```typescript
const template = await strategy.fetchTemplate('123', credentials);
```

**Same REST API call for all:**
```
GET /wp-json/wp/v2/pages/123?context=edit
```

**But different data extracted:**
- Elementor: Uses `meta._elementor_data` (JSON)
- Divi: Uses `content.rendered` (shortcodes)
- Gutenberg: Uses `content.rendered` (blocks)

### Step 3: Replace Content by ID
```typescript
const updated = strategy.replaceContentByIds(template, contentMap);
```

**Same input for all builders:**
```typescript
{
  'hero-h1': 'New heading',
  'benefits-1': 'New text'
}
```

**But different processing:**

**Elementor (JSON):**
```typescript
// Find element with _element_id: 'hero-h1'
element.settings.editor = 'New heading'
```

**Divi (Shortcodes):**
```typescript
// Find [et_pb_text id="hero-h1"]...[/et_pb_text]
content.replace(/\[et_pb_text id="hero-h1"\].*?\[\/et_pb_text\]/, newContent)
```

**Gutenberg (Blocks):**
```typescript
// Find <!-- wp:heading {"id":"hero-h1"} --><h1>...</h1>
content.replace(/<!-- wp:heading {"id":"hero-h1"} -->.*?<\/h1>/, newContent)
```

### Step 4: Publish
```typescript
const result = await strategy.publishPage(updated, metadata, credentials);
```

**Same REST API endpoint:**
```
POST /wp-json/wp/v2/pages
```

**But different payload structure:**

**Elementor:**
```json
{
  "title": "...",
  "meta": {
    "_elementor_data": "{...updated JSON...}",
    "_elementor_edit_mode": "builder"
  }
}
```

**Divi:**
```json
{
  "title": "...",
  "content": "[et_pb_section]...updated shortcodes...[/et_pb_section]",
  "meta": {
    "_et_pb_use_builder": "on"
  }
}
```

---

## Benefits of This Approach

### ✅ Single Source of Truth
- ONE workflow function that works for all builders
- No duplicated code
- Easy to test and maintain

### ✅ Easy to Add New Builders
To add WPBakery support:
```typescript
// 1. Create strategy (70 lines of code)
class WPBakeryStrategy implements PageBuilderStrategy { ... }

// 2. Add to factory (3 lines)
case 'wpbakery':
  return new WPBakeryStrategy();

// Done! All existing code automatically works.
```

### ✅ No Changes to Main Workflow
Your CSV processing, batch generation, UI - **none of it needs to change**.

The main workflow just calls:
```typescript
const strategy = await getBuilderStrategy(templateId, creds);
await publishWithBuilder(strategy, ...);
```

It works whether it's Elementor, Divi, or any future builder.

### ✅ Builder-Specific Logic is Isolated
- Elementor JSON parsing: Only in `elementor-strategy.ts`
- Divi shortcode parsing: Only in `divi-strategy.ts`
- Main workflow: Knows nothing about JSON or shortcodes

---

## Migration Plan

### Phase 1: Refactor Elementor (1-2 days)
- Move existing `elementor-replacer.ts` logic into `ElementorStrategy`
- Update one endpoint to use new pattern
- Test thoroughly
- No feature changes - just cleaner architecture

### Phase 2: Add Divi (2-3 days)
- Implement `DiviStrategy` (shortcode parsing)
- Add to factory
- Test with real Divi site
- **Now supports 2 builders with same workflow!**

### Phase 3: Add More Builders (2-3 days each)
- WPBakery: Similar to Divi (shortcodes)
- Gutenberg: Block parsing
- Beaver Builder: Similar to Elementor (JSON)

### Phase 4: Polish (1 day)
- Better error messages
- Validation helpers
- Documentation updates

---

## Real-World Example

```typescript
// This exact code works for Elementor, Divi, WPBakery, Gutenberg, etc.

async function batchGenerate(csvRows: Row[], client: Client) {
  // Get strategy once (auto-detected from template)
  const strategy = await getBuilderStrategy(
    client.templatePageId,
    {
      wordpressUrl: client.wordpressUrl,
      wpUsername: client.wpUsername,
      wpAppPassword: client.wpAppPassword,
    }
  );

  console.log(`Using ${strategy.name} for batch generation`);

  // Generate all pages using same strategy
  for (const row of csvRows) {
    const contentMap = generateContentMap(row); // Your AI generation
    const metadata = generateMetadata(row);

    await publishWithBuilder(
      strategy,
      client.templatePageId,
      contentMap,
      metadata,
      {
        wordpressUrl: client.wordpressUrl,
        wpUsername: client.wpUsername,
        wpAppPassword: client.wpAppPassword,
      }
    );
  }
}
```

**Works for ALL builders - zero changes needed when adding new ones!**

---

## Answer to Your Question

> "Can't we just use REST API and template page, fetch available components by ID and replace content, irrespective of builders?"

**YES! That's exactly what this architecture does:**

1. ✅ Use REST API only (no builder SDKs)
2. ✅ Fetch template page (universal endpoint)
3. ✅ Find components by ID (CSS IDs work in all builders)
4. ✅ Replace content (each builder implements this differently)
5. ✅ Publish via REST API (universal endpoint)

The **strategy pattern** hides the builder-specific details (JSON vs shortcodes vs blocks) while exposing a **universal interface** (find by ID, replace content, publish).

**One workflow. All builders. Clean architecture.** 🎯
