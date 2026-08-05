import { createHash } from "node:crypto";

import type { ItemKind } from "@/types";
import type { AuditEvent, AuditSink } from "./audit";
import type { ChangeSet, ChangeSetStore } from "./change-set";
import type { SafeItem, WajibDataAccess } from "./data-access";
import {
  toWajibOperationError,
  WajibOperationError,
  type WajibOperationErrorCode,
} from "./errors";
import type {
  CreateItemInput,
  ItemFilterInput,
  ItemUpdates,
  ListItemsInput,
  PreviewChangeInput,
} from "./schemas";
import { dateToDayKey, getRoutinePeriodForDay, parseDayKey } from "./timezone";

const BULK_LIMIT = 50;

type MutationMeta = {
  tool: string;
  operation: string;
  entityKind: AuditEvent["entityKind"];
  recordIds: string[];
  changedFields: string[];
  changeSetId?: string;
};

type ChangePayload =
  | { operation: "delete" | "bulk_delete"; kind: ItemKind; ids: string[] }
  | {
      operation: "bulk_update";
      kind: ItemKind;
      ids: string[];
      updates: ItemUpdates;
    }
  | {
      operation: "convert";
      sourceKind: ItemKind;
      id: string;
      targetRecurrenceType?: "daily" | "weekly" | "monthly" | "yearly";
      targetRecurrenceInterval?: number;
    };

export const fingerprintItem = (item: SafeItem) =>
  createHash("sha256").update(JSON.stringify(item)).digest("hex");

const uniqueIds = (ids: string[]) => [...new Set(ids)];

export class WajibOperations {
  constructor(
    private readonly options: {
      data: WajibDataAccess;
      audit: AuditSink;
      changeSets: ChangeSetStore;
      actorId: string;
      target: "local" | "production";
      timeZone: string;
      now?: () => Date;
    },
  ) {}

  status() {
    return {
      transport: "local",
      authenticated: true,
      actor_id: this.options.actorId,
      target: this.options.target,
      time_zone: this.options.timeZone,
      change_set_ttl_minutes: 10,
      bulk_limit: BULK_LIMIT,
      capabilities: {
        items: ["read", "create", "update", "delete", "convert", "bulk"],
        categories: ["read"],
        routine_completions: ["read", "set"],
        preferences: ["read", "update"],
      },
    };
  }

  async listItems(input: ListItemsInput) {
    const kinds: ItemKind[] = input.kind ? [input.kind] : ["task", "routine"];
    const perKindLimit = input.kind ? input.limit : input.limit + input.offset;
    const records = (
      await Promise.all(
        kinds.map((kind) =>
          this.options.data.listItems(kind, {
            query: input.query,
            category: input.category,
            value: input.value,
            urgency: input.urgency,
            completed: input.completed,
            recurrence_type: input.recurrence_type,
            limit: perKindLimit,
            offset: input.kind ? input.offset : 0,
            order: input.order,
          }),
        ),
      )
    )
      .flat()
      .sort((left, right) => {
        const direction = input.order === "asc" ? 1 : -1;
        return left.created_at.localeCompare(right.created_at) * direction;
      });
    const paged = input.kind
      ? records
      : records.slice(input.offset, input.offset + input.limit);
    return { records: paged, limit: input.limit, offset: input.offset };
  }

  async getItem(input: { kind: ItemKind; id: string }) {
    return this.requireItem(input.kind, input.id);
  }

  async listCategories() {
    return { categories: await this.options.data.listCategories() };
  }

  async listRoutineCompletions(input: {
    routine_id: string;
    start_date?: string;
    end_date?: string;
    limit: number;
  }) {
    await this.requireItem("routine", input.routine_id);
    return {
      completions: await this.options.data.listRoutineCompletions({
        routineId: input.routine_id,
        startDate: input.start_date,
        endDate: input.end_date,
        limit: input.limit,
      }),
    };
  }

  async getPreferences() {
    return this.options.data.getPreferences();
  }

  async createItem(input: CreateItemInput) {
    await this.requireCategory(input.category);
    return this.auditMutation(
      {
        tool: "wajib_create_item",
        operation: "create",
        entityKind: input.kind,
        recordIds: [],
        changedFields: Object.keys(input).filter((key) => key !== "kind"),
      },
      async (meta) => {
        const created = await this.options.data.createItem(input);
        meta.recordIds = [created.id];
        return this.requireItem(input.kind, created.id);
      },
    );
  }

  async updateItem(input: {
    kind: ItemKind;
    id: string;
    updates: ItemUpdates;
  }) {
    await this.requireItem(input.kind, input.id);
    this.validateUpdatesForKind(input.kind, input.updates);
    if (input.updates.category)
      await this.requireCategory(input.updates.category);
    return this.auditMutation(
      {
        tool: "wajib_update_item",
        operation: "update",
        entityKind: input.kind,
        recordIds: [input.id],
        changedFields: Object.keys(input.updates),
      },
      async () => {
        await this.options.data.updateItem(input.kind, input.id, input.updates);
        return this.requireItem(input.kind, input.id);
      },
    );
  }

  async setCompletion(input: {
    kind: ItemKind;
    id: string;
    completed: boolean;
    date?: string;
  }) {
    const item = await this.requireItem(input.kind, input.id);
    const day = input.date ?? dateToDayKey(this.now(), this.options.timeZone);
    if (!parseDayKey(day)) {
      throw new WajibOperationError("INVALID_ARGUMENT");
    }
    const createdDay = dateToDayKey(
      new Date(item.created_at),
      this.options.timeZone,
    );
    if (day < createdDay) {
      throw new WajibOperationError(
        "INVALID_ARGUMENT",
        "A completion date cannot precede the item's creation date.",
      );
    }
    return this.auditMutation(
      {
        tool: "wajib_set_completion",
        operation: input.completed ? "complete" : "uncomplete",
        entityKind: input.kind === "task" ? "task" : "routine_completion",
        recordIds: [input.id],
        changedFields: ["completed"],
      },
      async () => {
        if (input.kind === "task") {
          if (input.date) {
            throw new WajibOperationError(
              "INVALID_ARGUMENT",
              "Tasks do not have date-specific completion history.",
            );
          }
          await this.options.data.setTaskCompletion(input.id, input.completed);
          const verified = await this.requireItem("task", input.id);
          if (verified.completed !== input.completed) {
            throw new WajibOperationError("WRITE_FAILED");
          }
          return { item: verified };
        }

        await this.options.data.setRoutineCompletion(
          input.id,
          day,
          input.completed,
        );
        const completions = await this.options.data.listRoutineCompletions({
          routineId: input.id,
          startDate: day,
          endDate: day,
          limit: 2,
        });
        if (completions.length > 0 !== input.completed) {
          throw new WajibOperationError("WRITE_FAILED");
        }
        return {
          routine_id: input.id,
          completed: input.completed,
          date: day,
          period: getRoutinePeriodForDay(
            {
              created_at: item.created_at,
              recurrence_type: item.recurrence_type ?? "none",
              recurrence_interval: item.recurrence_interval ?? 1,
            },
            day,
            this.options.timeZone,
          ),
        };
      },
    );
  }

  async updatePreferences(input: { daily_highlight_enabled: boolean }) {
    return this.auditMutation(
      {
        tool: "wajib_update_preferences",
        operation: "update",
        entityKind: "preferences",
        recordIds: [this.options.actorId],
        changedFields: ["daily_highlight_enabled"],
      },
      async () => {
        await this.options.data.updatePreferences(
          input.daily_highlight_enabled,
        );
        const verified = await this.options.data.getPreferences();
        if (
          verified.daily_highlight_enabled !== input.daily_highlight_enabled
        ) {
          throw new WajibOperationError("WRITE_FAILED");
        }
        return verified;
      },
    );
  }

  async previewChange(input: PreviewChangeInput) {
    const { payload, records, changedFields } = await this.resolveChange(input);
    const entry = this.options.changeSets.create<ChangePayload>({
      actorId: this.options.actorId,
      operation: payload.operation,
      entityIds: records.map((record) => record.id),
      changedFields,
      fingerprints: Object.fromEntries(
        records.map((record) => [record.id, fingerprintItem(record)]),
      ),
      payload,
    });
    return {
      change_set_id: entry.id,
      expires_at: entry.expiresAt,
      operation: entry.operation,
      kind: payload.operation === "convert" ? payload.sourceKind : payload.kind,
      record_count: records.length,
      records,
      changed_fields: changedFields,
    };
  }

  async applyChangeSet(input: { change_set_id: string }) {
    const entry = this.options.changeSets.consume(
      input.change_set_id,
      this.options.actorId,
    ) as ChangeSet<ChangePayload>;
    const kind =
      entry.payload.operation === "convert"
        ? entry.payload.sourceKind
        : entry.payload.kind;
    return this.auditMutation(
      {
        tool: "wajib_apply_change_set",
        operation: entry.operation,
        entityKind: kind,
        recordIds: [...entry.entityIds],
        changedFields: entry.changedFields,
        changeSetId: entry.id,
      },
      async (meta) => {
        await this.assertFresh(entry, kind);
        if (
          entry.payload.operation === "delete" ||
          entry.payload.operation === "bulk_delete"
        ) {
          const deleted = await this.options.data.deleteItems(
            entry.payload.kind,
            entry.payload.ids,
          );
          if (deleted.length !== entry.payload.ids.length) {
            throw new WajibOperationError("PARTIAL_WRITE");
          }
          return { deleted_ids: deleted };
        }
        if (entry.payload.operation === "bulk_update") {
          const updated: SafeItem[] = [];
          for (const id of entry.payload.ids) {
            try {
              await this.options.data.updateItem(
                entry.payload.kind,
                id,
                entry.payload.updates,
              );
              updated.push(await this.requireItem(entry.payload.kind, id));
            } catch (error) {
              if (updated.length > 0) {
                throw new WajibOperationError("PARTIAL_WRITE", undefined, {
                  cause: error,
                });
              }
              throw error;
            }
          }
          return { records: updated };
        }
        if (entry.payload.operation !== "convert") {
          throw new WajibOperationError("INVALID_ARGUMENT");
        }
        const converted = await this.applyConversion(entry.payload);
        meta.recordIds.push(converted.id);
        return { source_id: entry.payload.id, item: converted };
      },
    );
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  private async requireItem(kind: ItemKind, id: string) {
    const item = await this.options.data.getItem(kind, id);
    if (!item) throw new WajibOperationError("NOT_FOUND");
    return item;
  }

  private async requireCategory(slug: string) {
    const categories = await this.options.data.listCategories();
    if (!categories.some((category) => category.slug === slug)) {
      throw new WajibOperationError(
        "INVALID_ARGUMENT",
        "Use an existing category slug from wajib_list_categories.",
      );
    }
  }

  private validateUpdatesForKind(kind: ItemKind, updates: ItemUpdates) {
    if (
      kind === "task" &&
      (updates.recurrence_type || updates.recurrence_interval)
    ) {
      throw new WajibOperationError(
        "INVALID_ARGUMENT",
        "Use wajib_preview_change to convert a task into a routine.",
      );
    }
  }

  private async resolveChange(input: PreviewChangeInput): Promise<{
    payload: ChangePayload;
    records: SafeItem[];
    changedFields: string[];
  }> {
    if (input.operation === "convert") {
      if (input.source_kind === "task" && !input.target_recurrence_type) {
        throw new WajibOperationError(
          "INVALID_ARGUMENT",
          "Task-to-routine conversion requires target_recurrence_type.",
        );
      }
      if (
        input.source_kind === "routine" &&
        (input.target_recurrence_type || input.target_recurrence_interval)
      ) {
        throw new WajibOperationError(
          "INVALID_ARGUMENT",
          "Routine-to-task conversion does not accept recurrence fields.",
        );
      }
      const record = await this.requireItem(input.source_kind, input.id);
      return {
        payload: {
          operation: "convert",
          sourceKind: input.source_kind,
          id: input.id,
          targetRecurrenceType: input.target_recurrence_type,
          targetRecurrenceInterval: input.target_recurrence_interval,
        },
        records: [record],
        changedFields: ["kind", "recurrence_type", "recurrence_interval"],
      };
    }

    const ids =
      input.operation === "delete"
        ? uniqueIds(input.ids)
        : await this.resolveBulkSelection(input.kind, input.ids, input.filter);
    const records = await Promise.all(
      ids.map((id) => this.requireItem(input.kind, id)),
    );
    if (input.operation === "bulk_update") {
      this.validateUpdatesForKind(input.kind, input.updates);
      if (input.updates.category)
        await this.requireCategory(input.updates.category);
      return {
        payload: {
          operation: "bulk_update",
          kind: input.kind,
          ids,
          updates: input.updates,
        },
        records,
        changedFields: Object.keys(input.updates),
      };
    }
    return {
      payload: { operation: input.operation, kind: input.kind, ids },
      records,
      changedFields: ["deleted"],
    };
  }

  private async resolveBulkSelection(
    kind: ItemKind,
    ids?: string[],
    filter?: ItemFilterInput,
  ) {
    const hasIds = Boolean(ids?.length);
    const hasFilter = Boolean(filter && Object.keys(filter).length > 0);
    if (hasIds === hasFilter) {
      throw new WajibOperationError(
        "INVALID_ARGUMENT",
        "Provide exact ids or one nonempty filter, but not both.",
      );
    }
    if (ids) return uniqueIds(ids);
    const records = await this.options.data.listItems(kind, {
      ...filter,
      limit: BULK_LIMIT + 1,
      offset: 0,
      order: "desc",
    });
    if (records.length > BULK_LIMIT) {
      throw new WajibOperationError("BULK_LIMIT_EXCEEDED");
    }
    if (records.length === 0) throw new WajibOperationError("NOT_FOUND");
    return records.map((record) => record.id);
  }

  private async assertFresh(entry: ChangeSet<ChangePayload>, kind: ItemKind) {
    for (const id of entry.entityIds) {
      const current = await this.options.data.getItem(kind, id);
      if (!current || fingerprintItem(current) !== entry.fingerprints[id]) {
        throw new WajibOperationError("STALE_CHANGE_SET");
      }
    }
  }

  private async applyConversion(
    payload: Extract<ChangePayload, { operation: "convert" }>,
  ) {
    const source = await this.requireItem(payload.sourceKind, payload.id);
    const targetKind: ItemKind =
      payload.sourceKind === "task" ? "routine" : "task";
    let completed = false;
    if (payload.sourceKind === "routine") {
      const day = dateToDayKey(this.now(), this.options.timeZone);
      const period = getRoutinePeriodForDay(
        {
          created_at: source.created_at,
          recurrence_type: source.recurrence_type ?? "none",
          recurrence_interval: source.recurrence_interval ?? 1,
        },
        day,
        this.options.timeZone,
      );
      const logs = await this.options.data.listRoutineCompletions({
        routineId: payload.id,
        startDate: period?.startDay ?? day,
        endDate: period?.endDay ?? day,
        limit: 1,
      });
      completed = logs.length > 0;
    }
    const createInput: CreateItemInput =
      targetKind === "routine"
        ? {
            kind: "routine",
            title: source.title,
            value: source.value,
            urgency: source.urgency,
            estimated_hours: source.estimated_hours,
            category: source.category,
            recurrence_type: payload.targetRecurrenceType ?? "daily",
            recurrence_interval: payload.targetRecurrenceInterval ?? 1,
          }
        : {
            kind: "task",
            title: source.title,
            value: source.value,
            urgency: source.urgency,
            estimated_hours: source.estimated_hours,
            category: source.category,
            completed,
          };
    const created = await this.options.data.createItem(createInput);
    try {
      const deleted = await this.options.data.deleteItems(payload.sourceKind, [
        payload.id,
      ]);
      if (deleted.length !== 1) throw new WajibOperationError("WRITE_FAILED");
    } catch (deleteError) {
      try {
        const compensated = await this.options.data.deleteItems(targetKind, [
          created.id,
        ]);
        if (compensated.length !== 1)
          throw new Error("compensation did not delete");
      } catch (compensationError) {
        throw new WajibOperationError("PARTIAL_WRITE", undefined, {
          cause: compensationError,
        });
      }
      throw new WajibOperationError("WRITE_FAILED", undefined, {
        cause: deleteError,
      });
    }
    return this.requireItem(targetKind, created.id);
  }

  private async auditMutation<T>(
    meta: MutationMeta,
    callback: (mutableMeta: MutationMeta) => Promise<T>,
  ) {
    try {
      const result = await callback(meta);
      await this.writeAudit(meta, "success");
      return result;
    } catch (error) {
      const mapped = toWajibOperationError(error);
      await this.writeAudit(meta, "failure", mapped.code);
      throw mapped;
    }
  }

  private writeAudit(
    meta: MutationMeta,
    outcome: "success" | "failure",
    errorCode?: WajibOperationErrorCode,
  ) {
    return this.options.audit.write({
      timestamp: this.now().toISOString(),
      actorId: this.options.actorId,
      tool: meta.tool,
      operation: meta.operation,
      entityKind: meta.entityKind,
      recordIds: uniqueIds(meta.recordIds),
      changedFields: [...new Set(meta.changedFields)].sort(),
      outcome,
      ...(meta.changeSetId ? { changeSetId: meta.changeSetId } : {}),
      ...(errorCode ? { errorCode } : {}),
    });
  }
}
