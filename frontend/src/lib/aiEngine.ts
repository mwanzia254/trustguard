/**
 * ScamChek AI Engine — runs entirely in the browser.
 * No backend, no API calls. Pure pattern matching + scoring.
 */

const SCAM_PATTERNS: Record<string, { keywords: string[]; severity: string; label: string; score: number }> = {
  advance_payment: {
    keywords: ['send money first', 'pay before', 'payment first', 'deposit first', 'advance payment',
               'blocked me', 'disappeared after payment', 'ran away', 'utume pesa kwanza', 'deposit kwanza'],
    severity: 'critical', label: 'Advance Payment Fraud', score: 50,
  },
  fake_account: {
    keywords: ['fake account', 'fake profile', 'not real person', 'catfish', 'impersonating',
               'pretending to be', 'fake photos', 'stolen photos', 'not the same person',
               'akaunti bandia', 'picha za wizi'],
    severity: 'critical', label: 'Fake Account / Catfishing', score: 50,
  },
  romance_scam: {
    keywords: ['fell in love', 'asked for money', 'online relationship', 'never met', 'overseas',
               'emergency money', 'send airtime', 'love scam', 'dating scam'],
    severity: 'critical', label: 'Romance Scam', score: 55,
  },
  identity_theft: {
    keywords: ['stole my identity', 'used my details', 'impersonating', 'pretending to be',
               'using my name', 'cloned account', 'wizi wa utambulisho'],
    severity: 'critical', label: 'Identity Theft / Impersonation', score: 50,
  },
  fake_product: {
    keywords: ['different product', 'fake product', 'counterfeit', 'not genuine', 'wrong item',
               'substandard', 'expired', 'bidhaa bandia'],
    severity: 'high', label: 'Fake / Counterfeit Product', score: 35,
  },
  no_delivery: {
    keywords: ['never delivered', 'no delivery', 'did not receive', 'not delivered', 'package missing',
               'still waiting', 'haikufika', 'haikutumwa'],
    severity: 'high', label: 'Non-Delivery of Goods', score: 30,
  },
  job_scam: {
    keywords: ['fake job', 'pay to get job', 'registration fee', 'fake investment', 'guaranteed returns',
               'pyramid scheme', 'mlm scam', 'kazi bandia', 'uwekezaji wa uongo'],
    severity: 'high', label: 'Fake Job / Investment Scam', score: 40,
  },
  phishing: {
    keywords: ['asked for pin', 'asked for password', 'otp request', 'shared my pin', 'asked mpesa pin',
               'clicked link', 'aliniomba pin', 'aliniomba nywila'],
    severity: 'critical', label: 'Phishing / Social Engineering', score: 55,
  },
  overcharging: {
    keywords: ['overcharged', 'charged more', 'wrong amount', 'extra charges', 'hidden fees'],
    severity: 'medium', label: 'Overcharging / Hidden Fees', score: 20,
  },
  fake_business: {
    keywords: ['fake business', 'does not exist', 'wrong address', 'no physical', 'ghost business'],
    severity: 'high', label: 'Fake Business / Ghost Shop', score: 35,
  },
  tiktok_scam: {
    keywords: ['tiktok shop', 'tiktok live', 'order on tiktok', 'dm on tiktok', 'buy on tiktok'],
    severity: 'high', label: 'TikTok Shop Fraud', score: 35,
  },
};

const FAKE_INDICATORS = [
  'just testing', 'this is a test', 'aaaaaa', 'asdfgh', 'hahahaha', 'lorem ipsum',
];

const CATEGORY_SCORES: Record<string, number> = {
  fake_product: 30, no_delivery: 25, fake_business: 35,
  payment_fraud: 45, identity_theft: 50, other: 10,
};

// M-Pesa patterns in message text
const PHONE_RE    = /(?:\+?254|0)(7|1)\d{8}/g;
const TILL_RE     = /(?:till|buy goods)[^\d]*(\d{5,6})/gi;
const PAYBILL_RE  = /(?:paybill|pay bill)[^\d]*(\d{5,6})/gi;
const AMOUNT_RE   = /(?:ksh?|kes|amount)[.\s]*([0-9,]+)/gi;
const TIKTOK_RE   = /(?:tiktok\.com\/@?|@)([\w.]+)/gi;

export function analyzeText(description: string, category = 'other') {
  const text = description.toLowerCase();

  const isFake = FAKE_INDICATORS.some(i => text.includes(i)) || description.trim().length < 15;

  let detectedPattern = 'General Complaint';
  let severity = 'low';
  let patternScore = 0;

  for (const [, p] of Object.entries(SCAM_PATTERNS)) {
    const matches = p.keywords.filter(kw => text.includes(kw)).length;
    if (matches > 0) {
      detectedPattern = p.label;
      severity        = p.severity;
      patternScore    = matches * 15;
      break;
    }
  }

  const categoryScore = CATEGORY_SCORES[category] ?? 10;
  const lengthScore   = Math.min(description.length / 10, 10);
  const riskScore     = Math.min(100, Math.round(categoryScore + patternScore + lengthScore));

  return {
    riskScore,
    pattern:      detectedPattern,
    severity,
    isFakeReport: isFake,
    summary:      `Detected "${detectedPattern}" with ${severity} severity. Risk: ${riskScore}/100`,
  };
}

export function extractIdentifiers(text: string) {
  return {
    phones:   [...new Set([...text.matchAll(PHONE_RE)].map(m => m[0]))],
    tills:    [...new Set([...text.matchAll(TILL_RE)].map(m => m[1]))],
    paybills: [...new Set([...text.matchAll(PAYBILL_RE)].map(m => m[1]))],
    tiktoks:  [...new Set([...text.matchAll(TIKTOK_RE)].map(m => m[1].toLowerCase()))],
    amount:   AMOUNT_RE.exec(text)?.[1]?.replace(',', '') || null,
  };
}

export function getTrustLabel(score: number) {
  if (score >= 86) return 'TRUSTED';
  if (score >= 61) return 'GOOD';
  if (score >= 31) return 'CAUTION';
  return 'HIGH RISK';
}

// ── Smarter AI Risk Engine ───────────────────────────────────────────────────
// Produces a weighted, explainable risk analysis — not just a number.
// Each factor has a score, weight, and human-readable explanation.

export interface RiskFactor {
  id:          string;
  label:       string;
  score:       number;       // 0 = clean/positive, 100 = maximum danger
  weight:      number;       // 0–1, sum of all weights = 1.0
  direction:   'risk' | 'positive';
  icon:        string;
  explanation: string;
  severity:    'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface AIRiskAnalysis {
  overallScore:    number;           // 0–100 weighted composite
  verdict:         string;           // e.g. "Likely Scam", "Proceed with Caution"
  verdictColor:    string;           // tailwind text color class
  summary:         string;           // 1-sentence human-readable conclusion
  factors:         RiskFactor[];     // individual factor breakdown
  detectedPatterns: string[];        // named scam patterns found
  positives:       string[];         // reasons it might be safe
  recommendation:  string;           // actionable advice
}

/**
 * Full AI risk analysis of a seller based on their report history, reviews,
 * account data, and any recent report text.
 * Runs entirely in the browser — no external calls.
 */
export function analyzeSellerRisk(sellerData: {
  trust_score:         number;
  total_reports:       number;
  approved_reports:    number;
  is_verified:         boolean;
  created_at:          string;
  recent_reports:      Array<{ description: string; category: string; amount_lost?: number; created_at: string }>;
  avg_rating:          number | null;
  total_reviews:       number;
}): AIRiskAnalysis {
  const {
    approved_reports, is_verified, created_at,
    recent_reports, avg_rating, total_reviews,
  } = sellerData;

  const ageDays = Math.floor((Date.now() - new Date(created_at).getTime()) / 86400000);

  // ── Factor 1: Scam Report Volume ─────────────────────────────────────────
  const reportScore = Math.min(100, approved_reports * 12);
  let reportExplanation = 'No scam reports have been approved against this seller.';
  let reportSeverity: RiskFactor['severity'] = 'none';
  if (approved_reports >= 10) { reportSeverity = 'critical'; reportExplanation = `${approved_reports} approved scam reports — extremely high. This seller has been flagged repeatedly by different community members.`; }
  else if (approved_reports >= 5) { reportSeverity = 'high'; reportExplanation = `${approved_reports} approved scam reports — significant. Multiple independent victims have filed complaints.`; }
  else if (approved_reports >= 2) { reportSeverity = 'medium'; reportExplanation = `${approved_reports} approved reports — some complaints on file. Proceed with caution.`; }
  else if (approved_reports === 1) { reportSeverity = 'low'; reportExplanation = `1 approved scam report. A complaint was verified by admins.`; }

  // ── Factor 2: Recent Activity (30-day spike) ─────────────────────────────
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recentCount = recent_reports.filter(r => new Date(r.created_at).getTime() > thirtyDaysAgo).length;
  const recentScore = Math.min(100, recentCount * 20);
  let recentSeverity: RiskFactor['severity'] = 'none';
  let recentExplanation = 'No recent complaints in the last 30 days.';
  if (recentCount >= 5) { recentSeverity = 'critical'; recentExplanation = `${recentCount} reports in the last 30 days — active scam campaign detected.`; }
  else if (recentCount >= 3) { recentSeverity = 'high'; recentExplanation = `${recentCount} recent reports — increasing activity is a strong warning signal.`; }
  else if (recentCount >= 1) { recentSeverity = 'low'; recentExplanation = `${recentCount} recent report(s) — some recent activity worth monitoring.`; }

  // ── Factor 3: Scam Pattern Detection from report text ───────────────────
  const allDescriptions = recent_reports.map(r => r.description).join(' ').toLowerCase();
  const patterns: string[] = [];
  let patternScore = 0;
  for (const [, p] of Object.entries(SCAM_PATTERNS)) {
    const matches = p.keywords.filter(kw => allDescriptions.includes(kw)).length;
    if (matches > 0) { patterns.push(p.label); patternScore = Math.min(100, patternScore + p.score); }
  }
  const patternSeverity: RiskFactor['severity'] =
    patternScore >= 60 ? 'critical' : patternScore >= 40 ? 'high' : patternScore >= 20 ? 'medium' : patterns.length > 0 ? 'low' : 'none';
  const patternExplanation = patterns.length > 0
    ? `Detected patterns: ${patterns.join(', ')}. These match known Kenyan online scam signatures.`
    : 'No known scam language patterns detected in reports.';

  // ── Factor 4: Community Reviews ──────────────────────────────────────────
  const reviewScore = total_reviews === 0 ? 50 : Math.max(0, 100 - (avg_rating ?? 3) * 20);
  const reviewSeverity: RiskFactor['severity'] =
    total_reviews === 0 ? 'none'
    : (avg_rating ?? 3) >= 4 ? 'none'
    : (avg_rating ?? 3) >= 3 ? 'low'
    : (avg_rating ?? 3) >= 2 ? 'medium' : 'high';
  const reviewExplanation = total_reviews === 0
    ? 'No community reviews yet — no track record either way.'
    : `${total_reviews} review(s) with average ${(avg_rating ?? 0).toFixed(1)}/5 stars. ${(avg_rating ?? 3) >= 4 ? 'Strong positive reputation.' : (avg_rating ?? 3) >= 3 ? 'Mixed community feedback.' : 'Poor community ratings — multiple dissatisfied customers.'}`;

  // ── Factor 5: Account Age ─────────────────────────────────────────────────
  const ageScore = ageDays < 7 ? 80 : ageDays < 30 ? 50 : ageDays < 90 ? 20 : 0;
  const ageSeverity: RiskFactor['severity'] =
    ageDays < 7 ? 'high' : ageDays < 30 ? 'medium' : ageDays < 90 ? 'low' : 'none';
  const ageExplanation = ageDays < 7
    ? 'Brand new identifier — less than 1 week old. Scammers frequently create fresh accounts.'
    : ageDays < 30
    ? `${ageDays} days old — relatively new. Limited history to assess.`
    : ageDays < 90
    ? `${ageDays} days on record — moderate history.`
    : `${ageDays} days on record — established presence reduces risk.`;

  // ── Factor 6: Verification Status ────────────────────────────────────────
  // This is a positive factor — verified = safer

  // ── Weighted composite score ──────────────────────────────────────────────
  // Weights: reports 35%, recent spike 25%, patterns 20%, reviews 10%, age 10%
  const WEIGHTS = { reports: 0.35, recent: 0.25, patterns: 0.20, reviews: 0.10, age: 0.10 };
  const overallScore = Math.round(
    reportScore  * WEIGHTS.reports  +
    recentScore  * WEIGHTS.recent   +
    patternScore * WEIGHTS.patterns +
    reviewScore  * WEIGHTS.reviews  +
    ageScore     * WEIGHTS.age
  );

  // ── Verdict ───────────────────────────────────────────────────────────────
  let verdict = 'Low Risk';
  let verdictColor = 'text-green-600';
  let summary = 'This seller has no significant red flags based on community data.';
  let recommendation = 'You can proceed, but always stay vigilant. Request delivery confirmation before releasing payment.';

  if (overallScore >= 75) {
    verdict = 'Likely Scam';
    verdictColor = 'text-red-600';
    summary = `This seller has ${approved_reports} approved scam reports${patterns.length > 0 ? ` matching the pattern "${patterns[0]}"` : ''} and shows strong scam indicators. Do NOT send money.`;
    recommendation = 'Do not transact with this seller. Block and report them on the platform where you encountered them.';
  } else if (overallScore >= 50) {
    verdict = 'Suspicious Activity';
    verdictColor = 'text-orange-600';
    summary = 'Multiple risk signals detected. This seller has concerning patterns but limited history.';
    recommendation = 'Use extreme caution. Verify through video call, request proof of goods before payment, and use a payment method with dispute resolution.';
  } else if (overallScore >= 25) {
    verdict = 'Proceed with Caution';
    verdictColor = 'text-yellow-600';
    summary = 'Some risk factors present but nothing conclusive. The seller has limited positive track record.';
    recommendation = 'Verify the seller independently. Ask for references or proof of previous successful transactions.';
  }

  // Positives
  const positives: string[] = [];
  if (approved_reports === 0) positives.push('No approved scam reports on record');
  if (is_verified) positives.push('Identity or business has been verified');
  if (ageDays >= 90) positives.push(`Established presence (${ageDays} days on record)`);
  if ((avg_rating ?? 0) >= 4 && total_reviews >= 3) positives.push(`Strong community rating: ${(avg_rating ?? 0).toFixed(1)}/5 from ${total_reviews} reviews`);
  if (recentCount === 0 && approved_reports === 0) positives.push('Clean record in the last 30 days');

  const factors: RiskFactor[] = [
    {
      id: 'reports', label: 'Scam Report Volume', score: reportScore, weight: WEIGHTS.reports,
      direction: 'risk', icon: '🚨', explanation: reportExplanation, severity: reportSeverity,
    },
    {
      id: 'recent', label: 'Recent Activity (30 days)', score: recentScore, weight: WEIGHTS.recent,
      direction: 'risk', icon: '📅', explanation: recentExplanation, severity: recentSeverity,
    },
    {
      id: 'patterns', label: 'Scam Pattern Detection', score: patternScore, weight: WEIGHTS.patterns,
      direction: 'risk', icon: '🔍', explanation: patternExplanation, severity: patternSeverity,
    },
    {
      id: 'reviews', label: 'Community Reviews', score: reviewScore, weight: WEIGHTS.reviews,
      direction: 'risk', icon: '⭐', explanation: reviewExplanation, severity: reviewSeverity,
    },
    {
      id: 'age', label: 'Account Age', score: ageScore, weight: WEIGHTS.age,
      direction: 'risk', icon: '📆', explanation: ageExplanation, severity: ageSeverity,
    },
  ];

  return { overallScore, verdict, verdictColor, summary, factors, detectedPatterns: patterns, positives, recommendation };
}

// ── Fuzzy Matching — Levenshtein Distance ────────────────────────────────────
// Equivalent to Elasticsearch AUTO fuzziness — catches letter swaps, typos,
// added/removed characters that scammers use to evade exact searches.

/**
 * Compute the Levenshtein edit distance between two strings.
 * Lower = more similar. 0 = exact match.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // Use a flat array for performance
  const dp: number[] = Array((m + 1) * (n + 1)).fill(0);
  const idx = (i: number, j: number) => i * (n + 1) + j;

  for (let i = 0; i <= m; i++) dp[idx(i, 0)] = i;
  for (let j = 0; j <= n; j++) dp[idx(0, j)] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[idx(i, j)] = dp[idx(i - 1, j - 1)];
      } else {
        dp[idx(i, j)] = 1 + Math.min(
          dp[idx(i - 1, j)],     // deletion
          dp[idx(i, j - 1)],     // insertion
          dp[idx(i - 1, j - 1)]  // substitution
        );
      }
    }
  }
  return dp[idx(m, n)];
}

/**
 * AUTO fuzziness thresholds matching Elasticsearch's behaviour:
 * - Length 1–2:  exact match only (fuzziness 0)
 * - Length 3–5:  allow 1 edit
 * - Length 6+:   allow 2 edits
 */
export function autoFuzzThreshold(term: string): number {
  const len = term.length;
  if (len <= 2) return 0;
  if (len <= 5) return 1;
  return 2;
}

/**
 * Score a candidate handle against the search query.
 * Returns a score 0–1 (1 = exact, 0 = no match).
 * Returns null if the candidate is too different to be a fuzzy match.
 */
export function fuzzyScore(query: string, candidate: string): number | null {
  const q = query.toLowerCase().replace(/^@/, '');
  const c = candidate.toLowerCase().replace(/^@/, '');

  if (!q || !c) return null;

  // Exact match
  if (q === c) return 1.0;

  // Substring match (e.g. searching "seller" finds "@seller_ke")
  if (c.includes(q) || q.includes(c)) return 0.9;

  const dist      = levenshtein(q, c);
  const threshold = autoFuzzThreshold(q);

  if (dist > threshold) return null; // too different — not a fuzzy match

  // Score: 1.0 for exact, decreasing with edit distance
  const maxLen = Math.max(q.length, c.length);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Filter and rank a list of seller candidates by fuzzy similarity to the query.
 * Only returns candidates that pass the AUTO fuzziness threshold.
 * Marks results with _fuzzy_match=true if they are not exact substring matches.
 */
export function fuzzyRankSellers(
  query:      string,
  sellers:    any[],
  fieldName:  string
): Array<any & { _fuzzy_match: boolean; _fuzzy_score: number }> {
  return sellers
    .map(s => {
      const fieldValue = s[fieldName] ?? '';
      const score      = fuzzyScore(query, fieldValue);
      if (score === null) return null;
      return {
        ...s,
        _fuzzy_score: score,
        _fuzzy_match: score < 1.0,  // not an exact/substring match
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b._fuzzy_score - a._fuzzy_score);
}
