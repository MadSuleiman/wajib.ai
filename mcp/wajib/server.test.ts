import { afterEach, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createWajibMcpServer } from "./server";
import type { WajibOperations } from "@/lib/wajib-operations/service";

const openConnections: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(
    openConnections.splice(0).map((connection) => connection.close()),
  );
});

describe("Wajib MCP server", () => {
  test("publishes the exact planned tool surface and structured status", async () => {
    const operations = {
      status: () => ({
        transport: "local",
        authenticated: true,
        actor_id: "actor",
        target: "production",
        time_zone: "America/Los_Angeles",
      }),
    } as WajibOperations;
    const server = createWajibMcpServer(operations);
    const client = new Client({ name: "wajib-test", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    openConnections.push(client, server);
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual(
      [
        "wajib_apply_change_set",
        "wajib_create_item",
        "wajib_get_item",
        "wajib_get_preferences",
        "wajib_list_categories",
        "wajib_list_items",
        "wajib_list_routine_completions",
        "wajib_preview_change",
        "wajib_set_completion",
        "wajib_status",
        "wajib_update_item",
        "wajib_update_preferences",
      ].sort(),
    );
    const toolSchemas = Object.fromEntries(
      tools.tools.map((tool) => [tool.name, tool.inputSchema]),
    );
    expect(toolSchemas.wajib_create_item).toMatchObject({
      type: "object",
      required: ["kind", "title", "category"],
      properties: {
        kind: expect.any(Object),
        title: expect.any(Object),
        recurrence_type: expect.any(Object),
      },
    });
    expect(toolSchemas.wajib_list_routine_completions).toMatchObject({
      type: "object",
      required: ["routine_id"],
      properties: {
        routine_id: expect.any(Object),
        start_date: expect.any(Object),
      },
    });
    expect(toolSchemas.wajib_preview_change).toMatchObject({
      type: "object",
      required: ["operation"],
      properties: {
        operation: expect.any(Object),
        ids: expect.any(Object),
        filter: expect.any(Object),
        updates: expect.any(Object),
      },
    });
    const result = await client.callTool({
      name: "wajib_status",
      arguments: {},
    });
    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: { transport: "local", authenticated: true },
    });
  });
});
