import React from 'react';

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

export interface InvoiceData {
  fromName: string;
  fromAddress: string;
  toName: string;
  toAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  tax: number;
  currency: string;
}

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange }) => {
  const handleFieldChange = (field: keyof InvoiceData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = data.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange({ ...data, items: newItems });
  };

  const addItem = () => {
    onChange({ ...data, items: [...data.items, { description: '', quantity: 1, price: 0 }] });
  };

  const removeItem = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    onChange({ ...data, items: newItems });
  };

  return (
    <form className="invoice-form text-gray-900">
      <h2 className="text-xl font-semibold mb-2">Invoice Details</h2>
      <div className="form-section grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <label>From Name
          <input type="text" value={data.fromName} onChange={e => handleFieldChange('fromName', e.target.value)} />
        </label>
        <label>From Address
          <textarea value={data.fromAddress} onChange={e => handleFieldChange('fromAddress', e.target.value)} />
        </label>
        <label>To Name
          <input type="text" value={data.toName} onChange={e => handleFieldChange('toName', e.target.value)} />
        </label>
        <label>To Address
          <textarea value={data.toAddress} onChange={e => handleFieldChange('toAddress', e.target.value)} />
        </label>
        <label>Invoice Number
          <input type="text" value={data.invoiceNumber} onChange={e => handleFieldChange('invoiceNumber', e.target.value)} />
        </label>
        <label>Invoice Date
          <input type="date" value={data.invoiceDate} onChange={e => handleFieldChange('invoiceDate', e.target.value)} />
        </label>
        <label>Due Date
          <input type="date" value={data.dueDate} onChange={e => handleFieldChange('dueDate', e.target.value)} />
        </label>
      </div>
      <h3 className="text-lg font-semibold mt-4 mb-2">Invoice Items</h3>
      <table className="items-table w-full border text-sm mb-2">
        <thead className="bg-gray-100">
          <tr>
            <th className="font-semibold p-2 text-left">Description</th>
            <th className="font-semibold p-2 text-right">Quantity</th>
            <th className="font-semibold p-2 text-right">Price</th>
            <th className="font-semibold p-2 text-right">Line Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="even:bg-gray-50">
              <td className="p-2">
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={item.description}
                  onChange={e => handleItemChange(idx, 'description', e.target.value)}
                />
              </td>
              <td className="p-2 text-right">
                <input
                  type="number"
                  min={1}
                  className="w-16 border rounded px-2 py-1 text-right"
                  value={item.quantity}
                  onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                />
              </td>
              <td className="p-2 text-right">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-20 border rounded px-2 py-1 text-right"
                  value={item.price}
                  onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                />
              </td>
              <td className="p-2 text-right">{(item.quantity * item.price).toFixed(2)}</td>
              <td className="p-2">
                <button type="button" className="text-red-600 hover:underline disabled:text-gray-400" onClick={() => removeItem(idx)} disabled={data.items.length === 1}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={addItem}>Add Item</button>
      <div className="form-section mt-4">
        <label className="block font-medium">Currency
          <select className="ml-2 border rounded px-2 py-1" value={data.currency} onChange={e => handleFieldChange('currency', e.target.value)}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CAD">CAD (C$)</option>
            <option value="AUD">AUD (A$)</option>
          </select>
        </label>
        <label className="block font-medium mt-2">Tax (%)
          <input type="number" min={0} step={0.01} className="ml-2 w-24 border rounded px-2 py-1" value={data.tax} onChange={e => handleFieldChange('tax', Number(e.target.value))} />
        </label>
      </div>
    </form>
  );
};

export default InvoiceForm;
