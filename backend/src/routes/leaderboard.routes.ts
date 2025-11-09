import { Router } from 'express';
import { leaderboardService } from '../services/leaderboard.service';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken, requireAdmin, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Get leaderboard by division (public endpoint)
router.get('/division/:divisionId',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { divisionId } = req.params;
      const leaderboard = await leaderboardService.getLeaderboardByDivision(divisionId);
      ApiResponse.success(res, leaderboard, 'Division leaderboard retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'LEADERBOARD_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve leaderboard');
      }
    }
  })
);

// Get all division leaderboards (public endpoint)
router.get('/all',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const leaderboards = await leaderboardService.getAllLeaderboards();
      ApiResponse.success(res, leaderboards, 'All leaderboards retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'ALL_LEADERBOARDS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve all leaderboards');
      }
    }
  })
);

// Get team standings (public endpoint)
router.get('/team/:teamId',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { teamId } = req.params;
      const standings = await leaderboardService.getTeamStandings(teamId);
      ApiResponse.success(res, standings, 'Team standings retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'TEAM_STANDINGS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve team standings');
      }
    }
  })
);

// Get division statistics (public endpoint)
router.get('/division/:divisionId/stats',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { divisionId } = req.params;
      const stats = await leaderboardService.getDivisionStats(divisionId);
      ApiResponse.success(res, stats, 'Division statistics retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'DIVISION_STATS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve division statistics');
      }
    }
  })
);

// Manually update leaderboard for division (admin only)
router.post('/division/:divisionId/update',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { divisionId } = req.params;
      const updatedLeaderboard = await leaderboardService.updateLeaderboard(divisionId);
      ApiResponse.success(res, updatedLeaderboard, 'Leaderboard updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'LEADERBOARD_UPDATE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to update leaderboard');
      }
    }
  })
);

// Update all leaderboards (admin only)
router.post('/update-all',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      await leaderboardService.updateAllLeaderboards();
      ApiResponse.success(res, { message: 'All leaderboards updated successfully' }, 'All leaderboards updated');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'ALL_LEADERBOARDS_UPDATE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to update all leaderboards');
      }
    }
  })
);

// Create leaderboard snapshot (admin only)
router.post('/division/:divisionId/snapshot',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { divisionId } = req.params;
      const { tournamentId } = req.body;

      const snapshot = await leaderboardService.createLeaderboardSnapshot(
        divisionId,
        tournamentId
      );
      ApiResponse.created(res, snapshot, 'Leaderboard snapshot created successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'SNAPSHOT_CREATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to create leaderboard snapshot');
      }
    }
  })
);

// Get leaderboard history (public endpoint)
router.get('/division/:divisionId/history',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { divisionId } = req.params;
      const { limit = 10 } = req.query;

      const history = await leaderboardService.getLeaderboardHistory(
        divisionId,
        parseInt(limit as string)
      );
      ApiResponse.success(res, history, 'Leaderboard history retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'LEADERBOARD_HISTORY_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve leaderboard history');
      }
    }
  })
);

export default router;