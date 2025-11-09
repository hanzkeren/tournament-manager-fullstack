import { Router } from 'express';
import { bracketService } from '../services/bracket.service';
import { bracketCreateSchema } from '../utils/validation';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken, requireAdmin, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Generate new bracket for tournament (admin only)
router.post('/generate',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = bracketCreateSchema.parse(req.body);
      const newBracket = await bracketService.createBracket(validatedData);
      ApiResponse.created(res, newBracket, 'Bracket generated successfully');
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
        ApiResponse.fail(res, error.message, 'BRACKET_GENERATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to generate bracket');
      }
    }
  })
);

// Get bracket by ID (public endpoint)
router.get('/:id',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const bracket = await bracketService.getBracketById(id);
      ApiResponse.success(res, bracket, 'Bracket retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'BRACKET_FETCH_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve bracket');
      }
    }
  })
);

// Get bracket by tournament ID (public endpoint)
router.get('/tournament/:tournamentId',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { tournamentId } = req.params;
      const bracket = await bracketService.getBracketByTournament(tournamentId);
      ApiResponse.success(res, bracket, 'Tournament bracket retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'TOURNAMENT_BRACKET_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve tournament bracket');
      }
    }
  })
);

// Get bracket visualization (public endpoint)
router.get('/:id/visualization',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const visualization = await bracketService.getBracketVisualization(id);
      ApiResponse.success(res, visualization, 'Bracket visualization retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'BRACKET_VISUALIZATION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to retrieve bracket visualization');
      }
    }
  })
);

// Update bracket progression (admin only)
router.put('/:id/progression/:matchId',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id, matchId } = req.params;
      const { winnerTeamId } = req.body;

      if (!winnerTeamId) {
        return ApiResponse.fail(res, 'Winner team ID is required', 'VALIDATION_ERROR');
      }

      const updatedBracket = await bracketService.updateBracketProgression(id, matchId, winnerTeamId);
      ApiResponse.success(res, updatedBracket, 'Bracket progression updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'BRACKET_PROGRESSION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to update bracket progression');
      }
    }
  })
);

// Advance bracket to next round (admin only)
router.put('/:id/advance',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updatedBracket = await bracketService.advanceBracketRound(id);
      ApiResponse.success(res, updatedBracket, 'Bracket advanced to next round successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        if (error.message.includes('complete')) {
          return ApiResponse.conflict(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'BRACKET_ADVANCE_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to advance bracket');
      }
    }
  })
);

// Complete bracket (admin only)
router.put('/:id/complete',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const completedBracket = await bracketService.completeBracket(id);
      ApiResponse.success(res, completedBracket, 'Bracket completed successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ApiResponse.notFound(res, error.message);
        }
        ApiResponse.fail(res, error.message, 'BRACKET_COMPLETION_ERROR');
      } else {
        ApiResponse.error(res, 'Failed to complete bracket');
      }
    }
  })
);

export default router;