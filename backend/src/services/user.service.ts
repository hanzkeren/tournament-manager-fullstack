import { eq, and, ilike, desc, asc } from 'drizzle-orm';
import { db } from '../config/database';
import { user, UserRole } from '../models';
import { UserUpdate } from '../utils/validation';
import logger from '../config/logger';

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

class UserService {
  async getAllUsers(filters: UserFilters = {}) {
    try {
      const { page = 1, limit = 10, search, role, isActive } = filters;
      const offset = (page - 1) * limit;

      let query = db.select().from(user);

      // Apply filters
      const conditions = [];

      if (search) {
        conditions.push(
          ilike(user.username, `%${search}%`)
        );
      }

      if (role) {
        conditions.push(eq(user.role, role));
      }

      if (typeof isActive === 'boolean') {
        conditions.push(eq(user.isActive, isActive));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Get total count
      const countQuery = db.select({ count: user.id }).from(user);
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      const totalResult = await countQuery;
      const total = totalResult.length;

      // Get paginated results
      const users = await query
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset);

      // Remove password hashes from response
      const usersWithoutPasswords = users.map(({ passwordHash, ...user }) => user);

      return {
        users: usersWithoutPasswords,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  async getUserById(id: string) {
    try {
      const [foundUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, id))
        .limit(1);

      if (!foundUser) {
        throw new Error('User not found');
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = foundUser;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error in getUserById:', error);
      throw error;
    }
  }

  async updateUser(id: string, updateData: UserUpdate) {
    try {
      // Check if user exists
      const existingUser = await this.getUserById(id);

      // Check for duplicate email if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const [duplicateEmail] = await db
          .select()
          .from(user)
          .where(eq(user.email, updateData.email!))
          .limit(1);

        if (duplicateEmail) {
          throw new Error('Email already exists');
        }
      }

      // Check for duplicate username if username is being updated
      if (updateData.username && updateData.username !== existingUser.username) {
        const [duplicateUsername] = await db
          .select()
          .from(user)
          .where(eq(user.username, updateData.username!))
          .limit(1);

        if (duplicateUsername) {
          throw new Error('Username already exists');
        }
      }

      const [updatedUser] = await db
        .update(user)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(user.id, id))
        .returning();

      if (!updatedUser) {
        throw new Error('Failed to update user');
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error in updateUser:', error);
      throw error;
    }
  }

  async deleteUser(id: string) {
    try {
      // Check if user exists
      await this.getUserById(id);

      // Soft delete by deactivating
      const [deactivatedUser] = await db
        .update(user)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(user.id, id))
        .returning();

      if (!deactivatedUser) {
        throw new Error('Failed to deactivate user');
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = deactivatedUser;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error in deleteUser:', error);
      throw error;
    }
  }

  async hardDeleteUser(id: string) {
    try {
      // Check if user exists
      await this.getUserById(id);

      await db.delete(user).where(eq(user.id, id));
      return { message: 'User permanently deleted' };
    } catch (error) {
      logger.error('Error in hardDeleteUser:', error);
      throw error;
    }
  }

  async getUsersByRole(role: string) {
    try {
      const users = await db
        .select()
        .from(user)
        .where(eq(user.role, role))
        .orderBy(asc(user.username));

      // Remove password hashes from response
      return users.map(({ passwordHash, ...user }) => user);
    } catch (error) {
      logger.error('Error in getUsersByRole:', error);
      throw error;
    }
  }

  async getUserStats() {
    try {
      const totalUsers = await db.select().from(user);
      const activeUsers = await db.select().from(user).where(eq(user.isActive, true));
      const admins = await db.select().from(user).where(eq(user.role, UserRole.ADMIN));
      const superAdmins = await db.select().from(user).where(eq(user.role, UserRole.SUPERADMIN));

      return {
        total: totalUsers.length,
        active: activeUsers.length,
        inactive: totalUsers.length - activeUsers.length,
        admins: admins.length,
        superAdmins: superAdmins.length,
        regularUsers: totalUsers.length - admins.length - superAdmins.length,
      };
    } catch (error) {
      logger.error('Error in getUserStats:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;