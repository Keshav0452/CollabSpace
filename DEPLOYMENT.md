# Deploying CollabSpace

This guide takes the app from your laptop to a public URL using Docker Compose on a
single server (any VPS with Docker). Work through it top to bottom.

## 1. Before you start

- A server with Docker and Docker Compose, and a domain name pointing at it.
- The full test suite passes locally:
  ```bash
  cd backend  && npm run typecheck && npm test && npm run test:e2e
  cd frontend && npm run build
  ```
  (`npm run test:e2e` needs your local PostgreSQL and Redis. It refuses to run against a remote database.)

## 2. Configure secrets

```bash
cp .env.example .env
openssl rand -base64 48    # use one value for JWT_SECRET
openssl rand -base64 24    # use another for DB_PASSWORD
```

Edit `.env`: set `DB_PASSWORD`, `JWT_SECRET` and `TRUST_PROXY` (see section 4). Never commit `.env`
and never reuse the values from your development machine.

## 3. Start the stack

```bash
docker compose up --build -d
docker compose ps                # backend should become "healthy"
docker compose logs -f backend   # migrations run automatically on start
curl --fail http://127.0.0.1:8080/api/health/ready
```

The backend container waits for PostgreSQL and Redis, applies pending SQL migrations, and then starts the
API and WebSocket server. PostgreSQL and Redis data live in named Docker volumes.

The app listens on `APP_PORT` (default 8080). PostgreSQL and Redis are **not** published to the
internet; keep it that way. Allow only ports 80 and 443 (and SSH) in the server firewall, and
block 8080 from the outside once step 4 is done.

## 4. HTTPS (required)

Passwords and login tokens travel over the connection, so serve the app over HTTPS only.
The simplest option is Caddy, which obtains and renews certificates automatically:

```
# /etc/caddy/Caddyfile
app.example.com {
    reverse_proxy 127.0.0.1:8080
    header Strict-Transport-Security "max-age=31536000"
}
```

Caddy proxies WebSockets (live updates) without extra settings. Hosting platforms and CDNs
(Cloudflare, Render, Fly.io and similar) do the same job.

**Set `TRUST_PROXY` to match your setup.** It tells the backend how many proxies sit in front of it,
so rate limits are applied per real visitor and not to the proxy's address:

| Setup | `TRUST_PROXY` |
|---|---|
| Only the bundled nginx in front of the backend | `1` |
| HTTPS proxy / CDN in front of the bundled nginx (the setup above) | `2` |

If this is wrong, either every visitor shares one rate-limit bucket (and a few failed logins lock
everyone out) or the limits can be bypassed by spoofing headers.

## 5. Backups (do this before real users arrive)

```bash
# Backup
docker compose exec -T postgres pg_dump -U collabspace_app collabspace | gzip > backup-$(date +%F).sql.gz

# Restore into an empty database
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose exec -T postgres psql -U collabspace_app collabspace
```

Schedule the backup daily (cron), copy the files off the server, and **test a restore once**. Take a
manual backup before every deploy that includes a new migration.

## 6. Monitoring

- Point a free uptime monitor (UptimeRobot, Better Stack, ...) at `https://app.example.com/api/health/ready`.
  It returns 200 only when PostgreSQL and Redis both answer, and 503 otherwise.
- Check `docker compose logs backend` after each deploy.

## 7. Smoke test after every deploy

Use a private window, not your normal browser:
1. Register a new account and create a workspace.
2. Create a task and assign it to yourself.
3. Create an invite link, open it in a second private window with another account, join, and
   confirm the live notification arrives without refreshing.
4. Log out and log back in.

## Day-to-day operations

```bash
docker compose logs -f           # follow logs
docker compose restart           # restart services
docker compose down              # stop, KEEPING the data
docker compose down -v           # stop and DELETE the database and Redis volumes (destructive!)
```

## What happens to logins

A login lasts 24 hours (`ACCESS_TOKEN_TTL_HOURS`) and renews automatically while the person keeps
using the app. Changing a password signs out every other session immediately.

## Known limitations

These are not blockers for a small launch, but tell your users or plan for them:

- **No password reset or email verification.** There is no email service, so a user who forgets
  their password cannot recover the account, and addresses are not verified. Adding this needs an
  email provider (for example Resend) and is the main thing to build before a wide public launch.
  Until then, do not onboard real users who you cannot help manually (for example by resetting a
  password directly in the database).
- **Invites are shared by hand.** Owners copy the invite link and send it themselves.
- **Login token is kept in the browser's local storage.** The app sets a strict Content Security
  Policy to limit cross-site scripting; keep dependencies updated (CI runs `npm audit`).
- **Email changes take effect immediately** (no confirmation step).
- **No managed infrastructure.** This Compose setup has no managed database backups, high availability,
  centralised logging or disaster-recovery service. Section 5 (backups) is your responsibility.
- **Sessions are not cookie-based.** A hardened public deployment could move to an HttpOnly refresh-cookie
  session and get a frontend XSS review.
- **Single server.** Compose runs one backend; the realtime pieces already use Redis, so scaling
  out later is possible but untested.

## Updating

```bash
git pull
docker compose exec -T postgres pg_dump ... > backup-before-update.sql   # see section 5
docker compose up --build -d
```

> Do not onboard real users until HTTPS is on, secrets are rotated, network access is restricted,
> backups exist (and a restore has been tested), and you have read the limitations above.
