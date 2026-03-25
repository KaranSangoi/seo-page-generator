'use client';

import { CURRENT_VERSION } from './AnnouncementModal';

export default function VersionBadge() {
  const handleClick = () => {
    window.dispatchEvent(new Event('show-announcement'));
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors cursor-pointer"
      title="View latest changes"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
      {CURRENT_VERSION}
    </button>
  );
}
