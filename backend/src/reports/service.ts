import { supabase } from '../database/supabase';
import { createError } from '../middleware/errorHandler';
import { sellersService } from '../sellers/service';
import { sellerIndexer } from '../search/indexer';
import { aiService } from '../ai-engine/service';
import { fcmService } from '../notifications/fcm';
import { validateMpesaCode, extractMpesaCodes } from '../utils/mpesa';
import { v4 as uuidv4 } from 'uuid';

interface ReportInput {
  seller_id?: string;
  searched_value?: string;
  search_type?: string;
  user_id: string;
  category: string;
  description: string;
  amount_lost?: number;
  currency?: string;
}

const EVIDENCE_BUCKET = 'evidence';

export const reportsService = {
  async create(input: ReportInput, files: Express.Multer.File[]) {
    let sellerId = input.seller_id;

    // Auto-create seller record if none supplied
    if (!sellerId && input.searched_value) {
      const colMap: Record<string, string> = {
        phone:         'phone_number',
        till_number:   'till_number',
        paybill:       'paybill_number',
        business_name: 'business_name',
        social_media:  'social_media_handle',
        website:       'website_url',
      };
      const col = colMap[input.search_type || 'phone'] || 'phone_number';

      const { data: existing } = await supabase
        .from('sellers')
        .select('id')
        .eq(col, input.searched_value)
        .maybeSingle();

      if (existing) {
        sellerId = existing.id;
      } else {
        const { data: newSeller } = await supabase
          .from('sellers')
          .insert({ [col]: input.searched_value } as any)
          .select('*')
          .single();
        sellerId = newSeller!.id;
      }
    }

    if (!sellerId) throw createError('Seller identification is required', 400);

    // ── M-Pesa transaction code validation ──────────────────────────────────
    // Extract any M-Pesa codes from the description and validate them
    const mpesaCodes = extractMpesaCodes(input.description);
    for (const code of mpesaCodes) {
      const validation = validateMpesaCode(code);
      if (!validation.isValid) {
        throw createError(`Invalid M-Pesa code: ${validation.errorMessage}`, 422);
      }
      // Check for duplicate submission of the same transaction code
      const { data: existingCode } = await supabase
        .from('mpesa_codes')
        .select('id, report_id')
        .eq('code', code)
        .maybeSingle();

      if (existingCode) {
        throw createError(
          `M-Pesa transaction code ${code} has already been used as evidence in a previous report. Duplicate evidence is not accepted.`,
          422
        );
      }
    }

    // ── Get reporter's credibility weight ────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', input.user_id)
      .single();

    const roleWeights: Record<string, number> = { admin: 3.0, contributor: 2.0, user: 1.0 };
    const { count: totalReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', input.user_id);
    const { count: approvedReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', input.user_id)
      .eq('status', 'approved');

    const total    = totalReports ?? 0;
    const approved = approvedReports ?? 0;
    const roleWeight = roleWeights[profile?.role ?? 'user'] ?? 1.0;
    const credibility = total < 3 ? 1.0 : 0.3 + (approved / total) * 1.2;
    const reporterWeight = Math.round(roleWeight * credibility * 100) / 100;

    // AI analysis
    const aiResult = await aiService.analyzeReport(input.description, input.category);
    if (aiResult.isFakeReport) {
      throw createError(
        'This report appears to be spam or duplicate. Please provide more specific details.',
        422
      );
    }

    // Insert report with reporter weight
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        seller_id:       sellerId,
        user_id:         input.user_id,
        category:        input.category,
        description:     input.description,
        amount_lost:     input.amount_lost || null,
        currency:        input.currency || 'KES',
        ai_risk_score:   aiResult.riskScore,
        ai_pattern:      aiResult.pattern,
        ai_severity:     aiResult.severity,
        reporter_weight: reporterWeight,
      })
      .select('*')
      .single();

    if (reportError || !report) throw createError('Failed to create report', 500);

    // Store validated M-Pesa codes to prevent future duplicate submissions
    if (mpesaCodes.length > 0) {
      await supabase.from('mpesa_codes').insert(
        mpesaCodes.map((code) => ({ report_id: report.id, code }))
      );
    }

    // Upload evidence to Supabase Storage
    const evidenceRows = [];
    for (const file of files) {
      const ext = file.originalname.split('.').pop();
      const storagePath = `reports/${report.id}/${uuidv4()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(storagePath, file.buffer, { contentType: file.mimetype });

      if (uploadError) continue;

      const { data: urlData } = supabase.storage
        .from(EVIDENCE_BUCKET)
        .getPublicUrl(storagePath);

      evidenceRows.push({
        report_id:     report.id,
        storage_path:  storagePath,
        public_url:    urlData.publicUrl,
        file_type:     file.mimetype,
        original_name: file.originalname,
        file_size:     file.size,
      });
    }

    if (evidenceRows.length > 0) {
      await supabase.from('evidence').insert(evidenceRows);
    }

    // Recalculate trust score
    await sellersService.recalculateTrustScore(sellerId);

    return { ...report, ai_analysis: aiResult, evidence_count: evidenceRows.length };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        profiles(name),
        sellers(business_name, phone_number),
        evidence(public_url, file_type, original_name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw createError('Report not found', 404);
    return data;
  },

  async getMyReports(userId: string, page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const { data } = await supabase
      .from('reports')
      .select(`
        id, category, description, status, amount_lost, currency,
        ai_risk_score, ai_pattern, created_at,
        sellers(business_name, phone_number)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    return (data || []).map((r: any) => ({
      ...r,
      business_name: r.sellers?.business_name,
      phone_number:  r.sellers?.phone_number,
    }));
  },
};
