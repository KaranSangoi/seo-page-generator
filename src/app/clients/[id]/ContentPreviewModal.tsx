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
  internalLinkPlacement?: string;
  internalLinkUrl?: string;
  externalLinkPlacement?: string;
  externalLinkUrl?: string;
  status: 'pending' | 'generating' | 'regenerating' | 'ready' | 'publishing' | 'published' | 'failed';
  publishedUrl?: string;
  error?: string;
}

interface ContentPreviewModalProps {
  pages: PageContent[];
  onClose: () => void;
  onRegenerateSection: (pageId: string, section: string) => Promise<void>;
  onPublishPage: (pageId: string) => Promise<void>;
  onPublishAll: () => Promise<void>;
  onUpdateExternalLink?: (pageId: string, newUrl: string) => void;
  onUpdateContent?: (pageId: string, field: string, value: string) => void;
}

export default function ContentPreviewModal({
  pages,
  onClose,
  onRegenerateSection,
  onPublishPage,
  onPublishAll,
  onUpdateExternalLink,
  onUpdateContent,
}: ContentPreviewModalProps) {
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['meta', 'hero']));
  // Support multiple concurrent regenerations
  const [regeneratingSections, setRegeneratingSections] = useState<Set<string>>(new Set());
  const [regeneratingFields, setRegeneratingFields] = useState<Set<string>>(new Set());
  // External link editing
  const [editingExternalLink, setEditingExternalLink] = useState(false);
  const [editedExternalLinkUrl, setEditedExternalLinkUrl] = useState('');
  // Content field editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedValue, setEditedValue] = useState('');

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
    // Add to regenerating set
    setRegeneratingSections((prev) => new Set(prev).add(section));
    try {
      await onRegenerateSection(selectedPage.pageId, section);
    } finally {
      // Remove from regenerating set
      setRegeneratingSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(section);
        return newSet;
      });
    }
  };

  const handleRegenerateField = async (fieldName: string) => {
    // Add to regenerating set
    setRegeneratingFields((prev) => new Set(prev).add(fieldName));
    try {
      await onRegenerateSection(selectedPage.pageId, fieldName);
    } finally {
      // Remove from regenerating set
      setRegeneratingFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
    }
  };

  // Helper to render individual field with inline regenerate and edit buttons
  const renderField = (label: string, fieldName: string, content: React.ReactNode, charInfo?: string, currentValue?: string, isMultiline?: boolean) => {
    const isRegenerating = regeneratingFields.has(fieldName);
    const isEditing = editingField === fieldName;

    const handleStartEdit = () => {
      if (currentValue !== undefined && onUpdateContent) {
        setEditingField(fieldName);
        setEditedValue(currentValue);
      }
    };

    const handleSaveEdit = () => {
      if (onUpdateContent && editingField) {
        onUpdateContent(selectedPage.pageId, editingField, editedValue);
      }
      setEditingField(null);
      setEditedValue('');
    };

    const handleCancelEdit = () => {
      setEditingField(null);
      setEditedValue('');
    };

    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            {label} {charInfo && <span className="text-gray-500">({charInfo})</span>}
          </label>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  title="Save"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {currentValue !== undefined && onUpdateContent && (
                  <button
                    onClick={handleStartEdit}
                    disabled={selectedPage.status === 'publishing'}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                    title={`Edit ${label}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleRegenerateField(fieldName)}
                  disabled={isRegenerating || selectedPage.status === 'publishing'}
                  className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                  title={`Regenerate ${label}`}
                >
                  {isRegenerating ? '...' : '🔄'}
                </button>
              </>
            )}
          </div>
        </div>
        {isRegenerating ? (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 py-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs">Regenerating...</span>
          </div>
        ) : isEditing ? (
          isMultiline ? (
            <textarea
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          )
        ) : (
          content
        )}
      </div>
    );
  };

  const renderSection = (
    title: string,
    sectionKey: string,
    content: React.ReactNode,
    canRegenerate = true
  ) => {
    const isExpanded = expandedSections.has(sectionKey);
    const isRegenerating = regeneratingSections.has(sectionKey);

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
                      {page.status === 'pending' && '⏱️ Waiting...'}
                      {page.status === 'generating' && '⚙️ Generating...'}
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
              <div className="flex-1">
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

                {/* Links Information */}
                {(selectedPage.internalLinkPlacement || selectedPage.externalLinkPlacement) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                      Link Placements
                    </h3>
                    <div className="space-y-2">
                      {selectedPage.internalLinkPlacement && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Internal Link:</span>{' '}
                          <span className="text-blue-600 dark:text-blue-400">{selectedPage.internalLinkPlacement}</span>
                          {selectedPage.internalLinkUrl && (
                            <>
                              {' → '}
                              <a
                                href={selectedPage.internalLinkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline break-all"
                                title={selectedPage.internalLinkUrl}
                              >
                                {selectedPage.internalLinkUrl.length > 50
                                  ? `${selectedPage.internalLinkUrl.substring(0, 50)}...`
                                  : selectedPage.internalLinkUrl}
                              </a>
                            </>
                          )}
                        </div>
                      )}
                      {selectedPage.externalLinkPlacement && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">External Link:</span>{' '}
                          <span className="text-purple-600 dark:text-purple-400">{selectedPage.externalLinkPlacement}</span>
                          {selectedPage.externalLinkUrl && (
                            <>
                              {' → '}
                              {editingExternalLink ? (
                                <span className="inline-flex items-center gap-1">
                                  <input
                                    type="url"
                                    value={editedExternalLinkUrl}
                                    onChange={(e) => setEditedExternalLinkUrl(e.target.value)}
                                    className="px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-64"
                                    placeholder="Enter URL"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => {
                                      if (onUpdateExternalLink && editedExternalLinkUrl) {
                                        onUpdateExternalLink(selectedPage.pageId, editedExternalLinkUrl);
                                      }
                                      setEditingExternalLink(false);
                                    }}
                                    className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                    title="Save"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setEditingExternalLink(false)}
                                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    title="Cancel"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <a
                                    href={selectedPage.externalLinkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline break-all"
                                    title={selectedPage.externalLinkUrl}
                                  >
                                    {selectedPage.externalLinkUrl.length > 50
                                      ? `${selectedPage.externalLinkUrl.substring(0, 50)}...`
                                      : selectedPage.externalLinkUrl}
                                  </a>
                                  {onUpdateExternalLink && (
                                    <button
                                      onClick={() => {
                                        setEditedExternalLinkUrl(selectedPage.externalLinkUrl || '');
                                        setEditingExternalLink(true);
                                      }}
                                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                      title="Edit external link URL"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  )}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Sections */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Show loading state for pending/generating pages */}
            {(selectedPage.status === 'pending' || selectedPage.status === 'generating') && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedPage.status === 'pending' ? 'Waiting to Generate...' : 'Generating Content...'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
                  {selectedPage.status === 'pending'
                    ? 'This page is in the queue. Content will be generated shortly.'
                    : 'AI is creating optimized content for this page. This may take a minute.'}
                </p>
              </div>
            )}

            {/* Show content for ready/published/failed pages */}
            {selectedPage.status !== 'pending' && selectedPage.status !== 'generating' && selectedPage.content && (
              <>
            {/* Meta Tags */}
            {renderSection(
              'Meta Tags (SEO)',
              'meta',
              <div className="space-y-1">
                {renderField(
                  'Meta Title',
                  'metaTitle',
                  <p className="text-sm text-gray-900 dark:text-white">{selectedPage.content.metaTitle}</p>,
                  `${selectedPage.content.metaTitle.length} chars`,
                  selectedPage.content.metaTitle,
                  false
                )}
                {renderField(
                  'Meta Description',
                  'metaDescription',
                  <p className="text-sm text-gray-900 dark:text-white">{selectedPage.content.metaDescription}</p>,
                  `${selectedPage.content.metaDescription.length} chars`,
                  selectedPage.content.metaDescription,
                  true
                )}
              </div>
            )}

            {/* Hero Section */}
            {renderSection(
              'Hero Section',
              'hero',
              <div className="space-y-1">
                {renderField(
                  'H1 Heading',
                  'h1',
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedPage.content.h1}</h1>,
                  undefined,
                  selectedPage.content.h1,
                  false
                )}
                {renderField(
                  'Hero Description',
                  'heroDescription',
                  <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{selectedPage.content.heroDescription}</p>,
                  `${selectedPage.content.heroDescription.split(' ').length} words`,
                  selectedPage.content.heroDescription,
                  true
                )}
              </div>
            )}

            {/* Benefits Section */}
            {renderSection(
              'Benefits Section',
              'benefits',
              <div className="space-y-1">
                {renderField(
                  'Benefits Heading',
                  'benefitsHeading',
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedPage.content.benefitsHeading}</h2>,
                  undefined,
                  selectedPage.content.benefitsHeading,
                  false
                )}
                {renderField(
                  'Benefits Subheading',
                  'benefitsSubheading',
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedPage.content.benefitsSubheading}</p>,
                  undefined,
                  selectedPage.content.benefitsSubheading,
                  false
                )}
                <div className="pt-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide block mb-2">
                    Bullet Points
                  </label>
                  <div className="space-y-2">
                    {selectedPage.content.benefitsBullets.map((bullet, idx) => {
                      const fieldName = `benefitsBullets[${idx}]`;
                      const isEditingBullet = editingField === fieldName;
                      return (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Bullet #{idx + 1}</span>
                          <div className="flex items-center gap-1">
                            {isEditingBullet ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (onUpdateContent) {
                                      onUpdateContent(selectedPage.pageId, fieldName, editedValue);
                                    }
                                    setEditingField(null);
                                    setEditedValue('');
                                  }}
                                  className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                  title="Save"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingField(null);
                                    setEditedValue('');
                                  }}
                                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                  title="Cancel"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                {onUpdateContent && (
                                  <button
                                    onClick={() => {
                                      setEditingField(fieldName);
                                      setEditedValue(bullet);
                                    }}
                                    disabled={selectedPage.status === 'publishing'}
                                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                                    title={`Edit bullet #${idx + 1}`}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRegenerateField(`benefitsBullet-${idx + 1}`)}
                                  disabled={regeneratingFields.has(`benefitsBullet-${idx + 1}`) || selectedPage.status === 'publishing'}
                                  className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                                  title={`Regenerate bullet #${idx + 1}`}
                                >
                                  {regeneratingFields.has(`benefitsBullet-${idx + 1}`) ? '...' : '🔄'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {regeneratingFields.has(`benefitsBullet-${idx + 1}`) ? (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 py-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-xs">Regenerating...</span>
                          </div>
                        ) : isEditingBullet ? (
                          <textarea
                            value={editedValue}
                            onChange={(e) => setEditedValue(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <>
                            <div className="text-sm text-gray-900 dark:text-white" dangerouslySetInnerHTML={{ __html: bullet }} />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {bullet.replace(/<[^>]*>/g, '').split(' ').length} words
                            </p>
                          </>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Why Section */}
            {renderSection(
              'Why Section',
              'why',
              <div className="space-y-1">
                {renderField(
                  'Why Heading',
                  'whyHeading',
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedPage.content.whyHeading}</h2>,
                  undefined,
                  selectedPage.content.whyHeading,
                  false
                )}
                {renderField(
                  'Why Subheading',
                  'whySubheading',
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedPage.content.whySubheading}</p>,
                  undefined,
                  selectedPage.content.whySubheading,
                  false
                )}
                <div className="pt-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide block mb-2">
                    Bullet Points
                  </label>
                  <div className="space-y-2">
                    {selectedPage.content.whyBullets.map((bullet, idx) => {
                      const fieldName = `whyBullets[${idx}]`;
                      const isEditingBullet = editingField === fieldName;
                      return (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Bullet #{idx + 1}</span>
                          <div className="flex items-center gap-1">
                            {isEditingBullet ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (onUpdateContent) {
                                      onUpdateContent(selectedPage.pageId, fieldName, editedValue);
                                    }
                                    setEditingField(null);
                                    setEditedValue('');
                                  }}
                                  className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                  title="Save"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingField(null);
                                    setEditedValue('');
                                  }}
                                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                  title="Cancel"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                {onUpdateContent && (
                                  <button
                                    onClick={() => {
                                      setEditingField(fieldName);
                                      setEditedValue(bullet);
                                    }}
                                    disabled={selectedPage.status === 'publishing'}
                                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                                    title={`Edit bullet #${idx + 1}`}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRegenerateField(`whyBullet-${idx + 1}`)}
                                  disabled={regeneratingFields.has(`whyBullet-${idx + 1}`) || selectedPage.status === 'publishing'}
                                  className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                                  title={`Regenerate bullet #${idx + 1}`}
                                >
                                  {regeneratingFields.has(`whyBullet-${idx + 1}`) ? '...' : '🔄'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {regeneratingFields.has(`whyBullet-${idx + 1}`) ? (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 py-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-xs">Regenerating...</span>
                          </div>
                        ) : isEditingBullet ? (
                          <textarea
                            value={editedValue}
                            onChange={(e) => setEditedValue(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <>
                            <div className="text-sm text-gray-900 dark:text-white" dangerouslySetInnerHTML={{ __html: bullet }} />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {bullet.replace(/<[^>]*>/g, '').split(' ').length} words
                            </p>
                          </>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* FAQs */}
            {renderSection(
              'FAQ Section',
              'faqs',
              <div className="space-y-3">
                {selectedPage.content.faqs.map((faq, idx) => {
                  const questionFieldName = `faqs[${idx}].question`;
                  const answerFieldName = `faqs[${idx}].answer`;
                  const isEditingQuestion = editingField === questionFieldName;
                  const isEditingAnswer = editingField === answerFieldName;
                  return (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">FAQ #{idx + 1}</span>
                      <button
                        onClick={() => handleRegenerateField(`faq-${idx + 1}`)}
                        disabled={regeneratingFields.has(`faq-${idx + 1}`) || selectedPage.status === 'publishing'}
                        className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                        title={`Regenerate FAQ #${idx + 1}`}
                      >
                        {regeneratingFields.has(`faq-${idx + 1}`) ? '...' : '🔄'}
                      </button>
                    </div>
                    {regeneratingFields.has(`faq-${idx + 1}`) ? (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 py-4">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs">Regenerating...</span>
                      </div>
                    ) : (
                      <>
                        {/* Question */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Question</span>
                            <div className="flex items-center gap-1">
                              {isEditingQuestion ? (
                                <>
                                  <button
                                    onClick={() => {
                                      if (onUpdateContent) {
                                        onUpdateContent(selectedPage.pageId, questionFieldName, editedValue);
                                      }
                                      setEditingField(null);
                                      setEditedValue('');
                                    }}
                                    className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                    title="Save"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingField(null);
                                      setEditedValue('');
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    title="Cancel"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                onUpdateContent && (
                                  <button
                                    onClick={() => {
                                      setEditingField(questionFieldName);
                                      setEditedValue(faq.question);
                                    }}
                                    disabled={selectedPage.status === 'publishing'}
                                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                                    title="Edit question"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          {isEditingQuestion ? (
                            <input
                              type="text"
                              value={editedValue}
                              onChange={(e) => setEditedValue(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                              autoFocus
                            />
                          ) : (
                            <h3 className="font-semibold text-gray-900 dark:text-white">{faq.question}</h3>
                          )}
                        </div>
                        {/* Answer */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Answer ({faq.answer.split(' ').length} words)</span>
                            <div className="flex items-center gap-1">
                              {isEditingAnswer ? (
                                <>
                                  <button
                                    onClick={() => {
                                      if (onUpdateContent) {
                                        onUpdateContent(selectedPage.pageId, answerFieldName, editedValue);
                                      }
                                      setEditingField(null);
                                      setEditedValue('');
                                    }}
                                    className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                    title="Save"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingField(null);
                                      setEditedValue('');
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    title="Cancel"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                onUpdateContent && (
                                  <button
                                    onClick={() => {
                                      setEditingField(answerFieldName);
                                      setEditedValue(faq.answer);
                                    }}
                                    disabled={selectedPage.status === 'publishing'}
                                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                                    title="Edit answer"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          {isEditingAnswer ? (
                            <textarea
                              value={editedValue}
                              onChange={(e) => setEditedValue(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                              autoFocus
                            />
                          ) : (
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{faq.answer}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {/* Map Description (if exists) */}
            {selectedPage.content.mapDescription && renderSection(
              'Map Section',
              'map',
              renderField(
                'Map Description',
                'mapDescription',
                <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{selectedPage.content.mapDescription}</p>,
                `${selectedPage.content.mapDescription.split(' ').length} words`,
                selectedPage.content.mapDescription,
                true
              )
            )}
              </>
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
