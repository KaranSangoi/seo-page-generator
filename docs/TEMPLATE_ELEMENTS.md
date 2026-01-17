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
benefits-heading    → Section heading (H2) - Use Heading widget
benefits-subheading → Section subheading (4-5 words) - Can be Heading OR Text Editor widget [OPTIONAL]
benefits-bullets    → Icon List widget with 3 items (each ≥30 words, starts with <b>)
```

**Example Format:**

- Heading: "Why Choose [Company Name] as Your [Primary Keyword]?"
  - Example: "Why Choose ABC Glass as Your Professional Commercial Glass Installer in Sumner, WA?"
- Subheading: "Quality. Precision. Reliable." (can use Heading widget OR Text Editor widget)
- Icon List Items: `<b>Topic Name:</b> Description text...`

**Important Notes:**
- Use Elementor's **Icon List widget** for bullets (one widget with 3 items), NOT 3 separate text editors
- Subheading can be either a Heading widget or Text Editor widget - code handles both
- Each bullet must start with `<b>Topic Name:</b>`

---

## Why Section

### Element IDs Required:

```
why-heading    → Section heading (H2) - Use Heading widget
why-subheading → Section subheading (4-5 words) - Can be Heading OR Text Editor widget [OPTIONAL]
why-bullets    → Icon List widget with 3 items (each ≥30 words, starts with <b>)
```

**Example Format:**

- Heading: "Why Is [Service] Important in [Location]?" (NO adjective, just service name)
  - Example: "Why Is Commercial Glass Installation Important in Sumner, WA?"
- Subheading: "Protection. Appeal. Durability." (can use Heading widget OR Text Editor widget)
- Icon List Items: Focus on why the service is important (NOT about the company)

**Important Notes:**
- Use Elementor's **Icon List widget** for bullets (one widget with 3 items), NOT 3 separate text editors
- Subheading can be either a Heading widget or Text Editor widget - code handles both
- Bullets should explain WHY the service matters, not why to choose your company
- Each bullet must start with `<b>Topic Name:</b>`

---

## FAQ Section

### Optional FAQ Header Elements (NEW):

```
faq-heading     → FAQ section heading (e.g., "Frequently Asked Questions About [Service] in [Location]")
faq-description → Brief intro paragraph for FAQ section (20-30 words)
```

**Example in Elementor:**
- Add a Heading widget → Advanced → CSS ID → `faq-heading`
- Add a Text Editor widget → Advanced → CSS ID → `faq-description`

These elements are **optional** - if they exist in your template, the system will populate them with AI-generated content. If not present, they'll be skipped.

---

### Two Supported Structures for FAQ Items:

The system supports **TWO different FAQ template structures**. Choose the one that fits your design:

---

### Structure 1: All-in-One Toggle/Accordion (Simpler)

```
faq-questions → Toggle OR Accordion widget with 3 items (contains both questions AND answers)
```

**Required IDs:**
- `faq-questions` (must contain both "faq" AND "questions")

**Valid ID Examples:**
- ✅ `faq-questions` (recommended)
- ✅ `faq-questions-toggle`
- ✅ `questions-faq`
- ✅ `faq-accordion-questions`

**Invalid ID Examples:**
- ❌ `faqs` (missing "questions")
- ❌ `questions` (missing "faq")
- ❌ `faq-section` (missing "questions")

**Widget Types:**
- **Toggle Widget**: Single widget with 3 toggle items
- **Accordion Widget**: Single widget with 3 accordion items

**Structure:**
- Each item has:
  - **Tab Title** = Question
  - **Tab Content** = Answer

---

### Structure 2: Separate Answer Widgets (More Flexible)

```
faq-questions  → Toggle/Accordion widget with 3 question titles
faq-answer-1   → Text editor widget for answer 1
faq-answer-2   → Text editor widget for answer 2
faq-answer-3   → Text editor widget for answer 3
```

**Required IDs:**
- `faq-questions` (accordion/toggle with questions)
- `faq-answer-1`, `faq-answer-2`, `faq-answer-3` (text editor widgets)

**How it works:**
- Questions container displays clickable FAQ titles
- Each text editor widget shows the corresponding answer
- System updates both questions AND answers

**Use case:** When you want to style each answer independently or place them in different locations on the page.

---

### Content Format (Both Structures):

- Questions: "What services does a professional [service] in [location] provide?"
- Answers: 2-3 sentences (50-75 words), company name in 2nd half only

### Important Notes:
- **Enable FAQ Schema**: In accordion/toggle widget settings → Style tab → Turn ON "FAQ Schema" toggle
- This automatically adds proper FAQ schema markup for Google's People Also Ask boxes
- Questions should use the primary keyword naturally
- Answers should be SEO-relevant (not promotional)
- Company name should appear in 2nd half of each answer

**📖 Detailed Guide:** See [FAQ_TOGGLE_SETUP.md](FAQ_TOGGLE_SETUP.md) for complete setup instructions for both structures

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

### Core Elements (Required):

- [ ] `hero-h1` (Heading widget)
- [ ] `hero-description` (Text Editor widget)
- [ ] `benefits-heading` (Heading widget)
- [ ] `benefits-bullets` (Icon List widget with 3 items)
- [ ] `why-heading` (Heading widget)
- [ ] `why-bullets` (Icon List widget with 3 items)
- [ ] `faq-questions` (Toggle OR Accordion widget with 3 items + FAQ Schema enabled)
- [ ] **OR** `faq-questions` + `faq-answer-1`, `faq-answer-2`, `faq-answer-3` (Separate widget structure)

### Optional Elements (Skip if not needed):

- [ ] `benefits-subheading` (Heading OR Text Editor widget)
- [ ] `why-subheading` (Heading OR Text Editor widget)
- [ ] `faq-heading` (Heading widget - FAQ section title)
- [ ] `faq-description` (Text Editor widget - FAQ intro paragraph)
- [ ] `map-description` (Text Editor widget)
- [ ] `map-iframe` (HTML widget - only for broad strokes & nested broad strokes)

### Widget Type Reference:

- **Heading Widget** = For H1, H2 headings (and optionally subheadings)
- **Text Editor Widget** = For descriptions and optionally subheadings
- **Icon List Widget** = For bullet point lists (3 items per list)
- **Toggle Widget** = For FAQs (3 items, each with question+answer) - Most common
- **Accordion Widget** = For FAQs (3 items, each with question+answer) - Alternative to Toggle

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
