import { pgTable, uuid, timestamp, text, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tournament } from './tournament';

export const BracketType = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
  ROUND_ROBIN: 'round_robin'
} as const;

export const bracket = pgTable('bracket', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournament.id, { onDelete: 'cascade' }),
  type: text('type', { enum: Object.values(BracketType) }).notNull().default(BracketType.SINGLE_ELIMINATION),
  structure: jsonb('structure').notNull(), // Stores the bracket tree structure
  teams: jsonb('teams').notNull(), // Array of team IDs and their seeding
  currentRound: integer('current_round').default(1).notNull(),
  totalRounds: integer('total_rounds').notNull(),
  isComplete: boolean('is_complete').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bracketRelations = relations(bracket, ({ one }) => ({
  tournament: one(tournament, {
    fields: [bracket.tournamentId],
    references: [tournament.id],
  }),
}));