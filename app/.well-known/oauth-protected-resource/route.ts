import {
  generateProtectedResourceMetadata,
  getPublicOrigin,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";
import { NextResponse } from "next/server";

const authServerUrls = [process.env.SUPABASE_AUTH_ISSUER].filter(
  (value): value is string => Boolean(value),
);

const scopesSupported = [
  "tasks.read",
  "tasks.write",
  "routines.read",
  "routines.write",
];

export function GET(req: Request) {
  if (authServerUrls.length === 0) {
    return new Response("Missing SUPABASE_AUTH_ISSUER configuration.", {
      status: 500,
    });
  }

  const resourceUrl = getPublicOrigin(req);
  const metadata = generateProtectedResourceMetadata({
    authServerUrls,
    resourceUrl,
    additionalMetadata: {
      scopes_supported: scopesSupported,
    },
  });

  return NextResponse.json(metadata);
}

const optionsHandler = metadataCorsOptionsRequestHandler();

export { optionsHandler as OPTIONS };
