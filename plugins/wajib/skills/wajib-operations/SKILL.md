---
name: wajib-operations
description: Safely inspect and manage personal Wajib tasks, routines, completion history, categories, and preferences through the plugin-provided local wajib MCP. Use when requests involve finding, creating, updating, completing, deleting, converting, or bulk-changing Wajib items and require exact records, explicit write approval, guarded previews, or post-write verification.
---

# Wajib Operations

Use the plugin-provided `wajib` MCP as the only Wajib data-control surface. Never use SQL, a service-role key, another Supabase client, or the local audit file as a fallback.

## Preflight

1. Discover only `wajib_status` first if it is not already callable.
2. Call `wajib_status` before other Wajib tools. Stop if it fails or reports unauthenticated.
3. Treat production and any unrecognized target as production.
4. Discover only the smallest additional set of Wajib tools needed.

## Required Workflow

1. Search with `wajib_list_items` and allowlisted filters before an exact read. Do not infer a UUID from a title.
2. If zero or multiple records match, resolve that with the user. Fetch one item only with its exact UUID and kind.
3. Use `wajib_list_categories` before proposing a create or category change. Categories are read-only.
4. Before a direct write, state the target UUID when applicable, proposed fields, and before/after values; obtain explicit approval for that exact mutation.
5. Let the host present its write prompt. Never weaken, bypass, or replace it.
6. For delete, conversion, bulk update, or bulk delete, call `wajib_preview_change` first. Show the returned operation, records, fields, count, and expiry. Call `wajib_apply_change_set` only after explicit approval of that exact preview.
7. Re-read every affected exact record after a direct write. For a deletion, verify the exact UUID is absent. Report the verified result or stable error code.

## Safety Boundaries

- Change sets expire after ten minutes, are single-use, and become invalid on MCP restart. On `STALE_CHANGE_SET`, search and preview again.
- Bulk mutation is limited to 50 records of one kind and must use exact IDs or one nonempty filter. Never silently truncate.
- On `AMBIGUOUS_MATCH`, ask the user to choose. On `NOT_FOUND`, search again. On `RLS_DENIED`, do not retry with other credentials.
- On `PARTIAL_WRITE`, stop and inspect the involved exact UUIDs before proposing recovery.
- Never expose credentials, tokens, user IDs beyond the status actor UUID, or `.local/wajib-mcp/audit.jsonl`.
