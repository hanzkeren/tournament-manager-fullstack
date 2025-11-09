import { eq, and, ilike, desc, asc, gte, lte } from 'drizzle-orm';
import { db } from '../config/database';
import { tournament, division, user } from '../models';
import { TournamentCreate, TournamentUpdate } from '../utils/validation';
import logger from '../config/logger';

export interface TournamentFilters {
  page?: number;
  limit?: number;
  search?: string;
  divisionId?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
}

class TournamentService {
  async getAllTournaments(filters: TournamentFilters = {}) {
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
      } = filters;
      const offset = (page - 1) * limit;

      let query = db
        .select({
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          isActive: tournament.isActive,
          createdAt: tournament.createdAt,
          updatedAt: tournament.updatedAt,
          divisionId: tournament.divisionId,
          createdBy: tournament.createdBy,
          divisionName: division.name,
          creatorUsername: user.username,
        })
        .from(tournament)
        .leftJoin(division, eq(tournament.divisionId, division.id))
        .leftJoin(user, eq(tournament.createdBy, user.id));

      // Apply filters
      const conditions = [];

      if (search) {
        conditions.push(ilike(tournament.name, `%${search}%`));
      }

      if (divisionId) {
        conditions.push(eq(tournament.divisionId, divisionId));
      }

      if (typeof isActive === 'boolean') {
        conditions.push(eq(tournament.isActive, isActive));
      }

      if (startDate) {
        conditions.push(gte(tournament.startDate, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(tournament.endDate, new Date(endDate)));
      }

      if (createdBy) {
        conditions.push(eq(tournament.createdBy, createdBy));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Get total count
      const countQuery = db.select({ count: tournament.id }).from(tournament);
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      const totalResult = await countQuery;
      const total = totalResult.length;

      // Get paginated results
      const tournaments = await query
        .orderBy(desc(tournament.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        tournaments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getAllTournaments:', error);
      throw error;
    }
  }

  async getTournamentById(id: string) {
    try {
      const [foundTournament] = await db
        .select({
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          isActive: tournament.isActive,
          createdAt: tournament.createdAt,
          updatedAt: tournament.updatedAt,
          divisionId: tournament.divisionId,
          createdBy: tournament.createdBy,
          divisionName: division.name,
          creatorUsername: user.username,
        })
        .from(tournament)
        .leftJoin(division, eq(tournament.divisionId, division.id))
        .leftJoin(user, eq(tournament.createdBy, user.id))
        .where(eq(tournament.id, id))
        .limit(1);

      if (!foundTournament) {
        throw new Error('Tournament not found');
      }

      return foundTournament;
    } catch (error) {
      logger.error('Error in getTournamentById:', error);
      throw error;
    }
  }

  async createTournament(tournamentData: TournamentCreate, createdBy: string) {
    try {
      // Verify division exists
      const [divisionExists] = await db
        .select()
        .from(division)
        .where(eq(division.id, tournamentData.divisionId))
        .limit(1);

      if (!divisionExists) {
        throw new Error('Division not found');
      }

      // Check if tournament name already exists in the same division
      const [existingTournament] = await db
        .select()
        .from(tournament)
        .where(and(
          eq(tournament.name, tournamentData.name),
          eq(tournament.divisionId, tournamentData.divisionId)
        ))
        .limit(1);

      if (existingTournament) {
        throw new Error('Tournament with this name already exists in this division');
      }

      const [newTournament] = await db
        .insert(tournament)
        .values({
          ...tournamentData,
          createdBy,
          startDate: new Date(tournamentData.startDate),
          endDate: new Date(tournamentData.endDate),
        })
        .returning();

      if (!newTournament) {
        throw new Error('Failed to create tournament');
      }

      logger.info(`New tournament created: ${newTournament.name} by user ${createdBy}`);
      return newTournament;
    } catch (error) {
      logger.error('Error in createTournament:', error);
      throw error;
    }
  }

  async updateTournament(id: string, updateData: TournamentUpdate) {
    try {
      // Check if tournament exists
      await this.getTournamentById(id);

      // Verify division exists if divisionId is being updated
      if (updateData.divisionId) {
        const [divisionExists] = await db
          .select()
          .from(division)
          .where(eq(division.id, updateData.divisionId))
          .limit(1);

        if (!divisionExists) {
          throw new Error('Division not found');
        }
      }

      // Check for duplicate name if name is being updated
      if (updateData.name) {
        const [duplicateTournament] = await db
          .select()
          .from(tournament)
          .where(and(
            eq(tournament.name, updateData.name),
            eq(tournament.divisionId, updateData.divisionId || id)
          ))
          .limit(1);

        if (duplicateTournament && duplicateTournament.id !== id) {
          throw new Error('Tournament name already exists in this division');
        }
      }

      const updateValues: any = {
        ...updateData,
        updatedAt: new Date(),
      };

      // Convert date strings to Date objects if present
      if (updateData.startDate) {
        updateValues.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateValues.endDate = new Date(updateData.endDate);
      }

      const [updatedTournament] = await db
        .update(tournament)
        .set(updateValues)
        .where(eq(tournament.id, id))
        .returning();

      if (!updatedTournament) {
        throw new Error('Failed to update tournament');
      }

      logger.info(`Tournament updated: ${updatedTournament.name}`);
      return updatedTournament;
    } catch (error) {
      logger.error('Error in updateTournament:', error);
      throw error;
    }
  }

  async deleteTournament(id: string) {
    try {
      // Check if tournament exists
      const existingTournament = await this.getTournamentById(id);

      // Soft delete by deactivating
      const [deactivatedTournament] = await db
        .update(tournament)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(tournament.id, id))
        .returning();

      if (!deactivatedTournament) {
        throw new Error('Failed to deactivate tournament');
      }

      logger.info(`Tournament deactivated: ${existingTournament.name}`);
      return deactivatedTournament;
    } catch (error) {
      logger.error('Error in deleteTournament:', error);
      throw error;
    }
  }

  async getActiveTournaments() {
    try {
      const tournaments = await db
        .select({
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          isActive: tournament.isActive,
          createdAt: tournament.createdAt,
          updatedAt: tournament.updatedAt,
          divisionId: tournament.divisionId,
          createdBy: tournament.createdBy,
          divisionName: division.name,
          creatorUsername: user.username,
        })
        .from(tournament)
        .leftJoin(division, eq(tournament.divisionId, division.id))
        .leftJoin(user, eq(tournament.createdBy, user.id))
        .where(eq(tournament.isActive, true))
        .orderBy(desc(tournament.startDate));

      return tournaments;
    } catch (error) {
      logger.error('Error in getActiveTournaments:', error);
      throw error;
    }
  }

  async getTournamentsByDivision(divisionId: string) {
    try {
      const tournaments = await db
        .select({
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          isActive: tournament.isActive,
          createdAt: tournament.createdAt,
          updatedAt: tournament.updatedAt,
          divisionId: tournament.divisionId,
          createdBy: tournament.createdBy,
          divisionName: division.name,
          creatorUsername: user.username,
        })
        .from(tournament)
        .leftJoin(division, eq(tournament.divisionId, division.id))
        .leftJoin(user, eq(tournament.createdBy, user.id))
        .where(eq(tournament.divisionId, divisionId))
        .orderBy(desc(tournament.startDate));

      return tournaments;
    } catch (error) {
      logger.error('Error in getTournamentsByDivision:', error);
      throw error;
    }
  }

  async getTournamentsByCreator(createdBy: string) {
    try {
      const tournaments = await db
        .select({
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          isActive: tournament.isActive,
          createdAt: tournament.createdAt,
          updatedAt: tournament.updatedAt,
          divisionId: tournament.divisionId,
          createdBy: tournament.createdBy,
          divisionName: division.name,
          creatorUsername: user.username,
        })
        .from(tournament)
        .leftJoin(division, eq(tournament.divisionId, division.id))
        .leftJoin(user, eq(tournament.createdBy, user.id))
        .where(eq(tournament.createdBy, createdBy))
        .orderBy(desc(tournament.createdAt));

      return tournaments;
    } catch (error) {
      logger.error('Error in getTournamentsByCreator:', error);
      throw error;
    }
  }

  async getTournamentStats() {
    try {
      const totalTournaments = await db.select().from(tournament);
      const activeTournaments = await db.select().from(tournament).where(eq(tournament.isActive, true));

      const stats = {
        total: totalTournaments.length,
        active: activeTournaments.length,
        inactive: totalTournaments.length - activeTournaments.length,
        byDivision: {} as Record<string, number>,
        upcoming: 0,
        ongoing: 0,
        completed: 0,
      };

      const now = new Date();

      // Count by division and status
      for (const tournament of totalTournaments) {
        // Division stats
        const divisionKey = tournament.divisionId;
        stats.byDivision[divisionKey] = (stats.byDivision[divisionKey] || 0) + 1;

        // Status stats
        if (new Date(tournament.startDate) > now) {
          stats.upcoming++;
        } else if (new Date(tournament.endDate) >= now) {
          stats.ongoing++;
        } else {
          stats.completed++;
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error in getTournamentStats:', error);
      throw error;
    }
  }
}

export const tournamentService = new TournamentService();
export default tournamentService;