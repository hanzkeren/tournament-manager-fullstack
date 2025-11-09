import { pgTable, uuid, varchar, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tournament } from './tournament';
import { team } from './team';

export const match = pgTable('match', {
  id: uuid('id').primaryKey().defaultRandom(),
  homeTeamId: uuid('home_team_id').notNull().references(() => team.id, { onDelete: 'cascade' }),
  awayTeamId: uuid('away_team_id').notNull().references(() => team.id, { onDelete: 'cascade' }),
  scoreHome: integer('score_home').default(0).notNull(),
  scoreAway: integer('score_away').default(0).notNull(),
  date: timestamp('date').notNull(),
  venue: varchar('venue', { length: 200 }),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(), // scheduled, in_progress, completed, cancelled
  tournamentId: uuid('tournament_id').references(() => tournament.id, { onDelete: 'cascade' }),
  isCompleted: boolean('is_completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const matchRelations = relations(match, ({ one }) => ({
  tournament: one(tournament, {
    fields: [match.tournamentId],
    references: [tournament.id],
  }),
  homeTeam: one(team, {
    fields: [match.homeTeamId],
    references: [team.id],
    relation: 'homeTeam',
  }),
  awayTeam: one(team, {
    fields: [match.awayTeamId],
    references: [team.id],
    relation: 'awayTeam',
  }),
}));