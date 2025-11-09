import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { user, UserRole } from '../models';
import { UserSignup, UserLogin } from '../utils/validation';
import logger from '../config/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  username: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly JWT_REFRESH_EXPIRES_IN: string;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET!;
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  async signUp(userData: UserSignup): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error('User with this email already exists');
      }

      const existingUsername = await db
        .select()
        .from(user)
        .where(eq(user.username, userData.username))
        .limit(1);

      if (existingUsername.length > 0) {
        throw new Error('Username already taken');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Create user
      const [newUser] = await db
        .insert(user)
        .values({
          username: userData.username,
          email: userData.email,
          passwordHash,
          role: UserRole.USER,
        })
        .returning();

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Generate tokens
      const tokens = this.generateTokens({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        username: newUser.username,
      });

      logger.info(`New user registered: ${newUser.email}`);

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          isActive: newUser.isActive,
        },
        ...tokens,
      };
    } catch (error) {
      logger.error('Error in signUp:', error);
      throw error;
    }
  }

  async signIn(credentials: UserLogin): Promise<AuthResponse> {
    try {
      // Find user
      const [existingUser] = await db
        .select()
        .from(user)
        .where(eq(user.email, credentials.email))
        .limit(1);

      if (!existingUser) {
        throw new Error('Invalid credentials');
      }

      if (!existingUser.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, existingUser.passwordHash);

      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const tokens = this.generateTokens({
        userId: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
        username: existingUser.username,
      });

      logger.info(`User signed in: ${existingUser.email}`);

      return {
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role,
          isActive: existingUser.isActive,
        },
        ...tokens,
      };
    } catch (error) {
      logger.error('Error in signIn:', error);
      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as JWTPayload;

      // Find user
      const [existingUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, decoded.userId))
        .limit(1);

      if (!existingUser || !existingUser.isActive) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = this.generateTokens({
        userId: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
        username: existingUser.username,
      });

      logger.info(`Tokens refreshed for user: ${existingUser.email}`);

      return tokens;
    } catch (error) {
      logger.error('Error in refreshTokens:', error);
      throw new Error('Invalid refresh token');
    }
  }

  private generateTokens(payload: JWTPayload): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      const [existingUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!existingUser) {
        throw new Error('User not found');
      }

      const isValidPassword = await bcrypt.compare(oldPassword, existingUser.passwordHash);

      if (!isValidPassword) {
        throw new Error('Invalid current password');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await db
        .update(user)
        .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
        .where(eq(user.id, userId));

      logger.info(`Password changed for user: ${existingUser.email}`);
    } catch (error) {
      logger.error('Error in changePassword:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
export default authService;