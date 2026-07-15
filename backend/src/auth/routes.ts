import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from './controller';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('phone').optional(),
  ],
  authController.register
);

authRouter.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

authRouter.get('/me', authenticate, authController.me);

// Save FCM push token
authRouter.post('/fcm-token', authenticate, authController.saveFcmToken);

// Auto-confirm user email and return a session
authRouter.post('/confirm-and-login', authController.confirmAndLogin);

// Confirm all unconfirmed users (run once after disabling email confirmation)
authRouter.post('/confirm-all', authController.confirmAll);
