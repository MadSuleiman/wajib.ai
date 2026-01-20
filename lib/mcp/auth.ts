import { createClient } from "@supabase/supabase-js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

const getSupabaseAuthClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const parseScopes = (claims: Record<string, unknown> | null): string[] => {
  if (!claims) return [];
  const scopesClaim = claims.scope ?? claims.scopes;
  if (typeof scopesClaim === "string") {
    return scopesClaim.split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(scopesClaim)) {
    return scopesClaim.filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    );
  }
  return [];
};

export const verifyMcpBearerToken = async (
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  const supabase = getSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser(bearerToken);

  if (error || !data?.user) return undefined;

  const claims = decodeJwtPayload(bearerToken);
  const issuer = process.env.SUPABASE_AUTH_ISSUER;

  if (issuer && claims?.iss && claims.iss !== issuer) {
    return undefined;
  }

  const userId = typeof claims?.sub === "string" ? claims.sub : data.user.id;
  const clientId =
    typeof claims?.client_id === "string" ? claims.client_id : userId;

  return {
    token: bearerToken,
    clientId,
    scopes: parseScopes(claims),
    extra: {
      userId,
    },
  };
};
