# Classic Editor Support

The SEO Page Generator now supports WordPress Classic Editor (TinyMCE), allowing you to generate SEO pages for sites using the traditional WordPress editor.

## Supported Editors

- ✅ **Classic Editor (TinyMCE)** - WordPress's original WYSIWYG editor
- ✅ Elementor
- ✅ Divi Builder
- ✅ WPBakery Page Builder

## How It Works

Classic Editor uses HTML comment markers to identify which sections should be replaced with generated content.

### Template Setup

Your template page must include special HTML comment markers around each replaceable section:

```html
<!-- SEO_GEN_START:SECTION_NAME -->
<content>
<!-- SEO_GEN_END:SECTION_NAME -->
```

### Supported Sections

| Section Name | Description |
|--------------|-------------|
| `HERO` | Hero section with H1 and description |
| `BENEFITS` | Benefits section with heading, subheading, and bullet points |
| `WHY` | Why section with heading, subheading, and bullet points |
| `FAQ` | FAQ section with questions and answers |
| `MAP` | Map section with description |

### Template Example

```html
<!-- SEO_GEN_START:HERO -->
<div class="hero-section">
  <h1>Template Title</h1>
  <p>Template hero description goes here...</p>
</div>
<!-- SEO_GEN_END:HERO -->

<!-- SEO_GEN_START:BENEFITS -->
<div class="benefits-section">
  <h2>Our Benefits</h2>
  <p class="subheading">Template subheading</p>
  <ul class="benefits-list">
    <li>Template benefit 1</li>
    <li>Template benefit 2</li>
    <li>Template benefit 3</li>
  </ul>
</div>
<!-- SEO_GEN_END:BENEFITS -->

<!-- SEO_GEN_START:WHY -->
<div class="why-section">
  <h2>Why Choose Us</h2>
  <p class="subheading">Template subheading</p>
  <ul class="why-list">
    <li>Template reason 1</li>
    <li>Template reason 2</li>
    <li>Template reason 3</li>
  </ul>
</div>
<!-- SEO_GEN_END:WHY -->

<!-- SEO_GEN_START:FAQ -->
<div class="faq-section">
  <h2>Frequently Asked Questions</h2>
  <div class="faq-list">
    <div class="faq-item">
      <h3 class="faq-question">Template Question 1?</h3>
      <div class="faq-answer">Template answer 1</div>
    </div>
    <div class="faq-item">
      <h3 class="faq-question">Template Question 2?</h3>
      <div class="faq-answer">Template answer 2</div>
    </div>
  </div>
</div>
<!-- SEO_GEN_END:FAQ -->

<!-- SEO_GEN_START:MAP -->
<div class="map-section">
  <h2>Service Area Map</h2>
  <p>Template map description</p>
  <div class="map-placeholder">
    <!-- Your Google Maps embed code here -->
  </div>
</div>
<!-- SEO_GEN_END:MAP -->
```

## Setup Instructions

### 1. Create Template Page

1. Go to WordPress Dashboard → Pages → Add New
2. Create a page titled "SEO Page Template" (or similar)
3. Switch to **Text/HTML mode** (not Visual mode)
4. Add the HTML comment markers around your sections (see Template Example above)
5. Add your actual HTML content inside each section
6. Publish the page
7. Note the Page ID (visible in the URL when editing)

### 2. Configure Client

1. Go to the SEO Page Generator app
2. Select or create your client
3. Set "Template Page ID" to your template page ID
4. Set "Page Builder" to "classic-editor"
5. Save

### 3. Generate Sample Page

1. Click "Generate Sample Page" to test
2. Check the generated page in WordPress
3. Verify all sections were replaced correctly

### 4. Generate Batch Pages

Once the sample page looks good, proceed with batch generation.

## Important Notes

### HTML Comments Must Be Exact

- Comments must match exactly: `<!-- SEO_GEN_START:SECTION_NAME -->`
- Section names are case-sensitive: `HERO`, `BENEFITS`, `WHY`, `FAQ`, `MAP`
- Don't add spaces or extra characters in the comments

### Section Content Structure

The content between markers will be **completely replaced**. The structure in the template is just a placeholder. The generator will create:

- **HERO**: `<div class="hero-section">` with `<h1>` and `<p>`
- **BENEFITS**: `<div class="benefits-section">` with `<h2>`, `<p>`, and `<ul><li>` bullets
- **WHY**: `<div class="why-section">` with `<h2>`, `<p>`, and `<ul><li>` bullets
- **FAQ**: `<div class="faq-section">` with multiple `<div class="faq-item">` containing `<h3>` questions and `<div>` answers
- **MAP**: `<div class="map-section">` with `<h2>`, `<p>`, and placeholder div

### CSS Styling

The generated HTML uses these classes:
- `hero-section`
- `benefits-section`, `benefits-list`
- `why-section`, `why-list`
- `faq-section`, `faq-list`, `faq-item`, `faq-question`, `faq-answer`
- `map-section`, `map-placeholder`

Add CSS in your theme to style these elements.

### Link Placement

Internal links (company name) and external links (location) are automatically inserted based on your link placement settings, just like with other builders.

### SEO Plugins

Classic Editor works with all SEO plugins (Yoast, Rank Math, All in One SEO). Meta title, description, and focus keyword are set via the plugin's meta fields.

## Troubleshooting

### "No Classic Editor markers found"

**Problem**: Template page doesn't have the required HTML comment markers.

**Solution**:
1. Edit your template page
2. Switch to Text/HTML mode (not Visual)
3. Add the `<!-- SEO_GEN_START:SECTION -->` and `<!-- SEO_GEN_END:SECTION -->` markers
4. Ensure comments are exact (no typos, extra spaces)

### Sections Not Updating

**Problem**: Some sections aren't being replaced.

**Solution**:
1. Check that both START and END markers exist for the section
2. Verify section name spelling (case-sensitive)
3. Make sure you're in Text/HTML mode when editing (Visual mode may corrupt comments)
4. Re-save the template page

### Content Looks Wrong

**Problem**: Generated content doesn't match expected structure.

**Solution**:
1. The content between markers is completely replaced - don't rely on template structure
2. Add custom CSS to style the generated HTML classes
3. Use browser inspector to see the actual generated HTML

## Advanced Usage

### Omitting Sections

You can omit sections in the generation settings (just like with other builders). The generator will skip sections marked in "Omit Sections".

### Custom CSS Classes

If you want different CSS classes, you can:
1. Use CSS to style the default classes
2. Use JavaScript to add/modify classes after page load
3. Modify the `classic-editor-replacer.ts` file (advanced)

### Map Embed Preservation

The generator doesn't replace Google Maps embed code. Add your map embed in the template inside the MAP section, and it will be preserved.

## Technical Details

### Detection

Classic Editor is auto-detected by checking for `<!-- SEO_GEN_START:` markers in the page content.

### Processing

1. Fetches template page via WordPress REST API (context=edit to get raw HTML)
2. Parses HTML to find comment markers
3. Extracts content between START and END markers
4. Replaces extracted content with generated content
5. Returns updated HTML

### Meta Fields

Classic Editor doesn't use special meta fields like page builders. Everything is in the `post_content` field.

## Example: Client "Zen Windows Boston"

For the Zen Windows Boston client:

1. Create a template page in Classic Editor
2. Add HTML comment markers around each section
3. Set Template Page ID in the client settings
4. Set Page Builder to "classic-editor"
5. Generate sample page to verify
6. Batch generate pages

The system will automatically detect Classic Editor from the markers and process accordingly.
