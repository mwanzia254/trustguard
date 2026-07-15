import { supabase } from '../database/supabase';
import { createError } from '../middleware/errorHandler';
import { sellersService } from '../sellers/service';

export const reviewsService = {
  async create(sellerId: string, userId: string, rating: number, comment: string) {
    // Check existing review
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) throw createError('You have already reviewed this seller', 409);

    // Verify seller exists
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('id', sellerId)
      .maybeSingle();

    if (!seller) throw createError('Seller not found', 404);

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({ seller_id: sellerId, user_id: userId, rating, comment })
      .select('*')
      .single();

    if (error || !review) throw createError('Failed to create review', 500);

    await sellersService.recalculateTrustScore(sellerId);
    return review;
  },

  async getBySeller(sellerId: string, page = 1, limit = 10) {
    const from = (page - 1) * limit;

    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, profiles(name)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    const { data: statsRaw } = await supabase
      .from('reviews')
      .select('rating')
      .eq('seller_id', sellerId);

    const count = statsRaw?.length ?? 0;
    const avg_rating = count > 0
      ? statsRaw!.reduce((s, r) => s + r.rating, 0) / count
      : null;

    return {
      reviews: (reviews || []).map((r: any) => ({
        ...r,
        reviewer_name: r.profiles?.name,
      })),
      stats: { count, avg_rating },
    };
  },
};
