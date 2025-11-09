import { pgTable, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { division } from './division';

export const leaderboard = pgTable('leaderboard', {
  id: uuid('id').primaryKey().defaultRandom(),
  divisionId: uuid('division_id').notNull().references(() => division.id, { onDelete: 'cascade' }),
  standings: jsonb('standings').notNull(), // JSON object with rankings, points, goals, etc.
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const leaderboardRelations = relations(leaderboard, ({ one }) => ({
  division: one(division, {
    fields: [leaderboard.divisionId],
    references: [division.id],
  }),
}));