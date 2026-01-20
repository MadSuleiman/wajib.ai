import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

const authServerUrls = [process.env.SUPABASE_AUTH_ISSUER].filter(
  (value): value is string => Boolean(value),
);

const handler =
  authServerUrls.length > 0
    ? protectedResourceHandler({ authServerUrls })
    : () =>
        new Response("Missing SUPABASE_AUTH_ISSUER configuration.", {
          status: 500,
        });

const optionsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, optionsHandler as OPTIONS };
