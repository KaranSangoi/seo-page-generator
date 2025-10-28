# Yoast SEO REST API Fix

## The Problem

By default, Yoast SEO meta fields are **NOT writable** via the WordPress REST API. When the SEO Page Generator tries to set meta titles and descriptions, WordPress silently ignores these fields because they're not registered with `show_in_rest => true`.

### Symptoms:
- Pages are created successfully
- Content appears correctly
- **BUT** Yoast SEO title and description remain empty
- Meta tags don't appear in page source

## The Solution

You need to add code to your WordPress site to expose Yoast fields to the REST API.

### Option 1: Use a Plugin (Easiest)

Install the **[wp-api-yoast-meta](https://github.com/ChazUK/wp-api-yoast-meta)** plugin:

1. Download the plugin from GitHub
2. Upload to `/wp-content/plugins/` on your WordPress site
3. Activate it in WordPress admin
4. Done! The plugin automatically exposes Yoast fields

### Option 2: Add Custom Code (Recommended)

Add this code to your WordPress site's `functions.php` file:

```php
/**
 * Expose Yoast SEO Meta Fields to WordPress REST API
 * Required for SEO Page Generator to update meta titles and descriptions
 */
add_action('rest_api_init', function() {
    // Register Yoast SEO fields for posts
    register_post_meta('post', '_yoast_wpseo_title', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'description' => 'Yoast SEO Title',
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    register_post_meta('post', '_yoast_wpseo_metadesc', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'description' => 'Yoast SEO Meta Description',
        'sanitize_callback' => 'sanitize_textarea_field',
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    register_post_meta('post', '_yoast_wpseo_focuskw', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'description' => 'Yoast SEO Focus Keyword',
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // Register Yoast SEO fields for pages
    register_post_meta('page', '_yoast_wpseo_title', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'description' => 'Yoast SEO Title',
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback' => function() {
            return current_user_can('edit_pages');
        }
    ]);

    register_post_meta('page', '_yoast_wpseo_metadesc', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'description' => 'Yoast SEO Meta Description',
        'sanitize_callback' => 'sanitize_textarea_field',
        'auth_callback' => function() {
            return current_user_can('edit_pages');
        }
    ]);

    register_post_meta('page', '_yoast_wpseo_focuskw', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'description' => 'Yoast SEO Focus Keyword',
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback' => function() {
            return current_user_can('edit_pages');
        }
    ]);
});
```

### Where to Add This Code

**Method A: Child Theme (Recommended)**
1. Go to **Appearance → Theme File Editor**
2. Select your **child theme** (if you don't have one, create it first!)
3. Edit `functions.php`
4. Add the code at the end of the file
5. Click **Update File**

**Method B: Code Snippets Plugin (Safest)**
1. Install the **Code Snippets** plugin
2. Go to **Snippets → Add New**
3. Paste the code
4. Set to run **Everywhere**
5. Activate the snippet

**Method C: Custom Plugin**
1. Create a file: `/wp-content/plugins/yoast-rest-api-support/yoast-rest-api-support.php`
2. Add this content:

```php
<?php
/**
 * Plugin Name: Yoast REST API Support
 * Description: Exposes Yoast SEO meta fields to WordPress REST API
 * Version: 1.0
 * Author: Your Name
 */

add_action('rest_api_init', function() {
    // [Paste the register_post_meta code from above here]
});
```

3. Activate the plugin in WordPress admin

## For Rank Math Users

If you're using Rank Math instead of Yoast, add this code instead:

```php
/**
 * Expose Rank Math SEO Meta Fields to WordPress REST API
 */
add_action('rest_api_init', function() {
    // For posts
    register_post_meta('post', 'rank_math_title', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    register_post_meta('post', 'rank_math_description', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'sanitize_callback' => 'sanitize_textarea_field',
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    register_post_meta('post', 'rank_math_focus_keyword', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // For pages
    register_post_meta('page', 'rank_math_title', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback' => function() {
            return current_user_can('edit_pages');
        }
    ]);

    register_post_meta('page', 'rank_math_description', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'sanitize_callback' => 'sanitize_textarea_field',
        'auth_callback' => function() {
            return current_user_can('edit_pages');
        }
    ]);

    register_post_meta('page', 'rank_math_focus_keyword', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback' => function() {
            return current_user_can('edit_pages');
        }
    ]);
});
```

## Verification

After adding the code:

1. **Test the REST API directly:**
   ```bash
   curl -X POST "https://yoursite.com/wp-json/wp/v2/pages" \
     -H "Authorization: Basic YOUR_BASE64_CREDENTIALS" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Page",
       "status": "draft",
       "meta": {
         "_yoast_wpseo_title": "Test SEO Title",
         "_yoast_wpseo_metadesc": "Test SEO Description"
       }
     }'
   ```

2. **Check the response:**
   - Look for the `meta` object in the response
   - It should contain your `_yoast_wpseo_title` and `_yoast_wpseo_metadesc`

3. **Generate a test page:**
   - Use the Sample Page feature in the SEO Page Generator
   - View the page source
   - Check for `<title>` and `<meta name="description">` tags

## Troubleshooting

### Meta fields still not updating?

1. **Clear WordPress cache:**
   - If using a caching plugin, clear all caches
   - Deactivate cache briefly for testing

2. **Check REST API permissions:**
   - Ensure your Application Password has sufficient permissions
   - Try regenerating the Application Password

3. **Verify Yoast is active:**
   - Go to Plugins → make sure Yoast SEO is active
   - Check Yoast version (works with Yoast 16.0+)

4. **Check for plugin conflicts:**
   - Temporarily deactivate other SEO plugins
   - Deactivate security plugins that might block REST API

5. **Enable WordPress debugging:**
   Add to `wp-config.php`:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```
   Check `/wp-content/debug.log` for errors

## Why This Happens

WordPress REST API has security restrictions. By default, meta fields prefixed with `_` (like `_yoast_wpseo_title`) are considered "private" and hidden from the REST API.

To make them accessible:
- `show_in_rest => true` - Exposes the field to REST API
- `auth_callback` - Ensures only authorized users can update
- `sanitize_callback` - Cleanses data to prevent XSS attacks

## References

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Yoast Developer Documentation](https://developer.yoast.com/customization/apis/rest-api/)
- [register_post_meta() Reference](https://developer.wordpress.org/reference/functions/register_post_meta/)
- [wp-api-yoast-meta Plugin](https://github.com/ChazUK/wp-api-yoast-meta)

---

**Last Updated**: 2025-10-28
**Status**: Required for Yoast/Rank Math SEO to work via REST API
