/**
 * MemorySection — single sidebar row that opens the per-project memory in
 * a new tab/pane. Only rendered when the active project has a memory
 * directory containing at least one .md file.
 *
 * No inline expansion, no preview — clicking the row opens MemoryView in a
 * full pane, which is the canonical place to browse, search, and dispatch
 * to external editors.
 */

import { useEffect } from 'react';

import { useStore } from '@renderer/store';
import { useShallow } from 'zustand/react/shallow';

export const MemorySection = (): React.JSX.Element | null => {
  const {
    selectedProjectId,
    hasMemory,
    indexEntryCount,
    loading,
    loadMemoryForProject,
    openMemoryTab,
  } = useStore(
    useShallow((s) => {
      const projectId = s.selectedProjectId;
      const index = projectId ? s.indexByProjectId[projectId] : null;
      const entryCount = (index?.entries.length ?? 0) + (index?.orphanFiles.length ?? 0);
      return {
        selectedProjectId: projectId,
        hasMemory: projectId ? s.hasMemoryByProjectId[projectId] : undefined,
        indexEntryCount: entryCount,
        loading: projectId ? (s.memoryLoadingByProjectId[projectId] ?? false) : false,
        loadMemoryForProject: s.loadMemoryForProject,
        openMemoryTab: s.openMemoryTab,
      };
    })
  );

  useEffect(() => {
    if (!selectedProjectId) return;
    if (hasMemory === undefined) void loadMemoryForProject(selectedProjectId);
  }, [selectedProjectId, hasMemory, loadMemoryForProject]);

  if (!selectedProjectId) return null;
  if (hasMemory === undefined && loading) return null;
  if (!hasMemory) return null;

  return (
    <button
      type="button"
      onClick={(): void => openMemoryTab(selectedProjectId)}
      className="flex w-full items-center gap-1 border-b px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted hover:bg-surface-raised hover:text-text-secondary"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <span className="inline-block w-3 text-center">▸</span>
      <span>Memory</span>
      {indexEntryCount > 0 && <span className="text-text-muted">({indexEntryCount})</span>}
    </button>
  );
};
