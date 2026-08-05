import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AuthError } from "@supabase/supabase-js";

import type { Category, ItemKind, RoutineLogRow } from "@/types";
import { JsonlAuditSink, MemoryAuditSink } from "./audit";
import { requireAuthenticatedActor } from "./auth";
import { ChangeSetStore } from "./change-set";
import type { ListQuery, SafeItem, WajibDataAccess } from "./data-access";
import { loadWajibMcpEnvironment } from "./env";
import { toWajibOperationError, WajibOperationError } from "./errors";
import type { CreateItemInput, ItemUpdates } from "./schemas";
import {
  createItemSchema,
  listItemsSchema,
  listRoutineCompletionsSchema,
  previewChangeSchema,
} from "./schemas";
import { WajibOperations } from "./service";
import { dateToDayKey, getRoutinePeriodForDay, parseDayKey } from "./timezone";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const ROUTINE_ID = "22222222-2222-4222-8222-222222222222";
const CREATED_AT = "2026-08-01T16:00:00.000Z";

class FakeData implements WajibDataAccess {
  items = new Map<string, SafeItem>([
    [
      TASK_ID,
      {
        id: TASK_ID,
        kind: "task",
        created_at: CREATED_AT,
        title: "Test task",
        value: "medium",
        urgency: "high",
        estimated_hours: 1,
        category: "work",
        completed: false,
      },
    ],
    [
      ROUTINE_ID,
      {
        id: ROUTINE_ID,
        kind: "routine",
        created_at: CREATED_AT,
        title: "Test routine",
        value: "high",
        urgency: "medium",
        estimated_hours: 0.5,
        category: "health",
        recurrence_type: "daily",
        recurrence_interval: 1,
      },
    ],
  ]);
  categories: Category[] = [
    { slug: "work", label: "Work", description: null, color: null },
    { slug: "health", label: "Health", description: null, color: null },
  ];
  completions: Array<
    Pick<RoutineLogRow, "id" | "routine_id" | "completed_day" | "completed_at">
  > = [];
  preferences = { daily_highlight_enabled: true };
  failDeleteKinds = new Set<ItemKind>();
  skipTaskCompletion = false;

  async listItems(kind: ItemKind, input: ListQuery) {
    let records = [...this.items.values()].filter((item) => item.kind === kind);
    if (input.query) {
      records = records.filter((item) =>
        item.title.toLowerCase().includes(input.query!.toLowerCase()),
      );
    }
    if (input.category) {
      records = records.filter((item) => item.category === input.category);
    }
    if (input.value)
      records = records.filter((item) => item.value === input.value);
    if (input.urgency) {
      records = records.filter((item) => item.urgency === input.urgency);
    }
    if (typeof input.completed === "boolean") {
      records = records.filter((item) => item.completed === input.completed);
    }
    if (input.recurrence_type) {
      records = records.filter(
        (item) => item.recurrence_type === input.recurrence_type,
      );
    }
    records.sort((left, right) =>
      input.order === "asc"
        ? left.created_at.localeCompare(right.created_at)
        : right.created_at.localeCompare(left.created_at),
    );
    return records.slice(input.offset, input.offset + input.limit);
  }

  async getItem(kind: ItemKind, id: string) {
    const item = this.items.get(id);
    return item?.kind === kind ? structuredClone(item) : null;
  }

  async listCategories() {
    return structuredClone(this.categories);
  }

  async listRoutineCompletions(input: {
    routineId: string;
    startDate?: string;
    endDate?: string;
    limit: number;
  }) {
    return this.completions
      .filter(
        (entry) =>
          entry.routine_id === input.routineId &&
          (!input.startDate || entry.completed_day >= input.startDate) &&
          (!input.endDate || entry.completed_day <= input.endDate),
      )
      .slice(0, input.limit);
  }

  async getPreferences() {
    return structuredClone(this.preferences);
  }

  async createItem(input: CreateItemInput) {
    const id = randomUUID();
    const item: SafeItem = {
      id,
      kind: input.kind,
      created_at: "2026-08-04T12:00:00.000Z",
      title: input.title,
      value: input.value,
      urgency: input.urgency,
      estimated_hours: input.estimated_hours,
      category: input.category,
      ...(input.kind === "task"
        ? { completed: input.completed }
        : {
            recurrence_type: input.recurrence_type,
            recurrence_interval: input.recurrence_interval,
          }),
    };
    this.items.set(id, item);
    return structuredClone(item);
  }

  async updateItem(kind: ItemKind, id: string, updates: ItemUpdates) {
    const current = await this.getItem(kind, id);
    if (!current) throw new WajibOperationError("NOT_FOUND");
    const next = { ...current, ...updates } as SafeItem;
    this.items.set(id, next);
    return structuredClone(next);
  }

  async setTaskCompletion(id: string, completed: boolean) {
    const current = await this.getItem("task", id);
    if (!current) throw new WajibOperationError("NOT_FOUND");
    if (!this.skipTaskCompletion) {
      current.completed = completed;
      this.items.set(id, current);
    }
    return structuredClone(current);
  }

  async setRoutineCompletion(
    routineId: string,
    day: string,
    completed: boolean,
  ) {
    this.completions = this.completions.filter(
      (entry) =>
        !(entry.routine_id === routineId && entry.completed_day === day),
    );
    if (completed) {
      this.completions.push({
        id: randomUUID(),
        routine_id: routineId,
        completed_day: day,
        completed_at: "2026-08-04T12:00:00.000Z",
      });
    }
  }

  async updatePreferences(enabled: boolean) {
    this.preferences.daily_highlight_enabled = enabled;
  }

  async deleteItems(kind: ItemKind, ids: string[]) {
    if (this.failDeleteKinds.has(kind))
      throw new Error("raw secret database error");
    const deleted: string[] = [];
    for (const id of ids) {
      if (this.items.get(id)?.kind === kind) {
        this.items.delete(id);
        deleted.push(id);
      }
    }
    return deleted;
  }
}

const createOperations = (
  data = new FakeData(),
  options?: { now?: () => Date },
) => {
  const audit = new MemoryAuditSink();
  return {
    data,
    audit,
    operations: new WajibOperations({
      data,
      audit,
      changeSets: new ChangeSetStore({ now: options?.now }),
      actorId: "33333333-3333-4333-8333-333333333333",
      target: "production",
      timeZone: "America/Los_Angeles",
      now: options?.now,
    }),
  };
};

describe("environment, auth, schemas, and errors", () => {
  test("loads only allowlisted variables with local precedence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wajib-env-"));
    await writeFile(
      join(directory, ".env"),
      [
        "NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=base-key",
        "WAJIB_AGENT_EMAIL=base@example.com",
        "WAJIB_AGENT_PASSWORD=base-password",
        "SUPABASE_SERVICE_ROLE_KEY=must-never-load",
      ].join("\n"),
    );
    await writeFile(
      join(directory, ".env.local"),
      "WAJIB_AGENT_EMAIL=local@example.com\nWAJIB_AGENT_PASSWORD=local-password\n",
    );
    const environment = loadWajibMcpEnvironment(directory, {
      NODE_ENV: "test",
    });
    expect(environment.WAJIB_AGENT_EMAIL).toBe("local@example.com");
    expect(environment.target).toBe("production");
    expect("SUPABASE_SERVICE_ROLE_KEY" in environment).toBe(false);
  });

  test("maps auth and database failures without leaking raw messages", () => {
    expect(() => requireAuthenticatedActor(null, null)).toThrow(
      WajibOperationError,
    );
    const authError = { status: 400 } as AuthError;
    expect(() => requireAuthenticatedActor(null, authError)).toThrow(
      "could not authenticate",
    );
    const mapped = toWajibOperationError({
      code: "42501",
      message: "secret table and policy details",
    });
    expect(mapped.code).toBe("RLS_DENIED");
    expect(mapped.message).not.toContain("secret");
  });

  test("validates bounded schemas and defaults", () => {
    expect(listItemsSchema.parse({}).limit).toBe(50);
    expect(
      createItemSchema.parse({
        kind: "task",
        title: "A task",
        category: "work",
      }),
    ).toMatchObject({ completed: false });
    expect(() =>
      previewChangeSchema.parse({
        operation: "delete",
        kind: "task",
        ids: Array.from({ length: 51 }, () => randomUUID()),
      }),
    ).toThrow();
    expect(() =>
      previewChangeSchema.parse({
        operation: "convert",
        source_kind: "task",
        id: TASK_ID,
        target_recurrence_type: "daily",
      }),
    ).not.toThrow();
    expect(() => listItemsSchema.parse({ offset: 501 })).toThrow();
    expect(() =>
      listRoutineCompletionsSchema.parse({
        routine_id: ROUTINE_ID,
        start_date: "2026-02-29",
      }),
    ).toThrow();
  });
});

describe("timezone periods", () => {
  test("uses the supplied Mac timezone for date keys across UTC boundaries", () => {
    expect(
      dateToDayKey(new Date("2026-03-08T07:30:00.000Z"), "America/Los_Angeles"),
    ).toBe("2026-03-07");
    expect(parseDayKey("2026-02-29")).toBeNull();
  });

  test("computes interval routine periods in local calendar days", () => {
    expect(
      getRoutinePeriodForDay(
        {
          created_at: "2026-08-03T07:30:00.000Z",
          recurrence_type: "weekly",
          recurrence_interval: 2,
        },
        "2026-08-12",
        "America/Los_Angeles",
      ),
    ).toEqual({ startDay: "2026-08-03", endDay: "2026-08-16" });
  });
});

describe("change sets and audit", () => {
  test("expires and consumes change sets exactly once", () => {
    let now = new Date("2026-08-04T00:00:00.000Z");
    const store = new ChangeSetStore({ now: () => now, ttlMs: 1000 });
    const entry = store.create({
      actorId: "actor",
      operation: "delete",
      entityIds: [TASK_ID],
      changedFields: ["deleted"],
      fingerprints: { [TASK_ID]: "fingerprint" },
      payload: {},
    });
    expect(store.consume(entry.id, "actor").id).toBe(entry.id);
    expect(() => store.consume(entry.id, "actor")).toThrow("expired");

    const expired = store.create({
      actorId: "actor",
      operation: "delete",
      entityIds: [TASK_ID],
      changedFields: ["deleted"],
      fingerprints: { [TASK_ID]: "fingerprint" },
      payload: {},
    });
    now = new Date(now.getTime() + 1001);
    expect(() => store.consume(expired.id, "actor")).toThrow("expired");
  });

  test("writes mode-0600 redacted JSONL audit metadata", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wajib-audit-"));
    await chmod(directory, 0o755);
    const path = join(directory, "nested", "audit.jsonl");
    const sink = new JsonlAuditSink(path);
    await sink.write({
      timestamp: "2026-08-04T00:00:00.000Z",
      actorId: "actor-id",
      tool: "wajib_update_item",
      operation: "update",
      entityKind: "task",
      recordIds: [TASK_ID],
      changedFields: ["title"],
      outcome: "success",
    });
    const raw = await readFile(path, "utf8");
    expect(raw).toContain("changedFields");
    expect(raw).not.toContain("Test task");
    expect(raw).not.toContain("password");
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect((await stat(join(directory, "nested"))).mode & 0o777).toBe(0o700);
  });
});

describe("Wajib operations", () => {
  test("supports all read surfaces without user_id fields", async () => {
    const { operations } = createOperations();
    expect(operations.status()).toMatchObject({
      transport: "local",
      target: "production",
      bulk_limit: 50,
    });
    const listed = await operations.listItems(listItemsSchema.parse({}));
    expect(listed.records).toHaveLength(2);
    expect("user_id" in listed.records[0]).toBe(false);
    expect(
      await operations.getItem({ kind: "task", id: TASK_ID }),
    ).toMatchObject({
      id: TASK_ID,
    });
    expect((await operations.listCategories()).categories).toHaveLength(2);
    expect(
      (
        await operations.listRoutineCompletions({
          routine_id: ROUTINE_ID,
          limit: 50,
        })
      ).completions,
    ).toHaveLength(0);
    expect(await operations.getPreferences()).toEqual({
      daily_highlight_enabled: true,
    });
  });

  test("creates, updates, completes, and verifies direct writes", async () => {
    const { operations, audit } = createOperations(undefined, {
      now: () => new Date("2026-08-04T18:00:00.000Z"),
    });
    const created = await operations.createItem(
      createItemSchema.parse({
        kind: "task",
        title: "Created",
        category: "work",
      }),
    );
    expect(created.title).toBe("Created");
    const updated = await operations.updateItem({
      kind: "task",
      id: created.id,
      updates: { urgency: "high" },
    });
    expect(updated.urgency).toBe("high");
    expect(
      await operations.setCompletion({
        kind: "task",
        id: created.id,
        completed: true,
      }),
    ).toMatchObject({ item: { completed: true } });
    expect(
      await operations.setCompletion({
        kind: "routine",
        id: ROUTINE_ID,
        completed: true,
        date: "2026-08-04",
      }),
    ).toMatchObject({ completed: true, date: "2026-08-04" });
    expect(
      await operations.updatePreferences({ daily_highlight_enabled: false }),
    ).toEqual({ daily_highlight_enabled: false });
    expect(audit.events.every((event) => event.outcome === "success")).toBe(
      true,
    );
    expect(JSON.stringify(audit.events)).not.toContain("Created");
  });

  test("rejects unknown categories and failed post-write verification", async () => {
    const data = new FakeData();
    const { operations } = createOperations(data);
    await expect(
      operations.createItem(
        createItemSchema.parse({
          kind: "task",
          title: "Invalid",
          category: "missing",
        }),
      ),
    ).rejects.toThrow("existing category slug");
    data.skipTaskCompletion = true;
    await expect(
      operations.setCompletion({
        kind: "task",
        id: TASK_ID,
        completed: true,
      }),
    ).rejects.toMatchObject({ code: "WRITE_FAILED" });
    await expect(
      operations.setCompletion({
        kind: "routine",
        id: ROUTINE_ID,
        completed: true,
        date: "2026-07-31",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  test("previews and applies delete, refuses replay, and detects staleness", async () => {
    const { operations, data } = createOperations();
    const preview = await operations.previewChange({
      operation: "delete",
      kind: "task",
      ids: [TASK_ID],
    });
    expect(preview.record_count).toBe(1);
    await expect(
      operations.applyChangeSet({ change_set_id: preview.change_set_id }),
    ).resolves.toEqual({ deleted_ids: [TASK_ID] });
    await expect(
      operations.applyChangeSet({ change_set_id: preview.change_set_id }),
    ).rejects.toMatchObject({ code: "STALE_CHANGE_SET" });

    const stalePreview = await operations.previewChange({
      operation: "delete",
      kind: "routine",
      ids: [ROUTINE_ID],
    });
    data.items.get(ROUTINE_ID)!.title = "Changed elsewhere";
    await expect(
      operations.applyChangeSet({ change_set_id: stalePreview.change_set_id }),
    ).rejects.toMatchObject({ code: "STALE_CHANGE_SET" });
  });

  test("enforces nonempty bounded bulk selections without truncation", async () => {
    const data = new FakeData();
    for (let index = 0; index < 51; index += 1) {
      const id = randomUUID();
      data.items.set(id, {
        ...data.items.get(TASK_ID)!,
        id,
        title: `Bulk ${index}`,
      });
    }
    const { operations } = createOperations(data);
    await expect(
      operations.previewChange({
        operation: "bulk_delete",
        kind: "task",
        filter: { category: "work" },
      }),
    ).rejects.toMatchObject({ code: "BULK_LIMIT_EXCEEDED" });
    await expect(
      operations.previewChange({
        operation: "bulk_update",
        kind: "task",
        updates: { urgency: "low" },
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  test("applies bounded bulk update and verifies each record", async () => {
    const { operations } = createOperations();
    const preview = await operations.previewChange({
      operation: "bulk_update",
      kind: "task",
      ids: [TASK_ID],
      updates: { value: "high" },
    });
    const result = await operations.applyChangeSet({
      change_set_id: preview.change_set_id,
    });
    expect(result).toMatchObject({ records: [{ id: TASK_ID, value: "high" }] });
  });

  test("converts insert-then-delete and reports failed compensation", async () => {
    const { operations } = createOperations();
    const preview = await operations.previewChange({
      operation: "convert",
      source_kind: "task",
      id: TASK_ID,
      target_recurrence_type: "weekly",
      target_recurrence_interval: 2,
    });
    const applied = await operations.applyChangeSet({
      change_set_id: preview.change_set_id,
    });
    expect(applied).toMatchObject({ item: { kind: "routine" } });

    const failingData = new FakeData();
    failingData.failDeleteKinds.add("task");
    failingData.failDeleteKinds.add("routine");
    const failing = createOperations(failingData).operations;
    const failingPreview = await failing.previewChange({
      operation: "convert",
      source_kind: "task",
      id: TASK_ID,
      target_recurrence_type: "daily",
    });
    await expect(
      failing.applyChangeSet({
        change_set_id: failingPreview.change_set_id,
      }),
    ).rejects.toMatchObject({ code: "PARTIAL_WRITE" });
  });

  test("preserves active-period routine completion when converting to a task", async () => {
    const data = new FakeData();
    data.items.set(ROUTINE_ID, {
      ...data.items.get(ROUTINE_ID)!,
      recurrence_type: "weekly",
      recurrence_interval: 1,
    });
    data.completions.push({
      id: randomUUID(),
      routine_id: ROUTINE_ID,
      completed_day: "2026-08-03",
      completed_at: "2026-08-03T20:00:00.000Z",
    });
    const { operations } = createOperations(data, {
      now: () => new Date("2026-08-04T18:00:00.000Z"),
    });
    const preview = await operations.previewChange({
      operation: "convert",
      source_kind: "routine",
      id: ROUTINE_ID,
    });
    await expect(
      operations.applyChangeSet({ change_set_id: preview.change_set_id }),
    ).resolves.toMatchObject({ item: { kind: "task", completed: true } });
  });
});
