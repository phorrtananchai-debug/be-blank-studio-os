import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

function getCommandText(command) {
  return [command.label, command.group, command.description, ...(command.keywords || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getShortcutLabel() {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
    return 'Cmd K';
  }

  return 'Ctrl K';
}

export function CommandPalette({ commands, isOpen, onClose, onOpen }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const shortcutLabel = getShortcutLabel();

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return commands;
    }

    return commands.filter((command) => getCommandText(command).includes(normalizedQuery));
  }, [commands, query]);

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isCommandK) {
        return;
      }

      event.preventDefault();
      if (isOpen) {
        onClose();
      } else {
        onOpen();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose, onOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (selectedIndex > filteredCommands.length - 1) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  if (!isOpen) {
    return null;
  }

  const runCommand = (command) => {
    if (!command || command.disabled) {
      return;
    }

    command.run();
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, filteredCommands.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(filteredCommands[selectedIndex]);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-studio-ink/20 px-4 py-20 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command palette">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close command palette" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-black/[0.08] bg-white shadow-deep">
        <div className="flex min-h-16 items-center gap-3 border-b border-black/[0.06] px-5">
          <Search className="size-4 text-studio-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-studio-ink outline-none placeholder:text-studio-muted/50"
            placeholder="Search commands"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="rounded-full border border-black/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-studio-muted">
            {shortcutLabel}
          </span>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2" role="listbox" aria-label="Commands">
          {filteredCommands.map((command, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={command.id}
                className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-[18px] px-4 py-3 text-left transition-all duration-150 ${
                  isSelected ? 'bg-studio-stone text-studio-ink' : 'text-studio-muted hover:bg-studio-panelSoft hover:text-studio-ink'
                } ${command.disabled ? 'cursor-not-allowed opacity-45' : ''}`}
                disabled={command.disabled}
                role="option"
                aria-selected={isSelected}
                type="button"
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => runCommand(command)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{command.label}</span>
                  {command.description && <span className="mt-1 block truncate text-xs text-studio-muted">{command.description}</span>}
                </span>
                {command.group && <span className="shrink-0 text-[10px] font-bold uppercase tracking-tight text-studio-muted/70">{command.group}</span>}
              </button>
            );
          })}

          {!filteredCommands.length && (
            <div className="px-4 py-10 text-center text-sm font-medium text-studio-muted">
              No commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
