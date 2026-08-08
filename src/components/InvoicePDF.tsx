import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { InvoiceData } from './InvoiceForm';
import { formatCurrency } from '../utils/currency';
import { computeTotals, lineTotal } from '../utils/totals';

interface InvoicePDFProps {
  data: InvoiceData;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 20,
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
    marginBottom: 8,
  },
  addresses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingVertical: 20,
    gap: 20,
  },
  addressBlock: {
    width: '47%',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    minHeight: 100,
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
    marginBottom: 30,
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
  tableCol: {
    width: '20%',
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  tableColDescription: {
    width: '40%',
    padding: 12,
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
    marginTop: 30,
    alignSelf: 'flex-end',
    width: '50%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 15,
    marginBottom: 3,
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
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginTop: 10,
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
  footer: {
    marginTop: 50,
    paddingTop: 20,
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
  const { subtotal, taxAmount, total } = computeTotals(data);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
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
          <View style={styles.addressBlock}>
            <Text style={styles.addressTitle}>Bill From</Text>
            <Text style={styles.addressName}>{data.fromName}</Text>
            <Text style={styles.addressText}>{data.fromAddress}</Text>
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressTitle}>Bill To</Text>
            <Text style={styles.addressName}>{data.toName}</Text>
            <Text style={styles.addressText}>{data.toAddress}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableColDescription}>
              <Text style={styles.tableCellHeader}>Description</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCellHeader, { textAlign: 'center' }]}>Qty</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>Price</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>Amount</Text>
            </View>
          </View>

          {/* Table Rows */}
          {data.items.map((item, index) => (
            <View 
              style={[
                styles.tableRow, 
                index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
              ]} 
              key={index}
            >
              <View style={styles.tableColDescription}>
                <Text style={styles.tableCell}>{item.description}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={[styles.tableCellRight, { textAlign: 'center' }]}>{item.quantity}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellRight}>{formatCurrency(item.price, data.currency)}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellRight}>{formatCurrency(lineTotal(item), data.currency)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal, data.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({data.tax}%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(taxAmount, data.currency)}</Text>
          </View>
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>Total</Text>
            <Text style={styles.totalValueFinal}>{formatCurrency(total, data.currency)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
