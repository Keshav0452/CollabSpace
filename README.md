# CollabSpace

CollabSpace is a collaborative workspace and task-management application built with React, TypeScript, Express, PostgreSQL, Redis, and WebSockets.

## Implemented capabilities

- Account registration, login, profile editing, and password changes
- Workspace creation, selection, renaming, and member/role management
- Project creation, editing, archiving/reactivation, deletion, and task counts
- Task creation, editing, deletion, status/priority, assignment, due dates, project association, search, filtering, and pagination
- Task comments and activity history
- Notifications with read/unread actions and task deep links
- Redis Pub/Sub, Redis-backed authentication rate limiting, WebSocket updates, and PostgreSQL Outbox processing
- Short-lived JWT access tokens with account-level token-version revocation after password changes
- Docker Compose setup for PostgreSQL, Redis, backend, and frontend

## Run locally

Requirements: Node.js 22+, PostgreSQL 16+, and Redis 7+.

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your local PostgreSQL and Redis credentials.
npm ci
npm run migrate:up
npm run dev
```

For a fresh local PostgreSQL installation, create an application role and database (choose your own password):

```sql
CREATE ROLE collabspace_app LOGIN PASSWORD 'replace-with-your-password';
CREATE DATABASE collabspace OWNER collabspace_app;
```

Backend environment variables:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=collabspace
DB_USER=collabspace_app
DB_PASSWORD=your-database-password
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=at-least-32-random-characters
PORT=3000
```

### Frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/ws` to the backend at port 3000.

## Run with Docker Compose

From the repository root:

```bash
cp .env.example .env
# Edit .env and set unique, strong DB_PASSWORD and JWT_SECRET values.
docker compose up --build -d
```

Open http://localhost:8080 (or the port configured with `APP_PORT`). The backend container waits for PostgreSQL and Redis, runs pending database migrations, and starts the API/WebSocket server. PostgreSQL and Redis data are persisted in named Docker volumes.

To inspect logs:

```bash
docker compose logs -f backend frontend
```

To stop the services without deleting database data:

```bash
docker compose down
```

To remove the database and Redis volumes as well (destructive):

```bash
docker compose down -v
```

## Database migration note

The new migration `1793170000000_create-projects-and-link-tasks.sql` adds the `projects` table and a nullable `tasks.project_id` relationship. Existing tasks remain valid and unassigned. Deleting a project unassigns its tasks; it does not delete them. The migration also records project changes in task activity.

For an existing local database, back up your database first, then run `npm run migrate:up` from `backend` after configuring its environment. Do not manually execute the migration and then run the migration tool; that can cause schema/version tracking to become inconsistent.

## Important production notes

- Access tokens are short-lived (15 minutes) and are stored in browser local storage. This is more exposed to cross-site scripting than an HttpOnly cookie session. Before onboarding the public, consider moving to a reviewed secure HttpOnly refresh-cookie/session design and perform a security review of the frontend's XSS surface.
- Authentication endpoints use a shared Redis-backed rate limiter. If Redis is unavailable, those endpoints fail closed with HTTP 503 rather than silently disabling the limit.
- Password changes increment the account's `token_version`; existing access tokens are rejected on the next API or WebSocket authentication check. This migration is applied automatically by the Docker startup migration command.
- Email changes currently take effect immediately. Email verification and self-service password reset/email delivery are not implemented because they require a configured and verified email-delivery provider. Do not represent email addresses as verified until that workflow is added.
- Use HTTPS at the public edge, rotate all secrets, restrict database/network access, configure automated backups and restore drills, and monitor application logs/errors before onboarding real users.
- The Docker Compose file is a self-hosting starting point, not a complete managed-cloud deployment or disaster-recovery plan. Configure a reverse proxy/TLS certificate and persistent storage appropriate to your host.
- Put the application behind HTTPS, rotate all secrets, restrict database/network access, configure backups, and monitor application logs/errors before onboarding real users.
- The Docker Compose file is a self-hosting starting point, not a complete managed-cloud deployment or disaster-recovery plan.

## Security and migration update

The migration `1793171000000_add-user-token-version.sql` adds `users.token_version`. It defaults existing accounts to version `0`; newly issued tokens include the current version. Password changes increment the version and revoke all existing tokens for that account. Apply migrations before running a manually started backend:

```bash
cd backend
npm run migrate:up
```

The frontend Nginx configuration sets baseline browser security headers and a same-origin Content Security Policy. Review the policy if you add external scripts, fonts, image hosts, or API domains.

## Build checks

```bash
cd backend && npm ci && npm run typecheck && npm run build
cd ../frontend && npm ci && npm run build
```

The API and realtime integrations should also be verified against a running PostgreSQL/Redis environment with multiple authenticated browser sessions.
