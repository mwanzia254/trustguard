import { aiService } from '../ai-engine/service';
import { supabase } from '../database/supabase';
import { logger } from '../utils/logger';

// ── Regex patterns to extract identifiers from forwarded messages ────────────
const PHONE_REGEX    = /(?:\+?254|0)(7|1)\d{8}/g;
const TILL_REGEX     = /(?:till|buy goods|buygoods)[^\d]*(\d{5,6})/gi;
const PAYBILL_REGEX  = /(?:paybill|pay bill|business no\.?)[^\d]*(\d{5,6})/gi;
const AMOUNT_REGEX   = /(?:ksh?|kes|amount)[.\s]*([0-9,]+)/gi;
const TIKTOK_REGEX   = /(?:tiktok\.com\/@?|@)([\w.]+)|tiktok\s+[:-]?\s*@?([\w.]+)/gi;

export interface WhatsAppAnalysisResult {
  messageText:      string;
  detectedPhones:   string[];
  detectedTills:    string[];
  detectedPaybills: string[];
  detectedTikToks:  string[];
  detectedAmount:   string | null;
  aiAnalysis:       Awaited<ReturnType<typeof aiService.analyzeReport>>;
  sellerResults:    SellerMatch[];
  reply:            string;
}

interface SellerMatch {
  identifier: string;
  type:       string;
  found:      boolean;
  trustScore?: number;
  trustLabel?: string;
  totalReports?: number;
  sellerId?: string;
}

export const whatsappService = {
  /**
   * Process a forwarded WhatsApp message and return analysis + reply text
   */
  async analyzeMessage(messageText: string): Promise<WhatsAppAnalysisResult> {
    const text = messageText;

    // Extract identifiers
    const detectedPhones   = [...new Set([...text.matchAll(PHONE_REGEX)].map(m => m[0].replace(/\s/g, '')))];
    const detectedTills    = [...new Set([...text.matchAll(TILL_REGEX)].map(m => m[1]))];
    const detectedPaybills = [...new Set([...text.matchAll(PAYBILL_REGEX)].map(m => m[1]))];
    const detectedTikToks  = [...new Set([...text.matchAll(TIKTOK_REGEX)].map(m => (m[1] || m[2]).toLowerCase()))];
    const amountMatch      = AMOUNT_REGEX.exec(text);
    const detectedAmount   = amountMatch ? amountMatch[1].replace(',', '') : null;

    // Run AI NLP analysis on the full message
    const aiAnalysis = await aiService.analyzeReport(text, 'other');

    // Check each detected identifier against the database
    const sellerResults: SellerMatch[] = [];

    for (const phone of detectedPhones) {
      const result = await checkIdentifier(phone, 'phone_number');
      sellerResults.push({ identifier: phone, type: 'Phone', ...result });
    }
    for (const till of detectedTills) {
      const result = await checkIdentifier(till, 'till_number');
      sellerResults.push({ identifier: till, type: 'Till', ...result });
    }
    for (const paybill of detectedPaybills) {
      const result = await checkIdentifier(paybill, 'paybill_number');
      sellerResults.push({ identifier: paybill, type: 'Paybill', ...result });
    }

    for (const tiktok of detectedTikToks) {
      const result = await checkIdentifier(tiktok, 'tiktok_handle');
      sellerResults.push({ identifier: `@${tiktok}`, type: 'TikTok', ...result });
    }

    // Build the WhatsApp reply
    const reply = buildReply(messageText, aiAnalysis, sellerResults, detectedAmount);

    return {
      messageText,
      detectedPhones,
      detectedTills,
      detectedPaybills,
      detectedTikToks,
      detectedAmount,
      aiAnalysis,
      sellerResults,
      reply,
    };
  },
};

// ── Check an identifier against the sellers table ───────────────────────────
async function checkIdentifier(value: string, column: string): Promise<Omit<SellerMatch, 'identifier' | 'type'>> {
  try {
    const { data } = await supabase
      .from('sellers')
      .select('id, trust_score, status, total_reports')
      .eq(column, value)
      .maybeSingle();

    if (!data) return { found: false };

    const trustLabel = getTrustLabel(data.trust_score);
    return {
      found:        true,
      trustScore:   data.trust_score,
      trustLabel,
      totalReports: data.total_reports,
      sellerId:     data.id,
    };
  } catch (err) {
    logger.warn('DB check failed for identifier:', value, err);
    return { found: false };
  }
}

// ── Build a clear WhatsApp reply ─────────────────────────────────────────────
function buildReply(
  _originalText: string,
  aiAnalysis: Awaited<ReturnType<typeof aiService.analyzeReport>>,
  sellerResults: SellerMatch[],
  amount: string | null
): string {
  const lines: string[] = [];

  lines.push('🛡️ *ScamChek Analysis*');
  lines.push('─────────────────────');

  // AI pattern analysis
  const severityEmoji: Record<string, string> = {
    critical: '🚨', high: '⚠️', medium: '🟡', low: '🟢',
  };
  const emoji = severityEmoji[aiAnalysis.severity] || '🔍';

  lines.push(`${emoji} *Pattern Detected:* ${aiAnalysis.pattern}`);
  lines.push(`📊 *Risk Score:* ${aiAnalysis.riskScore}/100`);

  if (amount) {
    lines.push(`💰 *Amount Mentioned:* KES ${parseInt(amount).toLocaleString()}`);
  }

  // Seller database results
  if (sellerResults.length > 0) {
    lines.push('');
    lines.push('📋 *Database Check:*');

    for (const seller of sellerResults) {
      if (seller.found) {
        const badge =
          seller.trustScore! >= 86 ? '✅' :
          seller.trustScore! >= 61 ? '🔵' :
          seller.trustScore! >= 31 ? '⚠️' : '🚨';

        lines.push(`${badge} *${seller.type}:* ${seller.identifier}`);
        lines.push(`   Trust: ${seller.trustLabel} (${seller.trustScore}/100)`);
        lines.push(`   Reports: ${seller.totalReports}`);
        lines.push(`   🔗 https://scamchek.co.ke/seller/${seller.sellerId}`);
      } else {
        lines.push(`🔍 *${seller.type}:* ${seller.identifier} — Not in database`);
      }
    }
  } else {
    lines.push('');
    lines.push('🔍 No phone/till/paybill numbers detected in message.');
  }

  // Verdict
  lines.push('');
  lines.push('─────────────────────');
  if (aiAnalysis.riskScore >= 70 || sellerResults.some(s => s.found && s.trustScore! < 31)) {
    lines.push('🚨 *VERDICT: HIGH RISK — Do NOT send money!*');
    lines.push('This message shows signs of a scam. Check the seller on ScamChek before proceeding.');
  } else if (aiAnalysis.riskScore >= 40) {
    lines.push('⚠️ *VERDICT: PROCEED WITH CAUTION*');
    lines.push('Some risk indicators detected. Verify carefully before transacting.');
  } else {
    lines.push('✅ *VERDICT: APPEARS SAFE*');
    lines.push('No major scam patterns detected. Always stay vigilant.');
  }

  lines.push('');
  lines.push('🌐 *Full check:* https://scamchek.co.ke');
  lines.push('📢 *Report fraud:* https://scamchek.co.ke/report');

  return lines.join('\n');
}

function getTrustLabel(score: number): string {
  if (score >= 86) return 'TRUSTED';
  if (score >= 61) return 'GOOD';
  if (score >= 31) return 'CAUTION';
  return 'HIGH RISK';
}
