import { Router } from 'express';
import { aiController } from './controller';
import { authenticate } from '../middleware/auth';

export const aiRouter = Router();

aiRouter.post('/analyze', authenticate, aiController.analyzeText);
aiRouter.get('/risk/:sellerId', aiController.predictSellerRisk);
