# CollabSpace deployment handoff

This repository is packaged for a Docker Compose self-hosted deployment. The deployment host must have Docker Engine and the Docker Compose plugin installed, plus a domain/reverse proxy and TLS certificate if it will be exposed publicly.

## 1. Prepare secrets on the deployment host

From the repository root:

```bash
cp .env.example .env
openssl rand -base64 48
openssl rand -base64 48
```

Use the first generated value for `DB_PASSWORD` and the second for `JWT_SECRET` in `.env`. Keep `.env` private and never commit or upload it. Use a unique secret pair for each environment. The JWT secret must be at least 32 characters.

## 2. Start the application

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend frontend
```

The backend container waits for PostgreSQL and Redis health checks, applies pending SQL migrations, and then starts the API and WebSocket server. PostgreSQL and Redis data are stored in named Docker volumes.

The application is exposed on port `8080` by default. Set `APP_PORT` in `.env` if a different host port is required.

## 3. Verify the deployment

```bash
curl --fail http://127.0.0.1:8080/api/health
```

Then open `http://SERVER-IP:8080` and test the main user journey:

1. Register a new account and sign in.
2. Create a workspace.
3. Add a workspace member (the invited account must already exist).
4. Create a project and create tasks inside it.
5. Assign a task, update its status, add a comment, and verify notifications.
6. Sign in as a second workspace member in another browser and verify realtime updates.
7. Change the first account's password and verify the old session is rejected; sign in again with the new password.

## 4. Put HTTPS in front of the app

For a public deployment, terminate TLS at a trusted reverse proxy or managed load balancer and forward HTTP traffic to the Compose frontend port. Configure WebSocket upgrade forwarding for `/ws`. Do not expose PostgreSQL (5432) or Redis (6379) to the public internet. Restrict host firewall rules so only the reverse proxy can reach the app port.

## 5. Operations

```bash
# Follow logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services but preserve data
docker compose down

# Update after pulling a new release
docker compose up --build -d
```

Back up PostgreSQL regularly and test restoring a backup before relying on the service. The named volumes survive `docker compose down`; `docker compose down -v` deletes the database and Redis volumes and is destructive.

## Current product limitations to review before a public launch

- Access tokens are short-lived but are stored in browser local storage. A hardened public deployment should consider a secure HttpOnly refresh-cookie/session architecture and a frontend XSS review.
- Email verification and self-service password reset are not implemented. Email changes currently take effect immediately.
- This Compose setup is a self-hosted deployment baseline. It does not provide managed database backups, multi-region availability, centralized observability, or a disaster-recovery service by itself.

Do not onboard real users until you have configured HTTPS, rotated secrets, restricted network access, established backups, and reviewed these limitations.
