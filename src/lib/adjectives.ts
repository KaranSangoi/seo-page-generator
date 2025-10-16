/**
 * Predefined Adjectives for SEO Keywords
 * Ensures consistency between preview and actual generation
 *
 * This list provides deterministic adjective selection so that:
 * 1. Preview modal shows the exact adjective that will be used
 * 2. Actual generation uses the same adjective as previewed
 * 3. Regeneration reuses the original adjective
 */

export const ADJECTIVES = [
  'Professional',
  'Expert',
  'Trusted',
  'Reliable',
  'Certified',
  'Licensed',
  'Experienced',
  'Quality',
  'Top-Rated',
  'Premier',
  'Leading',
  'Specialized',
  'Skilled',
  'Qualified',
  'Affordable',
  'Local',
  'Reputable',
  'Proven',
  'Dependable',
  'Elite',
  'Superior',
  'Outstanding',
  'Exceptional',
  'First-Class',
  'High-Quality',
  'Accredited',
  'Vetted',
  'Recommended',
  'Award-Winning',
  'Industry-Leading',
  'Full-Service',
  'Comprehensive',
  'Custom',
  'Tailored',
  'Personalized',
  'Fast',
  'Quick',
  'Same-Day',
  'Emergency',
  '24/7',
  'Responsive',
  'Timely',
  'Prompt',
  'Efficient',
  'Effective',
  'Guaranteed',
  'Insured',
  'Bonded',
  'Background-Checked',
  'Verified',
] as const;

/**
 * Get adjective by index (cycles through list if index exceeds length)
 */
export function getAdjectiveByIndex(index: number): string {
  return ADJECTIVES[index % ADJECTIVES.length];
}

/**
 * Get multiple adjectives for a batch (deterministic based on starting index)
 */
export function getAdjectives(count: number, startIndex: number = 0): string[] {
  const adjectives: string[] = [];
  for (let i = 0; i < count; i++) {
    adjectives.push(getAdjectiveByIndex(startIndex + i));
  }
  return adjectives;
}

/**
 * Get adjective for a specific row number (1-indexed)
 */
export function getAdjectiveForRow(rowNumber: number): string {
  // Convert 1-indexed to 0-indexed
  return getAdjectiveByIndex(rowNumber - 1);
}

/**
 * Get total count of available adjectives
 */
export function getAdjectiveCount(): number {
  return ADJECTIVES.length;
}
