import { eq, and, ilike, desc, asc, gte, lte } from 'drizzle-orm';
import { db } from '../config/database';
import { match, team, tournament, division } from '../models';
import { MatchCreate, MatchUpdate, MatchResult } from '../utils/validation';
import logger from '../config/logger';
import leaderboardService from './leaderboard.service';

export interface MatchFilters {
  page?: number;
  limit?: number;
  search?: string;
  teamId?: string;
  tournamentId?: string;
  status?: string;
  isCompleted?: boolean;
  startDate?: string;
  endDate?: string;
}

class MatchService {
  async getAllMatches(filters: MatchFilters = {}) {
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
      } = filters;
      const offset = (page - 1) * limit;

      let query = db
        .select({
          id: match.id,
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          date: match.date,
          venue: match.venue,
          status: match.status,
          isCompleted: match.isCompleted,
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          tournamentId: match.tournamentId,
          homeTeamName: team.name, // This will be home team, need to join twice
          awayTeamName: team.name, // This will be away team
          tournamentName: tournament.name,
        })
        .from(match)
        .leftJoin(team, eq(match.homeTeamId, team.id))
        .leftJoin(tournament, eq(match.tournamentId, tournament.id));

      // Apply filters
      const conditions = [];

      if (search) {
        conditions.push(
          ilike(match.venue, `%${search}%`)
        );
      }

      if (teamId) {
        conditions.push(
          eq(match.homeTeamId, teamId),
          eq(match.awayTeamId, teamId)
        );
      }

      if (tournamentId) {
        conditions.push(eq(match.tournamentId, tournamentId));
      }

      if (status) {
        conditions.push(eq(match.status, status));
      }

      if (typeof isCompleted === 'boolean') {
        conditions.push(eq(match.isCompleted, isCompleted));
      }

      if (startDate) {
        conditions.push(gte(match.date, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(match.date, new Date(endDate)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Get total count
      const countQuery = db.select({ count: match.id }).from(match);
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      const totalResult = await countQuery;
      const total = totalResult.length;

      // Get paginated results
      const matches = await query
        .orderBy(asc(match.date))
        .limit(limit)
        .offset(offset);

      // We need to get away team names separately
      const matchesWithAwayTeam = await Promise.all(
        matches.map(async (matchItem) => {
          const [awayTeam] = await db
            .select({ name: team.name })
            .from(team)
            .where(eq(team.id, matchItem.awayTeamId))
            .limit(1);

          return {
            ...matchItem,
            awayTeamName: awayTeam?.name || 'Unknown',
          };
        })
      );

      return {
        matches: matchesWithAwayTeam,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getAllMatches:', error);
      throw error;
    }
  }

  async getMatchById(id: string) {
    try {
      const [foundMatch] = await db
        .select({
          id: match.id,
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          date: match.date,
          venue: match.venue,
          status: match.status,
          isCompleted: match.isCompleted,
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          tournamentId: match.tournamentId,
        })
        .from(match)
        .where(eq(match.id, id))
        .limit(1);

      if (!foundMatch) {
        throw new Error('Match not found');
      }

      // Get team names
      const [homeTeam] = await db
        .select({ name: team.name })
        .from(team)
        .where(eq(team.id, foundMatch.homeTeamId))
        .limit(1);

      const [awayTeam] = await db
        .select({ name: team.name })
        .from(team)
        .where(eq(team.id, foundMatch.awayTeamId))
        .limit(1);

      const [tournamentInfo] = await db
        .select({ name: tournament.name })
        .from(tournament)
        .where(eq(tournament.id, foundMatch.tournamentId || ''))
        .limit(1);

      return {
        ...foundMatch,
        homeTeamName: homeTeam?.name || 'Unknown',
        awayTeamName: awayTeam?.name || 'Unknown',
        tournamentName: tournamentInfo?.name,
      };
    } catch (error) {
      logger.error('Error in getMatchById:', error);
      throw error;
    }
  }

  async createMatch(matchData: MatchCreate) {
    try {
      // Verify teams exist
      const [homeTeamExists] = await db
        .select()
        .from(team)
        .where(eq(team.id, matchData.homeTeamId))
        .limit(1);

      if (!homeTeamExists) {
        throw new Error('Home team not found');
      }

      const [awayTeamExists] = await db
        .select()
        .from(team)
        .where(eq(team.id, matchData.awayTeamId))
        .limit(1);

      if (!awayTeamExists) {
        throw new Error('Away team not found');
      }

      // Verify tournament exists if tournamentId is provided
      if (matchData.tournamentId) {
        const [tournamentExists] = await db
          .select()
          .from(tournament)
          .where(eq(tournament.id, matchData.tournamentId))
          .limit(1);

        if (!tournamentExists) {
          throw new Error('Tournament not found');
        }
      }

      const [newMatch] = await db
        .insert(match)
        .values({
          ...matchData,
          date: new Date(matchData.date),
        })
        .returning();

      if (!newMatch) {
        throw new Error('Failed to create match');
      }

      logger.info(`New match created: ${newMatch.homeTeamId} vs ${newMatch.awayTeamId}`);
      return newMatch;
    } catch (error) {
      logger.error('Error in createMatch:', error);
      throw error;
    }
  }

  async updateMatch(id: string, updateData: MatchUpdate) {
    try {
      // Check if match exists
      await this.getMatchById(id);

      // Verify teams exist if team IDs are being updated
      if (updateData.homeTeamId) {
        const [homeTeamExists] = await db
          .select()
          .from(team)
          .where(eq(team.id, updateData.homeTeamId))
          .limit(1);

        if (!homeTeamExists) {
          throw new Error('Home team not found');
        }
      }

      if (updateData.awayTeamId) {
        const [awayTeamExists] = await db
          .select()
          .from(team)
          .where(eq(team.id, updateData.awayTeamId))
          .limit(1);

        if (!awayTeamExists) {
          throw new Error('Away team not found');
        }
      }

      // Verify tournament exists if tournamentId is being updated
      if (updateData.tournamentId) {
        const [tournamentExists] = await db
          .select()
          .from(tournament)
          .where(eq(tournament.id, updateData.tournamentId))
          .limit(1);

        if (!tournamentExists) {
          throw new Error('Tournament not found');
        }
      }

      const updateValues: any = {
        ...updateData,
        updatedAt: new Date(),
      };

      // Convert date string to Date object if present
      if (updateData.date) {
        updateValues.date = new Date(updateData.date);
      }

      // If scores are updated and status is being set to completed
      if (updateData.scoreHome !== undefined && updateData.scoreAway !== undefined) {
        updateValues.isCompleted = true;
        if (!updateData.status) {
          updateValues.status = 'completed';
        }
      }

      const [updatedMatch] = await db
        .update(match)
        .set(updateValues)
        .where(eq(match.id, id))
        .returning();

      if (!updatedMatch) {
        throw new Error('Failed to update match');
      }

      logger.info(`Match updated: ${updatedMatch.id}`);
      return updatedMatch;
    } catch (error) {
      logger.error('Error in updateMatch:', error);
      throw error;
    }
  }

  async recordMatchResult(id: string, result: MatchResult) {
    try {
      // Check if match exists
      const existingMatch = await this.getMatchById(id);

      if (existingMatch.isCompleted) {
        throw new Error('Match is already completed');
      }

      const [updatedMatch] = await db
        .update(match)
        .set({
          scoreHome: result.scoreHome,
          scoreAway: result.scoreAway,
          status: result.status,
          isCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(match.id, id))
        .returning();

      if (!updatedMatch) {
        throw new Error('Failed to record match result');
      }

      logger.info(`Match result recorded: ${updatedMatch.id} - ${result.scoreHome}:${result.scoreAway}`);

      // Trigger leaderboard updates for both teams' divisions
      try {
        // Get home team's division
        const [homeTeamInfo] = await db
          .select({ divisionId: team.divisionId })
          .from(team)
          .where(eq(team.id, updatedMatch.homeTeamId))
          .limit(1);

        if (homeTeamInfo) {
          await leaderboardService.triggerLeaderboardUpdate(homeTeamInfo.divisionId);
        }

        // Get away team's division (might be different)
        const [awayTeamInfo] = await db
          .select({ divisionId: team.divisionId })
          .from(team)
          .where(eq(team.id, updatedMatch.awayTeamId))
          .limit(1);

        if (awayTeamInfo && awayTeamInfo.divisionId !== homeTeamInfo?.divisionId) {
          await leaderboardService.triggerLeaderboardUpdate(awayTeamInfo.divisionId);
        }
      } catch (leaderboardError) {
        logger.warn('Failed to update leaderboard after match result:', leaderboardError);
        // Don't fail the match result recording if leaderboard update fails
      }

      return updatedMatch;
    } catch (error) {
      logger.error('Error in recordMatchResult:', error);
      throw error;
    }
  }

  async deleteMatch(id: string) {
    try {
      // Check if match exists
      const existingMatch = await this.getMatchById(id);

      await db.delete(match).where(eq(match.id, id));
      logger.info(`Match deleted: ${existingMatch.id}`);
      return { message: 'Match deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteMatch:', error);
      throw error;
    }
  }

  async getMatchesByTeam(teamId: string) {
    try {
      const matches = await db
        .select({
          id: match.id,
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          date: match.date,
          venue: match.venue,
          status: match.status,
          isCompleted: match.isCompleted,
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          tournamentId: match.tournamentId,
        })
        .from(match)
        .where(and(
          eq(match.homeTeamId, teamId),
          eq(match.awayTeamId, teamId)
        ))
        .orderBy(asc(match.date));

      // Get team and tournament names for each match
      const matchesWithDetails = await Promise.all(
        matches.map(async (matchItem) => {
          const [homeTeam] = await db
            .select({ name: team.name })
            .from(team)
            .where(eq(team.id, matchItem.homeTeamId))
            .limit(1);

          const [awayTeam] = await db
            .select({ name: team.name })
            .from(team)
            .where(eq(team.id, matchItem.awayTeamId))
            .limit(1);

          const [tournamentInfo] = await db
            .select({ name: tournament.name })
            .from(tournament)
            .where(eq(tournament.id, matchItem.tournamentId || ''))
            .limit(1);

          return {
            ...matchItem,
            homeTeamName: homeTeam?.name || 'Unknown',
            awayTeamName: awayTeam?.name || 'Unknown',
            tournamentName: tournamentInfo?.name,
          };
        })
      );

      return matchesWithDetails;
    } catch (error) {
      logger.error('Error in getMatchesByTeam:', error);
      throw error;
    }
  }

  async getMatchesByTournament(tournamentId: string) {
    try {
      const matches = await db
        .select({
          id: match.id,
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          date: match.date,
          venue: match.venue,
          status: match.status,
          isCompleted: match.isCompleted,
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          tournamentId: match.tournamentId,
        })
        .from(match)
        .where(eq(match.tournamentId, tournamentId))
        .orderBy(asc(match.date));

      // Get team names for each match
      const matchesWithTeamNames = await Promise.all(
        matches.map(async (matchItem) => {
          const [homeTeam] = await db
            .select({ name: team.name })
            .from(team)
            .where(eq(team.id, matchItem.homeTeamId))
            .limit(1);

          const [awayTeam] = await db
            .select({ name: team.name })
            .from(team)
            .where(eq(team.id, matchItem.awayTeamId))
            .limit(1);

          return {
            ...matchItem,
            homeTeamName: homeTeam?.name || 'Unknown',
            awayTeamName: awayTeam?.name || 'Unknown',
          };
        })
      );

      return matchesWithTeamNames;
    } catch (error) {
      logger.error('Error in getMatchesByTournament:', error);
      throw error;
    }
  }

  async getMatchStats() {
    try {
      const totalMatches = await db.select().from(match);
      const completedMatches = await db.select().from(match).where(eq(match.isCompleted, true));
      const scheduledMatches = await db.select().from(match).where(eq(match.status, 'scheduled'));
      const inProgressMatches = await db.select().from(match).where(eq(match.status, 'in_progress'));

      return {
        total: totalMatches.length,
        completed: completedMatches.length,
        scheduled: scheduledMatches.length,
        inProgress: inProgressMatches.length,
        cancelled: totalMatches.length - completedMatches.length - scheduledMatches.length - inProgressMatches.length,
        byTournament: {} as Record<string, number>,
        byTeam: {} as Record<string, number>,
      };
    } catch (error) {
      logger.error('Error in getMatchStats:', error);
      throw error;
    }
  }
}

export const matchService = new MatchService();
export default matchService;