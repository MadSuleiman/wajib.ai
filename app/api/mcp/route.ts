import { z } from "zod";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { verifyMcpBearerToken } from "@/lib/mcp/auth";
import { getSupabaseClientForToken } from "@/lib/mcp/supabase";

export const runtime = "nodejs";

type ErrorRecord = Record<string, unknown>;

const isErrorRecord = (value: unknown): value is ErrorRecord =>
  typeof value === "object" && value !== null;

const safeJsonStringify = (value: unknown) => {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, currentValue) => {
    if (typeof currentValue === "object" && currentValue !== null) {
      if (seen.has(currentValue)) return "[Circular]";
      seen.add(currentValue);
    }
    if (currentValue instanceof Error) {
      return {
        name: currentValue.name,
        message: currentValue.message,
      };
    }
    return currentValue;
  });
};

const extractErrorStatus = (error: ErrorRecord) => {
  const directStatus =
    typeof error.status === "number"
      ? error.status
      : typeof error.statusCode === "number"
        ? error.statusCode
        : undefined;
  if (typeof directStatus === "number") return directStatus;

  const response = isErrorRecord(error.response) ? error.response : undefined;
  if (response && typeof response.status === "number") {
    return response.status;
  }

  return undefined;
};

const normalizeToolError = (error: unknown) => {
  const normalized: ErrorRecord = {};

  if (error instanceof Error) {
    normalized.message = error.message || "Unexpected error";
  } else if (typeof error === "string") {
    normalized.message = error;
  } else if (isErrorRecord(error)) {
    const candidateMessage =
      (typeof error.message === "string" && error.message) ||
      (typeof error.error === "string" && error.error) ||
      (typeof error.error_description === "string" &&
        error.error_description) ||
      "";
    normalized.message = candidateMessage || "Unexpected error";

    const status = extractErrorStatus(error);
    if (typeof status === "number") {
      normalized.status = status;
    }
    if (typeof error.code === "string" && error.code) {
      normalized.code = error.code;
    }
    if (typeof error.details === "string" && error.details) {
      normalized.details = error.details;
    }
    if (typeof error.hint === "string" && error.hint) {
      normalized.hint = error.hint;
    }

    const response = isErrorRecord(error.response) ? error.response : undefined;
    const responseBody =
      response?.body ?? response?.data ?? response?.error ?? error.body;
    if (typeof responseBody !== "undefined") {
      normalized.body = responseBody;
    }
  } else {
    normalized.message = "Unexpected error";
  }

  return normalized;
};

type ToolHandler<TInput = unknown, TContext = unknown, TResult = unknown> = (
  input: TInput,
  context: TContext,
) => Promise<TResult>;

const withToolErrorHandling = <TInput, TContext, TResult>(
  toolName: string,
  handler: ToolHandler<TInput, TContext, TResult>,
): ToolHandler<TInput, TContext, TResult> => {
  return async (input, context) => {
    try {
      return await handler(input, context);
    } catch (error: unknown) {
      const normalized = normalizeToolError(error);
      throw new Error(
        safeJsonStringify({
          error: {
            tool: toolName,
            ...normalized,
          },
        }),
      );
    }
  };
};

const handler = createMcpHandler(
  (server) => {
    const valueSchema = z.enum(["low", "medium", "high"]);
    const urgencySchema = z.enum(["low", "medium", "high"]);
    const recurrenceSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

    const requireAccessToken = (token?: string) => {
      if (!token) {
        throw new Error("Unauthorized: missing access token.");
      }
      return token;
    };

    const requireUserId = async (
      supabase: ReturnType<typeof getSupabaseClientForToken>,
    ) => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }
      if (!user?.id) {
        throw {
          message: "Unauthorized: missing authenticated user.",
          status: 401,
        };
      }
      return user.id;
    };

    server.registerTool(
      "create_task",
      {
        title: "Create task",
        description: "Create a new one-off task for the authenticated user.",
        inputSchema: z.object({
          title: z.string().min(1),
          value: valueSchema.optional(),
          priority: valueSchema.optional(),
          urgency: urgencySchema.default("medium"),
          estimated_hours: z.number().min(0).nullable().optional(),
          category: z.string().optional(),
        }),
      },
      withToolErrorHandling("create_task", async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);
        const userId = await requireUserId(supabase);
        const title = input.title.trim();
        const value = input.value ?? input.priority ?? "medium";
        const urgency = input.urgency ?? "medium";
        const category = input.category?.trim() || "task";
        if (!title) {
          throw new Error("Title is required.");
        }

        const { data, error } = await supabase
          .from("tasks")
          .insert([
            {
              title,
              value,
              urgency,
              estimated_hours: input.estimated_hours ?? null,
              category,
              user_id: userId,
              completed: false,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ task: data }),
            },
          ],
        };
      }),
    );

    server.registerTool(
      "create_routine",
      {
        title: "Create routine",
        description: "Create a recurring routine for the authenticated user.",
        inputSchema: z.object({
          title: z.string().min(1),
          value: valueSchema.optional(),
          priority: valueSchema.optional(),
          urgency: urgencySchema.default("medium"),
          estimated_hours: z.number().min(0).nullable().optional(),
          category: z.string().optional(),
          recurrence_type: recurrenceSchema,
          recurrence_interval: z.number().int().min(1).default(1),
        }),
      },
      withToolErrorHandling("create_routine", async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);
        const userId = await requireUserId(supabase);
        const title = input.title.trim();
        const value = input.value ?? input.priority ?? "medium";
        const urgency = input.urgency ?? "medium";
        const category = input.category?.trim() || "task";
        const recurrenceInterval = input.recurrence_interval ?? 1;
        if (!title) {
          throw new Error("Title is required.");
        }

        const { data, error } = await supabase
          .from("routines")
          .insert([
            {
              title,
              value,
              urgency,
              estimated_hours: input.estimated_hours ?? null,
              category,
              user_id: userId,
              recurrence_type: input.recurrence_type,
              recurrence_interval: recurrenceInterval,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ routine: data }),
            },
          ],
        };
      }),
    );

    server.registerTool(
      "list_tasks",
      {
        title: "List tasks",
        description: "List tasks for the authenticated user.",
        inputSchema: z.object({
          completed: z.boolean().optional(),
          category: z.string().optional(),
          value: valueSchema.optional(),
          priority: valueSchema.optional(),
          urgency: urgencySchema.optional(),
          limit: z.number().int().min(1).max(200).default(50),
          order: z.enum(["asc", "desc"]).default("desc"),
        }),
      },
      withToolErrorHandling("list_tasks", async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);

        let query = supabase.from("tasks").select("*");
        if (typeof input.completed === "boolean") {
          query = query.eq("completed", input.completed);
        }
        if (input.category) {
          query = query.eq("category", input.category.trim());
        }
        const value = input.value ?? input.priority;
        if (value) {
          query = query.eq("value", value);
        }
        if (input.urgency) {
          query = query.eq("urgency", input.urgency);
        }

        const { data, error } = await query
          .order("created_at", { ascending: input.order === "asc" })
          .limit(input.limit);

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ tasks: data }),
            },
          ],
        };
      }),
    );

    server.registerTool(
      "list_routines",
      {
        title: "List routines",
        description: "List routines for the authenticated user.",
        inputSchema: z.object({
          category: z.string().optional(),
          value: valueSchema.optional(),
          priority: valueSchema.optional(),
          urgency: urgencySchema.optional(),
          recurrence_type: recurrenceSchema.optional(),
          limit: z.number().int().min(1).max(200).default(50),
          order: z.enum(["asc", "desc"]).default("desc"),
        }),
      },
      withToolErrorHandling("list_routines", async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);

        let query = supabase.from("routines").select("*");
        if (input.category) {
          query = query.eq("category", input.category.trim());
        }
        const value = input.value ?? input.priority;
        if (value) {
          query = query.eq("value", value);
        }
        if (input.urgency) {
          query = query.eq("urgency", input.urgency);
        }
        if (input.recurrence_type) {
          query = query.eq("recurrence_type", input.recurrence_type);
        }

        const { data, error } = await query
          .order("created_at", { ascending: input.order === "asc" })
          .limit(input.limit);

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ routines: data }),
            },
          ],
        };
      }),
    );

    server.registerTool(
      "update_task",
      {
        title: "Update task",
        description:
          "Update fields on a task for the authenticated user by task ID.",
        inputSchema: z.object({
          id: z.string().min(1),
          title: z.string().min(1).optional(),
          value: valueSchema.optional(),
          priority: valueSchema.optional(),
          urgency: urgencySchema.optional(),
          estimated_hours: z.number().min(0).nullable().optional(),
          category: z.string().optional(),
          completed: z.boolean().optional(),
        }),
      },
      withToolErrorHandling("update_task", async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);

        const updates: Record<string, unknown> = {};
        if (input.title) {
          const trimmedTitle = input.title.trim();
          if (!trimmedTitle) throw new Error("Title cannot be empty.");
          updates.title = trimmedTitle;
        }
        const value = input.value ?? input.priority;
        if (value) updates.value = value;
        if (input.urgency) updates.urgency = input.urgency;
        if (typeof input.estimated_hours !== "undefined") {
          updates.estimated_hours = input.estimated_hours;
        }
        if (input.category) updates.category = input.category.trim();
        if (typeof input.completed === "boolean") {
          updates.completed = input.completed;
        }

        if (Object.keys(updates).length === 0) {
          throw new Error("No updates provided.");
        }

        const { data, error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", input.id)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ task: data }),
            },
          ],
        };
      }),
    );

    server.registerTool(
      "update_routine",
      {
        title: "Update routine",
        description:
          "Update fields on a routine for the authenticated user by routine ID.",
        inputSchema: z.object({
          id: z.string().min(1),
          title: z.string().min(1).optional(),
          value: valueSchema.optional(),
          priority: valueSchema.optional(),
          urgency: urgencySchema.optional(),
          estimated_hours: z.number().min(0).nullable().optional(),
          category: z.string().optional(),
          recurrence_type: recurrenceSchema.optional(),
          recurrence_interval: z.number().int().min(1).optional(),
        }),
      },
      withToolErrorHandling("update_routine", async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);

        const updates: Record<string, unknown> = {};
        if (input.title) {
          const trimmedTitle = input.title.trim();
          if (!trimmedTitle) throw new Error("Title cannot be empty.");
          updates.title = trimmedTitle;
        }
        const value = input.value ?? input.priority;
        if (value) updates.value = value;
        if (input.urgency) updates.urgency = input.urgency;
        if (typeof input.estimated_hours !== "undefined") {
          updates.estimated_hours = input.estimated_hours;
        }
        if (input.category) updates.category = input.category.trim();
        if (input.recurrence_type) {
          updates.recurrence_type = input.recurrence_type;
        }
        if (input.recurrence_interval) {
          updates.recurrence_interval = input.recurrence_interval;
        }

        if (Object.keys(updates).length === 0) {
          throw new Error("No updates provided.");
        }

        const { data, error } = await supabase
          .from("routines")
          .update(updates)
          .eq("id", input.id)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ routine: data }),
            },
          ],
        };
      }),
    );
  },
  {},
  {
    basePath: "/api",
  },
);

const authedHandler = withMcpAuth(handler, verifyMcpBearerToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
