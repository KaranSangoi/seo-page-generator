'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';

interface Announcement {
  id: string;
  version: string;
  title: string;
  description: string;
  features: {
    icon: string;
    title: string;
    description: string;
  }[];
  setup?: {
    title: string;
    intro?: string;
    steps: string[];
    note?: string;
  };
  ctaText?: string;
  ctaLink?: string;
}

// Current announcement - update this when you have new features to announce
export const CURRENT_VERSION = 'v3.4';

const CURRENT_ANNOUNCEMENT: Announcement = {
  id: 'location-cards-v3.4',
  version: 'v3.4',
  title: 'Automatic Location Cards on Parent Pages',
  description: 'When you publish County (Nested Broad Stroke) and Town (Broad Stroke) pages, their parent page is automatically updated with a "location card" — an AI-generated town image, the location name, and an "Explore Service Area" button linking back to the new page.',
  features: [
    {
      icon: '🗺️',
      title: 'Cards Added to the Parent Automatically',
      description: 'After a batch finishes, each new NBS/BS page gets a card added to its parent page (matched via the Parent Slug). Cards are appended over time and never duplicated — re-running a batch just fills in what\'s missing.',
    },
    {
      icon: '🖼️',
      title: 'AI Town Images (Under 100KB)',
      description: 'Each card gets an aerial, Google-style town/county image generated per location, optimized to a fast-loading WebP under 100KB, with descriptive alt text ("[Service] in [Location]"), uploaded to that client\'s media library.',
    },
    {
      icon: '🧩',
      title: 'Self-Healing Section',
      description: 'If a parent page doesn\'t have the locations section yet, it\'s copied in from your template page automatically and placed in the same spot — you don\'t have to pre-build it on every parent.',
    },
    {
      icon: '🧭',
      title: 'Clean Non-Parent Pages',
      description: 'Generated pages that aren\'t parents don\'t show the section at all — it\'s only ever added to a page once it actually has child locations to link to.',
    },
    {
      icon: '⚡',
      title: 'Elementor Sites (v1)',
      description: 'This first version supports Elementor clients. Other builders are unchanged and unaffected.',
    },
  ],
  setup: {
    title: 'One-Time Setup (on your Elementor template page)',
    intro: 'To turn this on for a client, add the locations section to that client\'s template page once and give three elements a CSS ID. The app does the rest.',
    steps: [
      'In Elementor, open the client\'s template page and build an "Our Locations" section: a heading, a grid, and ONE card inside the grid. The card should contain an Image Box (image + the location name as its title) and a Button with the text "Explore Service Area".',
      'Give the OUTER section a CSS ID of "location-cards" (Advanced → CSS ID).',
      'Give the GRID container (the wrapper that directly holds the card) a CSS ID of "location-cards-grid".',
      'Give the single CARD container a CSS ID of "location-card-template".',
      'Click Update. Leave the card as-is with placeholder image/text — the app clones it and fills in the real image, name, and link for each location.',
    ],
    note: 'The button link and image on your template card can be placeholders — the app overwrites them per location. On some Elementor sites the parent page may need a one-time re-save (Update) for the new card styles to appear, due to Elementor\'s CSS caching.',
  },
};

export default function AnnouncementModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if user has seen this announcement
    try {
      const seenAnnouncements = localStorage.getItem('seenAnnouncements');
      const seenIds = seenAnnouncements ? JSON.parse(seenAnnouncements) : [];

      if (!seenIds.includes(CURRENT_ANNOUNCEMENT.id)) {
        // Show modal after a short delay for better UX
        setTimeout(() => setIsOpen(true), 1000);
      }
    } catch (error) {
      console.error('Error loading seen announcements:', error);
      // If parsing fails, reset and show announcement
      localStorage.setItem('seenAnnouncements', JSON.stringify([]));
      setTimeout(() => setIsOpen(true), 1000);
    }

    // Listen for manual open event (from VersionBadge click)
    const handleShowAnnouncement = () => setIsOpen(true);
    window.addEventListener('show-announcement', handleShowAnnouncement);
    return () => window.removeEventListener('show-announcement', handleShowAnnouncement);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      try {
        // Mark announcement as seen
        const seenAnnouncements = localStorage.getItem('seenAnnouncements');
        const seenIds = seenAnnouncements ? JSON.parse(seenAnnouncements) : [];
        seenIds.push(CURRENT_ANNOUNCEMENT.id);
        localStorage.setItem('seenAnnouncements', JSON.stringify(seenIds));
      } catch (error) {
        console.error('Error saving seen announcements:', error);
        // Reset if save fails
        localStorage.setItem('seenAnnouncements', JSON.stringify([CURRENT_ANNOUNCEMENT.id]));
      }

      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-t-2xl">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
              {CURRENT_ANNOUNCEMENT.version}
            </span>
          </div>

          <h2 className="text-3xl font-bold mb-3">
            {CURRENT_ANNOUNCEMENT.title}
          </h2>

          <p className="text-blue-100 text-lg">
            {CURRENT_ANNOUNCEMENT.description}
          </p>
        </div>

        {/* Features */}
        <div className="p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            What's New:
          </h3>

          <div className="grid gap-4">
            {CURRENT_ANNOUNCEMENT.features.map((feature, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-3xl">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Setup Guide */}
          {CURRENT_ANNOUNCEMENT.setup && (
            <div className="mt-8 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-900/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {CURRENT_ANNOUNCEMENT.setup.title}
              </h3>
              {CURRENT_ANNOUNCEMENT.setup.intro && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {CURRENT_ANNOUNCEMENT.setup.intro}
                </p>
              )}
              <ol className="space-y-3">
                {CURRENT_ANNOUNCEMENT.setup.steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-200 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              {CURRENT_ANNOUNCEMENT.setup.note && (
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t border-blue-200/60 dark:border-blue-900/40 pt-3">
                  <strong>Note:</strong> {CURRENT_ANNOUNCEMENT.setup.note}
                </p>
              )}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex gap-3 mt-8">
            {CURRENT_ANNOUNCEMENT.ctaLink && (
              <a
                href={CURRENT_ANNOUNCEMENT.ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-center"
                onClick={handleClose}
              >
                {CURRENT_ANNOUNCEMENT.ctaText || 'Learn More'}
              </a>
            )}
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
