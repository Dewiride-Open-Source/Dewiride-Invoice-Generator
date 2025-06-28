import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { InvoiceData } from './InvoiceForm';
import { formatCurrency } from '../utils/currency';

interface InvoicePDFProps {
  data: InvoiceData;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  invoiceInfo: {
    textAlign: 'right',
    fontSize: 10,
  },
  addresses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  addressBlock: {
    width: '45%',
  },
  addressTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 11,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 8,
  },
  tableColDescription: {
    width: '40%',
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 8,
  },
  tableCell: {
    fontSize: 9,
    wordWrap: 'break-word',
    lineHeight: 1.3,
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableCellRight: {
    fontSize: 9,
    textAlign: 'right',
  },
  totals: {
    alignSelf: 'flex-end',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 10,
    fontWeight: 'bold',
    fontSize: 12,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 8,
  },
});

const InvoicePDF: React.FC<InvoicePDFProps> = ({ data }) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxAmount = subtotal * (data.tax / 100);
  const total = subtotal + taxAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Invoice</Text>
          <View style={styles.invoiceInfo}>
            <Text>Invoice #: {data.invoiceNumber}</Text>
            <Text>Date: {data.invoiceDate}</Text>
            <Text>Due: {data.dueDate}</Text>
          </View>
        </View>

        {/* Addresses */}
        <View style={styles.addresses}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressTitle}>From:</Text>
            <Text>{data.fromName}</Text>
            <Text>{data.fromAddress}</Text>
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressTitle}>To:</Text>
            <Text>{data.toName}</Text>
            <Text>{data.toAddress}</Text>
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
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>Quantity</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>Price</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>Line Total</Text>
            </View>
          </View>

          {/* Table Rows */}
          {data.items.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.tableColDescription}>
                <Text style={styles.tableCell}>{item.description}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellRight}>{item.quantity}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellRight}>{formatCurrency(item.price, data.currency)}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellRight}>{formatCurrency(item.quantity * item.price, data.currency)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(subtotal, data.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax ({data.tax}%):</Text>
            <Text>{formatCurrency(taxAmount, data.currency)}</Text>
          </View>
          <View style={styles.totalRowFinal}>
            <Text>Total:</Text>
            <Text>{formatCurrency(total, data.currency)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
