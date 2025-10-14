'use client';

/**
 * Theme Preview Page
 * Showcases 4 different theme options for the application
 */

import { useState } from 'react';

// Theme definitions
const themes = {
  professionalBlue: {
    name: 'Professional Blue',
    description: 'Classic and trustworthy, perfect for professional SaaS',
    font: 'Inter',
    fontClass: 'font-sans', // Uses Inter
    light: {
      primary: '#3B82F6',
      accent: '#10B981',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
    },
    dark: {
      primary: '#60A5FA',
      accent: '#34D399',
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      textSecondary: '#9CA3AF',
      border: '#374151',
    },
  },
  modernPurple: {
    name: 'Modern Purple',
    description: 'Creative and contemporary with vibrant accents',
    font: 'Plus Jakarta Sans',
    fontClass: 'font-plus-jakarta',
    light: {
      primary: '#8B5CF6',
      accent: '#EC4899',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
    },
    dark: {
      primary: '#A78BFA',
      accent: '#F472B6',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      textSecondary: '#94A3B8',
      border: '#334155',
    },
  },
  cleanGreen: {
    name: 'Clean Green',
    description: 'Fresh and eco-friendly, energetic and positive',
    font: 'Inter',
    fontClass: 'font-sans',
    light: {
      primary: '#10B981',
      accent: '#F59E0B',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
    },
    dark: {
      primary: '#34D399',
      accent: '#FBBF24',
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      textSecondary: '#9CA3AF',
      border: '#374151',
    },
  },
  minimalFuturistic: {
    name: 'Minimal Futuristic',
    description: 'High-tech and sleek with modern aesthetics',
    font: 'Space Grotesk',
    fontClass: 'font-space-grotesk',
    light: {
      primary: '#06B6D4',
      accent: '#8B5CF6',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#0A0A0A',
      textSecondary: '#525252',
      border: '#E5E5E5',
    },
    dark: {
      primary: '#22D3EE',
      accent: '#A78BFA',
      background: '#000000',
      surface: '#0A0A0A',
      text: '#FAFAFA',
      textSecondary: '#A3A3A3',
      border: '#262626',
    },
  },
};

type ThemeKey = keyof typeof themes;

export default function ThemePreviewPage() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>('professionalBlue');
  const [isDark, setIsDark] = useState(false);

  const currentTheme = themes[selectedTheme];
  const colors = isDark ? currentTheme.dark : currentTheme.light;

  return (
    <div
      className={`min-h-screen ${currentTheme.fontClass}`}
      style={{
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      {/* Header */}
      <header
        className="border-b sticky top-0 z-50"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Theme Preview</h1>
            <button
              onClick={() => setIsDark(!isDark)}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: colors.primary,
                color: '#FFFFFF',
              }}
            >
              {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Theme Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Select Theme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(themes) as ThemeKey[]).map((themeKey) => (
              <button
                key={themeKey}
                onClick={() => setSelectedTheme(themeKey)}
                className="p-4 rounded-lg border-2 text-left transition-all"
                style={{
                  borderColor:
                    selectedTheme === themeKey ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <h3 className="font-bold mb-1">{themes[themeKey].name}</h3>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {themes[themeKey].description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Info */}
        <div
          className="p-6 rounded-lg mb-8"
          style={{ backgroundColor: colors.surface }}
        >
          <h2 className="text-xl font-bold mb-4">{currentTheme.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Colors</h3>
              <div className="space-y-2">
                <ColorSwatch label="Primary" color={colors.primary} />
                <ColorSwatch label="Accent" color={colors.accent} />
                <ColorSwatch label="Background" color={colors.background} />
                <ColorSwatch label="Surface" color={colors.surface} />
                <ColorSwatch label="Text" color={colors.text} />
                <ColorSwatch label="Border" color={colors.border} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Typography</h3>
              <div
                className={`text-4xl font-bold mb-2 ${currentTheme.fontClass}`}
              >
                {currentTheme.font}
              </div>
              <p style={{ color: colors.textSecondary }}>
                The quick brown fox jumps over the lazy dog
              </p>
              <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
                abcdefghijklmnopqrstuvwxyz<br />
                0123456789
              </p>
            </div>
          </div>
        </div>

        {/* Login Page Mockup */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Login Page Preview</h2>
          <div
            className="p-8 rounded-lg"
            style={{ backgroundColor: colors.surface }}
          >
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-center mb-2">
                Sign in to your account
              </h3>
              <p
                className="text-center text-sm mb-6"
                style={{ color: colors.textSecondary }}
              >
                Or{' '}
                <span style={{ color: colors.primary }} className="font-medium">
                  create a new account
                </span>
              </p>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
                <button
                  className="w-full py-2 rounded-md font-medium"
                  style={{
                    backgroundColor: colors.primary,
                    color: '#FFFFFF',
                  }}
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Card */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Dashboard Card Preview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="p-6 rounded-lg border"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Total Clients</h3>
                <span
                  className="text-2xl"
                  style={{ color: colors.primary }}
                >
                  📊
                </span>
              </div>
              <p className="text-3xl font-bold" style={{ color: colors.primary }}>
                24
              </p>
              <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                +3 this month
              </p>
            </div>

            <div
              className="p-6 rounded-lg border"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Pages Generated</h3>
                <span
                  className="text-2xl"
                  style={{ color: colors.accent }}
                >
                  ✅
                </span>
              </div>
              <p className="text-3xl font-bold" style={{ color: colors.accent }}>
                1,247
              </p>
              <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                +156 this week
              </p>
            </div>

            <div
              className="p-6 rounded-lg border"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Success Rate</h3>
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-3xl font-bold">98.5%</p>
              <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                Last 30 days
              </p>
            </div>
          </div>
        </div>

        {/* Buttons - All States */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Button States</h2>
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: colors.surface }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Primary Buttons */}
              <div>
                <h3 className="font-semibold mb-3">Primary</h3>
                <div className="space-y-2">
                  <button
                    className="w-full px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: colors.primary,
                      color: '#FFFFFF',
                    }}
                  >
                    Normal
                  </button>
                  <button
                    className="w-full px-4 py-2 rounded-md font-medium opacity-50 cursor-not-allowed"
                    style={{
                      backgroundColor: colors.primary,
                      color: '#FFFFFF',
                    }}
                    disabled
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {/* Secondary Buttons */}
              <div>
                <h3 className="font-semibold mb-3">Secondary</h3>
                <div className="space-y-2">
                  <button
                    className="w-full px-4 py-2 rounded-md font-medium border transition-colors"
                    style={{
                      borderColor: colors.primary,
                      color: colors.primary,
                      backgroundColor: 'transparent',
                    }}
                  >
                    Normal
                  </button>
                  <button
                    className="w-full px-4 py-2 rounded-md font-medium border opacity-50 cursor-not-allowed"
                    style={{
                      borderColor: colors.primary,
                      color: colors.primary,
                      backgroundColor: 'transparent',
                    }}
                    disabled
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {/* Accent Buttons */}
              <div>
                <h3 className="font-semibold mb-3">Accent</h3>
                <div className="space-y-2">
                  <button
                    className="w-full px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: colors.accent,
                      color: '#FFFFFF',
                    }}
                  >
                    Normal
                  </button>
                  <button
                    className="w-full px-4 py-2 rounded-md font-medium opacity-50 cursor-not-allowed"
                    style={{
                      backgroundColor: colors.accent,
                      color: '#FFFFFF',
                    }}
                    disabled
                  >
                    Disabled
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Form Elements</h2>
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: colors.surface }}
          >
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Text Input
                </label>
                <input
                  type="text"
                  placeholder="Enter text..."
                  className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Select Dropdown
                </label>
                <select
                  className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Textarea
                </label>
                <textarea
                  placeholder="Enter description..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="checkbox"
                  className="w-4 h-4 rounded"
                  style={{ accentColor: colors.primary }}
                />
                <label htmlFor="checkbox" className="text-sm">
                  I agree to the terms and conditions
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Accent Color Usage Examples */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Accent Color Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Success Alert */}
            <div
              className="p-4 rounded-lg border-l-4"
              style={{
                backgroundColor: colors.surface,
                borderLeftColor: colors.accent,
              }}
            >
              <div className="flex items-start gap-3">
                <span style={{ color: colors.accent }}>✓</span>
                <div>
                  <h4 className="font-semibold">Success</h4>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    Pages generated successfully
                  </p>
                </div>
              </div>
            </div>

            {/* Badge */}
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: colors.surface }}
            >
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: colors.accent,
                    color: '#FFFFFF',
                  }}
                >
                  Active
                </span>
              </div>
            </div>

            {/* Progress */}
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: colors.surface }}
            >
              <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                Processing: 75%
              </p>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: colors.border }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    backgroundColor: colors.accent,
                    width: '75%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dark/Light Toggle Demo */}
        <div
          className="p-6 rounded-lg"
          style={{ backgroundColor: colors.surface }}
        >
          <h2 className="text-xl font-bold mb-4">Current Mode: {isDark ? 'Dark' : 'Light'}</h2>
          <p style={{ color: colors.textSecondary }}>
            Toggle between light and dark modes using the button in the header to see how
            each theme adapts to different color schemes.
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper component for color swatches
function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-md border border-gray-300"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500">{color}</p>
      </div>
    </div>
  );
}
