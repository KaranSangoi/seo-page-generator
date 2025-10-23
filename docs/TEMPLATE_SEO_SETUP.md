# SEO Plugin Setup Guide for Template Page

This guide explains how to properly configure your Elementor template page so that SEO meta fields (title, description, focus keyword) are correctly displayed in Yoast SEO or Rank Math when pages are generated.

## Why This Is Important

When the system generates pages, it sets SEO meta fields via the WordPress REST API. However, for these fields to appear in your SEO plugin's interface, the template page needs to have the SEO plugin properly initialized.

## Setup Instructions

### For Yoast SEO Users

**⚠️ CRITICAL: You MUST complete this setup or Elementor won't show SEO fields!**

1. **Edit Your Template Page in WordPress**
   - Go to Pages → All Pages
   - Find your template page (the one you selected during client setup)
   - Click "Edit" to open it in Elementor

2. **Exit Elementor Editor (Important!)**
   - Click the hamburger menu (☰) in the bottom left of Elementor
   - Click "Exit to Dashboard"
   - This takes you back to the WordPress classic editor

3. **Configure Yoast SEO in Classic Editor**
   - Scroll down below the content editor to find the "Yoast SEO" metabox
   - If you don't see it, click "Screen Options" at the top right and enable "Yoast SEO"

4. **Add Placeholder Values** (REQUIRED - These will be replaced automatically)
   - **SEO Title**: Enter "PLACEHOLDER TITLE" (exactly as shown)
   - **Meta Description**: Enter "PLACEHOLDER DESCRIPTION" (exactly as shown)
   - **Focus Keyphrase**: Enter "placeholder" (exactly as shown)

5. **Configure Other Yoast Settings** (Optional but recommended)
   - Set your preferred **Social Media** settings (Facebook/Twitter images, etc.)
   - Configure **Schema** settings if needed
   - Set **Advanced** settings (canonical URL, robots meta tags, etc.)
   - These settings will be inherited by all generated pages

6. **Save the Template Page**
   - Click "Update" to save your changes
   - Now the Yoast fields are initialized and will work with Elementor

7. **Test in Elementor** (Optional verification)
   - Click "Edit with Elementor" button
   - Click the hamburger menu (☰) → Page Settings
   - Look for "Yoast SEO" tab
   - You should see your placeholder values
   - The placeholder values will be replaced when pages are generated

### For Rank Math Users

**⚠️ CRITICAL: You MUST complete this setup or Elementor won't show SEO fields!**

1. **Edit Your Template Page in WordPress**
   - Go to Pages → All Pages
   - Find your template page
   - Click "Edit" to open it in Elementor

2. **Exit Elementor Editor (Important!)**
   - Click the hamburger menu (☰) in the bottom left of Elementor
   - Click "Exit to Dashboard"
   - This takes you back to the WordPress classic editor

3. **Configure Rank Math in Classic Editor**
   - Look for the "Rank Math" metabox below the content editor
   - If you don't see it, click on the Rank Math icon in the WordPress admin toolbar
   - Or enable it via "Screen Options" at the top right

4. **Add Placeholder Values** (REQUIRED - These will be replaced automatically)
   - **SEO Title**: Enter "PLACEHOLDER TITLE" (exactly as shown)
   - **Description**: Enter "PLACEHOLDER DESCRIPTION" (exactly as shown)
   - **Focus Keyword**: Enter "placeholder" (exactly as shown)

5. **Configure Other Rank Math Settings** (Optional but recommended)
   - Set **Robots Meta**: Index/Noindex, Follow/Nofollow settings
   - Configure **Advanced** settings
   - Set up **Schema** if needed
   - Add **Social Media** images and settings
   - These will be inherited by generated pages

6. **Save the Template Page**
   - Click "Update" to save
   - Now the Rank Math fields are initialized and will work with Elementor

7. **Test in Elementor** (Optional verification)
   - Click "Edit with Elementor" button
   - Click the hamburger menu (☰) → Page Settings
   - Look for "Rank Math SEO" section
   - You should see your placeholder values
   - The placeholder values will be replaced when pages are generated

## What Gets Replaced Automatically

When pages are generated, the system will:

✅ **Always Replace:**
- SEO Title → Generated meta title
- Meta Description → Generated meta description
- Focus Keyword → Generated primary keyword

✅ **Preserve from Template:**
- Social media settings (Facebook/Twitter images)
- Schema markup settings
- Robots meta tags (index/noindex, follow/nofollow)
- Canonical URL settings
- Advanced SEO settings

## Verification Steps

After setting up your template:

1. **Generate a Sample Page**
   - Use the "Generate Sample Page" button in the client dashboard
   - This creates a test page with sample content

2. **Check the Generated Page**
   - Edit the sample page in WordPress
   - Look at the Yoast or Rank Math metabox
   - Verify that:
     - ✓ SEO Title shows the generated title
     - ✓ Meta Description shows the generated description
     - ✓ Focus Keyword shows the generated keyword
     - ✓ Other settings (social, schema, etc.) are preserved from template

3. **View the Page Source**
   - Visit the sample page on your website
   - Right-click → "View Page Source"
   - Search for `<meta name="description"`
   - Verify the meta description is present

## Troubleshooting

### SEO Fields Show Empty in Plugin Interface

**Problem**: When you edit a generated page, the Yoast/Rank Math fields appear empty, but the meta tags are in the page source.

**Solution**:
1. Edit your template page
2. Add placeholder values in Yoast/Rank Math (see instructions above)
3. Save the template
4. Delete the generated test page
5. Generate a new sample page to verify

### Meta Tags Not Appearing in Page Source

**Problem**: The SEO meta tags don't appear in the HTML source code of generated pages.

**Possible Causes**:
1. **SEO Plugin Not Active**: Ensure Yoast SEO or Rank Math is installed and activated
2. **Wrong Plugin Selected**: Check that you selected the correct SEO plugin during client setup
3. **Theme Compatibility**: Some themes override meta tags. Check theme settings.

**Solution**:
1. Go to Dashboard → Clients → Edit Client
2. Verify the correct SEO plugin is selected
3. Regenerate the page

### Wrong Plugin Selected During Setup

If you selected the wrong SEO plugin:

1. **Update Client Settings**
   - Go to Dashboard → Clients
   - Click "Edit" on the client
   - Change the "SEO Plugin" dropdown
   - Save changes

2. **Regenerate Pages**
   - Any pages generated with the wrong plugin setting will need to be regenerated
   - Delete the incorrectly generated pages
   - Generate new pages with the correct plugin setting

## Supported SEO Plugins

### ✅ Yoast SEO (Free & Premium)
- Meta title: `_yoast_wpseo_title`
- Meta description: `_yoast_wpseo_metadesc`
- Focus keyword: `_yoast_wpseo_focuskw`
- All Yoast settings preserved from template
- **Case-insensitive detection**: Works with "Yoast", "yoast", "YOAST", etc.
- **Fallback guarantee**: JavaScript injection ensures meta description tag is always present, even if Yoast doesn't output it

### ✅ Rank Math (Free & Pro)
- Meta title: `rank_math_title`
- Meta description: `rank_math_description`
- Focus keyword: `rank_math_focus_keyword`
- All Rank Math settings preserved from template
- **Case-insensitive detection**: Works with "Rank Math", "rank-math", "rankmath", etc.

### ❌ Other Plugins
Currently, only Yoast SEO and Rank Math are supported. If you're using a different SEO plugin:
- Meta tags will still be set via WordPress's default `excerpt` field
- **Fallback guarantee**: JavaScript injection ensures meta description tag is always present
- You may need to install Yoast or Rank Math for full SEO plugin integration

## Meta Description Fallback System

**New in v1.3.3**: Guaranteed meta description presence, regardless of SEO plugin configuration.

### How It Works
1. System sets SEO plugin fields (`_yoast_wpseo_metadesc` or `rank_math_description`)
2. System sets WordPress `excerpt` field as secondary fallback
3. System injects invisible JavaScript that checks if `<meta name="description">` exists
4. If missing, JavaScript creates and injects the tag into `<head>`

### Benefits
- ✅ **Always works**: Meta description guaranteed to appear in HTML
- ✅ **Zero visual impact**: Script is invisible to users
- ✅ **SEO-friendly**: Search engines always find the meta description
- ✅ **Plugin-agnostic**: Works even if SEO plugin is misconfigured or disabled
- ✅ **Performance**: Runs once on page load, no ongoing overhead

### Technical Details
- Location: Invisible HTML widget at beginning of page
- Trigger: Only runs if meta description tag doesn't already exist
- Priority: SEO plugins take precedence; fallback only activates if they fail

## Advanced: Manual Meta Field Verification

For developers who want to verify meta fields are set correctly:

### Using WordPress REST API

```bash
# Replace with your actual values
SITE_URL="https://your-wordpress-site.com"
PAGE_ID="123"
USERNAME="your_username"
APP_PASSWORD="your_app_password"

# Fetch page with edit context to see all meta fields
curl -X GET "${SITE_URL}/wp-json/wp/v2/pages/${PAGE_ID}?context=edit" \
  -H "Authorization: Basic $(echo -n ${USERNAME}:${APP_PASSWORD} | base64)"
```

Look for these fields in the response:
- `meta._yoast_wpseo_title` (for Yoast)
- `meta.rank_math_title` (for Rank Math)

### Using WordPress Database

```sql
-- For Yoast SEO
SELECT post_id, meta_key, meta_value
FROM wp_postmeta
WHERE post_id = 123
AND meta_key LIKE '_yoast%';

-- For Rank Math
SELECT post_id, meta_key, meta_value
FROM wp_postmeta
WHERE post_id = 123
AND meta_key LIKE 'rank_math%';
```

## Best Practices

1. **Set Up Template First**: Always configure the template page before generating pages at scale
2. **Test with Sample Page**: Use the sample page feature to verify everything works
3. **Keep Template Updated**: If you change social media images or schema settings, update the template page
4. **Consistent Settings**: Use the same SEO plugin across all sites for consistency
5. **Backup Before Changes**: Always backup your WordPress site before making major changes

## Need Help?

If you're still experiencing issues:

1. Check the WordPress error logs
2. Verify REST API is working: Visit `your-site.com/wp-json/`
3. Ensure Application Password has proper permissions
4. Contact support with:
   - WordPress version
   - SEO plugin name and version
   - Steps you've taken so far
   - Screenshots of the issue

---

**Last Updated**: 2025-10-23
**Version**: v1.3.3 - Added case-insensitive SEO plugin detection and meta description fallback system
