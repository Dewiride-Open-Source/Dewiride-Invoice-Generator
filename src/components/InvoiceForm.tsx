import React, { useCallback, useRef, useState } from 'react';
import ImageField from './ImageField';
import TemplatePicker from './TemplatePicker';
import SavedOptionsDropdown from './SavedOptionsDropdown';
import { NumberField, SelectField, TextAreaField, TextField, buttonClass } from './fields';
import { PlusIcon, TrashIcon } from './icons';
import { useAnnounce } from './a11y/LiveRegion';
import { saveFromCompany, saveItemDescription, saveToCompany } from '../utils/savedData';
import { useFromCompanies, useItemDescriptions, useToCompanies } from '../hooks/useSavedData';
import { trackCurrencyChange } from '../utils/analytics';
import { getDocumentType } from '../utils/documents';
import { CURRENCIES, POPULAR_CURRENCY_CODES, formatCurrency } from '../utils/currency';
import { InvoiceData, InvoiceItem, PaymentDetails, createItem } from '../types/invoice';
import { formatRate, lineTotal } from '../utils/totals';
import {
  INDIAN_STATES,
  gstinStateCode,
  invoiceNumberIssue,
  isGstCurrency,
  isValidGstin,
  taxTreatment,
} from '../utils/gst';
import { UPI_CURRENCY, isValidUpiId } from '../utils/upi';

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

  // The UPI error appears on blur, never while typing: `acme@` is not a
  // mistake, it is a half-finished address, and flagging it mid-keystroke
  // trains people to ignore the message that matters.
  const [upiTouched, setUpiTouched] = useState(false);
  // Same rule for the GSTINs: fifteen characters take a moment to type, and
  // flagging the first fourteen of them as wrong is noise.
  const [gstinTouched, setGstinTouched] = useState({ supplier: false, buyer: false });

  const update = useCallback(
    <K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) => {
      if (field === 'currency' && value !== data.currency) trackCurrencyChange(value as string);
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  const updatePayment = useCallback(
    <K extends keyof PaymentDetails>(field: K, value: PaymentDetails[K]) => {
      onChange({ ...data, payment: { ...data.payment, [field]: value } });
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

  /**
   * Fills in the state the GSTIN already declares.
   *
   * The first two digits of a GSTIN *are* the state code, so asking for it
   * again is asking the user to repeat themselves -- and to be the one who
   * notices when the two disagree. Only ever fills a blank: a state the user
   * chose deliberately is never overwritten.
   */
  const applySupplierGstin = useCallback(
    (value: string) => {
      const gstin = value.toUpperCase();
      const declared = gstinStateCode(gstin);
      onChange({
        ...data,
        supplierGstin: gstin,
        supplierState: !data.supplierState && declared ? declared : data.supplierState,
      });
    },
    [data, onChange],
  );

  const onlyOneItem = data.items.length === 1;
  // A quotation has a validity date, not a payment due date, and a challan
  // has a challan number. Labelling all four the same way is how a form
  // quietly teaches people that the document type is cosmetic.
  const docType = getDocumentType(data.docType);
  const gstMode = isGstCurrency(data.currency);
  const treatment = taxTreatment(data);

  const gstinError = (value: string, touched: boolean) =>
    touched && value.trim() && !isValidGstin(value)
      ? 'That GSTIN does not check out. It is 15 characters, and the last one is a checksum.'
      : undefined;

  /** Says, in words, which tax the numbers above will actually produce. */
  const treatmentNote = () => {
    if (!gstMode) return null;
    if (!data.supplierGstin.trim()) {
      return 'Add your GSTIN above and this becomes a tax invoice, with the CGST/SGST or IGST split worked out for you.';
    }
    if (treatment === 'cgst-sgst') {
      return `Same state, so this is an intra-state supply: CGST ${formatRate(data.tax / 2)}% + SGST ${formatRate(data.tax / 2)}%.`;
    }
    if (treatment === 'igst') {
      return `Different states, so this is an inter-state supply: IGST ${formatRate(data.tax)}%.`;
    }
    return 'Choose both states and the tax will be split into CGST + SGST or IGST automatically.';
  };

  return (
    <form className="@container space-y-5" noValidate aria-label={`${docType.noun} details`}>
      {/* --- Design --- */}
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>{docType.noun} design</legend>
        <TemplatePicker value={data.template} onChange={(template) => update('template', template)} />
      </fieldset>

      {/* --- Parties --- */}
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Contact information</legend>
        <div className="mt-3 grid gap-5 @2xl:grid-cols-2">
          <div className="space-y-3">
            <ImageField
              label="Business logo"
              name="logo"
              testId="logo"
              alt="Your business logo, as it will appear on the invoice"
              value={data.logo}
              onChange={(logo) => update('logo', logo)}
            />
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
            {/* GST is levied in rupees, so these only exist on a rupee
                invoice. A freelancer billing in dollars never sees them. */}
            {gstMode && (
              <TextField
                label="Your GSTIN"
                name="supplier-gstin"
                autoComplete="off"
                maxLength={15}
                placeholder="29AAAAA0000A1Z5"
                value={data.supplierGstin}
                onChange={(e) => applySupplierGstin(e.target.value)}
                onBlur={() => setGstinTouched((t) => ({ ...t, supplier: true }))}
                hint="Optional. Adding it makes this a tax invoice and fills in your state."
                error={gstinError(data.supplierGstin, gstinTouched.supplier)}
                data-testid="supplier-gstin"
              />
            )}
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
            {gstMode && (
              <TextField
                label="Client GSTIN"
                name="buyer-gstin"
                autoComplete="off"
                maxLength={15}
                placeholder="27BBBBB1111B1Z6"
                value={data.buyerGstin}
                onChange={(e) => update('buyerGstin', e.target.value.toUpperCase())}
                onBlur={() => setGstinTouched((t) => ({ ...t, buyer: true }))}
                hint="Optional. Your client needs it to claim input credit."
                error={gstinError(data.buyerGstin, gstinTouched.buyer)}
                data-testid="buyer-gstin"
              />
            )}
          </div>
        </div>
      </fieldset>

      {/* --- Invoice meta --- */}
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>{docType.noun} information</legend>
        <div className="mt-3 grid gap-4 @lg:grid-cols-3">
          <TextField
            label={docType.numberLabel}
            name="invoice-number"
            autoComplete="off"
            placeholder="INV-001"
            value={data.invoiceNumber}
            onChange={(e) => update('invoiceNumber', e.target.value)}
            /*
              Only once a GSTIN says this is a tax invoice. Rule 46(b) binds
              that document and nothing else here -- a US invoice numbered
              "ACME_2026.001" is perfectly fine, and flagging it would be
              inventing a rule.

              An error rather than a hint, because it is a breach rather than
              a preference, but nothing is blocked or rewritten: the number is
              the user's to choose.
            */
            error={
              docType.id === 'invoice' && gstMode && data.supplierGstin.trim()
                ? invoiceNumberIssue(data.invoiceNumber) || undefined
                : undefined
            }
            data-testid="invoice-number"
          />
          <TextField
            label={`${docType.noun} date`}
            name="invoice-date"
            type="date"
            value={data.invoiceDate}
            onChange={(e) => update('invoiceDate', e.target.value)}
            data-testid="invoice-date"
          />
          <TextField
            label={docType.dueDateLabel}
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
          <legend className={legendClass}>{docType.noun} items</legend>
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

                {/*
                  Under the description rather than as their own columns.

                  A GST line genuinely has six fields, but seven tracks in the
                  wide grid leaves the description about 40px wide in a column
                  this narrow -- and raising the breakpoint far enough to fit
                  them would mean the wide layout never engaged at all. These
                  two keep their visible labels for the same reason: the shared
                  column header does not name them, so hiding the labels would
                  leave a pair of anonymous boxes.
                */}
                <div className="grid grid-cols-2 gap-2">
                  {gstMode && (
                    <TextField
                      label="HSN / SAC"
                      name={`item-${index + 1}-hsn`}
                      autoComplete="off"
                      maxLength={8}
                      inputMode="numeric"
                      placeholder="998314"
                      value={item.hsnSac}
                      onChange={(e) => updateItem(item.id, 'hsnSac', e.target.value)}
                      data-testid={`item-${index + 1}-hsn`}
                    />
                  )}
                  <NumberField
                    label="Discount (%)"
                    name={`item-${index + 1}-discount`}
                    min={0}
                    max={100}
                    step={0.01}
                    value={item.discount}
                    onValueChange={(v) => updateItem(item.id, 'discount', v)}
                    data-testid={`item-${index + 1}-discount`}
                  />
                </div>
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
                  {formatCurrency(lineTotal(item, data.currency), data.currency)}
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

        {gstMode && (
          <>
            <div className="mt-4 grid gap-4 @lg:grid-cols-2">
              <SelectField
                label="You supply from"
                name="supplier-state"
                value={data.supplierState}
                onChange={(e) => update('supplierState', e.target.value)}
                data-testid="supplier-state"
              >
                <option value="">Choose a state</option>
                {INDIAN_STATES.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Place of supply"
                name="place-of-supply"
                value={data.placeOfSupply}
                onChange={(e) => update('placeOfSupply', e.target.value)}
                hint="Usually where your client is. It decides CGST + SGST or IGST."
                data-testid="place-of-supply"
              >
                <option value="">Choose a state</option>
                {INDIAN_STATES.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </SelectField>
            </div>
            <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-fg-muted" data-testid="tax-treatment">
              {treatmentNote()}
            </p>
            {/*
              Says what the tool does, not what the user's tax position is.
              "GST compliant" would be a claim about their registration and
              their filings, neither of which this can see.
            */}
            {data.supplierGstin.trim() && (
              <p className="mt-2 text-xs text-fg-muted" data-testid="gst-disclaimer">
                This produces a tax invoice in the Rule 46 format. Whether any particular invoice
                is compliant also depends on your registration and your filings — check anything
                unusual with your accountant.
              </p>
            )}
          </>
        )}

        <div className="mt-4">
          <NumberField
            label="Shipping or freight"
            name="shipping"
            min={0}
            step={0.01}
            value={data.shipping}
            onValueChange={(v) => update('shipping', v)}
            wrapperClassName="@lg:w-1/2 @lg:pr-2"
            data-testid="shipping"
          />
          <p className="mt-1 text-xs text-fg-muted">
            Added after tax. If you charge GST on freight, put it in as a line item instead.
          </p>
        </div>
      </fieldset>

      {/* --- Payment --- */}
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>How you want to be paid</legend>
        <p className="mt-2 text-sm text-fg-muted">
          All optional. Whatever you fill in is printed at the bottom of the invoice, so the client
          does not have to ask you for it.
        </p>
        <div className="mt-4 grid gap-4 @lg:grid-cols-2">
          <TextField
            label="Account holder"
            name="account-name"
            autoComplete="off"
            placeholder="Name on the account"
            value={data.payment.accountName}
            onChange={(e) => updatePayment('accountName', e.target.value)}
            data-testid="account-name"
          />
          <TextField
            label="Bank name"
            name="bank-name"
            autoComplete="off"
            placeholder="Your bank"
            value={data.payment.bankName}
            onChange={(e) => updatePayment('bankName', e.target.value)}
            data-testid="bank-name"
          />
          <TextField
            label="Account number"
            name="account-number"
            autoComplete="off"
            inputMode="numeric"
            placeholder="Account number"
            value={data.payment.accountNumber}
            onChange={(e) => updatePayment('accountNumber', e.target.value)}
            data-testid="account-number"
          />
          <TextField
            label="IFSC code"
            name="ifsc"
            autoComplete="off"
            placeholder="For payments within India"
            value={data.payment.ifsc}
            onChange={(e) => updatePayment('ifsc', e.target.value.toUpperCase())}
            data-testid="ifsc"
          />
          <TextField
            label="SWIFT / BIC"
            name="swift"
            autoComplete="off"
            placeholder="For international transfers"
            value={data.payment.swift}
            onChange={(e) => updatePayment('swift', e.target.value.toUpperCase())}
            data-testid="swift"
          />
          <TextField
            label="IBAN"
            name="iban"
            autoComplete="off"
            placeholder="For transfers within Europe"
            value={data.payment.iban}
            onChange={(e) => updatePayment('iban', e.target.value.toUpperCase())}
            data-testid="iban"
          />
        </div>

        <div className="mt-4">
          <TextField
            label="UPI ID"
            name="upi-id"
            autoComplete="off"
            inputMode="email"
            placeholder="yourname@bank"
            value={data.payment.upiId}
            onChange={(e) => updatePayment('upiId', e.target.value)}
            onBlur={() => setUpiTouched(true)}
            hint={
              data.currency === UPI_CURRENCY
                ? 'Adds a QR code to the invoice. Your client scans it and the payee, amount and invoice number are already filled in.'
                : `UPI settles in rupees, so the QR code is only added to ${UPI_CURRENCY} invoices.`
            }
            error={
              upiTouched && data.payment.upiId.trim() && !isValidUpiId(data.payment.upiId)
                ? 'That does not look like a UPI ID. They are written yourname@bank.'
                : undefined
            }
            data-testid="upi-id"
          />
        </div>
      </fieldset>

      {/* --- Closing --- */}
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Notes, terms and signature</legend>
        <div className="mt-3 space-y-4">
          <TextField
            label="Payment terms"
            name="payment-terms"
            autoComplete="off"
            maxLength={120}
            placeholder="Net 30 — due within 30 days of the invoice date"
            value={data.paymentTerms}
            onChange={(e) => update('paymentTerms', e.target.value)}
            data-testid="payment-terms"
          />
          <TextAreaField
            label="Notes"
            name="notes"
            rows={3}
            maxLength={600}
            placeholder="Anything the client should know — a PO number, a thank you, late-payment terms."
            value={data.notes}
            onChange={(e) => update('notes', e.target.value)}
            data-testid="notes"
          />
          <ImageField
            label="Signature"
            name="signature"
            testId="signature"
            alt="Your signature, as it will appear on the invoice"
            hint="Printed above your name as the authorised signatory."
            thumbnailClassName="max-h-12 max-w-40"
            value={data.signature}
            onChange={(signature) => update('signature', signature)}
          />
        </div>
      </fieldset>
    </form>
  );
};

export default InvoiceForm;
