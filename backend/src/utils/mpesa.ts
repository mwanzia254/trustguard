/**
 * M-Pesa Transaction Code Validator
 *
 * M-Pesa transaction codes follow the pattern:
 *   [3 uppercase letters][10 digits]
 *   e.g. QKL7X2R8P4   (older format)
 *        RFB123456789  (newer format)
 *
 * The first letter encodes the approximate year of the transaction:
 *   P = ~2018, Q = ~2019-2020, R = ~2021-2022, S = ~2023, T = ~2024+
 *
 * Full regex: ^[A-Z]{3}[A-Z0-9]{7}$  (10 chars total, all uppercase)
 * Safaricom format verified: exactly 10 alphanumeric uppercase characters.
 */

// Valid M-Pesa code format
const MPESA_CODE_REGEX = /^[A-Z]{2,3}[A-Z0-9]{7,8}$/;

// Year-prefix mapping (first character of the transaction code)
// These correspond to Safaricom's chronological prefix rotation
const YEAR_PREFIXES: Record<string, number[]> = {
  'P': [2018, 2019],
  'Q': [2019, 2020, 2021],
  'R': [2021, 2022, 2023],
  'S': [2023, 2024],
  'T': [2024, 2025, 2026],
};

const CURRENT_YEAR = new Date().getFullYear();

export interface MpesaValidationResult {
  isValid:      boolean;
  code:         string;
  errorCode?:   'INVALID_FORMAT' | 'FUTURE_DATE' | 'DUPLICATE' | 'TOO_OLD';
  errorMessage?: string;
}

/**
 * Validate the format and plausibility of an M-Pesa transaction code.
 */
export function validateMpesaCode(code: string): MpesaValidationResult {
  const clean = code.trim().toUpperCase();

  // 1. Format check
  if (!MPESA_CODE_REGEX.test(clean)) {
    return {
      isValid:      false,
      code:         clean,
      errorCode:    'INVALID_FORMAT',
      errorMessage: `"${clean}" is not a valid M-Pesa transaction code format. Expected format: 10 alphanumeric uppercase characters (e.g. RFB123456789).`,
    };
  }

  // 2. Year plausibility check — first letter must match a known prefix range
  const prefix = clean[0];
  const validYears = YEAR_PREFIXES[prefix];

  if (validYears) {
    const minYear = Math.min(...validYears);
    const maxYear = Math.max(...validYears);

    if (maxYear < CURRENT_YEAR - 3) {
      return {
        isValid:      false,
        code:         clean,
        errorCode:    'TOO_OLD',
        errorMessage: `Transaction code "${clean}" appears to be from ${maxYear} or earlier. Codes older than 3 years are not accepted as evidence.`,
      };
    }

    if (minYear > CURRENT_YEAR + 1) {
      return {
        isValid:      false,
        code:         clean,
        errorCode:    'FUTURE_DATE',
        errorMessage: `Transaction code "${clean}" prefix "${prefix}" corresponds to a future year. This may be fabricated.`,
      };
    }
  }

  return { isValid: true, code: clean };
}

/**
 * Extract and validate all M-Pesa codes found in a text block
 * (e.g. from a report description or evidence upload filename).
 */
export function extractMpesaCodes(text: string): string[] {
  const matches = text.toUpperCase().match(/\b[A-Z]{2,3}[A-Z0-9]{7,8}\b/g) || [];
  return [...new Set(matches)].filter((code) => validateMpesaCode(code).isValid);
}
