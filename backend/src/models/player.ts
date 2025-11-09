import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { team } from './team';

export const player = pgTable('player', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  email: varchar('email', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  teamId: uuid('team_id').references(() => team.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const playerRelations = relations(player, ({ one }) => ({
  team: one(team, {
    fields: [player.teamId],
    references: [team.id],
  }),
}));