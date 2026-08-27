import React, { useId, useState } from 'react';
import Modal from './a11y/Modal';
import { buttonClass } from './fields';
import { TrashIcon, WarningIcon } from './icons';
import { useAnnounce } from './a11y/LiveRegion';
import {
  CompanyDetails,
  ItemDescription,
  clearAllSavedData,
  deleteFromCompany,
  deleteItemDescription,
  deleteToCompany,
} from '../utils/savedData';
import { useFromCompanies, useItemDescriptions, useToCompanies } from '../hooks/useSavedData';

interface SavedDataManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'from' | 'to' | 'items';

const isCompany = (entry: CompanyDetails | ItemDescription): entry is CompanyDetails =>
  'name' in entry;

const SavedDataManager: React.FC<SavedDataManagerProps> = ({ isOpen, onClose }) => {
  // The store is the single source of truth. A delete here re-renders the
  // form's dropdowns automatically -- no callback relay needed.
  const fromCompanies = useFromCompanies();
  const toCompanies = useToCompanies();
  const itemDescriptions = useItemDescriptions();
  const announce = useAnnounce();

  const [activeTab, setActiveTab] = useState<TabId>('from');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const baseId = useId();

  const tabs = [
    { id: 'from' as const, label: 'Your businesses', entries: fromCompanies, remove: deleteFromCompany },
    { id: 'to' as const, label: 'Clients', entries: toCompanies, remove: deleteToCompany },
    {
      id: 'items' as const,
      label: 'Item descriptions',
      entries: itemDescriptions,
      remove: deleteItemDescription,
    },
  ];

  const current = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const hasAnyData = tabs.some((tab) => tab.entries.length > 0);

  const handleDelete = (entry: CompanyDetails | ItemDescription, remove: (id: string) => void) => {
    const label = isCompany(entry) ? entry.name : entry.description;
    remove(entry.id);
    announce(`${label} deleted.`);
  };

  const confirmClearAll = () => {
    clearAllSavedData();
    setConfirmingClear(false);
    announce('All saved data cleared.', 'assertive');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage saved data"
        description="Businesses, clients and item descriptions stored in this browser for autocomplete. They are never uploaded."
        footer={
          <div className="flex items-center justify-between gap-3">
            {hasAnyData ? (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className={buttonClass.dangerGhost}
              >
                Clear all data
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={onClose} className={buttonClass.primary}>
              Done
            </button>
          </div>
        }
      >
        <div role="tablist" aria-label="Saved data categories" className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`${baseId}-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-subtle text-brand-text'
                  : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
              }`}
            >
              {tab.label} ({tab.entries.length})
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel-${current.id}`}
          aria-labelledby={`${baseId}-tab-${current.id}`}
          className="mt-4"
        >
          {current.entries.length === 0 ? (
            <p className="rounded-card border border-dashed border-border py-10 text-center text-sm text-fg-muted">
              Nothing saved here yet. Entries are added automatically as you fill in invoices.
            </p>
          ) : (
            <ul className="space-y-2">
              {current.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-card border border-border p-4"
                  /* Every control in this row is named after saved user data
                     ("Delete Acme Ltd"), and the analytics tracker reports the
                     accessible name of what was clicked. Ignoring the whole row
                     keeps that off the wire, now and for anything added here
                     later. */
                  data-dw-ignore
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">
                      {isCompany(entry) ? entry.name : entry.description}
                    </p>
                    {isCompany(entry) ? (
                      <p className="mt-1 whitespace-pre-line break-words text-sm text-fg-muted">
                        {entry.address}
                      </p>
                    ) : (
                      entry.defaultPrice !== undefined && (
                        <p className="mt-1 text-sm text-brand-text">
                          Default price: {entry.defaultPrice.toFixed(2)}
                        </p>
                      )
                    )}
                    <p className="mt-2 text-xs text-fg-muted">
                      Last used{' '}
                      <time dateTime={entry.lastUsed.toISOString()}>
                        {entry.lastUsed.toLocaleDateString()}
                      </time>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry, current.remove)}
                    className={buttonClass.iconDanger}
                  >
                    <TrashIcon className="size-4" />
                    {/* Names the specific entry, so a screen reader is not
                        offered a column of identical "Delete" buttons. */}
                    <span className="sr-only">
                      Delete {isCompany(entry) ? entry.name : entry.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* A separate dialog rather than one nested inside the other: two open
          <dialog> elements stack correctly in the top layer, and the confirm
          step gets its own focus trap and its own accessible name. */}
      <Modal
        isOpen={confirmingClear}
        onClose={() => setConfirmingClear(false)}
        title="Clear all saved data?"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className={buttonClass.secondary}
            >
              Cancel
            </button>
            <button type="button" onClick={confirmClearAll} className={buttonClass.danger}>
              Yes, clear everything
            </button>
          </div>
        }
      >
        <div className="flex gap-4">
          <WarningIcon className="size-8 shrink-0 text-danger-text" />
          <div>
            <p className="text-sm text-fg-muted">This will permanently delete:</p>
            <ul className="mt-3 space-y-1 text-sm text-fg">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  {tab.entries.length} saved {tab.label.toLowerCase()}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-medium text-danger-text">This cannot be undone.</p>
            <p className="mt-2 text-sm text-fg-muted">
              Your current invoice is not affected.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SavedDataManager;
