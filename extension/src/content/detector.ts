/**
 * Identifier Detector — Content Script
 *
 * Pure extraction functions for detecting Kenyan seller identifiers in a DOM
 * subtree. No side effects; no DOM mutations.
 *
 * Implements:
 *   - extractPhoneNumbers  — Requirement 1.2
 *   - extractTillNumbers   — Requirements 1.3, 1.5
 *   - extractPaybillNumbers — Requirements 1.4, 1.5
 *   - extractBusinessNames — Requirement 1.6
 *   - deduplicateIdentifiers — Requirement 1.8
 */

import type { DetectedIdentifier } from '../shared/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Matches valid Kenyan phone numbers.
 * The negative look-ahead/look-behind ensures the match is not surrounded by
 * additional digits (i.e. it is not part of a longer number string).
 */
const PHONE_REGEX =
  /(?<![+\d])((?:07|01|\+2547|\+2541|2547|2541)\d{8})(?!\d)/g;

/**
 * A standalone 5- or 6-digit sequence (not surrounded by other digits).
 */
const DIGIT_SEQ_REGEX = /(?<!\d)(\d{5,6})(?!\d)/g;

/** Keywords that indicate a till number context. */
const TILL_KEYWORDS = ['till number', 'till', 'buy goods', 'm-pesa'];

/** Keywords that indicate a paybill number context. */
const PAYBILL_KEYWORDS = [
  'paybill number',
  'paybill',
  'pay bill',
  'business number',
];

/** Maximum character distance for a keyword to be considered relevant. */
const PROXIMITY_LIMIT = 50;

/** CSS selector for elements that may carry business names. */
const BUSINESS_NAME_SELECTOR =
  'h1, h2, h3, [class*="seller"], [class*="author"], [class*="profile"]';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect all Text nodes that are descendants of `root`.
 * Skips `<script>` and `<style>` subtrees.
 */
function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName?.toUpperCase();
      if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) {
    nodes.push(n as Text);
  }
  return nodes;
}

/**
 * Returns the distance (in characters) from the end of a keyword occurrence
 * to the start of a digit sequence (or vice-versa), within the same string.
 * Returns Infinity if the keyword does not appear within `limit` characters
 * of `digitStart`..`digitEnd`.
 */
function closestKeywordDistance(
  text: string,
  digitStart: number,
  digitEnd: number,
  keywords: string[],
  limit: number
): number {
  const lower = text.toLowerCase();
  let minDist = Infinity;

  for (const kw of keywords) {
    let searchFrom = 0;
    while (true) {
      const kwIdx = lower.indexOf(kw, searchFrom);
      if (kwIdx === -1) break;

      const kwEnd = kwIdx + kw.length;

      // Distance from keyword-end to digit-start (keyword is before digit)
      if (kwEnd <= digitStart) {
        const dist = digitStart - kwEnd;
        if (dist <= limit && dist < minDist) minDist = dist;
      }

      // Distance from digit-end to keyword-start (keyword is after digit)
      if (kwIdx >= digitEnd) {
        const dist = kwIdx - digitEnd;
        if (dist <= limit && dist < minDist) minDist = dist;
      }

      searchFrom = kwIdx + 1;
    }
  }

  return minDist;
}

// ---------------------------------------------------------------------------
// Phone number extraction
// ---------------------------------------------------------------------------

/**
 * Walk all text nodes and `href="tel:..."` attributes under `root` and return
 * detected Kenyan phone numbers.
 */
export function extractPhoneNumbers(root: Node): DetectedIdentifier[] {
  const results: DetectedIdentifier[] = [];

  // --- Text nodes ---
  const textNodes = collectTextNodes(root);
  for (const node of textNodes) {
    const text = node.data;
    // Reset lastIndex before each use of a global regex
    PHONE_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PHONE_REGEX.exec(text)) !== null) {
      results.push({ value: match[1], type: 'phone', node });
    }
  }

  // --- href="tel:..." attributes ---
  if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    const el = root as Element | Document | DocumentFragment;
    const anchors = ('querySelectorAll' in el)
      ? el.querySelectorAll('a[href^="tel:"]')
      : [];

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href') ?? '';
      // Strip the "tel:" scheme and any non-digit characters except leading +
      const raw = href.replace(/^tel:/, '').trim();
      // Validate raw against the phone pattern directly (no surrounding context needed)
      const strictPhone =
        /^(07|01|\+2547|\+2541|2547|2541)\d{8}$/.test(raw);
      if (strictPhone) {
        results.push({ value: raw, type: 'phone', node: anchor });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Till number extraction
// ---------------------------------------------------------------------------

/**
 * Walk all text nodes under `root` and return 5–6 digit sequences that are
 * within 50 characters of a till keyword (and closer to a till keyword than
 * to any paybill keyword).
 */
export function extractTillNumbers(root: Node): DetectedIdentifier[] {
  const results: DetectedIdentifier[] = [];

  const textNodes = collectTextNodes(root);
  for (const node of textNodes) {
    const text = node.data;
    DIGIT_SEQ_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = DIGIT_SEQ_REGEX.exec(text)) !== null) {
      const digits = match[1];
      const start = match.index;
      const end = start + digits.length;

      const tillDist = closestKeywordDistance(
        text,
        start,
        end,
        TILL_KEYWORDS,
        PROXIMITY_LIMIT
      );
      const paybillDist = closestKeywordDistance(
        text,
        start,
        end,
        PAYBILL_KEYWORDS,
        PROXIMITY_LIMIT
      );

      // Include as till if till keyword is within range AND closer or equal
      if (tillDist <= PROXIMITY_LIMIT && tillDist <= paybillDist) {
        results.push({ value: digits, type: 'till_number', node });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Paybill number extraction
// ---------------------------------------------------------------------------

/**
 * Walk all text nodes under `root` and return 5–6 digit sequences that are
 * within 50 characters of a paybill keyword (and strictly closer to a paybill
 * keyword than to any till keyword).
 */
export function extractPaybillNumbers(root: Node): DetectedIdentifier[] {
  const results: DetectedIdentifier[] = [];

  const textNodes = collectTextNodes(root);
  for (const node of textNodes) {
    const text = node.data;
    DIGIT_SEQ_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = DIGIT_SEQ_REGEX.exec(text)) !== null) {
      const digits = match[1];
      const start = match.index;
      const end = start + digits.length;

      const tillDist = closestKeywordDistance(
        text,
        start,
        end,
        TILL_KEYWORDS,
        PROXIMITY_LIMIT
      );
      const paybillDist = closestKeywordDistance(
        text,
        start,
        end,
        PAYBILL_KEYWORDS,
        PROXIMITY_LIMIT
      );

      // Include as paybill only if paybill keyword is within range AND strictly closer
      if (paybillDist <= PROXIMITY_LIMIT && paybillDist < tillDist) {
        results.push({ value: digits, type: 'paybill', node });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Business name extraction
// ---------------------------------------------------------------------------

/**
 * Extract business/seller names from heading elements, seller-class elements,
 * and elements with `aria-label` attributes. Enforces a 2–100 character
 * length constraint on trimmed text.
 */
export function extractBusinessNames(root: Node): DetectedIdentifier[] {
  const results: DetectedIdentifier[] = [];

  if (
    root.nodeType !== Node.ELEMENT_NODE &&
    root.nodeType !== Node.DOCUMENT_NODE &&
    root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
  ) {
    return results;
  }

  const el = root as Element | Document | DocumentFragment;
  if (!('querySelectorAll' in el)) return results;

  // --- Heading / seller / author / profile elements ---
  const elements = el.querySelectorAll(BUSINESS_NAME_SELECTOR);
  for (const elem of elements) {
    const text = elem.textContent?.trim() ?? '';
    if (text.length >= 2 && text.length <= 100) {
      results.push({ value: text, type: 'business_name', node: elem });
    }
  }

  // --- aria-label attributes ---
  const withAriaLabel = el.querySelectorAll('[aria-label]');
  for (const elem of withAriaLabel) {
    const label = elem.getAttribute('aria-label')?.trim() ?? '';
    if (label.length >= 2 && label.length <= 100) {
      results.push({ value: label, type: 'business_name', node: elem });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Return a new array keeping only the first occurrence of each unique
 * `(value, type)` pair. Preserves insertion order.
 *
 * Requirement 1.8 — each unique value triggers at most one API query per page.
 */
export function deduplicateIdentifiers(
  ids: DetectedIdentifier[]
): DetectedIdentifier[] {
  const seen = new Set<string>();
  const result: DetectedIdentifier[] = [];
  for (const id of ids) {
    const key = `${id.type}:${id.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(id);
    }
  }
  return result;
}
