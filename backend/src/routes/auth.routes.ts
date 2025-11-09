import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { userSignupSchema, userLoginSchema } from '../utils/validation';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Sign up
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  try {
    const validatedData = userSignupSchema.parse(req.body);
    const result = await authService.signUp(validatedData);

    ApiResponse.created(res, result, 'User registered successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.fail(res, error.errors[0].message, 'VALIDATION_ERROR');
    }
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return ApiResponse.conflict(res, error.message);
      }
      return ApiResponse.fail(res, error.message, 'SIGNUP_ERROR');
    }
    ApiResponse.error(res, 'An unexpected error occurred during signup');
  }
}));

// Sign in
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  try {
    const validatedData = userLoginSchema.parse(req.body);
    const result = await authService.signIn(validatedData);

    ApiResponse.success(res, result, 'Sign in successful');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.fail(res, error.errors[0].message, 'VALIDATION_ERROR');
    }
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials') || error.message.includes('deactivated')) {
        return ApiResponse.unauthorized(res, error.message);
      }
      return ApiResponse.fail(res, error.message, 'LOGIN_ERROR');
    }
    ApiResponse.error(res, 'An unexpected error occurred during login');
  }
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ApiResponse.fail(res, 'Refresh token is required', 'TOKEN_MISSING');
    }

    const result = await authService.refreshTokens(refreshToken);
    ApiResponse.success(res, result, 'Tokens refreshed successfully');
  } catch (error) {
    if (error instanceof Error) {
      return ApiResponse.unauthorized(res, error.message);
    }
    ApiResponse.error(res, 'An unexpected error occurred during token refresh');
  }
}));

// Change password
router.post('/change-password',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return ApiResponse.fail(res, 'Old password and new password are required', 'VALIDATION_ERROR');
      }

      if (newPassword.length < 8) {
        return ApiResponse.fail(res, 'New password must be at least 8 characters long', 'VALIDATION_ERROR');
      }

      await authService.changePassword(req.user!.userId, oldPassword, newPassword);
      ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid current password')) {
          return ApiResponse.fail(res, error.message, 'INVALID_PASSWORD');
        }
        return ApiResponse.fail(res, error.message, 'PASSWORD_CHANGE_ERROR');
      }
      ApiResponse.error(res, 'An unexpected error occurred during password change');
    }
  })
);

// Get current user info
router.get('/me',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      ApiResponse.success(res, {
        id: user.userId,
        username: user.username,
        email: user.email,
        role: user.role,
      }, 'User info retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, 'Failed to retrieve user information');
    }
  })
);

// Logout (client-side token removal, but we can add blacklist if needed)
router.post('/logout', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // In a stateless JWT implementation, logout is typically handled client-side
  // by removing the tokens from storage. If needed, we could implement a token blacklist.
  ApiResponse.success(res, null, 'Logout successful');
}));

export default router;