import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { toWajibOperationError } from "@/lib/wajib-operations/errors";
import {
  applyChangeSetSchema,
  createItemSchema,
  createItemToolSchema,
  getItemSchema,
  getPreferencesSchema,
  listCategoriesSchema,
  listItemsSchema,
  listRoutineCompletionsSchema,
  listRoutineCompletionsToolSchema,
  previewChangeSchema,
  previewChangeToolSchema,
  setCompletionSchema,
  updateItemSchema,
  updatePreferencesSchema,
} from "@/lib/wajib-operations/schemas";
import type { WajibOperations } from "@/lib/wajib-operations/service";

const outputSchema = z.object({
  ok: z.boolean(),
  summary: z.string(),
  data: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
});

const READ = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;
const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;
const IDEMPOTENT_WRITE = { ...WRITE, idempotentHint: true } as const;
const DESTRUCTIVE_WRITE = { ...WRITE, destructiveHint: true } as const;

type HandlerResult = { summary: string; data: unknown };

export const createWajibMcpServer = (operations: WajibOperations) => {
  const server = new McpServer(
    { name: "wajib", version: "0.1.0" },
    {
      instructions:
        "Start with wajib_status. Search with wajib_list_items before exact reads and require exact UUIDs for writes. Categories are read-only. Show and obtain approval for direct writes. Deletion, conversion, and bulk mutation require wajib_preview_change, explicit approval of the returned preview, then wajib_apply_change_set. Change sets expire after ten minutes and are single-use. Re-read after every write. Never use SQL, a service-role key, or the local audit file.",
    },
  );

  const register = <Schema extends z.ZodType>(
    name: string,
    description: string,
    inputSchema: Schema,
    annotations: ToolAnnotations,
    handler: (input: z.infer<Schema>) => Promise<HandlerResult> | HandlerResult,
  ) => {
    const callback = async (input: unknown): Promise<CallToolResult> => {
      try {
        const result = await handler(input as z.infer<Schema>);
        const structuredContent = {
          ok: true,
          summary: result.summary,
          data: result.data,
        };
        return {
          content: [{ type: "text" as const, text: result.summary }],
          structuredContent,
        };
      } catch (error) {
        const mapped = toWajibOperationError(error);
        const structuredContent = {
          ok: false,
          summary: mapped.message,
          error: { code: mapped.code, message: mapped.message },
        };
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `${mapped.code}: ${mapped.message}`,
            },
          ],
          structuredContent,
        };
      }
    };
    server.registerTool(
      name,
      { description, inputSchema, outputSchema, annotations },
      callback as never,
    );
  };

  register(
    "wajib_status",
    "Report local authentication, target, Mac timezone, limits, and supported capabilities without exposing secrets.",
    z.object({}),
    READ,
    () => ({
      summary: "Wajib local MCP is authenticated and available.",
      data: operations.status(),
    }),
  );
  register(
    "wajib_list_items",
    "Search and filter tasks or routines with bounded pagination. Use this before fetching an exact UUID.",
    listItemsSchema,
    READ,
    async (input) => {
      const data = await operations.listItems(input);
      return { summary: `Found ${data.records.length} Wajib item(s).`, data };
    },
  );
  register(
    "wajib_get_item",
    "Fetch one exact task or routine by UUID and kind.",
    getItemSchema,
    READ,
    async (input) => ({
      summary: `Fetched ${input.kind} ${input.id}.`,
      data: await operations.getItem(input),
    }),
  );
  register(
    "wajib_list_categories",
    "List the existing shared Wajib categories. Categories are read-only through this MCP.",
    listCategoriesSchema,
    READ,
    async () => {
      const data = await operations.listCategories();
      return { summary: `Found ${data.categories.length} categories.`, data };
    },
  );
  register(
    "wajib_list_routine_completions",
    "List bounded completion history for one exact routine UUID and optional local date range.",
    listRoutineCompletionsToolSchema,
    READ,
    async (input) => {
      const data = await operations.listRoutineCompletions(
        listRoutineCompletionsSchema.parse(input),
      );
      return {
        summary: `Found ${data.completions.length} routine completion(s).`,
        data,
      };
    },
  );
  register(
    "wajib_get_preferences",
    "Read supported preferences for the authenticated Wajib user.",
    getPreferencesSchema,
    READ,
    async () => ({
      summary: "Fetched Wajib preferences.",
      data: await operations.getPreferences(),
    }),
  );
  register(
    "wajib_create_item",
    "Create one task or routine with an existing category slug after the proposed values are approved, then re-read it.",
    createItemToolSchema,
    WRITE,
    async (input) => {
      const parsed = createItemSchema.parse(input);
      return {
        summary: `Created and verified the ${parsed.kind}.`,
        data: await operations.createItem(parsed),
      };
    },
  );
  register(
    "wajib_update_item",
    "Update allowlisted fields on one exact task or routine UUID after approval, then re-read it. Use preview/apply for conversion.",
    updateItemSchema,
    IDEMPOTENT_WRITE,
    async (input) => ({
      summary: `Updated and verified ${input.kind} ${input.id}.`,
      data: await operations.updateItem(input),
    }),
  );
  register(
    "wajib_set_completion",
    "Set task completion or one routine completion on an exact local date after approval, then verify it.",
    setCompletionSchema,
    IDEMPOTENT_WRITE,
    async (input) => ({
      summary: `Set and verified completion for ${input.kind} ${input.id}.`,
      data: await operations.setCompletion(input),
    }),
  );
  register(
    "wajib_update_preferences",
    "Update supported Wajib user preferences after approval, then re-read them.",
    updatePreferencesSchema,
    IDEMPOTENT_WRITE,
    async (input) => ({
      summary: "Updated and verified Wajib preferences.",
      data: await operations.updatePreferences(input),
    }),
  );
  register(
    "wajib_preview_change",
    "Preview deletion, task/routine conversion, or a bounded bulk update/delete without mutating data. Returns a ten-minute single-use change set.",
    previewChangeToolSchema,
    READ,
    async (input) => ({
      summary: "Prepared a Wajib change set; review it before applying.",
      data: await operations.previewChange(previewChangeSchema.parse(input)),
    }),
  );
  register(
    "wajib_apply_change_set",
    "Apply one explicitly approved, unexpired Wajib delete, conversion, or bounded bulk change set.",
    applyChangeSetSchema,
    DESTRUCTIVE_WRITE,
    async (input) => ({
      summary: `Applied and verified change set ${input.change_set_id}.`,
      data: await operations.applyChangeSet(input),
    }),
  );

  return server;
};
