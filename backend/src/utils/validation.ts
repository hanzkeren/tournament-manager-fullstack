import { z } from 'zod';

// User schemas
export const userSignupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const userUpdateSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  role: z.enum(['superadmin', 'admin', 'user']).optional(),
  isActive: z.boolean().optional(),
});

// Tournament schemas
export const tournamentCreateSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(150),
  description: z.string().optional(),
  divisionId: z.string().uuid('Invalid division ID'),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const tournamentUpdateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
  divisionId: z.string().uuid().optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date').optional(),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date').optional(),
  isActive: z.boolean().optional(),
});

// Team schemas
export const teamCreateSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  divisionId: z.string().uuid('Invalid division ID'),
});

export const teamUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  divisionId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

// Player schemas
export const playerCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  teamId: z.string().uuid('Invalid team ID').optional(),
});

export const playerUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  teamId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

// Match schemas
export const matchCreateSchema = z.object({
  homeTeamId: z.string().uuid('Invalid home team ID'),
  awayTeamId: z.string().uuid('Invalid away team ID'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid match date'),
  venue: z.string().max(200).optional(),
  tournamentId: z.string().uuid('Invalid tournament ID').optional(),
}).refine((data) => data.homeTeamId !== data.awayTeamId, {
  message: 'Home and away teams must be different',
  path: ['awayTeamId'],
});

export const matchUpdateSchema = z.object({
  scoreHome: z.number().int().min(0).optional(),
  scoreAway: z.number().int().min(0).optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid match date').optional(),
  venue: z.string().max(200).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  isCompleted: z.boolean().optional(),
});

// Division schemas
export const divisionCreateSchema = z.object({
  name: z.enum(['Pro', 'Soccer', 'Rookie'], 'Invalid division name'),
  description: z.string().max(255).optional(),
});

export const divisionUpdateSchema = z.object({
  name: z.enum(['Pro', 'Soccer', 'Rookie']).optional(),
  description: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

// Bracket schemas
export const bracketCreateSchema = z.object({
  tournamentId: z.string().uuid('Invalid tournament ID'),
  type: z.enum(['single_elimination', 'double_elimination', 'round_robin']),
  teams: z.array(z.object({
    teamId: z.string().uuid(),
    seed: z.number().int().min(1),
  })),
});

export const matchResultSchema = z.object({
  scoreHome: z.number().int().min(0),
  scoreAway: z.number().int().min(0),
  status: z.enum(['completed']).default('completed'),
});

export type UserSignup = z.infer<typeof userSignupSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type TournamentCreate = z.infer<typeof tournamentCreateSchema>;
export type TournamentUpdate = z.infer<typeof tournamentUpdateSchema>;
export type TeamCreate = z.infer<typeof teamCreateSchema>;
export type TeamUpdate = z.infer<typeof teamUpdateSchema>;
export type PlayerCreate = z.infer<typeof playerCreateSchema>;
export type PlayerUpdate = z.infer<typeof playerUpdateSchema>;
export type MatchCreate = z.infer<typeof matchCreateSchema>;
export type MatchUpdate = z.infer<typeof matchUpdateSchema>;
export type DivisionCreate = z.infer<typeof divisionCreateSchema>;
export type DivisionUpdate = z.infer<typeof divisionUpdateSchema>;
export type BracketCreate = z.infer<typeof bracketCreateSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;