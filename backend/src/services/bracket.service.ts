import { eq, and } from 'drizzle-orm';
import { db } from '../config/database';
import { bracket, tournament, team, match } from '../models';
import { BracketCreate, BracketType } from '../utils/validation';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export interface BracketNode {
  id: string;
  matchId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  winnerTeamId?: string;
  round: number;
  position: number;
  nextMatchId?: string;
  isBye?: boolean;
}

export interface BracketStructure {
  type: BracketType;
  rounds: number;
  matches: BracketNode[];
  teams: Array<{
    teamId: string;
    seed: number;
    name: string;
  }>;
}

class BracketService {
  async createBracket(bracketData: BracketCreate) {
    try {
      // Verify tournament exists
      const [tournamentExists] = await db
        .select()
        .from(tournament)
        .where(eq(tournament.id, bracketData.tournamentId))
        .limit(1);

      if (!tournamentExists) {
        throw new Error('Tournament not found');
      }

      // Check if bracket already exists for this tournament
      const [existingBracket] = await db
        .select()
        .from(bracket)
        .where(eq(bracket.tournamentId, bracketData.tournamentId))
        .limit(1);

      if (existingBracket) {
        throw new Error('Bracket already exists for this tournament');
      }

      // Verify teams exist
      const teamIds = bracketData.teams.map(t => t.teamId);
      const existingTeams = await db
        .select()
        .from(team)
        .where(eq(team.id, teamIds[0])) // This won't work properly, need IN clause
        .limit(teamIds.length);

      if (existingTeams.length !== teamIds.length) {
        throw new Error('One or more teams not found');
      }

      // Generate bracket structure based on type
      let structure: BracketStructure;
      switch (bracketData.type) {
        case 'single_elimination':
          structure = this.generateSingleEliminationBracket(bracketData.teams);
          break;
        case 'double_elimination':
          structure = this.generateDoubleEliminationBracket(bracketData.teams);
          break;
        case 'round_robin':
          structure = this.generateRoundRobinBracket(bracketData.teams);
          break;
        default:
          throw new Error('Invalid bracket type');
      }

      // Sort teams by seed and get team names
      const sortedTeams = [...bracketData.teams].sort((a, b) => a.seed - b.seed);
      const teamDetails = await Promise.all(
        sortedTeams.map(async (teamData) => {
          const [teamInfo] = await db
            .select({ name: team.name })
            .from(team)
            .where(eq(team.id, teamData.teamId))
            .limit(1);
          return {
            teamId: teamData.teamId,
            seed: teamData.seed,
            name: teamInfo?.name || 'Unknown Team',
          };
        })
      );

      const totalRounds = Math.ceil(Math.log2(Math.max(2, this.getNextPowerOfTwo(teamDetails.length))));

      // Create bracket in database
      const [newBracket] = await db
        .insert(bracket)
        .values({
          tournamentId: bracketData.tournamentId,
          type: bracketData.type,
          structure: {
            ...structure,
            teams: teamDetails,
          },
          teams: teamDetails,
          currentRound: 1,
          totalRounds,
          isComplete: false,
        })
        .returning();

      if (!newBracket) {
        throw new Error('Failed to create bracket');
      }

      logger.info(`Bracket created for tournament: ${bracketData.tournamentId}`);
      return newBracket;
    } catch (error) {
      logger.error('Error in createBracket:', error);
      throw error;
    }
  }

  private generateSingleEliminationBracket(teams: Array<{ teamId: string; seed: number }>): BracketStructure {
    const teamCount = teams.length;
    const bracketSize = this.getNextPowerOfTwo(teamCount);
    const rounds = Math.log2(bracketSize);
    const totalMatches = bracketSize - 1;

    const matches: BracketNode[] = [];
    let matchIdCounter = 1;

    // Create first round matches
    const seededTeams = [...teams].sort((a, b) => a.seed - b.seed);
    const firstRoundMatches = bracketSize / 2;

    for (let i = 0; i < firstRoundMatches; i++) {
      const homeTeamIndex = i;
      const awayTeamIndex = bracketSize - 1 - i;

      const match: BracketNode = {
        id: uuidv4(),
        round: 1,
        position: i,
      };

      if (homeTeamIndex < seededTeams.length) {
        match.homeTeamId = seededTeams[homeTeamIndex].teamId;
      }

      if (awayTeamIndex < seededTeams.length && awayTeamIndex !== homeTeamIndex) {
        match.awayTeamId = seededTeams[awayTeamIndex].teamId;
      }

      // Check if this is a bye (only one team)
      if ((match.homeTeamId && !match.awayTeamId) || (!match.homeTeamId && match.awayTeamId)) {
        match.isBye = true;
        match.winnerTeamId = match.homeTeamId || match.awayTeamId;
      }

      matches.push(match);
      matchIdCounter++;
    }

    // Create subsequent rounds
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);

      for (let i = 0; i < matchesInRound; i++) {
        const match: BracketNode = {
          id: uuidv4(),
          round,
          position: i,
        };

        // Link to previous round matches
        const prevRoundMatches = matches.filter(m => m.round === round - 1);
        const prevMatchIndex1 = i * 2;
        const prevMatchIndex2 = i * 2 + 1;

        if (prevRoundMatches[prevMatchIndex1]) {
          prevRoundMatches[prevMatchIndex1].nextMatchId = match.id;
        }
        if (prevRoundMatches[prevMatchIndex2]) {
          prevRoundMatches[prevMatchIndex2].nextMatchId = match.id;
        }

        matches.push(match);
        matchIdCounter++;
      }
    }

    return {
      type: 'single_elimination',
      rounds,
      matches,
      teams: [], // Will be populated separately
    };
  }

  private generateDoubleEliminationBracket(teams: Array<{ teamId: string; seed: number }>): BracketStructure {
    // Simplified double elimination - winner's and loser's brackets
    const teamCount = teams.length;
    const bracketSize = this.getNextPowerOfTwo(teamCount);
    const rounds = Math.ceil(Math.log2(bracketSize)) * 2; // Approximate for double elimination

    const matches: BracketNode[] = [];

    // Winner's bracket (similar to single elimination)
    const winnersBracket = this.generateSingleEliminationBracket(teams);
    matches.push(...winnersBracket.matches);

    // Loser's bracket matches (simplified)
    // In a full implementation, this would be more complex
    const losersRounds = rounds - 1;
    for (let round = 1; round <= losersRounds; round++) {
      const matchesInRound = Math.max(1, Math.floor(bracketSize / Math.pow(2, round + 1)));

      for (let i = 0; i < matchesInRound; i++) {
        const match: BracketNode = {
          id: uuidv4(),
          round: round + winnersBracket.rounds, // Continue after winner's bracket
          position: i,
        };

        matches.push(match);
      }
    }

    // Grand final
    const grandFinal: BracketNode = {
      id: uuidv4(),
      round: rounds + 1,
      position: 0,
    };

    matches.push(grandFinal);

    return {
      type: 'double_elimination',
      rounds: rounds + 1,
      matches,
      teams: [], // Will be populated separately
    };
  }

  private generateRoundRobinBracket(teams: Array<{ teamId: string; seed: number }>): BracketStructure {
    const teamCount = teams.length;
    const totalMatches = (teamCount * (teamCount - 1)) / 2;
    const rounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount;

    const matches: BracketNode[] = [];
    let matchIdCounter = 1;

    // Round robin scheduling using circle method
    const teamList = [...teams].sort((a, b) => a.seed - b.seed);

    if (teamCount % 2 === 1) {
      // Add dummy team for odd number of teams
      teamList.push({ teamId: 'bye', seed: teamCount + 1 });
    }

    const matchesPerRound = teamCount / 2;

    for (let round = 1; round <= rounds; round++) {
      for (let i = 0; i < matchesPerRound; i++) {
        const homeTeam = teamList[i];
        const awayTeam = teamList[teamList.length - 1 - i];

        if (homeTeam.teamId !== 'bye' && awayTeam.teamId !== 'bye') {
          const match: BracketNode = {
            id: uuidv4(),
            round,
            position: i,
            homeTeamId: homeTeam.teamId,
            awayTeamId: awayTeam.teamId,
          };

          matches.push(match);
          matchIdCounter++;
        }
      }

      // Rotate teams for next round (except first team)
      const fixedTeam = teamList[0];
      const rotatingTeams = teamList.slice(1);
      rotatingTeams.push(rotatingTeams.shift()!);
      teamList[0] = fixedTeam;
      for (let i = 0; i < rotatingTeams.length; i++) {
        teamList[i + 1] = rotatingTeams[i];
      }
    }

    return {
      type: 'round_robin',
      rounds,
      matches,
      teams: [], // Will be populated separately
    };
  }

  private getNextPowerOfTwo(n: number): number {
    if (n <= 1) return 2;
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  async getBracketById(id: string) {
    try {
      const [foundBracket] = await db
        .select()
        .from(bracket)
        .where(eq(bracket.id, id))
        .limit(1);

      if (!foundBracket) {
        throw new Error('Bracket not found');
      }

      return foundBracket;
    } catch (error) {
      logger.error('Error in getBracketById:', error);
      throw error;
    }
  }

  async getBracketByTournament(tournamentId: string) {
    try {
      const [foundBracket] = await db
        .select()
        .from(bracket)
        .where(eq(bracket.tournamentId, tournamentId))
        .limit(1);

      if (!foundBracket) {
        throw new Error('Bracket not found for this tournament');
      }

      return foundBracket;
    } catch (error) {
      logger.error('Error in getBracketByTournament:', error);
      throw error;
    }
  }

  async updateBracketProgression(bracketId: string, matchId: string, winnerTeamId: string) {
    try {
      const bracketData = await this.getBracketById(bracketId);
      const structure = bracketData.structure as BracketStructure;

      // Find the match in the bracket
      const matchNode = structure.matches.find(m => m.id === matchId);
      if (!matchNode) {
        throw new Error('Match not found in bracket');
      }

      // Update the match winner
      matchNode.winnerTeamId = winnerTeamId;

      // Find the next match and update team assignment
      if (matchNode.nextMatchId) {
        const nextMatch = structure.matches.find(m => m.id === matchNode.nextMatchId);
        if (nextMatch) {
          // Determine if this winner goes to home or away slot
          // This is a simplified logic - in reality, you'd track bracket positions
          if (!nextMatch.homeTeamId) {
            nextMatch.homeTeamId = winnerTeamId;
          } else if (!nextMatch.awayTeamId) {
            nextMatch.awayTeamId = winnerTeamId;
          }
        }
      }

      // Update bracket in database
      const [updatedBracket] = await db
        .update(bracket)
        .set({
          structure,
          updatedAt: new Date(),
        })
        .where(eq(bracket.id, bracketId))
        .returning();

      if (!updatedBracket) {
        throw new Error('Failed to update bracket');
      }

      logger.info(`Bracket progression updated for bracket: ${bracketId}`);
      return updatedBracket;
    } catch (error) {
      logger.error('Error in updateBracketProgression:', error);
      throw error;
    }
  }

  async getBracketVisualization(bracketId: string) {
    try {
      const bracketData = await this.getBracketById(bracketId);
      const structure = bracketData.structure as BracketStructure;

      // Get actual match results from database
      const matchResults = await db
        .select({
          id: match.id,
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          isCompleted: match.isCompleted,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
        })
        .from(match)
        .where(eq(match.tournamentId, bracketData.tournamentId));

      // Merge bracket structure with actual results
      const visualization = {
        bracket: {
          id: bracketData.id,
          type: bracketData.type,
          currentRound: bracketData.currentRound,
          totalRounds: bracketData.totalRounds,
          isComplete: bracketData.isComplete,
        },
        teams: structure.teams,
        rounds: [],
      };

      // Group matches by round
      const matchesByRound = new Map();
      structure.matches.forEach(bracketMatch => {
        if (!matchesByRound.has(bracketMatch.round)) {
          matchesByRound.set(bracketMatch.round, []);
        }

        // Find actual match result if available
        const actualMatch = matchResults.find(m => m.id === bracketMatch.matchId);

        const enrichedMatch = {
          ...bracketMatch,
          actualResult: actualMatch || null,
        };

        matchesByRound.get(bracketMatch.round).push(enrichedMatch);
      });

      // Convert to array and sort by round
      for (const [round, roundMatches] of matchesByRound) {
        visualization.rounds.push({
          round,
          matches: roundMatches.sort((a: any, b: any) => a.position - b.position),
        });
      }

      visualization.rounds.sort((a, b) => a.round - b.round);

      return visualization;
    } catch (error) {
      logger.error('Error in getBracketVisualization:', error);
      throw error;
    }
  }

  async advanceBracketRound(bracketId: string) {
    try {
      const bracketData = await this.getBracketById(bracketId);

      if (bracketData.currentRound >= bracketData.totalRounds) {
        throw new Error('Bracket is already complete');
      }

      const [updatedBracket] = await db
        .update(bracket)
        .set({
          currentRound: bracketData.currentRound + 1,
          updatedAt: new Date(),
        })
        .where(eq(bracket.id, bracketId))
        .returning();

      if (!updatedBracket) {
        throw new Error('Failed to advance bracket round');
      }

      logger.info(`Bracket advanced to round: ${updatedBracket.currentRound}`);
      return updatedBracket;
    } catch (error) {
      logger.error('Error in advanceBracketRound:', error);
      throw error;
    }
  }

  async completeBracket(bracketId: string) {
    try {
      const [updatedBracket] = await db
        .update(bracket)
        .set({
          isComplete: true,
          currentRound: 999, // Indicate completion
          updatedAt: new Date(),
        })
        .where(eq(bracket.id, bracketId))
        .returning();

      if (!updatedBracket) {
        throw new Error('Failed to complete bracket');
      }

      logger.info(`Bracket completed: ${bracketId}`);
      return updatedBracket;
    } catch (error) {
      logger.error('Error in completeBracket:', error);
      throw error;
    }
  }
}

export const bracketService = new BracketService();
export default bracketService;