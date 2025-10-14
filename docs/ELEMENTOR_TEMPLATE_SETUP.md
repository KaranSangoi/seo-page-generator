# Elementor Template Setup Guide

This guide explains how to set up your Elementor template page so that the SEO Page Generator can properly populate it with generated content.

## Overview

The generator maps generated content to your Elementor template by matching **CSS IDs** (Element IDs) on widgets. You need to add specific CSS IDs to each widget in your template.

## Required CSS IDs

### 1. Hero Section

**H1 Heading Widget:**
- CSS ID: `hero-h1` or `h1`
- Content will be replaced with: `generatedContent.h1`

**Hero Description (Text Editor Widget):**
- CSS ID: `hero-description` or `hero`
- Content will be replaced with: `generatedContent.heroDescription`

### 2. Benefits Section (Optional - based on CSV)

**Benefits Heading (Heading Widget):**
- CSS ID: `benefits-heading`
- Content will be replaced with: `generatedContent.benefitsHeading`

**Benefits Subheading (Text Editor Widget):**
- CSS ID: `benefits-subheading`
- Content will be replaced with: `generatedContent.benefitsSubheading`

**Benefit Bullets (Text Editor Widgets):**
- CSS ID: `benefits-bullet-1`
- CSS ID: `benefits-bullet-2`
- CSS ID: `benefits-bullet-3`
- Content will be replaced with: `generatedContent.benefitsBullets[0]`, `[1]`, `[2]`

### 3. Why Section (Optional - based on CSV)

**Why Heading (Heading Widget):**
- CSS ID: `why-heading`
- Content will be replaced with: `generatedContent.whyHeading`

**Why Subheading (Text Editor Widget):**
- CSS ID: `why-subheading`
- Content will be replaced with: `generatedContent.whySubheading`

**Why Bullets (Text Editor Widgets):**
- CSS ID: `why-bullet-1`
- CSS ID: `why-bullet-2`
- CSS ID: `why-bullet-3`
- Content will be replaced with: `generatedContent.whyBullets[0]`, `[1]`, `[2]`

### 4. FAQ Section (Optional - based on CSV)

**FAQ Question 1 (Heading Widget):**
- CSS ID: `faq-1-question`
- Content will be replaced with: `generatedContent.faqs[0].question`

**FAQ Answer 1 (Text Editor Widget):**
- CSS ID: `faq-1-answer`
- Content will be replaced with: `generatedContent.faqs[0].answer`

**FAQ Question 2 (Heading Widget):**
- CSS ID: `faq-2-question`

**FAQ Answer 2 (Text Editor Widget):**
- CSS ID: `faq-2-answer`

**FAQ Question 3 (Heading Widget):**
- CSS ID: `faq-3-question`

**FAQ Answer 3 (Text Editor Widget):**
- CSS ID: `faq-3-answer`

### 5. Map Section (Optional - based on CSV)

**Map Description (Text Editor Widget):**
- CSS ID: `map-description` or `map`
- Content will be replaced with: `generatedContent.mapDescription`

## How to Set CSS IDs in Elementor

1. Click on the widget in Elementor editor
2. Go to the **Advanced** tab
3. Find the **CSS ID** field (under "Advanced" section)
4. Enter the appropriate CSS ID from the list above
5. Click **Update** to save

## Template Page ID

After creating your template:

1. Edit the template page in WordPress
2. Look at the URL: `...wp-admin/post.php?post=123&action=edit`
3. The number (e.g., `123`) is your Template Page ID
4. Enter this ID when creating a client in the dashboard

## Example Template Structure

```
Section: Hero
├── Heading Widget (CSS ID: hero-h1)
└── Text Editor Widget (CSS ID: hero-description)

Section: Benefits
├── Heading Widget (CSS ID: benefits-heading)
├── Text Editor Widget (CSS ID: benefits-subheading)
├── Text Editor Widget (CSS ID: benefits-bullet-1)
├── Text Editor Widget (CSS ID: benefits-bullet-2)
└── Text Editor Widget (CSS ID: benefits-bullet-3)

Section: Why Choose Us
├── Heading Widget (CSS ID: why-heading)
├── Text Editor Widget (CSS ID: why-subheading)
├── Text Editor Widget (CSS ID: why-bullet-1)
├── Text Editor Widget (CSS ID: why-bullet-2)
└── Text Editor Widget (CSS ID: why-bullet-3)

Section: FAQs
├── Heading Widget (CSS ID: faq-1-question)
├── Text Editor Widget (CSS ID: faq-1-answer)
├── Heading Widget (CSS ID: faq-2-question)
├── Text Editor Widget (CSS ID: faq-2-answer)
├── Heading Widget (CSS ID: faq-3-question)
└── Text Editor Widget (CSS ID: faq-3-answer)

Section: Map
└── Text Editor Widget (CSS ID: map-description)
```

## Important Notes

1. **CSS IDs are case-sensitive** - use lowercase with hyphens
2. **Partial matching** - The system checks if the CSS ID *includes* the keyword (e.g., `hero-main-h1` will match because it includes `h1`)
3. **Widget Types** - Make sure you use the correct widget type (Heading for headings, Text Editor for text)
4. **Optional Sections** - Sections can be omitted via CSV `Omit Sections` column
5. **Template reuse** - The same template is used for all generated pages, with content replaced dynamically

## Troubleshooting

**Pages are created but content is not populated:**
- Check that CSS IDs are set correctly in Elementor
- Verify Template Page ID is correct in client settings
- Check browser console or server logs for errors

**Some sections are empty:**
- Ensure CSS IDs match exactly (including hyphens and numbers)
- Verify widget types (Heading vs Text Editor)
- Check that the section wasn't omitted in the CSV

**Template not found error:**
- Verify Template Page ID is correct
- Ensure the template page exists and is published
- Check WordPress API permissions

## Testing Your Template

1. Create a test client with your Template Page ID
2. Upload a CSV with 1 page
3. Generate the page
4. Edit the generated page in Elementor to verify content was populated correctly
5. Adjust CSS IDs if needed and regenerate

## Meta Fields Set

The generator also sets these WordPress meta fields:

- **SEO Plugin** (Yoast or RankMath): Title, Description, Focus Keyword
- **Elementor**: `_elementor_data`, `_elementor_edit_mode`, `_elementor_template_type`, `_elementor_version`
- **Template**: `_wp_page_template` (set to `elementor_canvas`)
