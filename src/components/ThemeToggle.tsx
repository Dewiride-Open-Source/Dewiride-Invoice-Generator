import React, { useSyncExternalStore } from 'react';
import {
  ThemePreference,
  getServerThemePreference,
  getThemePreference,
  setThemePreference,
  subscribeToTheme,
} from '../utils/theme';
import { ComputerIcon, MoonIcon, SunIcon } from './icons';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'system', label: 'System', Icon: ComputerIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
];

/**
 * A three-way theme control exposed as a radiogroup rather than a toggle
 * button. "System" is a genuinely distinct state -- a two-state switch cannot
 * express "follow the OS", and aria-pressed on a button that cycles through
 * three values announces nothing useful to a screen reader.
 *
 * The pre-paint script in _document.tsx has already applied the palette by the
 * time this mounts; the component only reflects and changes the preference.
 */
const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const preference = useSyncExternalStore(
    subscribeToTheme,
    getThemePreference,
    getServerThemePreference,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-sunken p-0.5 ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setThemePreference(value)}
            className={`grid size-8 place-items-center rounded-full transition-colors ${
              selected ? 'bg-surface text-brand-text shadow-card' : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="sr-only">{label} theme</span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
