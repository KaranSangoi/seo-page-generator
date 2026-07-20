'use client';

/**
 * Batch Content Modal
 *
 * Read-only, preview-style viewer for the generated content of a completed batch.
 * Mirrors the layout of ContentPreviewModal (page sidebar + collapsible sections)
 * but deliberately omits edit / regenerate / publish actions: history is a record
 * of what was already shipped to WordPress, so the only affordance is copy.
 */

import { useState } from 'react';

interface HistoryPage {
  id: string;
  pageName: string;
  pageType: string;
  publishedUrl: string | null;
  status: string;
  primaryKeyword: string | null;
  generatedContent: string | null;
}

interface BatchContentModalProps {
  pages: HistoryPage[];
  initialPageId?: string;
  onClose: () => void;
}

/** Inline copy-to-clipboard button for a single field. Owns its own feedback state. */
function CopyFieldButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Strip HTML tags for clean copy (bullets are stored as HTML)
      await navigator.clipboard.writeText(value.replace(/<[^>]*>/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Copy ${label}`}
      className="flex-shrink-0 p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

/** A labelled field: uppercase label, optional size hint, copy button, then the value. */
function Field({
  label,
  copyValue,
  info,
  children,
}: {
  label: string;
  copyValue: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
          {info && <span className="ml-1.5 font-normal normal-case text-gray-400 dark:text-gray-500">({info})</span>}
        </div>
        <CopyFieldButton value={copyValue} label={label} />
      </div>
      {children}
    </div>
  );
}

export default function BatchContentModal({ pages, initialPageId, onClose }: BatchContentModalProps) {
  const initialIndex = Math.max(0, pages.findIndex((p) => p.id === initialPageId));
  const [selectedPageIndex, setSelectedPageIndex] = useState(initialIndex);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['meta', 'hero']));

  const selectedPage = pages[selectedPageIndex];

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const statusLabel = (status: string) => {
    if (status === 'success') return '✅ Published';
    if (status === 'failed') return '❌ Failed';
    if (status === 'validating') return '⏳ Ready';
    return status;
  };

  // Content is stored as a JSON string; a malformed record should degrade to an
  // error message for that page rather than taking down the whole modal.
  let content: any = null;
  let parseError = false;
  if (selectedPage?.generatedContent) {
    try {
      content = JSON.parse(selectedPage.generatedContent);
    } catch {
      parseError = true;
    }
  }

  const renderSection = (title: string, sectionKey: string, body: React.ReactNode) => {
    const isExpanded = expandedSections.has(sectionKey);
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </button>
        {isExpanded && (
          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">{body}</div>
        )}
      </div>
    );
  };

  if (!selectedPage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex">
        {/* Page List Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Pages ({pages.length})</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {pages.filter((p) => p.status === 'success').length} published
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => setSelectedPageIndex(index)}
                className={`w-full px-4 py-3 text-left border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                  index === selectedPageIndex ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{page.pageName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{statusLabel(page.status)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                  {selectedPage.pageName}
                </h2>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {selectedPage.primaryKeyword && (
                    <span>
                      Primary Keyword:{' '}
                      <span className="text-blue-600 dark:text-blue-400">{selectedPage.primaryKeyword}</span>
                    </span>
                  )}
                  {content?.selectedAdjective && (
                    <span>
                      AI-Selected Adjective:{' '}
                      <span className="font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                        {content.selectedAdjective}
                      </span>
                    </span>
                  )}
                </div>
                {selectedPage.publishedUrl && (
                  <a
                    href={selectedPage.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-sm text-green-600 dark:text-green-400 hover:underline"
                  >
                    View published page →
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {parseError && (
              <p className="text-sm text-red-500">Failed to parse content data for this page.</p>
            )}
            {!parseError && !content && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No generated content stored for this page.</p>
            )}

            {content && (
              <>
                {/* Meta */}
                {(content.metaTitle || content.metaDescription) &&
                  renderSection(
                    'Meta Tags (SEO)',
                    'meta',
                    <>
                      {content.metaTitle && (
                        <Field label="Meta Title" copyValue={content.metaTitle} info={`${content.metaTitle.length} chars`}>
                          <p className="text-sm text-gray-900 dark:text-white">{content.metaTitle}</p>
                        </Field>
                      )}
                      {content.metaDescription && (
                        <Field
                          label="Meta Description"
                          copyValue={content.metaDescription}
                          info={`${content.metaDescription.length} chars`}
                        >
                          <p className="text-sm text-gray-900 dark:text-white">{content.metaDescription}</p>
                        </Field>
                      )}
                    </>
                  )}

                {/* Hero */}
                {(content.h1 || content.heroDescription) &&
                  renderSection(
                    'Hero Section',
                    'hero',
                    <>
                      {content.h1 && (
                        <Field label="H1 Heading" copyValue={content.h1}>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{content.h1}</p>
                        </Field>
                      )}
                      {content.heroDescription && (
                        <Field
                          label="Hero Description"
                          copyValue={content.heroDescription}
                          info={`${content.heroDescription.trim().split(/\s+/).length} words`}
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300">{content.heroDescription}</p>
                        </Field>
                      )}
                    </>
                  )}

                {/* Benefits */}
                {(content.benefitsHeading || content.benefitsBullets?.length || content.benefitsImgAlt) &&
                  renderSection(
                    'Benefits Section',
                    'benefits',
                    <>
                      {content.benefitsHeading && (
                        <Field label="Benefits Heading" copyValue={content.benefitsHeading}>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{content.benefitsHeading}</p>
                        </Field>
                      )}
                      {content.benefitsSubheading && (
                        <Field label="Benefits Subheading" copyValue={content.benefitsSubheading}>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{content.benefitsSubheading}</p>
                        </Field>
                      )}
                      {content.benefitsBullets?.map((b: string, i: number) => (
                        <Field key={i} label={`Bullet #${i + 1}`} copyValue={b}>
                          <p
                            className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 rounded-lg"
                            dangerouslySetInnerHTML={{ __html: b }}
                          />
                        </Field>
                      ))}
                      {content.benefitsImgAlt && (
                        <Field
                          label="Benefits Image Alt Text"
                          copyValue={content.benefitsImgAlt}
                          info={`${content.benefitsImgAlt.trim().split(/\s+/).length} words`}
                        >
                          <p className="text-sm text-gray-900 dark:text-white bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                            {content.benefitsImgAlt}
                          </p>
                        </Field>
                      )}
                    </>
                  )}

                {/* Why */}
                {(content.whyHeading || content.whyBullets?.length || content.whyImgAlt) &&
                  renderSection(
                    'Why Choose Us Section',
                    'why',
                    <>
                      {content.whyHeading && (
                        <Field label="Why Heading" copyValue={content.whyHeading}>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{content.whyHeading}</p>
                        </Field>
                      )}
                      {content.whySubheading && (
                        <Field label="Why Subheading" copyValue={content.whySubheading}>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{content.whySubheading}</p>
                        </Field>
                      )}
                      {content.whyBullets?.map((b: string, i: number) => (
                        <Field key={i} label={`Bullet #${i + 1}`} copyValue={b}>
                          <p
                            className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 rounded-lg"
                            dangerouslySetInnerHTML={{ __html: b }}
                          />
                        </Field>
                      ))}
                      {content.whyImgAlt && (
                        <Field
                          label="Why Image Alt Text"
                          copyValue={content.whyImgAlt}
                          info={`${content.whyImgAlt.trim().split(/\s+/).length} words`}
                        >
                          <p className="text-sm text-gray-900 dark:text-white bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                            {content.whyImgAlt}
                          </p>
                        </Field>
                      )}
                    </>
                  )}

                {/* FAQs */}
                {content.faqs?.length > 0 &&
                  renderSection(
                    'FAQ Section',
                    'faqs',
                    <>
                      {content.faqHeading && (
                        <Field label="FAQ Heading" copyValue={content.faqHeading}>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{content.faqHeading}</p>
                        </Field>
                      )}
                      {content.faqDescription && (
                        <Field label="FAQ Description" copyValue={content.faqDescription}>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{content.faqDescription}</p>
                        </Field>
                      )}
                      {content.faqs.map((faq: any, i: number) => (
                        <Field key={i} label={`FAQ #${i + 1}`} copyValue={`Q: ${faq.question}\nA: ${faq.answer}`}>
                          <div className="bg-gray-50 dark:bg-gray-900/40 px-3 py-2 rounded-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{faq.question}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{faq.answer}</p>
                          </div>
                        </Field>
                      ))}
                    </>
                  )}

                {/* Map */}
                {content.mapDescription &&
                  renderSection(
                    'Map Section',
                    'map',
                    <Field label="Map Description" copyValue={content.mapDescription}>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{content.mapDescription}</p>
                    </Field>
                  )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {selectedPageIndex + 1} of {pages.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPageIndex((i) => Math.max(0, i - 1))}
                disabled={selectedPageIndex === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={() => setSelectedPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                disabled={selectedPageIndex === pages.length - 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
