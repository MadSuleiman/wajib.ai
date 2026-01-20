import { z } from "zod";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { verifyMcpBearerToken } from "@/lib/mcp/auth";
import { getSupabaseClientForToken } from "@/lib/mcp/supabase";

export const runtime = "nodejs";

const handler = createMcpHandler(
  (server) => {
    const prioritySchema = z.enum(["low", "medium", "high"]);
    const urgencySchema = z.enum(["low", "medium", "high"]);
    const recurrenceSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

    const requireAccessToken = (token?: string) => {
      if (!token) {
        throw new Error("Unauthorized: missing access token.");
      }
      return token;
    };

    server.registerTool(
      "create_task",
      {
        title: "Create task",
        description: "Create a new one-off task for the authenticated user.",
        inputSchema: z.object({
          title: z.string().min(1),
          priority: prioritySchema.default("medium"),
          urgency: urgencySchema.default("medium"),
          estimated_hours: z.number().min(0).nullable().optional(),
          category: z.string().optional(),
        }),
      },
      async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);
        const title = input.title.trim();
        if (!title) {
          throw new Error("Title is required.");
        }

        const { data, error } = await supabase
          .from("tasks")
          .insert([
            {
              title,
              priority: input.priority,
              urgency: input.urgency,
              estimated_hours: input.estimated_hours ?? null,
              category: input.category?.trim() || "task",
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
      },
    );

    server.registerTool(
      "create_routine",
      {
        title: "Create routine",
        description: "Create a recurring routine for the authenticated user.",
        inputSchema: z.object({
          title: z.string().min(1),
          priority: prioritySchema.default("medium"),
          urgency: urgencySchema.default("medium"),
          estimated_hours: z.number().min(0).nullable().optional(),
          category: z.string().optional(),
          recurrence_type: recurrenceSchema,
          recurrence_interval: z.number().int().min(1).default(1),
        }),
      },
      async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);
        const title = input.title.trim();
        if (!title) {
          throw new Error("Title is required.");
        }

        const { data, error } = await supabase
          .from("routines")
          .insert([
            {
              title,
              priority: input.priority,
              urgency: input.urgency,
              estimated_hours: input.estimated_hours ?? null,
              category: input.category?.trim() || "task",
              recurrence_type: input.recurrence_type,
              recurrence_interval: input.recurrence_interval,
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
      },
    );

    server.registerTool(
      "list_tasks",
      {
        title: "List tasks",
        description: "List tasks for the authenticated user.",
        inputSchema: z.object({
          completed: z.boolean().optional(),
          category: z.string().optional(),
          priority: prioritySchema.optional(),
          urgency: urgencySchema.optional(),
          limit: z.number().int().min(1).max(200).default(50),
          order: z.enum(["asc", "desc"]).default("desc"),
        }),
      },
      async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);

        let query = supabase.from("tasks").select("*");
        if (typeof input.completed === "boolean") {
          query = query.eq("completed", input.completed);
        }
        if (input.category) {
          query = query.eq("category", input.category.trim());
        }
        if (input.priority) {
          query = query.eq("priority", input.priority);
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
      },
    );

    server.registerTool(
      "list_routines",
      {
        title: "List routines",
        description: "List routines for the authenticated user.",
        inputSchema: z.object({
          category: z.string().optional(),
          priority: prioritySchema.optional(),
          urgency: urgencySchema.optional(),
          recurrence_type: recurrenceSchema.optional(),
          limit: z.number().int().min(1).max(200).default(50),
          order: z.enum(["asc", "desc"]).default("desc"),
        }),
      },
      async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);

        let query = supabase.from("routines").select("*");
        if (input.category) {
          query = query.eq("category", input.category.trim());
        }
        if (input.priority) {
          query = query.eq("priority", input.priority);
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
      },
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
          priority: prioritySchema.optional(),
          urgency: urgencySchema.optional(),
          estimated_hours: z.number().min(0).nullable().optional(),
          category: z.string().optional(),
          completed: z.boolean().optional(),
        }),
      },
      async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);

        const updates: Record<string, unknown> = {};
        if (input.title) {
          const trimmedTitle = input.title.trim();
          if (!trimmedTitle) throw new Error("Title cannot be empty.");
          updates.title = trimmedTitle;
        }
        if (input.priority) updates.priority = input.priority;
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
      },
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
          priority: prioritySchema.optional(),
          urgency: urgencySchema.optional(),
          estimated_hours: z.number().min(0).nullable().optional(),
          category: z.string().optional(),
          recurrence_type: recurrenceSchema.optional(),
          recurrence_interval: z.number().int().min(1).optional(),
        }),
      },
      async (input, context) => {
        const accessToken = requireAccessToken(context.authInfo?.token);
        const supabase = getSupabaseClientForToken(accessToken);

        const updates: Record<string, unknown> = {};
        if (input.title) {
          const trimmedTitle = input.title.trim();
          if (!trimmedTitle) throw new Error("Title cannot be empty.");
          updates.title = trimmedTitle;
        }
        if (input.priority) updates.priority = input.priority;
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
      },
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
