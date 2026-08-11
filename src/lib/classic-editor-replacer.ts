/**
 * Classic Editor Content Replacer
 * Replaces content in WordPress Classic Editor (TinyMCE) HTML
 *
 * Template Structure:
 * Uses HTML comments to mark replaceable sections:
 * <!-- SEO_GEN_START:SECTION_NAME -->
 * <content>
 * <!-- SEO_GEN_END:SECTION_NAME -->
 *
 * Supported sections: HERO, BENEFITS, WHY, FAQ, MAP
 */

import { linkColorAttr } from './link-style';

interface ReplacementLog {
  sectionsFound: string[];
  sectionsUpdated: string[];
  errors: string[];
}

interface GeneratedContent {
  h1: string;
  heroDescription: string;
  benefitsHeading?: string;
  benefitsSubheading?: string;
  benefitsBullets?: string[];
  whyHeading?: string;
  whySubheading?: string;
  whyBullets?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  mapDescription?: string;
}

/**
 * Replace content in Classic Editor HTML
 */
export function replaceClassicEditorContent(
  htmlContent: string,
  generatedContent: GeneratedContent,
  location: string,
  internalLinkUrl: string | null,
  companyName: string,
  service: string,
  internalLinkPlacement: string | null,
  externalLinkPlacement: string | null,
  omitSections: string[],
  externalLinkUrlOverride?: string,
  linkColor?: string | null
): { data: string; log: ReplacementLog } {

  const log: ReplacementLog = {
    sectionsFound: [],
    sectionsUpdated: [],
    errors: [],
  };

  let updatedHtml = htmlContent;

  // Helper: Find section content between comment markers
  function findSection(sectionName: string): { start: number; end: number; content: string } | null {
    const startMarker = `<!-- SEO_GEN_START:${sectionName} -->`;
    const endMarker = `<!-- SEO_GEN_END:${sectionName} -->`;

    const startIndex = updatedHtml.indexOf(startMarker);
    const endIndex = updatedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    log.sectionsFound.push(sectionName);

    const contentStart = startIndex + startMarker.length;
    const content = updatedHtml.substring(contentStart, endIndex);

    return {
      start: contentStart,
      end: endIndex,
      content: content.trim(),
    };
  }

  // Helper: Replace section content
  function replaceSection(sectionName: string, newContent: string): void {
    const section = findSection(sectionName);
    if (!section) {
      log.errors.push(`Section ${sectionName} not found in template`);
      return;
    }

    const before = updatedHtml.substring(0, section.start);
    const after = updatedHtml.substring(section.end);
    updatedHtml = before + '\n' + newContent + '\n' + after;

    log.sectionsUpdated.push(sectionName);
  }

  // Replace HERO section
  if (!omitSections.includes('Hero')) {
    const heroHtml = `
<div class="hero-section">
  <h1>${generatedContent.h1}</h1>
  <p>${addInternalLink(generatedContent.heroDescription, internalLinkUrl, companyName, internalLinkPlacement === 'hero', linkColor)}</p>
</div>`;
    replaceSection('HERO', heroHtml.trim());
  }

  // Replace BENEFITS section
  if (!omitSections.includes('Benefits') && generatedContent.benefitsBullets) {
    const bulletsHtml = generatedContent.benefitsBullets.map((bullet, idx) => {
      const shouldAddExternalLink = externalLinkPlacement === `benefits-${idx + 1}`;
      const bulletText = shouldAddExternalLink
        ? addExternalLink(bullet, location, externalLinkUrlOverride, linkColor)
        : bullet;
      return `<li>${bulletText}</li>`;
    }).join('\n');

    const benefitsHtml = `
<div class="benefits-section">
  <h2>${generatedContent.benefitsHeading || 'Our Benefits'}</h2>
  ${generatedContent.benefitsSubheading ? `<p class="subheading">${generatedContent.benefitsSubheading}</p>` : ''}
  <ul class="benefits-list">
${bulletsHtml}
  </ul>
</div>`;
    replaceSection('BENEFITS', benefitsHtml.trim());
  }

  // Replace WHY section
  if (!omitSections.includes('Why') && generatedContent.whyBullets) {
    const bulletsHtml = generatedContent.whyBullets.map((bullet, idx) => {
      const shouldAddExternalLink = externalLinkPlacement === `why-${idx + 1}`;
      const bulletText = shouldAddExternalLink
        ? addExternalLink(bullet, location, externalLinkUrlOverride, linkColor)
        : bullet;
      return `<li>${bulletText}</li>`;
    }).join('\n');

    const whyHtml = `
<div class="why-section">
  <h2>${generatedContent.whyHeading || 'Why Choose Us'}</h2>
  ${generatedContent.whySubheading ? `<p class="subheading">${generatedContent.whySubheading}</p>` : ''}
  <ul class="why-list">
${bulletsHtml}
  </ul>
</div>`;
    replaceSection('WHY', whyHtml.trim());
  }

  // Replace FAQ section
  if (!omitSections.includes('FAQ') && generatedContent.faqs) {
    const faqsHtml = generatedContent.faqs.map((faq, idx) => {
      const shouldAddInternalLink = internalLinkPlacement === `faq-${idx + 1}`;
      const answerText = shouldAddInternalLink
        ? addInternalLink(faq.answer, internalLinkUrl, companyName, true, linkColor)
        : faq.answer;

      return `
<div class="faq-item">
  <h3 class="faq-question">${faq.question}</h3>
  <div class="faq-answer">${answerText}</div>
</div>`;
    }).join('\n');

    const faqSectionHtml = `
<div class="faq-section">
  <h2>Frequently Asked Questions</h2>
  <div class="faq-list">
${faqsHtml}
  </div>
</div>`;
    replaceSection('FAQ', faqSectionHtml.trim());
  }

  // Replace MAP section
  if (!omitSections.includes('Map') && generatedContent.mapDescription) {
    const shouldAddInternalLink = internalLinkPlacement === 'map';
    const mapDescriptionText = shouldAddInternalLink
      ? addInternalLink(generatedContent.mapDescription, internalLinkUrl, companyName, true, linkColor)
      : generatedContent.mapDescription;

    const mapHtml = `
<div class="map-section">
  <h2>Service Area Map</h2>
  <p>${mapDescriptionText}</p>
  <div class="map-placeholder">[Map will be inserted here - keep existing map embed code]</div>
</div>`;
    replaceSection('MAP', mapHtml.trim());
  }

  return {
    data: updatedHtml,
    log,
  };
}

/**
 * Add internal link to company name in text
 */
function addInternalLink(text: string, linkUrl: string | null, companyName: string, shouldAdd: boolean, linkColor?: string | null): string {
  if (!shouldAdd || !linkUrl) {
    return text;
  }

  // Find company name and wrap with link
  const regex = new RegExp(`\\b${escapeRegex(companyName)}\\b`, 'i');
  return text.replace(regex, `<a href="${linkUrl}"${linkColorAttr(linkColor)}>${companyName}</a>`);
}

/**
 * Add external link to location in text
 */
function addExternalLink(text: string, location: string, urlOverride?: string, linkColor?: string | null): string {
  if (!location) {
    return text;
  }

  let cityUrl = urlOverride;

  if (!cityUrl) {
    // Create link to city website (simplified - you may want to fetch actual city website)
    const [city, state] = location.split(',').map(s => s.trim());
    if (!city || !state) {
      return text;
    }

    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const stateCode = state.toLowerCase().replace(/\s+/g, '-');
    cityUrl = `https://www.${citySlug}${stateCode}.gov`;
  }

  // Find location and wrap with link
  const regex = new RegExp(`\\b${escapeRegex(location)}\\b`, 'i');
  return text.replace(regex, `<a href="${cityUrl}" target="_blank" rel="noopener"${linkColorAttr(linkColor)}>${location}</a>`);
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
