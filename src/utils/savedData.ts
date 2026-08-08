/**
 * The saved-data store: companies and item descriptions the user has reused.
 *
 * Backed by localStorage, exposed to React through useSyncExternalStore. That
 * choice matters for three reasons:
 *
 *   1. Hydration. This app is a static export, so the prerendered HTML cannot
 *      know what is in a visitor's localStorage. useSyncExternalStore takes a
 *      separate server snapshot, which is the supported way to say "the server
 *      sees nothing here" without a mismatch -- and without the isClient +
 *      useEffect + setState dance, which costs an extra render and trips
 *      react-hooks/set-state-in-effect.
 *
 *   2. Fan-out. Several components read the same three lists. A store means a
 *      mutation anywhere re-renders every reader automatically, instead of
 *      being manually relayed through a refreshTrigger counter prop.
 *
 *   3. Cross-tab consistency. The storage event keeps two open tabs in sync.
 *
 * Snapshot identity is load-bearing: getSnapshot MUST return the same reference
 * until the data actually changes, or useSyncExternalStore re-renders forever.
 * That is what `cache` below is for.
 */

export interface CompanyDetails {
  id: string;
  name: string;
  address: string;
  lastUsed: Date;
}

export interface ItemDescription {
  id: string;
  description: string;
  defaultPrice?: number;
  lastUsed: Date;
}

export const STORAGE_KEYS = {
  FROM_COMPANIES: 'invoice_from_companies',
  TO_COMPANIES: 'invoice_to_companies',
  ITEM_DESCRIPTIONS: 'invoice_item_descriptions',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Most-recent entries kept per list. Older ones are dropped on write. */
const LIMITS: Record<StorageKey, number> = {
  [STORAGE_KEYS.FROM_COMPANIES]: 20,
  [STORAGE_KEYS.TO_COMPANIES]: 20,
  [STORAGE_KEYS.ITEM_DESCRIPTIONS]: 50,
};

const MIN_ITEM_DESCRIPTION_LENGTH = 3;

// --- snapshot cache -------------------------------------------------------
// One frozen empty array shared by every empty list and by the server
// snapshot, so identity is stable across renders.
const EMPTY: readonly never[] = Object.freeze([]);

const cache = new Map<StorageKey, readonly unknown[]>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Another tab wrote to localStorage: drop our cache and re-render.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === null) {
      // localStorage.clear() was called; key is null by spec.
      cache.clear();
      emit();
      return;
    }
    if (event.key in LIMITS) {
      cache.delete(event.key as StorageKey);
      emit();
    }
  });
}

// --- parsing --------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

/**
 * Validates each entry rather than trusting JSON.parse. localStorage is
 * user-writable and survives across deploys, so a stale or hand-edited shape
 * would otherwise reach the UI -- an invalid `lastUsed` used to reach
 * .toLocaleDateString() and throw during render.
 */
const parseCompany = (raw: unknown): CompanyDetails | null => {
  if (!isRecord(raw)) return null;
  const { id, name, address, lastUsed } = raw;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof address !== 'string') return null;
  const date = new Date(lastUsed as string | number | Date);
  if (Number.isNaN(date.getTime())) return null;
  return { id, name, address, lastUsed: date };
};

const parseItem = (raw: unknown): ItemDescription | null => {
  if (!isRecord(raw)) return null;
  const { id, description, defaultPrice, lastUsed } = raw;
  if (typeof id !== 'string' || typeof description !== 'string') return null;
  const date = new Date(lastUsed as string | number | Date);
  if (Number.isNaN(date.getTime())) return null;
  return {
    id,
    description,
    defaultPrice:
      typeof defaultPrice === 'number' && Number.isFinite(defaultPrice) && defaultPrice > 0
        ? defaultPrice
        : undefined,
    lastUsed: date,
  };
};

const PARSERS = {
  [STORAGE_KEYS.FROM_COMPANIES]: parseCompany,
  [STORAGE_KEYS.TO_COMPANIES]: parseCompany,
  [STORAGE_KEYS.ITEM_DESCRIPTIONS]: parseItem,
} as const;

function read<T>(key: StorageKey): readonly T[] {
  const cached = cache.get(key);
  if (cached) return cached as readonly T[];

  let value: readonly T[] = EMPTY as readonly T[];
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const entries = parsed
          .map((entry) => (PARSERS[key] as (r: unknown) => T | null)(entry))
          .filter((entry): entry is T => entry !== null);
        if (entries.length) value = Object.freeze(entries);
      }
    }
  } catch {
    // Unavailable (Safari private mode), corrupt JSON, or a blocked origin.
    // An empty list is the correct degradation: autocomplete is a
    // convenience, and losing it must never break invoice creation.
  }

  cache.set(key, value);
  return value;
}

function write<T>(key: StorageKey, entries: readonly T[]): void {
  const trimmed = Object.freeze(entries.slice(0, LIMITS[key]));
  // Update the cache first so the UI stays consistent even if the write is
  // rejected -- the user still sees the entry they just saved for this session.
  cache.set(key, trimmed);
  try {
    window.localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (error) {
    // QuotaExceededError, or storage disabled entirely.
    console.warn(`Could not persist ${key}; continuing in memory only.`, error);
  }
  emit();
}

const byMostRecent = <T extends { lastUsed: Date }>(a: T, b: T) =>
  b.lastUsed.getTime() - a.lastUsed.getTime();

const generateId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

// --- reads ----------------------------------------------------------------

export const getFromCompanies = (): readonly CompanyDetails[] =>
  read<CompanyDetails>(STORAGE_KEYS.FROM_COMPANIES);

export const getToCompanies = (): readonly CompanyDetails[] =>
  read<CompanyDetails>(STORAGE_KEYS.TO_COMPANIES);

export const getItemDescriptions = (): readonly ItemDescription[] =>
  read<ItemDescription>(STORAGE_KEYS.ITEM_DESCRIPTIONS);

/** The server (and the prerendered HTML) knows about no saved data. */
export const getEmptySnapshot = <T>(): readonly T[] => EMPTY as readonly T[];

// --- writes ---------------------------------------------------------------

const saveCompany = (key: StorageKey, name: string, address: string): void => {
  const trimmedName = name.trim();
  const trimmedAddress = address.trim();
  if (!trimmedName || !trimmedAddress) return;

  const existing = read<CompanyDetails>(key);
  const match = trimmedName.toLowerCase();
  const now = new Date();

  // Case-insensitive upsert by name, preserving the casing the user just typed.
  const updated = existing.some((c) => c.name.toLowerCase() === match)
    ? existing.map((c) =>
        c.name.toLowerCase() === match
          ? { ...c, name: trimmedName, address: trimmedAddress, lastUsed: now }
          : c,
      )
    : [...existing, { id: generateId(), name: trimmedName, address: trimmedAddress, lastUsed: now }];

  write(key, [...updated].sort(byMostRecent));
};

export const saveFromCompany = (name: string, address: string): void =>
  saveCompany(STORAGE_KEYS.FROM_COMPANIES, name, address);

export const saveToCompany = (name: string, address: string): void =>
  saveCompany(STORAGE_KEYS.TO_COMPANIES, name, address);

export const saveItemDescription = (description: string, defaultPrice?: number): void => {
  const trimmed = description.trim();
  if (trimmed.length < MIN_ITEM_DESCRIPTION_LENGTH) return;

  const existing = read<ItemDescription>(STORAGE_KEYS.ITEM_DESCRIPTIONS);
  const match = trimmed.toLowerCase();
  const now = new Date();
  const price = defaultPrice !== undefined && defaultPrice > 0 ? defaultPrice : undefined;

  const updated = existing.some((i) => i.description.toLowerCase() === match)
    ? existing.map((i) =>
        i.description.toLowerCase() === match
          ? // A new price replaces the old one; omitting it keeps what we had.
            { ...i, description: trimmed, lastUsed: now, defaultPrice: price ?? i.defaultPrice }
          : i,
      )
    : [...existing, { id: generateId(), description: trimmed, defaultPrice: price, lastUsed: now }];

  write(STORAGE_KEYS.ITEM_DESCRIPTIONS, [...updated].sort(byMostRecent));
};

const deleteById = (key: StorageKey, id: string): void => {
  const existing = read<{ id: string }>(key);
  write(
    key,
    existing.filter((entry) => entry.id !== id),
  );
};

export const deleteFromCompany = (id: string): void => deleteById(STORAGE_KEYS.FROM_COMPANIES, id);
export const deleteToCompany = (id: string): void => deleteById(STORAGE_KEYS.TO_COMPANIES, id);
export const deleteItemDescription = (id: string): void =>
  deleteById(STORAGE_KEYS.ITEM_DESCRIPTIONS, id);

export const clearAllSavedData = (): void => {
  for (const key of Object.keys(LIMITS) as StorageKey[]) {
    cache.set(key, EMPTY);
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Could not clear ${key}.`, error);
    }
  }
  emit();
};
