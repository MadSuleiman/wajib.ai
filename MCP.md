# Local Wajib MCP

Wajib includes a private stdio MCP and plugin for ChatGPT Desktop. It signs in as a normal Wajib user, so the existing Supabase row-level security policies remain authoritative. There is no hosted MCP endpoint.

## Configure

1. Copy the variable names from `env.example` into `.env.local` and provide the production Supabase values plus a dedicated Wajib user email and password. The file is gitignored.
2. Run `python3 plugins/wajib/scripts/configure-local.py` from this repository. This records only the absolute repository path in `~/.config/wajib-plugin/repo-root`.
3. Add this repository marketplace with `codex plugin marketplace add /absolute/path/to/wajib.ai`, then install `wajib@wajib-local` in ChatGPT Desktop.
4. Restart ChatGPT Desktop and begin a new conversation. Call `wajib_status` before other Wajib operations.

The MCP writes redacted mutation metadata to `.local/wajib-mcp/audit.jsonl` by default. Never commit or expose that file.

## Develop and verify

Run `bun run check`, `bun test`, the plugin and skill validators, and MCP Inspector before reinstalling the plugin. The launcher always runs `bun --no-env-file mcp/wajib/index.ts`; the server itself reads only the five allowlisted variables from `.env` and `.env.local`.
