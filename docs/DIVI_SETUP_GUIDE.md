!!# Divi Page Builder Setup Guide

## Overview

This guide explains how to set up template pages with Divi Builder for the SEO Page Generator.

**✅ Divi is now fully supported!** The system automatically detects whether your template uses Divi or Elementor and handles content replacement accordingly.

---

## Quick Setup Checklist

1. ✅ Create a template page in WordPress
2. ✅ Design the page using Divi Builder
3. ✅ Add custom Module IDs to each section
4. ✅ Note the template page ID
5. ✅ Configure in SEO Page Generator

---

## Step 1: Create Template Page

1. In WordPress admin, go to **Pages → Add New**
2. Give it a name like "Service Page Template" or "Location Page Template"
3. Click **Use Divi Builder**
4. Design your page layout

---

## Step 2: Design Your Template

Design your page with the following sections (you can customize the layout):

### Required Sections:

1. **Hero Section** (H1 + Description)
2. **Benefits Section** (Heading + Subheading + Bullet List)
3. **Why Choose Us Section** (Heading + Subheading + Bullet List)
4. **FAQ Section** (Accordion/Toggle modules)
5. **Map Section** (Embed/Code module for Google Maps)

---

## Step 3: Add Module IDs

**This is the MOST IMPORTANT step!** Each Divi module needs a custom Module ID so the system knows which content to replace.

### How to Add Module IDs in Divi:

1. Click on a module to edit it
2. Go to the **Advanced** tab
3. Scroll to **CSS ID & Classes**
4. In the **CSS ID** field, enter the ID (see list below)
5. Save the module

### Required Module IDs:

#### Hero Section

| Module Type | Module ID          | Content                                       |
| ----------- | ------------------ | --------------------------------------------- |
| Text Module | `hero-h1`          | Put an H1 tag: `<h1>Service in Location</h1>` |
| Text Module | `hero-description` | Put placeholder paragraph                     |

**Example:**

```
[et_pb_text module_id="hero-h1"]
<h1>Plumbing in Seattle</h1>
[/et_pb_text]

[et_pb_text module_id="hero-description"]
<p>Get professional plumbing services...</p>
[/et_pb_text]
```

#### Benefits Section (Single Text Module)

| Module Type | Module ID  | Content                                     |
| ----------- | ---------- | ------------------------------------------- |
| Text Module | `benefits` | Put heading + subheading + bullet list HTML |

**Important:** Unlike Elementor where you might have separate modules for each bullet, in Divi you use **ONE text module** containing:

- H2 heading
- Paragraph subheading
- UL with multiple LI items

**Example:**

```
[et_pb_text module_id="benefits"]
<h2>Benefits</h2>
<p>Why choose our services</p>
<ul>
  <li>Benefit 1</li>
  <li>Benefit 2</li>
  <li>Benefit 3</li>
</ul>
[/et_pb_text]
```

#### Why Section (Single Text Module)

| Module Type | Module ID | Content                                     |
| ----------- | --------- | ------------------------------------------- |
| Text Module | `why`     | Put heading + subheading + bullet list HTML |

**Example:**

```
[et_pb_text module_id="why"]
<h2>Why Choose Us</h2>
<p>What makes us different</p>
<ul>
  <li>Reason 1</li>
  <li>Reason 2</li>
  <li>Reason 3</li>
</ul>
[/et_pb_text]
```

#### FAQ Section (Accordion or Section with Toggles)

**Important:** Unlike individual FAQ items, you give **ONE ID to the entire FAQ component**.

| Module Type                                               | Module ID | Content                |
| --------------------------------------------------------- | --------- | ---------------------- |
| Accordion Module OR Section/Row/Column containing toggles | `faq`     | Contains all FAQ items |

**Two Options:**

**Option 1: Divi Accordion Module**

```
[et_pb_accordion module_id="faq"]
  [et_pb_accordion_item title="Question 1"]Answer 1[/et_pb_accordion_item]
  [et_pb_accordion_item title="Question 2"]Answer 2[/et_pb_accordion_item]
  [et_pb_accordion_item title="Question 3"]Answer 3[/et_pb_accordion_item]
[/et_pb_accordion]
```

**Option 2: Section/Row with Toggle Modules**

```
[et_pb_section module_id="faq"]
  [et_pb_row]
    [et_pb_column]
      [et_pb_toggle title="Question 1"]Answer 1[/et_pb_toggle]
      [et_pb_toggle title="Question 2"]Answer 2[/et_pb_toggle]
      [et_pb_toggle title="Question 3"]Answer 3[/et_pb_toggle]
    [/et_pb_column]
  [/et_pb_row]
[/et_pb_section]
```

**Key Point:** Add `module_id="faq"` to the **container** (accordion, section, row, or column), NOT to individual FAQ items. The system will replace ALL FAQ items inside automatically.

#### Map Section

| Module Type                  | Module ID | Content                |
| ---------------------------- | --------- | ---------------------- |
| Code Module (or Text Module) | `map`     | Put placeholder iframe |

**Example:**

```
[et_pb_code module_id="map"]
<iframe src="https://www.google.com/maps/embed?..." width="100%" height="450"></iframe>
[/et_pb_code]
```

---

## Step 4: Get Template Page ID

1. While editing your template page, look at the URL in your browser
2. It will look like: `wp-admin/post.php?post=123&action=edit`
3. The number after `post=` is your template page ID (e.g., `123`)
4. Write this down - you'll need it in the SEO Page Generator

---

## Step 5: Configure in SEO Page Generator

1. Log into SEO Page Generator
2. Go to **Clients** and add/edit a client
3. Enter the **Template Page ID** you noted in Step 4
4. The system will **auto-detect** that you're using Divi
5. Save and start generating pages!

---

## Key Differences from Elementor

### Divi Uses Shortcodes

- Elementor stores data as JSON in `meta._elementor_data`
- Divi stores data as shortcodes in `post_content`
- Example: `[et_pb_text module_id="hero"]Content[/et_pb_text]`

### Single Editor for Benefits/Why

- **Elementor:** Separate icon-list widgets for each bullet
- **Divi:** ONE text module containing heading + subheading + all bullets as HTML

### FAQ Modules

- **Elementor:** Uses accordion or tabs widgets
- **Divi:** Uses toggle modules with `module_id` attribute

---

## Troubleshooting

### "No Divi data found" Error

**Problem:** System can't detect Divi builder.

**Solutions:**

1. Make sure you clicked "Use Divi Builder" when creating the page
2. Check that the page has Divi shortcodes (starts with `[et_pb_section]`)
3. Verify the template page ID is correct

### Content Not Replacing

**Problem:** Generated content doesn't appear on published pages.

**Solutions:**

1. **Check Module IDs:** Most common issue! Make sure each module has the correct CSS ID
2. **Check ID spelling:** `module_id="hero-h1"` not `module-id` or `css_id`
3. **Use the Advanced tab:** Module IDs are in Advanced → CSS ID & Classes
4. **View page source:** Right-click published page → View Source, search for your Module IDs to verify they exist

### Benefits/Why Section Not Working

**Problem:** Bullets not showing up correctly.

**Solution:**

- Make sure you're using **ONE text module** with HTML structure:

```html
<h2>Heading</h2>
<p>Subheading</p>
<ul>
  <li>Bullet 1</li>
  <li>Bullet 2</li>
  <li>Bullet 3</li>
</ul>
```

- Don't use separate modules for each bullet
- Use the **Visual Builder** or **Text** tab to add HTML

### FAQ Not Replacing

**Problem:** FAQs are empty or not replacing.

**Solutions:**

1. Add `module_id="faq"` to the **container** (accordion module OR section/row/column containing toggles)
2. **Do NOT add IDs to individual FAQ items** - the system replaces all items inside automatically
3. Make sure you have placeholder FAQ items in your template
4. Use either:
   - Divi Accordion module with `module_id="faq"`, OR
   - Section/Row/Column with `module_id="faq"` containing toggle modules

---

## Module ID Reference (Copy-Paste Ready)

```
Hero Section:
- hero-h1
- hero-description

Benefits Section:
- benefits (single text module with heading + bullets)

Why Section:
- why (single text module with heading + bullets)

FAQ Section:
- faq (ONE ID for the entire accordion/section, NOT individual items)

Map Section:
- map
```

---

## Example Template Structure

```
[et_pb_section]
  [et_pb_row]
    [et_pb_column]
      [et_pb_text module_id="hero-h1"]
        <h1>Service in Location</h1>
      [/et_pb_text]
      [et_pb_text module_id="hero-description"]
        <p>Description here...</p>
      [/et_pb_text]
    [/et_pb_column]
  [/et_pb_row]
[/et_pb_section]

[et_pb_section]
  [et_pb_row]
    [et_pb_column]
      [et_pb_text module_id="benefits"]
        <h2>Benefits</h2>
        <p>Why choose us</p>
        <ul>
          <li>Benefit 1</li>
          <li>Benefit 2</li>
          <li>Benefit 3</li>
        </ul>
      [/et_pb_text]
    [/et_pb_column]
  [/et_pb_row]
[/et_pb_section]

[et_pb_section]
  [et_pb_row]
    [et_pb_column]
      [et_pb_text module_id="why"]
        <h2>Why Choose Us</h2>
        <p>What makes us different</p>
        <ul>
          <li>Reason 1</li>
          <li>Reason 2</li>
          <li>Reason 3</li>
        </ul>
      [/et_pb_text]
    [/et_pb_column]
  [/et_pb_row]
[/et_pb_section]

[et_pb_section module_id="faq"]
  [et_pb_row]
    [et_pb_column]
      [et_pb_toggle title="Question 1?"]
        Answer 1
      [/et_pb_toggle]
      [et_pb_toggle title="Question 2?"]
        Answer 2
      [/et_pb_toggle]
      [et_pb_toggle title="Question 3?"]
        Answer 3
      [/et_pb_toggle]
    [/et_pb_column]
  [/et_pb_row]
[/et_pb_section]

[et_pb_section]
  [et_pb_row]
    [et_pb_column]
      [et_pb_code module_id="map"]
        <iframe src="map-embed-url" width="100%" height="450"></iframe>
      [/et_pb_code]
    [/et_pb_column]
  [/et_pb_row]
[/et_pb_section]
```

---

## Testing Your Template

Before generating a batch:

1. **Use Sample Page Generator:** Generate one test page
2. **Verify IDs:** Check that all Module IDs are detected
3. **Check Replacement:** View the published page to ensure content was replaced
4. **Review Layout:** Make sure the design looks good
5. **Test Links:** Verify internal and external links work

---

## Need Help?

- Check the console logs for errors
- Verify Module IDs match exactly (case-sensitive)
- Make sure template page is published (or draft is okay)
- Ensure you have the correct template page ID
- View page source to debug shortcode structure

---

## What Gets Replaced Automatically

✅ **H1 Heading** (hero-h1)
✅ **Hero Description** (hero-description)
✅ **Benefits:** Heading, Subheading, All Bullets (benefits)
✅ **Why Choose Us:** Heading, Subheading, All Bullets (why)
✅ **All FAQs:** Questions and Answers (faq-1, faq-2, etc.)
✅ **Google Maps Iframe** (map)
✅ **Meta Title & Description** (via Yoast/RankMath)
✅ **Schema.org Structured Data** (automatic)
✅ **Internal & External Links** (automatic placement)

---

## Summary

**Divi is now fully supported alongside Elementor!** The system automatically detects which builder you're using and handles everything behind the scenes.

The key difference is:

- **Elementor:** Separate widgets for each element
- **Divi:** Single text modules with HTML for benefits/why sections

Just add the Module IDs and you're ready to generate pages! 🚀
