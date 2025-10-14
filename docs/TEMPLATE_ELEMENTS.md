# WordPress Template Element IDs Reference

This document lists all element IDs that must be present in your WordPress Elementor template for the SEO page generator to work correctly.

---

## Overview

The generator fetches your Elementor template, finds elements by their IDs, and replaces the content. Each section below shows the element ID needed in your template.

**Important:** If an ID doesn't exist in your template, it will be skipped (no error). If the AI-generated content omits a section for a specific page, those IDs will also be skipped.

---

## Meta Fields (SEO Plugin)

These are handled via WordPress REST API meta fields, not element IDs:

- **Meta Title** - Set via Yoast/RankMath API
- **Meta Description** - Set via Yoast/RankMath API (≤155 chars)

---

## Hero Section

### Element IDs Required:

```
hero-h1          → Main page heading (H1 tag)
hero-description → Hero description text (50-60 words)
```

**Example in Elementor:**

- Add a Heading widget → Advanced → CSS ID → `hero-h1`
- Add a Text Editor widget → Advanced → CSS ID → `hero-description`

---

## Benefits Section

### Element IDs Required:

```
benefits-heading    → Section heading (H2)
benefits-subheading → Section subheading (4-5 words) [OPTIONAL - skip if not in template]
benefits-bullets    → Icon List widget with 3 items (each ≥30 words, starts with <b>)
```

**Example Format:**

- Heading: "Why Choose [Company] as Your [Primary Keyword]?"
- Subheading: "Quality. Precision. Reliable."
- Icon List Items: `<b>Topic Name:</b> Description text...`

**Note:** Use Elementor's Icon List widget, not separate text editors. Add 3 items to the list.

---

## Why Section

### Element IDs Required:

```
why-heading    → Section heading (H2)
why-subheading → Section subheading (4-5 words) [OPTIONAL - skip if not in template]
why-bullets    → Icon List widget with 3 items (each ≥30 words, starts with <b>)
```

**Example Format:**

- Heading: "Why Hire a [Primary Keyword]?"
- Subheading: "Protection. Appeal. Durability."
- Icon List Items: Focus on why the service is important (NOT about company)

**Note:** Use Elementor's Icon List widget, not separate text editors. Add 3 items to the list.

---

## FAQ Section

### Element IDs Required:

```
faq-questions → Accordion widget with 3 items (the 3 questions)
faq-answer-1  → First answer (separate text editor)
faq-answer-2  → Second answer (separate text editor)
faq-answer-3  → Third answer (separate text editor)
```

**Example Format:**

- Questions: Added as items in the Accordion widget
- Answers: "What services does a professional [service] in [location] provide?" → 2-3 sentences, company name in 2nd half only

**Note:** Use Elementor's Accordion widget for questions. Answers are separate text editor widgets.

---

## Map Section (Optional - Can be Omitted)

### Element IDs Required:

```
map-description → Description text (50-60 words)
map-iframe      → HTML widget with Google Maps embed (for broad strokes & nested broad strokes only)
```

**Example Format:**

- Description: Describes service area and coverage
- Map Iframe: Google Maps embed code in HTML widget

**Example iframe HTML:**

```html
<iframe
  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d23331.63325329007!2d-83.53874848126766!3d43.031875102823136!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88247e88705352bd%3A0x5e10a31704cb5080!2sDavison%2C%20MI%2048423%2C%20USA!5e0!3m2!1sen!2sin!4v1757453454255!5m2!1sen!2sin"
  width="100%"
  height="450"
  style="border:0;"
  allowfullscreen=""
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  >Dumpster Rental in Davison, MI, Dumpster Rental near me, Dumpster
  Rental</iframe
>
```

**Note:** The map iframe is only used for broad strokes and nested broad strokes page types.

---

## Link Placement

Links are inserted dynamically into existing content. The generator will:

### Internal Link (Company Homepage):

- **Location:** Rotates between sections based on batch position
- **Positions:** hero-description, faq-answer-1, faq-answer-2, faq-answer-3, map-description
- **Format:** `<a href="[homepage]" style="text-decoration: underline; display: inline;">[Company Name]</a>`

### External Link (City Website):

- **Location:** Rotates between icon list items
- **Positions:** benefits-bullets (items 1-3), why-bullets (items 1-3)
- **Format:** `<a href="[city-url]" target="_blank" style="text-decoration: underline; display: inline;">[Location]</a>`
- **Note:** Links are inserted into individual items within the icon list widgets

---

## Complete Element ID Checklist

Use this checklist to ensure your Elementor template has all required IDs:

### Core Elements (Recommended):

- [ ] `hero-h1`
- [ ] `hero-description`
- [ ] `benefits-heading`
- [ ] `benefits-bullets` (Icon List with 3 items)
- [ ] `why-heading`
- [ ] `why-bullets` (Icon List with 3 items)
- [ ] `faq-questions` (Accordion with 3 items)
- [ ] `faq-answer-1`
- [ ] `faq-answer-2`
- [ ] `faq-answer-3`

### Optional Elements (Skip if not in template or not in content):

- [ ] `benefits-subheading`
- [ ] `why-subheading`
- [ ] `map-description`
- [ ] `map-iframe` (HTML widget - only for broad strokes & nested broad strokes)

---

## How to Set Element IDs in Elementor

1. **Edit your template page in Elementor**
2. **Click on the widget** you want to add an ID to
3. **Go to Advanced tab** (in left sidebar)
4. **Scroll to CSS ID field**
5. **Enter the ID** (without the `#` symbol)
   - Example: Enter `hero-h1`, NOT `#hero-h1`
6. **Save the template**

---

## Template Best Practices

1. **Use placeholder text** in your template that shows what type of content goes there

   - Example for `hero-h1`: "Service in Location | Company Name"

2. **Keep the structure consistent** - don't change widget types between pages

3. **Test with API first** - Use WordPress REST API to verify you can fetch the template

4. **Add CSS classes** for styling (in addition to IDs)

---

## Example Elementor Template Structure

```
┌─────────────────────────────────────┐
│ HERO SECTION                        │
│ ┌─────────────────────────────────┐ │
│ │ Heading Widget                  │ │
│ │ CSS ID: hero-h1                 │ │
│ │ Content: "Service in Location"  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Text Editor Widget              │ │
│ │ CSS ID: hero-description        │ │
│ │ Content: "50-60 word desc..."   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ BENEFITS SECTION                    │
│ ┌─────────────────────────────────┐ │
│ │ Heading Widget (H2)             │ │
│ │ CSS ID: benefits-heading        │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Text Editor                     │ │
│ │ CSS ID: benefits-subheading     │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Icon List Widget                │ │
│ │ CSS ID: benefits-bullets        │ │
│ │ Items:                          │ │
│ │   1. "<b>Topic:</b> Text..."    │ │
│ │   2. "<b>Topic:</b> Text..."    │ │
│ │   3. "<b>Topic:</b> Text..."    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

... (repeat for Why, FAQ, Map sections)
```

---

## Database Reference

The template page ID you enter in the client form should be the WordPress page ID of your template. The generator will:

1. Fetch this template via WordPress REST API
2. Parse the Elementor JSON data
3. Find widgets by element IDs
4. Replace content in those widgets
5. Create a new page with the updated content

---

## Troubleshooting

**Issue:** "Element ID not found in template"

- **Solution:** Check that the CSS ID is set correctly in Elementor (no `#` symbol)

**Issue:** "Content not updating"

- **Solution:** Make sure the widget type supports text content (use Text Editor widgets)

**Issue:** "Template not loading"

- **Solution:** Verify the template page ID is correct and the page exists

---

## Next Steps

1. Create your Elementor template page
2. Add all required element IDs (use checklist above)
3. Add placeholder content to see the structure
4. Note the page ID (from URL: `post.php?post=123&action=edit`)
5. Enter the page ID when adding a client
6. Test the connection to verify it works

---

**Need Help?** Check that all element IDs match exactly (case-sensitive).
