import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { SignJWT } from "jose";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Import order matters: database.ts loads .env before token.ts reads JWT_SECRET.
import { pool } from "../../src/config/database.js";
import { connectRedis, disconnectRedis, redisClient } from "../../src/config/redis.js";
import { createAccessToken } from "../../src/utils/token.js";
import app from "../../src/app.js";
import { initializeWebSocketGateway, closeWebSocketGateway } from "../../src/modules/realtime/websocket.gateway.js";
import { startRealtimeSubscriber, stopRealtimeSubscriber } from "../../src/modules/realtime/realtime.subscriber.js";
import { startOutboxWorker, stopOutboxWorker } from "../../src/modules/outbox/outbox.worker.js";

// Safety: these tests create and delete their own rows, but never point them at production data.
const dbHost = process.env.DB_HOST ?? "";
if (process.env.NODE_ENV === "production" || (!["127.0.0.1", "localhost"].includes(dbHost) && process.env.E2E_ALLOW_REMOTE !== "true")) {
  throw new Error(`Refusing to run e2e tests against DB_HOST=${dbHost}. Use a local test database (or set E2E_ALLOW_REMOTE=true if you are sure).`);
}

const tag = `zz-e2e-${Date.now()}`;
let server: http.Server;
let wsUrl = "";
let workspaceId = "";

interface Person { id: string; email: string; token: string }
const people = {} as Record<"alice" | "bob" | "carol" | "dave" | "erin" | "outsider", Person>;
const alicePassword = "Password123";
const ctx: Record<string, any> = {};

async function api(method: "get" | "post" | "patch" | "delete", path: string, token?: string, body?: object) {
  let req = request(app)[method](`/api${path}`);
  if (token) req = req.set("Authorization", `Bearer ${token}`);
  const res = body === undefined ? await req : await req.send(body);
  return { status: res.status, body: res.body as any };
}

async function createPerson(name: string): Promise<Person> {
  const email = `${tag}-${name}@test.local`;
  const result = await pool.query(`INSERT INTO public.users (name, email, password_hash) VALUES ($1, $2, 'x') RETURNING id`, [name, email]);
  const id = result.rows[0].id as string;
  return { id, email, token: await createAccessToken(id, 0) };
}

async function clearRateLimits() {
  for await (const key of redisClient.scanIterator({ MATCH: "collabspace:rate-limit:*", COUNT: 100 })) {
    for (const k of Array.isArray(key) ? key : [key]) await redisClient.del(k);
  }
}

const notificationsOf = async (p: Person) => (await api("get", "/notifications?limit=100", p.token)).body.data.notifications as any[];

beforeAll(async () => {
  await connectRedis();
  await clearRateLimits();
  server = http.createServer(app);
  initializeWebSocketGateway(server);
  await startRealtimeSubscriber();
  startOutboxWorker();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  wsUrl = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws`;

  for (const name of ["bob", "carol", "dave", "erin", "outsider"] as const) people[name] = await createPerson(name);
});

afterAll(async () => {
  await stopOutboxWorker();
  await stopRealtimeSubscriber();
  await closeWebSocketGateway();
  await new Promise<void>((resolve) => server.close(() => resolve()));

  if (workspaceId) {
    await pool.query(`DELETE FROM public.outbox_events WHERE payload->>'workspaceId' = $1`, [workspaceId]);
    await pool.query(`DELETE FROM public.notifications WHERE task_id IN (SELECT id FROM public.tasks WHERE workspace_id = $1)`, [workspaceId]);
    await pool.query(`DELETE FROM public.workspaces WHERE id = $1`, [workspaceId]);
  }
  await pool.query(`DELETE FROM public.users WHERE email LIKE $1`, [`${tag}%`]);
  await clearRateLimits();
  await disconnectRedis();
  await pool.end();
});

describe("authentication", () => {
  it("validates registration and rejects duplicates", async () => {
    const email = `${tag}-alice@test.local`;
    expect((await api("post", "/auth/register", undefined, { name: "Alice", email, password: "short" })).status).toBe(400);
    expect((await api("post", "/auth/register", undefined, { name: "Alice", email, password: alicePassword })).status).toBe(201);
    expect([400, 409]).toContain((await api("post", "/auth/register", undefined, { name: "Again", email, password: alicePassword })).status);
  });

  it("logs in with the right password only and returns a usable token", async () => {
    const email = `${tag}-alice@test.local`;
    expect((await api("post", "/auth/login", undefined, { email, password: "Wrong12345" })).status).toBe(401);
    const login = await api("post", "/auth/login", undefined, { email, password: alicePassword });
    expect(login.status).toBe(200);
    const token = JSON.stringify(login.body).match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/)?.[0];
    expect(token).toBeTruthy();
    const id = (await pool.query(`SELECT id FROM public.users WHERE email = $1`, [email])).rows[0].id as string;
    people.alice = { id, email, token: token! };
    expect((await api("get", "/protected/me", token)).status).toBe(200);
  });

  it("rejects missing and invalid tokens", async () => {
    expect((await api("get", "/workspaces")).status).toBe(401);
    expect((await api("get", "/workspaces", "abc.def.ghi")).status).toBe(401);
  });
});

describe("sessions", () => {
  it("renews a token that is past half of its lifetime, and only then", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const sign = (secondsLeft: number) =>
      new SignJWT({ ver: 0 })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(people.bob.id)
        .setIssuer("collabspace-api")
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + secondsLeft)
        .sign(secret);

    const fresh = await request(app).get("/api/protected/me").set("Authorization", `Bearer ${await createAccessToken(people.bob.id, 0)}`);
    expect(fresh.status).toBe(200);
    expect(fresh.headers["x-access-token"]).toBeUndefined();

    const aging = await request(app).get("/api/protected/me").set("Authorization", `Bearer ${await sign(3600)}`);
    expect(aging.status).toBe(200);
    const renewed = aging.headers["x-access-token"] as string;
    expect(renewed).toBeTruthy();
    expect((await request(app).get("/api/protected/me").set("Authorization", `Bearer ${renewed}`)).status).toBe(200);

    expect((await request(app).get("/api/protected/me").set("Authorization", `Bearer ${await sign(-10)}`)).status).toBe(401);
  });
});

describe("hardening", () => {
  it("answers bad input with 4xx instead of 500", async () => {
    expect((await api("get", "/workspaces/not-a-uuid", people.alice.token)).status).toBe(400);
    const malformed = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(malformed.status).toBe(400);
    const huge = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send(JSON.stringify({ email: "a@b.co", password: "x".repeat(1_200_000) }));
    expect(huge.status).toBe(413);
    expect((await request(app).get("/api/does-not-exist")).status).toBe(404);
  });

  it("sets security headers and exposes a readiness check", async () => {
    const health = await request(app).get("/api/health");
    expect(health.headers["x-content-type-options"]).toBe("nosniff");
    expect(health.headers["content-security-policy"]).toBeTruthy();
    expect(health.headers["x-powered-by"]).toBeUndefined();
    const ready = await request(app).get("/api/health/ready");
    expect(ready.status).toBe(200);
    expect(ready.body.checks).toEqual({ database: true, redis: true });
  });
});

describe("workspaces and members", () => {
  it("creates a workspace visible only to its members", async () => {
    const created = await api("post", "/workspaces", people.alice.token, { name: tag });
    expect(created.status).toBe(201);
    workspaceId = created.body.data.workspace.id;
    expect((await api("post", "/workspaces", people.alice.token, { name: "  " })).status).toBe(400);
    expect((await api("get", `/workspaces/${workspaceId}`, people.outsider.token)).status).toBe(404);
  });

  it("adds members by email and enforces role rules", async () => {
    const w = `/workspaces/${workspaceId}`;
    const { alice, bob, carol, erin } = people;
    expect((await api("post", `${w}/members`, alice.token, { email: bob.email })).status).toBe(201);
    expect((await api("post", `${w}/members`, alice.token, { email: "nobody@nowhere.test" })).status).toBe(404);
    expect((await api("post", `${w}/members`, alice.token, { email: bob.email })).status).toBe(409);
    expect((await api("patch", `${w}/members/${bob.id}/role`, alice.token, { role: "admin" })).status).toBe(200);
    expect((await api("patch", `${w}/members/${alice.id}/role`, alice.token, { role: "member" })).status).toBe(403);
    expect((await api("patch", `${w}/members/${bob.id}/role`, bob.token, { role: "member" })).status).toBe(403);
    expect((await api("post", `${w}/members`, bob.token, { email: erin.email })).status).toBe(201);
    expect((await api("delete", `${w}/members`, bob.token, { userId: alice.id })).status).toBe(403);
    expect((await api("delete", `${w}/members`, alice.token, { userId: alice.id })).status).toBe(400);
    expect((await api("delete", `${w}/members`, bob.token, { userId: erin.id })).status).toBe(200);
    expect((await api("get", w, erin.token)).status).toBe(404);
    expect((await api("patch", w, bob.token, { name: tag })).status).toBe(200);
    expect(carol.id).toBeTruthy();
  });
});

describe("invite links", () => {
  it("lets people join by link, honours use limits and revocation", async () => {
    const w = `/workspaces/${workspaceId}`;
    const { alice, carol, dave, erin } = people;

    const single = await api("post", `${w}/invites`, alice.token, { expiresInDays: 7, maxUses: 1 });
    expect(single.status).toBe(201);
    const singleToken = single.body.data.token as string;
    expect((await api("post", `${w}/invites`, alice.token, {})).status).toBe(201);
    expect((await api("get", `/invites/${singleToken}`, dave.token)).body.data.invite.workspaceName).toBe(tag);
    expect((await api("post", `/invites/${singleToken}/accept`, dave.token)).body.data.status).toBe("joined");
    expect((await api("post", `/invites/${singleToken}/accept`, carol.token)).status).toBe(404);

    const open = await api("post", `${w}/invites`, alice.token, { expiresInDays: 7, maxUses: null });
    const openToken = open.body.data.token as string;
    expect((await api("post", `/invites/${openToken}/accept`, carol.token)).body.data.status).toBe("joined");
    expect((await api("post", `/invites/${openToken}/accept`, carol.token)).body.data.status).toBe("already_member");

    expect((await api("post", `${w}/invites`, carol.token, { expiresInDays: 7, maxUses: null })).status).toBe(403);
    expect((await api("get", `${w}/invites`, carol.token)).status).toBe(403);
    expect((await api("get", "/invites/nope", dave.token)).status).toBe(404);
    expect((await api("get", `/invites/${openToken}`)).status).toBe(401);

    const listed = (await api("get", `${w}/invites`, alice.token)).body.data.invites as any[];
    expect(JSON.stringify(listed)).not.toContain(openToken);
    const unlimited = listed.find((invite) => invite.maxUses === null);
    expect((await api("delete", `${w}/invites/${unlimited.id}`, alice.token)).status).toBe(200);
    expect((await api("get", `/invites/${openToken}`, erin.token)).status).toBe(404);
  });
});

describe("projects", () => {
  it("applies role rules and unique names", async () => {
    const w = `/workspaces/${workspaceId}`;
    const created = await api("post", `${w}/projects`, people.carol.token, { name: "Website relaunch", description: "x" });
    expect(created.status).toBe(201);
    ctx.projectId = created.body.data.project?.id ?? created.body.data.id;
    expect((await api("post", `${w}/projects`, people.alice.token, { name: "WEBSITE RELAUNCH" })).status).toBe(409);
    expect((await api("patch", `${w}/projects/${ctx.projectId}`, people.carol.token, { status: "archived" })).status).toBe(403);
    expect((await api("delete", `${w}/projects/${ctx.projectId}`, people.carol.token)).status).toBe(403);
  });
});

describe("tasks and assignees", () => {
  it("assigns several people and validates them", async () => {
    const w = `/workspaces/${workspaceId}`;
    const { alice, bob, carol, dave, outsider } = people;
    const created = await api("post", `${w}/tasks`, alice.token, { title: "Design homepage", description: "hero banner", priority: "high", projectId: ctx.projectId, assigneeIds: [bob.id, dave.id] });
    expect(created.status).toBe(201);
    ctx.task = created.body.data.task;
    expect(ctx.task.assigneeIds).toHaveLength(2);

    expect((await api("post", `${w}/tasks`, alice.token, { title: "x", assigneeIds: [outsider.id] })).status).toBe(400);
    const tooMany = Array.from({ length: 21 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    expect((await api("post", `${w}/tasks`, alice.token, { title: "x", assigneeIds: tooMany })).status).toBe(400);
    expect((await api("post", `${w}/tasks`, alice.token, { title: "dup", assigneeIds: [dave.id, dave.id] })).body.data.task.assigneeIds).toHaveLength(1);
    expect((await api("post", `${w}/tasks`, alice.token, { title: " " })).status).toBe(400);
    expect((await api("get", `${w}/tasks/${ctx.task.id}`, outsider.token)).status).toBe(404);

    const edited = await api("patch", `${w}/tasks/${ctx.task.id}`, carol.token, { assigneeIds: [dave.id, carol.id] });
    expect(edited.body.data.task.assigneeIds).toHaveLength(2);
    expect(edited.body.data.task.assigneeIds).not.toContain(bob.id);
    const cleared = await api("patch", `${w}/tasks/${ctx.task.id}`, alice.token, { assigneeIds: [dave.id] });
    expect(cleared.body.data.task.assigneeIds).toEqual([dave.id]);
  });

  it("filters, searches and paginates", async () => {
    const w = `/workspaces/${workspaceId}`;
    const { alice, carol, dave } = people;
    const ids = async (query: string) => ((await api("get", `${w}/tasks?${query}`, alice.token)).body.data.result.tasks as any[]).map((t) => t.id);
    expect(await ids(`assignedTo=${dave.id}`)).toContain(ctx.task.id);
    expect(await ids(`assignedTo=${carol.id}`)).not.toContain(ctx.task.id);
    expect(await ids("search=hero")).toContain(ctx.task.id);
    expect((await api("get", `${w}/tasks?search=${encodeURIComponent("' OR 1=1; DROP TABLE tasks;--")}`, alice.token)).status).toBe(200);
    expect((await api("get", `${w}/tasks?projectId=${ctx.projectId}`, alice.token)).body.data.result.total).toBe(1);

    for (let i = 0; i < 22; i++) await api("post", `${w}/tasks`, alice.token, { title: `Bulk ${i}` });
    const page1 = (await api("get", `${w}/tasks?page=1&limit=20`, alice.token)).body.data.result;
    const page2 = (await api("get", `${w}/tasks?page=2&limit=20`, alice.token)).body.data.result;
    expect(page1.tasks).toHaveLength(20);
    expect(page1.totalPages).toBeGreaterThanOrEqual(2);
    expect(page2.tasks).toHaveLength(page1.total - 20);
    expect((await api("get", `${w}/tasks?limit=101`, alice.token)).status).toBe(400);
    expect((await api("get", `${w}/tasks?status=bogus`, alice.token)).status).toBe(400);
  });

  it("records assignee changes in the activity history", async () => {
    const activity = (await api("get", `/workspaces/${workspaceId}/tasks/${ctx.task.id}/activity`, people.alice.token)).body.data.activity as any[];
    const changes = activity.filter((a) => a.action === "assignee_changed");
    expect(changes).toHaveLength(2);
    expect(Array.isArray(changes[0].details.newValue)).toBe(true);
    expect(activity.some((a) => a.action === "created")).toBe(true);
  });

  it("blocks new tasks in an archived project", async () => {
    const w = `/workspaces/${workspaceId}`;
    await api("patch", `${w}/projects/${ctx.projectId}`, people.alice.token, { status: "archived" });
    const blocked = await api("post", `${w}/tasks`, people.alice.token, { title: "n", projectId: ctx.projectId });
    await api("patch", `${w}/projects/${ctx.projectId}`, people.alice.token, { status: "active" });
    expect(blocked.status).toBe(400);
  });
});

describe("comments", () => {
  it("lets only the author edit or delete", async () => {
    const base = `/workspaces/${workspaceId}/tasks/${ctx.task.id}/comments`;
    const { dave, carol, outsider } = people;
    const created = await api("post", base, dave.token, { content: "Looks good" });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    expect((await api("patch", `${base}/${id}`, carol.token, { content: "x" })).status).toBe(403);
    expect((await api("delete", `${base}/${id}`, carol.token)).status).toBe(403);
    expect((await api("patch", `${base}/${id}`, dave.token, { content: "Edited" })).status).toBe(200);
    expect((await api("post", base, dave.token, { content: " " })).status).toBe(400);
    expect([403, 404]).toContain((await api("post", base, outsider.token, { content: "hi" })).status);
  });
});

describe("notifications", () => {
  it("notifies the right people and never the actor", async () => {
    const { alice, dave, carol } = people;
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect((await notificationsOf(dave)).some((n) => n.type === "task_assigned")).toBe(true);
    expect((await notificationsOf(alice)).some((n) => n.type === "task_assigned")).toBe(false);
    expect((await notificationsOf(alice)).some((n) => n.type === "task_commented")).toBe(true);
    expect((await notificationsOf(dave)).some((n) => n.type === "task_commented" && n.actorId === dave.id)).toBe(false);

    const status = await api("patch", `/workspaces/${workspaceId}/tasks/${ctx.task.id}`, dave.token, { status: "in_progress" });
    expect(status.body.data.task.status).toBe("in_progress");
    expect((await notificationsOf(alice)).some((n) => n.type === "task_status_changed")).toBe(true);
    expect((await notificationsOf(dave)).some((n) => n.type === "task_status_changed")).toBe(false);

    expect((await api("get", "/notifications/unread-count", dave.token)).body.data.unreadCount).toBeGreaterThan(0);
    const unread = (await notificationsOf(dave)).find((n) => !n.isRead);
    expect((await api("patch", `/notifications/${unread.id}/read`, dave.token)).status).toBe(200);
    expect([403, 404]).toContain((await api("patch", `/notifications/${(await notificationsOf(dave))[0].id}/read`, carol.token)).status);
    await api("patch", "/notifications/read-all", dave.token);
    expect((await api("get", "/notifications/unread-count", dave.token)).body.data.unreadCount).toBe(0);
  });
});

describe("realtime", () => {
  it("pushes an assignment to the assignee's open WebSocket", async () => {
    const outcome = await new Promise<{ authenticated: boolean; event?: string }>((resolve) => {
      const socket = new WebSocket(wsUrl);
      let authenticated = false;
      const timer = setTimeout(() => { socket.close(); resolve({ authenticated }); }, 15_000);
      socket.on("open", () => socket.send(JSON.stringify({ type: "auth", accessToken: people.carol.token })));
      socket.on("message", async (raw) => {
        const message = JSON.parse(raw.toString());
        if (message.type === "auth.success") {
          authenticated = true;
          await api("post", `/workspaces/${workspaceId}/tasks`, people.alice.token, { title: "Live task", assigneeIds: [people.carol.id] });
        } else if (JSON.stringify(message).includes("task.assigned")) {
          clearTimeout(timer);
          socket.close();
          resolve({ authenticated, event: "task.assigned" });
        }
      });
      socket.on("error", () => { clearTimeout(timer); resolve({ authenticated }); });
    });
    expect(outcome.authenticated).toBe(true);
    expect(outcome.event).toBe("task.assigned");
  });

  it("closes sockets that never authenticate or use a bad token", async () => {
    const closeCode = (sendBadToken: boolean) => new Promise<number>((resolve) => {
      const socket = new WebSocket(wsUrl);
      const timer = setTimeout(() => resolve(-1), 9000);
      socket.on("open", () => { if (sendBadToken) socket.send(JSON.stringify({ type: "auth", accessToken: "bad" })); });
      socket.on("close", (code) => { clearTimeout(timer); resolve(code); });
    });
    expect(await closeCode(false)).toBe(1008);
    expect(await closeCode(true)).toBe(1008);
  }, 30_000);
});

describe("access removal and account security", () => {
  it("removes access immediately and keeps tasks when a project is deleted", async () => {
    const w = `/workspaces/${workspaceId}`;
    const { alice, carol } = people;
    expect((await api("delete", `${w}/members`, alice.token, { userId: carol.id })).status).toBe(200);
    expect((await api("get", `${w}/tasks`, carol.token)).status).toBe(404);
    expect((await api("delete", `${w}/projects/${ctx.projectId}`, alice.token)).status).toBe(200);
    const task = await api("get", `${w}/tasks/${ctx.task.id}`, alice.token);
    expect(task.status).toBe(200);
    expect(task.body.data.task.projectId).toBeNull();
  });

  it("revokes old tokens when the password changes", async () => {
    const { alice, bob } = people;
    const newPassword = "NewPassword456";
    expect((await api("patch", "/protected/me/password", alice.token, { currentPassword: "Nope12345", newPassword })).status).toBe(400);
    expect((await api("patch", "/protected/me/password", alice.token, { currentPassword: alicePassword, newPassword })).status).toBe(200);
    expect((await api("get", "/workspaces", alice.token)).status).toBe(401);
    expect((await api("post", "/auth/login", undefined, { email: alice.email, password: alicePassword })).status).toBe(401);
    const login = await api("post", "/auth/login", undefined, { email: alice.email, password: newPassword });
    expect(login.status).toBe(200);
    const fresh = JSON.stringify(login.body).match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/)![0];
    expect((await api("patch", "/protected/me", fresh, { name: "Alice", email: bob.email })).status).toBe(409);
  });
});
