import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "dotenv";
import { z } from "zod";

export const WAJIB_MCP_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "WAJIB_AGENT_EMAIL",
  "WAJIB_AGENT_PASSWORD",
  "WAJIB_MCP_AUDIT_LOG_PATH",
] as const;

const environmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  WAJIB_AGENT_EMAIL: z.string().email(),
  WAJIB_AGENT_PASSWORD: z.string().min(1),
  WAJIB_MCP_AUDIT_LOG_PATH: z
    .string()
    .min(1)
    .default(".local/wajib-mcp/audit.jsonl"),
});

export type WajibMcpEnvironment = z.infer<typeof environmentSchema> & {
  target: "local" | "production";
};

const readParsedFile = (path: string) => {
  try {
    return parse(readFileSync(path));
  } catch {
    return {};
  }
};

export const loadWajibMcpEnvironment = (
  cwd = process.cwd(),
  inherited: NodeJS.ProcessEnv = process.env,
) => {
  const merged: Record<string, string | undefined> = {
    ...readParsedFile(resolve(cwd, ".env")),
    ...readParsedFile(resolve(cwd, ".env.local")),
    ...inherited,
  };
  const allowlisted = Object.fromEntries(
    WAJIB_MCP_ENV_KEYS.map((key) => [key, merged[key]]).filter(
      ([, value]) => typeof value === "string" && value.length > 0,
    ),
  );
  const parsed = environmentSchema.parse(allowlisted);
  const hostname = new URL(parsed.NEXT_PUBLIC_SUPABASE_URL).hostname;
  const target = ["localhost", "127.0.0.1", "::1"].includes(hostname)
    ? "local"
    : "production";

  return {
    ...parsed,
    WAJIB_MCP_AUDIT_LOG_PATH: resolve(cwd, parsed.WAJIB_MCP_AUDIT_LOG_PATH),
    target,
  } satisfies WajibMcpEnvironment;
};
