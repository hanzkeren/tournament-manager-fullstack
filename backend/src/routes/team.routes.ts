import { Router } from 'express';
import { teamService } from '../services/team.service';
import { teamCreateSchema, teamUpdateSchema } from '../utils/validation';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken, requireAdmin, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Get all teams (public endpoint)
router.get('/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        divisionId,
        isActive,
      } = req.query;

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        divisionId: divisionId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      };

      const result = await teamService.getAllTeams(filters);
      ApiResponse.paginated(
        res,
        result.teams,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Teams retrieved successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'TEAMS_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve teams');
      }
    }
  })
);

// Get active teams only (public endpoint)
router.get('/active',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const teams = await teamService.getActiveTeams();
      ApiResponse.success(res, teams, 'Active teams retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'ACTIVE_TEAMS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve active teams');
      }
    }
  })
);

// Get teams by division (public endpoint)
router.get('/division/:divisionId',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { divisionId } = req.params;
      const teams = await teamService.getTeamsByDivision(divisionId);
      ApiResponse.success(res, teams, 'Division teams retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'DIVISION_TEAMS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve division teams');
      }
    }
  })
);

// Get team by ID (public endpoint)
router.get('/:id',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const team = await teamService.getTeamById(id);
      ApiResponse.success(res, team, 'Team retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'TEAM_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve team');
      }
    }
  })
);

// Create team (admin only)
router.post('/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = teamCreateSchema.parse(req.body);
      const newTeam = await teamService.createTeam(validatedData);
      ApiResponse.created(res, newTeam, 'Team created successfully');
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
        ApiResponse.fail(res, error.message, 'TEAM_CREATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to create team');
      }
    }
  })
);

// Update team (admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const validatedData = teamUpdateSchema.parse(req.body);
      const updatedTeam = await teamService.updateTeam(id, validatedData);
      ApiResponse.success(res, updatedTeam, 'Team updated successfully');
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
        ApiResponse.fail(res, error.message, 'TEAM_UPDATE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to update team');
      }
    }
  })
);

// Deactivate team (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const deactivatedTeam = await teamService.deleteTeam(id);
      ApiResponse.success(res, deactivatedTeam, 'Team deactivated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'TEAM_DEACTIVATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to deactivate team');
      }
    }
  })
);

// Get team statistics (admin only)
router.get('/stats/dashboard',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await teamService.getTeamStats();
      ApiResponse.success(res, stats, 'Team statistics retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'TEAM_STATS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve team statistics');
      }
    }
  })
);

export default router;