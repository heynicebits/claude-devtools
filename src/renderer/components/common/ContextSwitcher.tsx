/**
 * ContextSwitcher - Workspace context dropdown in SidebarHeader.
 *
 * Displays active context (Local or SSH host) with connection status badge.
 * Dropdown lists all available contexts with click-to-switch functionality.
 */

import { useEffect, useRef, useState } from 'react';

import { useStore } from '@renderer/store';
import { Check, ChevronDown } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { ConnectionStatusBadge } from './ConnectionStatusBadge';

export const ContextSwitcher = (): React.JSX.Element => {
  const { activeContextId, isContextSwitching, availableContexts, switchContext } = useStore(
    useShallow((s) => ({
      activeContextId: s.activeContextId,
      isContextSwitching: s.isContextSwitching,
      availableContexts: s.availableContexts,
      switchContext: s.switchContext,
    }))
  );

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Get display label for context
  const getContextLabel = (contextId: string): string => {
    if (contextId === 'local') {
      return 'Local';
    }
    // Strip 'ssh-' prefix for display (e.g., 'ssh-192.168.1.10' -> '192.168.1.10')
    return contextId.startsWith('ssh-') ? contextId.slice(4) : contextId;
  };

  const activeLabel = getContextLabel(activeContextId);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => !isContextSwitching && setIsOpen(!isOpen)}
        disabled={isContextSwitching}
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-opacity hover:opacity-80 ${isContextSwitching ? 'opacity-50' : ''}`}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <ConnectionStatusBadge contextId={activeContextId} />
        <span
          className="font-medium"
          style={{ color: isContextSwitching ? 'var(--color-text-muted)' : 'var(--color-text)' }}
        >
          {activeLabel}
        </span>
        <ChevronDown
          className={`size-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-text-muted)' }}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && !isContextSwitching && (
        <>
          {/* Backdrop overlay */}
          <div
            role="presentation"
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown content */}
          <div
            className="absolute inset-x-4 top-full z-20 mt-1 max-h-[250px] overflow-y-auto rounded-lg py-1 shadow-xl"
            style={{
              backgroundColor: 'var(--color-surface-sidebar)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Switch Workspace
            </div>

            {/* Context list */}
            {availableContexts.map((ctx) => {
              const isSelected = ctx.id === activeContextId;
              const label = getContextLabel(ctx.id);

              return (
                <ContextItem
                  key={ctx.id}
                  contextId={ctx.id}
                  label={label}
                  isSelected={isSelected}
                  onSelect={() => {
                    void switchContext(ctx.id);
                    setIsOpen(false);
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Individual context item in the dropdown.
 */
interface ContextItemProps {
  contextId: string;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

const ContextItem = ({
  contextId,
  label,
  isSelected,
  onSelect,
}: Readonly<ContextItemProps>): React.JSX.Element => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle: React.CSSProperties = isSelected
    ? { backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text)' }
    : {
        backgroundColor: isHovered ? 'var(--color-surface-raised)' : 'transparent',
        opacity: isHovered ? 0.5 : 1,
      };

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
      style={buttonStyle}
    >
      <ConnectionStatusBadge contextId={contextId} />
      <span
        className="flex-1 truncate text-sm"
        style={{ color: isSelected ? 'var(--color-text)' : 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      {isSelected && <Check className="size-3.5 shrink-0 text-indigo-400" />}
    </button>
  );
};
