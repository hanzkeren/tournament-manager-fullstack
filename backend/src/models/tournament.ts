import { pgTable, uuid, varchar, date, timestamp, boolean, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user';
import { division } from './division';

export const tournament = pgTable('tournament', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  divisionId: uuid('division_id').notNull().references(() => division.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tournamentRelations = relations(tournament, ({ one, many }) => ({
  division: one(division, {
    fields: [tournament.divisionId],
    references: [division.id],
  }),
  creator: one(user, {
    fields: [tournament.createdBy],
    references: [user.id],
  }),
  matches: many(match),
  brackets: many(bracket),
}));