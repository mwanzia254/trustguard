import { Router } from 'express';
import { searchController } from './controller';
import { authenticate } from '../middleware/auth';

export const searchRouter = Router();

// Search is accessible without auth but can use user context if logged in
searchRouter.get('/', (req, res, next) => {
  authenticate(req as any, res, (err) => {
    if (err) { /* ignore auth error, proceed as anonymous */ }
    searchController.search(req as any, res, next);
  });
});

searchRouter.get('/trending', searchController.trending);
