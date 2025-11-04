/**
 * Page Builder Auto-Detection Utility
 * Detects which page builder is being used by analyzing template page data
 */

export type PageBuilder =
  | 'elementor'
  | 'divi'
  | 'wpbakery'
  | 'gutenberg'
  | 'beaver-builder'
  | 'oxygen'
  | 'html';

export interface DetectionResult {
  builder: PageBuilder;
  confidence: 'high' | 'medium' | 'low';
  details: string;
}

/**
 * Detect page builder from template page data
 */
export async function detectPageBuilder(
  templatePageId: string,
  wordpressUrl: string,
  wpUsername: string,
  wpAppPassword: string
): Promise<DetectionResult> {
  const credentials = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');

  // Clean WordPress URL
  let cleanWpUrl = wordpressUrl.trim();
  cleanWpUrl = cleanWpUrl.replace(/\/wp-json\/?.*$/, '');
  cleanWpUrl = cleanWpUrl.replace(/\/wp-admin\/?.*$/, '');
  cleanWpUrl = cleanWpUrl.replace(/\/$/, '');

  const url = `${cleanWpUrl}/wp-json/wp/v2/pages/${templatePageId}?context=edit`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    const page = await response.json();
    const meta = page.meta || {};
    const content = page.content?.rendered || '';

    // Detection logic in priority order (most specific to least specific)

    // 1. Elementor - Check for _elementor_data (most reliable)
    if (meta._elementor_data || meta._elementor_edit_mode === 'builder') {
      return {
        builder: 'elementor',
        confidence: 'high',
        details: 'Detected Elementor meta field (_elementor_data)',
      };
    }

    // 2. Beaver Builder - Check for _fl_builder_data
    if (meta._fl_builder_data || meta._fl_builder_enabled === '1') {
      return {
        builder: 'beaver-builder',
        confidence: 'high',
        details: 'Detected Beaver Builder meta field (_fl_builder_data)',
      };
    }

    // 3. Oxygen - Check for ct_builder_json
    if (meta.ct_builder_json || meta.ct_builder_shortcodes) {
      return {
        builder: 'oxygen',
        confidence: 'high',
        details: 'Detected Oxygen Builder meta field (ct_builder_json)',
      };
    }

    // 4. Divi - Check for Divi meta and shortcodes
    if (meta._et_pb_use_builder === 'on') {
      return {
        builder: 'divi',
        confidence: 'high',
        details: 'Detected Divi meta field (_et_pb_use_builder)',
      };
    }

    if (content.includes('[et_pb_section') || content.includes('[et_pb_row')) {
      return {
        builder: 'divi',
        confidence: 'medium',
        details: 'Detected Divi shortcodes in content',
      };
    }

    // 5. WPBakery - Check for WPBakery shortcodes
    if (content.includes('[vc_row') || content.includes('[vc_column')) {
      return {
        builder: 'wpbakery',
        confidence: 'medium',
        details: 'Detected WPBakery shortcodes in content',
      };
    }

    // 6. Gutenberg - Check for block comments
    if (content.includes('<!-- wp:')) {
      return {
        builder: 'gutenberg',
        confidence: 'medium',
        details: 'Detected Gutenberg block comments',
      };
    }

    // 7. Fallback - Plain HTML
    return {
      builder: 'html',
      confidence: 'low',
      details: 'No page builder detected - using plain HTML fallback',
    };

  } catch (error: any) {
    console.error('Builder detection error:', error);

    // Handle specific errors
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('Detection timeout - WordPress site took too long to respond');
    }

    if (error.message?.includes('404')) {
      throw new Error(`Template page ID ${templatePageId} not found`);
    }

    throw new Error(`Detection failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get display name for page builder
 */
export function getBuilderDisplayName(builder: PageBuilder): string {
  const names: Record<PageBuilder, string> = {
    'elementor': 'Elementor',
    'divi': 'Divi Builder',
    'wpbakery': 'WPBakery Page Builder',
    'gutenberg': 'Gutenberg (Block Editor)',
    'beaver-builder': 'Beaver Builder',
    'oxygen': 'Oxygen Builder',
    'html': 'Plain HTML',
  };
  return names[builder];
}

/**
 * Get icon/emoji for page builder
 */
export function getBuilderIcon(builder: PageBuilder): string {
  const icons: Record<PageBuilder, string> = {
    'elementor': '🎨',
    'divi': '🔷',
    'wpbakery': '📦',
    'gutenberg': '🧱',
    'beaver-builder': '🦫',
    'oxygen': '💨',
    'html': '📄',
  };
  return icons[builder];
}

/**
 * Check if builder is supported
 */
export function isBuilderSupported(builder: PageBuilder): boolean {
  // Elementor, Divi, and WPBakery are fully implemented
  return builder === 'elementor' || builder === 'divi' || builder === 'wpbakery';
}

/**
 * Get support status message
 */
export function getBuilderSupportStatus(builder: PageBuilder): string {
  if (builder === 'elementor' || builder === 'divi' || builder === 'wpbakery') {
    return '✅ Fully supported';
  }
  if (builder === 'gutenberg' || builder === 'beaver-builder') {
    return '📋 Planned';
  }
  return '❌ Not supported yet';
}
