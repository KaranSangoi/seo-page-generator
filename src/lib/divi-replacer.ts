/**
 * Divi Content Replacement Utility
 * Handles Divi's shortcode-based structure
 *
 * IMPORTANT: Does NOT touch Elementor code - this is Divi-only
 */

export interface DiviReplacementLog {
  sectionsFound: string[];
  sectionsUpdated: string[];
  elementDetails: Array<{
    cssId: string;
    moduleType: string;
    section: string;
    action: string;
  }>;
}

export function replaceDiviContent(
  postContent: string,
  generatedContent: any,
  location?: string,
  internalLinkUrl?: string,
  companyName?: string,
  service?: string,
  internalLinkPlacement?: string,
  externalLinkPlacement?: string,
  omitSections?: string[],
  externalLinkUrlOverride?: string
): { data: string; log: DiviReplacementLog } {
  if (!postContent || typeof postContent !== 'string') {
    return {
      data: postContent,
      log: {
        sectionsFound: [],
        sectionsUpdated: [],
        elementDetails: [],
      },
    };
  }

  let content = postContent;

  const replacementLog: DiviReplacementLog = {
    sectionsFound: [],
    sectionsUpdated: [],
    elementDetails: [],
  };

  const omit = omitSections || [];

  // Debug: Log input content preview
  console.log('[DIVI REPLACER] Starting replacement...');
  console.log('[DIVI REPLACER] Content length:', postContent.length);
  console.log('[DIVI REPLACER] Content preview:', postContent.substring(0, 500));
  console.log('[DIVI REPLACER] Contains Divi shortcodes?', postContent.includes('[et_pb_'));
  console.log('[DIVI REPLACER] Omit sections:', omit);

  // Extract ALL module_id values from the content with surrounding context
  const moduleIdPattern = /module_id="([^"]+)"/g;
  const foundModuleIds: string[] = [];
  let match;
  while ((match = moduleIdPattern.exec(postContent)) !== null) {
    foundModuleIds.push(match[1]);
    // Show 100 chars before and after each module_id for debugging
    const matchIndex = match.index;
    const before = postContent.substring(Math.max(0, matchIndex - 50), matchIndex);
    const after = postContent.substring(matchIndex + match[0].length, Math.min(postContent.length, matchIndex + match[0].length + 150));
    console.log(`[DIVI REPLACER] Module ID "${match[1]}" context:`);
    console.log(`  Before: ...${before}`);
    console.log(`  After: ${after}...`);
  }
  console.log('[DIVI REPLACER] Found module IDs in template:', foundModuleIds);
  console.log('[DIVI REPLACER] Expected module IDs:', ['hero-h1', 'hero-description', 'benefits', 'why', 'faq', 'map']);

  // Helper: Generate city website URL for external link
  const generateCityWebsiteUrl = (loc: string): string => {
    if (!loc) return '';
    const parts = loc.split(',').map(p => p.trim());
    const cityName = parts[0];
    const state = parts[1] || '';
    const citySlug = cityName.replace(/\s+/g, '_');
    const stateSlug = state.replace(/\s+/g, '_');
    if (state) {
      return `https://en.wikipedia.org/wiki/${citySlug},_${stateSlug}`;
    } else {
      return `https://en.wikipedia.org/wiki/${citySlug}`;
    }
  };

  // Use override URL if provided, otherwise generate from location
  const cityWebsiteUrl = externalLinkUrlOverride || (location ? generateCityWebsiteUrl(location) : '');

  // Helper: Insert internal link
  const insertInternalLink = (text: string, linkUrl: string, companyName: string): string => {
    if (!text || !linkUrl || !companyName) return text;
    const linkHtml = `<a href="${linkUrl}" style="text-decoration: underline; display: inline;">${companyName}</a>`;
    const companyPattern = new RegExp(`\\b${companyName}\\b`, 'i');
    if (companyPattern.test(text)) {
      return text.replace(companyPattern, linkHtml);
    }
    return `Trust ${linkHtml} to deliver reliable services. ${text}`;
  };

  // Helper: Insert external link
  const insertExternalLink = (text: string, location: string, cityWebsiteUrl: string): string => {
    if (!text || !location || !cityWebsiteUrl) return text;
    const linkHtml = `<a href="${cityWebsiteUrl}" target="_blank" style="text-decoration: underline; display: inline;">${location}</a>`;
    const locationPattern = new RegExp(`\\b${location}\\b`, 'i');
    if (locationPattern.test(text)) {
      return text.replace(locationPattern, linkHtml);
    }
    return text;
  };

  // Helper: Log updates
  const logUpdate = (cssId: string, moduleType: string, section: string, action: string) => {
    const sectionKey = section.split(' ')[0];
    if (!replacementLog.sectionsFound.includes(sectionKey)) {
      replacementLog.sectionsFound.push(sectionKey);
    }
    if (!replacementLog.sectionsUpdated.includes(section)) {
      replacementLog.sectionsUpdated.push(section);
    }
    replacementLog.elementDetails.push({
      cssId,
      moduleType,
      section,
      action,
    });
  };

  // Helper: Build HTML for single editor with heading + subheading + bullets
  const buildSectionHtml = (heading: string, subheading: string, bullets: string[]): string => {
    return `<h2>${heading}</h2>
<p>&nbsp;</p>
<h3>${subheading}</h3>
<p>&nbsp;</p>
<ul>
${bullets.map(bullet => `<li>${bullet}</li>`).join('\n')}
</ul>`;
  };

  // ==================== HERO SECTION ====================
  if (!omit.includes('hero')) {
    console.log('[DIVI REPLACER] Processing hero section...');

    // Hero H1 - Find module with module_id="hero-h1"
    // Strategy: Find exact position of module_id="hero-h1", then find the opening bracket before it
    const heroH1IdIndex = content.indexOf('module_id="hero-h1"');
    if (heroH1IdIndex !== -1) {
      // Find the opening bracket before module_id
      let openingBracketIndex = content.lastIndexOf('[', heroH1IdIndex);
      if (openingBracketIndex !== -1) {
        // Extract shortcode tag name
        const tagMatch = content.substring(openingBracketIndex).match(/^\[(\w+)/);
        if (tagMatch) {
          const tagName = tagMatch[1]; // e.g., "et_pb_heading" or "et_pb_text"
          console.log(`[DIVI REPLACER] Hero H1 found as [${tagName}] at position ${openingBracketIndex}`);

          // Find the closing bracket for this shortcode
          let closingBracketIndex = content.indexOf(']', heroH1IdIndex);
          if (closingBracketIndex !== -1) {
            const originalShortcode = content.substring(openingBracketIndex, closingBracketIndex + 1);
            console.log(`[DIVI REPLACER] Hero H1 shortcode extracted (${originalShortcode.length} chars):`, originalShortcode.substring(0, 200));

            if (tagName === 'et_pb_heading') {
              // For heading: replace title attribute
              const updatedShortcode = originalShortcode.replace(/title="[^"]*"/, `title="${generatedContent.h1}"`);
              content = content.replace(originalShortcode, updatedShortcode);
              logUpdate('hero-h1', 'et_pb_heading', 'hero h1', 'replaced title attribute');
              console.log('[DIVI REPLACER] Hero H1 (heading) updated');
            } else if (tagName === 'et_pb_text') {
              // For text: find closing tag and replace content between
              const closingTag = `[/${tagName}]`;
              const closingTagIndex = content.indexOf(closingTag, closingBracketIndex);
              if (closingTagIndex !== -1) {
                const contentBefore = content.substring(0, closingBracketIndex + 1);
                const contentAfter = content.substring(closingTagIndex);
                content = contentBefore + `<h1>${generatedContent.h1}</h1>` + contentAfter;
                logUpdate('hero-h1', 'et_pb_text', 'hero h1', 'replaced content');
                console.log('[DIVI REPLACER] Hero H1 (text) updated');
              }
            } else {
              console.log(`[DIVI REPLACER] Hero H1 found but unsupported tag type: ${tagName}`);
            }
          }
        }
      }
    } else {
      console.log('[DIVI REPLACER] Hero H1 not found - no module_id="hero-h1" in content');
    }

    // Hero Description - Find ANY module with module_id="hero-description"
    const heroDescPattern = /(\[et_pb_\w+[^\]]*module_id="hero-description"[^\]]*\])([\s\S]*?)(\[\/et_pb_\w+\])/g;
    const heroDescMatches = content.match(heroDescPattern);
    console.log('[DIVI REPLACER] Hero Description pattern match:', !!heroDescMatches);
    if (heroDescMatches) {
      let heroDesc = generatedContent.heroDescription || '';

      // Add internal link if specified
      if (internalLinkPlacement === 'hero' && internalLinkUrl && companyName) {
        heroDesc = insertInternalLink(heroDesc, internalLinkUrl, companyName);
      }

      // Add external link if specified
      if (externalLinkPlacement === 'hero' && location && cityWebsiteUrl) {
        heroDesc = insertExternalLink(heroDesc, location, cityWebsiteUrl);
      }

      logUpdate('hero-description', 'any_module', 'hero description', 'replaced');
      content = content.replace(heroDescPattern, `$1<p>${heroDesc}</p>$3`);
    }
  }

  // ==================== BENEFITS SECTION (Single Editor) ====================
  if (!omit.includes('benefits')) {
    console.log('[DIVI REPLACER] Processing benefits section...');

    // Benefits section - Find ANY module with module_id="benefits"
    const benefitsPattern = /(\[et_pb_\w+[^\]]*module_id="benefits"[^\]]*\])([\s\S]*?)(\[\/et_pb_\w+\])/g;
    const benefitsMatches = content.match(benefitsPattern);
    console.log('[DIVI REPLACER] Benefits pattern match:', !!benefitsMatches);
    if (benefitsMatches) {
      const benefitsHtml = buildSectionHtml(
        generatedContent.benefitsHeading || 'Benefits',
        generatedContent.benefitsSubheading || '',
        generatedContent.benefitsBullets || []
      );

      logUpdate('benefits', 'any_module', 'benefits section', 'replaced');
      content = content.replace(benefitsPattern, `$1${benefitsHtml}$3`);
    }
  }

  // ==================== WHY SECTION (Single Editor) ====================
  if (!omit.includes('why')) {
    console.log('[DIVI REPLACER] Processing why section...');

    // Why section - Find ANY module with module_id="why"
    const whyPattern = /(\[et_pb_\w+[^\]]*module_id="why"[^\]]*\])([\s\S]*?)(\[\/et_pb_\w+\])/g;
    const whyMatches = content.match(whyPattern);
    console.log('[DIVI REPLACER] Why pattern match:', !!whyMatches);
    if (whyMatches) {
      const whyHtml = buildSectionHtml(
        generatedContent.whyHeading || 'Why Choose Us',
        generatedContent.whySubheading || '',
        generatedContent.whyBullets || []
      );

      logUpdate('why', 'any_module', 'why section', 'replaced');
      content = content.replace(whyPattern, `$1${whyHtml}$3`);
    }
  }

  // ==================== FAQ SECTION ====================
  if (!omit.includes('faq')) {
    const faqs = generatedContent.faqs || [];

    // Divi FAQ: One accordion/section with module_id="faq" containing all FAQ items
    // We need to find the whole accordion and rebuild all items inside

    // Pattern 1: et_pb_accordion with module_id="faq"
    const accordionPattern = /(\[et_pb_accordion[^\]]*module_id="faq"[^\]]*\])([^\[]*(?:\[et_pb_accordion_item[^\]]*\][\s\S]*?\[\/et_pb_accordion_item\][^\[]*)*)(\[\/et_pb_accordion\])/g;

    if (accordionPattern.test(content)) {
      // Build new accordion items
      const newAccordionItems = faqs.map((faq: { question: string; answer: string }) =>
        `[et_pb_accordion_item title="${faq.question}"]${faq.answer}[/et_pb_accordion_item]`
      ).join('\n');

      logUpdate('faq', 'et_pb_accordion', 'faq accordion', 'replaced all items');
      content = content.replace(
        accordionPattern,
        `$1\n${newAccordionItems}\n$3`
      );
    } else {
      // Pattern 2: Container (section/row/column) with module_id="faq" containing toggles
      // Find section/row with module_id="faq" and replace all toggles inside
      const sectionWithTogglesPattern = /(\[et_pb_(?:section|row|column)[^\]]*module_id="faq"[^\]]*\][^\[]*(?:\[et_pb_(?:row|column)[^\]]*\][^\[]*)*)(\[et_pb_toggle[^\]]*\][\s\S]*?\[\/et_pb_toggle\][^\[]*)+([^\[]*\[\/et_pb_(?:column|row|section)\])/g;

      if (sectionWithTogglesPattern.test(content)) {
        // Build new toggle items
        const newToggleItems = faqs.map((faq: { question: string; answer: string }) =>
          `[et_pb_toggle title="${faq.question}"]${faq.answer}[/et_pb_toggle]`
        ).join('\n');

        logUpdate('faq', 'et_pb_toggle_container', 'faq toggles', 'replaced all items');

        // More specific replacement: find the FAQ container and replace just the toggles
        content = content.replace(
          /(\[et_pb_(?:section|row|column)[^\]]*module_id="faq"[^\]]*\](?:[^\[]|\[(?!et_pb_toggle))*?)(\[et_pb_toggle[^\]]*\][\s\S]*?\[\/et_pb_toggle\](?:[^\[]|\[(?!\/et_pb_(?:column|row|section)))*?)+/g,
          `$1${newToggleItems}\n`
        );
      }
    }
  }

  // ==================== MAP SECTION ====================
  if (!omit.includes('map')) {
    // Map iframe replacement - Find ANY module with module_id="map"
    const mapPattern = /(\[et_pb_\w+[^\]]*module_id="map"[^\]]*\])([\s\S]*?)(\[\/et_pb_\w+\])/g;
    const mapMatches = content.match(mapPattern);
    console.log('[DIVI REPLACER] Map pattern match:', !!mapMatches);
    if (mapMatches && generatedContent.mapIframe) {
      logUpdate('map', 'any_module', 'map iframe', 'replaced');
      content = content.replace(mapPattern, `$1${generatedContent.mapIframe}$3`);
    }
  }

  console.log('[DIVI REPLACER] Replacement complete');
  console.log('[DIVI REPLACER] Sections found:', replacementLog.sectionsFound);
  console.log('[DIVI REPLACER] Sections updated:', replacementLog.sectionsUpdated);
  console.log('[DIVI REPLACER] Element details:', replacementLog.elementDetails);

  return {
    data: content,
    log: replacementLog,
  };
}

/**
 * Helper: Extract current structure from Divi template
 * This helps understand what's in the template before replacing
 */
export function analyzeDiviTemplate(postContent: string): {
  modules: Array<{ id: string; type: string; preview: string }>;
} {
  const modules: Array<{ id: string; type: string; preview: string }> = [];

  // Find all et_pb_text modules with module_id
  const textModulePattern = /\[et_pb_text[^\]]*module_id="([^"]+)"[^\]]*\]([^\[]{0,100})/g;
  let match;
  while ((match = textModulePattern.exec(postContent)) !== null) {
    modules.push({
      id: match[1],
      type: 'et_pb_text',
      preview: match[2].substring(0, 50) + '...',
    });
  }

  // Find all et_pb_toggle modules with module_id
  const togglePattern = /\[et_pb_toggle[^\]]*module_id="([^"]+)"[^\]]*title="([^"]*)"[^\]]*\]/g;
  while ((match = togglePattern.exec(postContent)) !== null) {
    modules.push({
      id: match[1],
      type: 'et_pb_toggle',
      preview: `Q: ${match[2]}`,
    });
  }

  return { modules };
}
