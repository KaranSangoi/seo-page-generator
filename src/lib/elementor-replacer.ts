/**
 * Elementor Content Replacement Utility
 * Extracted from simple-queue.ts for reuse in publish-reviewed API
 */

export interface ElementorReplacementLog {
  sectionsFound: string[];
  sectionsUpdated: string[];
  elementDetails: Array<{
    cssId: string;
    widgetType: string;
    section: string;
    action: string;
  }>;
}

export function replaceElementorContent(
  elementorData: any,
  generatedContent: any,
  location?: string,
  internalLinkUrl?: string,
  companyName?: string,
  service?: string,
  internalLinkPlacement?: string,
  externalLinkPlacement?: string
): { data: any; log: ElementorReplacementLog } {
  if (!elementorData || !Array.isArray(elementorData)) {
    return {
      data: elementorData,
      log: {
        sectionsFound: [],
        sectionsUpdated: [],
        elementDetails: [],
      },
    };
  }

  const clonedData = JSON.parse(JSON.stringify(elementorData));

  // Tracking what we find and update
  const replacementLog: ElementorReplacementLog = {
    sectionsFound: [],
    sectionsUpdated: [],
    elementDetails: [],
  };

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

  // Logging helper
  const logUpdate = (cssId: string, widgetType: string, section: string, action: string) => {
    const sectionKey = section.split(' ')[0]; // e.g., "hero", "benefits", "faq"
    if (!replacementLog.sectionsFound.includes(sectionKey)) {
      replacementLog.sectionsFound.push(sectionKey);
    }
    if (!replacementLog.sectionsUpdated.includes(section)) {
      replacementLog.sectionsUpdated.push(section);
    }
    replacementLog.elementDetails.push({
      cssId,
      widgetType,
      section,
      action,
    });
  };

  // Recursive function to find and replace content in widgets
  function replaceInElement(element: any): void {
    if (!element || typeof element !== 'object') return;

    if (element.settings) {
      const cssId = element.settings._element_id || element.settings.css_id || '';

      // Hero description - match IDs containing 'hero' and 'description' (check FIRST - more specific)
      if (cssId.includes('hero') && cssId.includes('description')) {
        // Handle text-editor widgets
        if (element.settings.editor) {
          let content = generatedContent.heroDescription;
          if (internalLinkPlacement === 'hero' && internalLinkUrl && companyName) {
            content = insertInternalLink(content, internalLinkUrl, companyName);
            logUpdate(cssId, element.widgetType, 'hero description (text-editor)', 'Updated with internal link');
          } else {
            logUpdate(cssId, element.widgetType, 'hero description (text-editor)', 'Updated without link');
          }
          element.settings.editor = content;
        }
        // Handle heading widgets
        else if (element.settings.title) {
          let content = generatedContent.heroDescription;
          if (internalLinkPlacement === 'hero' && internalLinkUrl && companyName) {
            content = insertInternalLink(content, internalLinkUrl, companyName);
            logUpdate(cssId, element.widgetType, 'hero description (heading)', 'Updated with internal link');
          } else {
            logUpdate(cssId, element.widgetType, 'hero description (heading)', 'Updated without link');
          }
          element.settings.title = content;
        }
        else {
          logUpdate(cssId, element.widgetType, 'hero description', 'FAILED - no editor or title setting');
        }
      }

      // H1 heading - match IDs containing 'h1' (check AFTER hero description)
      else if (cssId.includes('h1')) {
        if (element.settings.title) {
          element.settings.title = generatedContent.h1;
          logUpdate(cssId, element.widgetType, 'h1 (title)', 'Updated H1');
        } else if (element.settings.editor) {
          element.settings.editor = generatedContent.h1;
          logUpdate(cssId, element.widgetType, 'h1 (editor)', 'Updated H1');
        } else {
          logUpdate(cssId, element.widgetType, 'h1', 'FAILED - no title or editor setting');
        }
      }

      // Benefits section
      else if (cssId.includes('benefits')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          if (cssId.includes('subheading')) {
            element.settings.title = generatedContent.benefitsSubheading;
            logUpdate(cssId, element.widgetType, 'benefits subheading', 'Updated');
          } else {
            element.settings.title = generatedContent.benefitsHeading;
            logUpdate(cssId, element.widgetType, 'benefits heading', 'Updated');
          }
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.benefitsSubheading;
            logUpdate(cssId, element.widgetType, 'benefits subheading (text-editor)', 'Updated');
          }
        }
        // Icon list widget
        if (element.widgetType === 'icon-list' && cssId.includes('bullets') && element.settings.icon_list) {
          const bulletCount = element.settings.icon_list.length;
          const generatedCount = generatedContent.benefitsBullets?.length || 0;
          logUpdate(cssId, element.widgetType, 'benefits bullets', `Found ${bulletCount} bullets, ${generatedCount} generated`);

          element.settings.icon_list.forEach((item: any, index: number) => {
            if (generatedContent.benefitsBullets[index]) {
              let content = generatedContent.benefitsBullets[index];
              const sectionKey = `benefits-${index + 1}`;
              if (externalLinkPlacement === sectionKey && location && cityWebsiteUrl) {
                content = insertExternalLink(content, location, cityWebsiteUrl);
                logUpdate(cssId, element.widgetType, `benefits bullet-${index + 1}`, 'Updated with external link');
              } else {
                logUpdate(cssId, element.widgetType, `benefits bullet-${index + 1}`, 'Updated without link');
              }
              item.text = content;
            } else {
              logUpdate(cssId, element.widgetType, `benefits bullet-${index + 1}`, `SKIPPED - no content at index ${index}`);
            }
          });
        }
      }

      // Why section
      else if (cssId.includes('why')) {
        if (element.widgetType === 'heading' && element.settings.title) {
          if (cssId.includes('subheading')) {
            element.settings.title = generatedContent.whySubheading;
            logUpdate(cssId, element.widgetType, 'why subheading', 'Updated');
          } else {
            element.settings.title = generatedContent.whyHeading;
            logUpdate(cssId, element.widgetType, 'why heading', 'Updated');
          }
        }
        if (element.widgetType === 'text-editor' && element.settings.editor) {
          if (cssId.includes('subheading')) {
            element.settings.editor = generatedContent.whySubheading;
            logUpdate(cssId, element.widgetType, 'why subheading (text-editor)', 'Updated');
          }
        }
        // Icon list widget
        if (element.widgetType === 'icon-list' && cssId.includes('bullets') && element.settings.icon_list) {
          const bulletCount = element.settings.icon_list.length;
          const generatedCount = generatedContent.whyBullets?.length || 0;
          logUpdate(cssId, element.widgetType, 'why bullets', `Found ${bulletCount} bullets, ${generatedCount} generated`);

          element.settings.icon_list.forEach((item: any, index: number) => {
            if (generatedContent.whyBullets[index]) {
              let content = generatedContent.whyBullets[index];
              const sectionKey = `why-${index + 1}`;
              if (externalLinkPlacement === sectionKey && location && cityWebsiteUrl) {
                content = insertExternalLink(content, location, cityWebsiteUrl);
                logUpdate(cssId, element.widgetType, `why bullet-${index + 1}`, 'Updated with external link');
              } else {
                logUpdate(cssId, element.widgetType, `why bullet-${index + 1}`, 'Updated without link');
              }
              item.text = content;
            } else {
              logUpdate(cssId, element.widgetType, `why bullet-${index + 1}`, `SKIPPED - no content at index ${index}`);
            }
          });
        }
      }

      // FAQ section - exactly matching sample page logic
      else if (cssId.includes('faq')) {
        // Handle FAQ section - check by ID first, then adapt to structure

        // If this is the main FAQ container (ID contains 'questions')
        if (cssId.includes('questions')) {
          console.log('[DEBUG] Found FAQ container:', {
            cssId: cssId,
            widgetType: element.widgetType,
            hasSettings: !!element.settings,
            settingsKeys: element.settings ? Object.keys(element.settings) : [],
            hasTabs: !!element.settings.tabs,
            hasItems: !!element.settings.items,
            hasElements: !!element.elements,
          });

          // Check if it uses tabs structure (classic accordion/toggle)
          if (element.settings.tabs && Array.isArray(element.settings.tabs)) {
            console.log('[DEBUG] FAQ uses tabs structure (classic accordion), updating tabs...');
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
                console.log(`[DEBUG] Updated FAQ ${index} in tabs`);
                logUpdate(cssId, element.widgetType, `faq tab-${index + 1}`, 'Updated question and answer');
              }
            });
          }
          // Check if it uses items structure (nested-accordion might use this)
          else if (element.settings.items && Array.isArray(element.settings.items)) {
            console.log('[DEBUG] FAQ uses items structure, updating items...');
            element.settings.items.forEach((item: any, index: number) => {
              if (generatedContent.faqs[index]) {
                console.log(`[DEBUG] Item ${index} keys:`, Object.keys(item));
                // Try different possible field names
                if (item.item_title !== undefined) item.item_title = generatedContent.faqs[index].question;
                if (item.item_content !== undefined) {
                  let content = generatedContent.faqs[index].answer;
                  if (internalLinkUrl && companyName) {
                    const faqKey = `faq-${index + 1}`;
                    if (internalLinkPlacement === faqKey) {
                      content = insertInternalLink(content, internalLinkUrl, companyName);
                    }
                  }
                  item.item_content = content;
                }
                if (item.title !== undefined) item.title = generatedContent.faqs[index].question;
                if (item.content !== undefined) {
                  let content = generatedContent.faqs[index].answer;
                  if (internalLinkUrl && companyName) {
                    const faqKey = `faq-${index + 1}`;
                    if (internalLinkPlacement === faqKey) {
                      content = insertInternalLink(content, internalLinkUrl, companyName);
                    }
                  }
                  item.content = content;
                }
                console.log(`[DEBUG] Updated FAQ ${index} in items`);
                logUpdate(cssId, element.widgetType, `faq item-${index + 1}`, 'Updated');
              }
            });
          }
          // Nested accordion stores FAQs in child elements, not settings
          else if (element.elements && Array.isArray(element.elements)) {
            console.log('[DEBUG] FAQ uses nested elements structure - this is likely nested-accordion');
            console.log('[DEBUG] FAQ container has', element.elements.length, 'child elements');
            console.log('[DEBUG] Processing nested accordion child elements for questions...');

            // Look for accordion item elements - each child is an accordion item/details element
            let faqIndex = 0;
            element.elements.forEach((childElement: any, childIdx: number) => {
              if (!childElement || !childElement.settings) return;

              console.log(`[DEBUG] Processing child element ${childIdx + 1}/${element.elements.length}`);

              // Each child element (details/accordion-item) represents one FAQ
              // Questions are in nested child elements
              if (childElement.elements && Array.isArray(childElement.elements)) {
                // Search for heading widget containing the question
                childElement.elements.forEach((nestedChild: any) => {
                  if (!nestedChild || !nestedChild.settings) return;

                  // Found the question heading
                  if (nestedChild.widgetType === 'heading' && nestedChild.settings.title && generatedContent.faqs[faqIndex]) {
                    nestedChild.settings.title = generatedContent.faqs[faqIndex].question;
                    console.log(`[DEBUG] Updated nested FAQ ${faqIndex + 1} question: ${generatedContent.faqs[faqIndex].question.substring(0, 60)}...`);
                    logUpdate(cssId, nestedChild.widgetType, `faq nested-${faqIndex + 1}`, 'Updated question');
                    faqIndex++;
                  }
                });
              }
            });
            console.log(`[DEBUG] Processed ${faqIndex} nested FAQ questions`);
          } else {
            console.log('[DEBUG] FAQ container found but unknown structure');
            console.log('[DEBUG] Full settings keys:', element.settings ? Object.keys(element.settings) : 'none');
            logUpdate(cssId, element.widgetType, 'faq container', 'FAILED - unknown structure');
          }
        }
        // Handle individual FAQ items (separate IDs for each question/answer)
        else {
          const faqIndex = parseInt(cssId.match(/\d+/)?.[0] || '0') - 1;
          if (generatedContent.faqs[faqIndex]) {
            if (element.widgetType === 'heading' && cssId.includes('question')) {
              element.settings.title = generatedContent.faqs[faqIndex].question;
              console.log(`[DEBUG] Updated individual FAQ ${faqIndex} question`);
              logUpdate(cssId, element.widgetType, `faq question-${faqIndex + 1}`, 'Updated');
            }
            if (element.widgetType === 'text-editor' && cssId.includes('answer')) {
              let content = generatedContent.faqs[faqIndex].answer;
              if (internalLinkUrl && companyName) {
                const faqKey = `faq-${faqIndex + 1}`;
                if (internalLinkPlacement === faqKey) {
                  content = insertInternalLink(content, internalLinkUrl, companyName);
                }
              }
              element.settings.editor = content;
              console.log(`[DEBUG] Updated individual FAQ ${faqIndex} answer`);
              logUpdate(cssId, element.widgetType, `faq answer-${faqIndex + 1}`, 'Updated');
            }
          }
        }
      }

      // Map description - match IDs containing 'map' and 'description'
      else if (cssId.includes('map') && cssId.includes('description')) {
        // Handle text-editor widgets
        if (element.settings.editor) {
          let content = generatedContent.mapDescription || '';
          if (internalLinkPlacement === 'map' && internalLinkUrl && companyName) {
            content = insertInternalLink(content, internalLinkUrl, companyName);
            logUpdate(cssId, element.widgetType, 'map description (text-editor)', 'Updated with internal link');
          } else {
            logUpdate(cssId, element.widgetType, 'map description (text-editor)', 'Updated without link');
          }
          element.settings.editor = content;
        }
        // Handle heading widgets
        else if (element.widgetType === 'heading' && element.settings.title) {
          let content = generatedContent.mapDescription || '';
          if (internalLinkPlacement === 'map' && internalLinkUrl && companyName) {
            content = insertInternalLink(content, internalLinkUrl, companyName);
            logUpdate(cssId, element.widgetType, 'map description (heading)', 'Updated with internal link');
          } else {
            logUpdate(cssId, element.widgetType, 'map description (heading)', 'Updated without link');
          }
          element.settings.title = content;
        }
        else {
          logUpdate(cssId, element.widgetType, 'map description', 'FAILED - no editor or title setting');
        }
      }

      // Map iframe - match specific ID
      else if (cssId === 'map-iframe' && element.settings.html && location) {
        // Generate new Google Maps embed URL for the location
        const encodedLocation = encodeURIComponent(location);

        // Create keyword-stuffed iframe closing tag for SEO
        const keywords = [
          service ? `${service} in ${location}` : location,
          service ? `${service} near me` : '',
          service || ''
        ].filter(Boolean).join(',');

        // Replace iframe src and add keywords before closing tag
        element.settings.html = element.settings.html.replace(
          /(<iframe[^>]*src=")([^"]*)("[^>]*>)([^<]*)<\/iframe>/gi,
          (match: string, prefix: string, oldSrc: string, middle: string, oldContent: string) => {
            const simpleMapUrl = `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
            logUpdate(cssId, element.widgetType, 'map iframe', `Updated with location: ${location}`);
            return `${prefix}${simpleMapUrl}${middle}${keywords}</iframe>`;
          }
        );
      }
      else if (cssId === 'map-iframe') {
        if (!element.settings.html) {
          logUpdate(cssId, element.widgetType, 'map iframe', 'FAILED - no html setting');
        } else if (!location) {
          logUpdate(cssId, element.widgetType, 'map iframe', 'FAILED - no location provided');
        }
      }
    }

    // Recursively process children
    if (element.elements && Array.isArray(element.elements)) {
      element.elements.forEach(replaceInElement);
    }
  }

  clonedData.forEach(replaceInElement);

  // Log summary
  console.log('[Elementor Replacer] Summary:', {
    sectionsFound: replacementLog.sectionsFound,
    sectionsUpdated: replacementLog.sectionsUpdated.length,
    totalElementsProcessed: replacementLog.elementDetails.length,
  });

  return {
    data: clonedData,
    log: replacementLog,
  };
}
