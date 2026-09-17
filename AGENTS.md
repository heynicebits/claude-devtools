# Agent Instructions — Pointer File

**The canonical instruction file for this folder is `CLAUDE.md`.** Read it first
before doing any work here.

This file (`AGENTS.md`) exists only so that Codex — which looks for `AGENTS.md`
by name on startup — finds a real file instead of falling through to fallback
logic that has historically overwritten canonical instruction files.

<!--
DO NOT replace this file with a symlink (`ln -s`). Sync tools (Obsidian Sync,
OneDrive) mishandle symlinks — Obsidian Sync treats them as deleted and
broadcasts delete events that loop against `chflags uchg`-locked copies on
other machines (infinite EPERM errors).

On case-insensitive macOS (APFS), differently-cased names like `CLAUDE.md` and
`claude.md` are the SAME file — never create a second-cased variant of an
existing instruction file; it silently overwrites it.

`CLAUDE.md` and this `AGENTS.md` may be locked with `chflags uchg`. To edit
legitimately: `chflags nouchg <file>`, edit, then `chflags uchg <file>`. Never
work around the lock by writing to a different filename.
-->

Now go read `CLAUDE.md`.
