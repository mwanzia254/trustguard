/**
 * DOMObserver — Content Script
 *
 * Wraps a `MutationObserver` on `document.body` (full subtree) to detect
 * dynamically added nodes on single-page-app marketplace pages.
 *
 * Key behaviours:
 *  - Collects all added nodes from every mutation batch.
 *  - Debounces re-scan calls: waits 500 ms after the last mutation before
 *    invoking the caller-supplied scan callback with the buffered nodes.
 *  - Exposes `resetPending()` so the content-script entry point can clear
 *    buffered state on SPA navigation events (popstate / pushstate).
 *
 * Requirements: 1.7, 1.8
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Callback invoked by `DOMObserver` after the debounce window elapses.
 * Receives the array of DOM nodes that were added since the last scan.
 */
export type ScanCallback = (nodes: Node[]) => void;

// ---------------------------------------------------------------------------
// DOMObserver class
// ---------------------------------------------------------------------------

/**
 * Monitors `document.body` for subtree node additions and schedules a
 * debounced re-scan so the content script can inspect newly inserted seller
 * identifiers without hammering the main thread on every keystroke/update.
 */
export class DOMObserver {
  private readonly observer: MutationObserver;
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;
  private pendingNodes: Node[] = [];

  /** Debounce window in milliseconds (Requirement 1.7 — within 500 ms of mutation). */
  private static readonly DEBOUNCE_MS = 500;

  constructor(private readonly onScan: ScanCallback) {
    this.observer = new MutationObserver((mutations) => {
      // Collect every added node from every mutation record.
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          this.pendingNodes.push(node);
        }
      }

      // Debounce: reset the timer on each batch so the callback fires
      // only after DEBOUNCE_MS ms of silence.
      if (this.debounceHandle !== null) {
        clearTimeout(this.debounceHandle);
      }

      this.debounceHandle = setTimeout(() => {
        const nodes = [...this.pendingNodes];
        this.pendingNodes = [];
        this.debounceHandle = null;
        this.onScan(nodes);
      }, DOMObserver.DEBOUNCE_MS);
    });
  }

  /**
   * Begins observing `document.body` for childList mutations in the full
   * subtree. Safe to call multiple times — subsequent calls are ignored by
   * MutationObserver (it re-uses the same observation target/options).
   */
  start(): void {
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Stops observing. Any already-buffered pending nodes and the active
   * debounce timer are left intact so that a `start()` → `stop()` → `start()`
   * cycle does not silently discard collected nodes.
   */
  stop(): void {
    this.observer.disconnect();
  }

  /**
   * Clears the buffer of pending nodes and cancels the active debounce timer.
   *
   * Should be called by the content-script entry point on SPA navigation
   * events (`popstate` / patched `history.pushState`) so that nodes collected
   * from the previous page are not re-scanned after navigation.
   *
   * This also satisfies Requirement 1.8 — the deduplication set is reset on
   * each SPA navigation event (the entry point resets its own dedup set and
   * calls this method simultaneously).
   */
  resetPending(): void {
    if (this.debounceHandle !== null) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = null;
    }
    this.pendingNodes = [];
  }
}

export default DOMObserver;
