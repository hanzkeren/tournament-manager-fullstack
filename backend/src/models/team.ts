import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { division } from './division';

export const team = pgTable('team', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  divisionId: uuid('division_id').notNull().references(() => division.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const teamRelations = relations(team, ({ one, many }) => ({
  division: one(division, {
    fields: [team.divisionId],
    references: [division.id],
  }),
  homeMatches: many(match, { relation: 'homeTeam' }),
  awayMatches: many(match, { relation: 'awayTeam' }),
}));