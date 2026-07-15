import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { authService } from './service';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(createError(errors.array()[0].msg as string, 400));
    try {
      const { name, email, phone, password } = req.body;
      const result = await authService.register({ name, email, phone, password });
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(createError(errors.array()[0].msg as string, 400));
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(createError('Unauthorized', 401));
      const profile = await authService.getProfile(req.user.id);
      res.json({ success: true, data: profile });
    } catch (err) { next(err); }
  },

  async saveFcmToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(createError('Unauthorized', 401));
      const { token } = req.body;
      if (!token) return next(createError('FCM token required', 400));
      await authService.updateFcmToken(req.user.id, token);
      res.json({ success: true, message: 'FCM token saved' });
    } catch (err) { next(err); }
  },

  async confirmAndLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, phone } = req.body;
      if (!email || !password) return next(createError('Email and password required', 400));
      const result = await authService.confirmAndLogin({ email, password, name, phone });
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async confirmAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.confirmAllUsers();
      res.json({ success: true, message: `Confirmed ${result.count} user(s)` });
    } catch (err) { next(err); }
  },
};
