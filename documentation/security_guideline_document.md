# Security Guidelines for tournament-manager-fullstack

This document provides detailed security recommendations for the tournament-manager-fullstack project. It covers both the Next.js Admin Dashboard (frontend) and the new Node.js/Express backend, ensuring a defense-in-depth approach across authentication, data handling, infrastructure, and dependencies.

---

## 1. Authentication & Access Control

### 1.1 Robust Authentication
- Use JWTs issued by your Express API (_avoid `alg: none`_). Sign with a strong secret or asymmetric keys (RS256).
- Enforce `exp` (expiration) and optionally `nbf` (not before) claims.
- Rotate keys periodically and support key revocation via a token blacklist or short TTL + refresh tokens.

### 1.2 Strong Password Policies
- Require minimum 12-character passwords with upper/lowercase letters, numbers, and special characters.
- Hash passwords with Argon2id or bcrypt (cost factor tuned for your environment) and unique per-user salts.
- Enforce password change/rotation policies for admin accounts.

### 1.3 Session Management & MFA
- Store only the JWT (or refresh token) in a Secure, HttpOnly, SameSite=strict cookie.
- On logout, revoke refresh tokens and clear cookies.
- Implement Multi-Factor Authentication (TOTP or SMS) for admin roles.

### 1.4 Role-Based Access Control (RBAC)
- Define roles (`superadmin`, `admin`, `user`) and map them to permissions in middleware.
- In Express, create middleware that: 1) verifies JWT, 2) checks role in token payload, 3) aborts with HTTP 403 if unauthorized.
- Protect every backend route—never rely solely on client-side guards.

---

## 2. Input Handling & Processing

### 2.1 Server-Side Validation
- Use Zod to define request schemas in Express controllers. Validate `req.body`, `req.query`, and `req.params` before business logic.
- Disallow unknown fields and return HTTP 400 on schema mismatch.

### 2.2 Prevent Injection Attacks
- Access PostgreSQL via Drizzle ORM’s parameterized queries—never interpolate SQL strings manually.
- Sanitize all string fields (e.g., tournament names, user inputs) to remove control characters.

### 2.3 CSRF Protection
- For state-changing operations (e.g., create/update/delete), use synchronizer tokens or ensure JWTs in HttpOnly cookies plus CSRF double-submit pattern.

### 2.4 File Uploads (if any)
- Validate type, extension, and max size on upload. Reject executables.
- Store uploads outside the webroot (e.g., in S3 or a locked folder) and serve via signed URLs.

---

## 3. Data Protection & Privacy

### 3.1 Encryption in Transit and At Rest
- Enforce HTTPS/TLS 1.2+ on all endpoints. Redirect HTTP to HTTPS.
- Configure PostgreSQL with SSL connections.
- Encrypt sensitive database fields (e.g., PII) with AES-256-CBC or GCM, using a secure key from a secrets manager.

### 3.2 Secrets Management
- **Do not** store `JWT_SECRET`, database credentials, or API keys in source code or .env committed to VCS.
- Use AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets to inject at runtime.

### 3.3 Logging & Privacy
- Avoid logging full JWTs, passwords, PII, or stack traces in production logs.
- Mask or redact sensitive fields (e.g., email, phone) in logs.

---

## 4. API & Service Security

### 4.1 Rate Limiting & Throttling
- Apply rate limits per IP or per user on authentication endpoints to prevent brute-force (e.g., 5 requests/minute).
- Use libraries like `express-rate-limit` or API gateway features.

### 4.2 CORS Configuration
- In Express, whitelist only your Admin Dashboard origin(s).
- Disallow wildcard (`*`) for sensitive routes.

### 4.3 API Versioning & Minimal Exposure
- Prefix routes with `/v1/…` and never remove or change existing endpoints—deprecate gracefully.
- Return only needed fields in JSON responses—avoid dumping entire records.

### 4.4 Secure HTTP Methods
- Enforce correct verbs: GET for reads, POST for creation, PUT/PATCH for updates, DELETE for removals.
- Reject mismatched methods with HTTP 405.

---

## 5. Web Application Security Hygiene

### 5.1 Security Headers
- Next.js should configure the following in `next.config.js` or via a proxy:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Content-Security-Policy`: restrict scripts, styles, images to trusted sources.
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer-when-downgrade`

### 5.2 XSS Mitigation
- Escape or encode all user-supplied data in templates and React components.
- Avoid `dangerouslySetInnerHTML` unless content is sanitized with a vetted library.

### 5.3 Cookie Hardening
- Set `Secure`, `HttpOnly`, and `SameSite=Strict` on session/auth cookies.

### 5.4 Subresource Integrity (SRI)
- For any CDN scripts/styles, add `integrity` and `crossorigin="anonymous"` attributes.

---

## 6. Infrastructure & Configuration Management

### 6.1 Docker & Deployment
- In `docker-compose.yml`, run Postgres with a non-root DB user and restricted privileges.
- For the Express container, run as a non-root user and mount only required volumes.

### 6.2 TLS Configuration
- Use Let’s Encrypt or a managed certificate for Nginx.
- Disable weak ciphers and protocols (SSLv3, TLS 1.0/1.1).

### 6.3 Secrets Injection
- Mount secrets as environment variables or files in containers via orchestration tools.

### 6.4 Disable Debug Endpoints
- Remove Next.js debug/warning overlays in production.
- Disable Express’s `x-powered-by` header: `app.disable('x-powered-by')`.

---

## 7. Dependency Management

### 7.1 Vulnerability Scanning
- Integrate SCA tools (e.g., `npm audit`, Snyk, Dependabot) into your CI pipeline.
- Fail builds on high- or critical-severity vulnerabilities.

### 7.2 Lockfiles & Updates
- Commit `package-lock.json` (or `yarn.lock`).
- Schedule periodic dependency upgrades and regression testing.

### 7.3 Reduce Attack Surface
- Remove unused packages from both frontend and backend.
- Prefer minimal libraries with active maintenance and security track records.

---

By embedding these principles and controls throughout your development lifecycle—design, implementation, testing, and deployment—you will establish a secure, resilient, and maintainable tournament management platform. Regularly review and update these guidelines as your application evolves and new threats emerge.