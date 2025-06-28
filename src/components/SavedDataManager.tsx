import React, { useState, useEffect } from 'react';
import {
  getFromCompanies,
  getToCompanies,
  getItemDescriptions,
  deleteFromCompany,
  deleteToCompany,
  deleteItemDescription,
  clearAllSavedData,
  CompanyDetails,
  ItemDescription,
} from '../utils/localStorage';

interface SavedDataManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SavedDataManager: React.FC<SavedDataManagerProps> = ({ isOpen, onClose }) => {
  const [fromCompanies, setFromCompanies] = useState<CompanyDetails[]>([]);
  const [toCompanies, setToCompanies] = useState<CompanyDetails[]>([]);
  const [itemDescriptions, setItemDescriptions] = useState<ItemDescription[]>([]);
  const [activeTab, setActiveTab] = useState<'from' | 'to' | 'items'>('from');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    setFromCompanies(getFromCompanies());
    setToCompanies(getToCompanies());
    setItemDescriptions(getItemDescriptions());
  };

  const handleDeleteFromCompany = (id: string) => {
    deleteFromCompany(id);
    setFromCompanies(getFromCompanies());
  };

  const handleDeleteToCompany = (id: string) => {
    deleteToCompany(id);
    setToCompanies(getToCompanies());
  };

  const handleDeleteItemDescription = (id: string) => {
    deleteItemDescription(id);
    setItemDescriptions(getItemDescriptions());
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all saved data? This action cannot be undone.')) {
      clearAllSavedData();
      loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Manage Saved Data</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('from')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'from'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              From Companies ({fromCompanies.length})
            </button>
            <button
              onClick={() => setActiveTab('to')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'to'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              To Companies ({toCompanies.length})
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Item Descriptions ({itemDescriptions.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'from' && (
            <div className="space-y-4">
              {fromCompanies.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No saved "From" companies yet.</p>
              ) : (
                fromCompanies.map((company) => (
                  <div key={company.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{company.address}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Last used: {company.lastUsed.toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFromCompany(company.id)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors"
                        title="Delete company"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'to' && (
            <div className="space-y-4">
              {toCompanies.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No saved "To" companies yet.</p>
              ) : (
                toCompanies.map((company) => (
                  <div key={company.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{company.address}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Last used: {company.lastUsed.toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteToCompany(company.id)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors"
                        title="Delete company"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              {itemDescriptions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No saved item descriptions yet.</p>
              ) : (
                itemDescriptions.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.description}</h3>
                        {item.defaultPrice && (
                          <p className="text-sm text-blue-600 mt-1">
                            Default price: {item.defaultPrice.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Last used: {item.lastUsed.toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteItemDescription(item.id)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors"
                        title="Delete item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
            >
              Clear All Data
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedDataManager;
