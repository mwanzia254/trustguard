/**
 * BadgeInjector — Task 7.1
 *
 * Injects Shadow-DOM-isolated trust badges adjacent to detected seller
 * identifiers on supported marketplace pages.
 *
 * Requirements: 3.1–3.10, 3.12
 */

import type { TrustResult, TrustLabel } from '../shared/types';
import { BADGE_TIMEOUT_MS } from '../shared/constants';
import badgeStyles from './badge.css?inline';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/**
 * Maps each badge host element to its closed Shadow DOM root so that
 * `updateBadge` can reach inside without external callers being able to.
 */
const shadowRoots = new WeakMap<HTMLElement, ShadowRoot>();

/**
 * Tracks the pending timeout handle for each badge host element so we can
 * clear it once a real result arrives before the 15-second deadline.
 */
const timeoutHandles = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

// ---------------------------------------------------------------------------
// Badge text / colour helpers (Requirements 3.2–3.8)
// ---------------------------------------------------------------------------

interface BadgeRenderInfo {
  /** CSS modifier class, e.g. "tg-badge--trusted" */
  modifier: string;
  /** Human-readable badge label string */
  text: string;
}

/**
 * Derives the badge modifier class and display text from a `TrustResult`.
 * Covers every `state` and every `trust_label` value.
 */
function getBadgeRenderInfo(result: TrustResult): BadgeRenderInfo {
  if (result.state === 'LOADING') {
    return {
      modifier: 'tg-badge--loading',
      text: '🔄 Checking TrustGuard…',
    };
  }

  if (result.state === 'NOT_FOUND') {
    return {
      modifier: 'tg-badge--not-found',
      text: '🔍 Not in TrustGuard database',
    };
  }

  if (result.state === 'ERROR') {
    return {
      modifier: 'tg-badge--error',
      text: '⚠️ TrustGuard check unavailable',
    };
  }

  // state === 'FOUND' — derive from trust_label
  const label = result.trust_label as TrustLabel;
  const score = result.trust_score ?? 0;

  switch (label) {
    case 'TRUSTED':
      return {
        modifier: 'tg-badge--trusted',
        text: `✅ TRUSTED — Trust Score: ${score}/100`,
      };
    case 'GOOD':
      return {
        modifier: 'tg-badge--good',
        text: `✅ GOOD — Trust Score: ${score}/100`,
      };
    case 'CAUTION':
      return {
        modifier: 'tg-badge--caution',
        text: `⚠️ CAUTION — Trust Score: ${score}/100`,
      };
    case 'HIGH RISK': {
      const reportCount = result.report_count ?? 0;
      return {
        modifier: 'tg-badge--high-risk',
        text: `⚠️ Warning — This number has ${reportCount} scam report(s). Trust Score: ${score}/100 — HIGH RISK`,
      };
    }
    default:
      // Fallback: treat as error
      return {
        modifier: 'tg-badge--error',
        text: '⚠️ TrustGuard check unavailable',
      };
  }
}

// ---------------------------------------------------------------------------
// Overlay panel HTML (Requirement 3.11)
// ---------------------------------------------------------------------------

/**
 * Builds the HTML string for the overlay panel shown when a badge is clicked.
 * Rendered inside the same Shadow DOM as the badge, so it inherits the scoped styles.
 */
function buildOverlayHTML(result: TrustResult): string {
  if (result.state !== 'FOUND') {
    return ''; // no overlay for non-FOUND states
  }

  const sellerName = result.seller_name ? escapeHtml(result.seller_name) : 'Unknown seller';
  const score = result.trust_score ?? '—';
  const reportCount = result.report_count ?? 0;
  const categories =
    result.complaint_categories && result.complaint_categories.length > 0
      ? result.complaint_categories.map(escapeHtml).join(', ')
      : 'None';
  const profileHref = result.seller_id
    ? `http://localhost:3000/seller/${escapeHtml(result.seller_id)}`
    : null;

  const profileLink = profileHref
    ? `<a class="tg-overlay__link" href="${profileHref}" target="_blank" rel="noopener noreferrer">View full profile →</a>`
    : '';

  return `
    <div class="tg-overlay tg-overlay--hidden" role="dialog" aria-label="TrustGuard seller info">
      <p class="tg-overlay__title">${sellerName}</p>
      <div class="tg-overlay__row">
        <span class="tg-overlay__label">Trust Score</span>
        <span class="tg-overlay__value">${score}/100</span>
      </div>
      <div class="tg-overlay__row">
        <span class="tg-overlay__label">Reports</span>
        <span class="tg-overlay__value">${reportCount}</span>
      </div>
      <div class="tg-overlay__categories">Complaint categories: ${categories}</div>
      ${profileLink}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Shadow DOM content builder
// ---------------------------------------------------------------------------

/**
 * Renders the full inner HTML for the shadow root:
 *   <style>{badgeStyles}</style>
 *   <button class="tg-badge tg-badge--{modifier}">{text}</button>
 *   <div class="tg-overlay …"> … </div>   ← only for FOUND state
 */
function buildShadowContent(result: TrustResult): string {
  const { modifier, text } = getBadgeRenderInfo(result);
  const overlay = buildOverlayHTML(result);
  return `
<style>${badgeStyles}</style>
<button class="tg-badge ${modifier}" aria-label="TrustGuard: ${escapeHtml(text)}">${escapeHtml(text)}</button>
${overlay}
  `.trim();
}

// ---------------------------------------------------------------------------
// Overlay toggle logic (attached once per badge)
// ---------------------------------------------------------------------------

/**
 * Wires click / outside-click / Escape listeners for the overlay panel.
 * Should be called once after the shadow root is first populated.
 */
function attachOverlayListeners(shadow: ShadowRoot): void {
  const toggleOverlay = () => {
    const overlay = shadow.querySelector<HTMLElement>('.tg-overlay');
    if (!overlay) return;
    const hidden = overlay.classList.toggle('tg-overlay--hidden');
    if (!hidden) {
      // Panel just became visible — set up dismiss listeners
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          overlay.classList.add('tg-overlay--hidden');
          document.removeEventListener('keydown', onKeyDown, true);
        }
      };
      const onOutsideClick = (e: MouseEvent) => {
        if (!shadow.contains(e.target as Node)) {
          overlay.classList.add('tg-overlay--hidden');
          document.removeEventListener('click', onOutsideClick, true);
          document.removeEventListener('keydown', onKeyDown, true);
        }
      };
      document.addEventListener('keydown', onKeyDown, true);
      // Use a timeout so the current click that opened the panel doesn't
      // immediately trigger the outside-click handler.
      setTimeout(() => document.addEventListener('click', onOutsideClick, true), 0);
    }
  };

  shadow.querySelector('.tg-badge')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleOverlay();
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Injects a new trust badge immediately after `node` in the DOM.
 *
 * Requirements 3.1, 3.9, 3.10, 3.12
 *
 * @param node   The DOM node whose content triggered the identifier detection.
 * @param result The initial trust result (typically `state: 'LOADING'`).
 * @returns      The badge host `<div>` element, or `null` if injection was skipped.
 */
export function injectBadge(node: Node, result: TrustResult): HTMLElement | null {
  // Requirement 3.1 — node must have a parent to insert after
  const parent = node.parentNode as Element | null;
  if (!parent) return null;

  // Requirement 3.12 — skip if a badge for this value already exists among siblings
  if (parent.querySelector(`[data-tg-id="${CSS.escape(result.value)}"]`)) {
    return null;
  }

  // Create host element
  const host = document.createElement('div');
  host.setAttribute('data-tg-id', result.value);

  // Insert after the target node (Requirement 3.1)
  parent.insertBefore(host, (node as ChildNode).nextSibling);

  // Requirement 3.9 — attach closed Shadow DOM; store the root internally
  const shadow = host.attachShadow({ mode: 'closed' });
  shadowRoots.set(host, shadow);

  // Requirement 3.10 — inject a single <style> block + badge HTML
  shadow.innerHTML = buildShadowContent(result);
  attachOverlayListeners(shadow);

  // Requirement 3.8 — 15-second timeout: if still LOADING, transition to ERROR
  if (result.state === 'LOADING') {
    const handle = setTimeout(() => {
      // Only transition if still in loading state (guard: shadow still has badge)
      const badge = shadow.querySelector('.tg-badge');
      if (badge && badge.classList.contains('tg-badge--loading')) {
        updateBadge(host, { ...result, state: 'ERROR' });
      }
    }, BADGE_TIMEOUT_MS);
    timeoutHandles.set(host, handle);
  }

  return host;
}

/**
 * Updates an existing badge host element with a new trust result.
 * Re-renders the shadow root content and clears any pending timeout.
 *
 * @param hostElement The host `<div>` returned by `injectBadge`.
 * @param result      The updated trust result.
 */
export function updateBadge(hostElement: HTMLElement, result: TrustResult): void {
  const shadow = shadowRoots.get(hostElement);
  if (!shadow) return;

  // Clear the 15-second timeout if it hasn't fired yet
  const handle = timeoutHandles.get(hostElement);
  if (handle !== undefined) {
    clearTimeout(handle);
    timeoutHandles.delete(hostElement);
  }

  // Re-render shadow root content with the new result
  shadow.innerHTML = buildShadowContent(result);
  attachOverlayListeners(shadow);
}

/**
 * Removes the badge host element from the DOM and cleans up internal state.
 *
 * @param hostElement The host `<div>` returned by `injectBadge`.
 */
export function removeBadge(hostElement: HTMLElement): void {
  // Clear pending timeout
  const handle = timeoutHandles.get(hostElement);
  if (handle !== undefined) {
    clearTimeout(handle);
    timeoutHandles.delete(hostElement);
  }

  // WeakMap entries for shadowRoots will be GC'd once hostElement is removed
  hostElement.remove();
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Escapes a string for safe insertion into HTML attribute values or text nodes. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Re-export helpers useful to tests (not part of the public badge API)
// ---------------------------------------------------------------------------

export { getBadgeRenderInfo };
export type { BadgeRenderInfo };
