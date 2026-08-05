import { z } from "zod";

export type WajibOperationErrorCode =
  | "AMBIGUOUS_MATCH"
  | "AUTH_REQUIRED"
  | "BULK_LIMIT_EXCEEDED"
  | "INVALID_ARGUMENT"
  | "NOT_FOUND"
  | "PARTIAL_WRITE"
  | "RLS_DENIED"
  | "STALE_CHANGE_SET"
  | "UNAVAILABLE"
  | "WRITE_FAILED";

const SAFE_MESSAGES: Record<WajibOperationErrorCode, string> = {
  AMBIGUOUS_MATCH: "More than one record matched. Use an exact UUID.",
  AUTH_REQUIRED: "The local Wajib agent could not authenticate.",
  BULK_LIMIT_EXCEEDED: "The requested bulk change exceeds the 50-record limit.",
  INVALID_ARGUMENT: "The request did not pass Wajib operation validation.",
  NOT_FOUND: "The requested Wajib record was not found.",
  PARTIAL_WRITE:
    "The operation only partially completed. Inspect Wajib before retrying.",
  RLS_DENIED: "Supabase row-level security denied this operation.",
  STALE_CHANGE_SET:
    "The change set is expired, already used, or no longer matches current data.",
  UNAVAILABLE: "The Wajib data service is temporarily unavailable.",
  WRITE_FAILED: "Wajib could not verify the requested mutation.",
};

export class WajibOperationError extends Error {
  constructor(
    readonly code: WajibOperationErrorCode,
    message = SAFE_MESSAGES[code],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "WajibOperationError";
  }
}

type ErrorRecord = {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

export const toWajibOperationError = (error: unknown) => {
  if (error instanceof WajibOperationError) return error;
  if (error instanceof z.ZodError) {
    return new WajibOperationError("INVALID_ARGUMENT");
  }

  const record =
    typeof error === "object" && error !== null
      ? (error as ErrorRecord)
      : undefined;
  const code = typeof record?.code === "string" ? record.code : "";
  const status =
    typeof record?.status === "number"
      ? record.status
      : typeof record?.statusCode === "number"
        ? record.statusCode
        : undefined;

  if (
    code === "42501" ||
    code === "PGRST301" ||
    status === 401 ||
    status === 403
  ) {
    return new WajibOperationError("RLS_DENIED");
  }
  if (code === "PGRST116") return new WajibOperationError("NOT_FOUND");
  return new WajibOperationError("UNAVAILABLE");
};
