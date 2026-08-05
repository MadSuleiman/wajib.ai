import { z } from "zod";

export const itemKindSchema = z.enum(["task", "routine"]);
export const prioritySchema = z.enum(["low", "medium", "high"]);
export const recurrenceSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);
export const uuidSchema = z.string().uuid();
export const dayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an exact YYYY-MM-DD local date.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Use a real calendar date.");

export const itemFilterSchema = z
  .object({
    query: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    value: prioritySchema.optional(),
    urgency: prioritySchema.optional(),
    completed: z.boolean().optional(),
    recurrence_type: recurrenceSchema.optional(),
  })
  .strict();

export const listItemsSchema = itemFilterSchema.extend({
  kind: itemKindSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(500).default(0),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const getItemSchema = z.object({
  kind: itemKindSchema,
  id: uuidSchema,
});

export const listCategoriesSchema = z.object({});

export const listRoutineCompletionsSchema = z
  .object({
    routine_id: uuidSchema,
    start_date: dayKeySchema.optional(),
    end_date: dayKeySchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .refine(
    (input) =>
      !input.start_date ||
      !input.end_date ||
      input.start_date <= input.end_date,
    "start_date must not be after end_date.",
  );

export const getPreferencesSchema = z.object({});

const commonCreateFields = {
  title: z.string().trim().min(1).max(500),
  value: prioritySchema.default("medium"),
  urgency: prioritySchema.default("medium"),
  estimated_hours: z.number().min(0).max(10000).nullable().default(null),
  category: z.string().trim().min(1).max(80),
};

// The MCP SDK currently emits an empty JSON Schema for top-level Zod effects
// and discriminated unions. Keep the stricter schemas below for runtime
// validation, and expose these plain-object equivalents for tool discovery.
const toolDayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an exact YYYY-MM-DD local date.");

export const listRoutineCompletionsToolSchema = z.object({
  routine_id: uuidSchema,
  start_date: toolDayKeySchema.optional(),
  end_date: toolDayKeySchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const createItemToolSchema = z.object({
  kind: itemKindSchema,
  ...commonCreateFields,
  completed: z.boolean().optional(),
  recurrence_type: recurrenceSchema.optional(),
  recurrence_interval: z.number().int().min(1).max(365).optional(),
});

export const createItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("task"),
    ...commonCreateFields,
    completed: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("routine"),
    ...commonCreateFields,
    recurrence_type: recurrenceSchema,
    recurrence_interval: z.number().int().min(1).max(365).default(1),
  }),
]);

export const itemUpdatesSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    value: prioritySchema.optional(),
    urgency: prioritySchema.optional(),
    estimated_hours: z.number().min(0).max(10000).nullable().optional(),
    category: z.string().trim().min(1).max(80).optional(),
    recurrence_type: recurrenceSchema.optional(),
    recurrence_interval: z.number().int().min(1).max(365).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide an update field.");

const itemUpdatesToolSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    value: prioritySchema.optional(),
    urgency: prioritySchema.optional(),
    estimated_hours: z.number().min(0).max(10000).nullable().optional(),
    category: z.string().trim().min(1).max(80).optional(),
    recurrence_type: recurrenceSchema.optional(),
    recurrence_interval: z.number().int().min(1).max(365).optional(),
  })
  .strict();

export const updateItemSchema = z.object({
  kind: itemKindSchema,
  id: uuidSchema,
  updates: itemUpdatesSchema,
});

export const setCompletionSchema = z.object({
  kind: itemKindSchema,
  id: uuidSchema,
  completed: z.boolean(),
  date: dayKeySchema.optional(),
});

export const updatePreferencesSchema = z.object({
  daily_highlight_enabled: z.boolean(),
});

const boundedIdsSchema = z.array(uuidSchema).min(1).max(50);

const bulkSelectionFields = {
  ids: boundedIdsSchema.optional(),
  filter: itemFilterSchema.optional(),
};

export const previewChangeSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("delete"),
    kind: itemKindSchema,
    ids: boundedIdsSchema,
  }),
  z.object({
    operation: z.literal("bulk_update"),
    kind: itemKindSchema,
    ...bulkSelectionFields,
    updates: itemUpdatesSchema,
  }),
  z.object({
    operation: z.literal("bulk_delete"),
    kind: itemKindSchema,
    ...bulkSelectionFields,
  }),
  z.object({
    operation: z.literal("convert"),
    source_kind: itemKindSchema,
    id: uuidSchema,
    target_recurrence_type: recurrenceSchema.optional(),
    target_recurrence_interval: z.number().int().min(1).max(365).optional(),
  }),
]);

export const previewChangeToolSchema = z.object({
  operation: z.enum(["delete", "bulk_update", "bulk_delete", "convert"]),
  kind: itemKindSchema.optional(),
  ids: boundedIdsSchema.optional(),
  filter: itemFilterSchema.optional(),
  updates: itemUpdatesToolSchema.optional(),
  source_kind: itemKindSchema.optional(),
  id: uuidSchema.optional(),
  target_recurrence_type: recurrenceSchema.optional(),
  target_recurrence_interval: z.number().int().min(1).max(365).optional(),
});

export const applyChangeSetSchema = z.object({
  change_set_id: uuidSchema,
});

export type ItemFilterInput = z.infer<typeof itemFilterSchema>;
export type ListItemsInput = z.infer<typeof listItemsSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type ItemUpdates = z.infer<typeof itemUpdatesSchema>;
export type PreviewChangeInput = z.infer<typeof previewChangeSchema>;
