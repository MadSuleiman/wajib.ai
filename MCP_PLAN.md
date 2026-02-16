# MCP Server Plan (Wajib)

Date: 2026-01-19

## Goal

Integrate MCP support into this **existing Next.js app** so AI clients (ChatGPT + others) can create/read/update tasks and routines **as the authenticated user**, with Supabase RLS enforced exactly like the web app.

## Non-Goals (v1)

- No agentic scheduling, multi-step workflows, or background jobs.
- No advanced natural language parsing beyond MCP tool arguments.
- No multi-tenant admin or team sharing.

## High-Level Approach

- Add an MCP route to this app at `app/api/mcp/route.ts` using the Vercel `mcp-handler` package.
- Implement **OAuth 2.1** with the existing Supabase project so the MCP client obtains a **user JWT**.
- MCP handler verifies JWT, then uses it to call Supabase (RLS enforced).
- Expose tools: `create_task`, `create_routine`, `list_tasks`, `list_routines`, `update_task`, `update_routine`.

## Architecture

```
Client (ChatGPT / MCP client)
  -> OAuth 2.1 login (Supabase OAuth server)
  <- Access token (user JWT)
  -> MCP tool call + Authorization: Bearer <user JWT>
Next.js MCP Route (app/api/mcp/route.ts)
  -> verify JWT (issuer/aud/exp/scopes)
  -> Supabase calls with user JWT
Supabase
  -> RLS applies
```

## Deliverables

- `app/api/mcp/route.ts` MCP endpoint integrated into this app
- `app/oauth/consent/page.tsx` user-visible OAuth consent UI
- OAuth 2.1 integration (Supabase OAuth Server)
- JWT verification middleware (JWKS fetch + cache)
- Tool handlers:
  - `create_task`
  - `create_routine`
  - `list_tasks`
  - `list_routines`
  - `update_task`
  - `update_routine`
- Tool discovery uses MCP’s standard list-tools mechanism with descriptions + JSON schemas.
- Basic observability (structured logs, request IDs)

## Data Model References

- Tasks table: `tasks`
- Routines table: `routines`
- Types: `types/supabase.ts`

---

# Task Plan

## Phase 0 — Discovery & Decisions

1. Confirm deployment target (Vercel).
2. Confirm OAuth provider (Supabase OAuth Server).
3. Finalize tool surface (v1: create + read + update vs full CRUD).

## Phase 1 — MCP Server Scaffold

1. Add MCP handler dependency and wiring.
2. Implement MCP route at `app/api/mcp/route.ts`.
3. Add health check endpoint `/api/health`.

## Phase 2 — Auth & Security

1. Configure OAuth client in Supabase (redirect URI for this app).
2. Implement OAuth callback flow to obtain access token.
3. Store or pass through access token to MCP client (depends on MCP client flow).
4. Add JWT verification middleware:
   - Validate signature with JWKS
   - Validate `iss`, `aud`, `exp`
   - Validate scopes (e.g., `tasks.write`)

## Phase 3 — Supabase Integration

1. Create helper for Supabase client that injects `Authorization: Bearer <user_jwt>`.
2. Implement `create_task` tool handler:
   - Insert into `tasks`
   - Return created record
3. Implement `create_routine` tool handler:
   - Insert into `routines`
   - Return created record
4. Implement `list_tasks` tool handler:
   - Select from `tasks` with filters (completed, category, value)
   - Return list
5. Implement `list_routines` tool handler:
   - Select from `routines` with filters (recurrence_type, category, value)
   - Return list
6. Implement `update_task` tool handler:
   - Update task fields (title, value, urgency, estimated_hours, category, completed)
   - Return updated record
7. Implement `update_routine` tool handler:
   - Update routine fields (title, value, urgency, estimated_hours, category, recurrence_type, recurrence_interval)
   - Return updated record
8. Add error mapping (user-friendly MCP errors).

## Phase 4 — Testing & Hardening

1. Add unit tests for JWT validation.
2. Add integration tests for MCP tool calls (mock Supabase).
3. Validate RLS behavior with real Supabase project.
4. Add rate limiting + request size limits.

## Phase 5 — Deployment (Vercel Path)

1. Use Vercel MCP deployment guide with `mcp-handler` and `app/api/mcp/route.ts`.
2. Configure environment variables (Supabase URL, JWKS, OAuth client ID/secret).
3. Deploy to Vercel and verify OAuth + tool calls with a test MCP client.
4. Register MCP server in ChatGPT and test end-to-end.

## Deployment Notes (Vercel)

- MCP tools here are short, synchronous calls (create/list/update).
- No streaming needed for v1.

## Env Vars (Server)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_AUTH_ISSUER` (e.g., `https://<project-ref>.supabase.co/auth/v1`)

---

# Decisions

- v1 tools: create/read/update only (no delete).
- User-visible “Connect AI” OAuth consent page.
