import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const DivisionType = {
  PRO: 'Pro',
  SOCCER: 'Soccer',
  ROOKIE: 'Rookie'
} as const;

export const division = pgTable('division', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { enum: Object.values(DivisionType) }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const divisionRelations = relations(division, ({ many }) => ({
  tournaments: many(tournament),
  leaderboards: many(leaderboard),
}));