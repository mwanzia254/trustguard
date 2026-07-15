import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { reportsService } from './service';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const reportsController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError(errors.array()[0].msg as string, 400));
    }
    try {
      if (!req.user) return next(createError('Unauthorized', 401));
      const files = (req.files as Express.Multer.File[]) || [];
      const report = await reportsService.create({ ...req.body, user_id: req.user.id }, files);
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const report = await reportsService.getById(req.params.id);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  },

  async myReports(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(createError('Unauthorized', 401));
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const reports = await reportsService.getMyReports(req.user.id, page, limit);
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  },
};
