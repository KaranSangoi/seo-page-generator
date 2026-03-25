# SEO Page Generator - Setup Guide

## Welcome!

This guide will walk you through setting up your WordPress website to work with the SEO Page Generator. Whether you're using **Elementor**, **Divi**, **WPBakery**, **Avada (Fusion Builder)**, or **Classic Editor**, we've got you covered with simple, step-by-step instructions.

---

## What You'll Accomplish

By the end of this guide, you'll have:

- A WordPress site properly configured for the generator
- A client profile created in the system
- A template page ready for automatic content generation
- Everything tested and working smoothly

---

## Before You Start

Make sure you have:

- **Access to your WordPress admin dashboard** (the backend of your website)
- **A supported page builder** installed and active (Elementor, Divi, WPBakery, Avada Fusion Builder, or Classic Editor)
- **Your login credentials** for WordPress
- **About 30-45 minutes** to complete the setup

---

# Part 1: WordPress Site Setup

## Step 1: Enable WordPress REST API Access

The generator needs to communicate with your WordPress site. Here's how to set that up:

### 1.1 Create an Application Password

1. **Log into your WordPress dashboard**
2. **Go to:** Users > Profile
3. **Scroll down** to the "Application Passwords" section (It might be disabled by Wordfence, you can enable it by clicking the button given there)
4. **Type a name** for this password (e.g., "SEO Page Generator")
5. **Click "Add New Application Password"**
6. **Copy the password** that appears (you'll only see it once!)
7. **Save it somewhere safe** - you'll need this in Step 2

> **What's an Application Password?** It's a special password that lets the generator safely connect to your WordPress site without using your main login password.

---

## Step 2: Install Required WordPress Plugins

### Required:

- **Yoast SEO** (recommended) or **Rank Math** - these plugins help search engines understand your pages better

### For your page builder:

- Make sure your page builder (**Elementor**, **Divi**, **WPBakery**, or **Avada**) is installed and active
- Classic Editor users: no additional builder plugin needed

---

# Part 2: Creating Your Client Profile

## Step 3: Add a New Client

1. **Open the SEO Page Generator** in your browser and login or signup
2. **Click "Add Client"** button
3. **Fill in the form:**

   **Client Name** - Enter your company name exactly as you want it to appear (e.g., "Blue Sky Plumbing")

   **WordPress & Site URL** - Your website address including `https://` (e.g., `https://www.blueskyplumbing.com`)

   **WordPress Username** - Your WordPress admin username

   **WordPress Password** - Paste the **Application Password** you created in Step 1 (NOT your regular WordPress password!)

   **Template Page ID** - Leave this blank for now - we'll fill it in Step 5

4. **Click "Test Connection"** button
   - Wait for the system to verify your WordPress credentials
   - You should see a success message with your detected page builder
   - If it fails, double-check your URL, username, and Application Password

5. **Click "Save Client"** after the connection test passes

> **Tip:** Double-check your website URL doesn't have a trailing slash (/) at the end.

---

# Part 3: Creating Your Template Page

This is the master page that the generator will use as a blueprint for all your new pages. Follow the instructions for YOUR page builder below.

---

## For Elementor Users

### Step 4: Build Your Elementor Template

1. **In WordPress, go to:** Pages > Edit your existing template page or Add New
2. **Click "Edit with Elementor"**
3. **Design your page layout** with these sections, adding CSS IDs to each widget:

#### Required CSS IDs

| Section | What Goes Here | CSS ID | Widget Type |
|---------|---------------|--------|-------------|
| **Hero Title** | Main H1 headline | `hero-h1` | Heading |
| **Hero Description** | Introductory paragraph | `hero-description` | Text Editor |
| **Benefits Heading** | Benefits section title | `benefits-heading` | Heading |
| **Benefits Subheading** | Short tagline (e.g., "Quality. Precision. Reliable.") | `benefits-subheading` | Heading or Text Editor |
| **Benefits Bullets** | List of benefit points | `benefits-bullets` | Icon List |
| **Why Heading** | Why section title | `why-heading` | Heading |
| **Why Subheading** | Short tagline | `why-subheading` | Heading or Text Editor |
| **Why Bullets** | List of reasons | `why-bullets` | Icon List |
| **FAQ Questions** | Questions and answers | `faq-questions` | Accordion, Toggle, or Nested Accordion |
| **Map Description** | Location description text | `map-description` | Text Editor |
| **Map Iframe** | Embedded Google Map | `map-iframe` | HTML widget |

#### Optional CSS IDs

| Section | What Goes Here | CSS ID | Widget Type |
|---------|---------------|--------|-------------|
| **FAQ Heading** | FAQ section title | `faq-heading` | Heading |
| **FAQ Description** | FAQ intro paragraph | `faq-description` | Text Editor |
| **FAQ Answers** (if separate) | Individual answers | `faq-answer-1`, `faq-answer-2`, `faq-answer-3` | Text Editor |

#### How to Add CSS IDs in Elementor:

1. Click the widget to select it
2. Click the **Advanced** tab in the left panel
3. In the **CSS ID** field, type the ID (e.g., `hero-h1`)
4. Save

#### Important Notes:

- Bullet points **must use the Icon List widget** (not separate Text Editors)
- The FAQ widget supports: Accordion, Toggle, ElementsKit Accordion, Plumbit Accordion, and Nested Accordion
- CSS IDs use partial matching - `my-hero-h1-section` will work because it contains `h1`

---

## For Divi Users

### Step 4: Build Your Divi Template

1. **In WordPress, go to:** Pages > Edit your existing template page or Add New
2. **Click "Use Divi Builder"**
3. **Build your page** with these sections, adding Module IDs:

#### Required Module IDs

| Section | What Goes Here | Module ID | Module Type |
|---------|---------------|-----------|-------------|
| **Hero Title** | Main H1 headline | `hero-h1` | Heading or Text |
| **Hero Description** | Introductory paragraph | `hero-description` | Text |
| **Benefits** | Heading + subheading + bullet points (all in one module) | `benefits` | Text |
| **Why Choose Us** | Heading + subheading + bullet points (all in one module) | `why` | Text |
| **FAQ** | Questions and answers | `faq` | Accordion or Toggle |
| **Map** | Embedded Google Map | `map` | Code or Text |

#### Optional Module IDs

| Section | What Goes Here | Module ID |
|---------|---------------|-----------|
| **FAQ Heading** | FAQ section title | `faq-heading` |
| **FAQ Description** | FAQ intro paragraph | `faq-description` |

#### How to Add Module IDs in Divi:

1. Click the module to edit it
2. Click the **Advanced** tab
3. Click **CSS ID & Classes**
4. In the **CSS ID** field, type the Module ID (e.g., `hero-h1`)
5. Save the module

#### Important Notes:

- Benefits and Why sections use a **single Text module** containing ALL content (heading, subheading, and bullets as HTML)
- The generator replaces the entire module content with: `<h2>heading</h2> <h3>subheading</h3> <ul><li>bullets</li></ul>`
- FAQ uses `[et_pb_accordion_item title="Question"]Answer[/et_pb_accordion_item]` structure
- Module IDs must be exact matches (unlike Elementor's partial matching)

---

## For WPBakery Users

### Step 4: Build Your WPBakery Template

1. **In WordPress, go to:** Pages > Edit your existing template page or Add New
2. **Click "Backend Editor" or "Frontend Editor"**
3. **Build your page** with these sections, adding CSS Classes or IDs:

#### Required CSS Classes / IDs

| Section | What Goes Here | Class or ID | Element Type |
|---------|---------------|-------------|--------------|
| **Hero Title** | Main H1 headline | `hero` | Custom Heading or Woodmart Title |
| **Hero Description** | Introductory paragraph | `hero` | Column Text (without `<h1>` inside) |
| **Benefits** | Heading + subheading + bullets | `benefits` | Column Text |
| **Benefits Bullets** (if using Woodmart) | Bullet list | `benefits-bullets` | Woodmart List |
| **Why Choose Us** | Heading + subheading + bullets | `why` | Column Text |
| **Why Bullets** (if using Woodmart) | Bullet list | `why-bullets` | Woodmart List |
| **FAQ** | Questions and answers | `faqs` | Toggle elements |
| **Map** | Embedded Google Map | `map` | Raw HTML or Column Text |

#### How to Add Classes/IDs in WPBakery:

**For standard WPBakery elements:**
1. Click the pencil icon to edit the element
2. Look for **"Extra class name"** (el_class) field
3. Type the class name (e.g., `hero`)

**For element ID:**
1. Edit the element
2. Look for **"Element ID"** field
3. Type the ID (e.g., `hero`)

#### Important Notes:

- Both the Hero Title and Hero Description use `hero` as the identifier - the system differentiates them by element type
- Benefits and Why sections use a **single text module** with HTML structure (same as Divi)
- If using Woodmart theme, the system also supports `woodmart_title`, `woodmart_list`, and `woodmart_accordion_item` elements
- FAQ note: use `faqs` (with an 's'), not `faq`

---

## For Avada / Fusion Builder Users

### Step 4: Build Your Fusion Builder Template

1. **In WordPress, go to:** Pages > Edit your existing template page or Add New
2. **Edit with Avada Builder**
3. **Build your page** with these sections, adding IDs to each element:

#### Required Element IDs

| Section | What Goes Here | ID | Element Type |
|---------|---------------|-----|--------------|
| **Hero Title** | Main H1 headline | `hero-h1` | Fusion Title (`[fusion_title]`) |
| **Hero Description** | Introductory paragraph | `hero-description` | Fusion Text (`[fusion_text]`) |
| **Benefits Heading** | Benefits section title | `benefits-heading` | Fusion Title |
| **Benefits Subheading** | Short tagline | `benefits-subheading` | Fusion Title |
| **Benefits Bullets** | List of benefit points | `benefits-bullets` | Fusion Text |
| **Why Heading** | Why section title | `why-heading` | Fusion Title |
| **Why Subheading** | Short tagline | `why-subheading` | Fusion Title |
| **Why Bullets** | List of reasons | `why-bullets` | Fusion Text |
| **FAQ Questions** | Questions and answers | `faq-questions` | Fusion Accordion (`[fusion_accordion]` with `[fusion_toggle]` items) |
| **Map Description** | Location description | `map-description` | Fusion Text |
| **Map Iframe** | Embedded Google Map | *(in a Fusion Code block)* | Fusion Code (`[fusion_code]`) - content is base64-encoded |

#### Optional Element IDs

| Section | What Goes Here | ID |
|---------|---------------|----|
| **FAQ Heading** | FAQ section title | `faq-heading` |
| **FAQ Description** | FAQ intro paragraph | `faq-description` |

#### How to Add IDs in Fusion Builder:

1. Click the element to edit it
2. Go to the **General** tab
3. Find the **ID** field
4. Type the ID (e.g., `hero-h1`)
5. Save

#### Important Notes:

- Fusion Title elements preserve your heading level (h1, h2, h3) - only the text inside is replaced
- Fusion Text elements have their inner HTML fully replaced
- The map iframe **must be in a Fusion Code block** - Avada stores it as base64-encoded content. The system auto-detects which Code block contains the map iframe
- IDs must be exact matches (e.g., `hero-h1` not `my-hero-h1`)

---

## For Classic Editor Users

### Step 4: Build Your Classic Editor Template

1. **In WordPress, go to:** Pages > Edit your existing template page or Add New
2. **Switch to "Text" mode** (not "Visual") in the editor
3. **Add HTML comment markers** around each section:

#### Required Markers

```html
<!-- SEO_GEN_START:HERO -->
<h1>Your Service in Your Location</h1>
<p>Your introductory paragraph here.</p>
<!-- SEO_GEN_END:HERO -->

<!-- SEO_GEN_START:BENEFITS -->
<h2>Benefits heading</h2>
<p>Subheading text</p>
<ul>
  <li>Benefit 1</li>
  <li>Benefit 2</li>
  <li>Benefit 3</li>
</ul>
<!-- SEO_GEN_END:BENEFITS -->

<!-- SEO_GEN_START:WHY -->
<h2>Why choose us heading</h2>
<p>Subheading text</p>
<ul>
  <li>Reason 1</li>
  <li>Reason 2</li>
  <li>Reason 3</li>
</ul>
<!-- SEO_GEN_END:WHY -->

<!-- SEO_GEN_START:FAQ -->
<h3>Question 1?</h3>
<p>Answer 1</p>
<h3>Question 2?</h3>
<p>Answer 2</p>
<h3>Question 3?</h3>
<p>Answer 3</p>
<!-- SEO_GEN_END:FAQ -->

<!-- SEO_GEN_START:MAP -->
<h2>Service Area</h2>
<p>Map description here.</p>
<iframe src="https://www.google.com/maps/embed?..." width="100%" height="450"></iframe>
<!-- SEO_GEN_END:MAP -->
```

#### Important Notes:

- Markers must be written in **Text/HTML mode**, not Visual mode
- The marker format is exact: `<!-- SEO_GEN_START:SECTION_NAME -->` and `<!-- SEO_GEN_END:SECTION_NAME -->`
- Section names are uppercase: `HERO`, `BENEFITS`, `WHY`, `FAQ`, `MAP`
- Everything between the START and END markers gets replaced
- You can style the HTML with CSS classes - the generated content uses semantic classes like `hero-section`, `benefits-list`, `faq-item`, etc.

---

## Step 5: Find Your Template Page ID

After publishing your template page:

1. **Go to:** Pages > All Pages
2. **Find your template page** in the list
3. **Hover over** the page title
4. **Look at the bottom of your browser** - you'll see a URL like:
   ```
   post.php?post=123&action=edit
   ```
5. **The number after "post="** is your Page ID (e.g., `123`)
6. **Write this number down**

---

## Step 6: Add Template Page ID to Your Client

1. **Go back to the SEO Page Generator**
2. **Click "Edit"** on your client
3. **Enter the Template Page ID** you found in Step 5
4. **Click "Save Client"**

---

# Part 4: Testing Your Setup

## Step 7: Generate a Sample Page

Let's make sure everything works!

1. **Go to your client's page** in the generator
2. **Click the "Generate Pages" tab**
3. **Click "Generate Sample Page"** button
4. **Wait** for the sample page to be created
5. **Click the link** to view your sample page on the live site

---

## Step 8: Review in WordPress

1. **Open the sample page** on your WordPress site
2. **Check the following:**
   - Page looks styled correctly (fonts, colors, spacing)
   - All content sections were replaced with sample text
   - FAQ accordion/toggles work properly
   - Map loads correctly
   - Page displays well on mobile

If everything looks good, you're ready to generate real pages!

---

# Part 5: Publishing Real Pages

## Step 9: Understanding the Two Modes

### Mode 1: Generate Sample Page (Quick Testing)

**Best For:** Testing and previewing your template setup

**How it works:**
1. Click **"Generate Sample Page"**
2. System creates a page with placeholder content using your template
3. Review the page on your WordPress site
4. Delete when done testing

---

### Mode 2: Batch Generation (Bulk Pages)

**Best For:** Creating many pages at once for multiple locations

**How it works:**
1. Click **"Generate Pages"** tab
2. Download the sample CSV and fill in your locations/services
3. Upload the CSV file
4. Select **"Preview & Publish"** mode (recommended) or **"Generate Directly"**
5. System generates AI content for all pages
6. Review each page in the preview modal
7. Make any edits or regenerate sections as needed
8. Click **"Publish"** on individual pages when ready
9. Pages go live on your WordPress site

**When to use:**
- Creating pages for multiple locations (e.g., 50 cities)
- When you want to review content before publishing
- For large-scale SEO campaigns

---

# You're All Set!

Congratulations! Your setup is complete. You can now:

- **Generate sample pages** for testing
- **Upload a CSV file** to create multiple pages at once
- **Review and edit** generated content before publishing
- **Publish directly** to your WordPress site

---

# Need Help?

### Common Issues & Solutions

**Issue: "Failed to connect to WordPress"**
- Check your website URL is correct
- Make sure you used the Application Password (not regular password)
- Verify your WordPress username is correct

**Issue: "Template page not found"**
- Verify the Page ID is correct
- Make sure the template page is published (not draft)
- Check the page wasn't deleted

**Issue: "Content not updating in sections"**
- Verify all CSS IDs / Module IDs are typed exactly right (no extra spaces)
- Make sure IDs are in the correct field:
  - **Elementor:** Advanced > CSS ID
  - **Divi:** Advanced > CSS ID & Classes > CSS ID
  - **WPBakery:** Extra class name (el_class) or Element ID
  - **Avada:** Element > ID field
  - **Classic Editor:** HTML comment markers in Text mode
- Republish your template page after making changes

**Issue: "Page builder not detected"**
- Make sure your page builder is installed and active
- Verify the template page was built using the page builder (not a different editor)
- Check that you clicked "Edit with Elementor" / "Use Divi Builder" / etc.
- For Classic Editor: ensure `<!-- SEO_GEN_START:` markers exist in the page

---

# Quick Reference: CSS IDs by Builder

### Elementor

```
hero-h1                 (Heading widget)
hero-description        (Text Editor widget)
benefits-heading        (Heading widget)
benefits-subheading     (Heading or Text Editor)
benefits-bullets        (Icon List widget)
why-heading             (Heading widget)
why-subheading          (Heading or Text Editor)
why-bullets             (Icon List widget)
faq-heading             (optional - Heading)
faq-description         (optional - Text Editor)
faq-questions           (Accordion / Toggle / Nested Accordion)
faq-answer-1, -2, -3   (optional - if answers are separate widgets)
map-description         (Text Editor)
map-iframe              (HTML widget)
```

### Divi

```
hero-h1                 (Heading or Text module)
hero-description        (Text module)
benefits                (single Text module with H2 + H3 + UL)
why                     (single Text module with H2 + H3 + UL)
faq-heading             (optional - Heading/Text)
faq-description         (optional - Text)
faq                     (Accordion or Toggle module)
map                     (Code or Text module)
```

### WPBakery

```
hero                    (Custom Heading for title, Column Text for description)
benefits                (Column Text with H2 + H3 + UL)
benefits-bullets        (optional - Woodmart List widget)
why                     (Column Text with H2 + H3 + UL)
why-bullets             (optional - Woodmart List widget)
faqs                    (Toggle elements - note the 's')
map                     (Raw HTML or Column Text)
```

### Avada / Fusion Builder

```
hero-h1                 (Fusion Title)
hero-description        (Fusion Text)
benefits-heading        (Fusion Title)
benefits-subheading     (Fusion Title)
benefits-bullets        (Fusion Text)
why-heading             (Fusion Title)
why-subheading          (Fusion Title)
why-bullets             (Fusion Text)
faq-heading             (optional - Fusion Title)
faq-description         (optional - Fusion Text)
faq-questions           (Fusion Accordion with Toggle items)
map-description         (Fusion Text)
[map iframe]            (Fusion Code block - auto-detected)
```

### Classic Editor

```
<!-- SEO_GEN_START:HERO -->     ... <!-- SEO_GEN_END:HERO -->
<!-- SEO_GEN_START:BENEFITS --> ... <!-- SEO_GEN_END:BENEFITS -->
<!-- SEO_GEN_START:WHY -->      ... <!-- SEO_GEN_END:WHY -->
<!-- SEO_GEN_START:FAQ -->      ... <!-- SEO_GEN_END:FAQ -->
<!-- SEO_GEN_START:MAP -->      ... <!-- SEO_GEN_END:MAP -->
```

---

**Last Updated:** 26 March 2026
**Version:** 3.0
