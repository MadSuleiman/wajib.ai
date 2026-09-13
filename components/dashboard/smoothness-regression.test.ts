import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readProjectFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("dashboard smoothness regressions", () => {
  test("loads dashboard editors and desktop table eagerly", () => {
    const source = readProjectFile("components/dashboard/items-view.tsx");

    expect(source).toContain('import { TaskEditor } from "./task-editor";');
    expect(source).toContain(
      'import { RoutineEditor } from "./routine-editor";',
    );
    expect(source).toContain(
      'import { DesktopItemsTable as DesktopTable } from "./desktop-items-table";',
    );
    expect(source).not.toContain("next/dynamic");
    expect(source).not.toContain("DeferredTaskEditor");
    expect(source).not.toContain("DeferredRoutineEditor");
  });

  test("keeps desktop row context menu actions wired", () => {
    const source = readProjectFile(
      "components/dashboard/desktop-items-table.tsx",
    );

    expect(source).toContain("rowWrapper");
    expect(source).toContain("ContextMenuTrigger");
    expect(source).toContain("Mark as active");
    expect(source).toContain("Mark as complete");
    expect(source).toContain("Edit {itemLabel}");
    expect(source).toContain("Schedule 30-min block");
    expect(source).toContain("Delete {itemLabel}");
  });

  test("uses eager dashboard surfaces and Radix mobile tabs", () => {
    const source = readProjectFile(
      "components/dashboard/dashboard-content.tsx",
    );

    expect(source).toContain(
      'import { CreateItemDialog } from "./create-item-dialog";',
    );
    expect(source).toContain(
      'import { ScheduleBlockDialog } from "./schedule-block-dialog";',
    );
    expect(source).toMatch(/<TabsTrigger\s+value="tasks"/);
    expect(source).toMatch(/<TabsTrigger\s+value="routines"/);
    expect(source).not.toContain("next/dynamic");
    expect(source).not.toContain("DeferredCreateItemDialog");
    expect(source).not.toContain("DeferredScheduleBlockDialog");
  });

  test("renders global feedback and effects without deferred wrappers", () => {
    const source = readProjectFile("app/layout.tsx");

    expect(source).toContain(
      'import { Toaster } from "@/components/ui/sonner";',
    );
    expect(source).toContain(
      'import { ZoomPrevention } from "@/components/app/anti-zoom";',
    );
    expect(source).toContain(
      'import { ServiceWorkerProvider } from "@/components/app/service-worker-provider";',
    );
    expect(source).toContain(
      '<Suspense fallback={<div className="min-h-screen" />}>',
    );
    expect(source).not.toContain("ClientEffects");
    expect(source).not.toContain("DashboardLoading");
  });
});
