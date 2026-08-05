import { describe, expect, test } from "bun:test";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = process.cwd();
const configure = join(repoRoot, "plugins/wajib/scripts/configure-local.py");
const launcher = join(repoRoot, "plugins/wajib/scripts/launch-wajib-mcp");

const run = async (command: string[], env: Record<string, string>) => {
  const process = Bun.spawn(command, {
    cwd: repoRoot,
    env: { ...globalThis.process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  return { stdout, stderr, exitCode };
};

describe("local plugin scripts", () => {
  test("configure-local rejects relative and missing repositories", async () => {
    const configHome = await mkdtemp(join(tmpdir(), "wajib-config-"));
    const relative = await run(
      ["python3", configure, "--repo-root", "relative"],
      { XDG_CONFIG_HOME: configHome },
    );
    expect(relative.exitCode).toBe(1);
    expect(relative.stderr).toContain("must be absolute");
    const missing = await run(
      ["python3", configure, "--repo-root", join(configHome, "missing")],
      { XDG_CONFIG_HOME: configHome },
    );
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain("unavailable");
  });

  test("configure-local writes only the repo path with strict permissions", async () => {
    const configHome = await mkdtemp(join(tmpdir(), "wajib-config-"));
    const result = await run(["python3", configure, "--repo-root", repoRoot], {
      XDG_CONFIG_HOME: configHome,
    });
    expect(result.exitCode).toBe(0);
    const configDirectory = join(configHome, "wajib-plugin");
    const configFile = join(configDirectory, "repo-root");
    expect((await readFile(configFile, "utf8")).trim()).toBe(repoRoot);
    expect((await stat(configDirectory)).mode & 0o777).toBe(0o700);
    expect((await stat(configFile)).mode & 0o777).toBe(0o600);
  });

  test("launcher rejects missing config and invokes the exact Bun entrypoint", async () => {
    const missingHome = await mkdtemp(join(tmpdir(), "wajib-launch-"));
    const missing = await run(["/bin/sh", launcher], {
      XDG_CONFIG_HOME: missingHome,
    });
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain("configuration is unavailable");

    const configHome = await mkdtemp(join(tmpdir(), "wajib-launch-"));
    const configDirectory = join(configHome, "wajib-plugin");
    await mkdir(configDirectory, { recursive: true });
    await writeFile(join(configDirectory, "repo-root"), `${repoRoot}\n`);
    const binDirectory = await mkdtemp(join(tmpdir(), "wajib-bin-"));
    const fakeBun = join(binDirectory, "bun");
    await writeFile(fakeBun, "#!/bin/sh\nprintf '%s\\n' \"$*\"\n");
    await chmod(fakeBun, 0o755);
    const launched = await run(["/bin/sh", launcher], {
      XDG_CONFIG_HOME: configHome,
      PATH: `${binDirectory}:/usr/bin:/bin`,
    });
    expect(launched.exitCode).toBe(0);
    expect(launched.stdout.trim()).toBe("--no-env-file mcp/wajib/index.ts");
  });
});
