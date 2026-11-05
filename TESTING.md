# CollabSpace – Manual Testing Guide

Work through the sections in order. Each step says **what to do** and **what you should see**.
Tick the boxes as you go; anything that doesn't match is a bug worth noting down.

---

## 0. Setup

### Start everything
1. Make sure PostgreSQL and Redis are running.
2. Backend (terminal 1):
   ```bash
   cd backend
   npm run migrate:up     # applies any new migrations
   npm run dev
   ```
   You should see: `Database connection successful`, `Redis connection successful`, `Server is running on http://localhost:3000`, `[Outbox] Worker started.`
3. Frontend (terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```
4. Open http://localhost:5173

### Use several users at the same time
Login is stored per browser profile, so you need separate sessions:

| Who | Role in the test | Where to open |
|---|---|---|
| **Alice** | workspace owner | Normal Chrome window |
| **Bob** | admin | Incognito window |
| **Carol** | member | Another browser (Firefox/Edge) or second Chrome profile |
| **Dave** | outsider / brand-new user | Another incognito window or profile |

Use any emails (they aren't verified), e.g. `alice@test.com`, `bob@test.com`, `carol@test.com`, `dave@test.com`.
Passwords must be **8+ characters**, e.g. `Password123`.

> Everything runs on one machine, so invite links on `localhost` work between your own windows.

---

## 1. Registration & login

- [ ] **Register Alice**: go to `/register`, fill name, email, password → you are logged in and sent to the create-workspace page (no workspace yet).
- [ ] **Validation**: try an empty name, an invalid email, a password with fewer than 8 characters → clear error messages, no account created.
- [ ] **Duplicate email**: register `alice@test.com` again → "email already exists" style error.
- [ ] **Logout** (sidebar) → you land on `/login`.
- [ ] **Wrong password** → error; **right password** → logged in.
- [ ] **Protected pages**: while logged out, open `http://localhost:5173/tasks` → redirected to `/login`.
- [ ] **Rate limiting**: submit 11+ wrong logins quickly → "Too many requests" (429) message. Wait ~15 minutes or clear the Redis key to retry.
- [ ] Register **Bob**, **Carol** and **Dave** in their own windows (you'll create/join workspaces for them below).

---

## 2. Workspaces

As **Alice**:
- [ ] **No-workspace screen**: you can only reach the create-workspace page, and it also shows **"Join an existing workspace"** (invite link/code box).
- [ ] **Create** a workspace, e.g. "Acme Team" → lands on the dashboard; you are the **owner**.
- [ ] Empty name / 100+ character name → validation error.
- [ ] **Create a second workspace** (sidebar → new workspace) and **switch** between them with the workspace selector. Data (tasks, members) should differ per workspace.
- [ ] **Rename** in Settings → name updates in the sidebar/topbar. (Only owner/admin can rename.)
- [ ] Refresh the page → the same workspace stays selected.

---

## 3. Members, roles & invites

### 3a. Invite links (the way new users join)
As **Alice**, open **Members**:
- [ ] Create an invite link (e.g. 7 days, **1 person**) → the link appears with a **Copy** button. Copy it.
- [ ] The full link is shown **only once**; after refresh the list shows metadata only (created date, expiry, `0 / 1 used`).
- [ ] As **Dave** (new user, no workspace), either open the link directly, or paste it (or just the code after `/invite/`) into "Join an existing workspace" → you see **"Join Acme Team"**.
- [ ] Click **Join workspace** → Dave lands on the dashboard of Acme Team as a **member**.
- [ ] In Alice's Members list, Dave now appears, and the invite shows **1 / 1 used** (it disappears from the active list once used up).
- [ ] **Single-use**: open the same link as Carol → "invalid, expired or revoked" message.
- [ ] **Not logged in**: log out, open a valid invite link → you're sent to login (or register), and after signing in you come **back to the invite page**, not the dashboard.
- [ ] **Unlimited link**: create an "Unlimited" link and use it with Carol → she joins. Open it again as Carol → "already a member" (does not consume a use).
- [ ] **Revoke**: create another link, click the trash icon → opening it now shows the unavailable message.
- [ ] **Garbage code**: paste `abc123` into the join box → "invalid, expired or revoked".
- [ ] **Permissions**: Carol (member) must **not** see the invite panel or the add-by-email box.

### 3b. Add an existing user by email
- [ ] As Alice, enter `bob@test.com` in "Add an existing user by email" → Bob appears in the list as a member.
- [ ] Unknown email → "No registered user found with this email".
- [ ] Add the same person twice → "already a member".

### 3c. Roles and removal
- [ ] As Alice (owner), change Bob's role to **admin** (dropdown) → his role badge updates; Bob now sees invite/add-member tools.
- [ ] Only the **owner** can change roles: log in as Bob and confirm there is no role dropdown.
- [ ] **Admin removing**: Bob can remove a regular member (Carol) but **not** another admin and **not** the owner.
- [ ] Owner cannot be removed; you cannot remove yourself.
- [ ] After Alice removes Carol, Carol refreshes → the workspace is gone from her list (she's sent to create/join).

---

## 4. Projects

Switch to Alice → **Projects**:
- [ ] Empty state shows "No projects yet" with a create button.
- [ ] **Create** a project (name + description). Duplicate name (same workspace, any letter case) → "already exists".
- [ ] **Edit** name/description.
- [ ] **Archive** (owner/admin only) → disappears unless "show archived" is on; **Reactivate** brings it back.
- [ ] Archived projects cannot be chosen for new tasks.
- [ ] Task count on the card updates when tasks are added; **View tasks** opens the task list filtered to that project (with a "Clear project filter" button).
- [ ] **Delete** (owner/admin only) → confirmation; the project's **tasks remain**, just without a project.
- [ ] A plain member (Carol) can create and edit projects but sees **no archive/delete** buttons.

---

## 5. Tasks (the core feature)

### Create & edit
- [ ] **Create** a task with title, description, priority, due date, project → appears at the top of the list as **To Do**.
- [ ] Empty title → blocked. 200+ character title → blocked.
- [ ] **Edit** the task (Edit button) → changes are saved and the list updates.
- [ ] **Status**: change it from the dropdown in the list (To Do → In Progress → Done → Blocked) → saved instantly.
- [ ] **Delete** a task → removed (with its comments and activity).

### Multiple assignees (new feature)
- [ ] In the create/edit form, **Assignees** is a checkbox list of workspace members.
- [ ] Tick **two or more** people → the list and the detail panel show all names, comma-separated.
- [ ] Untick everyone → shows **Unassigned**.
- [ ] Only workspace members appear in the list.
- [ ] **Activity** on the task shows "changed the assignees from … to …".
- [ ] **Notifications**: each *newly added* assignee gets a "task assigned" notification; you don't notify yourself.
- [ ] **"Assigned to me"** filter shows tasks where you are *one of* the assignees.

### Search, filters, pagination
- [ ] Top-bar **search** finds tasks by title **and** description (search covers the whole workspace, not just the current page).
- [ ] **Status filter tabs** (All / To Do / In Progress / Done / Blocked).
- [ ] **All tasks / Assigned to me** toggle.
- [ ] Create 21+ tasks → **pagination** appears ("Page 1 of 2"); Next/Previous work; changing a filter returns to page 1.

### Task detail, comments & activity
Click a task to open the detail panel:
- [ ] Shows priority, status, assignees, creator, due date, description.
- [ ] **Add a comment** → appears immediately.
- [ ] **Edit** and **delete** your own comment; you can't change someone else's (no edit/delete buttons, API returns 403).
- [ ] **Activity history** lists: created, title/description/status/priority/assignee/due-date/project changes, with who did it.

---

## 6. Notifications & real-time updates

Use two windows side by side (Alice and Carol, both in the same workspace):

- [ ] Alice assigns a task to Carol → Carol's **bell** gets a red unread count **without refreshing** (WebSocket).
- [ ] Carol changes the task status → Alice (the creator) gets a "status changed" notification.
- [ ] Carol comments on the task → Alice and any other assignees get a "new comment" notification (not Carol).
- [ ] Click a notification → opens the related task directly (deep link).
- [ ] **Mark one as read** and **Mark all as read** → the count updates.
- [ ] Notifications persist after refresh.
- [ ] Backend terminal shows `[Outbox] Event processed` lines and `[Realtime]` activity.
- [ ] **Resilience** (optional): stop Redis briefly → the outbox retries; after restarting Redis, pending notifications still arrive.

---

## 7. Dashboard

- [ ] Summary cards (task counts, team members) match what you see on the other pages.
- [ ] Recent tasks table shows the correct title, status, priority and **Assignees**.
- [ ] Numbers change after creating tasks or changing statuses.

---

## 8. Settings (account)

- [ ] **Profile**: change display name and email → saved; the new name appears in comments and member lists. An email already used by someone else → "already exists".
- [ ] **Change password**: wrong current password → error. New password under 8 characters → error.
- [ ] After a successful password change, **other logged-in sessions are signed out** (revocation): change the password in one window, then click anything in another window with the same user → you're sent to login.
- [ ] Log in with the **old** password → fails; with the **new** one → works.

---

## 9. Permission & security checks

| Check | Expected |
|---|---|
| Carol (member) opens `/members` | Can see members, but no add/invite/role/remove controls |
| Dave (not in Acme) tries to open one of Acme's task URLs | Not found / no access |
| Member tries to archive/delete a project via the UI | Buttons not shown |
| Expired/modified token (clear `collabspace_access_token` in dev tools → Application → Local Storage) | Next action sends you to login |
| Logged-out user hits `/api/workspaces` directly | `401` |

Quick API check without the UI:
```bash
curl -i http://localhost:3000/api/workspaces          # expect 401
curl -i http://localhost:3000/api/health              # expect 200
```

---

## 10. Help & misc UI

- [ ] **Help** page loads and describes workspaces/invites, projects, tasks, notifications.
- [ ] Toast messages appear on success/failure actions and disappear on their own.
- [ ] Resize the browser to phone width → layout stays usable.
- [ ] Open the app with the backend stopped → friendly error + "Try again" (no blank page).

---

## 11. Automated checks

```bash
cd backend  && npm run typecheck && npm test
cd frontend && npx tsc -b && npm run lint     # lint shows some pre-existing warnings
```

## 12. Docker run (optional end-to-end)

```bash
cp .env.example .env      # set DB_PASSWORD and JWT_SECRET
docker compose up --build -d
```
Open http://localhost:8080 and repeat a short version of sections 1–5.
Stop with `docker compose down` (use `down -v` only if you want to wipe the data).

---

## Suggested 30-minute path

1. Register Alice, create "Acme Team".
2. Register Dave in another window → create an **unlimited invite link** as Alice → Dave joins.
3. Add Bob by email, make him admin.
4. Create a project, then 3 tasks; assign one task to **Bob and Dave**.
5. Watch the notifications arrive live in their windows; comment as Dave; check activity.
6. Try filters/search/pagination, then archive the project and remove Dave.

## Bug report template

```
Where:        (page / action)
Steps:        1. ... 2. ... 3. ...
Expected:
Actual:
User/role:    (Alice-owner, Carol-member, ...)
Console/terminal errors:
```
