/**
 * WPBakery Content Replacement Utility
 * Simple approach: Find element by class/id, determine type, update content
 *
 * DEBUGGING GUIDE:
 * - All logs are prefixed with [WPBAKERY REPLACER] or [FIND ELEMENT]
 * - Check "Sections found" vs "Sections updated" at the end
 * - If a section is found but not updated, check the element type and replacement logic
 * - Common issues: Wrong element type, missing attributes, incorrect class names
 */

export interface WPBakeryReplacementLog {
  sectionsFound: string[];
  sectionsUpdated: string[];
  elementDetails: Array<{
    cssId: string;
    moduleType: string;
    section: string;
    action: string;
  }>;
  warnings: string[];
  errors: string[];
}

/**
 * Helper: Find any WPBakery element with a specific class or id
 * Returns the full shortcode match with element type
 */
function findElementByClassOrId(content: string, identifier: string): {
  match: string;
  elementType: string;
  startPos: number;
  endPos: number;
} | null {
  console.log(`[FIND ELEMENT] Searching for identifier: "${identifier}"`);

  // Remove any HTML wrapper tags (like <p>) that might wrap the shortcodes
  let cleanContent = content;
  if (content.startsWith('<p>') && (content.includes('[vc_') || content.includes('[woodmart_'))) {
    console.log('[FIND ELEMENT] Removing <p> wrapper from content');
    cleanContent = content.replace(/^<p>/, '').replace(/<\/p>$/, '');
  }

  // Try to find element with el_class containing identifier
  // Support both [vc_*] and [woodmart_*] shortcodes
  const classPattern = new RegExp(`(\\[(?:vc_|woodmart_)\\w+[^\\]]*el_class="[^"]*${identifier}[^"]*"[^\\]]*\\])`, 'i');
  console.log(`[FIND ELEMENT] Class pattern: ${classPattern}`);

  const classMatch = cleanContent.match(classPattern);
  console.log(`[FIND ELEMENT] Class match found:`, classMatch ? classMatch[0].substring(0, 200) : 'NO MATCH');

  if (classMatch) {
    const openTag = classMatch[0];
    // Extract the shortcode type (vc_something or woodmart_something)
    const shortcodeMatch = openTag.match(/\[(vc_\w+|woodmart_\w+)/);
    if (!shortcodeMatch) {
      console.log('[FIND ELEMENT] Could not extract shortcode type');
      return null;
    }

    const fullShortcodeType = shortcodeMatch[1]; // e.g., "vc_row" or "woodmart_title"
    console.log(`[FIND ELEMENT] Element type from class: ${fullShortcodeType}`);

    // Find position in ORIGINAL content (not cleanContent)
    const startPos = content.indexOf(openTag);
    console.log(`[FIND ELEMENT] Start position: ${startPos}`);

    // Find matching closing tag
    const closeTag = `[/${fullShortcodeType}]`;
    console.log(`[FIND ELEMENT] Looking for closing tag: ${closeTag}`);

    // Check if this is a self-closing shortcode (no closing tag expected)
    const isSelfClosing = !content.includes(closeTag);
    if (isSelfClosing) {
      console.log(`[FIND ELEMENT] ✅ Self-closing shortcode found!`);
      return {
        match: openTag,
        elementType: fullShortcodeType,
        startPos,
        endPos: startPos + openTag.length
      };
    }

    let depth = 1;
    let pos = startPos + openTag.length;
    const searchStr = content.substring(pos);

    // Find matching closing tag by tracking depth
    const openPattern = new RegExp(`\\[${fullShortcodeType}[^\\]]*\\]`, 'g');
    const closePattern = new RegExp(`\\[\\/${fullShortcodeType}\\]`, 'g');

    let minClosePos = searchStr.indexOf(closeTag);
    console.log(`[FIND ELEMENT] First closing tag at relative position: ${minClosePos}`);

    while (minClosePos !== -1 && depth > 0) {
      const nextOpen = searchStr.substring(0, minClosePos).match(openPattern);
      if (nextOpen) {
        depth += nextOpen.length;
        console.log(`[FIND ELEMENT] Found ${nextOpen.length} nested opening tags, depth now: ${depth}`);
      }
      depth -= 1;
      console.log(`[FIND ELEMENT] Found closing tag, depth now: ${depth}`);

      if (depth === 0) {
        const endPos = pos + minClosePos + closeTag.length;
        const fullMatch = content.substring(startPos, endPos);
        console.log(`[FIND ELEMENT] ✅ Complete match found! Start: ${startPos}, End: ${endPos}, Length: ${fullMatch.length}`);
        console.log(`[FIND ELEMENT] Match preview (first 300 chars): ${fullMatch.substring(0, 300)}`);

        return {
          match: fullMatch,
          elementType: fullShortcodeType,
          startPos,
          endPos
        };
      }
      minClosePos = searchStr.indexOf(closeTag, minClosePos + 1);
    }

    console.log(`[FIND ELEMENT] ⚠️ Could not find matching closing tag for ${fullShortcodeType}`);
  }

  // Try to find element with id or el_id
  // Support both [vc_*] and [woodmart_*] shortcodes
  console.log(`[FIND ELEMENT] Trying ID pattern...`);
  const idPattern = new RegExp(`(\\[(?:vc_|woodmart_)\\w+[^\\]]*(?:id|el_id)="${identifier}"[^\\]]*\\])`, 'i');
  console.log(`[FIND ELEMENT] ID pattern: ${idPattern}`);

  const idMatch = cleanContent.match(idPattern);
  console.log(`[FIND ELEMENT] ID match found:`, idMatch ? idMatch[0].substring(0, 200) : 'NO MATCH');

  if (idMatch) {
    const openTag = idMatch[0];
    const shortcodeMatch = openTag.match(/\[(vc_\w+|woodmart_\w+)/);
    if (!shortcodeMatch) {
      console.log('[FIND ELEMENT] Could not extract shortcode type from ID match');
      return null;
    }

    const fullShortcodeType = shortcodeMatch[1];
    console.log(`[FIND ELEMENT] Element type from ID: ${fullShortcodeType}`);

    const startPos = content.indexOf(openTag);
    const closeTag = `[/${fullShortcodeType}]`;
    const endPos = content.indexOf(closeTag, startPos) + closeTag.length;
    console.log(`[FIND ELEMENT] Start: ${startPos}, End: ${endPos}`);

    if (endPos > startPos) {
      const fullMatch = content.substring(startPos, endPos);
      console.log(`[FIND ELEMENT] ✅ Complete ID match found! Length: ${fullMatch.length}`);
      console.log(`[FIND ELEMENT] Match preview (first 300 chars): ${fullMatch.substring(0, 300)}`);

      return {
        match: fullMatch,
        elementType: fullShortcodeType,
        startPos,
        endPos
      };
    }
  }

  console.log(`[FIND ELEMENT] ❌ No element found for identifier: "${identifier}"`);
  return null;
}

/**
 * Helper: Replace content in first text element inside a container
 */
function replaceTextInContainer(containerContent: string, newContent: string): string {
  // Try vc_column_text first (most common)
  const textPattern = /(\[vc_column_text[^\]]*\])([\s\S]*?)(\[\/vc_column_text\])/;
  if (textPattern.test(containerContent)) {
    return containerContent.replace(textPattern, `$1${newContent}$3`);
  }

  // Try vc_custom_heading
  const headingPattern = /(\[vc_custom_heading[^\]]*\])([\s\S]*?)(\[\/vc_custom_heading\])/;
  if (headingPattern.test(containerContent)) {
    return containerContent.replace(headingPattern, `$1${newContent}$3`);
  }

  return containerContent;
}

export function replaceWPBakeryContent(
  postContent: string,
  generatedContent: any,
  location?: string,
  internalLinkUrl?: string,
  companyName?: string,
  service?: string,
  internalLinkPlacement?: string,
  externalLinkPlacement?: string,
  omitSections?: string[]
): { data: string; log: WPBakeryReplacementLog } {
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

  const replacementLog: WPBakeryReplacementLog = {
    sectionsFound: [],
    sectionsUpdated: [],
    elementDetails: [],
    warnings: [],
    errors: [],
  };

  const omit = omitSections || [];

  // Log input summary
  console.log('\n============================================================');
  console.log('[WPBAKERY REPLACER] 🔧 STARTING REPLACEMENT PROCESS');
  console.log('============================================================');
  console.log('[WPBAKERY REPLACER] Content length:', postContent.length, 'characters');
  console.log('[WPBAKERY REPLACER] Location:', location || 'NOT PROVIDED');
  console.log('[WPBAKERY REPLACER] Sections to process:', [
    'hero', 'benefits', 'why', 'faq', 'map'
  ].filter(s => !omit.includes(s)).join(', '));
  console.log('[WPBAKERY REPLACER] Sections to skip:', omit.length > 0 ? omit.join(', ') : 'NONE');
  console.log('============================================================\n');

  console.log('[WPBAKERY REPLACER] Starting simple replacement...');
  console.log('[WPBAKERY REPLACER] Content length:', postContent.length);

  // Log first 2000 chars to see structure
  console.log('[WPBAKERY REPLACER] Content preview (first 2000 chars):');
  console.log(postContent.substring(0, 2000));

  // Find all el_class attributes
  const allClasses = postContent.match(/el_class="([^"]+)"/g);
  console.log('[WPBAKERY REPLACER] All el_class attributes found:', JSON.stringify(allClasses));

  // Find all id/el_id attributes
  const allIds = postContent.match(/(?:^|\s)(?:id|el_id)="([^"]+)"/g);
  console.log('[WPBAKERY REPLACER] All id/el_id attributes found:', JSON.stringify(allIds));

  // Find the hero element and show context
  const heroPos = postContent.indexOf('el_class="hero"');
  if (heroPos !== -1) {
    const contextStart = Math.max(0, heroPos - 500);
    const contextEnd = Math.min(postContent.length, heroPos + 500);
    const context = postContent.substring(contextStart, contextEnd);

    // Write to file to see actual content
    try {
      const fs = require('fs');
      fs.writeFileSync('D:\\wpbakery-debug.txt', `Found hero at position: ${heroPos}\n\nContext (500 chars before and after):\n\n${context}\n\n===== FULL CONTENT =====\n\n${postContent.substring(0, 5000)}`);
      console.log('[WPBAKERY REPLACER] Debug info written to D:\\wpbakery-debug.txt');
    } catch (e) {
      console.log('[WPBAKERY REPLACER] Could not write debug file:', e);
    }

    console.log('[WPBAKERY REPLACER] Found "hero" class at position:', heroPos);
  } else {
    console.log('[WPBAKERY REPLACER] "hero" class string not found in content!');
  }

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

  // Helper: Generate city website URL
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

  const cityWebsiteUrl = location ? generateCityWebsiteUrl(location) : '';

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

  // ==================== HERO SECTION ====================
  if (!omit.includes('hero')) {
    console.log('\n[WPBAKERY REPLACER] ========== HERO SECTION ==========');
    console.log('[WPBAKERY REPLACER] Processing hero section...');

    const heroElement = findElementByClassOrId(content, 'hero');
    if (heroElement) {
      console.log(`[WPBAKERY REPLACER] ✅ Found hero in ${heroElement.elementType}`);
      console.log(`[WPBAKERY REPLACER] Hero content length: ${heroElement.match.length}`);
      console.log(`[WPBAKERY REPLACER] Hero content preview (first 500 chars):`);
      console.log(heroElement.match.substring(0, 500));

      let heroContent = heroElement.match;
      let updated = false;

      // Check if this is a Woodmart element (uses attributes instead of nested content)
      if (heroElement.elementType.startsWith('woodmart_')) {
        console.log('[WPBAKERY REPLACER] This is a Woodmart element - replacing attributes');

        let heroDesc = generatedContent.heroDescription || '';
        if (internalLinkPlacement === 'hero' && internalLinkUrl && companyName) {
          heroDesc = insertInternalLink(heroDesc, internalLinkUrl, companyName);
        }
        if (externalLinkPlacement === 'hero' && location && cityWebsiteUrl) {
          heroDesc = insertExternalLink(heroDesc, location, cityWebsiteUrl);
        }

        // Replace title attribute (H1)
        const titlePattern = /title="[^"]*"/i;
        if (titlePattern.test(heroContent)) {
          heroContent = heroContent.replace(titlePattern, `title="${generatedContent.h1}"`);
          logUpdate('hero', heroElement.elementType, 'hero h1', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Woodmart title attribute replaced');
          updated = true;
        } else {
          console.log('[WPBAKERY REPLACER] ❌ No title attribute found in Woodmart element');
        }

        // Replace after_title or subtitle attribute (description)
        const afterTitlePattern = /after_title="[^"]*"/i;
        const subtitlePattern = /subtitle="[^"]*"/i;

        if (afterTitlePattern.test(heroContent)) {
          heroContent = heroContent.replace(afterTitlePattern, `after_title="${heroDesc}"`);
          logUpdate('hero', heroElement.elementType, 'hero description', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Woodmart after_title attribute replaced');
          updated = true;
        } else if (subtitlePattern.test(heroContent)) {
          heroContent = heroContent.replace(subtitlePattern, `subtitle="${heroDesc}"`);
          logUpdate('hero', heroElement.elementType, 'hero description', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Woodmart subtitle attribute replaced');
          updated = true;
        } else {
          console.log('[WPBAKERY REPLACER] ❌ No after_title or subtitle attribute found in Woodmart element');
        }
      } else {
        // Standard WPBakery element (vc_*) - use nested content replacement
        console.log('[WPBAKERY REPLACER] This is a standard WPBakery element - replacing nested content');

        // Replace H1 - find vc_custom_heading or vc_column_text with h1
        console.log('[WPBAKERY REPLACER] Looking for H1 elements...');
        const h1Patterns = [
          /(\[vc_custom_heading[^\]]*\])([\s\S]*?)(\[\/vc_custom_heading\])/,
          /(\[vc_column_text[^\]]*\])(<h1[^>]*>[\s\S]*?<\/h1>)([\s\S]*?)(\[\/vc_column_text\])/
        ];

        let h1Found = false;
        for (let i = 0; i < h1Patterns.length; i++) {
          const pattern = h1Patterns[i];
          console.log(`[WPBAKERY REPLACER] Testing H1 pattern ${i + 1}...`);

          if (pattern.test(heroContent)) {
            console.log(`[WPBAKERY REPLACER] ✅ H1 pattern ${i + 1} matched!`);
            if (heroContent.includes('vc_custom_heading')) {
              heroContent = heroContent.replace(pattern, `$1<h1>${generatedContent.h1}</h1>$3`);
            } else {
              heroContent = heroContent.replace(pattern, `$1<h1>${generatedContent.h1}</h1>$4`);
            }
            logUpdate('hero', heroElement.elementType, 'hero h1', 'replaced');
            console.log('[WPBAKERY REPLACER] Hero H1 updated successfully');
            updated = true;
            h1Found = true;
            break;
          }
        }

        if (!h1Found) {
          console.log('[WPBAKERY REPLACER] ❌ No H1 pattern matched in hero content');
        }

        // Replace description - find vc_column_text (not the one with h1)
        console.log('[WPBAKERY REPLACER] Looking for hero description...');
        let heroDesc = generatedContent.heroDescription || '';
        if (internalLinkPlacement === 'hero' && internalLinkUrl && companyName) {
          heroDesc = insertInternalLink(heroDesc, internalLinkUrl, companyName);
        }
        if (externalLinkPlacement === 'hero' && location && cityWebsiteUrl) {
          heroDesc = insertExternalLink(heroDesc, location, cityWebsiteUrl);
        }

        // Find all vc_column_text elements, skip the one with h1, update the first other one
        const allTexts = heroContent.match(/\[vc_column_text[^\]]*\][\s\S]*?\[\/vc_column_text\]/g);
        console.log(`[WPBAKERY REPLACER] Found ${allTexts ? allTexts.length : 0} vc_column_text elements in hero`);

        if (allTexts && allTexts.length > 0) {
          for (let i = 0; i < allTexts.length; i++) {
            const textBlock = allTexts[i];
            console.log(`[WPBAKERY REPLACER] Checking text block ${i + 1}...`);

            if (!textBlock.includes('<h1')) {
              console.log(`[WPBAKERY REPLACER] ✅ Text block ${i + 1} doesn't have h1, using for description`);
              const replacement = textBlock.replace(/(\[vc_column_text[^\]]*\])([\s\S]*?)(\[\/vc_column_text\])/, `$1<p>${heroDesc}</p>$3`);
              heroContent = heroContent.replace(textBlock, replacement);
              logUpdate('hero', 'vc_column_text', 'hero description', 'replaced');
              console.log('[WPBAKERY REPLACER] Hero Description updated successfully');
              updated = true;
              break;
            }
          }
        } else {
          console.log('[WPBAKERY REPLACER] ❌ No vc_column_text elements found for description');
        }
      }

      if (updated) {
        console.log('[WPBAKERY REPLACER] ✅ Hero section updated, replacing in main content');
        content = content.substring(0, heroElement.startPos) + heroContent + content.substring(heroElement.endPos);
      } else {
        console.log('[WPBAKERY REPLACER] ⚠️ No updates made to hero section');
      }
    } else {
      console.log('[WPBAKERY REPLACER] ❌ Hero element not found');
    }
  }

  // ==================== BENEFITS SECTION ====================
  if (!omit.includes('benefits')) {
    console.log('\n[WPBAKERY REPLACER] ========== BENEFITS SECTION ==========');
    console.log('[WPBAKERY REPLACER] Processing benefits section...');

    const benefitsElement = findElementByClassOrId(content, 'benefits');
    if (benefitsElement) {
      console.log(`[WPBAKERY REPLACER] ✅ Found benefits in ${benefitsElement.elementType}`);

      let benefitsContent = benefitsElement.match;
      let updated = false;

      // Check if this is a Woodmart element
      if (benefitsElement.elementType.startsWith('woodmart_')) {
        console.log('[WPBAKERY REPLACER] This is a Woodmart element - replacing attributes');

        // Replace title attribute
        const titlePattern = /title="[^"]*"/i;
        if (titlePattern.test(benefitsContent)) {
          benefitsContent = benefitsContent.replace(titlePattern, `title="${generatedContent.benefitsHeading || 'Benefits'}"`);
          logUpdate('benefits', benefitsElement.elementType, 'benefits heading', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Woodmart title attribute replaced');
          updated = true;
        }

        // Replace subtitle attribute
        const subtitlePattern = /subtitle="[^"]*"/i;
        if (subtitlePattern.test(benefitsContent)) {
          benefitsContent = benefitsContent.replace(subtitlePattern, `subtitle="${generatedContent.benefitsSubheading || ''}"`);
          logUpdate('benefits', benefitsElement.elementType, 'benefits subheading', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Woodmart subtitle attribute replaced');
          updated = true;
        }

        // Note: Bullets are in a separate element
        console.log('[WPBAKERY REPLACER] ℹ️ Bullets should be in separate "benefits-bullets" element');

      } else {
        // Standard WPBakery element - use nested content replacement
        console.log('[WPBAKERY REPLACER] This is a standard WPBakery element - replacing nested content');

        const benefitsHtml = `<h2>${generatedContent.benefitsHeading || 'Benefits'}</h2>
<p>&nbsp;</p>
<h3>${generatedContent.benefitsSubheading || ''}</h3>
<p>&nbsp;</p>
<ul>
${(generatedContent.benefitsBullets || []).map((bullet: string) => `<li>${bullet}</li>`).join('\n')}
</ul>`;

        benefitsContent = replaceTextInContainer(benefitsElement.match, benefitsHtml);
        logUpdate('benefits', benefitsElement.elementType, 'benefits section', 'replaced');
        console.log('[WPBAKERY REPLACER] ✅ Benefits section updated');
        updated = true;
      }

      if (updated) {
        content = content.substring(0, benefitsElement.startPos) + benefitsContent + content.substring(benefitsElement.endPos);
      }
    } else {
      console.log('[WPBAKERY REPLACER] ❌ Benefits element not found');
    }

    // Find and replace benefits bullets (separate element)
    console.log('[WPBAKERY REPLACER] Looking for benefits-bullets element...');
    const benefitsBulletsElement = findElementByClassOrId(content, 'benefits-bullets');
    if (benefitsBulletsElement && generatedContent.benefitsBullets && generatedContent.benefitsBullets.length > 0) {
      console.log(`[WPBAKERY REPLACER] ✅ Found benefits-bullets in ${benefitsBulletsElement.elementType}`);

      let bulletsContent = benefitsBulletsElement.match;
      const listMatch = bulletsContent.match(/\[woodmart_list[^\]]*list="([^"]+)"[^\]]*\]/);

      if (listMatch) {
        console.log('[WPBAKERY REPLACER] Found woodmart_list with encoded list attribute');
        try {
          // Decode URL-encoded JSON
          const encodedList = listMatch[1];
          const decodedList = decodeURIComponent(encodedList);
          console.log('[WPBAKERY REPLACER] Decoded list JSON (first 200 chars):', decodedList.substring(0, 200));

          // Parse JSON array
          const listItems = JSON.parse(decodedList);
          console.log('[WPBAKERY REPLACER] Parsed', listItems.length, 'list items');

          // Replace list item content with new bullets
          const newListItems = generatedContent.benefitsBullets.map((bullet: string) => ({
            'list-content': bullet,
            'item_type': 'inherit'
          }));

          // Stringify and URL-encode
          const newListJson = JSON.stringify(newListItems);
          const newEncodedList = encodeURIComponent(newListJson);

          // Replace in content
          bulletsContent = bulletsContent.replace(/list="[^"]+"/, `list="${newEncodedList}"`);
          content = content.substring(0, benefitsBulletsElement.startPos) + bulletsContent + content.substring(benefitsBulletsElement.endPos);

          logUpdate('benefits-bullets', 'woodmart_list', 'benefits bullets', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Benefits bullets replaced');
        } catch (error: any) {
          console.log('[WPBAKERY REPLACER] ❌ Failed to parse/replace woodmart_list:', error.message);
        }
      } else {
        console.log('[WPBAKERY REPLACER] ❌ No woodmart_list found in benefits-bullets element');
      }
    } else {
      console.log('[WPBAKERY REPLACER] ❌ Benefits-bullets element not found or no bullets to replace');
    }
  }

  // ==================== WHY SECTION ====================
  if (!omit.includes('why')) {
    console.log('\n[WPBAKERY REPLACER] ========== WHY SECTION ==========');
    console.log('[WPBAKERY REPLACER] Processing why section...');

    const whyElement = findElementByClassOrId(content, 'why');
    if (whyElement) {
      console.log(`[WPBAKERY REPLACER] ✅ Found why in ${whyElement.elementType}`);

      let whyContent = whyElement.match;
      let updated = false;

      // Check if this is a Woodmart element
      if (whyElement.elementType.startsWith('woodmart_')) {
        console.log('[WPBAKERY REPLACER] This is a Woodmart element - replacing attributes');

        // Replace title attribute
        const titlePattern = /title="[^"]*"/i;
        if (titlePattern.test(whyContent)) {
          whyContent = whyContent.replace(titlePattern, `title="${generatedContent.whyHeading || 'Why Choose Us'}"`);
          logUpdate('why', whyElement.elementType, 'why heading', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Woodmart title attribute replaced');
          updated = true;
        }

        // Replace subtitle attribute
        const subtitlePattern = /subtitle="[^"]*"/i;
        if (subtitlePattern.test(whyContent)) {
          whyContent = whyContent.replace(subtitlePattern, `subtitle="${generatedContent.whySubheading || ''}"`);
          logUpdate('why', whyElement.elementType, 'why subheading', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Woodmart subtitle attribute replaced');
          updated = true;
        }

        // Note: Bullets are in a separate element
        console.log('[WPBAKERY REPLACER] ℹ️ Bullets should be in separate "why-bullets" element');

      } else {
        // Standard WPBakery element - use nested content replacement
        console.log('[WPBAKERY REPLACER] This is a standard WPBakery element - replacing nested content');

        const whyHtml = `<h2>${generatedContent.whyHeading || 'Why Choose Us'}</h2>
<p>&nbsp;</p>
<h3>${generatedContent.whySubheading || ''}</h3>
<p>&nbsp;</p>
<ul>
${(generatedContent.whyBullets || []).map((bullet: string) => `<li>${bullet}</li>`).join('\n')}
</ul>`;

        whyContent = replaceTextInContainer(whyElement.match, whyHtml);
        logUpdate('why', whyElement.elementType, 'why section', 'replaced');
        console.log('[WPBAKERY REPLACER] ✅ Why section updated');
        updated = true;
      }

      if (updated) {
        content = content.substring(0, whyElement.startPos) + whyContent + content.substring(whyElement.endPos);
      }
    } else {
      console.log('[WPBAKERY REPLACER] ❌ Why element not found');
    }

    // Find and replace why bullets (separate element)
    console.log('[WPBAKERY REPLACER] Looking for why-bullets element...');
    const whyBulletsElement = findElementByClassOrId(content, 'why-bullets');
    if (whyBulletsElement && generatedContent.whyBullets && generatedContent.whyBullets.length > 0) {
      console.log(`[WPBAKERY REPLACER] ✅ Found why-bullets in ${whyBulletsElement.elementType}`);

      let bulletsContent = whyBulletsElement.match;
      let updated = false;

      // Check for woodmart_list with URL-encoded JSON list attribute
      const listMatch = bulletsContent.match(/\[woodmart_list[^\]]*list="([^"]+)"[^\]]*\]/);

      if (listMatch) {
        console.log('[WPBAKERY REPLACER] Found woodmart_list with encoded list attribute');

        try {
          // Decode the URL-encoded JSON
          const encodedList = listMatch[1];
          const decodedList = decodeURIComponent(encodedList);
          const listItems = JSON.parse(decodedList);

          console.log(`[WPBAKERY REPLACER] Decoded ${listItems.length} existing list items`);
          console.log(`[WPBAKERY REPLACER] Replacing with ${generatedContent.whyBullets.length} new bullets`);

          // Create new list items with the same structure
          const newListItems = generatedContent.whyBullets.map((bullet: string) => ({
            'list-content': bullet,
            'item_type': 'inherit'
          }));

          // Encode the new list
          const newListJson = JSON.stringify(newListItems);
          const newEncodedList = encodeURIComponent(newListJson);

          // Replace the list attribute
          bulletsContent = bulletsContent.replace(/list="[^"]+"/, `list="${newEncodedList}"`);

          console.log('[WPBAKERY REPLACER] ✅ Woodmart list attribute replaced');
          logUpdate('why-bullets', 'woodmart_list', 'why bullets', 'replaced');
          updated = true;

        } catch (error) {
          console.error('[WPBAKERY REPLACER] ❌ Failed to parse/replace woodmart list:', error);
        }
      } else {
        // Standard WPBakery list - try nested content replacement
        console.log('[WPBAKERY REPLACER] No woodmart_list found - trying standard list replacement');

        const whyBulletsHtml = `<ul>
${generatedContent.whyBullets.map((bullet: string) => `<li>${bullet}</li>`).join('\n')}
</ul>`;

        bulletsContent = replaceTextInContainer(whyBulletsElement.match, whyBulletsHtml);
        logUpdate('why-bullets', whyBulletsElement.elementType, 'why bullets', 'replaced');
        console.log('[WPBAKERY REPLACER] ✅ Why bullets updated');
        updated = true;
      }

      if (updated) {
        content = content.substring(0, whyBulletsElement.startPos) + bulletsContent + content.substring(whyBulletsElement.endPos);
      }
    } else {
      console.log('[WPBAKERY REPLACER] ❌ Why-bullets element not found or no bullets to replace');
    }
  }

  // ==================== FAQ SECTION ====================
  if (!omit.includes('faq')) {
    console.log('\n[WPBAKERY REPLACER] ========== FAQ SECTION ==========');
    console.log('[WPBAKERY REPLACER] Processing FAQ section...');
    const faqs = generatedContent.faqs || [];

    if (faqs && faqs.length > 0) {
      console.log(`[WPBAKERY REPLACER] Have ${faqs.length} FAQs to replace`);

      // Strategy 1: Try to find a container with el_class="faqs" or el_id="faqs"
      const faqContainer = findElementByClassOrId(content, 'faqs');

      if (faqContainer && (faqContainer.elementType === 'vc_column' || faqContainer.elementType === 'vc_row' || faqContainer.elementType.includes('section') || faqContainer.elementType.includes('container'))) {
        console.log(`[WPBAKERY REPLACER] ✅ Found FAQ container: ${faqContainer.elementType}`);

        let containerContent = faqContainer.match;
        const togglePattern = /\[(?:vc_toggle|woodmart_accordion_item)[^\]]*\][\s\S]*?\[\/(?:vc_toggle|woodmart_accordion_item)\]/g;
        const existingToggles = containerContent.match(togglePattern);

        if (existingToggles && existingToggles.length > 0) {
          console.log(`[WPBAKERY REPLACER] Found ${existingToggles.length} toggles in container`);

          // Create new toggle items
          const newToggleItems = faqs.map((faq: { question: string; answer: string }) =>
            `[vc_toggle title="${faq.question}"]${faq.answer}[/vc_toggle]`
          ).join('\n');

          // Replace ALL existing toggles
          let replacedOnce = false;
          containerContent = containerContent.replace(togglePattern, () => {
            if (!replacedOnce) {
              replacedOnce = true;
              return newToggleItems;
            }
            return ''; // Remove subsequent toggles
          });

          content = content.substring(0, faqContainer.startPos) + containerContent + content.substring(faqContainer.endPos);
          logUpdate('faq', faqContainer.elementType, 'faq toggles', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Replaced all FAQ toggles in container');
        } else {
          console.log('[WPBAKERY REPLACER] ⚠️ No toggles found in container');
        }
      } else {
        // Strategy 2: Find ALL vc_toggle or woodmart_accordion_item elements in the entire content and replace them
        console.log('[WPBAKERY REPLACER] No FAQ container found, looking for individual toggle elements...');

        const togglePattern = /\[(?:vc_toggle|woodmart_accordion_item)[^\]]*\][\s\S]*?\[\/(?:vc_toggle|woodmart_accordion_item)\]/g;
        const existingToggles = content.match(togglePattern);

        if (existingToggles && existingToggles.length > 0) {
          console.log(`[WPBAKERY REPLACER] ✅ Found ${existingToggles.length} individual toggle elements`);

          // Create new toggle items
          const newToggleItems = faqs.map((faq: { question: string; answer: string }) =>
            `[vc_toggle title="${faq.question}"]${faq.answer}[/vc_toggle]`
          ).join('\n');

          // Replace ALL toggles with new ones
          let toggleCount = 0;
          content = content.replace(togglePattern, () => {
            toggleCount++;
            if (toggleCount === 1) {
              // First toggle: replace with all new FAQs
              console.log(`[WPBAKERY REPLACER] Replacing toggle #${toggleCount} with all ${faqs.length} new FAQs`);
              return newToggleItems;
            } else {
              // Subsequent toggles: remove them
              console.log(`[WPBAKERY REPLACER] Removing toggle #${toggleCount}`);
              return '';
            }
          });

          logUpdate('faq', 'vc_toggle', 'faq toggles', 'replaced');
          console.log(`[WPBAKERY REPLACER] ✅ Replaced ${existingToggles.length} toggles with ${faqs.length} new FAQs`);
        } else {
          console.log('[WPBAKERY REPLACER] ❌ No toggle elements found in template');
          console.log('[WPBAKERY REPLACER] 💡 Tip: Add [vc_toggle] elements to your template or wrap them in a container with el_class="faqs"');
        }
      }
    } else {
      console.log('[WPBAKERY REPLACER] ⚠️ No FAQs provided in generated content');
    }
  }

  // ==================== MAP SECTION ====================
  if (!omit.includes('map')) {
    console.log('\n[WPBAKERY REPLACER] ========== MAP SECTION ==========');
    console.log('[WPBAKERY REPLACER] Processing map section...');

    // Replace map description text first
    if (generatedContent.mapDescription) {
      console.log('[WPBAKERY REPLACER] Looking for map-description element...');
      const mapDescElement = findElementByClassOrId(content, 'map-description');

      if (mapDescElement) {
        console.log(`[WPBAKERY REPLACER] ✅ Found map-description in ${mapDescElement.elementType}`);

        let updatedDesc = mapDescElement.match;
        let attributeReplaced = false;

        // Check if this is a Woodmart element with attributes
        if (mapDescElement.elementType.startsWith('woodmart_')) {
          console.log('[WPBAKERY REPLACER] This is a Woodmart element - trying attributes first');

          // For map description, prioritize after_title (the description field), NOT title (the heading)
          // Try after_title attribute first (this is the description text)
          if (/after_title="[^"]*"/i.test(updatedDesc)) {
            updatedDesc = updatedDesc.replace(/after_title="[^"]*"/i, `after_title="${generatedContent.mapDescription}"`);
            console.log('[WPBAKERY REPLACER] ✅ Replaced after_title attribute (description text)');
            attributeReplaced = true;
          }
          // If no after_title, DON'T replace title or subtitle - they are headings!
          // Instead, look for nested content
          else {
            console.log('[WPBAKERY REPLACER] ⚠️ No after_title attribute found - will try nested content (NOT replacing title/subtitle)');
          }
        }

        // If not Woodmart OR no attributes were replaced, try nested content replacement
        if (!mapDescElement.elementType.startsWith('woodmart_') || !attributeReplaced) {
          console.log('[WPBAKERY REPLACER] Trying nested content replacement...');
          updatedDesc = replaceTextInContainer(mapDescElement.match, generatedContent.mapDescription);
          console.log('[WPBAKERY REPLACER] ✅ Replaced nested content');
        }

        content = content.substring(0, mapDescElement.startPos) + updatedDesc + content.substring(mapDescElement.endPos);
        logUpdate('map', mapDescElement.elementType, 'map description', 'replaced');
        console.log('[WPBAKERY REPLACER] ✅ Map description replaced');
      } else {
        console.log('[WPBAKERY REPLACER] ⚠️ Map description element not found (el_class="map-description")');
      }
    }

    // Replace map iframe
    if (generatedContent.mapIframe) {
      console.log('[WPBAKERY REPLACER] Have mapIframe to insert');
      console.log('[WPBAKERY REPLACER] Map iframe preview:', generatedContent.mapIframe.substring(0, 100) + '...');

      // Try multiple identifiers for the map element
      let mapElement = findElementByClassOrId(content, 'map-iframe');
      if (!mapElement) {
        console.log('[WPBAKERY REPLACER] "map-iframe" not found, trying "map"...');
        mapElement = findElementByClassOrId(content, 'map');
      }
      if (!mapElement) {
        console.log('[WPBAKERY REPLACER] "map" not found, trying "google-map"...');
        mapElement = findElementByClassOrId(content, 'google-map');
      }

      if (mapElement) {
        console.log(`[WPBAKERY REPLACER] ✅ Found map element: ${mapElement.elementType}`);

        let updated = mapElement.match;
        let replacementSuccess = false;

        // Handle vc_raw_html (requires base64 encoding)
        if (mapElement.elementType === 'vc_raw_html') {
          console.log('[WPBAKERY REPLACER] Map is in vc_raw_html - encoding to base64');

          // Extract old base64 content
          const oldContentMatch = mapElement.match.match(/\[vc_raw_html[^\]]*\]([\s\S]*?)\[\/vc_raw_html\]/);
          const oldBase64 = oldContentMatch ? oldContentMatch[1] : '';
          console.log('[WPBAKERY REPLACER] Old base64 length:', oldBase64.length);
          console.log('[WPBAKERY REPLACER] Old base64 preview:', oldBase64.substring(0, 50) + '...');

          // Try to decode old content to see what it was
          try {
            const oldDecoded = Buffer.from(oldBase64, 'base64').toString('utf8');
            console.log('[WPBAKERY REPLACER] Old decoded preview:', oldDecoded.substring(0, 100) + '...');
          } catch (e) {
            console.log('[WPBAKERY REPLACER] Could not decode old content');
          }

          // Encode new iframe
          const encodedIframe = Buffer.from(generatedContent.mapIframe).toString('base64');
          console.log('[WPBAKERY REPLACER] New base64 length:', encodedIframe.length);
          console.log('[WPBAKERY REPLACER] New base64 preview:', encodedIframe.substring(0, 50) + '...');

          // Replace
          updated = mapElement.match.replace(/(\[vc_raw_html[^\]]*\])([\s\S]*?)(\[\/vc_raw_html\])/, `$1${encodedIframe}$3`);
          replacementSuccess = true;
          logUpdate('map', 'vc_raw_html', 'map iframe', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Map iframe (raw_html) replaced');
        }
        // Handle vc_raw_js (also requires base64 encoding)
        else if (mapElement.elementType === 'vc_raw_js') {
          console.log('[WPBAKERY REPLACER] Map is in vc_raw_js - encoding to base64');
          const encodedIframe = Buffer.from(generatedContent.mapIframe).toString('base64');
          updated = mapElement.match.replace(/(\[vc_raw_js[^\]]*\])([\s\S]*?)(\[\/vc_raw_js\])/, `$1${encodedIframe}$3`);
          replacementSuccess = true;
          logUpdate('map', 'vc_raw_js', 'map iframe', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Map iframe (raw_js) replaced');
        }
        // Handle vc_column_text or other text containers
        else if (mapElement.elementType === 'vc_column_text' || mapElement.elementType === 'vc_text_separator') {
          console.log('[WPBAKERY REPLACER] Map is in text container - replacing content directly');
          updated = replaceTextInContainer(mapElement.match, generatedContent.mapIframe);
          replacementSuccess = true;
          logUpdate('map', mapElement.elementType, 'map iframe', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Map iframe replaced');
        }
        // Handle Woodmart HTML block
        else if (mapElement.elementType.startsWith('woodmart_')) {
          console.log('[WPBAKERY REPLACER] Map is in Woodmart element - replacing nested content');
          updated = replaceTextInContainer(mapElement.match, generatedContent.mapIframe);
          replacementSuccess = true;
          logUpdate('map', mapElement.elementType, 'map iframe', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Map iframe replaced in Woodmart element');
        }
        // Generic fallback
        else {
          console.log(`[WPBAKERY REPLACER] Trying generic replacement for ${mapElement.elementType}`);
          updated = replaceTextInContainer(mapElement.match, generatedContent.mapIframe);
          replacementSuccess = true;
          logUpdate('map', mapElement.elementType, 'map iframe', 'replaced');
          console.log('[WPBAKERY REPLACER] ✅ Map iframe replaced (generic)');
        }

        if (replacementSuccess) {
          content = content.substring(0, mapElement.startPos) + updated + content.substring(mapElement.endPos);
        }
      } else {
        console.log('[WPBAKERY REPLACER] ❌ Map element not found (tried: map-iframe, map, google-map)');
        console.log('[WPBAKERY REPLACER] 💡 Tip: Add el_class="map" or el_id="map" to your map container in the template');
      }
    } else {
      console.log('[WPBAKERY REPLACER] ⚠️ No mapIframe provided in generated content');
    }
  }

  // Final Summary
  console.log('\n============================================================');
  console.log('[WPBAKERY REPLACER] ✅ REPLACEMENT COMPLETE');
  console.log('============================================================');
  console.log('[WPBAKERY REPLACER] 📊 SUMMARY:');
  console.log('[WPBAKERY REPLACER] Sections found:', replacementLog.sectionsFound.length, '-', replacementLog.sectionsFound.join(', '));
  console.log('[WPBAKERY REPLACER] Sections updated:', replacementLog.sectionsUpdated.length, '-', replacementLog.sectionsUpdated.join(', '));
  console.log('[WPBAKERY REPLACER] Element details:', replacementLog.elementDetails.length, 'operations');

  if (replacementLog.warnings.length > 0) {
    console.log('\n[WPBAKERY REPLACER] ⚠️ WARNINGS:', replacementLog.warnings.length);
    replacementLog.warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. ${warning}`);
    });
  }

  if (replacementLog.errors.length > 0) {
    console.log('\n[WPBAKERY REPLACER] ❌ ERRORS:', replacementLog.errors.length);
    replacementLog.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }

  // Success/failure analysis
  const expectedSections = ['hero', 'benefits', 'why', 'faq', 'map'].filter(s => !omit.includes(s));
  const missingSections = expectedSections.filter(s => !replacementLog.sectionsUpdated.some(u => u.includes(s)));
  if (missingSections.length > 0) {
    console.log('\n[WPBAKERY REPLACER] ⚠️ MISSING SECTIONS:', missingSections.join(', '));
    console.log('[WPBAKERY REPLACER] 💡 These sections were not updated. Check:');
    console.log('   1. Element has correct el_class or el_id attribute');
    console.log('   2. Element type is supported (vc_* or woodmart_*)');
    console.log('   3. Content structure matches expected format');
    replacementLog.warnings.push(`Missing sections: ${missingSections.join(', ')}`);
  }

  console.log('\n[WPBAKERY REPLACER] Final content length:', content.length, 'characters');
  console.log('[WPBAKERY REPLACER] Change:', content.length - postContent.length, 'characters');
  console.log('============================================================\n');

  return {
    data: content,
    log: replacementLog,
  };
}

/**
 * Helper: Extract current structure from WPBakery template
 */
export function analyzeWPBakeryTemplate(postContent: string): {
  modules: Array<{ id: string; type: string; preview: string }>;
} {
  const modules: Array<{ id: string; type: string; preview: string }> = [];

  // Find all vc_column_text modules with id or el_id
  const textModulePattern = /\[vc_column_text[^\]]*(?:id|el_id)="([^"]+)"[^\]]*\]([^\[]{0,100})/g;
  let match;
  while ((match = textModulePattern.exec(postContent)) !== null) {
    modules.push({
      id: match[1],
      type: 'vc_column_text',
      preview: match[2].substring(0, 50) + '...',
    });
  }

  // Find all vc_toggle modules
  const togglePattern = /\[vc_toggle[^\]]*(?:id|el_id)="([^"]+)"[^\]]*title="([^"]*)"[^\]]*\]/g;
  while ((match = togglePattern.exec(postContent)) !== null) {
    modules.push({
      id: match[1],
      type: 'vc_toggle',
      preview: `Q: ${match[2]}`,
    });
  }

  return { modules };
}
