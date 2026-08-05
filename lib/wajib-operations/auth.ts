import { createClient, type AuthError, type User } from "@supabase/supabase-js";

import type { WajibMcpEnvironment } from "./env";
import { WajibOperationError } from "./errors";

export const requireAuthenticatedActor = (
  user: User | null,
  error: AuthError | null,
) => {
  if (error || !user?.id) {
    throw new WajibOperationError("AUTH_REQUIRED");
  }
  return user;
};

export const authenticateWajibAgent = async (
  environment: WajibMcpEnvironment,
) => {
  const client = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email: environment.WAJIB_AGENT_EMAIL,
    password: environment.WAJIB_AGENT_PASSWORD,
  });
  return { client, actor: requireAuthenticatedActor(data.user, error) };
};
