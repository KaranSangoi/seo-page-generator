'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

interface SetupGuideClientProps {
  markdownContent: string;
}

export default function SetupGuideClient({ markdownContent }: SetupGuideClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                SEO Page Generator
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Setup Guide</p>
            </div>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-8 md:p-12 lg:p-16">
            <article className="prose prose-lg prose-gray dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-0 prose-h1:pb-4 prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-700
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-primary-700 dark:prose-h2:text-primary-400
              prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-gray-800 dark:prose-h3:text-gray-200
              prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-3
              prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
              prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline hover:prose-a:text-primary-700 dark:hover:prose-a:text-primary-300
              prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold
              prose-em:text-gray-700 dark:prose-em:text-gray-300
              prose-code:text-primary-700 dark:prose-code:text-primary-300 prose-code:bg-primary-50 dark:prose-code:bg-primary-900/30 prose-code:px-2 prose-code:py-1 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-[''] prose-code:font-semibold
              prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-700 dark:prose-pre:border-gray-600 prose-pre:rounded-lg prose-pre:shadow-inner prose-pre:p-4 prose-pre:overflow-x-auto
              prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:bg-primary-50/50 dark:prose-blockquote:bg-primary-900/10 prose-blockquote:py-3 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:my-6 prose-blockquote:shadow-sm
              prose-ul:my-6 prose-ul:space-y-2 prose-ul:list-disc prose-ul:pl-6
              prose-ol:my-6 prose-ol:space-y-2 prose-ol:list-decimal prose-ol:pl-6
              prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:leading-relaxed prose-li:my-1
              prose-hr:border-gray-300 dark:prose-hr:border-gray-600 prose-hr:my-10
              prose-table:border-collapse prose-table:w-full prose-table:my-6
              prose-th:bg-gray-100 dark:prose-th:bg-gray-700 prose-th:p-3 prose-th:text-left prose-th:font-semibold prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600
              prose-td:p-3 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600
              prose-img:rounded-lg prose-img:shadow-md prose-img:my-8">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom rendering for better spacing
                  h1: ({node, ...props}) => <h1 className="scroll-mt-20" {...props} />,
                  h2: ({node, ...props}) => <h2 className="scroll-mt-20" {...props} />,
                  h3: ({node, ...props}) => <h3 className="scroll-mt-20" {...props} />,
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </article>
          </div>
        </div>

        {/* Bottom Padding */}
        <div className="h-12"></div>
      </main>
    </div>
  );
}
