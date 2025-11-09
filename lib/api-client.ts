// API Client for Backend Integration

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T = any> {
  status: 'success' | 'fail' | 'error';
  data?: T;
  message?: string;
  code?: string;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Division {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  divisionId: string;
  divisionName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  teamId?: string;
  teamName?: string;
  divisionId?: string;
  divisionName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  divisionId: string;
  divisionName?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy: string;
  creatorUsername?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName?: string;
  awayTeamName?: string;
  scoreHome: number;
  scoreAway: number;
  date: string;
  venue?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  isCompleted: boolean;
  tournamentId?: string;
  tournamentName?: string;
  createdAt: string;
  updatedAt: string;
}

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
    date: string;
  }>;
}

export interface LeaderboardData {
  divisionId: string;
  divisionName: string;
  lastUpdated: string;
  standings: TeamStanding[];
  topScorers?: Array<{
    teamId: string;
    teamName: string;
    goals: number;
  }>;
}

class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  private saveTokensToStorage(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  private clearTokensFromStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    this.accessToken = null;
    this.refreshToken = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.data) {
      this.saveTokensToStorage(response.data.accessToken, response.data.refreshToken);
    }

    return response.data!;
  }

  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.data) {
      this.saveTokensToStorage(response.data.accessToken, response.data.refreshToken);
    }

    return response.data!;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokensFromStorage();
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<User>('/auth/me');
    return response.data!;
  }

  async refreshTokens(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (response.data) {
      this.saveTokensToStorage(response.data.accessToken, response.data.refreshToken);
    }
  }

  // Division methods
  async getDivisions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{ divisions: Division[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/divisions${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.request<Division[]>(endpoint);

    return {
      divisions: response.data || [],
      pagination: response.meta?.pagination,
    };
  }

  async getActiveDivisions(): Promise<Division[]> {
    const response = await this.request<Division[]>('/divisions/active');
    return response.data || [];
  }

  async getDivision(id: string): Promise<Division> {
    const response = await this.request<Division>(`/divisions/${id}`);
    return response.data!;
  }

  // Team methods
  async getTeams(params?: {
    page?: number;
    limit?: number;
    search?: string;
    divisionId?: string;
    isActive?: boolean;
  }): Promise<{ teams: Team[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/teams${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.request<Team[]>(endpoint);

    return {
      teams: response.data || [],
      pagination: response.meta?.pagination,
    };
  }

  async getActiveTeams(): Promise<Team[]> {
    const response = await this.request<Team[]>('/teams/active');
    return response.data || [];
  }

  async getTeamsByDivision(divisionId: string): Promise<Team[]> {
    const response = await this.request<Team[]>(`/teams/division/${divisionId}`);
    return response.data || [];
  }

  // Player methods
  async getPlayers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    teamId?: string;
    isActive?: boolean;
  }): Promise<{ players: Player[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/players${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.request<Player[]>(endpoint);

    return {
      players: response.data || [],
      pagination: response.meta?.pagination,
    };
  }

  async getPlayersByTeam(teamId: string): Promise<Player[]> {
    const response = await this.request<Player[]>(`/players/team/${teamId}`);
    return response.data || [];
  }

  // Tournament methods
  async getTournaments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    divisionId?: string;
    isActive?: boolean;
  }): Promise<{ tournaments: Tournament[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/tournaments${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.request<Tournament[]>(endpoint);

    return {
      tournaments: response.data || [],
      pagination: response.meta?.pagination,
    };
  }

  async getActiveTournaments(): Promise<Tournament[]> {
    const response = await this.request<Tournament[]>('/tournaments/active');
    return response.data || [];
  }

  async getTournamentsByDivision(divisionId: string): Promise<Tournament[]> {
    const response = await this.request<Tournament[]>(`/tournaments/division/${divisionId}`);
    return response.data || [];
  }

  // Match methods
  async getMatches(params?: {
    page?: number;
    limit?: number;
    teamId?: string;
    tournamentId?: string;
    status?: string;
    isCompleted?: boolean;
  }): Promise<{ matches: Match[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/matches${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.request<Match[]>(endpoint);

    return {
      matches: response.data || [],
      pagination: response.meta?.pagination,
    };
  }

  async recordMatchResult(matchId: string, result: {
    scoreHome: number;
    scoreAway: number;
    status: 'completed';
  }): Promise<Match> {
    const response = await this.request<Match>(`/matches/${matchId}/result`, {
      method: 'POST',
      body: JSON.stringify(result),
    });
    return response.data!;
  }

  // Leaderboard methods
  async getLeaderboardByDivision(divisionId: string): Promise<LeaderboardData> {
    const response = await this.request<LeaderboardData>(`/leaderboard/division/${divisionId}`);
    return response.data!;
  }

  async getAllLeaderboards(): Promise<LeaderboardData[]> {
    const response = await this.request<LeaderboardData[]>('/leaderboard/all');
    return response.data || [];
  }

  // Utility method to check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Get current user role
  getCurrentUserRole(): string | null {
    // In a real implementation, you'd decode the JWT token
    // For now, return null and let the component fetch from /auth/me
    return null;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;