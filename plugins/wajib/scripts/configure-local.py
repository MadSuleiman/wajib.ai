#!/usr/bin/env python3

"""Configure the local Wajib plugin with a non-secret repository path."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


ERROR_PREFIX = "WAJIB_PLUGIN_CONFIG_ERROR:"
ENTRYPOINT = Path("mcp/wajib/index.ts")


def fail(message: str) -> "NoReturn":
    print(f"{ERROR_PREFIX} {message}", file=sys.stderr)
    raise SystemExit(1)


def discover_repo_root() -> Path:
    plugin_root = Path(__file__).resolve().parent.parent
    try:
        result = subprocess.run(
            ["git", "-C", str(plugin_root), "rev-parse", "--show-toplevel"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        fail("wajib.ai Git root could not be discovered")
    candidate = result.stdout.strip()
    if not candidate:
        fail("wajib.ai Git root could not be discovered")
    return Path(candidate)


def validate_repo_root(candidate: Path) -> Path:
    if not candidate.is_absolute():
        fail("repository path must be absolute")
    try:
        repo_root = candidate.resolve(strict=True)
    except OSError:
        fail("repository path is unavailable")
    if not repo_root.is_dir():
        fail("repository path is not a directory")
    if not (repo_root / "package.json").is_file():
        fail("repository path is not wajib.ai")
    if not (repo_root / ENTRYPOINT).is_file():
        fail("MCP entrypoint is unavailable")
    if shutil.which("bun") is None:
        fail("Bun is unavailable")
    return repo_root


def config_file_path() -> Path:
    configured_home = os.environ.get("XDG_CONFIG_HOME")
    if configured_home:
        config_home = Path(configured_home).expanduser()
        if not config_home.is_absolute():
            fail("configuration home must be absolute")
    else:
        try:
            config_home = Path.home() / ".config"
        except RuntimeError:
            fail("configuration home is unavailable")
    return config_home / "wajib-plugin" / "repo-root"


def write_repo_root(config_file: Path, repo_root: Path) -> None:
    config_dir = config_file.parent
    config_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(config_dir, 0o700)
    descriptor = -1
    temporary_path: Path | None = None
    try:
        descriptor, raw_path = tempfile.mkstemp(prefix=".repo-root.", dir=config_dir)
        temporary_path = Path(raw_path)
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            descriptor = -1
            handle.write(f"{repo_root}\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, config_file)
        temporary_path = None
        os.chmod(config_file, 0o600)
    except OSError:
        fail("repository configuration could not be written")
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        if temporary_path is not None:
            try:
                temporary_path.unlink()
            except FileNotFoundError:
                pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Configure the local Wajib plugin repository path."
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        help="Absolute path to the wajib.ai Git repository.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    candidate = args.repo_root if args.repo_root is not None else discover_repo_root()
    repo_root = validate_repo_root(candidate)
    config_file = config_file_path()
    write_repo_root(config_file, repo_root)
    print(f"Configured Wajib plugin repository: {repo_root}")
    print(f"Configuration file: {config_file}")


if __name__ == "__main__":
    main()
