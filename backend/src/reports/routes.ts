import { Router } from 'express';
import { body } from 'express-validator';
import { reportsController } from './controller';
import { authenticate } from '../middleware/auth';
import { upload } from './upload';

export const reportsRouter = Router();

reportsRouter.post(
  '/',
  authenticate,
  upload.array('evidence', 5),
  [
    body('category')
      .isIn(['fake_product', 'no_delivery', 'fake_business', 'payment_fraud', 'identity_theft', 'other'])
      .withMessage('Invalid report category'),
    body('description')
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage('Description must be between 20 and 2000 characters'),
    body('amount_lost').optional().isNumeric().withMessage('Amount must be a number'),
  ],
  reportsController.create
);

reportsRouter.get('/my', authenticate, reportsController.myReports);
reportsRouter.get('/:id', authenticate, reportsController.getById);
