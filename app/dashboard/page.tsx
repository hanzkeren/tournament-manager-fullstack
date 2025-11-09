"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, Calendar, TrendingUp, Plus, Eye, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient, Division, Tournament, Team, Player, Match, LeaderboardData } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalDivisions: 0,
    activeTournaments: 0,
    totalTeams: 0,
    totalPlayers: 0,
  });
  const [recentTournaments, setRecentTournaments] = useState<Tournament[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load data in parallel
      const [divisionsResponse, tournamentsResponse, teamsResponse, playersResponse, matchesResponse, leaderboardsResponse] = await Promise.all([
        apiClient.getActiveDivisions(),
        apiClient.getActiveTournaments(),
        apiClient.getActiveTeams(),
        apiClient.getPlayers(),
        apiClient.getMatches({ isCompleted: false, limit: 5 }),
        apiClient.getAllLeaderboards(),
      ]);

      setStats({
        totalDivisions: divisionsResponse.length,
        activeTournaments: tournamentsResponse.length,
        totalTeams: teamsResponse.length,
        totalPlayers: playersResponse.players.length,
      });

      setRecentTournaments(tournamentsResponse.slice(0, 5));
      setUpcomingMatches(matchesResponse.matches);
      setLeaderboards(leaderboardsResponse);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/sign-in');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Please sign in to view the dashboard.</p>
          <Button className="mt-4" onClick={() => router.push('/sign-in')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user.username}!
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getRoleBadgeColor(user.role)}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleLogout} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Divisions</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDivisions}</div>
            <p className="text-xs text-muted-foreground">
              Active divisions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tournaments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTournaments}</div>
            <p className="text-xs text-muted-foreground">
              Active tournaments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
            <p className="text-xs text-muted-foreground">
              Registered teams
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Players</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlayers}</div>
            <p className="text-xs text-muted-foreground">
              Total players
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tournaments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="tournaments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Tournaments</CardTitle>
                  <CardDescription>
                    Latest tournaments created in the system
                  </CardDescription>
                </div>
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <Button asChild>
                    <Link href="/tournaments/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Tournament
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTournaments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tournaments found.
                  </p>
                ) : (
                  recentTournaments.map((tournament) => (
                    <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{tournament.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {tournament.divisionName} • {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={tournament.isActive ? 'default' : 'secondary'}>
                          {tournament.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/tournaments/${tournament.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Matches</CardTitle>
              <CardDescription>
                Next scheduled matches across all tournaments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingMatches.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No upcoming matches found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teams</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingMatches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {match.homeTeamName} vs {match.awayTeamName}
                            </p>
                            {match.venue && (
                              <p className="text-sm text-muted-foreground">{match.venue}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(match.date).toLocaleDateString()}
                          <br />
                          {new Date(match.date).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>{match.tournamentName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{match.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {(user.role === 'admin' || user.role === 'superadmin') && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/matches/${match.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Division Leaderboards</CardTitle>
              <CardDescription>
                Current standings across all divisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {leaderboards.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No leaderboards available.
                  </p>
                ) : (
                  leaderboards.map((leaderboard) => (
                    <div key={leaderboard.divisionId} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{leaderboard.divisionName}</h3>
                        <Badge variant="outline">
                          Last updated: {new Date(leaderboard.lastUpdated).toLocaleString()}
                        </Badge>
                      </div>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Pos</TableHead>
                              <TableHead>Team</TableHead>
                              <TableHead className="text-right">P</TableHead>
                              <TableHead className="text-right">W</TableHead>
                              <TableHead className="text-right">D</TableHead>
                              <TableHead className="text-right">L</TableHead>
                              <TableHead className="text-right">GD</TableHead>
                              <TableHead className="text-right">Pts</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leaderboard.standings.slice(0, 5).map((team) => (
                              <TableRow key={team.teamId}>
                                <TableCell className="font-medium">{team.rank}</TableCell>
                                <TableCell>{team.teamName}</TableCell>
                                <TableCell className="text-right">{team.matchesPlayed}</TableCell>
                                <TableCell className="text-right">{team.wins}</TableCell>
                                <TableCell className="text-right">{team.draws}</TableCell>
                                <TableCell className="text-right">{team.losses}</TableCell>
                                <TableCell className="text-right">{team.goalDifference}</TableCell>
                                <TableCell className="font-bold text-right">{team.points}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="text-center">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/leaderboard/${leaderboard.divisionId}`}>
                            View Full Leaderboard
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teams Overview</CardTitle>
                  <CardDescription>
                    Registered teams across all divisions
                  </CardDescription>
                </div>
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <Button asChild>
                    <Link href="/teams/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Team
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Team management interface coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}