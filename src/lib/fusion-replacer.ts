/**
 * Fusion Builder (Avada) Content Replacement Utility
 * Handles Avada's shortcode-based structure: [fusion_title], [fusion_text], [fusion_accordion], [fusion_code]
 *
 * CSS ID convention matches other builders:
 *   hero-h1, hero-description, benefits-heading, benefits-subheading, benefits-bullets,
 *   why-heading, why-subheading, why-bullets, faq-heading, faq-description, faq-questions,
 *   map-description (map iframe is in a [fusion_code] block, found by proximity)
 */

export interface FusionReplacementLog {
  sectionsFound: string[];
  sectionsUpdated: string[];
  elementDetails: Array<{
    cssId: string;
    moduleType: string;
    section: string;
    action: string;
  }>;
}

interface FusionElement {
  fullMatch: string;
  tagName: string;
  openTag: string;
  innerContent: string;
  closeTag: string;
  startPos: number;
  endPos: number;
}

/**
 * Find a Fusion Builder shortcode element by its id attribute
 */
function findFusionElement(content: string, cssId: string): FusionElement | null {
  const idAttr = `id="${cssId}"`;
  const idIndex = content.indexOf(idAttr);
  if (idIndex === -1) return null;

  // Walk backward to find [fusion_*
  let openBracket = content.lastIndexOf('[', idIndex);
  if (openBracket === -1) return null;

  // Verify this is a fusion shortcode
  const tagMatch = content.substring(openBracket).match(/^\[(fusion_\w+)/);
  if (!tagMatch) return null;
  const tagName = tagMatch[1];

  // Find closing bracket of opening tag
  const openTagEnd = content.indexOf(']', idIndex);
  if (openTagEnd === -1) return null;
  const openTag = content.substring(openBracket, openTagEnd + 1);

  // Self-closing shortcode check
  if (openTag.endsWith('/]')) {
    return {
      fullMatch: openTag,
      tagName,
      openTag,
      innerContent: '',
      closeTag: '',
      startPos: openBracket,
      endPos: openTagEnd + 1,
    };
  }

  // Find matching closing tag - handle nesting by counting open/close of same tag
  const closeTag = `[/${tagName}]`;
  const openPattern = `[${tagName} `;
  const openPatternAlt = `[${tagName}]`; // self-closing without attributes
  let depth = 1;
  let searchPos = openTagEnd + 1;

  while (depth > 0 && searchPos < content.length) {
    const nextOpen = content.indexOf(`[${tagName}`, searchPos);
    const nextClose = content.indexOf(closeTag, searchPos);

    if (nextClose === -1) return null; // No closing tag found

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Check if this is actually an opening tag (not a different shortcode like fusion_title vs fusion_title_sep)
      const charAfterTag = content[nextOpen + tagName.length + 1];
      if (charAfterTag === ' ' || charAfterTag === ']') {
        depth++;
      }
      searchPos = nextOpen + 1;
    } else {
      depth--;
      if (depth === 0) {
        const innerContent = content.substring(openTagEnd + 1, nextClose);
        return {
          fullMatch: content.substring(openBracket, nextClose + closeTag.length),
          tagName,
          openTag,
          innerContent,
          closeTag,
          startPos: openBracket,
          endPos: nextClose + closeTag.length,
        };
      }
      searchPos = nextClose + 1;
    }
  }

  return null;
}

/**
 * Extract the heading level (h1, h2, h3, etc.) from HTML content inside a fusion_title
 */
function detectHeadingLevel(html: string): string {
  const match = html.match(/<(h[1-6])\b/i);
  return match ? match[1].toLowerCase() : 'h2';
}

/**
 * Replace text content inside heading tags while preserving the tag level
 * For fusion_title elements that contain <h1>...<span style="...">TEXT</span>...</h1>
 */
function replaceHeadingText(innerHtml: string, newText: string): string {
  const level = detectHeadingLevel(innerHtml);
  return ` <${level}>${newText}</${level}> `;
}

// Helper: Generate city website URL for external link
function generateCityWebsiteUrl(loc: string): string {
  if (!loc) return '';
  const parts = loc.split(',').map(p => p.trim());
  const cityName = parts[0];
  const state = parts[1] || '';
  const citySlug = cityName.replace(/\s+/g, '_');
  const stateSlug = state.replace(/\s+/g, '_');
  if (state) {
    return `https://en.wikipedia.org/wiki/${citySlug},_${stateSlug}`;
  }
  return `https://en.wikipedia.org/wiki/${citySlug}`;
}

// Helper: Insert internal link (first mention of company name)
function insertInternalLink(text: string, linkUrl: string, companyName: string): string {
  if (!text || !linkUrl || !companyName) return text;
  const linkHtml = `<a href="${linkUrl}" style="text-decoration: underline; display: inline;">${companyName}</a>`;
  const companyPattern = new RegExp(`\\b${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (companyPattern.test(text)) {
    return text.replace(companyPattern, linkHtml);
  }
  return `Trust ${linkHtml} to deliver reliable services. ${text}`;
}

// Helper: Insert external link (first mention of location)
function insertExternalLink(text: string, location: string, cityWebsiteUrl: string): string {
  if (!text || !location || !cityWebsiteUrl) return text;
  const linkHtml = `<a href="${cityWebsiteUrl}" target="_blank" style="text-decoration: underline; display: inline;">${location}</a>`;
  const locationPattern = new RegExp(`\\b${location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (locationPattern.test(text)) {
    return text.replace(locationPattern, linkHtml);
  }
  return text;
}

export function replaceFusionContent(
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
): { data: string; log: FusionReplacementLog } {
  if (!postContent || typeof postContent !== 'string') {
    return {
      data: postContent,
      log: { sectionsFound: [], sectionsUpdated: [], elementDetails: [] },
    };
  }

  let content = postContent;
  const replacementLog: FusionReplacementLog = {
    sectionsFound: [],
    sectionsUpdated: [],
    elementDetails: [],
  };
  const omit = omitSections || [];

  const cityWebsiteUrl = externalLinkUrlOverride || (location ? generateCityWebsiteUrl(location) : '');

  console.log('[FUSION REPLACER] Starting replacement...');
  console.log('[FUSION REPLACER] Content length:', postContent.length);
  console.log('[FUSION REPLACER] Omit sections:', omit);

  // Extract all id= values for debug
  const idPattern = /\bid="([^"]+)"/g;
  const foundIds: string[] = [];
  let m;
  while ((m = idPattern.exec(postContent)) !== null) {
    foundIds.push(m[1]);
  }
  console.log('[FUSION REPLACER] Found IDs in template:', foundIds);

  const logUpdate = (cssId: string, moduleType: string, section: string, action: string) => {
    const sectionKey = section.split(' ')[0];
    if (!replacementLog.sectionsFound.includes(sectionKey)) {
      replacementLog.sectionsFound.push(sectionKey);
    }
    if (!replacementLog.sectionsUpdated.includes(section)) {
      replacementLog.sectionsUpdated.push(section);
    }
    replacementLog.elementDetails.push({ cssId, moduleType, section, action });
  };

  // ==================== HERO SECTION ====================
  if (!omit.includes('hero')) {
    console.log('[FUSION REPLACER] Processing hero section...');

    // Hero H1
    const heroH1 = findFusionElement(content, 'hero-h1');
    if (heroH1) {
      const newInner = replaceHeadingText(heroH1.innerContent, generatedContent.h1);
      content = content.substring(0, heroH1.startPos) +
        heroH1.openTag + newInner + heroH1.closeTag +
        content.substring(heroH1.endPos);
      logUpdate('hero-h1', heroH1.tagName, 'hero h1', 'replaced heading text');
      console.log('[FUSION REPLACER] Hero H1 updated');
    } else {
      console.log('[FUSION REPLACER] hero-h1 not found');
    }

    // Hero Description
    const heroDesc = findFusionElement(content, 'hero-description');
    if (heroDesc) {
      let descText = generatedContent.heroDescription || '';

      if (internalLinkPlacement === 'hero' && internalLinkUrl && companyName) {
        descText = insertInternalLink(descText, internalLinkUrl, companyName);
      }
      if (externalLinkPlacement === 'hero' && location && cityWebsiteUrl) {
        descText = insertExternalLink(descText, location, cityWebsiteUrl);
      }

      content = content.substring(0, heroDesc.startPos) +
        heroDesc.openTag + `<p>${descText}</p>` + heroDesc.closeTag +
        content.substring(heroDesc.endPos);
      logUpdate('hero-description', heroDesc.tagName, 'hero description', 'replaced');
      console.log('[FUSION REPLACER] Hero description updated');
    } else {
      console.log('[FUSION REPLACER] hero-description not found');
    }
  }

  // ==================== BENEFITS SECTION ====================
  if (!omit.includes('benefits')) {
    console.log('[FUSION REPLACER] Processing benefits section...');

    // Benefits Heading
    const benefitsHeading = findFusionElement(content, 'benefits-heading');
    if (benefitsHeading) {
      const heading = generatedContent.benefitsHeading || 'Benefits';
      const newInner = replaceHeadingText(benefitsHeading.innerContent, heading);
      content = content.substring(0, benefitsHeading.startPos) +
        benefitsHeading.openTag + newInner + benefitsHeading.closeTag +
        content.substring(benefitsHeading.endPos);
      logUpdate('benefits-heading', benefitsHeading.tagName, 'benefits heading', 'replaced heading text');
      console.log('[FUSION REPLACER] Benefits heading updated');
    }

    // Benefits Subheading
    const benefitsSub = findFusionElement(content, 'benefits-subheading');
    if (benefitsSub) {
      const subheading = generatedContent.benefitsSubheading || '';
      const newInner = replaceHeadingText(benefitsSub.innerContent, subheading);
      content = content.substring(0, benefitsSub.startPos) +
        benefitsSub.openTag + newInner + benefitsSub.closeTag +
        content.substring(benefitsSub.endPos);
      logUpdate('benefits-subheading', benefitsSub.tagName, 'benefits subheading', 'replaced heading text');
      console.log('[FUSION REPLACER] Benefits subheading updated');
    }

    // Benefits Bullets
    const benefitsBullets = findFusionElement(content, 'benefits-bullets');
    if (benefitsBullets) {
      const bullets = generatedContent.benefitsBullets || [];
      let bulletsHtml: string;

      if (internalLinkPlacement === 'benefits' && internalLinkUrl && companyName && bullets.length > 0) {
        bullets[0] = insertInternalLink(bullets[0], internalLinkUrl, companyName);
      }
      if (externalLinkPlacement === 'benefits' && location && cityWebsiteUrl && bullets.length > 0) {
        bullets[0] = insertExternalLink(bullets[0], location, cityWebsiteUrl);
      }

      bulletsHtml = `<ul>\n${bullets.map((b: string) => `<li>${b}</li>`).join('\n')}\n</ul>`;

      content = content.substring(0, benefitsBullets.startPos) +
        benefitsBullets.openTag + bulletsHtml + benefitsBullets.closeTag +
        content.substring(benefitsBullets.endPos);
      logUpdate('benefits-bullets', benefitsBullets.tagName, 'benefits bullets', `replaced ${bullets.length} bullets`);
      console.log('[FUSION REPLACER] Benefits bullets updated');
    }
  }

  // ==================== WHY SECTION ====================
  if (!omit.includes('why')) {
    console.log('[FUSION REPLACER] Processing why section...');

    // Why Heading
    const whyHeading = findFusionElement(content, 'why-heading');
    if (whyHeading) {
      const heading = generatedContent.whyHeading || 'Why Choose Us';
      const newInner = replaceHeadingText(whyHeading.innerContent, heading);
      content = content.substring(0, whyHeading.startPos) +
        whyHeading.openTag + newInner + whyHeading.closeTag +
        content.substring(whyHeading.endPos);
      logUpdate('why-heading', whyHeading.tagName, 'why heading', 'replaced heading text');
      console.log('[FUSION REPLACER] Why heading updated');
    }

    // Why Subheading
    const whySub = findFusionElement(content, 'why-subheading');
    if (whySub) {
      const subheading = generatedContent.whySubheading || '';
      const newInner = replaceHeadingText(whySub.innerContent, subheading);
      content = content.substring(0, whySub.startPos) +
        whySub.openTag + newInner + whySub.closeTag +
        content.substring(whySub.endPos);
      logUpdate('why-subheading', whySub.tagName, 'why subheading', 'replaced heading text');
      console.log('[FUSION REPLACER] Why subheading updated');
    }

    // Why Bullets
    const whyBullets = findFusionElement(content, 'why-bullets');
    if (whyBullets) {
      const bullets = generatedContent.whyBullets || [];

      if (internalLinkPlacement === 'why' && internalLinkUrl && companyName && bullets.length > 0) {
        bullets[0] = insertInternalLink(bullets[0], internalLinkUrl, companyName);
      }
      if (externalLinkPlacement === 'why' && location && cityWebsiteUrl && bullets.length > 0) {
        bullets[0] = insertExternalLink(bullets[0], location, cityWebsiteUrl);
      }

      const bulletsHtml = `<ul>\n${bullets.map((b: string) => `<li>${b}</li>`).join('\n')}\n</ul>`;

      content = content.substring(0, whyBullets.startPos) +
        whyBullets.openTag + bulletsHtml + whyBullets.closeTag +
        content.substring(whyBullets.endPos);
      logUpdate('why-bullets', whyBullets.tagName, 'why bullets', `replaced ${bullets.length} bullets`);
      console.log('[FUSION REPLACER] Why bullets updated');
    }
  }

  // ==================== FAQ SECTION ====================
  if (!omit.includes('faq')) {
    console.log('[FUSION REPLACER] Processing FAQ section...');
    const faqs = generatedContent.faqs || [];

    // FAQ Heading
    const faqHeading = findFusionElement(content, 'faq-heading');
    if (faqHeading) {
      const heading = generatedContent.faqHeading || (faqs.length > 0 ? 'Frequently Asked Questions' : '');
      if (heading) {
        const newInner = replaceHeadingText(faqHeading.innerContent, heading);
        content = content.substring(0, faqHeading.startPos) +
          faqHeading.openTag + newInner + faqHeading.closeTag +
          content.substring(faqHeading.endPos);
        logUpdate('faq-heading', faqHeading.tagName, 'faq heading', 'replaced heading text');
        console.log('[FUSION REPLACER] FAQ heading updated');
      }
    }

    // FAQ Description
    const faqDesc = findFusionElement(content, 'faq-description');
    if (faqDesc && generatedContent.faqDescription) {
      content = content.substring(0, faqDesc.startPos) +
        faqDesc.openTag + `<p style="text-align: center;">${generatedContent.faqDescription}</p>` + faqDesc.closeTag +
        content.substring(faqDesc.endPos);
      logUpdate('faq-description', faqDesc.tagName, 'faq description', 'replaced');
      console.log('[FUSION REPLACER] FAQ description updated');
    }

    // FAQ Questions (fusion_accordion with fusion_toggle children)
    if (faqs.length > 0) {
      const faqAccordion = findFusionElement(content, 'faq-questions');
      if (faqAccordion) {
        // Build new toggle items preserving any existing shortcode attributes pattern
        // Extract attributes from first existing toggle to preserve styling
        const existingToggleMatch = faqAccordion.innerContent.match(/\[fusion_toggle([^\]]*)\]/);
        let toggleAttrsTemplate = '';
        if (existingToggleMatch) {
          // Remove old title but keep other attributes (like open, icon, etc.)
          toggleAttrsTemplate = existingToggleMatch[1]
            .replace(/\btitle="[^"]*"/, '')
            .trim();
          if (toggleAttrsTemplate) toggleAttrsTemplate = ' ' + toggleAttrsTemplate;
        }

        const newToggles = faqs.map((faq: { question: string; answer: string }) =>
          `[fusion_toggle title="${faq.question}"${toggleAttrsTemplate}]<p>${faq.answer}</p>[/fusion_toggle]`
        ).join('\n');

        content = content.substring(0, faqAccordion.startPos) +
          faqAccordion.openTag + '\n' + newToggles + '\n' + faqAccordion.closeTag +
          content.substring(faqAccordion.endPos);
        logUpdate('faq-questions', 'fusion_accordion', 'faq questions', `replaced ${faqs.length} toggle items`);
        console.log('[FUSION REPLACER] FAQ questions updated');
      }
    }
  }

  // ==================== MAP SECTION ====================
  if (!omit.includes('map')) {
    console.log('[FUSION REPLACER] Processing map section...');

    // Map Description
    const mapDesc = findFusionElement(content, 'map-description');
    if (mapDesc && generatedContent.mapDescription) {
      let mapText = generatedContent.mapDescription;

      if (internalLinkPlacement === 'map' && internalLinkUrl && companyName) {
        mapText = insertInternalLink(mapText, internalLinkUrl, companyName);
      }
      if (externalLinkPlacement === 'map' && location && cityWebsiteUrl) {
        mapText = insertExternalLink(mapText, location, cityWebsiteUrl);
      }

      content = content.substring(0, mapDesc.startPos) +
        mapDesc.openTag + `<p style="text-align: center;">${mapText}</p>` + mapDesc.closeTag +
        content.substring(mapDesc.endPos);
      logUpdate('map-description', mapDesc.tagName, 'map description', 'replaced');
      console.log('[FUSION REPLACER] Map description updated');
    }

    // Map Iframe - inside [fusion_code] block (content is base64-encoded)
    if (generatedContent.mapIframe) {
      // Find [fusion_code] blocks and replace the one containing an iframe
      const fusionCodePattern = /(\[fusion_code\b[^\]]*\])([\s\S]*?)(\[\/fusion_code\])/g;
      let codeMatch;
      let replaced = false;

      while ((codeMatch = fusionCodePattern.exec(content)) !== null && !replaced) {
        const encodedContent = codeMatch[2].trim();
        // Try to decode base64 to check if it's an iframe
        try {
          const decoded = Buffer.from(encodedContent, 'base64').toString('utf-8');
          if (decoded.includes('<iframe') || decoded.includes('maps.google') || decoded.includes('google.com/maps')) {
            // This is the map iframe - replace with new one
            const newEncoded = Buffer.from(generatedContent.mapIframe).toString('base64');
            content = content.substring(0, codeMatch.index) +
              codeMatch[1] + newEncoded + codeMatch[3] +
              content.substring(codeMatch.index + codeMatch[0].length);
            logUpdate('fusion_code', 'fusion_code', 'map iframe', 'replaced base64-encoded iframe');
            replaced = true;
            console.log('[FUSION REPLACER] Map iframe updated (base64)');
          }
        } catch {
          // Not valid base64, skip
        }
      }

      // Fallback: try finding a map-iframe CSS ID
      if (!replaced) {
        const mapIframe = findFusionElement(content, 'map-iframe');
        if (mapIframe) {
          content = content.substring(0, mapIframe.startPos) +
            mapIframe.openTag + generatedContent.mapIframe + mapIframe.closeTag +
            content.substring(mapIframe.endPos);
          logUpdate('map-iframe', mapIframe.tagName, 'map iframe', 'replaced');
          replaced = true;
          console.log('[FUSION REPLACER] Map iframe updated (direct)');
        }
      }

      if (!replaced) {
        console.log('[FUSION REPLACER] Map iframe not found - no [fusion_code] with iframe or map-iframe ID');
      }
    }
  }

  console.log('[FUSION REPLACER] Replacement complete');
  console.log('[FUSION REPLACER] Sections found:', replacementLog.sectionsFound);
  console.log('[FUSION REPLACER] Sections updated:', replacementLog.sectionsUpdated);
  console.log('[FUSION REPLACER] Element details:', replacementLog.elementDetails);

  return {
    data: content,
    log: replacementLog,
  };
}

/**
 * Helper: Extract current structure from Fusion Builder template
 */
export function analyzeFusionTemplate(postContent: string): {
  modules: Array<{ id: string; type: string; preview: string }>;
} {
  const modules: Array<{ id: string; type: string; preview: string }> = [];

  // Find all fusion elements with id attributes
  const pattern = /\[(fusion_\w+)[^\]]*\bid="([^"]+)"[^\]]*\]/g;
  let match;
  while ((match = pattern.exec(postContent)) !== null) {
    const afterTag = postContent.substring(match.index + match[0].length, match.index + match[0].length + 100);
    const textPreview = afterTag.replace(/\[\/?\w+[^\]]*\]/g, '').replace(/<[^>]*>/g, '').trim().substring(0, 60);
    modules.push({
      id: match[2],
      type: match[1],
      preview: textPreview + '...',
    });
  }

  return { modules };
}
