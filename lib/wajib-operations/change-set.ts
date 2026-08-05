import { randomUUID } from "node:crypto";

import { WajibOperationError } from "./errors";

export type ChangeSet<T = unknown> = {
  id: string;
  actorId: string;
  operation: "delete" | "bulk_update" | "bulk_delete" | "convert";
  entityIds: string[];
  changedFields: string[];
  fingerprints: Record<string, string>;
  payload: T;
  createdAt: string;
  expiresAt: string;
};

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export class ChangeSetStore {
  private readonly entries = new Map<string, ChangeSet>();
  private readonly now: () => Date;
  private readonly ttlMs: number;

  constructor(options?: { now?: () => Date; ttlMs?: number }) {
    this.now = options?.now ?? (() => new Date());
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  }

  create<T>(input: Omit<ChangeSet<T>, "id" | "createdAt" | "expiresAt">) {
    this.prune();
    const createdAt = this.now();
    const entry: ChangeSet<T> = {
      ...input,
      id: randomUUID(),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + this.ttlMs).toISOString(),
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  consume(id: string, actorId: string) {
    const entry = this.entries.get(id);
    if (!entry || entry.actorId !== actorId) {
      throw new WajibOperationError("STALE_CHANGE_SET");
    }
    this.entries.delete(id);
    if (Date.parse(entry.expiresAt) <= this.now().getTime()) {
      throw new WajibOperationError("STALE_CHANGE_SET");
    }
    return entry;
  }

  private prune() {
    const now = this.now().getTime();
    for (const [id, entry] of this.entries) {
      if (Date.parse(entry.expiresAt) <= now) this.entries.delete(id);
    }
  }
}
