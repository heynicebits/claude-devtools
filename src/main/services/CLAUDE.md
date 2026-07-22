# Services

Business logic organized by domain.

## Domains
- `analysis/` - Chunk building, semantic steps, tool execution
- `discovery/` - Project/session scanning, subagent resolution, memory, search-text extraction
- `error/` - Error detection, trigger checking
- `infrastructure/` - Cache, file watching, config, notifications, SSH, contexts, HTTP server
- `parsing/` - JSONL parsing, message classification, agent config

## Key Services

### Analysis
- **ChunkBuilder** - Orchestrates chunk building
- **ChunkFactory** - Creates chunk objects
- **ConversationGroupBuilder** - Builds conversation groups
- **ProcessLinker** - Links subagents to chunks
- **SemanticStepExtractor** - Extracts steps
- **SemanticStepGrouper** - Groups semantic steps
- **SubagentDetailBuilder** - Builds subagent detail views
- **ToolExecutionBuilder** - Builds tool execution tracking
- **ToolResultExtractor** - Extracts tool results
- **ToolSummaryFormatter** - Formats tool summaries

### Discovery
- **MemoryReader** - Reads per-project memory dirs, parses MEMORY.md index + orphan files
- **ProjectPathResolver** - Resolves project paths
- **ProjectScanner** - Scans ~/.claude/projects/
- **SearchTextCache** - Caches extracted searchable text per session
- **SearchTextExtractor** - Extracts searchable plain text from session messages
- **SessionContentFilter** - Filters session content
- **SessionSearcher** - Searches session content
- **SubagentLocator** - Locates subagent files
- **SubagentResolver** - Parses subagent files, detects parallel execution, enriches team metadata/colors
- **SubprojectRegistry** - Tracks subproject associations
- **WorktreeGrouper** - Groups projects by git worktree

### Parsing
- **SessionParser** - Parses JSONL files
- **MessageClassifier** - Categorizes messages (user, system, AI, noise)
- **ClaudeMdReader** - Reads CLAUDE.md configuration
- **AgentConfigReader** - Reads agent/subagent config from `.claude/agents`
- **GitIdentityResolver** - Resolves git identities

### Error
- **ErrorDetector** - Per-tool-use token counting, returns `DetectedError[]`
- **ErrorMessageBuilder** - Builds error notification messages
- **ErrorTriggerChecker** - Matches against notification triggers
- **ErrorTriggerTester** - Tests triggers against historical data
- **TriggerMatcher** - Pattern matching for triggers

### Infrastructure
- **DataCache** - LRU cache (50 entries, 10min TTL)
- **FileWatcher** - 100ms debounced file watching
- **ConfigManager** - App configuration
- **NotificationManager** - Notification handling
- **TriggerManager** - Notification trigger management
- **FileSystemProvider** / **LocalFileSystemProvider** / **SshFileSystemProvider** - FS abstraction (local vs. remote SSH)
- **ServiceContext** / **ServiceContextRegistry** - Per-context service bundles (local + SSH), swapped on connect
- **SshConnectionManager** - SSH connection lifecycle and state
- **SshConfigParser** - Parses `~/.ssh/config`
- **SshHostResolver** - Resolves SSH host aliases
- **HttpServer** - Fastify sidecar serving the standalone/remote transport
- **UpdaterService** - No-op stub (auto-update disabled in this fork)

## Adding Service
1. Create in appropriate domain folder
2. Export from domain's index.ts
3. Re-export from services/index.ts
