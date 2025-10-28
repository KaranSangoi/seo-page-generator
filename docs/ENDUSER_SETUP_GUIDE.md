# 📘 SEO Page Generator - Setup Guide

## Welcome! 👋

This guide will walk you through setting up your WordPress website to work with the SEO Page Generator. Whether you're using **Divi** or **Elementor** as your page builder, we've got you covered with simple, step-by-step instructions.

---

## 🎯 What You'll Accomplish

By the end of this guide, you'll have:

- ✅ A WordPress site properly configured for the generator
- ✅ A client profile created in the system
- ✅ A template page ready for automatic content generation
- ✅ Everything tested and working smoothly

---

## 📋 Before You Start

Make sure you have:

- **Access to your WordPress admin dashboard** (the backend of your website)
- **Either Divi or Elementor** page builder installed and active
- **Your login credentials** for WordPress
- **About 30-45 minutes** to complete the setup

---

# Part 1: WordPress Site Setup

## Step 1: Enable WordPress REST API Access

The generator needs to communicate with your WordPress site. Here's how to set that up:

### 1.1 Create an Application Password

1. **Log into your WordPress dashboard**
2. **Go to:** Users → Profile
3. **Scroll down** to the "Application Passwords" section (It might be disabled by wordfence, you can enable it by clicking the button given there)
4. **Type a name** for this password (e.g., "SEO Page Generator")
5. **Click "Add New Application Password"**
6. **Copy the password** that appears (you'll only see it once!)
7. **Save it somewhere safe** - you'll need this in Step 2

> 💡 **What's an Application Password?** It's a special password that lets the generator safely connect to your WordPress site without using your main login password.

---

## Step 2: Install Required WordPress Plugins

For the best results, install these plugins:

### Required Plugin:

- **Yoast SEO** (recommended) or **Rank Math**
  - Why? These plugins help search engines understand your pages better

### For Divi Users:

- Make sure **Divi Builder** is active on your site

### For Elementor Users:

- Make sure **Elementor** is installed and active

---

## Step 2.5: Enable Yoast/Rank Math REST API Support ⚠️ CRITICAL

> **🚨 IMPORTANT:** This step is REQUIRED for SEO meta titles and descriptions to work!

By default, Yoast SEO and Rank Math don't allow updates via REST API. You need to add a small piece of code to your WordPress site.

### Option A: Using Code Snippets Plugin (Recommended - Safest)

1. **Install Code Snippets Plugin:**
   - Go to **Plugins → Add New**
   - Search for "Code Snippets"
   - Install and activate "Code Snippets by Code Snippets Pro"

2. **Add the Code:**
   - Go to **Snippets → Add New**
   - Give it a name: "Enable Yoast REST API"
   - Paste the code below:

**For Yoast SEO:**
```php
add_action('rest_api_init', function() {
    register_post_meta('page', '_yoast_wpseo_title', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => function() { return current_user_can('edit_pages'); }
    ]);
    register_post_meta('page', '_yoast_wpseo_metadesc', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => function() { return current_user_can('edit_pages'); }
    ]);
    register_post_meta('page', '_yoast_wpseo_focuskw', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => function() { return current_user_can('edit_pages'); }
    ]);
});
```

**For Rank Math:**
```php
add_action('rest_api_init', function() {
    register_post_meta('page', 'rank_math_title', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => function() { return current_user_can('edit_pages'); }
    ]);
    register_post_meta('page', 'rank_math_description', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => function() { return current_user_can('edit_pages'); }
    ]);
    register_post_meta('page', 'rank_math_focus_keyword', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => function() { return current_user_can('edit_pages'); }
    ]);
});
```

3. **Set to run "Everywhere"**
4. **Click "Save Changes and Activate"**

### Option B: Add to Child Theme functions.php

1. **Go to:** Appearance → Theme File Editor
2. **Select your Child Theme** (if you don't have one, use Option A instead!)
3. **Click on** `functions.php`
4. **Add the code** (from above) at the end of the file
5. **Click "Update File"**

> ⚠️ **Warning:** Only use this method if you have a child theme! Theme updates will overwrite your changes otherwise.

### Why is this needed?

WordPress REST API doesn't expose Yoast/Rank Math fields by default for security reasons. This code safely enables them so the SEO Page Generator can update your meta titles and descriptions.

### How to verify it's working?

After adding the code:
1. Generate a test page
2. View the page source (Right-click → View Page Source)
3. Search for `<title>` - you should see your SEO title
4. Search for `<meta name="description"` - you should see your SEO description

📖 **Need more details?** See the complete guide: [YOAST_REST_API_FIX.md](./YOAST_REST_API_FIX.md)

---

# Part 2: Creating Your Client Profile

Now let's add your website to the generator system.

## Step 3: Add a New Client

1. **Open the SEO Page Generator** in your browser and login or signup
2. **Click "Add Client"** button
3. **Fill in the form:**

   **Client Name**

   - Enter your company name exactly as you want it to appear
   - Example: "Blue Sky Plumbing"

   **WordPress & Site URL**

   - Your website address including `https://`
   - Example: `https://www.blueskyplumbing.com`

   **WordPress Username**

   - Your WordPress admin username
   - This is what you use to log into WordPress

   **WordPress Password**

   - Paste the **Application Password** you created in Step 1
   - NOT your regular WordPress password!

   **Template Page ID**

   - Leave this blank for now - we'll fill it in Step 5

4. **Click "Test Connection"** button

   - Wait for the system to verify your WordPress credentials
   - You should see a success message: "✅ Connection successful!"
   - If it fails, double-check your URL, username, and Application Password

5. **Click "Save Client"** after the connection test passes

> 💡 **Tip:** Double-check your website URL doesn't have a trailing slash (/) at the end.

---

# Part 3: Creating Your Template Page

This is the master page that the generator will use as a blueprint for all your new pages.

## For Divi Users 🎨

### Step 4: Build Your Divi Template

1. **In WordPress, go to:** Pages → Select the page you had created last month and edit it or Add New for new client and create our page structure which we use for our pages with all sections.
2. **Give it a title:** "SEO Template " (only if new otherwise let it be of whatever name you had)
3. **Edit your page layout** with these special sections:

#### Required Sections & Their IDs

For each section below, you need to add a special identifier so the generator knows where to put content:

| Section Name         | What Goes Here               | Module ID to Add   |
| -------------------- | ---------------------------- | ------------------ |
| **Hero Title**       | Main headline at the top     | `hero-h1`          |
| **Hero Description** | Introductory paragraph       | `hero-description` |
| **Benefits Section** | List of benefits/features    | `benefits`         |
| **Why Choose Us**    | Reasons to pick your company | `why`              |
| **FAQ Section**      | Questions and answers        | `faq`              |
| **Map**              | Embedded Google Map          | `map`              |

#### How to Add Module IDs in Divi:

For **Text Modules:**

1. Click the module to edit it
2. Click **Advanced** tab
3. Click **CSS ID & Classes**
4. In the **CSS ID** field, type the Module ID (e.g., `hero-h1`)
5. Save the module

For **Accordion (FAQ):**

1. Click the accordion module to edit it
2. Go to **Advanced** → **CSS ID & Classes**
3. Add `faq` as the CSS ID
4. Add your sample FAQ items (these will be replaced)
5. Save the module

For **Map:**

1. Add a Code module or Text module
2. Go to **Advanced** → **CSS ID & Classes**
3. Add `map` as the CSS ID
4. Save the module

#### Important Design Tips:

- ✅ Use placeholder text like "This will be replaced" (Only if new page, for old page let old content be)
- ✅ Style everything how you want it to look (colors, fonts, spacing)
- ✅ Add any images, logos, or design elements you want on every page
- ✅ Double-check each module has the correct CSS ID

5. **Click "Publish"** when done
6. **Note the Page ID** (see Step 5 below)

---

## For Elementor Users ⚡

### Step 4: Build Your Elementor Template

1. **In WordPress, go to:** Pages → Select the page you had created last month and edit it or Add New
2. **Give it a title:** "SEO Template" (only if new otherwise let it be of whatever name you had)
3. **Design your page layout** with these special sections:

#### Required Sections & Their IDs

For each section below, you need to add a special identifier:

| Section Name                       | What Goes Here                                                            | CSS ID to Add                                  |
| ---------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| **Hero Title**                     | Main headline at the top                                                  | `hero-h1`                                      |
| **Hero Description**               | Introductory paragraph                                                    | `hero-description`                             |
| **Benefits Section Heading**       | Benefits Heading                                                          | `benefits-heading`                             |
| **Benefits Section Sub-Heading**   | Benefits Sub-Heading                                                      | `benefits-subheading`                          |
| **Benefits Section Bullet Points** | Benefits Bullet Points                                                    | `benefits-bullets`                             |
| **Why Section Heading**            | Why Heading                                                               | `why-heading`                                  |
| **Why Section Sub-Heading**        | Why Sub-Heading                                                           | `why-subheading`                               |
| **Why Section Bullet Points**      | Why Bullet Points                                                         | `why-bullets`                                  |
| **FAQ Section**                    | Questions and answers                                                     | `faq-questions`                                |
| **FAQ Section**                    | Answers only if they are separate component as in newer elementor clients | `faq-answer-1`, `faq-answer-2`, `faq-answer-3` |
| **Map**                            | Map Section Description                                                   | `map-description`                              |
| **Map**                            | Embedded Google Map                                                       | `map-iframe`                                   |

#### How to Add CSS IDs in Elementor:

For **Heading or Text Widgets:**

1. Click the widget to select it
2. Click **Advanced** tab in the left panel
3. In the **CSS ID** field, type the ID (e.g., `hero-h1`)
4. Save

#### Important Design Tips:

- ✅ Use placeholder text like "This will be replaced" (Only if new page, for old page let old content be)
- ✅ Style everything how you want it to look (colors, fonts, spacing)
- ✅ Add any images, logos, or design elements you want on every page
- ✅ Double-check each widget has the correct CSS ID

5. **Click "Publish"** when done
6. **Note the Page ID** (see Step 5 below)

---

## Step 5: Find Your Template Page ID

After publishing your template page:

1. **Go to:** Pages → All Pages
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

## Step 7: Generate a Test Page

Let's make sure everything works!

1. **In the generator, click "Generate Sample Page"**
2. **Fill in:**

   - Select your client
   - Enter a test location (e.g., "Miami, Florida")
   - Enter a service (e.g., "Plumbing Services")
   - Enter a keyword (e.g., "Emergency Plumber Miami")

3. **Click "Generate"**

---

## Step 8: Review in WordPress

1. **Open your WordPress site** and view the test page
2. **Check the following:**
   - ✅ Page looks styled correctly (fonts, colors, spacing)
   - ✅ All content is readable and makes sense
   - ✅ Map loads properly
   - ✅ Page displays well on mobile

---

# Part 5: Publishing Real Pages

Now that your test was successful, let's talk about how to create and publish real pages for your business.

## Step 9: Understanding the Two Modes

The generator has **2 different modes** for creating pages:

### Mode 1: Generate Sample Page (Quick Testing)

**Best For:** Testing and previewing single pages

**How it works:**

1. Click **"Generate Sample Page"** tab
2. Fill in location, service, and keyword
3. Click **"Generate"**
4. Review the preview
5. If happy, click **"Publish to WordPress"**
6. Page goes live immediately on your site

**When to use:**

- Testing your template setup
- Creating one-off pages quickly
- Previewing how content will look

---

### Mode 2: Batch Generation (Bulk Pages)

**Best For:** Creating many pages at once for multiple locations

**How it works:**

1. Click **"Generate Pages"** tab
2. Select your client
3. Download sample CSV and edit it with all information about pages to be generated
4. Upload a **CSV file** with your locations/services (you can download the CSV template)
5. Select **"Generate Directly"** or **"Preview & Publish"** (Preferred is Preview & Publish)
6. System generates all pages and saves them as **drafts** in the generator
7. Review each page in the **"Review Pages"** Popup
8. Make any edits needed or regnerate any content you want for any section or indivual point
9. Click **"Publish"** on individual pages when ready
10. Pages go live on your WordPress site

**When to use:**

- Creating pages for multiple locations (e.g., 50 cities)
- When you want to review content before publishing
- For large-scale SEO campaigns

---

---

# 🎉 You're All Set!

Congratulations! Your setup is complete. You can now:

- **Generate single pages** for testing
- **Upload a CSV file** to create multiple pages at once
- **Review and edit** generated content before publishing
- **Publish directly** to your WordPress site

---

# 📞 Need Help?

### Common Issues & Solutions

**Issue: "Failed to connect to WordPress"**

- ✅ Check your website URL is correct
- ✅ Make sure you used the Application Password (not regular password)
- ✅ Verify your WordPress username is correct

**Issue: "Template page not found"**

- ✅ Verify the Page ID is correct
- ✅ Make sure the template page is published (not draft)
- ✅ Check the page wasn't deleted

**Issue: "Content not updating in sections"**

- ✅ Verify all CSS IDs are typed exactly right (no extra spaces)
- ✅ Make sure CSS IDs are in the correct field:
  - Divi: Advanced → CSS ID & Classes → CSS ID
  - Elementor: Advanced → CSS ID
- ✅ Republish your template page

**Issue: "Page builder not detected"**

- ✅ Make sure Divi or Elementor is installed and active
- ✅ Verify the template page was built using the page builder
- ✅ Check that "Use Divi Builder" or "Edit with Elementor" was clicked

---

# 💡 Pro Tips

1. **Keep Your Template Simple:** Start with basic styling, then add complexity later
2. **Test Regularly:** Generate a test page after making template changes
3. **Save Your Application Password:** Store it in a password manager
4. **Don't Delete the Template:** Keep your template page safe - you need it!
5. **Update CSS Styling:** Any design changes to your template will apply to all future pages

---

## Quick Reference: CSS IDs

### For Divi Users 🎨

Copy this list when building your Divi template:

```
hero-h1
hero-description
benefits
why
faq
map
```

---

### For Elementor Users ⚡

Copy this list when building your Elementor template:

```
hero-h1
hero-description
benefits-heading
benefits-subheading
benefits-bullets
why-heading
why-subheading
why-bullets
faq-questions
faq-answer-1
faq-answer-2
faq-answer-3
map-description
map-iframe
```

**Note:** The `faq-answer-*` IDs are only needed if your FAQ answers are separate components (as in newer Elementor templates).

---

**Last Updated:** 27 October 2025
**Version:** 2.0 (with Divi support!)
