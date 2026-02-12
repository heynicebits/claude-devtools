---
phase: 02-service-infrastructure
plan: 02
subsystem: main-process
tags: [registry-integration, ipc-refactoring, ssh-context-management]
dependency-graph:
  requires: [02-01]
  provides: [registry-based-service-routing]
  affects: [all-ipc-handlers, ssh-connect-flow]
tech-stack:
  added: []
  patterns: [registry-routing, dynamic-service-resolution, context-switching]
key-files:
  created: []
  modified:
    - src/main/index.ts
    - src/main/ipc/handlers.ts
    - src/main/ipc/projects.ts
    - src/main/ipc/sessions.ts
    - src/main/ipc/search.ts
    - src/main/ipc/subagents.ts
    - src/main/ipc/ssh.ts
decisions:
  - "File watcher event rewiring handled by exported onContextSwitched callback from index.ts"
  - "SSH handler imports onContextSwitched dynamically to avoid circular dependencies"
  - "Context ID for SSH uses simple format: ssh-{host}"
  - "Destroy existing SSH context on reconnection to same host"
metrics:
  duration: 6
  completed: 2026-02-12
---

# Phase 02 Plan 02: Registry Integration Summary

**Registry-based service routing with multi-context SSH support**

## Objective Achieved

Replaced global service variables in main/index.ts with ServiceContextRegistry, updated all IPC handlers to route through registry.getActive(), and implemented SSH context creation/destruction flow.

## Tasks Completed

### Task 1: Refactor main/index.ts to use ServiceContextRegistry

**Changed:**
- Removed global service variables (projectScanner, sessionParser, subagentResolver, chunkBuilder, dataCache, fileWatcher, cleanupInterval)
- Added `contextRegistry: ServiceContextRegistry`
- Removed `handleModeSwitch` callback entirely
- Created `wireFileWatcherEvents(context)` helper to manage event listener cleanup
- Created `onContextSwitched(context)` export for SSH handler to call

**Implementation:**
```typescript
// Create ServiceContextRegistry
contextRegistry = new ServiceContextRegistry();

// Create local context
const localContext = new ServiceContext({
  id: 'local',
  type: 'local',
  fsProvider: new LocalFileSystemProvider(),
});

// Register and start
contextRegistry.registerContext(localContext);
localContext.start();

// Wire file watcher events
wireFileWatcherEvents(localContext);

// Initialize IPC handlers with registry
initializeIpcHandlers(contextRegistry, updaterService, sshConnectionManager);
```

**handlers.ts changes:**
- Changed `initializeIpcHandlers` to accept `ServiceContextRegistry` instead of individual services
- Removed `reinitializeServiceHandlers` entirely (no longer needed)
- Updated all domain handler initialize calls to pass registry

**Files modified:**
- src/main/index.ts (111 insertions, 161 deletions)
- src/main/ipc/handlers.ts

**Commit:** 5bf41c6

### Task 2: Update domain IPC handlers to route via registry

**Pattern applied to all handlers:**
```typescript
let registry: ServiceContextRegistry;

export function initialize{Domain}Handlers(contextRegistry: ServiceContextRegistry): void {
  registry = contextRegistry;
}

async function handleXxx(...): Promise<...> {
  const { projectScanner, sessionParser, ... } = registry.getActive();
  // Use services
}
```

**projects.ts:**
- Changed signature to `initializeProjectHandlers(registry: ServiceContextRegistry)`
- Resolve `projectScanner` via `registry.getActive()` in each handler
- 3 handlers updated

**sessions.ts:**
- Changed signature to `initializeSessionHandlers(registry: ServiceContextRegistry)`
- Destructure all services from `registry.getActive()` at invocation time
- 6 handlers updated

**search.ts:**
- Changed signature to `initializeSearchHandlers(registry: ServiceContextRegistry)`
- Resolve `projectScanner` via `registry.getActive()`
- 1 handler updated

**subagents.ts:**
- Changed signature to `initializeSubagentHandlers(registry: ServiceContextRegistry)`
- Resolve all services from `registry.getActive()`
- Still passes fsProvider and projectsDir to buildSubagentDetail as before
- 1 handler updated

**ssh.ts:**
- Changed signature to `initializeSshHandlers(manager, registry)`
- Removed `onModeSwitch` callback parameter
- **SSH_CONNECT handler:**
  - Creates new `ServiceContext` with SSH provider
  - Registers in registry
  - Starts context
  - Switches registry to new context
  - Dynamically imports `onContextSwitched` from index.ts and calls it
- **SSH_DISCONNECT handler:**
  - Switches registry back to 'local'
  - Destroys SSH context
  - Calls `onContextSwitched` with local context
- All other SSH handlers unchanged (test, getConfigHosts, etc.)

**Files modified:**
- src/main/ipc/projects.ts
- src/main/ipc/sessions.ts
- src/main/ipc/search.ts
- src/main/ipc/subagents.ts
- src/main/ipc/ssh.ts (100 insertions, 70 deletions)

**Commit:** 24051ac

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

**Type checking:** ✅ Pass
```
pnpm typecheck — zero errors
```

**Tests:** ✅ Pass
```
Test Files: 31 passed
Tests: 494 passed
Duration: 4.88s
```

**Code inspection:** ✅ Pass
- main/index.ts has `contextRegistry` instead of individual service globals
- `reinitializeServiceHandlers` no longer exists in handlers.ts
- All IPC handlers use `registry.getActive()` pattern (12 occurrences)
- SSH connect creates ServiceContext and registers it
- SSH disconnect destroys SSH context and switches to local
- File watcher events rewired via onContextSwitched callback

## Architecture Impact

**Before (single-context):**
```
main/index.ts:
  let projectScanner: ProjectScanner
  let sessionParser: SessionParser
  ...

IPC handlers:
  let projectScanner = /* set at init */
  function handleXxx() {
    projectScanner.scan() // always uses same instance
  }

SSH connect:
  recreate all services with new provider
  call reinitializeServiceHandlers()
```

**After (multi-context):**
```
main/index.ts:
  let contextRegistry: ServiceContextRegistry
  contextRegistry.registerContext(localContext)

IPC handlers:
  let registry: ServiceContextRegistry
  function handleXxx() {
    const { projectScanner } = registry.getActive()
    projectScanner.scan() // dynamically resolved
  }

SSH connect:
  create new ServiceContext
  registry.registerContext(sshContext)
  registry.switch('ssh-host')
  // local context stays alive in background
```

**Key improvements:**
1. **No service recreation** - contexts are isolated, switching is instant
2. **Local context persists** - can switch back without re-initialization
3. **No reinitializeServiceHandlers** - dynamic routing eliminates the need
4. **Clean separation** - SSH connection management vs. service context management
5. **File watcher stays alive** - only pause/resume on switch

## Next Steps

**Phase 02 Plan 03 (SSH notification manager integration):**
- Set NotificationManager on SSH context's FileWatcher
- Ensure error detection works for SSH sessions
- Wire up SSH context file watcher to NotificationManager

**Phase 03 (Renderer state management):**
- Snapshot/restore Zustand state on context switch
- Validate tab restoration against current context
- Update workspace indicators in sidebar

## Self-Check

**Created files exist:** N/A (no new files created)

**Modified files verified:**
```
✓ src/main/index.ts — uses contextRegistry
✓ src/main/ipc/handlers.ts — accepts registry, no reinitialize function
✓ src/main/ipc/projects.ts — routes via registry.getActive()
✓ src/main/ipc/sessions.ts — routes via registry.getActive()
✓ src/main/ipc/search.ts — routes via registry.getActive()
✓ src/main/ipc/subagents.ts — routes via registry.getActive()
✓ src/main/ipc/ssh.ts — creates/destroys ServiceContext
```

**Commits exist:**
```
✓ 5bf41c6 — refactor(02-02): main/index.ts to use ServiceContextRegistry
✓ 24051ac — refactor(02-02): IPC handlers route via ServiceContextRegistry
```

**Self-Check: PASSED**

---
*Completed: 2026-02-12*
*Duration: 6 minutes*
