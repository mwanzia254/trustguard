import { supabase } from '../database/supabase';

// -----------------------------------------------------------------------
// Scam pattern dictionary for NLP keyword detection
// -----------------------------------------------------------------------
const SCAM_PATTERNS: Record<string, { keywords: string[]; severity: 'low' | 'medium' | 'high' | 'critical'; label: string }> = {
  advance_payment: {
    keywords: ['send money first', 'pay before', 'payment first', 'deposit first', 'advance payment', 'blocked me', 'disappeared after payment', 'ran away'],
    severity: 'critical',
    label: 'Advance Payment Scam',
  },
  fake_product: {
    keywords: ['different product', 'fake product', 'counterfeit', 'not genuine', 'wrong item', 'substandard', 'expired'],
    severity: 'high',
    label: 'Fake/Counterfeit Product',
  },
  no_delivery: {
    keywords: ['never delivered', 'no delivery', 'did not receive', 'not delivered', 'package missing', 'still waiting'],
    severity: 'high',
    label: 'Non-Delivery of Goods',
  },
  identity_theft: {
    keywords: ['stole my identity', 'used my details', 'impersonating', 'fake profile', 'pretending to be'],
    severity: 'critical',
    label: 'Identity Theft',
  },
  phishing: {
    keywords: ['asked for pin', 'asked for password', 'otp request', 'shared my pin', 'asked mpesa pin', 'clicked link'],
    severity: 'critical',
    label: 'Phishing / Social Engineering',
  },
  overcharging: {
    keywords: ['overcharged', 'charged more', 'wrong amount', 'extra charges', 'hidden fees'],
    severity: 'medium',
    label: 'Overcharging',
  },
  fake_business: {
    keywords: ['fake business', 'does not exist', 'wrong address', 'no physical', 'ghost business'],
    severity: 'high',
    label: 'Fake Business',
  },
  tiktok_scam: {
    keywords: ['tiktok shop', 'tiktok live', 'order on tiktok', 'tiktok seller', 'dm on tiktok', 'follow my tiktok', 'tiktok page', 'buy on tiktok'],
    severity: 'high',
    label: 'TikTok Shop Scam',
  },
};

// Spam/fake report detection patterns
const FAKE_REPORT_INDICATORS = [
  'just testing',
  'this is a test',
  'aaaaaa',
  'asdfgh',
  'hahahaha',
  'lorem ipsum',
  '123456789',
];

// -----------------------------------------------------------------------
// AI Service
// -----------------------------------------------------------------------
export const aiService = {
  /**
   * Analyze a complaint description and return NLP insights
   */
  async analyzeReport(description: string, category: string) {
    const text = description.toLowerCase();

    // Fake report detection
    const isFakeReport = FAKE_REPORT_INDICATORS.some((indicator) => text.includes(indicator))
      || description.trim().length < 15;

    // Pattern detection
    let detectedPattern = 'General Complaint';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let patternScore = 0;

    for (const [, pattern] of Object.entries(SCAM_PATTERNS)) {
      const matchCount = pattern.keywords.filter((kw) => text.includes(kw)).length;
      if (matchCount > 0) {
        detectedPattern = pattern.label;
        severity = pattern.severity;
        patternScore = matchCount * 15;
        break;
      }
    }

    // Category-based risk
    const categoryRisk: Record<string, number> = {
      fake_product: 30,
      no_delivery: 25,
      fake_business: 35,
      payment_fraud: 45,
      identity_theft: 50,
      other: 10,
    };
    const categoryScore = categoryRisk[category] || 10;

    // Text length signal (more detail = less likely fake)
    const lengthScore = Math.min(description.length / 10, 10);

    // Final risk score 0-100
    const riskScore = Math.min(100, categoryScore + patternScore + lengthScore);

    return {
      riskScore: Math.round(riskScore),
      pattern: detectedPattern,
      severity,
      isFakeReport,
      summary: `Detected "${detectedPattern}" pattern with ${severity} severity. Risk score: ${Math.round(riskScore)}/100`,
    };
  },

  /**
   * Predict overall seller risk based on their history
   */
  async predictSellerRisk(sellerId: string) {
    const { data: seller } = await supabase
      .from('sellers')
      .select('trust_score, total_reports, is_verified, created_at')
      .eq('id', sellerId)
      .single();

    if (!seller) return null;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const { data: reports } = await supabase
      .from('reports')
      .select('ai_risk_score, category, ai_pattern, created_at')
      .eq('seller_id', sellerId)
      .eq('status', 'approved');

    const totalReports = reports?.length ?? 0;
    const recentReports = reports?.filter((r: any) => r.created_at > thirtyDaysAgo).length ?? 0;
    const avgRiskScore = totalReports > 0
      ? (reports!.reduce((s: number, r: any) => s + (r.ai_risk_score || 0), 0) / totalReports)
      : 0;

    const categories = [...new Set((reports || []).map((r: any) => r.category).filter(Boolean))];
    const patterns   = [...new Set((reports || []).map((r: any) => r.ai_pattern).filter(Boolean))];

    let riskScore = avgRiskScore;
    riskScore += recentReports * 5;
    riskScore += Math.min(totalReports * 2, 30);
    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

    let prediction = 'Low Risk';
    if (riskScore >= 75) prediction = 'Likely Scam';
    else if (riskScore >= 50) prediction = 'Suspicious Activity';
    else if (riskScore >= 25) prediction = 'Some Risk';

    // Save to AI analysis log
    await supabase.from('ai_analysis_log').insert({
      seller_id:         sellerId,
      risk_score:        riskScore,
      prediction,
      detected_patterns: patterns,
      analysis_data:     { totalReports, recentReports, avgRiskScore, categories },
    });

    return { riskScore, prediction, categories, patterns, totalReports, recentReports };
  },

  /**
   * Detect duplicate/spam reports from a user
   */
  async detectDuplicateReports(userId: string, sellerId: string, description: string) {
    const { data: recent } = await supabase
      .from('reports')
      .select('description')
      .eq('user_id', userId)
      .eq('seller_id', sellerId)
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
      .limit(5);

    if (!recent || recent.length === 0) return false;

    const newWords = new Set(description.toLowerCase().split(/\s+/));
    for (const row of recent) {
      const existingWords = new Set(row.description.toLowerCase().split(/\s+/));
      const intersection = [...newWords].filter((w) => existingWords.has(w)).length;
      const union = new Set([...newWords, ...existingWords]).size;
      if (intersection / union > 0.8) return true;
    }
    return false;
  },
};
