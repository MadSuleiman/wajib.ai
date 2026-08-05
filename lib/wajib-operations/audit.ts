import { mkdir, open } from "node:fs/promises";
import { dirname } from "node:path";

import type { WajibOperationErrorCode } from "./errors";
import type { ItemKind } from "@/types";

export type AuditEvent = {
  timestamp: string;
  actorId: string;
  tool: string;
  operation: string;
  entityKind: ItemKind | "preferences" | "routine_completion";
  recordIds: string[];
  changedFields: string[];
  outcome: "success" | "failure";
  changeSetId?: string;
  errorCode?: WajibOperationErrorCode;
};

export interface AuditSink {
  write(event: AuditEvent): Promise<void>;
}

export class JsonlAuditSink implements AuditSink {
  constructor(private readonly path: string) {}

  async write(event: AuditEvent) {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const handle = await open(this.path, "a", 0o600);
    try {
      await handle.appendFile(`${JSON.stringify(event)}\n`, "utf8");
      await handle.chmod(0o600);
    } finally {
      await handle.close();
    }
  }
}

export class MemoryAuditSink implements AuditSink {
  readonly events: AuditEvent[] = [];

  async write(event: AuditEvent) {
    this.events.push(structuredClone(event));
  }
}
