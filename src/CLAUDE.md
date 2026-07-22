# src/ Structure

Three-process Electron architecture:

## Processes
- `main/` - Node.js runtime (file system, IPC, lifecycle)
- `preload/` - Secure bridge (contextBridge API)
- `renderer/` - React/Chromium (UI, state, visualization)
- `shared/` - Cross-process types and utilities

## Import Pattern
Use barrel exports from domain folders:
```typescript
import { ChunkBuilder, ProjectScanner } from './services';
```

## IPC Communication
Renderer reaches the main process through the `ElectronAPI` surface, organized by domain:

| Domain | Methods | Examples |
|--------|---------|---------|
| Sessions | 14 | `getProjects()`, `getSessionsPaginated()`, `getSessionDetail()`, `getSessionGroups()`, `searchSessions()`, `searchAllProjects()`, `findSessionById()`, `findSessionsByPartialId()`, `getSessionsByIds()` |
| Repository | 2 | `getRepositoryGroups()`, `getWorktreeSessions()` |
| Validation | 2 | `validatePath()`, `validateMentions()` |
| CLAUDE.md / Agents | 4 | `readClaudeMdFiles()`, `readDirectoryClaudeMd()`, `readMentionedFile()`, `readAgentConfigs()` |
| Config | 24 | `config.get()`, `config.update()`, `config.addTrigger()`, `config.pinSession()`, `config.hideSession()`, `config.getClaudeRootInfo()`, etc. |
| Notifications | 9 | `notifications.get()`, `notifications.markRead()`, `notifications.onNew()`, etc. |
| SSH | 9 | `ssh.connect()`, `ssh.disconnect()`, `ssh.getConfigHosts()`, `ssh.resolveHost()`, `ssh.onStatus()`, etc. |
| Context | 4 | `context.list()`, `context.getActive()`, `context.switch()`, `context.onChanged()` |
| Memory | 7 | `memory.hasMemory()`, `memory.getIndex()`, `memory.readFile()`, `memory.openIn()`, `memory.onChanged()`, etc. |
| Updater | 4 | `updater.check()`, `updater.download()`, `updater.install()`, `updater.onStatus()` |
| HTTP Server | 3 | `httpServer.start()`, `httpServer.stop()`, `httpServer.getStatus()` |
| Window | 5 | `windowControls.minimize()`, `windowControls.maximize()`, `windowControls.relaunch()`, etc. |
| Utilities | 7 | `openPath()`, `openExternal()`, `onFileChange()`, `onSessionRefresh()`, `getZoomFactor()`, etc. |
| Session | 1 | `session.scrollToLine()` |

## Transports
The renderer imports `api` from `@renderer/api` — a Proxy that dispatches to
`window.electronAPI` (Electron) or an HTTP client (`api/httpClient.ts`) when running
as a standalone/browser build served by the main-process HTTP sidecar (`src/main/http/`).

Full API signatures in `src/preload/index.ts`, channel constants in `src/preload/constants/ipcChannels.ts`.
