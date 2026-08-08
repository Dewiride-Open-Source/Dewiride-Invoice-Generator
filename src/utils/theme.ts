export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'invoice-theme';

/**
 * The script that runs before first paint, inlined into <head> in
 * _document.tsx. It resolves the stored preference against the OS setting and
 * stamps `.dark` on <html> so the correct palette is in place on the very
 * first frame -- otherwise a dark-mode visitor gets a white flash.
 *
 * Kept as a string because it must execute synchronously, ahead of React and
 * ahead of next/script, both of which run far too late for this.
 *
 * Deliberately defensive: localStorage throws in some privacy modes, and a
 * failure here must never stop the page rendering.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

// --- store ----------------------------------------------------------------
// Exposed through useSyncExternalStore for the same reason the saved-data
// lists are: the preference lives in localStorage, which the prerendered HTML
// cannot see. A server snapshot of 'system' matches what the markup was built
// with, so there is no mismatch and no setState-in-effect.

const listeners = new Set<() => void>();
let snapshot: ThemePreference | null = null;

const readPreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
};

export const subscribeToTheme = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Cached so the reference stays stable between renders. */
export const getThemePreference = (): ThemePreference => (snapshot ??= readPreference());

/** What the static export was built with. */
export const getServerThemePreference = (): ThemePreference => 'system';

export const prefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const resolveTheme = (preference: ThemePreference): 'light' | 'dark' =>
  preference === 'system' ? (prefersDark() ? 'dark' : 'light') : preference;

/** Applies a resolved theme to the document without touching the preference. */
export const paintTheme = (preference: ThemePreference): void => {
  const isDark = resolveTheme(preference) === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

export const setThemePreference = (preference: ThemePreference): void => {
  snapshot = preference;
  paintTheme(preference);

  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable: the theme still applies for this session.
  }

  listeners.forEach((listener) => listener());
};

if (typeof window !== 'undefined') {
  // Another tab changed the preference.
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    snapshot = readPreference();
    paintTheme(snapshot);
    listeners.forEach((listener) => listener());
  });

  // The OS flipped while we are following it.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemePreference() === 'system') paintTheme('system');
  });
}
