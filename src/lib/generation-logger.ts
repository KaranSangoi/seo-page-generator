/**
 * Page Generation Logger
 * Comprehensive logging system for debugging page generation issues
 *
 * Usage:
 * - Log every step of content generation
 * - Store in database for future debugging
 * - Searchable by client name, batch ID, or page ID
 */

import { prisma } from './prisma';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogStage = 'generation' | 'validation' | 'regeneration' | 'publishing' | 'elementor' | 'initialization';

export interface LogContext {
  pageId: string;
  batchId: string;
  clientId: string;
}

export interface LogData {
  [key: string]: any;
}

/**
 * Core logging function
 * Logs to both console and database for comprehensive debugging
 */
export async function logGeneration(
  context: LogContext,
  level: LogLevel,
  stage: LogStage,
  message: string,
  data?: LogData,
  duration?: number
): Promise<void> {
  // Console log with formatting
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${stage}]`;

  if (level === 'error') {
    console.error(prefix, message, data || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }

  // Store in database (async, don't await to avoid slowing down generation)
  try {
    await prisma.pageGenerationLog.create({
      data: {
        pageId: context.pageId,
        batchId: context.batchId,
        clientId: context.clientId,
        logLevel: level,
        stage,
        message,
        data: data ? JSON.stringify(data) : null,
        duration,
      },
    });
  } catch (error) {
    // Don't fail the whole operation if logging fails
    console.error('Failed to write log to database:', error);
  }
}

/**
 * Helper: Log generation start
 */
export async function logGenerationStart(
  context: LogContext,
  params: {
    pageType: string;
    service: string;
    location: string;
    primaryKeyword: string;
    rowNumber: number;
  }
): Promise<void> {
  await logGeneration(
    context,
    'info',
    'generation',
    `Starting content generation for ${params.service} in ${params.location}`,
    {
      pageType: params.pageType,
      service: params.service,
      location: params.location,
      primaryKeyword: params.primaryKeyword,
      rowNumber: params.rowNumber,
    }
  );
}

/**
 * Helper: Log generation success
 */
export async function logGenerationSuccess(
  context: LogContext,
  content: any,
  duration: number
): Promise<void> {
  await logGeneration(
    context,
    'info',
    'generation',
    'Content generation completed successfully',
    {
      contentFields: Object.keys(content),
      h1: content.h1,
      metaTitle: content.metaTitle,
    },
    duration
  );
}

/**
 * Helper: Log generation error
 */
export async function logGenerationError(
  context: LogContext,
  error: Error,
  duration: number
): Promise<void> {
  await logGeneration(
    context,
    'error',
    'generation',
    `Content generation failed: ${error.message}`,
    {
      error: error.message,
      stack: error.stack,
    },
    duration
  );
}

/**
 * Helper: Log validation start
 */
export async function logValidationStart(
  context: LogContext,
  content: any
): Promise<void> {
  await logGeneration(
    context,
    'info',
    'validation',
    'Starting content validation',
    {
      contentFields: Object.keys(content),
    }
  );
}

/**
 * Helper: Log validation results
 */
export async function logValidationResults(
  context: LogContext,
  results: {
    autoFixed: string[];
    warnings: string[];
    needsRetry: Array<{ field: string; reason: string }>;
  },
  duration: number
): Promise<void> {
  const level: LogLevel = results.needsRetry.length > 0 ? 'warn' : 'info';
  await logGeneration(
    context,
    level,
    'validation',
    `Validation completed: ${results.autoFixed.length} auto-fixed, ${results.warnings.length} warnings, ${results.needsRetry.length} need retry`,
    results,
    duration
  );
}

/**
 * Helper: Log field regeneration
 */
export async function logFieldRegeneration(
  context: LogContext,
  field: string,
  reason: string,
  success: boolean,
  duration: number
): Promise<void> {
  await logGeneration(
    context,
    success ? 'info' : 'error',
    'regeneration',
    `Field "${field}" ${success ? 'regenerated successfully' : 'failed to regenerate'}: ${reason}`,
    { field, reason, success },
    duration
  );
}

/**
 * Helper: Log publishing start
 */
export async function logPublishingStart(
  context: LogContext,
  params: {
    wordpressUrl: string;
    slug: string;
    pageType: string;
  }
): Promise<void> {
  await logGeneration(
    context,
    'info',
    'publishing',
    `Starting WordPress publishing to ${params.wordpressUrl}`,
    params
  );
}

/**
 * Helper: Log publishing success
 */
export async function logPublishingSuccess(
  context: LogContext,
  pageUrl: string,
  duration: number
): Promise<void> {
  await logGeneration(
    context,
    'info',
    'publishing',
    `Page published successfully: ${pageUrl}`,
    { pageUrl },
    duration
  );
}

/**
 * Helper: Log publishing error
 */
export async function logPublishingError(
  context: LogContext,
  error: Error,
  duration: number
): Promise<void> {
  await logGeneration(
    context,
    'error',
    'publishing',
    `Publishing failed: ${error.message}`,
    {
      error: error.message,
      stack: error.stack,
    },
    duration
  );
}

/**
 * Helper: Log Elementor content replacement
 */
export async function logElementorReplacement(
  context: LogContext,
  details: {
    templatePageId: string;
    internalLinkPlacement: string;
    externalLinkPlacement: string;
    sectionsReplaced: string[];
  }
): Promise<void> {
  await logGeneration(
    context,
    'info',
    'elementor',
    `Elementor content replaced in ${details.sectionsReplaced.length} sections`,
    details
  );
}

/**
 * Query logs for debugging
 * Use this when a user reports an issue with a specific client/page
 */
export async function getPageLogs(pageId: string) {
  return await prisma.pageGenerationLog.findMany({
    where: { pageId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Query logs by client name
 * Use this when user reports: "Client X has an issue"
 */
export async function getClientLogs(clientId: string, limit = 100) {
  return await prisma.pageGenerationLog.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      page: {
        select: {
          pageName: true,
          service: true,
          location: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Query logs by batch
 * Use this to see all logs for a specific generation batch
 */
export async function getBatchLogs(batchId: string) {
  return await prisma.pageGenerationLog.findMany({
    where: { batchId },
    orderBy: { createdAt: 'asc' },
    include: {
      page: {
        select: {
          pageName: true,
          service: true,
          location: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Find logs by client name (when you only know the company name)
 */
export async function getLogsByClientName(clientName: string, limit = 100) {
  const client = await prisma.client.findFirst({
    where: {
      clientName: {
        contains: clientName,
        mode: 'insensitive',
      },
    },
  });

  if (!client) {
    return [];
  }

  return await getClientLogs(client.id, limit);
}
