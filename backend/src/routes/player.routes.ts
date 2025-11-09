import { Router } from 'express';
import { playerService } from '../services/player.service';
import { playerCreateSchema, playerUpdateSchema } from '../utils/validation';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken, requireAdmin, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Get all players (public endpoint)
router.get('/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        teamId,
        isActive,
      } = req.query;

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        teamId: teamId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      };

      const result = await playerService.getAllPlayers(filters);
      ApiResponse.paginated(
        res,
        result.players,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Players retrieved successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'PLAYERS_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve players');
      }
    }
  })
);

// Get active players only (public endpoint)
router.get('/active',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const players = await playerService.getActivePlayers();
      ApiResponse.success(res, players, 'Active players retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'ACTIVE_PLAYERS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve active players');
      }
    }
  })
);

// Search players (public endpoint)
router.get('/search/:searchTerm',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { searchTerm } = req.params;
      const players = await playerService.searchPlayers(searchTerm);
      ApiResponse.success(res, players, 'Players search results retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'PLAYER_SEARCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to search players');
      }
    }
  })
);

// Get players by team (public endpoint)
router.get('/team/:teamId',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { teamId } = req.params;
      const players = await playerService.getPlayersByTeam(teamId);
      ApiResponse.success(res, players, 'Team players retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'TEAM_PLAYERS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve team players');
      }
    }
  })
);

// Get player by ID (public endpoint)
router.get('/:id',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const player = await playerService.getPlayerById(id);
      ApiResponse.success(res, player, 'Player retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'PLAYER_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve player');
      }
    }
  })
);

// Create player (admin only)
router.post('/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = playerCreateSchema.parse(req.body);
      const newPlayer = await playerService.createPlayer(validatedData);
      ApiResponse.created(res, newPlayer, 'Player created successfully');
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
        ApiResponse.fail(res, error.message, 'PLAYER_CREATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to create player');
      }
    }
  })
);

// Update player (admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const validatedData = playerUpdateSchema.parse(req.body);
      const updatedPlayer = await playerService.updatePlayer(id, validatedData);
      ApiResponse.success(res, updatedPlayer, 'Player updated successfully');
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
        ApiResponse.fail(res, error.message, 'PLAYER_UPDATE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to update player');
      }
    }
  })
);

// Deactivate player (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const deactivatedPlayer = await playerService.deletePlayer(id);
      ApiResponse.success(res, deactivatedPlayer, 'Player deactivated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'PLAYER_DEACTIVATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to deactivate player');
      }
    }
  })
);

// Get player statistics (admin only)
router.get('/stats/dashboard',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await playerService.getPlayerStats();
      ApiResponse.success(res, stats, 'Player statistics retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        ApiResponse.fail(res, error.message, 'PLAYER_STATS_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve player statistics');
      }
    }
  })
);

export default router;