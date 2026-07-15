import { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken, supabase } from '../database/supabase';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  // Verify the Supabase-issued JWT
  const supabaseUser = await verifySupabaseToken(token);
  if (!supabaseUser) {
    return next(createError('Invalid or expired token', 401));
  }

  // Load the user's profile (role, ban status)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, role, is_banned')
    .eq('id', supabaseUser.id)
    .single();

  if (error || !profile) {
    return next(createError('User profile not found', 401));
  }

  if (profile.is_banned) {
    return next(createError('Account has been suspended', 403));
  }

  req.user = {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    role: profile.role,
    name: profile.name,
  };

  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }
    next();
  };
};
