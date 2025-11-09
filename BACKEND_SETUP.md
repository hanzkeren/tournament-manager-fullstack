# Backend API Setup Instructions

This document provides instructions for setting up and running the Tournament Manager backend API.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Configure the environment variables:**
   Edit the `.env` file with your configuration:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/tournament_db

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d

   # Server
   PORT=3001
   NODE_ENV=development

   # CORS
   FRONTEND_URL=http://localhost:3000

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # Logging
   LOG_LEVEL=info
   ```

## Database Setup

1. **Create the database:**
   ```sql
   CREATE DATABASE tournament_db;
   ```

2. **Generate database migrations:**
   ```bash
   npm run db:generate
   ```

3. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

   Alternatively, you can push the schema directly:
   ```bash
   npm run db:push
   ```

## Running the Application

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Production Mode

```bash
npm run build
npm start
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio for database management
- `npm test` - Run tests
- `npm run lint` - Run linting
- `npm run lint:fix` - Fix linting issues

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints

- `POST /auth/signup` - Create a new user account
- `POST /auth/login` - Sign in with email and password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Sign out
- `GET /auth/me` - Get current user info

### Tournament Management Endpoints

- `GET /tournaments` - Get all tournaments
- `GET /tournaments/:id` - Get tournament by ID
- `POST /tournaments` - Create new tournament (admin only)
- `PUT /tournaments/:id` - Update tournament (admin only)
- `DELETE /tournaments/:id` - Deactivate tournament (admin only)

### Team Management Endpoints

- `GET /teams` - Get all teams
- `GET /teams/:id` - Get team by ID
- `POST /teams` - Create new team (admin only)
- `PUT /teams/:id` - Update team (admin only)
- `DELETE /teams/:id` - Deactivate team (admin only)

### Match Management Endpoints

- `GET /matches` - Get all matches
- `GET /matches/:id` - Get match by ID
- `POST /matches` - Create new match (admin only)
- `PUT /matches/:id` - Update match (admin only)
- `POST /matches/:id/result` - Record match result (admin only)

### Leaderboard Endpoints

- `GET /leaderboard/division/:divisionId` - Get division leaderboard
- `GET /leaderboard/all` - Get all division leaderboards
- `POST /leaderboard/division/:divisionId/update` - Update leaderboard (admin only)

### Bracket Management Endpoints

- `POST /brackets/generate` - Generate tournament bracket (admin only)
- `GET /brackets/:id` - Get bracket by ID
- `GET /brackets/:id/visualization` - Get bracket visualization
- `PUT /brackets/:id/progression/:matchId` - Update bracket progression (admin only)

## User Roles

- **superadmin**: Full access to all endpoints and user management
- **admin**: Access to tournament, team, player, and match management
- **user**: Read-only access to public data (leaderboards, brackets, etc.)

## Default Superadmin Setup

After setting up the database, you can create a superadmin account by:

1. Sign up for a regular account through the API
2. Manually update the user role in the database:
   ```sql
   UPDATE "user" SET role = 'superadmin' WHERE email = 'your-email@example.com';
   ```

## Security Features

- JWT-based authentication with access and refresh tokens
- Role-based access control
- Rate limiting
- CORS protection
- Input validation with Zod schemas
- Password hashing with bcrypt
- Request logging with Winston

## Error Handling

The API uses a standardized JSend response format:

```json
{
  "status": "success" | "fail" | "error",
  "data": {},
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Monitoring and Logging

- Structured logging with Winston
- Request/response logging
- Error tracking
- Health check endpoint at `/health`

## Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a strong, randomly generated `JWT_SECRET`
3. Configure proper database connection
4. Set up SSL/TLS for HTTPS
5. Configure reverse proxy (nginx/Apache)
6. Set up process management (PM2/systemd)
7. Configure monitoring and alerting