import { eq, ilike, desc, asc } from 'drizzle-orm';
import { db } from '../config/database';
import { division, DivisionType } from '../models';
import { DivisionCreate, DivisionUpdate } from '../utils/validation';
import logger from '../config/logger';

export interface DivisionFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

class DivisionService {
  async getAllDivisions(filters: DivisionFilters = {}) {
    try {
      const { page = 1, limit = 10, search, isActive } = filters;
      const offset = (page - 1) * limit;

      let query = db.select().from(division);

      // Apply filters
      const conditions = [];

      if (search) {
        conditions.push(
          ilike(division.name, `%${search}%`)
        );
      }

      if (typeof isActive === 'boolean') {
        conditions.push(eq(division.isActive, isActive));
      }

      if (conditions.length > 0) {
        query = query.where(conditions[0]); // Only one condition for now
      }

      // Get total count
      const countQuery = db.select({ count: division.id }).from(division);
      if (conditions.length > 0) {
        countQuery.where(conditions[0]);
      }
      const totalResult = await countQuery;
      const total = totalResult.length;

      // Get paginated results
      const divisions = await query
        .orderBy(asc(division.name))
        .limit(limit)
        .offset(offset);

      return {
        divisions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getAllDivisions:', error);
      throw error;
    }
  }

  async getDivisionById(id: string) {
    try {
      const [foundDivision] = await db
        .select()
        .from(division)
        .where(eq(division.id, id))
        .limit(1);

      if (!foundDivision) {
        throw new Error('Division not found');
      }

      return foundDivision;
    } catch (error) {
      logger.error('Error in getDivisionById:', error);
      throw error;
    }
  }

  async createDivision(divisionData: DivisionCreate) {
    try {
      // Check if division name already exists
      const [existingDivision] = await db
        .select()
        .from(division)
        .where(eq(division.name, divisionData.name))
        .limit(1);

      if (existingDivision) {
        throw new Error('Division with this name already exists');
      }

      const [newDivision] = await db
        .insert(division)
        .values(divisionData)
        .returning();

      if (!newDivision) {
        throw new Error('Failed to create division');
      }

      logger.info(`New division created: ${newDivision.name}`);
      return newDivision;
    } catch (error) {
      logger.error('Error in createDivision:', error);
      throw error;
    }
  }

  async updateDivision(id: string, updateData: DivisionUpdate) {
    try {
      // Check if division exists
      await this.getDivisionById(id);

      // Check for duplicate name if name is being updated
      if (updateData.name) {
        const [duplicateDivision] = await db
          .select()
          .from(division)
          .where(eq(division.name, updateData.name))
          .limit(1);

        if (duplicateDivision && duplicateDivision.id !== id) {
          throw new Error('Division name already exists');
        }
      }

      const [updatedDivision] = await db
        .update(division)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(division.id, id))
        .returning();

      if (!updatedDivision) {
        throw new Error('Failed to update division');
      }

      logger.info(`Division updated: ${updatedDivision.name}`);
      return updatedDivision;
    } catch (error) {
      logger.error('Error in updateDivision:', error);
      throw error;
    }
  }

  async deleteDivision(id: string) {
    try {
      // Check if division exists
      const existingDivision = await this.getDivisionById(id);

      // Soft delete by deactivating
      const [deactivatedDivision] = await db
        .update(division)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(division.id, id))
        .returning();

      if (!deactivatedDivision) {
        throw new Error('Failed to deactivate division');
      }

      logger.info(`Division deactivated: ${existingDivision.name}`);
      return deactivatedDivision;
    } catch (error) {
      logger.error('Error in deleteDivision:', error);
      throw error;
    }
  }

  async getActiveDivisions() {
    try {
      const divisions = await db
        .select()
        .from(division)
        .where(eq(division.isActive, true))
        .orderBy(asc(division.name));

      return divisions;
    } catch (error) {
      logger.error('Error in getActiveDivisions:', error);
      throw error;
    }
  }

  async getDivisionStats() {
    try {
      const totalDivisions = await db.select().from(division);
      const activeDivisions = await db.select().from(division).where(eq(division.isActive, true));

      const stats = {
        total: totalDivisions.length,
        active: activeDivisions.length,
        inactive: totalDivisions.length - activeDivisions.length,
        byType: {} as Record<string, number>,
      };

      // Count by type
      for (const division of totalDivisions) {
        stats.byType[division.name] = (stats.byType[division.name] || 0) + 1;
      }

      return stats;
    } catch (error) {
      logger.error('Error in getDivisionStats:', error);
      throw error;
    }
  }

  async getDivisionByName(name: string) {
    try {
      const [foundDivision] = await db
        .select()
        .from(division)
        .where(eq(division.name, name as any))
        .limit(1);

      if (!foundDivision) {
        throw new Error('Division not found');
      }

      return foundDivision;
    } catch (error) {
      logger.error('Error in getDivisionByName:', error);
      throw error;
    }
  }
}

export const divisionService = new DivisionService();
export default divisionService;