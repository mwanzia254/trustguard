import { Request, Response, NextFunction } from 'express';
import { sellersService } from './service';

export const sellersController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const result = await sellersService.getAll(page, limit, status);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const seller = await sellersService.getById(req.params.id);
      const recentReports = await sellersService.getRecentReports(req.params.id);
      res.json({ success: true, data: { ...seller, recent_reports: recentReports } });
    } catch (err) {
      next(err);
    }
  },
};
