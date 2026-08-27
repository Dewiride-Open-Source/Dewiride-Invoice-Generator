/**
 * Saved invoices: the ones the user has finished, not the draft in progress.
 *
 * This is the piece that made the tool worth returning to. Until now the only
 * persistence was the current draft in sessionStorage, so last month's invoice
 * was simply gone -- every visit started from an empty form, and the invoice
 * number had to be remembered by hand.
 *
 * Shape follows src/utils/savedData.ts deliberately: a module-level store read
 * through useSyncExternalStore, with a separate empty server snapshot. See
 * that file for why (hydration, fan-out, cross-tab). Two things differ:
 *
 *   1. The backing store is IndexedDB, not localStorage. A saved invoice is
 *      far larger than a company name, there can be hundreds of them, and
 *      logos are coming -- localStorage is a synchronous 5 MB budget shared
 *      with everything else on the origin, which is the wrong tool for all
 *      three reasons.
 *
 *   2. IndexedDB is asynchronous, and getSnapshot must not be. So reads are
 *      served from an in-memory array that is loaded once on first subscribe
 *      and updated synchronously on every write. Before that load resolves the
 *      snapshot is empty, which is exactly what the prerendered HTML shows, so
 *      hydration still matches.
 *
 * Snapshot identity is load-bearing: getSnapshot MUST return the same
 * reference until the data actually changes, or useSyncExternalStore
 * re-renders forever.
 *
 * Nothing here is uploaded. That is the whole privacy promise of the product,
 * and moving saved invoices to a server would break it.
 */
import { InvoiceData, normaliseInvoice } from '../types/invoice';
import { DEFAULT_DOCUMENT_TYPE, DocumentTypeId } from './documents';
// Re-exported rather than redefined: sixteen characters is Rule 46(b)'s
// number, not this module's, and two copies of it would be free to disagree.
import { INVOICE_NUMBER_MAX_LENGTH } from './gst';

export { INVOICE_NUMBER_MAX_LENGTH };

export interface SavedInvoice {
  id: string;
  invoice: InvoiceData;
  savedAt: Date;
}

export type HistoryStatus = 'loading' | 'ready' | 'unavailable';

const DB_NAME = 'dewiride-invoice';
const DB_VERSION = 1;
const STORE = 'history';

/**
 * Most recent kept. Well past what anyone will reach, but unbounded growth in
 * a store the user cannot see is how a tool quietly eats a device's disk.
 */
const LIMIT = 500;

/** Rule 46 caps a GST invoice serial at 16 characters. */


const EMPTY: readonly SavedInvoice[] = Object.freeze([]);

let cache: readonly SavedInvoice[] = EMPTY;
let status: HistoryStatus = 'loading';
let hydrated = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

// --- IndexedDB ------------------------------------------------------------

let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDb = (): Promise<IDBDatabase | null> => {
  dbPromise ??= new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      // Firefox throws outright rather than erroring the request when storage
      // is blocked for the origin.
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    // Safari private mode, a blocked origin, or a failed version upgrade. An
    // empty history is the correct degradation: saving is a convenience and
    // must never break invoice creation.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
};

const withStore = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    let request: IDBRequest<T>;
    try {
      request = run(db.transaction(STORE, mode).objectStore(STORE));
    } catch {
      resolve(null);
      return;
    }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

// --- parsing --------------------------------------------------------------

/**
 * Validates each row rather than trusting what came out of the database.
 * IndexedDB survives deploys, so a stored invoice may predate the current
 * shape -- normaliseInvoice is the same coercion the sessionStorage draft
 * already goes through, reused rather than reimplemented.
 */
const parse = (raw: unknown): SavedInvoice | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const { id, invoice, savedAt } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || !id) return null;
  const date = new Date(savedAt as string | number | Date);
  if (Number.isNaN(date.getTime())) return null;
  return { id, invoice: normaliseInvoice(invoice), savedAt: date };
};

const byMostRecent = (a: SavedInvoice, b: SavedInvoice) =>
  b.savedAt.getTime() - a.savedAt.getTime();

const generateId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

const commit = (next: SavedInvoice[]): readonly SavedInvoice[] => {
  cache = Object.freeze(next.sort(byMostRecent).slice(0, LIMIT));
  emit();
  return cache;
};

// --- hydration and cross-tab ---------------------------------------------

const hydrate = async (): Promise<void> => {
  if (hydrated) return;
  hydrated = true;

  const rows = await withStore<unknown[]>('readonly', (store) => store.getAll());
  if (rows === null) {
    status = 'unavailable';
    emit();
    return;
  }
  status = 'ready';
  commit(rows.map(parse).filter((row): row is SavedInvoice => row !== null));
};

/**
 * IndexedDB has no storage event, so cross-tab consistency needs an explicit
 * channel. A tab that writes tells the others to re-read; if BroadcastChannel
 * is unavailable the store simply stops syncing across tabs, which is a
 * degradation and not a failure.
 */
let channel: BroadcastChannel | null = null;

const getChannel = (): BroadcastChannel | null => {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  try {
    channel = new BroadcastChannel(`${DB_NAME}-history`);
    channel.onmessage = () => {
      hydrated = false;
      void hydrate();
    };
  } catch {
    channel = null;
  }
  return channel;
};

const announce = () => {
  try {
    getChannel()?.postMessage('changed');
  } catch {
    // A closed channel must not fail the write that triggered it.
  }
};

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  // Lazy: a visitor who never opens the history never opens the database.
  void hydrate();
  getChannel();
  return () => {
    listeners.delete(listener);
  };
};

// --- reads ----------------------------------------------------------------

export const getInvoices = (): readonly SavedInvoice[] => cache;
export const getStatus = (): HistoryStatus => status;

/** The server, and the prerendered HTML, know about no saved invoices. */
export const getEmptySnapshot = (): readonly SavedInvoice[] => EMPTY;
export const getEmptyStatus = (): HistoryStatus => 'loading';

// --- invoice numbering ----------------------------------------------------

/**
 * The next number in whatever sequence the user is already using.
 *
 * Increments the last run of digits and preserves its zero-padding, so
 * INV-2026-042 yields INV-2026-043 rather than INV-2026-43. A number with no
 * digits at all gets a -1 suffix; anything that would exceed the 16-character
 * GST limit is returned unchanged rather than silently truncated into a
 * different invoice's number.
 */
export const nextInvoiceNumber = (previous: string): string => {
  const trimmed = previous.trim();
  if (!trimmed) return '';

  const match = trimmed.match(/(\d+)(\D*)$/);
  if (!match) {
    const suffixed = `${trimmed}-1`;
    return suffixed.length <= INVOICE_NUMBER_MAX_LENGTH ? suffixed : trimmed;
  }

  const [, digits, tail] = match;
  const incremented = String(Number(digits) + 1);
  // Keep the original width unless the number genuinely outgrew it (099 -> 100).
  const padded = incremented.padStart(digits.length, '0');
  const next = trimmed.slice(0, match.index) + padded + tail;
  return next.length <= INVOICE_NUMBER_MAX_LENGTH ? next : trimmed;
};

/**
 * The number to start the next document with, continuing that document type's
 * own series.
 *
 * Per type, not one series for everything. Rule 46(b) requires the tax invoice
 * series to be consecutive and unique for the financial year, so every number
 * a quotation or a proforma consumes leaves a gap in it -- and a gap in an
 * invoice series is what a scrutiny officer reads as a suppressed sale. Rule
 * 46(b) explicitly permits "one or multiple series", which is the licence for
 * keeping QTN- and INV- apart.
 *
 * The cache is newest-first, so this finds the most recent document of the
 * type asked for.
 */
export const suggestNextInvoiceNumber = (
  docType: DocumentTypeId = DEFAULT_DOCUMENT_TYPE,
): string => {
  const latest = cache.find((entry) => entry.invoice.docType === docType);
  return latest ? nextInvoiceNumber(latest.invoice.invoiceNumber) : '';
};

// --- writes ---------------------------------------------------------------

/**
 * Upserts by invoice number, so saving the same invoice twice corrects the
 * existing entry instead of leaving two versions of it in the list. An
 * invoice with no number yet is always a new entry -- there is nothing to
 * match it on.
 */
export const saveInvoice = async (invoice: InvoiceData): Promise<SavedInvoice | null> => {
  await hydrate();

  const number = invoice.invoiceNumber.trim();
  const existing = number
    ? cache.find((entry) => entry.invoice.invoiceNumber.trim() === number)
    : undefined;

  const entry: SavedInvoice = {
    id: existing?.id ?? generateId(),
    invoice: { ...invoice, items: invoice.items.map((item) => ({ ...item })) },
    savedAt: new Date(),
  };

  // Update the cache first so the UI reflects the save even if the write is
  // rejected -- the user still sees it for this session.
  commit([...cache.filter((row) => row.id !== entry.id), entry]);

  const written = await withStore('readwrite', (store) => store.put(entry));
  if (written === null && status === 'ready') {
    status = 'unavailable';
    emit();
  }
  announce();

  // Trim beyond the cap in the database too, not just in memory.
  for (const stale of cache.slice(LIMIT)) {
    await withStore('readwrite', (store) => store.delete(stale.id));
  }
  return entry;
};

export const deleteInvoice = async (id: string): Promise<void> => {
  await hydrate();
  commit(cache.filter((entry) => entry.id !== id));
  await withStore('readwrite', (store) => store.delete(id));
  announce();
};

export const clearHistory = async (): Promise<void> => {
  await hydrate();
  commit([]);
  await withStore('readwrite', (store) => store.clear());
  announce();
};

// --- export and import ----------------------------------------------------

interface ExportedHistory {
  version: 1;
  exportedAt: string;
  invoices: { id: string; savedAt: string; invoice: InvoiceData }[];
}

/**
 * "It all stays on your device" must not also mean "and you can lose it".
 * Export is the answer to a wiped browser profile or a new laptop.
 */
export const exportHistory = (): string => {
  const payload: ExportedHistory = {
    version: 1,
    exportedAt: new Date().toISOString(),
    invoices: cache.map((entry) => ({
      id: entry.id,
      savedAt: entry.savedAt.toISOString(),
      invoice: entry.invoice,
    })),
  };
  return JSON.stringify(payload, null, 2);
};

export interface ImportResult {
  added: number;
  skipped: number;
}

/**
 * Merges rather than replaces, and matches on id so re-importing the same file
 * is idempotent instead of doubling the list.
 */
export const importHistory = async (json: string): Promise<ImportResult> => {
  await hydrate();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const invoices = (parsed as Partial<ExportedHistory>)?.invoices;
  if (!Array.isArray(invoices)) {
    throw new Error('That file does not look like an exported invoice history.');
  }

  const existing = new Set(cache.map((entry) => entry.id));
  const incoming = invoices
    .map(parse)
    .filter((entry): entry is SavedInvoice => entry !== null && !existing.has(entry.id));

  if (incoming.length) {
    commit([...cache, ...incoming]);
    for (const entry of incoming) {
      await withStore('readwrite', (store) => store.put(entry));
    }
    announce();
  }

  return { added: incoming.length, skipped: invoices.length - incoming.length };
};

/** Test seam: drops in-memory state so a spec can start from a known store. */
export const __resetForTests = (): void => {
  cache = EMPTY;
  status = 'loading';
  hydrated = false;
  dbPromise = null;
};
