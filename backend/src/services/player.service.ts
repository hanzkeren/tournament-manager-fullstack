import { eq, and, ilike, desc, asc } from 'drizzle-orm';
import { db } from '../config/database';
import { player, team, division } from '../models';
import { PlayerCreate, PlayerUpdate } from '../utils/validation';
import logger from '../config/logger';

export interface PlayerFilters {
  page?: number;
  limit?: number;
  search?: string;
  teamId?: string;
  isActive?: boolean;
}

class PlayerService {
  async getAllPlayers(filters: PlayerFilters = {}) {
    try {
      const { page = 1, limit = 10, search, teamId, isActive } = filters;
      const offset = (page - 1) * limit;

      let query = db
        .select({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          email: player.email,
          phone: player.phone,
          isActive: player.isActive,
          createdAt: player.createdAt,
          updatedAt: player.updatedAt,
          teamId: player.teamId,
          teamName: team.name,
          divisionId: division.id,
          divisionName: division.name,
        })
        .from(player)
        .leftJoin(team, eq(player.teamId, team.id))
        .leftJoin(division, eq(team.divisionId, division.id));

      // Apply filters
      const conditions = [];

      if (search) {
        conditions.push(
          ilike(player.firstName, `%${search}%`),
          ilike(player.lastName, `%${search}%`),
          ilike(player.email, `%${search}%`)
        );
      }

      if (teamId) {
        conditions.push(eq(player.teamId, teamId));
      }

      if (typeof isActive === 'boolean') {
        conditions.push(eq(player.isActive, isActive));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Get total count
      const countQuery = db.select({ count: player.id }).from(player);
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      const totalResult = await countQuery;
      const total = totalResult.length;

      // Get paginated results
      const players = await query
        .orderBy(asc(player.lastName), asc(player.firstName))
        .limit(limit)
        .offset(offset);

      return {
        players,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getAllPlayers:', error);
      throw error;
    }
  }

  async getPlayerById(id: string) {
    try {
      const [foundPlayer] = await db
        .select({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          email: player.email,
          phone: player.phone,
          isActive: player.isActive,
          createdAt: player.createdAt,
          updatedAt: player.updatedAt,
          teamId: player.teamId,
          teamName: team.name,
          divisionId: division.id,
          divisionName: division.name,
        })
        .from(player)
        .leftJoin(team, eq(player.teamId, team.id))
        .leftJoin(division, eq(team.divisionId, division.id))
        .where(eq(player.id, id))
        .limit(1);

      if (!foundPlayer) {
        throw new Error('Player not found');
      }

      return foundPlayer;
    } catch (error) {
      logger.error('Error in getPlayerById:', error);
      throw error;
    }
  }

  async createPlayer(playerData: PlayerCreate) {
    try {
      // Verify team exists if teamId is provided
      if (playerData.teamId) {
        const [teamExists] = await db
          .select()
          .from(team)
          .where(eq(team.id, playerData.teamId))
          .limit(1);

        if (!teamExists) {
          throw new Error('Team not found');
        }
      }

      // Check for duplicate email if email is provided
      if (playerData.email) {
        const [existingEmail] = await db
          .select()
          .from(player)
          .where(eq(player.email, playerData.email))
          .limit(1);

        if (existingEmail) {
          throw new Error('Player with this email already exists');
        }
      }

      const [newPlayer] = await db
        .insert(player)
        .values(playerData)
        .returning();

      if (!newPlayer) {
        throw new Error('Failed to create player');
      }

      logger.info(`New player created: ${newPlayer.firstName} ${newPlayer.lastName}`);
      return newPlayer;
    } catch (error) {
      logger.error('Error in createPlayer:', error);
      throw error;
    }
  }

  async updatePlayer(id: string, updateData: PlayerUpdate) {
    try {
      // Check if player exists
      await this.getPlayerById(id);

      // Verify team exists if teamId is being updated
      if (updateData.teamId) {
        const [teamExists] = await db
          .select()
          .from(team)
          .where(eq(team.id, updateData.teamId))
          .limit(1);

        if (!teamExists) {
          throw new Error('Team not found');
        }
      }

      // Check for duplicate email if email is being updated
      if (updateData.email) {
        const [duplicateEmail] = await db
          .select()
          .from(player)
          .where(and(
            eq(player.email, updateData.email),
            eq(player.id, id)
          ))
          .limit(1);

        if (duplicateEmail && duplicateEmail.id !== id) {
          throw new Error('Player with this email already exists');
        }
      }

      const [updatedPlayer] = await db
        .update(player)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(player.id, id))
        .returning();

      if (!updatedPlayer) {
        throw new Error('Failed to update player');
      }

      logger.info(`Player updated: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`);
      return updatedPlayer;
    } catch (error) {
      logger.error('Error in updatePlayer:', error);
      throw error;
    }
  }

  async deletePlayer(id: string) {
    try {
      // Check if player exists
      const existingPlayer = await this.getPlayerById(id);

      // Soft delete by deactivating
      const [deactivatedPlayer] = await db
        .update(player)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(player.id, id))
        .returning();

      if (!deactivatedPlayer) {
        throw new Error('Failed to deactivate player');
      }

      logger.info(`Player deactivated: ${existingPlayer.firstName} ${existingPlayer.lastName}`);
      return deactivatedPlayer;
    } catch (error) {
      logger.error('Error in deletePlayer:', error);
      throw error;
    }
  }

  async getActivePlayers() {
    try {
      const players = await db
        .select({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          email: player.email,
          phone: player.phone,
          isActive: player.isActive,
          createdAt: player.createdAt,
          updatedAt: player.updatedAt,
          teamId: player.teamId,
          teamName: team.name,
          divisionId: division.id,
          divisionName: division.name,
        })
        .from(player)
        .leftJoin(team, eq(player.teamId, team.id))
        .leftJoin(division, eq(team.divisionId, division.id))
        .where(eq(player.isActive, true))
        .orderBy(asc(player.lastName), asc(player.firstName));

      return players;
    } catch (error) {
      logger.error('Error in getActivePlayers:', error);
      throw error;
    }
  }

  async getPlayersByTeam(teamId: string) {
    try {
      const players = await db
        .select({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          email: player.email,
          phone: player.phone,
          isActive: player.isActive,
          createdAt: player.createdAt,
          updatedAt: player.updatedAt,
          teamId: player.teamId,
          teamName: team.name,
          divisionId: division.id,
          divisionName: division.name,
        })
        .from(player)
        .leftJoin(team, eq(player.teamId, team.id))
        .leftJoin(division, eq(team.divisionId, division.id))
        .where(eq(player.teamId, teamId))
        .orderBy(asc(player.lastName), asc(player.firstName));

      return players;
    } catch (error) {
      logger.error('Error in getPlayersByTeam:', error);
      throw error;
    }
  }

  async getPlayerStats() {
    try {
      const totalPlayers = await db.select().from(player);
      const activePlayers = await db.select().from(player).where(eq(player.isActive, true));

      const stats = {
        total: totalPlayers.length,
        active: activePlayers.length,
        inactive: totalPlayers.length - activePlayers.length,
        byTeam: {} as Record<string, number>,
        withoutTeam: 0,
      };

      // Count by team
      for (const player of totalPlayers) {
        if (player.teamId) {
          const teamKey = player.teamId;
          stats.byTeam[teamKey] = (stats.byTeam[teamKey] || 0) + 1;
        } else {
          stats.withoutTeam++;
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error in getPlayerStats:', error);
      throw error;
    }
  }

  async searchPlayers(searchTerm: string) {
    try {
      const players = await db
        .select({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          email: player.email,
          phone: player.phone,
          isActive: player.isActive,
          createdAt: player.createdAt,
          updatedAt: player.updatedAt,
          teamId: player.teamId,
          teamName: team.name,
          divisionId: division.id,
          divisionName: division.name,
        })
        .from(player)
        .leftJoin(team, eq(player.teamId, team.id))
        .leftJoin(division, eq(team.divisionId, division.id))
        .where(and(
          eq(player.isActive, true),
          ilike(player.firstName, `%${searchTerm}%`)
        ))
        .orderBy(asc(player.lastName), asc(player.firstName))
        .limit(20);

      return players;
    } catch (error) {
      logger.error('Error in searchPlayers:', error);
      throw error;
    }
  }
}

export const playerService = new PlayerService();
export default playerService;