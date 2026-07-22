# IPC Handlers

Domain-organized IPC request handlers for main process.

## Structure
```
ipc/
├── handlers.ts          # Initialization and registration
├── config.ts            # App configuration handlers
├── configValidation.ts  # Config input validation/sanitization
├── context.ts           # Local/SSH context switching
├── guards.ts            # IPC argument type guards
├── memory.ts            # Per-project memory viewer
├── notifications.ts     # Notification management
├── projects.ts          # Project listing, repository grouping
├── search.ts            # Session content search, find-by-id
├── sessions.ts          # Session operations, pagination
├── ssh.ts               # SSH connection management
├── subagents.ts         # Subagent detail drill-down
├── updater.ts           # Update checks (no-op stub in this fork)
├── utility.ts           # Shell operations, file reading
├── validation.ts        # Path validation, file mentioning
└── window.ts            # Window controls (minimize/maximize/close/relaunch)
```

Each domain module mirrors a route file in `src/main/http/` for the standalone transport.

## Handler Pattern
Each domain module exports:
```typescript
// Setup with services
initialize{Domain}Handlers(services)

// Register with ipcMain
register{Domain}Handlers(ipcMain)

// Cleanup on app quit
remove{Domain}Handlers(ipcMain)
```

## Service Dependencies
`initializeIpcHandlers(registry, updater, sshManager, contextCallbacks)` receives a
`ServiceContextRegistry` rather than raw service instances. Handlers pull the active
`ServiceContext` (ProjectScanner, SessionParser, SubagentResolver, ChunkBuilder,
MemoryReader, DataCache, …) from the registry, so the whole bundle can be swapped when
the user connects to a remote SSH host.

## Response Pattern
Config handlers use `IpcResult<T>` wrapper:
```typescript
return { success: true, data: result };
return { success: false, error: message };
```

Other handlers return data directly or `null` on error.

## Adding New Handler
1. Add to existing domain file or create new file
2. Call `initialize{Domain}Handlers()` if new domain
3. Add `register/remove{Domain}Handlers` in `handlers.ts`
4. Add channel constant in `preload/constants/ipcChannels.ts`
5. Add method to ElectronAPI in `preload/index.ts`
6. Mirror the handler as a route in `src/main/http/{domain}.ts`
7. Implement service logic in `src/main/services/`
