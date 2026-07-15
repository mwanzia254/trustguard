import { Request, Response, NextFunction } from 'express';
import { searchService } from './service';
import { AuthRequest } from '../middleware/auth';

export const searchController = {
  async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { value, type } = req.query as { value: string; type: string };
      const userId = req.user?.id;
      const ipAddress = req.ip;
      const result = await searchService.search(value, type as any, userId, ipAddress);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async trending(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await searchService.getTrendingSearches(limit);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
