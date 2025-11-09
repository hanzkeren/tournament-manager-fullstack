import { pgTable, uuid, varchar, timestamp, text, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const UserRole = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user'
} as const;

export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: Object.values(UserRole) }).notNull().default(UserRole.USER),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  tournamentsCreated: many(tournament),
}));