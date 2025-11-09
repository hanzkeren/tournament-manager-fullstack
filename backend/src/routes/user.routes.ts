import { Router } from 'express';
import { userService } from '../services/user.service';
import { userUpdateSchema } from '../utils/validation';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken, requireAdmin, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Get all users (admin only)
router.get('/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
        isActive,
      } = req.query;

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        role: role as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      };

      const result = await userService.getAllUsers(filters);
      ApiResponse.paginated(
        res,
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Users retrieved successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'USERS_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve users');
      }
    }
  })
);

// Get user by ID
router.get('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      ApiResponse.success(res, user, 'User retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'USER_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve user');
      }
    }
  })
);

// Update user (admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const validatedData = userUpdateSchema.parse(req.body);

      // Only superadmin can change roles
      if (validatedData.role && req.user!.role !== 'superadmin') {
        return ApiResponse.forbidden(res, 'Only superadmin can change user roles');
      }

      // Prevent user from deactivating themselves
      if (validatedData.isActive === false && id === req.user!.userId) {
        return ApiResponse.fail(res, 'You cannot deactivate your own account', 'SELF_DEACTIVATION');
      }

      const updatedUser = await userService.updateUser(id, validatedData);
      ApiResponse.success(res, updatedUser, 'User updated successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.fail(res, error.errors[0].message, 'VALIDATION_ERROR');
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        if (error.message.includes('already exists')) {
          return ApiResponse.conflict(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'USER_UPDATE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to update user');
      }
    }
  })
);

// Deactivate user (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      // Prevent user from deactivating themselves
      if (id === req.user!.userId) {
        return ApiResponse.fail(res, 'You cannot deactivate your own account', 'SELF_DEACTIVATION');
      }

      // Only superadmin can deactivate other admins
      if (req.user!.role !== 'superadmin') {
        const targetUser = await userService.getUserById(id);
        if (targetUser.role === 'admin' || targetUser.role === 'superadmin') {
          return ApiResponse.forbidden(res, 'Only superadmin can deactivate admin users');
        }
      }

      const deactivatedUser = await userService.deleteUser(id);
      ApiResponse.success(res, deactivatedUser, 'User deactivated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'USER_DEACTIVATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to deactivate user');
      }
    }
  })
);

// Hard delete user (superadmin only)
router.delete('/:id/hard',
  authenticateToken,
  requireSuperAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      // Prevent superadmin from deleting themselves
      if (id === req.user!.userId) {
        return ApiResponse.fail(res, 'You cannot delete your own account', 'SELF_DELETION');
      }

      const result = await userService.hardDeleteUser(id);
      ApiResponse.success(res, result, 'User permanently deleted');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'USER_DELETION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to delete user');
      }
    }
  })
);

// Get users by role
router.get('/role/:role',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { role } = req.params;
      const users = await userService.getUsersByRole(role);
      ApiResponse.success(res, users, `Users with role '${role}' retrieved successfully`);
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'USERS_BY_ROLE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve users by role');
      }
    }
  })
);

// Get user statistics
router.get('/stats/dashboard',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await userService.getUserStats();
      ApiResponse.success(res, stats, 'User statistics retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'USER_STATS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve user statistics');
      }
    }
  })
);

export default router;