import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

import { env, isProd } from './config/env.js';
import { logger, stream } from './utils/logger.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import blogRoutes from './routes/blog.routes.js';
import categoryRoutes from './routes/category.routes.js';
import tagRoutes from './routes/tag.routes.js';
import commentRoutes from './routes/comment.routes.js';
import mediaRoutes from './routes/media.routes.js';
import aiRoutes from './routes/ai.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import settingRoutes from './routes/setting.routes.js';
import userRoutes from './routes/user.routes.js';
import publicRoutes from './routes/public.routes.js';

const app = express();

// ---- Trust proxy (Render) ----
app.enable('trust proxy', 1);

// ---- Security middleware ----
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", 'https://generativelanguage.googleapis.com'],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());
app.use(morgan(isProd ? 'combined' : 'dev', { stream }));

// ---- Global rate limiter ----
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try later.' },
  })
);

// ---- Health check ----
app.get('/health', (req, res) =>
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  })
);

// ---- API v1 ----
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/public', publicRoutes);

// ---- Sitemap & RSS ----
app.get('/sitemap.xml', async (req, res) => {
  /* see public.routes.js implementation */
});
app.get('/rss.xml', async (req, res) => {
  /* see public.routes.js implementation */
});

// ---- Errors ----
app.use(notFound);
app.use(errorHandler);

export default app;
