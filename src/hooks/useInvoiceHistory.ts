import { useSyncExternalStore } from 'react';
import {
  HistoryStatus,
  SavedInvoice,
  getEmptySnapshot,
  getEmptyStatus,
  getInvoices,
  getStatus,
  subscribe,
} from '../utils/invoiceHistory';

/**
 * Subscriptions to the saved-invoice store.
 *
 * Both pass an empty server snapshot: during the static export there is no
 * IndexedDB, and the prerendered markup has to match what a fresh visitor's
 * first client render produces. React re-renders with the real data once the
 * database has been read -- no isClient flag, no effect, no setState cascade.
 *
 * Subscribing is also what opens the database, so a visitor who never looks at
 * their history never pays for it.
 */
export const useInvoiceHistory = (): readonly SavedInvoice[] =>
  useSyncExternalStore(subscribe, getInvoices, getEmptySnapshot);

/**
 * Distinguishes "still reading the database" from "there is nothing saved",
 * which look identical in the data and must not look identical on screen.
 */
export const useHistoryStatus = (): HistoryStatus =>
  useSyncExternalStore(subscribe, getStatus, getEmptyStatus);
