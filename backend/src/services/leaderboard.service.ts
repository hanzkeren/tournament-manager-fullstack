import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { db } from '../config/database';
import { leaderboard, division, team, match, tournament } from '../models';
import logger from '../config/logger';
import cron from 'node-cron';

export interface TeamStanding {
  teamId: string;
  teamName: string;
  divisionId: string;
  divisionName: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;
  form: Array<{
    result: 'W' | 'D' | 'L';
    goalsFor: number;
    goalsAgainst: number;
    opponent: string;
    date: Date;
  }>;
}

export interface LeaderboardData {
  divisionId: string;
  divisionName: string;
  lastUpdated: Date;
  standings: TeamStanding[];
  topScorers?: Array<{
    teamId: string;
    teamName: string;
    goals: number;
  }>;
}

class LeaderboardService {
  private static instance: LeaderboardService;
  private isUpdating = false;

  constructor() {
    this.initializeCronJob();
  }

  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  private initializeCronJob() {
    // Run every 5 minutes to ensure data consistency
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Running scheduled leaderboard update');
        await this.updateAllLeaderboards();
      } catch (error) {
        logger.error('Error in scheduled leaderboard update:', error);
      }
    });

    logger.info('Leaderboard cron job initialized (every 5 minutes)');
  }

  async calculateDivisionLeaderboard(divisionId: string): Promise<LeaderboardData> {
    try {
      // Get division info
      const [divisionInfo] = await db
        .select()
        .from(division)
        .where(eq(division.id, divisionId))
        .limit(1);

      if (!divisionInfo) {
        throw new Error('Division not found');
      }

      // Get all teams in the division
      const teams = await db
        .select({
          id: team.id,
          name: team.name,
        })
        .from(team)
        .where(eq(team.divisionId, divisionId));

      // Get all completed matches for teams in this division
      const teamIds = teams.map(t => t.id);
      const matches = await db
        .select({
          id: match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          date: match.date,
          isCompleted: match.isCompleted,
          homeTeamName: team.name, // This will be home team name
          awayTeamName: team.name, // This will be away team name
        })
        .from(match)
        .leftJoin(team, eq(match.homeTeamId, team.id))
        .where(and(
          eq(match.isCompleted, true),
          // We need to check both home and away team IDs are in our division
        ));

      // Filter matches to only include teams from this division
      const divisionMatches = matches.filter(match =>
        teamIds.includes(match.homeTeamId) && teamIds.includes(match.awayTeamId)
      );

      // Calculate standings for each team
      const standings: TeamStanding[] = teams.map(team => {
        const teamMatches = divisionMatches.filter(
          match => match.homeTeamId === team.id || match.awayTeamId === team.id
        );

        let wins = 0, draws = 0, losses = 0;
        let goalsFor = 0, goalsAgainst = 0;
        const form: TeamStanding['form'] = [];

        // Sort matches by date (most recent last) for form calculation
        const sortedMatches = teamMatches.sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        sortedMatches.slice(-5).forEach(match => {
          const isHome = match.homeTeamId === team.id;
          const teamScore = isHome ? match.scoreHome : match.scoreAway;
          const opponentScore = isHome ? match.scoreAway : match.scoreHome;
          const opponentName = isHome ? match.awayTeamName : match.homeTeamName;

          goalsFor += teamScore;
          goalsAgainst += opponentScore;

          let result: 'W' | 'D' | 'L';
          if (teamScore > opponentScore) {
            wins++;
            result = 'W';
          } else if (teamScore === opponentScore) {
            draws++;
            result = 'D';
          } else {
            losses++;
            result = 'L';
          }

          form.push({
            result,
            goalsFor: teamScore,
            goalsAgainst: opponentScore,
            opponent: opponentName || 'Unknown',
            date: new Date(match.date),
          });
        });

        const points = wins * 3 + draws * 1;
        const goalDifference = goalsFor - goalsAgainst;

        return {
          teamId: team.id,
          teamName: team.name,
          divisionId,
          divisionName: divisionInfo.name,
          matchesPlayed: teamMatches.length,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          goalDifference,
          points,
          rank: 0, // Will be calculated after sorting
          form: form.reverse(), // Most recent first
        };
      });

      // Sort standings and assign ranks
      this.sortStandings(standings);

      // Calculate top scorers (teams with most goals)
      const topScorers = standings
        .map(standing => ({
          teamId: standing.teamId,
          teamName: standing.teamName,
          goals: standing.goalsFor,
        }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 5);

      return {
        divisionId,
        divisionName: divisionInfo.name,
        lastUpdated: new Date(),
        standings,
        topScorers,
      };
    } catch (error) {
      logger.error('Error in calculateDivisionLeaderboard:', error);
      throw error;
    }
  }

  private sortStandings(standings: TeamStanding[]) {
    // Sort by:
    // 1. Points (descending)
    // 2. Goal difference (descending)
    // 3. Goals scored (descending)
    // 4. Head-to-head (simplified - would need more complex logic for full implementation)
    standings.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }
      // Simplified head-to-head: compare names as fallback
      return a.teamName.localeCompare(b.teamName);
    });

    // Assign ranks
    let currentRank = 1;
    standings.forEach((standing, index) => {
      if (index > 0) {
        const prevStanding = standings[index - 1];
        if (
          standing.points !== prevStanding.points ||
          standing.goalDifference !== prevStanding.goalDifference ||
          standing.goalsFor !== prevStanding.goalsFor
        ) {
          currentRank = index + 1;
        }
      }
      standing.rank = currentRank;
    });
  }

  async updateLeaderboard(divisionId: string) {
    try {
      const leaderboardData = await this.calculateDivisionLeaderboard(divisionId);

      // Check if leaderboard exists for this division
      const [existingLeaderboard] = await db
        .select()
        .from(leaderboard)
        .where(eq(leaderboard.divisionId, divisionId))
        .limit(1);

      if (existingLeaderboard) {
        // Update existing leaderboard
        const [updatedLeaderboard] = await db
          .update(leaderboard)
          .set({
            standings: leaderboardData,
            lastUpdated: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(leaderboard.id, existingLeaderboard.id))
          .returning();

        logger.info(`Leaderboard updated for division: ${divisionId}`);
        return updatedLeaderboard;
      } else {
        // Create new leaderboard
        const [newLeaderboard] = await db
          .insert(leaderboard)
          .values({
            divisionId,
            standings: leaderboardData,
            lastUpdated: new Date(),
          })
          .returning();

        logger.info(`Leaderboard created for division: ${divisionId}`);
        return newLeaderboard;
      }
    } catch (error) {
      logger.error('Error in updateLeaderboard:', error);
      throw error;
    }
  }

  async updateAllLeaderboards() {
    if (this.isUpdating) {
      logger.warn('Leaderboard update already in progress, skipping');
      return;
    }

    this.isUpdating = true;
    try {
      const divisions = await db.select().from(division);

      logger.info(`Updating leaderboards for ${divisions.length} divisions`);

      await Promise.all(
        divisions.map(async (division) => {
          try {
            await this.updateLeaderboard(division.id);
          } catch (error) {
            logger.error(`Failed to update leaderboard for division ${division.id}:`, error);
          }
        })
      );

      logger.info('All leaderboards updated successfully');
    } catch (error) {
      logger.error('Error in updateAllLeaderboards:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  async getLeaderboardByDivision(divisionId: string) {
    try {
      const [foundLeaderboard] = await db
        .select()
        .from(leaderboard)
        .where(eq(leaderboard.divisionId, divisionId))
        .limit(1);

      if (!foundLeaderboard) {
        // Generate real-time leaderboard if no cached version exists
        logger.info(`No cached leaderboard found for division ${divisionId}, generating real-time`);
        return await this.calculateDivisionLeaderboard(divisionId);
      }

      return foundLeaderboard.standings as LeaderboardData;
    } catch (error) {
      logger.error('Error in getLeaderboardByDivision:', error);
      throw error;
    }
  }

  async getAllLeaderboards() {
    try {
      const divisions = await db.select().from(division);

      const leaderboards = await Promise.all(
        divisions.map(async (division) => {
          try {
            const leaderboardData = await this.getLeaderboardByDivision(division.id);
            return {
              divisionId: division.id,
              divisionName: division.name,
              ...leaderboardData,
            };
          } catch (error) {
            logger.error(`Failed to get leaderboard for division ${division.id}:`, error);
            return null;
          }
        })
      );

      return leaderboards.filter(Boolean); // Remove null entries
    } catch (error) {
      logger.error('Error in getAllLeaderboards:', error);
      throw error;
    }
  }

  // Event-driven update triggered after match completion
  async triggerLeaderboardUpdate(divisionId: string) {
    try {
      logger.info(`Triggering leaderboard update for division: ${divisionId}`);
      await this.updateLeaderboard(divisionId);
    } catch (error) {
      logger.error('Error in triggerLeaderboardUpdate:', error);
      // Don't throw error here to avoid disrupting match result recording
    }
  }

  async getTeamStandings(teamId: string) {
    try {
      // Get team's division
      const [teamInfo] = await db
        .select({ divisionId: team.divisionId })
        .from(team)
        .where(eq(team.id, teamId))
        .limit(1);

      if (!teamInfo) {
        throw new Error('Team not found');
      }

      const leaderboardData = await this.getLeaderboardByDivision(teamInfo.divisionId);
      const teamStanding = leaderboardData.standings.find(
        standing => standing.teamId === teamId
      );

      if (!teamStanding) {
        throw new Error('Team standings not found');
      }

      return teamStanding;
    } catch (error) {
      logger.error('Error in getTeamStandings:', error);
      throw error;
    }
  }

  async getDivisionStats(divisionId: string) {
    try {
      const leaderboardData = await this.getLeaderboardByDivision(divisionId);
      const standings = leaderboardData.standings;

      const totalMatches = standings.reduce((sum, team) => sum + team.matchesPlayed, 0);
      const totalGoals = standings.reduce((sum, team) => sum + team.goalsFor + team.goalsAgainst, 0);
      const totalPoints = standings.reduce((sum, team) => sum + team.points, 0);

      return {
        totalTeams: standings.length,
        totalMatches: totalMatches / 2, // Each match involves 2 teams
        totalGoals,
        totalPoints,
        averageGoalsPerMatch: totalMatches > 0 ? totalGoals / totalMatches : 0,
        averagePointsPerTeam: standings.length > 0 ? totalPoints / standings.length : 0,
        topTeam: standings[0] || null,
        bottomTeam: standings[standings.length - 1] || null,
      };
    } catch (error) {
      logger.error('Error in getDivisionStats:', error);
      throw error;
    }
  }

  // Historical data methods for tournament progression
  async createLeaderboardSnapshot(divisionId: string, tournamentId?: string) {
    try {
      const leaderboardData = await this.calculateDivisionLeaderboard(divisionId);

      // This would typically store in a separate historical table
      // For now, we'll just return the snapshot data
      const snapshot = {
        id: `snapshot_${Date.now()}_${divisionId}`,
        divisionId,
        tournamentId,
        timestamp: new Date(),
        standings: leaderboardData.standings,
      };

      logger.info(`Leaderboard snapshot created for division: ${divisionId}`);
      return snapshot;
    } catch (error) {
      logger.error('Error in createLeaderboardSnapshot:', error);
      throw error;
    }
  }

  async getLeaderboardHistory(divisionId: string, limit: number = 10) {
    // This would typically query a historical snapshots table
    // For now, return current standings as there's no historical storage
    try {
      const currentStandings = await this.getLeaderboardByDivision(divisionId);
      return [{
        id: `current_${Date.now()}`,
        divisionId,
        timestamp: new Date(),
        standings: currentStandings.standings,
      }];
    } catch (error) {
      logger.error('Error in getLeaderboardHistory:', error);
      throw error;
    }
  }
}

export const leaderboardService = LeaderboardService.getInstance();
export default leaderboardService;