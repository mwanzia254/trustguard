import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { authRouter } from './auth/routes';
import { usersRouter } from './users/routes';
import { sellersRouter } from './sellers/routes';
import { reportsRouter } from './reports/routes';
import { reviewsRouter } from './reviews/routes';
import { searchRouter } from './search/routes';
import { adminRouter } from './admin/routes';
import { aiRouter } from './ai-engine/routes';
import { whatsappRouter } from './whatsapp/routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'ScamChek API' });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/search', searchRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);
app.use('/api/whatsapp', whatsappRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`ScamChek API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
