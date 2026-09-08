/**
 * Location Cards — parent-page internal linking for Nested Broad Stroke (county)
 * and Broad Stroke (town) pages.
 *
 * When NBS/BS child pages are published, we go to each child's PARENT page and
 * add a "location card" (image + location name + "Explore Service Area" button
 * linking to the child) into a pre-built Elementor grid.
 *
 * Design (Elementor-only, v1):
 *   - The client's TEMPLATE PAGE holds the canonical grid section (CSS ID
 *     `location-cards`) containing one prototype card container (CSS ID
 *     `location-card-template`).
 *   - Generated NBS pages inherit that section from the template automatically.
 *     The manual top-level Service Areas page has the same IDs set by hand.
 *   - If a parent is missing the section entirely, we self-heal by copying the
 *     section from the template page.
 *   - We keep the prototype card as a hidden clone-source; each real card is a
 *     deep clone of it with regenerated Elementor IDs, made visible, and filled.
 *   - Idempotent: a card whose button already links to the child URL is skipped.
 */

import { prisma } from '@/lib/prisma';
import { generateAndUploadTownImage, isImageGenerationAvailable } from '@/lib/town-image';

export const LOCATION_CARDS_SECTION_ID = 'location-cards';
export const LOCATION_CARDS_GRID_ID = 'location-cards-grid';
export const LOCATION_CARD_TEMPLATE_ID = 'location-card-template';
const EXPLORE_BUTTON_TEXT = 'Explore Service Area';

// ---------------------------------------------------------------------------
// Elementor tree types & helpers
// ---------------------------------------------------------------------------

interface ElementorEl {
  id: string;
  elType: string;
  widgetType?: string;
  settings?: Record<string, any>;
  elements?: ElementorEl[];
  [key: string]: any;
}

/** Elementor-style 7-char element id. */
function genElementId(): string {
  return Math.random().toString(16).substring(2, 9);
}

/** Recursively assign fresh Elementor element ids (NOT the CSS _element_id). */
function regenerateIds(el: ElementorEl): void {
  el.id = genElementId();
  if (Array.isArray(el.elements)) {
    for (const child of el.elements) regenerateIds(child);
  }
}

function getCssId(el: ElementorEl): string {
  return el.settings?._element_id || el.settings?.css_id || '';
}

/** Depth-first search for the first element with a given CSS id. */
function findByCssId(elements: ElementorEl[], cssId: string): ElementorEl | null {
  for (const el of elements) {
    if (getCssId(el) === cssId) return el;
    if (Array.isArray(el.elements)) {
      const found = findByCssId(el.elements, cssId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the array that directly contains an element with the given CSS id, plus
 * the element and its index. Lets us locate the "cards container" (the siblings
 * of the prototype card).
 */
function findContainingArray(
  elements: ElementorEl[],
  cssId: string,
): { array: ElementorEl[]; index: number; element: ElementorEl } | null {
  for (let i = 0; i < elements.length; i++) {
    if (getCssId(elements[i]) === cssId) {
      return { array: elements, index: i, element: elements[i] };
    }
    const children = elements[i].elements;
    if (Array.isArray(children)) {
      const found = findContainingArray(children, cssId);
      if (found) return found;
    }
  }
  return null;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Clear responsive-hide flags so a cloned card is visible. */
function showElement(el: ElementorEl): void {
  if (!el.settings) return;
  delete el.settings.hide_desktop;
  delete el.settings.hide_tablet;
  delete el.settings.hide_mobile;
}

/** Read the button link URL from a card, if any (used for dedup). */
function getCardButtonUrl(card: ElementorEl): string | null {
  let url: string | null = null;
  const walk = (el: ElementorEl) => {
    if (el.widgetType === 'button' && el.settings?.link?.url) {
      url = el.settings.link.url;
    }
    if (Array.isArray(el.elements)) el.elements.forEach(walk);
  };
  walk(card);
  return url;
}

/**
 * Fill a cloned card's widgets with the location's data. Targets native
 * Elementor widgets: image-box (image + title), image, heading, button.
 * NOTE: verify widget keys against a real template export.
 */
function fillCard(
  card: ElementorEl,
  data: { name: string; url: string; imageUrl: string | null; imageId: number | null; altText: string },
): void {
  const walk = (el: ElementorEl) => {
    el.settings = el.settings || {};
    switch (el.widgetType) {
      case 'image-box': {
        if (data.imageUrl) {
          el.settings.image = {
            url: data.imageUrl,
            id: data.imageId ?? undefined,
            source: 'library',
            alt: data.altText,
          };
        }
        el.settings.title_text = data.name;
        break;
      }
      case 'image': {
        if (data.imageUrl) {
          el.settings.image = { url: data.imageUrl, id: data.imageId ?? undefined, source: 'library', alt: data.altText };
        }
        break;
      }
      case 'heading': {
        el.settings.title = data.name;
        break;
      }
      case 'button': {
        el.settings.text = EXPLORE_BUTTON_TEXT;
        // Internal link to the child page: clear external/nofollow flags that the
        // template card may carry (e.g. a Jobber external CTA link).
        el.settings.link = {
          ...(el.settings.link || {}),
          url: data.url,
          is_external: '',
          nofollow: '',
        };
        break;
      }
    }
    if (Array.isArray(el.elements)) el.elements.forEach(walk);
  };
  walk(card);
}

// ---------------------------------------------------------------------------
// WordPress page read/write (mirrors simple-queue.ts fetchElementorTemplate)
// ---------------------------------------------------------------------------

/**
 * fetch with retry/backoff. This client's WordPress host (Newfold/HostGator)
 * intermittently drops connections (UND_ERR_SOCKET "other side closed") and
 * returns transient 5xx/429. Retrying turns those flaky failures into success
 * instead of aborting the card step. Retries network errors + 5xx/429.
 */
async function fetchWithRetry(url: string, opts: RequestInit, attempts = 4): Promise<Response> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 800 * (i + 1))); // 0.8s, 1.6s, 2.4s
    }
  }
  throw lastErr;
}

async function fetchPage(wordpressUrl: string, pageId: number | string, credentials: string): Promise<any | null> {
  const url = `${wordpressUrl}/wp-json/wp/v2/pages/${pageId}?context=edit&_cb=${Date.now()}`;
  try {
    const res = await fetchWithRetry(url, { headers: { Authorization: `Basic ${credentials}` } });
    if (!res.ok) {
      console.error(`[location-cards] fetch page ${pageId} failed: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json();
  } catch (e) {
    console.error(`[location-cards] fetch page ${pageId} error after retries:`, e);
    return null;
  }
}

function parseElementorData(page: any): ElementorEl[] | null {
  const data = page?.meta?._elementor_data;
  if (!data) return null;
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return null;
  }
}

/** Resolve a WordPress page id from a slug (matches getParentPageId in simple-queue). */
async function resolvePageIdBySlug(wordpressUrl: string, slug: string, credentials: string): Promise<number | null> {
  try {
    const url = `${wordpressUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&context=edit&_cb=${Date.now()}`;
    const res = await fetchWithRetry(url, { headers: { Authorization: `Basic ${credentials}` } });
    if (!res.ok) return null;
    const pages = await res.json();
    return Array.isArray(pages) && pages.length > 0 ? pages[0].id : null;
  } catch {
    return null;
  }
}

async function saveElementorData(
  wordpressUrl: string,
  pageId: number | string,
  credentials: string,
  elements: ElementorEl[],
  existingMeta: Record<string, any>,
): Promise<boolean> {
  const url = `${wordpressUrl}/wp-json/wp/v2/pages/${pageId}`;
  try {
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meta: {
          _elementor_data: JSON.stringify(elements),
          _elementor_edit_mode: 'builder',
          _elementor_version: existingMeta?._elementor_version || '3.25.0',
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[location-cards] save page ${pageId} failed: ${res.status} ${text.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[location-cards] save page ${pageId} error after retries:`, e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Section resolution & card insertion
// ---------------------------------------------------------------------------

interface CardTarget {
  grid: ElementorEl; // container whose `elements` array holds the cards
  cloneSource: ElementorEl; // pristine card to clone (from the template page)
}

/** Find the grid element within a parent tree. */
function findGrid(parentElements: ElementorEl[]): ElementorEl | null {
  // Preferred: explicit grid id.
  const byId = findByCssId(parentElements, LOCATION_CARDS_GRID_ID);
  if (byId) return byId;
  // Fallback: the array that contains the template card, mapped back to its
  // owning container (used only if the grid id wasn't set).
  const loc = findContainingArray(parentElements, LOCATION_CARD_TEMPLATE_ID);
  if (loc) {
    const owner = findOwnerOfArray(parentElements, loc.array);
    if (owner) return owner;
  }
  return null;
}

/** Find the container element whose `elements` array IS the given array. */
function findOwnerOfArray(elements: ElementorEl[], target: ElementorEl[]): ElementorEl | null {
  for (const el of elements) {
    if (el.elements === target) return el;
    if (Array.isArray(el.elements)) {
      const found = findOwnerOfArray(el.elements, target);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Ensure the parent tree has the location-cards section + grid, and return the
 * grid plus a pristine clone source (always taken from the template page so it
 * survives deletion of the parent's placeholder on re-runs).
 * Self-heals the whole section from the template if the parent lacks it.
 */
function resolveCardTarget(
  parentElements: ElementorEl[],
  templateElements: ElementorEl[] | null,
): CardTarget | null {
  // Clone source: prefer the pristine card on the template page.
  const cloneSource =
    (templateElements && findByCssId(templateElements, LOCATION_CARD_TEMPLATE_ID)) ||
    findByCssId(parentElements, LOCATION_CARD_TEMPLATE_ID);
  if (!cloneSource) return null;

  // Ensure the section exists on the parent (self-heal from template).
  let grid = findGrid(parentElements);
  if (!grid) {
    if (!templateElements) return null;
    const section = findByCssId(templateElements, LOCATION_CARDS_SECTION_ID);
    if (!section) return null;
    const sectionClone = deepClone(section);
    regenerateIds(sectionClone);
    // Insert at the section's position in the template (top-level) so it lands in
    // the same place — e.g. right below the hero — instead of at the end of the
    // page. Falls back to appending if the section isn't a top-level element.
    const tplIndex = templateElements.findIndex((el) => getCssId(el) === LOCATION_CARDS_SECTION_ID);
    if (tplIndex >= 0) {
      parentElements.splice(Math.min(tplIndex, parentElements.length), 0, sectionClone);
    } else {
      parentElements.push(sectionClone);
    }
    grid = findGrid(parentElements);
    if (!grid) return null;
  }
  grid.elements = grid.elements || [];

  return { grid, cloneSource };
}

/** Remove leftover placeholder card(s) (the clone source) from a grid. */
function removePlaceholderCards(grid: ElementorEl): void {
  if (!Array.isArray(grid.elements)) return;
  grid.elements = grid.elements.filter((card) => getCssId(card) !== LOCATION_CARD_TEMPLATE_ID);
}

/** True if a card linking to `url` already exists in the grid. */
function cardExists(grid: ElementorEl, url: string): boolean {
  return (grid.elements || []).some((card) => {
    if (getCssId(card) === LOCATION_CARD_TEMPLATE_ID) return false; // skip prototype
    const existing = getCardButtonUrl(card);
    return existing != null && normalizeUrl(existing) === normalizeUrl(url);
  });
}

function normalizeUrl(u: string): string {
  return u.replace(/\/+$/, '').toLowerCase();
}

/**
 * Remove the entire location-cards section from an element tree (used at page
 * generation so non-parent pages carry no empty placeholder). Returns true if a
 * section was removed. Mutates the array in place.
 */
export function stripLocationCardsSection(elements: ElementorEl[]): boolean {
  let removed = false;
  const filterArr = (arr: ElementorEl[]): ElementorEl[] => {
    const kept: ElementorEl[] = [];
    for (const el of arr) {
      if (getCssId(el) === LOCATION_CARDS_SECTION_ID) {
        removed = true;
        continue; // drop this section entirely
      }
      if (Array.isArray(el.elements)) el.elements = filterArr(el.elements);
      kept.push(el);
    }
    return kept;
  };
  const result = filterArr(elements);
  // Mutate in place so callers holding the same reference see the change.
  elements.length = 0;
  elements.push(...result);
  return removed;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface LocationCardsResult {
  ran: boolean;
  reason?: string;
  parentsUpdated: number;
  cardsAdded: number;
  cardsSkipped: number;
  imagesGenerated: number;
  errors: string[];
}

/** A child page that should get a card on its parent. */
export interface ChildPage {
  parentSlug: string;
  location: string;
  publishedUrl: string;
  pageType: string;
  service?: string | null;
}

/** Client fields the engine needs. */
export interface CardClientData {
  wordpressUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  templatePageId?: string | null;
  pageBuilder?: string | null;
}

// Guards against concurrent runs for the same batch within a process — e.g. the
// review flow publishing several pages in parallel, each detecting "batch done".
const inFlightBatches = new Set<string>();

/**
 * Add location cards for all NBS/BS pages in a completed batch.
 * Loads the batch + client from the DB, then delegates to addLocationCards.
 * Safe to call from any publish path; no-ops if already running for this batch.
 */
export async function addLocationCardsForBatch(batchId: string): Promise<LocationCardsResult> {
  if (inFlightBatches.has(batchId)) {
    return { ran: false, reason: 'already running for this batch', parentsUpdated: 0, cardsAdded: 0, cardsSkipped: 0, imagesGenerated: 0, errors: [] };
  }
  inFlightBatches.add(batchId);
  try {
    return await runLocationCardsForBatch(batchId);
  } finally {
    inFlightBatches.delete(batchId);
  }
}

async function runLocationCardsForBatch(batchId: string): Promise<LocationCardsResult> {
  const batch = await prisma.generationBatch.findUnique({
    where: { id: batchId },
    include: { client: true, generatedPages: true },
  });
  if (!batch) {
    return { ran: false, reason: 'batch not found', parentsUpdated: 0, cardsAdded: 0, cardsSkipped: 0, imagesGenerated: 0, errors: [] };
  }

  // Eligible children: successful NBS/BS pages with a published URL and a parent.
  const children: ChildPage[] = batch.generatedPages
    .filter(
      (p) =>
        p.status === 'success' &&
        (p.pageType === 'Nested Broad Stroke' || p.pageType === 'Broad Stroke') &&
        p.publishedUrl &&
        p.parentSlug &&
        p.location,
    )
    .map((p) => ({
      parentSlug: p.parentSlug as string,
      location: p.location as string,
      publishedUrl: p.publishedUrl as string,
      pageType: p.pageType,
      service: p.service,
    }));

  if (children.length === 0) {
    return { ran: false, reason: 'no eligible NBS/BS pages with parentSlug + publishedUrl', parentsUpdated: 0, cardsAdded: 0, cardsSkipped: 0, imagesGenerated: 0, errors: [] };
  }

  // Publish progress to the batch so the UI can show a live X/Y indicator.
  const builder = (batch.client.pageBuilder || 'elementor').toLowerCase();
  if (builder === 'elementor') {
    await prisma.generationBatch
      .update({ where: { id: batchId }, data: { cardStatus: 'in_progress', cardsTotal: children.length, cardsDone: 0 } })
      .catch(() => {});
  }

  let done = 0;
  const result = await addLocationCards(batch.client, children, {
    onProgress: async () => {
      done++;
      await prisma.generationBatch.update({ where: { id: batchId }, data: { cardsDone: done } }).catch(() => {});
    },
  });

  await prisma.generationBatch
    .update({
      where: { id: batchId },
      data: { cardStatus: result.ran ? 'completed' : (builder === 'elementor' ? 'completed' : null), cardsDone: done },
    })
    .catch(() => {});

  return result;
}

/**
 * Core engine: add location cards to parent pages for the given children.
 * Groups children by parentSlug, edits each parent page once. Callable directly
 * (tests) or via addLocationCardsForBatch (production batch path).
 */
export async function addLocationCards(
  client: CardClientData,
  children: ChildPage[],
  opts?: { onProgress?: () => Promise<void> | void },
): Promise<LocationCardsResult> {
  const result: LocationCardsResult = {
    ran: false,
    parentsUpdated: 0,
    cardsAdded: 0,
    cardsSkipped: 0,
    imagesGenerated: 0,
    errors: [],
  };
  // Called once per child processed (added, skipped, or on parent failure) so
  // callers can report live X/Y progress.
  const tick = async () => {
    if (opts?.onProgress) {
      try { await opts.onProgress(); } catch { /* progress reporting is best-effort */ }
    }
  };

  const builder = (client.pageBuilder || 'elementor').toLowerCase();
  if (builder !== 'elementor') {
    result.reason = `builder is ${builder} — location cards are Elementor-only in v1`;
    return result;
  }
  if (children.length === 0) {
    result.reason = 'no children provided';
    return result;
  }

  const credentials = Buffer.from(`${client.wpUsername}:${client.wpAppPassword}`).toString('base64');
  const wordpressUrl = client.wordpressUrl;

  // Fetch the template page tree once (used for self-heal).
  let templateElements: ElementorEl[] | null = null;
  if (client.templatePageId) {
    const tpl = await fetchPage(wordpressUrl, client.templatePageId, credentials);
    templateElements = tpl ? parseElementorData(tpl) : null;
  }

  // Group children by parentSlug.
  const byParent = new Map<string, typeof children>();
  for (const child of children) {
    const slug = child.parentSlug as string;
    if (!byParent.has(slug)) byParent.set(slug, []);
    byParent.get(slug)!.push(child);
  }

  result.ran = true;

  for (const [parentSlug, group] of byParent) {
    try {
      const parentId = await resolvePageIdBySlug(wordpressUrl, parentSlug, credentials);
      if (!parentId) {
        result.errors.push(`parent slug "${parentSlug}" not found in WordPress`);
        for (const _ of group) await tick();
        continue;
      }

      const parentPage = await fetchPage(wordpressUrl, parentId, credentials);
      const parentElements = parentPage ? parseElementorData(parentPage) : null;
      if (!parentElements) {
        result.errors.push(`parent "${parentSlug}" has no Elementor data`);
        for (const _ of group) await tick();
        continue;
      }

      const target = resolveCardTarget(parentElements, templateElements);
      if (!target) {
        result.errors.push(`no location-cards section on parent "${parentSlug}" or template page`);
        for (const _ of group) await tick();
        continue;
      }

      let addedForThisParent = 0;
      for (const child of group) {
        const url = child.publishedUrl as string;
        if (cardExists(target.grid, url)) {
          result.cardsSkipped++;
          await tick();
          continue;
        }

        // Generate + upload the town image (non-fatal if it fails).
        let imageUrl: string | null = null;
        let imageId: number | null = null;
        if (isImageGenerationAvailable()) {
          const uploaded = await generateAndUploadTownImage({
            location: child.location as string,
            pageType: child.pageType,
            service: child.service || '',
            wordpressUrl,
            credentials,
          });
          if (uploaded) {
            imageUrl = uploaded.url;
            imageId = uploaded.id;
            result.imagesGenerated++;
          }
        }

        const newCard = deepClone(target.cloneSource);
        regenerateIds(newCard);
        // Strip the template CSS id so the clone isn't treated as the prototype,
        // and make it visible.
        if (newCard.settings) delete newCard.settings._element_id;
        showElement(newCard);
        fillCard(newCard, {
          name: child.location as string,
          url,
          imageUrl,
          imageId,
          altText: `${child.service || ''} in ${child.location}`.trim(),
        });
        target.grid.elements!.push(newCard);
        result.cardsAdded++;
        addedForThisParent++;
        await tick();
      }

      if (addedForThisParent > 0) {
        // Delete the leftover placeholder card so only real cards render.
        removePlaceholderCards(target.grid);
        const ok = await saveElementorData(
          wordpressUrl,
          parentId,
          credentials,
          parentElements,
          parentPage.meta || {},
        );
        if (ok) result.parentsUpdated++;
        else result.errors.push(`failed to save parent "${parentSlug}"`);
      }
    } catch (err: any) {
      result.errors.push(`parent "${parentSlug}": ${err?.message || String(err)}`);
    }
  }

  return result;
}
