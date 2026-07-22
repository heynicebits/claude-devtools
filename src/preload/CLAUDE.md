# Preload Process

Secure bridge between main and renderer processes via Electron's contextBridge.

## Structure
- `index.ts` - ElectronAPI implementation
- `constants/ipcChannels.ts` - IPC channel name constants

## ElectronAPI Organization
Groups exposed methods by domain (full type: `@shared/types/ElectronAPI`):

### Session APIs
- `getProjects()`, `getSessions()`, `getSessionsPaginated()`, `getSessionsByIds()`
- `getSessionDetail(projectId, sessionId, knownFingerprint?)` - returns `SessionDetailResponse`; short-circuits when the fingerprint is unchanged
- `getSessionMetrics()`, `getWaterfallData()`, `getSessionGroups()`, `getSubagentDetail()`
- `searchSessions()`, `searchAllProjects()`, `findSessionById()`, `findSessionsByPartialId()`, `getAppVersion()`

### Repository APIs
- `getRepositoryGroups()`, `getWorktreeSessions()`

### Validation APIs
- `validatePath()`, `validateMentions()`

### CLAUDE.md / Agent APIs
- `readClaudeMdFiles()`, `readDirectoryClaudeMd()`, `readMentionedFile()`, `readAgentConfigs()`

### Notifications
- `notifications.{get,markRead,markAllRead,delete,clear,getUnreadCount}`
- `notifications.{onNew,onUpdated,onClicked}` - Event listeners

### Config API
- `config.{get,update}` - Read/write config
- `config.{addTrigger,updateTrigger,removeTrigger,getTriggers,testTrigger}`
- `config.{addIgnoreRegex,removeIgnoreRegex,addIgnoreRepository,removeIgnoreRepository}`
- `config.{snooze,clearSnooze,selectFolders}`
- `config.{openInEditor,pinSession,unpinSession,hideSession,unhideSession,hideSessions,unhideSessions}`
- `config.{selectClaudeRootFolder,getClaudeRootInfo,findWslClaudeRoots}` - Claude root selection

### SSH API
- `ssh.{connect,disconnect,getState,test}` - Connection lifecycle
- `ssh.{getConfigHosts,resolveHost,saveLastConnection,getLastConnection}`
- `ssh.onStatus()` - Connection status listener

### Context API
- `context.{list,getActive,switch}` - Local/SSH context switching
- `context.onChanged()` - Context change listener

### Memory API
- `memory.{hasMemory,getIndex,readFile}` - Per-project memory reading
- `memory.{listAvailableOpeners,openIn,copyPath}` - Open-in / clipboard actions
- `memory.onChanged()` - Memory file change listener

### Updater API
- `updater.{check,download,install}`, `updater.onStatus()` (no-op stub in this fork)

### HTTP Server API
- `httpServer.{start,stop,getStatus}` - Standalone/remote sidecar control

### Window Controls
- `windowControls.{minimize,maximize,close,isMaximized,relaunch}` (Windows/Linux)

### Utilities
- `openPath()`, `openExternal()` - Shell operations
- `onFileChange()`, `onTodoChange()` - File/todo watcher events
- `onSessionRefresh()` - Ctrl/Cmd+R refresh (main → renderer)
- `getZoomFactor()`, `onZoomFactorChanged()` - Zoom sync
- `session.scrollToLine()` - Deep link navigation

## IPC Pattern
Config operations use `IpcResult<T>` wrapper pattern:
```typescript
interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```
The `invokeIpcWithResult<T>()` helper unwraps and throws on failure.

## Adding New IPC Methods
1. Define channel constant in `constants/ipcChannels.ts`
2. Implement handler in `src/main/ipc/{domain}.ts`
3. Register in `handlers.ts` via `register{Domain}Handlers()`
4. Add method to ElectronAPI in `preload/index.ts`
5. Update `@shared/types/ElectronAPI` if cross-process type needed
