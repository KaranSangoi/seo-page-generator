/**
 * Classic Editor Builder Strategy
 * Handles WordPress Classic Editor (TinyMCE) HTML content
 *
 * Note: This is a simplified strategy that doesn't use the full PageBuilderStrategy interface.
 * It's used directly in page-generation.ts and sample-page routes without the universal interface.
 */

export class ClassicEditorStrategy {
  name = 'classic-editor';

  detect(templateData: any): boolean {
    // Classic Editor: No builder meta fields, has SEO_GEN markers in content
    const rawContent = typeof templateData.content === 'object' ? templateData.content?.raw || '' : '';
    return rawContent.includes('<!-- SEO_GEN_START:') || rawContent.includes('<!-- SEO_GEN_END:');
  }
}
