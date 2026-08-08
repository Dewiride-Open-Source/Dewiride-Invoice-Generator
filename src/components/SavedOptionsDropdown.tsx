import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CompanyDetails, ItemDescription } from '../utils/savedData';
import { trackSavedDataUsed } from '../utils/analytics';
import { ChevronDownIcon, PlusIcon, SearchIcon } from './icons';

interface Option {
  id: string;
  label: string;
  value: string;
  secondaryValue?: string;
  defaultPrice?: number;
}

interface SavedOptionsDropdownProps {
  value: string;
  secondaryValue?: string;
  onSelect: (value: string, secondaryValue?: string, defaultPrice?: number) => void;
  onSave?: () => void;
  options: readonly CompanyDetails[] | readonly ItemDescription[];
  placeholder: string;
  type: 'company' | 'item';
  label: string;
  disabled?: boolean;
  className?: string;
}

const SAVE_OPTION_ID = 'save-current';

/**
 * A listbox of previously-used companies or item descriptions.
 *
 * Rebuilt to the WAI-ARIA combobox pattern. The previous version was a plain
 * button toggling a div of buttons: no combobox/listbox/option roles, no
 * aria-expanded, no aria-activedescendant, and -- the actual blocker -- no way
 * to dismiss it from the keyboard at all, since it only listened for mousedown
 * on the document.
 *
 * Focus stays on the search input throughout and the active option is tracked
 * with aria-activedescendant, which is the pattern's standard arrangement:
 * moving DOM focus onto each option instead would interrupt typing.
 */
const SavedOptionsDropdown: React.FC<SavedOptionsDropdownProps> = ({
  value,
  secondaryValue,
  onSelect,
  onSave,
  options,
  placeholder,
  type,
  label,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionDomId = (id: string) => `${baseId}-option-${id}`;

  const formattedOptions: Option[] = useMemo(
    () =>
      options.map((option) =>
        type === 'company'
          ? {
              id: (option as CompanyDetails).id,
              label: (option as CompanyDetails).name,
              value: (option as CompanyDetails).name,
              secondaryValue: (option as CompanyDetails).address,
            }
          : {
              id: (option as ItemDescription).id,
              label: (option as ItemDescription).description,
              value: (option as ItemDescription).description,
              defaultPrice: (option as ItemDescription).defaultPrice,
            },
      ),
    [options, type],
  );

  const filteredOptions = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return formattedOptions;
    return formattedOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.secondaryValue?.toLowerCase().includes(needle),
    );
  }, [formattedOptions, searchTerm]);

  const hasValidInput =
    value.trim().length > 0 && (type === 'item' || Boolean(secondaryValue?.trim()));

  const showSaveOption =
    Boolean(onSave) &&
    hasValidInput &&
    !filteredOptions.some(
      (option) =>
        option.value.toLowerCase() === value.toLowerCase() &&
        (type === 'item' ||
          option.secondaryValue?.toLowerCase() === secondaryValue?.toLowerCase()),
    );

  // The save row is a real option so arrow keys reach it and the count in
  // aria-activedescendant stays honest.
  const navigableIds = useMemo(
    () => [...filteredOptions.map((o) => o.id), ...(showSaveOption ? [SAVE_OPTION_ID] : [])],
    [filteredOptions, showSaveOption],
  );

  const close = useCallback(
    ({ restoreFocus = true }: { restoreFocus?: boolean } = {}) => {
      setIsOpen(false);
      setSearchTerm('');
      setActiveId(null);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [],
  );

  const open = useCallback(() => {
    setIsOpen(true);
    setActiveId(null);
  }, []);

  const handleSelect = useCallback(
    (option: Option) => {
      onSelect(option.value, option.secondaryValue, option.defaultPrice);
      close();
      trackSavedDataUsed(type, 'selected');
    },
    [close, onSelect, type],
  );

  const handleSave = useCallback(() => {
    onSave?.();
    close();
    trackSavedDataUsed(type, 'saved');
  }, [close, onSave, type]);

  const activate = useCallback(
    (id: string) => {
      if (id === SAVE_OPTION_ID) {
        handleSave();
        return;
      }
      const option = filteredOptions.find((o) => o.id === id);
      if (option) handleSelect(option);
    },
    [filteredOptions, handleSave, handleSelect],
  );

  // Focus the search field once the panel is rendered.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Keep the active option scrolled into view during keyboard navigation.
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    listRef.current
      .querySelector(`#${CSS.escape(optionDomId(activeId))}`)
      ?.scrollIntoView({ block: 'nearest' });
    // optionDomId is derived from baseId, which is stable for the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Dismiss on an outside pointer press. Keyboard dismissal is handled by
  // Escape and by the focusout below, so this is only the mouse path.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        close({ restoreFocus: false });
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, close]);

  const moveActive = (delta: number) => {
    if (!navigableIds.length) return;
    const currentIndex = activeId ? navigableIds.indexOf(activeId) : -1;
    const nextIndex =
      currentIndex === -1
        ? delta > 0
          ? 0
          : navigableIds.length - 1
        : (currentIndex + delta + navigableIds.length) % navigableIds.length;
    setActiveId(navigableIds[nextIndex]);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) open();
        else moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) open();
        else moveActive(-1);
        break;
      case 'Home':
        if (isOpen && navigableIds.length) {
          event.preventDefault();
          setActiveId(navigableIds[0]);
        }
        break;
      case 'End':
        if (isOpen && navigableIds.length) {
          event.preventDefault();
          setActiveId(navigableIds[navigableIds.length - 1]);
        }
        break;
      case 'Enter':
        if (isOpen && activeId) {
          event.preventDefault();
          activate(activeId);
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          close();
        }
        break;
      case 'Tab':
        // Leaving the composite dismisses it, but let focus move naturally.
        if (isOpen) close({ restoreFocus: false });
        break;
      default:
        break;
    }
  };

  const count = formattedOptions.length;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-haspopup="listbox"
        aria-label={`${label}: choose from ${count} saved ${
          type === 'company' ? 'companies' : 'items'
        }`}
        disabled={disabled}
        onClick={() => (isOpen ? close({ restoreFocus: false }) : open())}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-transparent px-3 py-1.5 text-left transition-colors hover:border-brand hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/*
          Shows the action, never the current value. Mirroring `value` made the
          trigger look like a second copy of the field directly beneath it --
          two boxes with identical text and no indication of which to edit.
        */}
        <span className="truncate text-sm text-fg-muted">{placeholder}</span>
        <span className="flex shrink-0 items-center gap-2">
          {count > 0 && (
            <span className="rounded-full bg-brand-subtle px-1.5 py-0.5 text-xs font-medium text-brand-text">
              {count}
            </span>
          )}
          <ChevronDownIcon
            className={`size-4 text-fg-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-raised">
          <div className="relative border-b border-border p-2">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setActiveId(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Search ${type === 'company' ? 'companies' : 'items'}`}
              aria-label={`Search saved ${type === 'company' ? 'companies' : 'items'}`}
              aria-controls={listboxId}
              aria-activedescendant={activeId ? optionDomId(activeId) : undefined}
              autoComplete="off"
              className="w-full rounded-md border border-border-strong bg-surface py-2 pl-8 pr-3 text-sm text-fg placeholder:text-fg-muted"
            />
          </div>

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={`Saved ${type === 'company' ? 'companies' : 'items'}`}
            className="max-h-56 overflow-y-auto py-1"
          >
            {filteredOptions.map((option) => (
              // Options are deliberately not focusable and carry no keydown
              // handler. In the APG combobox pattern keyboard interaction lives
              // on the input, with the active option tracked via
              // aria-activedescendant (see handleKeyDown above). Focusing each
              // option to attach a key handler would interrupt typing. This
              // click handler is the pointer path only.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={option.id}
                id={optionDomId(option.id)}
                role="option"
                aria-selected={activeId === option.id}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setActiveId(option.id)}
                className={`cursor-pointer px-3 py-2.5 ${
                  activeId === option.id ? 'bg-brand-subtle' : ''
                }`}
              >
                <span className="block truncate text-sm font-medium text-fg">{option.label}</span>
                {option.secondaryValue && (
                  <span className="mt-0.5 block truncate text-xs text-fg-muted">
                    {option.secondaryValue}
                  </span>
                )}
                {option.defaultPrice !== undefined && (
                  <span className="mt-0.5 block text-xs font-medium text-brand-text">
                    Default price: {option.defaultPrice.toFixed(2)}
                  </span>
                )}
              </li>
            ))}

            {showSaveOption && (
              /* eslint-disable-next-line jsx-a11y/click-events-have-key-events */
              <li
                id={optionDomId(SAVE_OPTION_ID)}
                role="option"
                aria-selected={activeId === SAVE_OPTION_ID}
                onClick={handleSave}
                onMouseEnter={() => setActiveId(SAVE_OPTION_ID)}
                className={`flex cursor-pointer items-center gap-2 border-t border-border px-3 py-2.5 text-sm font-medium text-brand-text ${
                  activeId === SAVE_OPTION_ID ? 'bg-brand-subtle' : ''
                }`}
              >
                <PlusIcon className="size-4 shrink-0" />
                <span className="truncate">Save &ldquo;{value}&rdquo; for future use</span>
              </li>
            )}

            {!filteredOptions.length && !showSaveOption && (
              <li role="presentation" className="px-3 py-6 text-center text-sm text-fg-muted">
                {searchTerm
                  ? `No ${type === 'company' ? 'companies' : 'items'} match “${searchTerm}”`
                  : `No saved ${type === 'company' ? 'companies' : 'items'} yet`}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SavedOptionsDropdown;
