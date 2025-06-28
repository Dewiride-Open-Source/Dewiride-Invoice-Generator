import React, { useState, useEffect } from 'react';
import SavedOptionsDropdown from './SavedOptionsDropdown';
import {
  saveFromCompany,
  saveToCompany,
  saveItemDescription,
  getFromCompanies,
  getToCompanies,
  getItemDescriptions,
  CompanyDetails,
  ItemDescription,
} from '../utils/localStorage';
import { trackCurrencyChange } from '../utils/analytics';

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
  const [fromCompanies, setFromCompanies] = useState<CompanyDetails[]>([]);
  const [toCompanies, setToCompanies] = useState<CompanyDetails[]>([]);
  const [itemDescriptions, setItemDescriptions] = useState<ItemDescription[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Load saved data only on client side to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
    setFromCompanies(getFromCompanies());
    setToCompanies(getToCompanies());
    setItemDescriptions(getItemDescriptions());
  }, []);

  const handleFieldChange = (field: keyof InvoiceData, value: any) => {
    // Track currency changes
    if (field === 'currency' && value !== data.currency) {
      trackCurrencyChange(value);
    }
    
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

  // Handlers for saving and selecting from saved options
  const handleFromCompanySelect = (name: string, address?: string) => {
    onChange({ ...data, fromName: name, fromAddress: address || '' });
  };

  const handleToCompanySelect = (name: string, address?: string) => {
    onChange({ ...data, toName: name, toAddress: address || '' });
  };

  const handleItemDescriptionSelect = (index: number, description: string, _?: string, defaultPrice?: number) => {
    const newItems = data.items.map((item, i) =>
      i === index ? { 
        ...item, 
        description,
        price: defaultPrice && defaultPrice > 0 ? defaultPrice : item.price
      } : item
    );
    onChange({ ...data, items: newItems });
  };

  const handleSaveFromCompany = () => {
    if (data.fromName && data.fromAddress) {
      saveFromCompany(data.fromName, data.fromAddress);
      if (isClient) {
        setFromCompanies(getFromCompanies());
      }
    }
  };

  const handleSaveToCompany = () => {
    if (data.toName && data.toAddress) {
      saveToCompany(data.toName, data.toAddress);
      if (isClient) {
        setToCompanies(getToCompanies());
      }
    }
  };

  const handleSaveItemDescription = (index: number) => {
    const item = data.items[index];
    if (item.description) {
      saveItemDescription(item.description, item.price > 0 ? item.price : undefined);
      if (isClient) {
        setItemDescriptions(getItemDescriptions());
      }
    }
  };

  return (
    <form className="invoice-form text-gray-900">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Invoice Details</h2>
      
      {/* Contact Information */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Contact Information</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Company</label>
              <div className="space-y-2">
                <SavedOptionsDropdown
                  value={data.fromName}
                  secondaryValue={data.fromAddress}
                  onSelect={handleFromCompanySelect}
                  onSave={handleSaveFromCompany}
                  options={fromCompanies}
                  placeholder="Select or enter company name"
                  type="company"
                  className="mb-2"
                />
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Your name or company"
                  value={data.fromName} 
                  onChange={e => handleFieldChange('fromName', e.target.value)} 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Address</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={3}
                placeholder="Your address"
                value={data.fromAddress} 
                onChange={e => handleFieldChange('fromAddress', e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Company</label>
              <div className="space-y-2">
                <SavedOptionsDropdown
                  value={data.toName}
                  secondaryValue={data.toAddress}
                  onSelect={handleToCompanySelect}
                  onSave={handleSaveToCompany}
                  options={toCompanies}
                  placeholder="Select or enter client name"
                  type="company"
                  className="mb-2"
                />
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Client name or company"
                  value={data.toName} 
                  onChange={e => handleFieldChange('toName', e.target.value)} 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Address</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={3}
                placeholder="Client address"
                value={data.toAddress} 
                onChange={e => handleFieldChange('toAddress', e.target.value)} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Invoice Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="INV-001"
              value={data.invoiceNumber} 
              onChange={e => handleFieldChange('invoiceNumber', e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={data.invoiceDate} 
              onChange={e => handleFieldChange('invoiceDate', e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={data.dueDate} 
              onChange={e => handleFieldChange('dueDate', e.target.value)} 
            />
          </div>
        </div>
      </div>
      {/* Invoice Items */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Invoice Items</h3>
          <button 
            type="button" 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium text-sm"
            onClick={addItem}
          >
            + Add Item
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="font-semibold p-4 text-left text-gray-700 border-b">Description</th>
                <th className="font-semibold p-4 text-center text-gray-700 border-b w-24">Qty</th>
                <th className="font-semibold p-4 text-right text-gray-700 border-b w-32">Price</th>
                <th className="font-semibold p-4 text-right text-gray-700 border-b w-32">Total</th>
                <th className="font-semibold p-4 text-center text-gray-700 border-b w-20">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {data.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="space-y-2">
                      <SavedOptionsDropdown
                        value={item.description}
                        onSelect={(description, _, defaultPrice) => handleItemDescriptionSelect(idx, description, _, defaultPrice)}
                        onSave={() => handleSaveItemDescription(idx)}
                        options={itemDescriptions}
                        placeholder="Select or enter item description"
                        type="item"
                        className="mb-2"
                      />
                      <input
                        type="text"
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="Item description"
                        value={item.description}
                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      min={1}
                      className="w-20 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-center"
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-28 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-right"
                      value={item.price}
                      onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                    />
                  </td>
                  <td className="p-4 text-right font-medium text-gray-700 text-sm">
                    {(item.quantity * item.price).toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      type="button" 
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all disabled:text-gray-400 disabled:hover:bg-transparent text-sm font-medium"
                      onClick={() => removeItem(idx)} 
                      disabled={data.items.length === 1}
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Settings */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              value={data.currency} 
              onChange={e => handleFieldChange('currency', e.target.value)}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax (%)</label>
            <input 
              type="number" 
              min={0} 
              step={0.01} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="0.00"
              value={data.tax} 
              onChange={e => handleFieldChange('tax', Number(e.target.value))} 
            />
          </div>
        </div>
      </div>
    </form>
  );
};

export default InvoiceForm;
