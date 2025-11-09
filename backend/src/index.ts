import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import logger from './config/logger';
import { errorHandler, notFound } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import divisionRoutes from './routes/division.routes';
import tournamentRoutes from './routes/tournament.routes';
import teamRoutes from './routes/team.routes';
import playerRoutes from './routes/player.routes';
import matchRoutes from './routes/match.routes';
import bracketRoutes from './routes/bracket.routes';
import leaderboardRoutes from './routes/leaderboard.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet()); // Security headers
app.use(limiter); // Rate limiting

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Tournament Manager API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
const API_PREFIX = '/api';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/divisions`, divisionRoutes);
app.use(`${API_PREFIX}/tournaments`, tournamentRoutes);
app.use(`${API_PREFIX}/teams`, teamRoutes);
app.use(`${API_PREFIX}/players`, playerRoutes);
app.use(`${API_PREFIX}/matches`, matchRoutes);
app.use(`${API_PREFIX}/brackets`, bracketRoutes);
app.use(`${API_PREFIX}/leaderboard`, leaderboardRoutes);

// API overview
app.get(`${API_PREFIX}/`, (req, res) => {
  res.json({
    status: 'success',
    message: 'Tournament Manager API',
    version: '1.0.0',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      users: `${API_PREFIX}/users`,
      divisions: `${API_PREFIX}/divisions`,
      tournaments: `${API_PREFIX}/tournaments`,
      teams: `${API_PREFIX}/teams`,
      players: `${API_PREFIX}/players`,
      matches: `${API_PREFIX}/matches`,
      brackets: `${API_PREFIX}/brackets`,
      leaderboard: `${API_PREFIX}/leaderboard`,
    },
  });
});

// Handle 404
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(`API available at http://localhost:${PORT}${API_PREFIX}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    logger.error('Server closed due to unhandled promise rejection');
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

export default app;