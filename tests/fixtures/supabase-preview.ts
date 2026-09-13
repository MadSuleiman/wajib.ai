// Local UI verification fixture. No connection to production or private records.
const userId = "00000000-0000-4000-8000-000000000001";
const created = new Date().toISOString();
const user = {
  id: userId,
  aud: "authenticated",
  role: "authenticated",
  email: "brand-preview@example.test",
  email_confirmed_at: created,
  created_at: created,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
};
const accessToken =
  [
    { alg: "HS256", typ: "JWT" },
    {
      sub: userId,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
    },
  ]
    .map((part) => Buffer.from(JSON.stringify(part)).toString("base64url"))
    .join(".") + ".local-preview-signature";
const session = {
  access_token: accessToken,
  refresh_token: "local-preview-refresh",
  token_type: "bearer",
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  user,
};
type Row = Record<string, unknown>;
const base = {
  created_at: created,
  user_id: userId,
  value: "medium",
  urgency: "medium",
  estimated_hours: 0.5,
  category: "personal",
};
const tables: Record<string, Row[]> = {
  tasks: [
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000011",
      title: "Plan the day",
      completed: false,
      value: "high",
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000012",
      title: "Make time for a personal project",
      completed: false,
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000013",
      title: "Clear a little space",
      completed: true,
    },
  ],
  routines: [
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000021",
      title: "Read 20 minutes",
      recurrence_type: "daily",
      recurrence_interval: 1,
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000022",
      title: "Evening reset",
      recurrence_type: "daily",
      recurrence_interval: 1,
    },
  ],
  categories: [
    {
      slug: "personal",
      label: "Personal",
      description: "Personal tasks",
      color: "#748664",
    },
  ],
  routine_logs: [],
  user_preferences: [{ user_id: userId, daily_highlight_enabled: true }],
};
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Range",
  "Content-Type": "application/json",
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: cors });
}
function matches(row: Row, url: URL) {
  return [...url.searchParams].every(
    ([key, value]) =>
      !value.startsWith("eq.") || String(row[key]) === value.slice(3),
  );
}
Bun.serve({
  hostname: "127.0.0.1",
  port: 54329,
  async fetch(request, server) {
    const url = new URL(request.url);
    if (request.headers.get("upgrade") === "websocket") {
      if (server.upgrade(request)) return;
    }
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (url.pathname.includes("/auth/v1/token")) return json(session);
    if (url.pathname.includes("/auth/v1/user")) return json(user);
    if (url.pathname.includes("/auth/v1/logout"))
      return new Response(null, { status: 204, headers: cors });
    const table = url.pathname.split("/rest/v1/")[1];
    if (!table) return json({ ok: true });
    const rows = tables[table] ?? [];
    let result = rows.filter((row) => matches(row, url));
    if (request.method === "POST") {
      const input = await request.json();
      result = (Array.isArray(input) ? input : [input]).map((row) => ({
        ...base,
        id: crypto.randomUUID(),
        ...row,
      }));
      if (table === "user_preferences") tables[table] = result;
      else tables[table] = [...rows, ...result];
    } else if (request.method === "PATCH") {
      const input = await request.json();
      result.forEach((row) => Object.assign(row, input));
    } else if (request.method === "DELETE") {
      tables[table] = rows.filter((row) => !matches(row, url));
    }
    const single = request.headers.get("accept")?.includes("vnd.pgrst.object");
    return json(single ? (result[0] ?? null) : result);
  },
  websocket: {
    message(ws, message) {
      const data = JSON.parse(String(message));
      ws.send(
        JSON.stringify({
          topic: data.topic,
          event: "phx_reply",
          ref: data.ref,
          payload: { status: "ok", response: { postgres_changes: [] } },
        }),
      );
    },
  },
});
console.log("Local synthetic Supabase fixture: http://127.0.0.1:54329");
