# Main Process

Node.js runtime handling file system, IPC, and app lifecycle.

## Structure
- `index.ts` - App entry point, lifecycle, service/context-registry wiring
- `standalone.ts` - Headless entry point for the HTTP-only standalone build
- `ipc/` - IPC handlers organized by domain
- `http/` - Fastify HTTP routes mirroring the IPC handlers (standalone/remote transport)
- `services/` - Business logic by domain
- `types/` - Type definitions
- `utils/` - Utility functions
- `constants/` - Shared constants (messageTags, worktreePatterns)

## IPC Organization
Handlers in `ipc/` by domain (registered via `handlers.ts`):
- `projects.ts` - Project listing, repository grouping
- `sessions.ts` - Session operations, pagination
- `search.ts` - Search functionality (incl. find-by-id / partial-id)
- `subagents.ts` - Subagent details
- `validation.ts` - Path validation, scroll handling
- `utility.ts` - Shell & file operations
- `config.ts` - Configuration (`configValidation.ts` sanitizes input)
- `notifications.ts` - Notifications
- `memory.ts` - Per-project memory viewer
- `ssh.ts` - SSH connection management
- `context.ts` - Local/SSH context switching
- `updater.ts` - Update checks (no-op stub in this fork)
- `window.ts` - Window controls (minimize/maximize/close/relaunch)

Handlers receive a `ServiceContextRegistry` (not raw service instances) so the
active context can be swapped when connecting to a remote SSH host.

## Adding IPC Handler
1. Add to domain file in `ipc/`
2. If new domain, create file and register in `handlers.ts`
3. Mirror it as a route in `http/` for the standalone transport
4. Add channel constant + method type in `preload/`
5. Implement in appropriate service

## File Watching
FileWatcher service monitors session files with 100ms debounce.
Notifies renderer of changes via IPC events.
