#!/usr/bin/env bun

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { JsonlAuditSink } from "@/lib/wajib-operations/audit";
import { authenticateWajibAgent } from "@/lib/wajib-operations/auth";
import { ChangeSetStore } from "@/lib/wajib-operations/change-set";
import { SupabaseWajibDataAccess } from "@/lib/wajib-operations/data-access";
import { loadWajibMcpEnvironment } from "@/lib/wajib-operations/env";
import { toWajibOperationError } from "@/lib/wajib-operations/errors";
import { WajibOperations } from "@/lib/wajib-operations/service";
import { detectLocalTimeZone } from "@/lib/wajib-operations/timezone";
import { createWajibMcpServer } from "@/mcp/wajib/server";

const run = async () => {
  const environment = loadWajibMcpEnvironment();
  const { client, actor } = await authenticateWajibAgent(environment);
  const operations = new WajibOperations({
    data: new SupabaseWajibDataAccess(client, actor.id),
    audit: new JsonlAuditSink(environment.WAJIB_MCP_AUDIT_LOG_PATH),
    changeSets: new ChangeSetStore(),
    actorId: actor.id,
    target: environment.target,
    timeZone: detectLocalTimeZone(),
  });
  const server = createWajibMcpServer(operations);
  const transport = new StdioServerTransport();
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await server.close();
    await client.auth.signOut({ scope: "local" });
  };
  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
  await server.connect(transport);
};

run().catch((error) => {
  const mapped = toWajibOperationError(error);
  process.stderr.write(`[wajib-mcp] ${mapped.code}: ${mapped.message}\n`);
  process.exitCode = 1;
});
