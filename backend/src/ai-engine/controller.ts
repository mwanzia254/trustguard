import { Request, Response, NextFunction } from 'express';
import { aiService } from './service';
import { createError } from '../middleware/errorHandler';

export const aiController = {
  async analyzeText(req: Request, res: Response, next: NextFunction) {
    try {
      const { description, category } = req.body;
      if (!description) return next(createError('Description is required', 400));
      const result = await aiService.analyzeReport(description, category || 'other');
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async predictSellerRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await aiService.predictSellerRisk(req.params.sellerId);
      if (!result) return next(createError('Seller not found', 404));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
