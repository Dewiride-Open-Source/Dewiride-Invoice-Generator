import React, { useCallback, useRef } from 'react';
import SavedOptionsDropdown from './SavedOptionsDropdown';
import { NumberField, SelectField, TextAreaField, TextField, buttonClass } from './fields';
import { PlusIcon, TrashIcon } from './icons';
import { useAnnounce } from './a11y/LiveRegion';
import { saveFromCompany, saveItemDescription, saveToCompany } from '../utils/savedData';
import { useFromCompanies, useItemDescriptions, useToCompanies } from '../hooks/useSavedData';
import { trackCurrencyChange } from '../utils/analytics';
import { CURRENCIES, POPULAR_CURRENCY_CODES, formatCurrency } from '../utils/currency';
import { InvoiceData, InvoiceItem, createItem } from '../types/invoice';
import { lineTotal } from '../utils/totals';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

const fieldsetClass = 'rounded-card border border-border bg-surface-sunken p-4 sm:p-5';
const legendClass = 'px-1 text-sm font-semibold uppercase tracking-wide text-fg-muted';

const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange }) => {
  // Subscribed to the saved-data store, so a save or delete anywhere in the app
  // re-renders this form. The server snapshot is empty, which is what the
  // static export prerenders.
  const fromCompanies = useFromCompanies();
  const toCompanies = useToCompanies();
  const itemDescriptions = useItemDescriptions();
  const announce = useAnnounce();

  // Lets focus follow a newly added row, and move somewhere sensible when a row
  // is removed, instead of being dumped on <body>.
  const rowRefs = useRef(new Map<string, HTMLInputElement | null>());
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const update = useCallback(
    <K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) => {
      if (field === 'currency' && value !== data.currency) trackCurrencyChange(value as string);
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  const updateItem = useCallback(
    <K extends keyof InvoiceItem>(id: string, field: K, value: InvoiceItem[K]) => {
      onChange({
        ...data,
        items: data.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      });
    },
    [data, onChange],
  );

  const addItem = useCallback(() => {
    const item = createItem();
    onChange({ ...data, items: [...data.items, item] });
    announce(`Item ${data.items.length + 1} added.`);
    // The row does not exist until after this render commits.
    requestAnimationFrame(() => rowRefs.current.get(item.id)?.focus());
  }, [announce, data, onChange]);

  const removeItem = useCallback(
    (id: string) => {
      const index = data.items.findIndex((item) => item.id === id);
      const remaining = data.items.filter((item) => item.id !== id);
      onChange({ ...data, items: remaining });
      announce(`Item ${index + 1} removed. ${remaining.length} remaining.`);

      // Move focus to the row that took its place, or the previous one if the
      // last row went, falling back to the Add button.
      const next = remaining[index] ?? remaining[index - 1];
      requestAnimationFrame(() => {
        const target = next ? rowRefs.current.get(next.id) : null;
        (target ?? addButtonRef.current)?.focus();
      });
      rowRefs.current.delete(id);
    },
    [announce, data, onChange],
  );

  const applyDescription = (id: string, description: string, defaultPrice?: number) => {
    onChange({
      ...data,
      items: data.items.map((item) =>
        item.id === id
          ? { ...item, description, price: defaultPrice && defaultPrice > 0 ? defaultPrice : item.price }
          : item,
      ),
    });
    announce(`Applied saved item ${description}.`);
  };

  const onlyOneItem = data.items.length === 1;

  return (
    <form className="@container space-y-5" noValidate aria-label="Invoice details">
      {/* --- Parties --- */}
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Contact information</legend>
        <div className="mt-3 grid gap-5 @2xl:grid-cols-2">
          <div className="space-y-3">
            {fromCompanies.length > 0 && (
              <SavedOptionsDropdown
                label="Your saved businesses"
                value={data.fromName}
                secondaryValue={data.fromAddress}
                onSelect={(name, address) =>
                  onChange({ ...data, fromName: name, fromAddress: address ?? '' })
                }
                onSave={() => saveFromCompany(data.fromName, data.fromAddress)}
                options={fromCompanies}
                placeholder="Use a saved business"
                type="company"
              />
            )}
            <TextField
              label="Your business name"
              name="from-name"
              autoComplete="organization"
              placeholder="Your name or company"
              value={data.fromName}
              onChange={(e) => update('fromName', e.target.value)}
              data-testid="from-name"
            />
            <TextAreaField
              label="Your address"
              name="from-address"
              autoComplete="street-address"
              rows={3}
              placeholder="Street, city, postcode"
              value={data.fromAddress}
              onChange={(e) => update('fromAddress', e.target.value)}
              data-testid="from-address"
            />
          </div>

          <div className="space-y-3">
            {toCompanies.length > 0 && (
              <SavedOptionsDropdown
                label="Your saved clients"
                value={data.toName}
                secondaryValue={data.toAddress}
                onSelect={(name, address) =>
                  onChange({ ...data, toName: name, toAddress: address ?? '' })
                }
                onSave={() => saveToCompany(data.toName, data.toAddress)}
                options={toCompanies}
                placeholder="Use a saved client"
                type="company"
              />
            )}
            <TextField
              label="Client name"
              name="to-name"
              autoComplete="off"
              placeholder="Client name or company"
              value={data.toName}
              onChange={(e) => update('toName', e.target.value)}
              data-testid="to-name"
            />
            <TextAreaField
              label="Client address"
              name="to-address"
              autoComplete="off"
              rows={3}
              placeholder="Street, city, postcode"
              value={data.toAddress}
              onChange={(e) => update('toAddress', e.target.value)}
              data-testid="to-address"
            />
          </div>
        </div>
      </fieldset>

      {/* --- Invoice meta --- */}
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Invoice information</legend>
        <div className="mt-3 grid gap-4 @lg:grid-cols-3">
          <TextField
            label="Invoice number"
            name="invoice-number"
            autoComplete="off"
            placeholder="INV-001"
            value={data.invoiceNumber}
            onChange={(e) => update('invoiceNumber', e.target.value)}
            data-testid="invoice-number"
          />
          <TextField
            label="Invoice date"
            name="invoice-date"
            type="date"
            value={data.invoiceDate}
            onChange={(e) => update('invoiceDate', e.target.value)}
            data-testid="invoice-date"
          />
          <TextField
            label="Due date"
            name="due-date"
            type="date"
            value={data.dueDate}
            onChange={(e) => update('dueDate', e.target.value)}
            data-testid="due-date"
          />
        </div>
      </fieldset>

      {/* --- Line items --- */}
      <fieldset className={fieldsetClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <legend className={legendClass}>Invoice items</legend>
          <button ref={addButtonRef} type="button" onClick={addItem} className={buttonClass.success}>
            <PlusIcon className="size-4" />
            Add item
          </button>
        </div>

        {/*
          One list, not a table-plus-cards pair.

          The old markup was a five-column <table> inside a horizontal
          scroller, which is a poor way to edit on a phone. Rendering both a
          mobile card list and a desktop table would have duplicated every
          input in the DOM, so instead each row is a grid that reflows: stacked
          and labelled on narrow widths, a single aligned row with a shared
          header at wide ones.

          Container queries, not viewport breakpoints -- this form sits in a
          column whose width does not track the viewport.
        */}
        <div
          aria-hidden="true"
          className="mt-4 hidden grid-cols-[minmax(0,1fr)_4.5rem_7rem_7rem_2.5rem] gap-3 px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted @xl:grid"
        >
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Price</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        <ul className="mt-3 space-y-3 @xl:space-y-2">
          {data.items.map((item, index) => (
            // The group lives on an inner wrapper, not the <li>. Putting
            // role="group" on the <li> overrides its implicit listitem role,
            // which leaves the <ul> with no list items at all (axe: "list").
            //
            // It is needed because the visible labels are short ("Quantity")
            // and repeat across rows; the group name is what makes a screen
            // reader announce "Item 2, Quantity" rather than three identical
            // "Quantity" fields.
            <li
              key={item.id}
              className="relative rounded-card border border-border bg-surface p-4 @xl:static @xl:grid @xl:grid-cols-[minmax(0,1fr)_4.5rem_7rem_7rem_2.5rem] @xl:items-start @xl:gap-3 @xl:border-0 @xl:bg-transparent @xl:p-0"
            >
              <div role="group" aria-label={`Item ${index + 1}`} className="contents">
              <div className="mb-3 flex items-center justify-between @xl:hidden">
                <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Item {index + 1}
                </span>
              </div>

              <div className="min-w-0 space-y-2">
                {itemDescriptions.length > 0 && (
                  <SavedOptionsDropdown
                    label={`Saved descriptions for item ${index + 1}`}
                    value={item.description}
                    onSelect={(description, _secondary, price) =>
                      applyDescription(item.id, description, price)
                    }
                    onSave={() =>
                      saveItemDescription(item.description, item.price > 0 ? item.price : undefined)
                    }
                    options={itemDescriptions}
                    placeholder="Use a saved description"
                    type="item"
                  />
                )}
                <TextField
                  ref={(el) => {
                    rowRefs.current.set(item.id, el);
                  }}
                  label="Description"
                  labelClassName="@xl:sr-only"
                  name={`item-${index + 1}-description`}
                  autoComplete="off"
                  maxLength={200}
                  placeholder="What are you billing for?"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  onBlur={() =>
                    saveItemDescription(item.description, item.price > 0 ? item.price : undefined)
                  }
                  data-testid={`item-${index + 1}-description`}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 @xl:contents @xl:mt-0">
                <NumberField
                  label="Quantity"
                  labelClassName="@xl:sr-only"
                  name={`item-${index + 1}-quantity`}
                  min={0}
                  step={1}
                  value={item.quantity}
                  onValueChange={(v) => updateItem(item.id, 'quantity', v)}
                  data-testid={`item-${index + 1}-quantity`}
                />
                <NumberField
                  label="Unit price"
                  labelClassName="@xl:sr-only"
                  name={`item-${index + 1}-price`}
                  min={0}
                  step={0.01}
                  value={item.price}
                  onValueChange={(v) => updateItem(item.id, 'price', v)}
                  data-testid={`item-${index + 1}-price`}
                />
              </div>

              <p className="mt-3 flex items-baseline justify-between border-t border-border pt-3 text-sm @xl:mt-0 @xl:block @xl:border-0 @xl:pt-2.5 @xl:text-right">
                <span className="text-fg-muted @xl:sr-only">Line total for item {index + 1}</span>
                <span className="font-semibold tabular text-fg" data-testid={`item-${index + 1}-total`}>
                  {formatCurrency(lineTotal(item), data.currency)}
                </span>
              </p>

              <div className="absolute right-3 top-3 @xl:static @xl:flex @xl:justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={onlyOneItem}
                  className={buttonClass.iconDanger}
                  data-testid={`item-${index + 1}-remove`}
                >
                  <TrashIcon className="size-4" />
                  <span className="sr-only">
                    Remove item {index + 1}
                    {item.description ? `, ${item.description}` : ''}
                  </span>
                </button>
              </div>
              </div>
            </li>
          ))}
        </ul>
      </fieldset>

      {/* --- Settings --- */}
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Currency and tax</legend>
        <div className="mt-3 grid gap-4 @lg:grid-cols-2">
          <SelectField
            label="Currency"
            name="currency"
            value={data.currency}
            onChange={(e) => update('currency', e.target.value)}
            data-testid="currency"
          >
            {/* A native select rather than a custom listbox: with 150+ entries
                the browser's own typeahead, mobile picker and screen-reader
                support all beat anything hand-rolled. Popular codes are
                surfaced first so the common case stays one tap away. */}
            <optgroup label="Popular">
              {POPULAR_CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code} — {CURRENCIES.find((c) => c.code === code)?.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="All currencies">
              {CURRENCIES.map(({ code, name }) => (
                <option key={code} value={code}>
                  {code} — {name}
                </option>
              ))}
            </optgroup>
          </SelectField>
          <NumberField
            label="Tax rate (%)"
            name="tax"
            min={0}
            max={100}
            step={0.01}
            value={data.tax}
            onValueChange={(v) => update('tax', v)}
            data-testid="tax"
          />
        </div>
      </fieldset>
    </form>
  );
};

export default InvoiceForm;
