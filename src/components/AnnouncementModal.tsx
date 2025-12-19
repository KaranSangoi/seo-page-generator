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
  ctaText?: string;
  ctaLink?: string;
}

// Current announcement - update this when you have new features to announce
const CURRENT_ANNOUNCEMENT: Announcement = {
  id: 'inline-content-editing-v2.2',
  version: 'v2.2',
  title: 'Full Inline Content Editing',
  description: 'Edit any generated content field directly in the preview modal before publishing.',
  features: [
    {
      icon: '✏️',
      title: 'Edit All Content Fields',
      description: 'Click the pencil icon next to any field to edit meta titles, descriptions, H1, hero text, headings, subheadings, and map descriptions.',
    },
    {
      icon: '📝',
      title: 'Edit Bullets & FAQs',
      description: 'Each bullet point and FAQ can be individually edited. Modify questions, answers, or bullet text with full HTML support.',
    },
    {
      icon: '💾',
      title: 'Edits Saved to Published Pages',
      description: 'All your edits are automatically saved and used when publishing to WordPress - what you see is what gets published.',
    },
  ],
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
