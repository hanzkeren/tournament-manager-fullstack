import { eq, and, ilike, desc, asc } from 'drizzle-orm';
import { db } from '../config/database';
import { team, division, user } from '../models';
import { TeamCreate, TeamUpdate } from '../utils/validation';
import logger from '../config/logger';

export interface TeamFilters {
  page?: number;
  limit?: number;
  search?: string;
  divisionId?: string;
  isActive?: boolean;
}

class TeamService {
  async getAllTeams(filters: TeamFilters = {}) {
    try {
      const { page = 1, limit = 10, search, divisionId, isActive } = filters;
      const offset = (page - 1) * limit;

      let query = db
        .select({
          id: team.id,
          name: team.name,
          isActive: team.isActive,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          divisionId: team.divisionId,
          divisionName: division.name,
        })
        .from(team)
        .leftJoin(division, eq(team.divisionId, division.id));

      // Apply filters
      const conditions = [];

      if (search) {
        conditions.push(ilike(team.name, `%${search}%`));
      }

      if (divisionId) {
        conditions.push(eq(team.divisionId, divisionId));
      }

      if (typeof isActive === 'boolean') {
        conditions.push(eq(team.isActive, isActive));
      }

      if (conditions.length > 0) {
        query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
      }

      // Get total count
      const countQuery = db.select({ count: team.id }).from(team);
      if (conditions.length > 0) {
        countQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions));
      }
      const totalResult = await countQuery;
      const total = totalResult.length;

      // Get paginated results
      const teams = await query
        .orderBy(asc(team.name))
        .limit(limit)
        .offset(offset);

      return {
        teams,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getAllTeams:', error);
      throw error;
    }
  }

  async getTeamById(id: string) {
    try {
      const [foundTeam] = await db
        .select({
          id: team.id,
          name: team.name,
          isActive: team.isActive,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          divisionId: team.divisionId,
          divisionName: division.name,
        })
        .from(team)
        .leftJoin(division, eq(team.divisionId, division.id))
        .where(eq(team.id, id))
        .limit(1);

      if (!foundTeam) {
        throw new Error('Team not found');
      }

      return foundTeam;
    } catch (error) {
      logger.error('Error in getTeamById:', error);
      throw error;
    }
  }

  async createTeam(teamData: TeamCreate) {
    try {
      // Verify division exists
      const [divisionExists] = await db
        .select()
        .from(division)
        .where(eq(division.id, teamData.divisionId))
        .limit(1);

      if (!divisionExists) {
        throw new Error('Division not found');
      }

      // Check if team name already exists in the same division
      const [existingTeam] = await db
        .select()
        .from(team)
        .where(and(
          eq(team.name, teamData.name),
          eq(team.divisionId, teamData.divisionId)
        ))
        .limit(1);

      if (existingTeam) {
        throw new Error('Team with this name already exists in this division');
      }

      const [newTeam] = await db
        .insert(team)
        .values(teamData)
        .returning();

      if (!newTeam) {
        throw new Error('Failed to create team');
      }

      logger.info(`New team created: ${newTeam.name} in division ${teamData.divisionId}`);
      return newTeam;
    } catch (error) {
      logger.error('Error in createTeam:', error);
      throw error;
    }
  }

  async updateTeam(id: string, updateData: TeamUpdate) {
    try {
      // Check if team exists
      await this.getTeamById(id);

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
        const [duplicateTeam] = await db
          .select()
          .from(team)
          .where(and(
            eq(team.name, updateData.name),
            eq(team.divisionId, updateData.divisionId || id)
          ))
          .limit(1);

        if (duplicateTeam && duplicateTeam.id !== id) {
          throw new Error('Team name already exists in this division');
        }
      }

      const [updatedTeam] = await db
        .update(team)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(team.id, id))
        .returning();

      if (!updatedTeam) {
        throw new Error('Failed to update team');
      }

      logger.info(`Team updated: ${updatedTeam.name}`);
      return updatedTeam;
    } catch (error) {
      logger.error('Error in updateTeam:', error);
      throw error;
    }
  }

  async deleteTeam(id: string) {
    try {
      // Check if team exists
      const existingTeam = await this.getTeamById(id);

      // Soft delete by deactivating
      const [deactivatedTeam] = await db
        .update(team)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(team.id, id))
        .returning();

      if (!deactivatedTeam) {
        throw new Error('Failed to deactivate team');
      }

      logger.info(`Team deactivated: ${existingTeam.name}`);
      return deactivatedTeam;
    } catch (error) {
      logger.error('Error in deleteTeam:', error);
      throw error;
    }
  }

  async getActiveTeams() {
    try {
      const teams = await db
        .select({
          id: team.id,
          name: team.name,
          isActive: team.isActive,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          divisionId: team.divisionId,
          divisionName: division.name,
        })
        .from(team)
        .leftJoin(division, eq(team.divisionId, division.id))
        .where(eq(team.isActive, true))
        .orderBy(asc(team.name));

      return teams;
    } catch (error) {
      logger.error('Error in getActiveTeams:', error);
      throw error;
    }
  }

  async getTeamsByDivision(divisionId: string) {
    try {
      const teams = await db
        .select({
          id: team.id,
          name: team.name,
          isActive: team.isActive,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          divisionId: team.divisionId,
          divisionName: division.name,
        })
        .from(team)
        .leftJoin(division, eq(team.divisionId, division.id))
        .where(eq(team.divisionId, divisionId))
        .orderBy(asc(team.name));

      return teams;
    } catch (error) {
      logger.error('Error in getTeamsByDivision:', error);
      throw error;
    }
  }

  async getTeamStats() {
    try {
      const totalTeams = await db.select().from(team);
      const activeTeams = await db.select().from(team).where(eq(team.isActive, true));

      const stats = {
        total: totalTeams.length,
        active: activeTeams.length,
        inactive: totalTeams.length - activeTeams.length,
        byDivision: {} as Record<string, number>,
      };

      // Count by division
      for (const team of totalTeams) {
        const divisionKey = team.divisionId;
        stats.byDivision[divisionKey] = (stats.byDivision[divisionKey] || 0) + 1;
      }

      return stats;
    } catch (error) {
      logger.error('Error in getTeamStats:', error);
      throw error;
    }
  }
}

export const teamService = new TeamService();
export default teamService;