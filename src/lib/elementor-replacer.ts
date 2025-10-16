/**
 * Elementor Content Replacement Utility
 * Extracted from simple-queue.ts for reuse in publish-reviewed API
 */

export function replaceElementorContent(
  elementorData: any,
  generatedContent: any,
  location?: string,
  internalLinkUrl?: string,
  companyName?: string,
  service?: string,
  internalLinkPlacement?: string,
  externalLinkPlacement?: string
): any {
  if (!elementorData || !Array.isArray(elementorData)) return elementorData;

  const clonedData = JSON.parse(JSON.stringify(elementorData));

  // Generate city website URL for external link
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

  // Insert internal link helper
  const insertInternalLink = (text: string, linkUrl: string, companyName: string): string => {
    if (!text || !linkUrl || !companyName) return text;
    const linkHtml = `<a href="${linkUrl}" style="text-decoration: underline; display: inline;">${companyName}</a>`;
    const companyPattern = new RegExp(`\\b${companyName}\\b`, 'i');
    if (companyPattern.test(text)) {
      return text.replace(companyPattern, linkHtml);
    }
    return `Trust ${linkHtml} to deliver reliable services. ${text}`;
  };

  // Insert external link helper
  const insertExternalLink = (text: string, location: string, cityWebsiteUrl: string): string => {
    if (!text || !location || !cityWebsiteUrl) return text;
    const linkHtml = `<a href="${cityWebsiteUrl}" target="_blank" style="text-decoration: underline; display: inline;">${location}</a>`;
    const locationPattern = new RegExp(`\\b${location}\\b`, 'i');
    if (locationPattern.test(text)) {
      return text.replace(locationPattern, linkHtml);
    }
    return text;
  };

  // Recursive function to find and replace content in widgets
  function replaceInElement(element: any): void {
    if (!element || typeof element !== 'object') return;

    if (element.settings) {
      const cssId = element.settings._element_id || element.settings.css_id || '';

      // Hero section
      if (cssId.includes('hero') || cssId.includes('h1')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          element.settings.title = generatedContent.h1;
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          let content = generatedContent.heroDescription;
          if (internalLinkPlacement === 'hero' && internalLinkUrl && companyName) {
            content = insertInternalLink(content, internalLinkUrl, companyName);
          }
          element.settings.editor = content;
        }
      }

      // Benefits section
      else if (cssId.includes('benefits')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          if (cssId.includes('subheading')) {
            element.settings.title = generatedContent.benefitsSubheading;
          } else {
            element.settings.title = generatedContent.benefitsHeading;
          }
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.benefitsSubheading;
          }
        }
        // Icon list widget
        if (element.widgetType === 'icon-list' && cssId.includes('bullets') && element.settings.icon_list) {
          element.settings.icon_list.forEach((item: any, index: number) => {
            if (generatedContent.benefitsBullets[index]) {
              let content = generatedContent.benefitsBullets[index];
              const sectionKey = `benefits-${index + 1}`;
              if (externalLinkPlacement === sectionKey && location && cityWebsiteUrl) {
                content = insertExternalLink(content, location, cityWebsiteUrl);
              }
              item.text = content;
            }
          });
        }
      }

      // Why section
      else if (cssId.includes('why')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          if (cssId.includes('subheading')) {
            element.settings.title = generatedContent.whySubheading;
          } else {
            element.settings.title = generatedContent.whyHeading;
          }
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.whySubheading;
          }
        }
        // Icon list widget
        if (element.widgetType === 'icon-list' && cssId.includes('bullets') && element.settings.icon_list) {
          element.settings.icon_list.forEach((item: any, index: number) => {
            if (generatedContent.whyBullets[index]) {
              let content = generatedContent.whyBullets[index];
              const sectionKey = `why-${index + 1}`;
              if (externalLinkPlacement === sectionKey && location && cityWebsiteUrl) {
                content = insertExternalLink(content, location, cityWebsiteUrl);
              }
              item.text = content;
            }
          });
        }
      }

      // FAQ section
      else if (cssId.includes('faq')) {
        // Handle FAQ questions container (toggle/accordion with tabs structure)
        if (cssId.includes('questions')) {
          if (element.settings.tabs && Array.isArray(element.settings.tabs)) {
            element.settings.tabs.forEach((tab: any, index: number) => {
              if (generatedContent.faqs[index]) {
                tab.tab_title = generatedContent.faqs[index].question;
                let content = generatedContent.faqs[index].answer;
                if (internalLinkUrl && companyName) {
                  const faqKey = `faq-${index + 1}`;
                  if (internalLinkPlacement === faqKey) {
                    content = insertInternalLink(content, internalLinkUrl, companyName);
                  }
                }
                tab.tab_content = content;
              }
            });
          }
        }
        // Handle individual FAQ answer widgets (separate IDs for each answer)
        else if (cssId.includes('answer')) {
          const faqIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
          if (generatedContent.faqs[faqIndex] && element.widgetType === 'text-editor' && element.settings.editor) {
            let content = generatedContent.faqs[faqIndex].answer;
            // Add internal link if this FAQ is designated for internal link
            if (internalLinkUrl && companyName) {
              const faqKey = `faq-${faqIndex + 1}`;
              if (internalLinkPlacement === faqKey) {
                content = insertInternalLink(content, internalLinkUrl, companyName);
              }
            }
            element.settings.editor = content;
          }
        }
      }

      // Map section
      else if (cssId.includes('map')) {
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          let content = generatedContent.mapDescription || '';
          if (internalLinkPlacement === 'map' && internalLinkUrl && companyName) {
            content = insertInternalLink(content, internalLinkUrl, companyName);
          }
          element.settings.editor = content;
        }
      }
    }

    // Recursively process children
    if (element.elements && Array.isArray(element.elements)) {
      element.elements.forEach(replaceInElement);
    }
  }

  clonedData.forEach(replaceInElement);
  return clonedData;
}
