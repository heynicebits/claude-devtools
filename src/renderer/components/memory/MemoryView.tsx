/**
 * MemoryView — full-pane view for a project's memory directory.
 *
 * Layout: master/detail.
 *   Left:  list of memory layers (MEMORY.md entries + Unlinked .md files)
 *   Right: rendered markdown of the selected layer + toolbar with search and
 *          "Open in..." launcher.
 *
 * Opens as its own tab via tabSlice — same UX class as session tabs.
 */

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { markdownComponents } from '@renderer/components/chat/markdownComponents';
import { useStore } from '@renderer/store';
import { Search } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import { useShallow } from 'zustand/react/shallow';

import { OpenInMenu } from '../sidebar/memory/OpenInMenu';

interface MemoryViewProps {
  projectId: string;
}

interface ListRow {
  key: string;
  title: string;
  hook: string;
  fileName: string;
  isOrphan: boolean;
}

function highlightSearch(content: string, query: string): string {
  if (!query.trim()) return content;
  // Simple safe escape so user input doesn't break markdown rendering.
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  return content.replace(re, (m) => `**${m}**`);
}

export const MemoryView = ({ projectId }: MemoryViewProps): React.JSX.Element => {
  const { index, hasMemory, fileContents, loadMemoryForProject, toggleMemoryEntry, expanded } =
    useStore(
      useShallow((s) => ({
        index: s.indexByProjectId[projectId] ?? null,
        hasMemory: s.hasMemoryByProjectId[projectId],
        fileContents: s.fileContents,
        loadMemoryForProject: s.loadMemoryForProject,
        toggleMemoryEntry: s.toggleMemoryEntry,
        expanded: s.expandedEntriesByProjectId[projectId] ?? [],
      }))
    );

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (hasMemory === undefined) void loadMemoryForProject(projectId);
  }, [projectId, hasMemory, loadMemoryForProject]);

  const rows: ListRow[] = useMemo(() => {
    if (!index) return [];
    const entryRows: ListRow[] = index.entries.map((e) => ({
      key: e.file,
      title: e.title,
      hook: e.hook,
      fileName: e.file,
      isOrphan: false,
    }));
    const orphanRows: ListRow[] = index.orphanFiles.map((f) => ({
      key: f,
      title: f,
      hook: '',
      fileName: f,
      isOrphan: true,
    }));
    return [...entryRows, ...orphanRows];
  }, [index]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedFile(null);
      return;
    }
    if (!selectedFile || !rows.some((r) => r.fileName === selectedFile)) {
      setSelectedFile(rows[0].fileName);
    }
  }, [rows, selectedFile]);

  // Load the selected layer's content on demand via the existing slice action.
  useEffect(() => {
    if (!selectedFile) return;
    const key = `${projectId}::${selectedFile}`;
    if (fileContents[key] !== undefined) return;
    if (!expanded.includes(selectedFile)) {
      void toggleMemoryEntry(projectId, selectedFile);
    }
  }, [selectedFile, projectId, fileContents, expanded, toggleMemoryEntry]);

  const content = selectedFile ? fileContents[`${projectId}::${selectedFile}`] : undefined;
  const rendered = useMemo(
    () => (content !== undefined ? highlightSearch(content, query) : undefined),
    [content, query]
  );

  if (!hasMemory) {
    return (
      <div className="flex flex-1 items-center justify-center text-text-muted">
        This project has no memory directory yet.
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Layers list */}
      <div
        className="flex w-64 shrink-0 flex-col border-r"
        style={{
          backgroundColor: 'var(--color-surface-sidebar)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Layers {rows.length > 0 && <span>({rows.length})</span>}
        </div>
        <div className="flex-1 overflow-y-auto pb-2">
          {rows.length === 0 && (
            <div className="px-3 py-2 text-xs text-text-muted">No memory layers yet</div>
          )}
          {rows.map((row) => {
            const isActive = row.fileName === selectedFile;
            return (
              <button
                key={row.key}
                type="button"
                onClick={(): void => setSelectedFile(row.fileName)}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-surface-raised"
                style={{
                  backgroundColor: isActive ? 'var(--color-surface-raised)' : undefined,
                }}
              >
                <span className="text-xs font-medium text-text">{row.title}</span>
                {row.hook && (
                  <span className="line-clamp-2 text-[11px] text-text-muted">{row.hook}</span>
                )}
                {row.isOrphan && (
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    Unlinked
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content viewer */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className="flex items-center justify-between gap-2 border-b px-4 py-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="relative flex flex-1 items-center">
            <Search size={14} className="absolute left-2 text-text-muted" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e): void => setQuery(e.target.value)}
              placeholder="Search this layer…"
              className="w-full rounded border bg-transparent py-1 pl-7 pr-2 text-xs text-text outline-none focus:ring-1"
              style={{
                borderColor: 'var(--color-border-emphasis)',
              }}
            />
          </div>
          {selectedFile && (
            <OpenInMenu projectId={projectId} fileName={selectedFile} variant="iconMenu" />
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {selectedFile === null ? (
            <div className="text-text-muted">Select a layer to view its content.</div>
          ) : rendered === undefined ? (
            <div className="text-text-muted">Loading…</div>
          ) : (
            <div className="prose-sm max-w-3xl" style={{ color: 'var(--prose-body)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {rendered}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
