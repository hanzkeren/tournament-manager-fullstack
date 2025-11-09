import { Router } from 'express';
import { tournamentService } from '../services/tournament.service';
import { tournamentCreateSchema, tournamentUpdateSchema } from '../utils/validation';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken, requireAdmin, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Get all tournaments (public endpoint)
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
        startDate,
        endDate,
        createdBy
      } = req.query;

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        divisionId: divisionId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
        createdBy: createdBy as string,
      };

      const result = await tournamentService.getAllTournaments(filters);
      ApiResponse.paginated(
        res,
        result.tournaments,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Tournaments retrieved successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'TOURNAMENTS_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve tournaments');
      }
    }
  })
);

// Get active tournaments only (public endpoint)
router.get('/active',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const tournaments = await tournamentService.getActiveTournaments();
      ApiResponse.success(res, tournaments, 'Active tournaments retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'ACTIVE_TOURNAMENTS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve active tournaments');
      }
    }
  })
);

// Get tournaments by division (public endpoint)
router.get('/division/:divisionId',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { divisionId } = req.params;
      const tournaments = await tournamentService.getTournamentsByDivision(divisionId);
      ApiResponse.success(res, tournaments, 'Division tournaments retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'DIVISION_TOURNAMENTS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve division tournaments');
      }
    }
  })
);

// Get tournaments by creator (admin only)
router.get('/creator/:createdBy',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { createdBy } = req.params;
      const tournaments = await tournamentService.getTournamentsByCreator(createdBy);
      ApiResponse.success(res, tournaments, 'Creator tournaments retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'CREATOR_TOURNAMENTS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve creator tournaments');
      }
    }
  })
);

// Get tournament by ID (public endpoint)
router.get('/:id',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tournament = await tournamentService.getTournamentById(id);
      ApiResponse.success(res, tournament, 'Tournament retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'TOURNAMENT_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve tournament');
      }
    }
  })
);

// Create tournament (admin only)
router.post('/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = tournamentCreateSchema.parse(req.body);
      const newTournament = await tournamentService.createTournament(validatedData, req.user!.userId);
      ApiResponse.created(res, newTournament, 'Tournament created successfully');
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
        ApiResponse.fail(res, error.message, 'TOURNAMENT_CREATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to create tournament');
      }
    }
  })
);

// Update tournament (admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const validatedData = tournamentUpdateSchema.parse(req.body);
      const updatedTournament = await tournamentService.updateTournament(id, validatedData);
      ApiResponse.success(res, updatedTournament, 'Tournament updated successfully');
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
        ApiResponse.fail(res, error.message, 'TOURNAMENT_UPDATE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to update tournament');
      }
    }
  })
);

// Deactivate tournament (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const deactivatedTournament = await tournamentService.deleteTournament(id);
      ApiResponse.success(res, deactivatedTournament, 'Tournament deactivated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'TOURNAMENT_DEACTIVATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to deactivate tournament');
      }
    }
  })
);

// Get tournament statistics (admin only)
router.get('/stats/dashboard',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await tournamentService.getTournamentStats();
      ApiResponse.success(res, stats, 'Tournament statistics retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'TOURNAMENT_STATS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve tournament statistics');
      }
    }
  })
);

export default router;