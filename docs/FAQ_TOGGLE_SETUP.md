# FAQ Component Setup

**Supports TWO structures: Toggle/Accordion widgets OR separate widgets**

---

## Quick Answer

### Structure 1: Toggle/Accordion Widget (All-in-One)
**CSS ID:** Must contain **both** `faq` **and** `questions`

**Recommended IDs:**
- ✅ `faq-questions`
- ✅ `faq-questions-toggle`
- ✅ `questions-faq`
- ✅ `faq-accordion-questions`

### Structure 2: Separate Widgets (Individual Answer Widgets)
**CSS IDs needed:**
- ✅ `faq-questions` - For the accordion/toggle with question titles
- ✅ `faq-answer-1` - Text editor widget for answer 1
- ✅ `faq-answer-2` - Text editor widget for answer 2
- ✅ `faq-answer-3` - Text editor widget for answer 3

**Both structures are fully supported!**

---

## How Toggle Components Work

### What is a Toggle Component?

In Elementor, the **Toggle** widget (and **Accordion** widget) is a single component where:
- Each toggle item has a **title** (the question)
- Each toggle item has **content** (the answer)
- Everything is stored in one `tabs` array

**Example Structure:**
```json
{
  "widgetType": "toggle",
  "settings": {
    "_element_id": "faq-questions",
    "tabs": [
      {
        "tab_title": "Question 1",
        "tab_content": "Answer 1"
      },
      {
        "tab_title": "Question 2",
        "tab_content": "Answer 2"
      },
      {
        "tab_title": "Question 3",
        "tab_content": "Answer 3"
      }
    ]
  }
}
```

---

## Step-by-Step Setup

### 1. Add Toggle Widget to Template

1. In Elementor editor, drag **Toggle** widget (or **Accordion**)
2. Add 3 toggle items (for 3 FAQs)
3. Leave titles and content as placeholders (will be replaced)

### 2. Set the CSS ID

1. Select the Toggle widget
2. Go to **Advanced** tab
3. Find **CSS ID** field
4. Enter: `faq-questions`

**Important:** The ID must contain **both** keywords:
- ✅ Must include: `faq`
- ✅ Must include: `questions`

### 3. Save Template

1. Save your template page in WordPress
2. Note the Page ID
3. Use this in your client configuration

---

## How Our Code Handles This

### Detection Logic

```typescript
// In elementor-replacer.ts line 139
if (cssId.includes('faq') && cssId.includes('questions')) {
  if (element.settings.tabs && Array.isArray(element.settings.tabs)) {
    // Updates each tab
  }
}
```

**What it does:**
1. Finds elements with ID containing `faq` AND `questions`
2. Looks for `tabs` array in settings
3. Updates each tab's `tab_title` (question) and `tab_content` (answer)

### Content Replacement

```typescript
element.settings.tabs.forEach((tab: any, index: number) => {
  if (generatedContent.faqs[index]) {
    tab.tab_title = generatedContent.faqs[index].question;
    tab.tab_content = generatedContent.faqs[index].answer;
  }
});
```

**Process:**
- FAQ 1 → `tabs[0]` → `tab_title` + `tab_content`
- FAQ 2 → `tabs[1]` → `tab_title` + `tab_content`
- FAQ 3 → `tabs[2]` → `tab_title` + `tab_content`

---

## Supported Template Structures

### ✅ Structure 1: Toggle/Accordion Widget (All Questions + Answers in One)

**Widget Types:**
1. **Toggle Widget**
   - Widget Type: `toggle`
   - Structure: `settings.tabs[]`
   - Each tab has: `tab_title` (question), `tab_content` (answer)

2. **Accordion Widget**
   - Widget Type: `accordion`
   - Structure: `settings.tabs[]`
   - Each tab has: `tab_title` (question), `tab_content` (answer)

**How to set up:**
- Single widget with ID containing "faq" AND "questions"
- Add 3 toggle/accordion items
- System updates both titles and content automatically

### ✅ Structure 2: Separate Widgets (Questions in Toggle, Answers Separate)

**Widget Setup:**
1. **Questions Container**: Accordion/toggle widget with ID `faq-questions`
   - Contains 3 items with question titles
   - Tab content can be placeholder or empty

2. **Answer Widgets**: 3 separate text editor widgets:
   - Widget 1: CSS ID `faq-answer-1`
   - Widget 2: CSS ID `faq-answer-2`
   - Widget 3: CSS ID `faq-answer-3`

**How it works:**
- Questions container displays the clickable FAQ titles
- Each separate text editor shows the corresponding answer content
- System updates questions in accordion AND answers in separate widgets

**Typical use case:** When you want to style each answer independently or place them in different sections of the page.

### ✅ Structure 3: Nested Accordion Widget (Elementor Pro)

**Widget Setup:**
- **Nested Accordion** widget with ID containing "faq" AND "questions"
- Each accordion item (`<details>` element) contains child widgets
- Questions are in **heading widgets** within each item
- Answers can be in text widgets or other content

**How it works:**
- System detects nested structure (child elements instead of tabs array)
- Searches for heading widgets within each accordion item
- Updates heading widget's `title` setting with FAQ question
- Files: `src/lib/elementor-replacer.ts:304-333`, `src/lib/simple-queue.ts:476-504`

**Example Structure:**
```
nested-accordion (id="faq-questions")
  ├─ accordion-item-1 (details element)
  │   ├─ heading widget → Question 1
  │   └─ text widget → Answer 1
  ├─ accordion-item-2 (details element)
  │   ├─ heading widget → Question 2
  │   └─ text widget → Answer 2
  └─ accordion-item-3 (details element)
      ├─ heading widget → Question 3
      └─ text widget → Answer 3
```

### ✅ Code Consolidation (v1.3.2)

**All FAQ logic now uses identical implementation:**
- Sample page generation (`sample-page/route.ts`)
- Real page batch generation (`simple-queue.ts`)
- Shared utilities (`elementor-replacer.ts`)

**Benefits:**
- ✅ Consistent behavior across all generation modes
- ✅ Bug fixes apply everywhere automatically
- ✅ No code duplication or drift

### ❌ Does NOT Work With:

- Custom FAQ builders (non-Elementor)
- FAQ widgets without proper IDs

---

## Common Scenarios

### Scenario 1: Single Toggle Widget

**Setup:**
- One toggle widget with 3 items
- CSS ID: `faq-questions`

**Result:** ✅ Works perfectly

### Scenario 2: Multiple Toggle Widgets

**Setup:**
- Multiple toggle widgets on page
- Only one has ID: `faq-questions`

**Result:** ✅ Works - only updates the one with correct ID

### Scenario 3: Wrong ID

**Setup:**
- Toggle widget with ID: `faqs` (missing "questions")
- Or ID: `questions` (missing "faq")

**Result:** ❌ Won't be detected - needs **both** keywords

---

## Troubleshooting

### FAQs Not Updating?

**Check 1: CSS ID**
- ✅ Contains "faq" AND "questions"
- ❌ Has only one keyword
- ❌ Has typo (e.g., "qestions")

**Check 2: Widget Type**
- ✅ Using Toggle or Accordion widget
- ❌ Using custom FAQ widget
- ❌ Using separate text widgets

**Check 3: Number of Items**
- ✅ Has at least 3 toggle items
- ❌ Has only 1-2 items (will only update those)

**Check 4: Structure**
- ✅ Widget has `settings.tabs` array
- ❌ Widget has different structure

### How to Verify

**Method 1: Sample Page**
1. Generate a sample page
2. Check if FAQs are populated
3. If not, inspect Elementor data

**Method 2: Check Template**
1. Export template via WordPress
2. Check JSON structure
3. Look for `tabs` array in FAQ widget

---

## Valid CSS ID Examples

### Simple IDs ✅
```
faq-questions
questions-faq
faq_questions
```

### Descriptive IDs ✅
```
faq-questions-toggle
faq-accordion-questions
faq-questions-section
service-faq-questions
```

### Invalid IDs ❌
```
faqs                    (missing "questions")
questions               (missing "faq")
faq-section            (missing "questions")
faq-q                  (incomplete "questions")
```

---

## Template Example

### Elementor Template Structure

```json
[
  {
    "elType": "section",
    "elements": [
      {
        "elType": "column",
        "elements": [
          {
            "id": "abc123",
            "elType": "widget",
            "widgetType": "toggle",
            "settings": {
              "_element_id": "faq-questions",
              "tabs": [
                {
                  "_id": "item1",
                  "tab_title": "Placeholder Question 1",
                  "tab_content": "Placeholder answer 1"
                },
                {
                  "_id": "item2",
                  "tab_title": "Placeholder Question 2",
                  "tab_content": "Placeholder answer 2"
                },
                {
                  "_id": "item3",
                  "tab_title": "Placeholder Question 3",
                  "tab_content": "Placeholder answer 3"
                }
              ]
            }
          }
        ]
      }
    ]
  }
]
```

**After Generation:**
```json
"tabs": [
  {
    "_id": "item1",
    "tab_title": "What services do you offer in Gilbert AZ?",
    "tab_content": "We offer professional roof repair services..."
  },
  {
    "_id": "item2",
    "tab_title": "How long does roof repair take?",
    "tab_content": "Most roof repairs are completed within..."
  },
  {
    "_id": "item3",
    "tab_title": "Do you provide free estimates?",
    "tab_content": "Yes, Company Name provides free estimates..."
  }
]
```

---

## Best Practices

### ✅ Do:
- Use clear, descriptive CSS IDs
- Include both "faq" and "questions" in ID
- Use Toggle or Accordion widget
- Have exactly 3 toggle items
- Test with sample page first

### ❌ Don't:
- Use generic IDs (like "widget1")
- Omit either keyword
- Use separate widgets per FAQ
- Change widget structure
- Use special characters in ID

---

## Related Documentation

- **[TEMPLATE_ELEMENTS.md](TEMPLATE_ELEMENTS.md)** - All CSS ID requirements
- **[ELEMENTOR_TEMPLATE_SETUP.md](ELEMENTOR_TEMPLATE_SETUP.md)** - Complete template setup
- **[SOP.md](SOP.md)** - FAQ content requirements

---

## Quick Checklist

When setting up FAQ section:

- [ ] Using Toggle or Accordion widget
- [ ] Widget has 3 items
- [ ] CSS ID contains "faq"
- [ ] CSS ID contains "questions"
- [ ] CSS ID is unique on page
- [ ] Template saved in WordPress
- [ ] Sample page tested

---

## Summary

**The toggle component is already supported!**

Just use a CSS ID that contains both `faq` and `questions`, such as:
- `faq-questions`
- `faq-questions-toggle`
- `questions-faq`

The system will automatically:
1. Detect the toggle/accordion widget
2. Update all 3 tab titles (questions)
3. Update all 3 tab contents (answers)
4. Insert internal links if needed

**No separate IDs needed** - it's all in one component! 🎉

---

**Last Updated:** 2025-10-18
**Compatibility:** Toggle widget, Accordion widget, Nested Accordion widget (Elementor Pro)
**Required Keywords:** `faq` + `questions`
**Code Consolidation:** v1.3.2 - All implementations now use identical FAQ logic
