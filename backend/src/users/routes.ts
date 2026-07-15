import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../database/supabase';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const usersRouter = Router();

// Get own profile
usersRouter.get('/profile', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    if (!req.user) return next(createError('Unauthorized', 401));
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, role, is_verified, reputation_score, profile_image, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !data) return next(createError('User not found', 404));
    res.json({ success: true, data: { ...data, email: req.user.email } });
  } catch (err) { next(err); }
});

// Update profile
usersRouter.put('/profile', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    if (!req.user) return next(createError('Unauthorized', 401));
    const { name, phone } = req.body;

    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, name, phone, role')
      .single();

    if (error) return next(createError('Update failed', 500));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Search history
usersRouter.get('/search-history', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    if (!req.user) return next(createError('Unauthorized', 401));
    const { data } = await supabase
      .from('searches')
      .select('id, searched_value, search_type, result_found, created_at, sellers(business_name, trust_score, status)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});
