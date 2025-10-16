'use client';

/**
 * Content Preview Modal
 * Shows generated content for review before publishing
 * Allows regeneration of specific sections
 */

import { useState } from 'react';

interface GeneratedContent {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  heroDescription: string;
  benefitsHeading: string;
  benefitsSubheading: string;
  benefitsBullets: string[];
  whyHeading: string;
  whySubheading: string;
  whyBullets: string[];
  faqs: Array<{ question: string; answer: string }>;
  mapDescription?: string;
}

interface PageContent {
  pageId: string;
  pageName: string;
  service: string;
  location: string;
  primaryKeyword: string;
  content: GeneratedContent;
  status: 'pending' | 'regenerating' | 'ready' | 'publishing' | 'published' | 'failed';
  publishedUrl?: string;
  error?: string;
}

interface ContentPreviewModalProps {
  pages: PageContent[];
  onClose: () => void;
  onRegenerateSection: (pageId: string, section: string) => Promise<void>;
  onPublishPage: (pageId: string) => Promise<void>;
  onPublishAll: () => Promise<void>;
}

export default function ContentPreviewModal({
  pages,
  onClose,
  onRegenerateSection,
  onPublishPage,
  onPublishAll,
}: ContentPreviewModalProps) {
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['meta', 'hero']));
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  const selectedPage = pages[selectedPageIndex];
  const publishedCount = pages.filter((p) => p.status === 'published').length;
  const readyCount = pages.filter((p) => p.status === 'ready').length;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleRegenerateSection = async (section: string) => {
    setRegeneratingSection(section);
    try {
      await onRegenerateSection(selectedPage.pageId, section);
    } finally {
      setRegeneratingSection(null);
    }
  };

  const renderSection = (
    title: string,
    sectionKey: string,
    content: React.ReactNode,
    canRegenerate = true
  ) => {
    const isExpanded = expandedSections.has(sectionKey);
    const isRegenerating = regeneratingSection === sectionKey;

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          </div>
          {canRegenerate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRegenerateSection(sectionKey);
              }}
              disabled={isRegenerating || selectedPage.status === 'publishing'}
              className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
            >
              {isRegenerating ? 'Regenerating...' : '🔄 Regenerate'}
            </button>
          )}
        </button>
        {isExpanded && (
          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {isRegenerating ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Regenerating {title.toLowerCase()}...</span>
                </div>
              </div>
            ) : (
              content
            )}
          </div>
        )}
      </div>
    );
  };

  if (!selectedPage) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex">
        {/* Page List Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Pages ({pages.length})</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {publishedCount} published • {readyCount} ready
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pages.map((page, index) => (
              <button
                key={page.pageId}
                onClick={() => setSelectedPageIndex(index)}
                className={`w-full px-4 py-3 text-left border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                  index === selectedPageIndex ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {page.pageName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {page.status === 'published' && '✅ Published'}
                      {page.status === 'ready' && '⏳ Ready'}
                      {page.status === 'publishing' && '📤 Publishing...'}
                      {page.status === 'regenerating' && '🔄 Updating...'}
                      {page.status === 'failed' && '❌ Failed'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedPage.pageName}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Primary Keyword: <span className="font-medium text-blue-600 dark:text-blue-400">{selectedPage.primaryKeyword}</span>
                </p>
                {selectedPage.publishedUrl && (
                  <a
                    href={selectedPage.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 dark:text-green-400 hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    View published page →
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Sections */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Meta Tags */}
            {renderSection(
              'Meta Tags (SEO)',
              'meta',
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Meta Title ({selectedPage.content.metaTitle.length} chars)</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPage.content.metaTitle}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Meta Description ({selectedPage.content.metaDescription.length} chars)</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPage.content.metaDescription}</p>
                </div>
              </div>
            )}

            {/* Hero Section */}
            {renderSection(
              'Hero Section',
              'hero',
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">H1 Heading</label>
                  <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{selectedPage.content.h1}</h1>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Hero Description ({selectedPage.content.heroDescription.split(' ').length} words)</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white leading-relaxed">{selectedPage.content.heroDescription}</p>
                </div>
              </div>
            )}

            {/* Benefits Section */}
            {renderSection(
              'Benefits Section',
              'benefits',
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Heading</label>
                  <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{selectedPage.content.benefitsHeading}</h2>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Subheading</label>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selectedPage.content.benefitsSubheading}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Bullet Points</label>
                  <ul className="mt-2 space-y-2">
                    {selectedPage.content.benefitsBullets.map((bullet, idx) => (
                      <li key={idx} className="text-sm text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div dangerouslySetInnerHTML={{ __html: bullet }} />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {bullet.replace(/<[^>]*>/g, '').split(' ').length} words
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Why Section */}
            {renderSection(
              'Why Section',
              'why',
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Heading</label>
                  <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{selectedPage.content.whyHeading}</h2>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Subheading</label>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selectedPage.content.whySubheading}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Bullet Points</label>
                  <ul className="mt-2 space-y-2">
                    {selectedPage.content.whyBullets.map((bullet, idx) => (
                      <li key={idx} className="text-sm text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div dangerouslySetInnerHTML={{ __html: bullet }} />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {bullet.replace(/<[^>]*>/g, '').split(' ').length} words
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* FAQs */}
            {renderSection(
              'FAQ Section',
              'faqs',
              <div className="space-y-4">
                {selectedPage.content.faqs.map((faq, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{faq.answer}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {faq.answer.split(' ').length} words
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Map Description (if exists) */}
            {selectedPage.content.mapDescription && renderSection(
              'Map Section',
              'map',
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Description ({selectedPage.content.mapDescription.split(' ').length} words)</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white leading-relaxed">{selectedPage.content.mapDescription}</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                {selectedPage.status === 'published' && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✅ Published successfully
                  </p>
                )}
                {selectedPage.status === 'ready' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ready to publish to WordPress
                  </p>
                )}
                {selectedPage.error && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ❌ {selectedPage.error}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {selectedPageIndex > 0 && (
                  <button
                    onClick={() => setSelectedPageIndex(selectedPageIndex - 1)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    ← Previous
                  </button>
                )}
                {selectedPage.status === 'ready' && (
                  <button
                    onClick={() => onPublishPage(selectedPage.pageId)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Publish This Page
                  </button>
                )}
                {selectedPage.status === 'publishing' && (
                  <button
                    disabled
                    className="px-6 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed text-sm font-medium"
                  >
                    Publishing...
                  </button>
                )}
                {selectedPageIndex < pages.length - 1 && (
                  <button
                    onClick={() => setSelectedPageIndex(selectedPageIndex + 1)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    Next →
                  </button>
                )}
                {readyCount > 0 && selectedPageIndex === pages.length - 1 && (
                  <button
                    onClick={onPublishAll}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Publish All Ready Pages ({readyCount})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
