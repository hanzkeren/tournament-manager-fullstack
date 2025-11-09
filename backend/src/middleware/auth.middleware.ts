import { Request, Response, NextFunction } from 'express';
import { authService, JWTPayload } from '../services/auth.service';
import logger from '../config/logger';

// Extend Request interface to include user
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    const decoded = authService.verifyAccessToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    logger.warn('Token verification failed:', error);
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.userId} with role ${req.user.role}. Required roles: ${allowedRoles.join(', ')}`);
      res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
};

// Role-based middleware shortcuts
export const requireSuperAdmin = requireRole('superadmin');
export const requireAdmin = requireRole(['superadmin', 'admin']);
export const requireUser = requireRole(['superadmin', 'admin', 'user']); // All authenticated users

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user context
    logger.warn('Optional auth token verification failed:', error);
    next();
  }
};