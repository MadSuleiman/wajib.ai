"use client";

import { Minus, ArrowUp } from "lucide-react";

export interface BaseItem {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export const priorityIcons = {
  low: <Minus className="h-4 w-4 text-muted-foreground" />,
  medium: <Minus className="h-4 w-4 text-amber-500" />,
  high: <ArrowUp className="h-4 w-4 text-destructive" />,
};

export const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (isErrorWithMessage(error)) return error;
  try {
    return new Error(JSON.stringify(error));
  } catch {
    // fallback in case there's an error stringifying the error
    return new Error(String(error));
  }
}

export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}
