/**
 * Content Script Entry Point — `src/content/content.ts`
 *
 * Injected by the browser into pages matching *.jiji.co.ke/* and
 * facebook.com/marketplace/* (see manifest.json content_scripts).
 *
 * Responsibilities:
 *  - On DOMContentLoaded (or immediately if the document is already parsed):
 *      1. Scan `document.body` with all `extract*` functions.
 *      2. Deduplicate detected identifiers.
 *      3. Inject loading badges immediately (Requirement 8.1 — within 300ms).
 *      4. Send `LOOKUP` messages to the Background Service Worker in batches
 *         of ≤5, yielding to the main thread between batches via `setTimeout`
 *         (Requirement 8.3 — no batch blocks main thread > 16ms).
 *  - Listen for `RESULT` messages pushed back from the Background SW and call
 *    `updateBadge` on the matching host element.
 *  - Maintain a `Map<string, HTMLElement>` keyed as `${type}:${value}` for
 *    async badge updates.
 *  - Wire `DOMObserver` so dynamically inserted nodes are re-scanned within
 *    500ms (Requirement 1.7).
 *  - Reset deduplication state on SPA navigations (popstate / patched
 *    history.pushState) and re-scan document.body (Requirement 1.8).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 3.1, 3.13, 8.1, 8.3, 8.5
 */

import {
  extractPhoneNumbers,
  extractTillNumbers,
  extractPaybillNumbers,
  extractBusinessNames,
  deduplicateIdentifiers,
} from './detector';
import { injectBadge, updateBadge } from './injector';
import DOMObserver from './observer';
import type {
  DetectedIdentifier,
  ResultMessage,
  LookupMessage,
  TrustResult,
  IdentifierType,
} from '../shared/types';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * Maps `${type}:${value}` → badge host element so that async RESULT messages
 * can update the correct badge regardless of arrival order.
 */
const badgeMap = new Map<string, HTMLElement>();

/**
 * Per-page deduplication set. Cleared on each SPA navigation event
 * (Requirement 1.8) so that navigating to a new listing re-scans fresh.
 */
let seenKeys = new Set<string>();

/** Maximum identifiers dispatched per batch (Requirement 8.3). */
const BATCH_SIZE = 5;

// ---------------------------------------------------------------------------
// scanRoot — scan a DOM subtree for identifiers and process them
// ---------------------------------------------------------------------------

/**
 * Scans a DOM subtree (`root`) for all types of seller identifiers,
 * deduplicates against the per-page `seenKeys` set, injects loading badges
 * immediately, then dispatches `LOOKUP` messages to the Background SW in
 * batches of `BATCH_SIZE`.
 *
 * Called both on initial page load (with `document.body`) and by the
 * DOMObserver callback (with individual newly-added nodes).
 */
function scanRoot(root: Node): void {
  const phone = extractPhoneNumbers(root);
  const till = extractTillNumbers(root);
  const paybill = extractPaybillNumbers(root);
  const biz = extractBusinessNames(root);

  // Deduplicate within this scan pass first, then filter against seen set
  const all = deduplicateIdentifiers([...phone, ...till, ...paybill, ...biz]);

  const newIdentifiers = all.filter((id) => {
    const key = `${id.type}:${id.value}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  if (newIdentifiers.length === 0) return;

  // Inject LOADING badges immediately — satisfies Requirement 8.1
  // (all badges injected synchronously before any async work begins)
  for (const id of newIdentifiers) {
    const loadingResult: TrustResult = {
      value: id.value,
      type: id.type as IdentifierType,
      state: 'LOADING',
    };
    const host = injectBadge(id.node, loadingResult);
    if (host) {
      badgeMap.set(`${id.type}:${id.value}`, host);
    }
  }

  // Dispatch LOOKUP messages in batches with main-thread yielding between
  // batches (Requirement 8.3).
  dispatchInBatches(newIdentifiers);
}

// ---------------------------------------------------------------------------
// dispatchInBatches — fire LOOKUP messages in groups of BATCH_SIZE
// ---------------------------------------------------------------------------

/**
 * Sends `LOOKUP` messages to the Background Service Worker for each
 * identifier, processing them in groups of `BATCH_SIZE` and yielding the
 * main thread between groups via `setTimeout(0)`.
 *
 * The `tabId` field is set to 0 because content scripts cannot know their
 * own tab ID. The Background SW uses `sender.tab?.id` (the authoritative
 * source provided by the Chrome runtime) when it receives the message.
 *
 * Requirement 8.3 — no single batch blocks the main thread for more than 16ms.
 */
async function dispatchInBatches(identifiers: DetectedIdentifier[]): Promise<void> {
  for (let i = 0; i < identifiers.length; i += BATCH_SIZE) {
    const batch = identifiers.slice(i, i + BATCH_SIZE);

    for (const id of batch) {
      const msg: LookupMessage = {
        type: 'LOOKUP',
        // Content scripts cannot read their own tabId; the Background SW
        // uses sender.tab.id as the authoritative tab identifier.
        tabId: 0,
        identifier: {
          value: id.value,
          type: id.type as IdentifierType,
        },
      };
      // Fire-and-forget; the RESULT arrives via the onMessage listener below.
      chrome.runtime.sendMessage(msg).catch(() => {
        // SW may not yet be active — silently ignore.
      });
    }

    // Yield between batches so the browser can process user events and paint.
    if (i + BATCH_SIZE < identifiers.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
}

// ---------------------------------------------------------------------------
// RESULT message listener
// ---------------------------------------------------------------------------

/**
 * Listens for `RESULT` messages pushed from the Background Service Worker
 * (via `chrome.tabs.sendMessage`) and updates the matching badge.
 *
 * Requirements: 3.1, 3.13
 */
chrome.runtime.onMessage.addListener((message: unknown): void => {
  if (!message || typeof message !== 'object') return;

  const msg = message as { type?: string };
  if (msg.type !== 'RESULT') return;

  const result = message as ResultMessage;
  const key = `${result.identifier.type}:${result.identifier.value}`;
  const host = badgeMap.get(key);
  if (host) {
    updateBadge(host, result.trust);
  }
});

// ---------------------------------------------------------------------------
// DOMObserver — re-scan dynamically added nodes
// ---------------------------------------------------------------------------

/**
 * Wraps a MutationObserver that fires the scan callback after a 500ms
 * debounce whenever new nodes are added to `document.body` (Requirement 1.7).
 *
 * Each added node is scanned individually so that `injectBadge`'s sibling
 * deduplication guard works correctly within the subtree.
 */
const observer = new DOMObserver((nodes: Node[]) => {
  for (const node of nodes) {
    scanRoot(node);
  }
});

// ---------------------------------------------------------------------------
// SPA navigation handling
// ---------------------------------------------------------------------------

/**
 * Resets per-page state and re-scans the document body after an SPA
 * navigation. Called on both `popstate` and patched `history.pushState`.
 *
 * Requirement 1.8 — deduplication set resets on each SPA navigation event.
 */
function handleNavigation(): void {
  // Clear deduplication set so the new page gets fresh scans
  seenKeys = new Set<string>();
  // Clear DOMObserver's buffered nodes from the previous page
  observer.resetPending();
  // Re-scan the new page's body
  scanRoot(document.body);
}

window.addEventListener('popstate', handleNavigation);

// Patch history.pushState so that client-side navigations (React Router,
// Vue Router, etc.) are treated the same as browser Back/Forward navigations.
const _originalPushState = history.pushState.bind(history);
history.pushState = function (...args: Parameters<typeof history.pushState>) {
  _originalPushState(...args);
  handleNavigation();
};

// ---------------------------------------------------------------------------
// Initial scan — DOMContentLoaded or immediate (Requirement 8.1)
// ---------------------------------------------------------------------------

if (document.readyState === 'loading') {
  // Document has not yet finished parsing; wait for DOMContentLoaded.
  document.addEventListener('DOMContentLoaded', () => {
    scanRoot(document.body);
    observer.start();
  });
} else {
  // Document is already parsed (manifest run_at: document_idle fires here).
  scanRoot(document.body);
  observer.start();
}
