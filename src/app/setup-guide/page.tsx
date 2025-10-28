import { promises as fs } from 'fs';
import path from 'path';
import SetupGuideClient from './SetupGuideClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Setup Guide - SEO Page Generator',
  description: 'Complete setup guide for configuring WordPress with Divi or Elementor',
};

export default async function SetupGuidePage() {
  // Read the markdown file
  const filePath = path.join(process.cwd(), 'docs', 'ENDUSER_SETUP_GUIDE.md');
  const markdownContent = await fs.readFile(filePath, 'utf-8');

  return <SetupGuideClient markdownContent={markdownContent} />;
}
