import { Router } from 'express';
import { matchService } from '../services/match.service';
import { matchCreateSchema, matchUpdateSchema, matchResultSchema } from '../utils/validation';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken, requireAdmin, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Get all matches (public endpoint)
router.get('/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        teamId,
        tournamentId,
        status,
        isCompleted,
        startDate,
        endDate
      } = req.query;

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        teamId: teamId as string,
        tournamentId: tournamentId as string,
        status: status as string,
        isCompleted: isCompleted === 'true' ? true : isCompleted === 'false' ? false : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      const result = await matchService.getAllMatches(filters);
      ApiResponse.paginated(
        res,
        result.matches,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Matches retrieved successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'MATCHES_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve matches');
      }
    }
  })
);

// Get matches by team (public endpoint)
router.get('/team/:teamId',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { teamId } = req.params;
      const matches = await matchService.getMatchesByTeam(teamId);
      ApiResponse.success(res, matches, 'Team matches retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'TEAM_MATCHES_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve team matches');
      }
    }
  })
);

// Get matches by tournament (public endpoint)
router.get('/tournament/:tournamentId',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { tournamentId } = req.params;
      const matches = await matchService.getMatchesByTournament(tournamentId);
      ApiResponse.success(res, matches, 'Tournament matches retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'TOURNAMENT_MATCHES_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve tournament matches');
      }
    }
  })
);

// Get match by ID (public endpoint)
router.get('/:id',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const match = await matchService.getMatchById(id);
      ApiResponse.success(res, match, 'Match retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'MATCH_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve match');
      }
    }
  })
);

// Create match (admin only)
router.post('/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = matchCreateSchema.parse(req.body);
      const newMatch = await matchService.createMatch(validatedData);
      ApiResponse.created(res, newMatch, 'Match created successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.fail(res, error.errors[0].message, 'VALIDATION_ERROR');
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'MATCH_CREATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to create match');
      }
    }
  })
);

// Update match (admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const validatedData = matchUpdateSchema.parse(req.body);
      const updatedMatch = await matchService.updateMatch(id, validatedData);
      ApiResponse.success(res, updatedMatch, 'Match updated successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.fail(res, error.errors[0].message, 'VALIDATION_ERROR');
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'MATCH_UPDATE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to update match');
      }
    }
  })
);

// Record match result (admin only)
router.post('/:id/result',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const validatedData = matchResultSchema.parse(req.body);
      const updatedMatch = await matchService.recordMatchResult(id, validatedData);
      ApiResponse.success(res, updatedMatch, 'Match result recorded successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.fail(res, error.errors[0].message, 'VALIDATION_ERROR');
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        if (error.message.includes('already completed')) {
          return ApiResponse.conflict(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'MATCH_RESULT_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to record match result');
      }
    }
  })
);

// Delete match (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const result = await matchService.deleteMatch(id);
      ApiResponse.success(res, result, 'Match deleted successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'MATCH_DELETION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to delete match');
      }
    }
  })
);

// Get match statistics (admin only)
router.get('/stats/dashboard',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await matchService.getMatchStats();
      ApiResponse.success(res, stats, 'Match statistics retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'MATCH_STATS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve match statistics');
      }
    }
  })
);

export default router;