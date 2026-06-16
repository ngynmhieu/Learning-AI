#!/usr/bin/env python3
"""Generate a timestamped Supabase migration from a module schema fragment.

The Supabase CLI requires migrations/ to be a flat, time-ordered list — it does
not recurse into subfolders. But we author schema organized by module under
schema/<module>/*.sql. This script bridges the two layers (the no-Docker stand-in
for `supabase migration new`): it stamps a new, correctly-timestamped migration
into migrations/, seeded from one or more schema fragments — or an empty scaffold
when no matching fragment exists (e.g. an ALTER you write by hand).

Usage:
    python supabase/scripts/gen_migration.py <module> <name> [fragment ...]

Examples:
    # Seed from schema/chat/conversations.sql (fragment derived from the name)
    python supabase/scripts/gen_migration.py chat add_conversations

    # Seed from explicit fragments, concatenated in the given order
    python supabase/scripts/gen_migration.py chat init_chat conversations messages

    # No matching fragment -> empty scaffold you fill in by hand (e.g. an ALTER)
    python supabase/scripts/gen_migration.py chat add_message_edited_at

Rules:
    - Only ever CREATES a new migration; never edits an already-applied one.
    - The timestamp is UTC YYYYMMDDHHMMSS, bumped if needed so it always sorts
      after the latest existing migration.
    - The schema/<module>/ fragment stays the source of truth for the desired
      shape; remember to update it alongside any change you write by hand.
"""
from __future__ import annotations

import re
import sys
from datetime import datetime, timezone
from pathlib import Path

SUPABASE_DIR = Path(__file__).resolve().parent.parent
SCHEMA_DIR = SUPABASE_DIR / "schema"
MIGRATIONS_DIR = SUPABASE_DIR / "migrations"

_NAME_RE = re.compile(r"^[a-z0-9_]+$")
_VERB_PREFIX = re.compile(r"^(create|add|update|alter|drop)_")
_TIMESTAMP_PREFIX = re.compile(r"^(\d{14})_")


def _fail(msg: str) -> "None":
    print(f"error: {msg}\n", file=sys.stderr)
    print(__doc__, file=sys.stderr)
    raise SystemExit(2)


def _next_timestamp() -> str:
    """UTC YYYYMMDDHHMMSS, guaranteed to sort after every existing migration."""
    now = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    latest = "0"
    if MIGRATIONS_DIR.exists():
        for path in MIGRATIONS_DIR.glob("*.sql"):
            match = _TIMESTAMP_PREFIX.match(path.name)
            if match and match.group(1) > latest:
                latest = match.group(1)
    # If two runs land in the same second, or clock skew, step past the latest.
    return now if now > latest else str(int(latest) + 1)


def _resolve_fragments(module: str, name: str, explicit: list[str]) -> list[Path]:
    """Explicit fragments if given, else one derived from the name (verb stripped)."""
    module_dir = SCHEMA_DIR / module
    if explicit:
        paths = []
        for frag in explicit:
            path = module_dir / f"{frag}.sql"
            if not path.is_file():
                _fail(f"fragment not found: {path.relative_to(SUPABASE_DIR)}")
            paths.append(path)
        return paths
    derived = module_dir / f"{_VERB_PREFIX.sub('', name)}.sql"
    return [derived] if derived.is_file() else []


def _build_body(name: str, module: str, fragments: list[Path]) -> str:
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    header = [f"-- {name}", f"-- Generated {stamp} by scripts/gen_migration.py"]
    if fragments:
        rels = ", ".join(str(p.relative_to(SUPABASE_DIR)).replace("\\", "/") for p in fragments)
        header.append(f"-- Seeded from: {rels}")
        header.append(f"-- Desired shape stays authoritative in schema/{module}/.")
        body = "\n\n".join(p.read_text(encoding="utf-8").strip() for p in fragments)
    else:
        header.append(f"-- No matching schema/{module}/ fragment — scaffold only.")
        header.append(f"-- Write the change below, and update schema/{module}/ to match.")
        body = "-- TODO: write the schema change (e.g. alter table ...)."
    return "\n".join(header) + "\n\n" + body + "\n"


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        _fail("expected at least <module> and <name>")
    module, name, *explicit = argv
    if not _NAME_RE.match(module):
        _fail(f"module must be snake_case [a-z0-9_]: {module!r}")
    if not _NAME_RE.match(name):
        _fail(f"name must be snake_case [a-z0-9_]: {name!r}")

    fragments = _resolve_fragments(module, name, explicit)
    timestamp = _next_timestamp()
    target = MIGRATIONS_DIR / f"{timestamp}_{name}.sql"
    if target.exists():  # never clobber an existing migration
        _fail(f"migration already exists: {target.name}")

    MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
    target.write_text(_build_body(name, module, fragments), encoding="utf-8")

    rel = target.relative_to(SUPABASE_DIR).as_posix()
    if fragments:
        print(f"created {rel}")
    else:
        print(f"created {rel} (empty scaffold - no schema/{module}/ fragment matched)")
    print("next: review it, then `supabase db push`")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
