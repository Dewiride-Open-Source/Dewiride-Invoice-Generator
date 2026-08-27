import React from 'react';
import { Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { InvoiceData, paymentRows } from '../types/invoice';
import { amountInWords } from '../utils/amountInWords';
import { formatCurrency } from '../utils/currency';
import { stateLabel } from '../utils/gst';
// Both of these are heavier than they look, and both are safe here: this
// module is only ever reached through `await import('./InvoicePdfRenderer')`,
// so everything it pulls in lands in the lazy chunk with the PDF engine.
import { toQrPath } from '../utils/qr';
import { computeTotals, lineDiscount, lineTotal } from '../utils/totals';
import { invoiceUpiLink } from '../utils/upi';

interface InvoicePDFProps {
  data: InvoiceData;
}

/**
 * Vertical budget: A4 is 842pt, less 50pt of padding top and bottom, so 742pt
 * of usable height. The header, addresses, one table row, the totals, the
 * payment block and the footer come to roughly 690pt of that -- the margins
 * below are what keeps a one-line invoice with a logo and payment details on a
 * single sheet. tests/payment.spec.ts asserts the page count, because "it
 * spilled onto page two" is not something a unit test would ever notice.
 *
 * Everything Rule 46 added -- GSTINs, place of supply, the HSN and discount
 * columns, the amount in words, notes, terms and the signature -- is rendered
 * only when it has content, so an invoice that uses none of it comes out
 * byte-for-byte as tall as it did before.
 */

/**
 * Column widths, chosen per combination rather than computed.
 *
 * The HSN and discount columns only exist when something fills them: a dead
 * column takes width from the description on every invoice in order to serve
 * the ones that used it. Each set sums to 100%, and header and body read from
 * the same object, which matters more now that the header repeats on every
 * page -- drift would show up on all of them.
 */
type ColumnKey = 'description' | 'hsnSac' | 'quantity' | 'price' | 'discount' | 'amount';

const columnWidths = (hsn: boolean, discount: boolean): Partial<Record<ColumnKey, string>> => {
  if (hsn && discount)
    return {
      description: '30%',
      hsnSac: '13%',
      quantity: '10%',
      price: '17%',
      discount: '14%',
      amount: '16%',
    };
  if (hsn)
    return { description: '34%', hsnSac: '14%', quantity: '12%', price: '20%', amount: '20%' };
  if (discount)
    return { description: '34%', quantity: '13%', price: '19%', discount: '16%', amount: '18%' };
  return { description: '40%', quantity: '20%', price: '20%', amount: '20%' };
};

const HEADINGS: Record<ColumnKey, string> = {
  description: 'Description',
  hsnSac: 'HSN/SAC',
  quantity: 'Qty',
  price: 'Price',
  discount: 'Disc.',
  amount: 'Amount',
};

const ALIGN: Record<ColumnKey, 'left' | 'center' | 'right'> = {
  description: 'left',
  hsnSac: 'left',
  quantity: 'center',
  price: 'right',
  discount: 'right',
  amount: 'right',
};

/**
 * A Unicode font is required for currency symbols.
 *
 * @react-pdf's built-in Helvetica uses WinAnsiEncoding, which has no glyph for
 * ₹, ₩, ₪, ₫ and most other currency signs -- they rendered as blanks, which is
 * why the app used to print "INR 1,234.00" instead of "₹1,234.00".
 *
 * These are subsets built by scripts/build-pdf-fonts.mjs: ~61 KB per weight
 * instead of ~557 KB. They are fetched at PDF-generation time, so they cost
 * nothing on first paint, and only once per session thereafter.
 */
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/NotoSans-Regular.subset.ttf', fontWeight: 'normal' },
    { src: '/fonts/NotoSans-Bold.subset.ttf', fontWeight: 'bold' },
  ],
});

// Currency values must never be split across lines mid-symbol.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 42,
    // Reserves the band the footer is pinned into. Flow content stops here,
    // so the footer can never collide with it or push it onto a new page.
    // The footer itself occupies 24-50pt from the bottom edge, so this leaves
    // 8pt of clearance and no more -- the rest is page an invoice can use.
    paddingBottom: 58,
    fontSize: 10,
    fontFamily: 'NotoSans',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    letterSpacing: 1,
  },
  invoiceInfo: {
    textAlign: 'right',
    fontSize: 11,
    color: '#374151',
  },
  invoiceLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  invoiceValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addresses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 4,
    gap: 20,
  },
  addressBlock: {
    width: '47%',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    minHeight: 78,
  },
  addressTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 12,
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 1.3,
    wordWrap: 'break-word',
    hyphenationFactor: 0,
    overflow: 'hidden',
  },
  addressText: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.5,
    wordWrap: 'break-word',
    hyphenationFactor: 0,
  },
  table: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 40,
  },
  tableHeader: {
    backgroundColor: '#1f2937',
    minHeight: 45,
  },
  // Width comes from columnWidths at render time; everything else is shared.
  tableCol: {
    padding: 10,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.4,
    wordWrap: 'break-word',
    hyphenationFactor: 0,
  },
  tableCellHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCellRight: {
    fontSize: 10,
    textAlign: 'right',
    color: '#374151',
    wordWrap: 'break-word',
    hyphenationFactor: 0,
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  tableRowOdd: {
    backgroundColor: '#ffffff',
  },
  totalsContainer: {
    marginTop: 14,
    alignSelf: 'flex-end',
    width: '52%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 15,
    marginBottom: 2,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  totalLabelFinal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValueFinal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addressMeta: {
    marginTop: 6,
    fontSize: 9,
    color: '#374151',
  },
  addressMetaLabel: {
    color: '#6b7280',
  },
  amountWords: {
    marginTop: 8,
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },
  closing: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 20,
  },
  closingText: {
    // flexBasis 0, not the default `auto`: with an auto basis yoga sized this
    // block to its full unwrapped paragraph and the notes then printed
    // straight through the signature beside them.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    fontSize: 9,
    color: '#374151',
  },
  notes: {
    marginTop: 4,
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.4,
    wordWrap: 'break-word',
    hyphenationFactor: 0,
  },
  signatureBlock: {
    width: 150,
    alignItems: 'center',
  },
  signature: {
    maxWidth: 140,
    maxHeight: 45,
    marginBottom: 4,
    objectFit: 'contain',
  },
  signatureRule: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#9ca3af',
    paddingTop: 4,
  },
  signatureCaption: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
  signatureName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  logo: {
    // Bounded rather than sized: react-pdf scales an image to its intrinsic
    // dimensions, and a 512px logo would otherwise print 512pt wide on a
    // 595pt-wide page. The aspect ratio is preserved from the image itself.
    maxWidth: 150,
    maxHeight: 50,
    marginBottom: 12,
    objectFit: 'contain',
  },
  paymentSection: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  paymentDetails: {
    flexGrow: 1,
    flexShrink: 1,
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  paymentLabel: {
    width: 95,
    fontSize: 9,
    color: '#6b7280',
  },
  paymentValue: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
    wordWrap: 'break-word',
    hyphenationFactor: 0,
  },
  qrBlock: {
    width: 96,
    alignItems: 'center',
  },
  qr: {
    width: 88,
    height: 88,
  },
  qrCaption: {
    marginTop: 5,
    fontSize: 7,
    color: '#6b7280',
    textAlign: 'center',
  },
  /**
   * Pinned, not flowed.
   *
   * As an ordinary block the footer was the last thing on the page and the
   * first thing to be pushed off it: a one-line invoice with a logo and a
   * payment block ended with "Thank you for your business!" alone on page two.
   * Taking it out of the flow means the only thing that can force a second
   * page is actual invoice content.
   *
   * `fixed` repeats it on every page, which is what a document footer is for.
   */
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 42,
    right: 42,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

const InvoicePDF: React.FC<InvoicePDFProps> = ({ data }) => {
  const totals = computeTotals(data);
  const payment = paymentRows(data.payment);
  const upiLink = invoiceUpiLink(data);
  // Synchronous, unlike the preview's hook: the encoder is already in this
  // chunk, and react-pdf renders in one pass with no chance to fill a hole in.
  const qr = upiLink ? toQrPath(upiLink) : null;

  const isTaxInvoice = totals.treatment !== 'none';
  const showHsn = data.items.some((item) => item.hsnSac.trim());
  const showDiscount = totals.discount > 0;
  const widths = columnWidths(showHsn, showDiscount);
  const columns = (Object.keys(widths) as ColumnKey[]).filter((key) => widths[key]);
  const words = totals.total > 0 ? amountInWords(totals.total, data.currency) : '';
  const hasClosing = Boolean(data.notes.trim() || data.paymentTerms.trim() || data.signature);

  const cellText = (item: (typeof data.items)[number], key: ColumnKey): string => {
    switch (key) {
      case 'description':
        return item.description;
      case 'hsnSac':
        return item.hsnSac;
      case 'quantity':
        return String(item.quantity);
      case 'price':
        return formatCurrency(item.price, data.currency);
      case 'discount':
        return item.discount > 0
          ? `-${formatCurrency(lineDiscount(item, data.currency), data.currency)}`
          : '';
      case 'amount':
        return formatCurrency(lineTotal(item, data.currency), data.currency);
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {/*
              react-pdf's Image draws into the PDF; it is not an <img> and has
              no alt prop to give. The a11y rule is configured to treat a
              component named Image as next/image, which this is not.
            */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {data.logo ? <Image src={data.logo} style={styles.logo} /> : null}
            {/* The heading Rule 46 names. It appears only once a GSTIN says
                the invoice actually carries GST. */}
            <Text style={styles.title}>{isTaxInvoice ? 'TAX INVOICE' : 'INVOICE'}</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.invoiceLabel}>Invoice Number</Text>
              <Text style={styles.invoiceValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.invoiceLabel}>Invoice Date</Text>
              <Text style={styles.invoiceValue}>{data.invoiceDate}</Text>
            </View>
            <View>
              <Text style={styles.invoiceLabel}>Due Date</Text>
              <Text style={styles.invoiceValue}>{data.dueDate}</Text>
            </View>
          </View>
        </View>

        {/* Addresses */}
        <View style={styles.addresses}>
          {[
            {
              title: 'Bill From',
              name: data.fromName,
              address: data.fromAddress,
              gstin: data.supplierGstin,
              stateLine: data.supplierState ? `State: ${stateLabel(data.supplierState)}` : '',
            },
            {
              title: 'Bill To',
              name: data.toName,
              address: data.toAddress,
              gstin: data.buyerGstin,
              // Place of supply is a fact about the recipient, so it reads
              // here rather than as a fourth entry in the header stack -- where
              // it added 45pt to every page-one budget to say one thing.
              stateLine: data.placeOfSupply
                ? `Place of supply: ${stateLabel(data.placeOfSupply)}`
                : '',
            },
          ].map(({ title, name, address, gstin, stateLine }) => (
            <View style={styles.addressBlock} key={title}>
              <Text style={styles.addressTitle}>{title}</Text>
              <Text style={styles.addressName}>{name}</Text>
              <Text style={styles.addressText}>{address}</Text>
              {isTaxInvoice && gstin.trim() ? (
                <Text style={styles.addressMeta}>
                  <Text style={styles.addressMetaLabel}>GSTIN </Text>
                  {gstin}
                </Text>
              ) : null}
              {isTaxInvoice && stateLine ? (
                <Text style={[styles.addressMeta, styles.addressMetaLabel, { marginTop: 2 }]}>
                  {stateLine}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/*
            `fixed` is what repeats the header on continuation pages.

            Without it a long invoice opened page two with four unlabelled
            columns of numbers, which is the one thing a line-item table exists
            to prevent. This is not a rendering trick: react-pdf redraws a
            fixed child at the top of every page its wrapping parent spans.
          */}
          <View style={[styles.tableRow, styles.tableHeader]} fixed>
            {columns.map((key) => (
              <View style={[styles.tableCol, { width: widths[key] }]} key={key}>
                <Text style={[styles.tableCellHeader, { textAlign: ALIGN[key] }]}>
                  {HEADINGS[key]}
                </Text>
              </View>
            ))}
          </View>

          {/* Table Rows */}
          {data.items.map((item, index) => (
            <View
              style={[
                styles.tableRow,
                index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
              ]}
              key={item.id}
              wrap={false}
            >
              {columns.map((key) => (
                <View style={[styles.tableCol, { width: widths[key] }]} key={key}>
                  <Text style={[styles.tableCell, { textAlign: ALIGN[key] }]}>
                    {cellText(item, key)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/*
          Totals and the amount in words, as one unbreakable unit.

          Two separate page-break bugs live here. The figures split across a
          break -- subtotal and discount on one sheet, the tax and the total on
          the next -- which is the one place on an invoice that has to be read
          as a single column. And the amount in words, which exists to restate
          the total, was landing at the top of the following page on its own,
          where it restates nothing.
        */}
        <View wrap={false}>
        <View style={styles.totalsContainer}>
          {/*
            With no discount, "Subtotal" and "Taxable value" are the same
            number, so the single row takes whichever name means something and
            the three-row form appears only when there is a deduction between
            them.
          */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {showDiscount || !isTaxInvoice ? 'Subtotal' : 'Taxable Value'}
            </Text>
            <Text style={styles.totalValue}>{formatCurrency(totals.subtotal, data.currency)}</Text>
          </View>
          {showDiscount && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>
                  -{formatCurrency(totals.discount, data.currency)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Taxable Value</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(totals.taxable, data.currency)}
                </Text>
              </View>
            </>
          )}
          {totals.taxLines.map((line) => (
            <View style={styles.totalRow} key={line.key}>
              <Text style={styles.totalLabel}>{line.label}</Text>
              <Text style={styles.totalValue}>{formatCurrency(line.amount, data.currency)}</Text>
            </View>
          ))}
          {totals.shipping > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Shipping</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.shipping, data.currency)}</Text>
            </View>
          )}
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>Total</Text>
            <Text style={styles.totalValueFinal}>{formatCurrency(totals.total, data.currency)}</Text>
          </View>
        </View>

        {words ? (
          <Text style={styles.amountWords}>
            <Text style={styles.addressMetaLabel}>Amount in words: </Text>
            {words}
          </Text>
        ) : null}
        </View>

        {/* Payment details. wrap={false} keeps the block, and the QR in
            particular, from being split across a page break. */}
        {(payment.length > 0 || qr) && (
          <View style={styles.paymentSection} wrap={false}>
            {payment.length > 0 && (
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentTitle}>Payment details</Text>
                {payment.map(({ key, label, value }) => (
                  <View style={styles.paymentRow} key={key}>
                    <Text style={styles.paymentLabel}>{label}</Text>
                    <Text style={styles.paymentValue}>{value}</Text>
                  </View>
                ))}
              </View>
            )}

            {qr && (
              <View style={styles.qrBlock}>
                {/* The quiet zone is inside the path's module space, so the
                    viewBox needs no extra padding. */}
                <Svg viewBox={`0 0 ${qr.size} ${qr.size}`} style={styles.qr}>
                  <Path d={qr.path} fill="#000000" />
                </Svg>
                <Text style={styles.qrCaption}>Scan to pay by UPI</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes, terms and signature. Side by side rather than stacked --
            two short blocks cost 70pt of a 742pt page if they each take a
            full-width row of their own. */}
        {hasClosing && (
          <View style={styles.closing} wrap={false}>
            <View style={styles.closingText}>
              {data.paymentTerms.trim() ? (
                <Text>
                  <Text style={styles.addressMetaLabel}>Payment terms: </Text>
                  {data.paymentTerms}
                </Text>
              ) : null}
              {data.notes.trim() ? <Text style={styles.notes}>{data.notes}</Text> : null}
            </View>
            {data.signature ? (
              <View style={styles.signatureBlock}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={data.signature} style={styles.signature} />
                <View style={styles.signatureRule}>
                  <Text style={styles.signatureCaption}>Authorised Signatory</Text>
                  {data.fromName ? (
                    <Text style={styles.signatureName}>{data.fromName}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
