import { Router } from 'express';
import { divisionService } from '../services/division.service';
import { divisionCreateSchema, divisionUpdateSchema } from '../utils/validation';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken, requireAdmin, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Get all divisions (public endpoint)
router.get('/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
      } = req.query;

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      };

      const result = await divisionService.getAllDivisions(filters);
      ApiResponse.paginated(
        res,
        result.divisions,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Divisions retrieved successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'DIVISIONS_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve divisions');
      }
    }
  })
);

// Get active divisions only (public endpoint)
router.get('/active',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const divisions = await divisionService.getActiveDivisions();
      ApiResponse.success(res, divisions, 'Active divisions retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'ACTIVE_DIVISIONS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve active divisions');
      }
    }
  })
);

// Get division by ID (public endpoint)
router.get('/:id',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const division = await divisionService.getDivisionById(id);
      ApiResponse.success(res, division, 'Division retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'DIVISION_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve division');
      }
    }
  })
);

// Create division (admin only)
router.post('/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = divisionCreateSchema.parse(req.body);
      const newDivision = await divisionService.createDivision(validatedData);
      ApiResponse.created(res, newDivision, 'Division created successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.fail(res, error.errors[0].message, 'VALIDATION_ERROR');
      }
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return ApiResponse.conflict(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'DIVISION_CREATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to create division');
      }
    }
  })
);

// Update division (admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const validatedData = divisionUpdateSchema.parse(req.body);
      const updatedDivision = await divisionService.updateDivision(id, validatedData);
      ApiResponse.success(res, updatedDivision, 'Division updated successfully');
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
        ApiResponse.fail(res, error.message, 'DIVISION_UPDATE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to update division');
      }
    }
  })
);

// Deactivate division (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const deactivatedDivision = await divisionService.deleteDivision(id);
      ApiResponse.success(res, deactivatedDivision, 'Division deactivated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'DIVISION_DEACTIVATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to deactivate division');
      }
    }
  })
);

// Get division statistics (admin only)
router.get('/stats/dashboard',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await divisionService.getDivisionStats();
      ApiResponse.success(res, stats, 'Division statistics retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'DIVISION_STATS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve division statistics');
      }
    }
  })
);

// Get division by name (public endpoint)
router.get('/name/:name',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { name } = req.params;
      const division = await divisionService.getDivisionByName(name);
      ApiResponse.success(res, division, 'Division retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'DIVISION_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve division');
      }
    }
  })
);

export default router;