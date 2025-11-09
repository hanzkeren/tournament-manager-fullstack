# Backend Structure Document for Tournament Management Platform

## 1. Backend Architecture

We are building a standalone Node.js/Express backend that serves a React/Next.js Admin Dashboard. The design follows a layered, service-oriented pattern to keep concerns separated and make the code easy to understand and extend.

- **Framework and Language**: Node.js with Express.js, written in TypeScript for type safety.
- **Layered Structure**:
  - **Routes**: Define URL endpoints and map them to controller methods.
  - **Controllers**: Handle HTTP requests, invoke services, and send responses in JSend format.
  - **Services**: Contain business logic (e.g., TournamentService, LeaderboardService, BracketService).
  - **Data Access (Repositories)**: Use Drizzle ORM to talk to PostgreSQL, abstracting raw SQL.
  - **Middleware**: Handle cross-cutting concerns (authentication, role checks, error handling, request validation).

How it supports scalability, maintainability, and performance:
- **Stateless Design**: Each instance can scale horizontally behind a load balancer.
- **Type Safety**: TypeScript plus Drizzle ORM prevents many bugs at compile time.
- **Clear Separation of Concerns**: New features go into their own service/controller files without cluttering unrelated code.
- **Modular Middleware**: Easy to add features like rate limiting, logging, or additional security.

## 2. Database Management

We use a relational database (PostgreSQL) to store structured data about users, tournaments, matches, brackets, and leaderboards.

- **Type**: SQL database (PostgreSQL).
- **ORM**: Drizzle ORM for type-safe queries and migrations.
- **Connection Management**:
  - Pooling is configured via connection settings to limit open connections.
  - Environment variable `DATABASE_URL` holds the Postgres connection string.
- **Data Practices**:
  - **Migrations**: Version-controlled migrations to evolve schema safely.
  - **Transactions**: Wrap multi-step operations (e.g., creating a tournament with initial divisions) in transactions.
  - **Indexes**: Add indexes on foreign keys and frequently filtered columns (e.g., `tournament_id` on matches).

## 3. Database Schema

### Human-Readable Description
- **User**: Stores account info, email, hashed password, role (superadmin, admin, user).
- **Division**: A grouping within a tournament (e.g., age group), tied to one tournament.
- **Tournament**: Core entity with name, start/end dates, location.
- **Match**: Individual contest between two participants, linked to a division and a tournament.
- **Bracket**: Represents a tree or grouping of matches—holds bracket-specific metadata.
- **Leaderboard**: Aggregated standings for a tournament or division, updated in real time and via fallback cron jobs.

### SQL Schema (PostgreSQL)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin','admin','user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE divisions (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  max_teams INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  division_id INTEGER REFERENCES divisions(id) ON DELETE CASCADE,
  participant_a VARCHAR(255) NOT NULL,
  participant_b VARCHAR(255) NOT NULL,
  score_a INTEGER,
  score_b INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  result_recorded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE brackets (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  division_id INTEGER REFERENCES divisions(id) ON DELETE CASCADE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE leaderboards (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  division_id INTEGER REFERENCES divisions(id),
  standings JSONB NOT NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_division ON matches(division_id);
```

## 4. API Design and Endpoints

We follow a RESTful approach. All responses use the JSend format: `{ status, data, message }`.

Key endpoints:

- **Authentication** (`/auth`)
  - POST `/auth/signup` – create a new user (body: email, password).
  - POST `/auth/login` – authenticate (body: email, password), returns JWT.
  - POST `/auth/refresh` – refresh access token via refresh token.

- **Users** (`/users`)
  - GET `/users` – list users (superadmin only).
  - GET `/users/:id` – get a single user (admins or owner).
  - PUT `/users/:id` – update user info (role changes by superadmin).
  - DELETE `/users/:id` – deactivate or remove user.

- **Tournaments** (`/tournaments`)
  - GET `/tournaments` – list all tournaments.
  - POST `/tournaments` – create a new tournament.
  - GET `/tournaments/:id` – tournament details including divisions.
  - PUT `/tournaments/:id` – update tournament info.
  - DELETE `/tournaments/:id` – delete a tournament.

- **Divisions** (`/tournaments/:tournamentId/divisions`)
  - POST – add a division.
  - GET – list divisions in a tournament.

- **Matches** (`/tournaments/:tournamentId/matches`)
  - POST – schedule a match.
  - GET – list matches.
  - PUT `/matches/:id` – record scores.

- **Brackets** (`/tournaments/:tournamentId/brackets`)
  - POST – create/update bracket structure.
  - GET – retrieve bracket data.

- **Leaderboards** (`/tournaments/:tournamentId/leaderboards`)
  - GET – fetch current standings.

Authentication and authorization:
- JWT in `Authorization: Bearer <token>` header.
- Role-based middleware checks user role before allowing certain operations.
- Input validation via Zod schemas in request middleware.

## 5. Hosting Solutions

We recommend hosting on Amazon Web Services for reliability and scalability.

- **Compute**: ECS Fargate or EC2 Auto Scaling group running Docker containers.
- **Database**: Amazon RDS for PostgreSQL (managed backups, multi-AZ).
- **Cache**: Amazon ElastiCache (Redis) for in-memory caching of leaderboard data and session data as needed.
- **Reverse Proxy & SSL**: AWS Application Load Balancer (TLS termination) or Nginx in front of containers.

Benefits:
- High availability and automatic failover.
- Pay-as-you-go pricing scales with traffic.
- Managed services reduce operational overhead.

## 6. Infrastructure Components

- **Load Balancer**: Distributes HTTP traffic across container instances.
- **Caching**: Redis caches frequently accessed data (e.g., leaderboard snapshots) to reduce DB load.
- **CDN**: Amazon CloudFront for static assets (images, frontend build) to speed up the Admin Dashboard.
- **Cron Jobs**: A scheduled worker (using node-cron) to recalculate leaderboards periodically as a fallback.
- **Logging & Tracing**: Container logs forwarded to CloudWatch or a centralized ELK stack.

These components work together to:
- Ensure fast, consistent response times under load.
- Protect the database from excessive read traffic.
- Serve static files closer to the user.

## 7. Security Measures

- **Authentication**: JWT tokens signed with a strong secret stored in environment variables.
- **Authorization**: Role-based access control enforced via middleware.
- **Transport Security**: HTTPS only (TLS 1.2+).
- **Data Encryption**: 
  - At rest: RDS encryption.
  - In transit: TLS for client–server and server–DB connections.
- **Input Validation**: Zod schemas validate and sanitize all incoming data.
- **Rate Limiting**: `express-rate-limit` to protect login and critical endpoints.
- **Helmet**: Sets HTTP headers to guard against well-known web vulnerabilities.
- **CORS**: Controlled origins allow only the Admin Dashboard domain.

## 8. Monitoring and Maintenance

- **Logging**: Winston or Pino for structured JSON logs, aggregated in CloudWatch or ELK.
- **Error Tracking**: Sentry to capture exceptions and performance issues.
- **Metrics**: Prometheus + Grafana for CPU, memory, request rate, error rate dashboards.
- **Health Checks**: `/health` endpoint returns service status for auto-scaling and load balancer.
- **CI/CD**: GitHub Actions or AWS CodePipeline runs tests (Jest, Supertest) and deploys on merge to main.
- **Database Backups**: Automated RDS snapshots daily.

Maintenance strategies:
- Regular security and dependency updates.
- Periodic load testing to plan capacity.
- Automated alerts for high error rates or increased latency.

## 9. Conclusion and Overall Backend Summary

Our backend is a clear, modular Express.js service with:
- A layered architecture (routes, controllers, services, repositories).
- A PostgreSQL database managed by Drizzle ORM.
- A full set of RESTful, role-protected endpoints for managing users, tournaments, divisions, matches, brackets, and leaderboards.
- Production-ready hosting on AWS with load balancing, caching, and CDN.
- Robust security measures (JWT auth, rate limiting, HTTPS, input validation).
- Comprehensive monitoring and maintenance plans to keep the system healthy and performant.

This setup aligns perfectly with the project goal: a scalable, maintainable, and secure backend that powers a modern Admin Dashboard for tournament management. Unique strengths include type-safe database interactions with Drizzle ORM, a clear service-layer pattern, and AWS-managed infrastructure that minimizes operational overhead while maximizing reliability.