import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { reviewsService } from './service';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';

export const reviewsRouter = Router();

reviewsRouter.post(
  '/',
  authenticate,
  [
    body('seller_id').isUUID().withMessage('Valid seller ID required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comment').trim().isLength({ min: 5, max: 500 }).withMessage('Comment must be 5-500 characters'),
  ],
  async (req: AuthRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(createError(errors.array()[0].msg as string, 400));
    try {
      if (!req.user) return next(createError('Unauthorized', 401));
      const review = await reviewsService.create(req.body.seller_id, req.user.id, req.body.rating, req.body.comment);
      res.status(201).json({ success: true, data: review });
    } catch (err) { next(err); }
  }
);

reviewsRouter.get('/seller/:sellerId', async (req: any, res: any, next: any) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const result = await reviewsService.getBySeller(req.params.sellerId, page);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
