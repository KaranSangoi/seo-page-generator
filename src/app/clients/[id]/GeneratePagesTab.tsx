'use client';

/**
 * Generate Pages Tab - CSV Upload and Page Generation
 */

import { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';

interface GeneratePagesTabProps {
  clientId: string;
}

interface CSVRow {
  'Page Type': string;
  'Service': string;
  'Location': string;
  'Parent Slug': string;
  'External Link Section': string;
  'Omit Sections': string;
}

interface ParsedPage {
  pageType: string;
  service: string;
  location: string;
  parentSlug: string;
  externalLinkSection: string;
  omitSections: string[];
  rowNumber: number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

type PageStatus = 'pending' | 'generating' | 'validating' | 'publishing' | 'success' | 'failed';

interface PageProgress {
  page: ParsedPage;
  pageId?: string;
  status: PageStatus;
  url?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
  isRegenerating?: boolean;
}

const VALID_PAGE_TYPES = ['Primary Service', 'Nested Broad Stroke', 'Broad Stroke', 'Location Service'];
const VALID_LINK_SECTIONS = ['benefits-1', 'benefits-2', 'benefits-3', 'why-1', 'why-2', 'why-3'];
const VALID_OMIT_SECTIONS = ['FAQ', 'Map', 'Why', 'Benefits'];

export default function GeneratePagesTab({ clientId }: GeneratePagesTabProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedPages, setParsedPages] = useState<ParsedPage[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pageProgress, setPageProgress] = useState<PageProgress[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<Array<{
    pageName: string;
    slug: string;
    parent: string;
    primaryKeyword: string;
  }>>([]);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [samplePageUrl, setSamplePageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Download sample CSV
  const downloadSampleCSV = () => {
    const sampleData = `Page Type,Service,Location,Parent Slug,External Link Section,Omit Sections
Location Service,Roof Repair,Gilbert AZ,roofing,benefits-2,
Broad Stroke,Roofing Services,Maricopa County AZ,roofing,why-1,FAQ
Location Service,Painting,Newberry FL,painting,benefits-1,Map
Primary Service,Commercial Glass Installation,,,benefits-3,
Nested Broad Stroke,Glass Services,Kerr County TX,glass,,`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-pages.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Parse and validate CSV
  const handleFileUpload = (file: File) => {
    setCsvFile(file);
    setParsedPages([]);
    setValidationErrors([]);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const pages: ParsedPage[] = [];
        const errors: ValidationError[] = [];

        results.data.forEach((row, index) => {
          const rowNumber = index + 2; // +2 because of header row and 0-index

          const pageType = row['Page Type']?.trim() || '';
          const service = row['Service']?.trim() || '';
          const location = row['Location']?.trim() || '';

          // Validate required fields
          if (!pageType) {
            errors.push({ row: rowNumber, field: 'Page Type', message: 'Page Type is required' });
          }

          // Validate Page Type
          if (pageType && !VALID_PAGE_TYPES.includes(pageType)) {
            errors.push({
              row: rowNumber,
              field: 'Page Type',
              message: `Invalid Page Type. Must be one of: ${VALID_PAGE_TYPES.join(', ')}`,
            });
          }

          // Validate required fields based on page type
          const isBroadStroke = pageType === 'Broad Stroke' || pageType === 'Nested Broad Stroke';
          const isServicePage = pageType === 'Primary Service' || pageType === 'Location Service';

          if (isBroadStroke && !location) {
            errors.push({ row: rowNumber, field: 'Location', message: 'Location is required for Broad Stroke pages' });
          }

          if (isServicePage && !service) {
            errors.push({ row: rowNumber, field: 'Service', message: 'Service is required for Service pages' });
          }

          // Validate External Link Section (if provided)
          if (row['External Link Section']?.trim() && !VALID_LINK_SECTIONS.includes(row['External Link Section'].trim())) {
            errors.push({
              row: rowNumber,
              field: 'External Link Section',
              message: `Invalid External Link Section. Must be one of: ${VALID_LINK_SECTIONS.join(', ')}`,
            });
          }

          // Parse and validate Omit Sections
          const omitSections = row['Omit Sections']
            ? row['Omit Sections'].split(',').map((s) => s.trim()).filter(Boolean)
            : [];

          omitSections.forEach((section) => {
            if (!VALID_OMIT_SECTIONS.includes(section)) {
              errors.push({
                row: rowNumber,
                field: 'Omit Sections',
                message: `Invalid section "${section}". Must be one of: ${VALID_OMIT_SECTIONS.join(', ')}`,
              });
            }
          });

          // Add to parsed pages
          pages.push({
            pageType,
            service,
            location,
            parentSlug: row['Parent Slug']?.trim() || '',
            externalLinkSection: row['External Link Section']?.trim() || '',
            omitSections,
            rowNumber,
          });
        });

        setParsedPages(pages);
        setValidationErrors(errors);
      },
      error: (error) => {
        setValidationErrors([{ row: 0, field: 'File', message: `Failed to parse CSV: ${error.message}` }]);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      handleFileUpload(file);
    } else {
      setValidationErrors([{ row: 0, field: 'File', message: 'Please upload a valid CSV file' }]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Poll batch status from API
  const pollBatchStatus = async (currentBatchId: string) => {
    try {
      const response = await fetch(`/api/generate?batchId=${currentBatchId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch batch status');
      }

      const data = await response.json();

      if (data.success && data.batch) {
        const batch = data.batch;

        // Update progress for each page
        const updatedProgress: PageProgress[] = batch.pages.map((apiPage: any) => {
          const parsedPage = parsedPages.find((p) => p.rowNumber === apiPage.rowNumber);
          const existingProgress = pageProgress.find((p) => p.page.rowNumber === apiPage.rowNumber);

          return {
            page: parsedPage || {
              pageType: apiPage.pageType,
              service: '',
              location: '',
              parentSlug: '',
              externalLinkSection: '',
              omitSections: [],
              rowNumber: apiPage.rowNumber || 0,
            },
            pageId: apiPage.id,
            status: apiPage.status as PageStatus,
            url: apiPage.publishedUrl,
            error: apiPage.errorMessage,
            startTime: Date.now() - (apiPage.timeElapsed || 0),
            endTime: apiPage.status === 'success' || apiPage.status === 'failed' ? Date.now() : undefined,
            isRegenerating: existingProgress?.isRegenerating || false,
          };
        });

        setPageProgress(updatedProgress);

        // Check if batch is complete
        const allComplete = batch.pages.every(
          (p: any) => p.status === 'success' || p.status === 'failed'
        );

        if (allComplete || batch.status === 'completed' || batch.status === 'failed') {
          setIsGenerating(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Error polling batch status:', error);
    }
  };

  // Real generation function using API
  const startGeneration = async () => {
    // Clear existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    setIsGenerating(true);
    setStartTime(Date.now());

    // Initialize progress for all pages
    const progress: PageProgress[] = parsedPages.map((page) => ({
      page,
      status: 'pending',
    }));
    setPageProgress(progress);

    // Timer for elapsed time
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    timerRef.current = timer;

    try {
      // Call API to queue batch
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          pages: parsedPages.map((page) => ({
            pageType: page.pageType,
            service: page.service,
            location: page.location,
            parentSlug: page.parentSlug,
            externalLinkSection: page.externalLinkSection,
            omitSections: page.omitSections,
            rowNumber: page.rowNumber,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.details || 'Failed to start generation';

        // Show detailed error without stopping the UI
        setValidationErrors([
          {
            row: 0,
            field: 'API Error',
            message: errorMessage,
          },
        ]);

        setIsGenerating(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      const data = await response.json();

      if (data.success && data.batchId) {
        setBatchId(data.batchId);

        // Start polling for status updates every 3 seconds
        const pollInterval = setInterval(() => {
          pollBatchStatus(data.batchId);
        }, 3000);
        pollIntervalRef.current = pollInterval;

        // Initial poll
        pollBatchStatus(data.batchId);
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Show error in validation errors section
      setValidationErrors([
        {
          row: 0,
          field: 'System Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ]);
    }
  };

  const resetUpload = () => {
    // Clear all timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setCsvFile(null);
    setParsedPages([]);
    setValidationErrors([]);
    setPageProgress([]);
    setIsGenerating(false);
    setStartTime(null);
    setBatchId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const regeneratePage = async (pageId: string, pageIndex: number) => {
    // Mark page as regenerating
    setPageProgress((prev) =>
      prev.map((p, idx) =>
        idx === pageIndex ? { ...p, isRegenerating: true, status: 'generating' as PageStatus } : p
      )
    );

    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageId }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate page');
      }

      const data = await response.json();

      if (data.success) {
        // Update progress with success
        setPageProgress((prev) =>
          prev.map((p, idx) =>
            idx === pageIndex
              ? {
                  ...p,
                  status: 'success' as PageStatus,
                  url: data.page.publishedUrl,
                  error: undefined,
                  isRegenerating: false,
                }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      // Update progress with error
      setPageProgress((prev) =>
        prev.map((p, idx) =>
          idx === pageIndex
            ? {
                ...p,
                status: 'failed' as PageStatus,
                error: error instanceof Error ? error.message : 'Failed to regenerate',
                isRegenerating: false,
              }
            : p
        )
      );
    }
  };

  const generateSamplePage = async () => {
    setIsGeneratingSample(true);
    setSamplePageUrl(null);

    try {
      const response = await fetch('/api/sample-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate sample page');
      }

      const data = await response.json();

      if (data.success) {
        setSamplePageUrl(data.pageUrl);
      }
    } catch (error) {
      console.error('Sample page generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate sample page');
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const isValid = parsedPages.length > 0 && validationErrors.length === 0;
  const estimatedMinutes = Math.ceil(parsedPages.length * 1); // ~1 min per page
  const completedCount = pageProgress.filter((p) => p.status === 'success').length;
  const failedCount = pageProgress.filter((p) => p.status === 'failed').length;
  const progressPercent = parsedPages.length > 0 ? (completedCount / parsedPages.length) * 100 : 0;
  const elapsedSeconds = startTime ? Math.floor((currentTime - startTime) / 1000) : 0;

  const getStatusIcon = (status: PageStatus) => {
    switch (status) {
      case 'pending':
        return <span className="text-gray-400">⏳</span>;
      case 'generating':
        return <span className="text-blue-500">⚙️</span>;
      case 'validating':
        return <span className="text-yellow-500">✓</span>;
      case 'publishing':
        return <span className="text-purple-500">📤</span>;
      case 'success':
        return <span className="text-accent-600 dark:text-accent-400">✅</span>;
      case 'failed':
        return <span className="text-red-600 dark:text-red-400">❌</span>;
    }
  };

  const getStatusText = (status: PageStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'generating':
        return 'Generating content...';
      case 'validating':
        return 'Validating...';
      case 'publishing':
        return 'Publishing to WordPress...';
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get display name based on page type
  const getPageDisplayName = (page: ParsedPage) => {
    const isBroadStroke = page.pageType === 'Broad Stroke' || page.pageType === 'Nested Broad Stroke';
    if (isBroadStroke && page.location) {
      return page.service ? `${page.service} in ${page.location}` : page.location;
    }
    return page.service || page.location || 'Untitled Page';
  };

  // Generate slug based on page type
  const generateSlug = (page: ParsedPage) => {
    const isBroadStroke = page.pageType === 'Broad Stroke' || page.pageType === 'Nested Broad Stroke';

    // Broad Stroke/Nested Broad Stroke: use location as slug
    // Primary Service/Location Service: use service as slug
    const slugSource = isBroadStroke ? page.location : page.service;

    return slugSource
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Generate primary keyword: adjective + service + in + location
  const generatePrimaryKeyword = (page: ParsedPage, adjective: string) => {
    // All pages should follow: adjective + service + in + location (when both exist)
    if (page.service && page.location) {
      return `${adjective} ${page.service} in ${page.location}`;
    } else if (page.service) {
      return `${adjective} ${page.service}`;
    } else if (page.location) {
      return `${adjective} ${page.location}`;
    }
    return adjective;
  };

  // Show preview modal with all page details
  const showGenerationPreview = () => {
    // Preview adjectives (actual adjectives will be generated server-side)
    const previewAdjectives = [
      'Professional', 'Expert', 'Trusted', 'Reliable', 'Certified',
      'Licensed', 'Experienced', 'Quality', 'Top-Rated', 'Premier',
      'Skilled', 'Qualified', 'Reputable', 'Dependable', 'Affordable'
    ];

    // Generate preview data
    const preview = parsedPages.map((page, index) => {
      const pageName = getPageDisplayName(page);
      const slug = generateSlug(page);
      const adjective = previewAdjectives[index % previewAdjectives.length];

      return {
        pageName,
        slug,
        parent: page.parentSlug || 'None',
        primaryKeyword: generatePrimaryKeyword(page, adjective),
      };
    });

    setPreviewData(preview);
    setShowPreviewModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Sample Page Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Your Template Style
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Generate a sample page to preview how your Elementor template will look before generating pages at scale.
              This helps verify styling, fonts, colors, and layout.
            </p>
            {samplePageUrl && (
              <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                  ✓ Sample page created successfully!
                </p>
                <a
                  href={samplePageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  View Sample Page →
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
          <button
            onClick={generateSamplePage}
            disabled={isGeneratingSample}
            className="ml-4 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium whitespace-nowrap"
          >
            {isGeneratingSample ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Generate Sample Page
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Section */}
      {!csvFile && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload CSV File</h2>
            <button
              onClick={downloadSampleCSV}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Sample CSV
            </button>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragOver
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
            }`}
          >
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Drag and drop your CSV file here, or
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors text-sm font-medium"
            >
              Browse Files
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
              CSV format: Page Type, Service, Location, Parent Slug, External Link Section, Omit Sections
            </p>
          </div>
        </div>
      )}

      {/* Preview & Validation */}
      {csvFile && !isGenerating && pageProgress.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">CSV Preview</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                File: {csvFile.name} • {parsedPages.length} pages
              </p>
            </div>
            <button
              onClick={resetUpload}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Change File
            </button>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                    Validation Errors ({validationErrors.length})
                  </h3>
                  <div className="space-y-1">
                    {validationErrors.map((error, idx) => (
                      <p key={idx} className="text-sm text-red-700 dark:text-red-300">
                        Row {error.row}: <strong>{error.field}</strong> - {error.message}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedPages.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">#</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Page Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Service</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Parent</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Omit</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedPages.slice(0, 10).map((page, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{page.rowNumber}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{page.pageType}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{page.service || '-'}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{page.location || '-'}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{page.parentSlug || '-'}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {page.omitSections.length > 0 ? page.omitSections.join(', ') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedPages.length > 10 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                  Showing first 10 of {parsedPages.length} pages
                </p>
              )}
            </div>
          )}

          {/* Generation Controls */}
          {parsedPages.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Ready to generate {parsedPages.length} pages
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Estimated time: ~{estimatedMinutes} {estimatedMinutes === 1 ? 'minute' : 'minutes'}
                  </p>
                </div>
                <button
                  onClick={showGenerationPreview}
                  disabled={!isValid}
                  className="px-6 py-3 bg-accent-600 text-white rounded-lg hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                  Preview & Start Generation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Tracking */}
      {pageProgress.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {isGenerating ? 'Generation Progress' : 'Generation Results'}
          </h2>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {completedCount} of {parsedPages.length} pages completed
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-accent-600 dark:bg-accent-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Time elapsed: {formatTime(elapsedSeconds)}</span>
              {completedCount < parsedPages.length && (
                <span>
                  Est. remaining: {formatTime(Math.ceil((parsedPages.length - completedCount) * 60))}
                </span>
              )}
            </div>
          </div>

          {/* Page List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pageProgress.map((progress, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <span className="text-xl mt-0.5">{getStatusIcon(progress.status)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {getPageDisplayName(progress.page)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {getStatusText(progress.status)}
                  </p>
                  {progress.url && (
                    <a
                      href={progress.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block"
                    >
                      View page →
                    </a>
                  )}
                  {progress.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{progress.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {progress.startTime && progress.endTime && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {Math.round((progress.endTime - progress.startTime) / 1000)}s
                    </span>
                  )}
                  {progress.status === 'failed' && progress.pageId && !progress.isRegenerating && (
                    <button
                      onClick={() => regeneratePage(progress.pageId!, idx)}
                      className="px-3 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors"
                      title="Regenerate this page"
                    >
                      Retry
                    </button>
                  )}
                  {progress.isRegenerating && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">Regenerating...</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {completedCount === parsedPages.length && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Generation Complete!
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {completedCount} successful • {failedCount} failed • Total time: {formatTime(elapsedSeconds)}
                  </p>
                </div>
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Generate More Pages
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Preview Pages Before Generation
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review the pages, slugs, parents, and primary keywords that will be used
              </p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">#</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Page Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Slug</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Parent</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Primary Keyword</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{index + 1}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{item.pageName}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                          <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                            {item.slug}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                          {item.parent === 'None' ? (
                            <span className="text-gray-400 italic">None</span>
                          ) : (
                            <code className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                              {item.parent}
                            </code>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">
                          <span className="text-sm font-medium text-accent-600 dark:text-accent-400">
                            {item.primaryKeyword}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {previewData.length} pages ready for generation
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    startGeneration();
                  }}
                  className="px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all text-sm font-medium"
                >
                  Confirm & Start Generation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
