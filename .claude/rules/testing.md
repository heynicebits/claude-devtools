---
globs: ["test/**/*", "**/*.test.ts", "**/*.spec.ts"]
---

# Testing Conventions

## Test Framework
Uses Vitest with `happy-dom` environment. Config in `vitest.config.ts`.

## Test Commands
```bash
pnpm test                 # Run all vitest tests
pnpm test:watch           # Watch mode
pnpm test:coverage        # Coverage report
pnpm test:coverage:critical # Critical path coverage
```

## Test Structure
```
test/
├── main/
│   ├── ipc/             # IPC handler tests
│   │   ├── configValidation.test.ts
│   │   ├── globalSearch.test.ts
│   │   ├── guards.test.ts
│   │   └── searchSessionId.test.ts
│   ├── services/        # Service tests
│   │   ├── analysis/    (ChunkBuilder)
│   │   ├── discovery/   (ProjectPathResolver, ProjectScanner, SearchTextCache, SearchTextExtractor, SessionSearcher, MemoryReader, WorktreeGrouper)
│   │   ├── infrastructure/ (FileWatcher)
│   │   └── parsing/     (MessageClassifier, SessionParser, AgentConfigReader, GitIdentityResolver)
│   └── utils/           # Main process utilities
│       ├── jsonl.test.ts
│       ├── pathDecoder.test.ts
│       ├── pathValidation.test.ts
│       ├── regexValidation.test.ts
│       └── tokenizer.test.ts
├── renderer/
│   ├── components/      # Component tests (memoryFrontmatter, renderOutput)
│   ├── constants/       # teamColors.test.ts
│   ├── hooks/           # Hook tests
│   │   ├── navigationUtils.test.ts
│   │   ├── useAutoScrollBottom.test.ts
│   │   ├── useSearchContextNavigation.test.ts
│   │   └── useVisibleAIGroup.test.ts
│   ├── store/           # Zustand store slices
│   │   ├── memorySlice.test.ts
│   │   ├── notificationSlice.test.ts
│   │   ├── paneSlice.test.ts
│   │   ├── pathResolution.test.ts
│   │   ├── sessionSlice.test.ts
│   │   ├── tabSlice.test.ts
│   │   └── tabUISlice.test.ts
│   └── utils/           # Renderer utilities
│       ├── claudeMdTracker.test.ts
│       ├── dateGrouping.test.ts
│       ├── displayItemBuilder.test.ts
│       ├── formatters.test.ts
│       ├── keyboardUtils.test.ts
│       ├── pathUtils.test.ts
│       ├── renderHelpers.test.ts
│       ├── sessionExporter.test.ts
│       └── stringUtils.test.ts
├── shared/
│   └── utils/           # Shared utilities
│       ├── markdownSearchRendererAlignment.test.ts
│       ├── markdownTextSearch.test.ts
│       ├── memoryIndex.test.ts
│       ├── modelParser.test.ts
│       ├── sessionDetailResponse.test.ts
│       ├── sessionIdValidator.test.ts
│       └── tokenFormatting.test.ts
├── mocks/               # Test fixtures and mocks (electronAPI)
└── setup.ts             # Test setup/config
```

## Files to Test After Changes
- `services/analysis/ChunkBuilder.ts` - Chunk building logic
- `services/parsing/SessionParser.ts` - JSONL parsing
- `services/parsing/MessageClassifier.ts` - Message classification
- Store slices in `src/renderer/store/slices/`
- Utility functions in `*/utils/`

## Test Data
Test fixtures use real JSONL session data from `~/.claude/projects/`.
