# Project Requirements Document (PRD)

## 1. Project Overview

This project aims to build a dedicated tournament management platform with two main components: a React/Next.js Admin Dashboard frontend and a Node.js/Express backend API. The Admin Dashboard provides a sleek, responsive interface for tournament administrators to create and manage divisions, tournaments, participants, matches, brackets, and leaderboards. The backend handles authentication (JWT-based), business logic (bracket generation, leaderboard updates), data persistence (PostgreSQL via Drizzle ORM), and scheduling (cron jobs for fallback updates).

The core problem it solves is the lack of an off-the-shelf, production-ready system for running tournaments of any size with modern UI and robust API support. Built on a proven Next.js full-stack starter repository, the platform accelerates development by reusing authentication UIs, UI components (shadcn/ui), and database configurations. Key objectives include secure user management, real-time bracket visualization, automated leaderboard calculation, type-safe data access, and containerized local development.

**Success Criteria:**
- Admins can sign up, log in, and access a protected dashboard.  
- Full CRUD (Create, Read, Update, Delete) for divisions, tournaments, participants, matches.  
- Automated bracket generation and leaderboard calculation with fallback cron jobs.  
- Responsive UI built with Tailwind CSS and shadcn/ui.  
- Robust, documented REST API with JWT authentication and Zod validation.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (MVP)
- **Authentication & Authorization**: Sign-up, sign-in pages wired to Express.js JWT endpoints; role-based (superadmin, admin, user).  
- **Admin Dashboard Frontend**: Next.js with App Router, protected routes, navigation sidebar, reusable UI components (tables, forms, dialogs).  
- **Data Models & API**: PostgreSQL schemas (User, Division, Tournament, Participant, Match, Bracket, Leaderboard) defined via Drizzle ORM.  
- **REST API Endpoints**: CRUD for users, divisions, tournaments, participants, matches; bracket generation endpoint; leaderboard retrieval.  
- **Business Logic Services**: Bracket service for seeding and pairing; Leaderboard service with periodic recalculation (node-cron).  
- **Validation & Error Handling**: Zod schemas for all request payloads; centralized error middleware returning JSend-formatted responses.  
- **Logging**: Structured logging in backend using Winston or Pino.  
- **Containerized Dev Environment**: Docker Compose for PostgreSQL, Express backend, Next.js frontend, optional Nginx reverse proxy.  

### Out-of-Scope (Phase 2 or Later)
- Public-facing tournament signup or viewing portal.  
- Payment gateway integration (Stripe, PayPal).  
- Advanced analytics or reporting beyond leaderboard stats.  
- Social features (chat, comments, notifications).  
- Mobile-native app (React Native or Swift).  
- Multi-tenant support or customizable branding per client.

## 3. User Flow

An administrator visits the platform’s landing page and clicks “Sign Up.” They fill out the registration form (name, email, password) and submit it to the `/auth/signup` endpoint of the Express API. Upon successful registration, they are redirected to the sign-in page. The admin signs in, the API returns a JWT, and the token is stored in a secure cookie or local storage. The user is then forwarded to the dashboard at `/dashboard`.

Inside the dashboard, the sidebar provides navigation links: Divisions, Tournaments, Participants, Matches, Brackets, Leaderboard, and Settings. The admin clicks “Tournaments,” sees a table of existing tournaments, and clicks “Create New.” They complete the form (name, division, date range) and submit to `/api/tournaments`. After creation, they navigate to the “Participants” section, add entries, then move to “Brackets” to auto-generate pairings. Matches appear under “Matches,” where results can be entered. Finally, the “Leaderboard” tab shows real-time standings calculated via the backend service and periodically refreshed by a cron job.

## 4. Core Features

- **JWT Authentication**: Sign-up, sign-in, token issuance, refresh, and secure storage.  
- **Role-Based Access Control**: Middleware enforcing `superadmin`, `admin`, and `user` scopes.  
- **Admin Dashboard UI**: Protected Next.js app with responsive layouts, sidebar navigation, and shadcn/ui components.  
- **CRUD Operations**: REST endpoints for User, Division, Tournament, Participant, Match, Bracket, Leaderboard.  
- **Bracket Generation Service**: Automatically seed and pair participants into a knockout bracket.  
- **Leaderboard Service**: Compute standings based on match results; fallback cron job for data consistency.  
- **Data Modeling**: Drizzle ORM schemas for PostgreSQL tables, migrations via CLI.  
- **Validation Layer**: Zod schemas validating all incoming API requests.  
- **Error Handling**: Centralized Express middleware formatting errors in JSend.  
- **Logging**: Structured request and error logs via Winston/Pino.  
- **Containerization**: Docker Compose for local development with Postgres, Express, Next.js, optional Nginx.

## 5. Tech Stack & Tools

**Frontend:**
- Next.js (App Router)  
- React & TypeScript  
- Tailwind CSS & shadcn/ui  
- Axios or Fetch wrapper for API calls

**Backend:**
- Node.js (v18+) & Express.js  
- TypeScript  
- Drizzle ORM (PostgreSQL)  
- Zod for validation  
- JSON Web Tokens (jsonwebtoken)  
- Winston or Pino for logging  
- node-cron for scheduled tasks

**Infrastructure & Dev Tools:**
- Docker & Docker Compose  
- Nginx (reverse proxy in production)  
- .env for secret management (`JWT_SECRET`, `DATABASE_URL`)  
- Git & GitHub  
- IDE: VS Code with Git integration

## 6. Non-Functional Requirements

- **Performance:** API response times <200ms under moderate load; dashboard initial load <2s.  
- **Scalability:** Stateless API, containerized services, horizontal scaling capability.  
- **Security:** Enforce HTTPS; secure JWT storage; OWASP Top 10 considerations; CORS policy restricting origins; input validation.  
- **Reliability:** Automated cron fallback; zero-downtime database migrations.  
- **Usability & Accessibility:** Responsive design; keyboard navigation; ARIA attributes in UI components.  
- **Compliance:** GDPR-friendly cookie handling; secure data storage.  

## 7. Constraints & Assumptions

- PostgreSQL will run in Docker using the provided Compose file.  
- Node.js v18+ and Next.js v14+ are available.  
- The environment will supply `JWT_SECRET`, `DATABASE_URL`, and other variables via `.env`.  
- Network latency between frontend and backend is minimal (same host or VPC).  
- Developers have familiarity with TypeScript, Next.js, and Express.

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits:** No built-in throttling—consider adding express-rate-limit if public API exposure is planned.  
- **Bracket Logic Complexity:** Edge cases (odd number of participants). Mitigation: implement byes and validation rules.  
- **Cron Job Overlap:** Ensure singleton execution (use distributed locks if scaled).  
- **Database Migration Conflicts:** Migrations must run in correct order; use CI/CD checks.  
- **JWT Expiry Handling:** Clients should detect token expiry and redirect to login gracefully.  
- **CORS Misconfiguration:** Wrong origins can block requests; define strict whitelists.


*This PRD provides a clear, unambiguous blueprint for both the Admin Dashboard frontend and the Express.js backend API. Subsequent technical documents (tech stack details, frontend guidelines, backend structure, file organization, and CI/CD rules) can be generated directly from these specifications.*