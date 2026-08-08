import { useSyncExternalStore } from 'react';
import {
  CompanyDetails,
  ItemDescription,
  getEmptySnapshot,
  getFromCompanies,
  getItemDescriptions,
  getToCompanies,
  subscribe,
} from '../utils/savedData';

/**
 * Subscriptions to the saved-data store.
 *
 * Every hook passes getEmptySnapshot as the server snapshot: during the static
 * export there is no localStorage, and the prerendered markup must match what
 * a fresh visitor's first client render produces. React then re-renders with
 * the real data immediately after hydration -- no isClient flag, no effect, no
 * setState cascade.
 */

export const useFromCompanies = (): readonly CompanyDetails[] =>
  useSyncExternalStore(subscribe, getFromCompanies, getEmptySnapshot<CompanyDetails>);

export const useToCompanies = (): readonly CompanyDetails[] =>
  useSyncExternalStore(subscribe, getToCompanies, getEmptySnapshot<CompanyDetails>);

export const useItemDescriptions = (): readonly ItemDescription[] =>
  useSyncExternalStore(subscribe, getItemDescriptions, getEmptySnapshot<ItemDescription>);

/**
 * True once React has hydrated. Components use this to decide whether it is
 * safe to render localStorage-derived UI, without reading storage during the
 * server pass.
 */
export const useIsHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
