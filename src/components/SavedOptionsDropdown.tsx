import React, { useState, useRef, useEffect } from 'react';
import { CompanyDetails, ItemDescription } from '../utils/localStorage';

interface Option {
  id: string;
  label: string;
  value: string;
  secondaryValue?: string;
  defaultPrice?: number;
}

interface SavedOptionsDropdownProps {
  value: string;
  secondaryValue?: string;
  onSelect: (value: string, secondaryValue?: string, defaultPrice?: number) => void;
  onSave?: () => void;
  options: CompanyDetails[] | ItemDescription[];
  placeholder: string;
  type: 'company' | 'item';
  disabled?: boolean;
  className?: string;
}

const SavedOptionsDropdown: React.FC<SavedOptionsDropdownProps> = ({
  value,
  secondaryValue,
  onSelect,
  onSave,
  options,
  placeholder,
  type,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convert options to standardized format
  const formattedOptions: Option[] = options.map(option => {
    if (type === 'company') {
      const company = option as CompanyDetails;
      return {
        id: company.id,
        label: company.name,
        value: company.name,
        secondaryValue: company.address,
      };
    } else {
      const item = option as ItemDescription;
      return {
        id: item.id,
        label: item.description,
        value: item.description,
        defaultPrice: item.defaultPrice,
      };
    }
  });

  // Filter options based on search term
  const filteredOptions = formattedOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.secondaryValue && option.secondaryValue.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionSelect = (option: Option) => {
    onSelect(option.value, option.secondaryValue, option.defaultPrice);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) {
      onSave();
    }
    setIsOpen(false);
  };

  const hasValidInput = value.trim().length > 0 && 
    (type === 'item' || (secondaryValue && secondaryValue.trim().length > 0));

  const showSaveOption = onSave && hasValidInput && !filteredOptions.some(option => 
    option.value.toLowerCase() === value.toLowerCase() &&
    (type === 'item' || option.secondaryValue?.toLowerCase() === secondaryValue?.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg 
          focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}
        `}
      >
        <span className={`text-sm ${!value ? 'text-gray-500' : 'text-gray-900'}`}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-2">
          {formattedOptions.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {formattedOptions.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder={`Search ${type === 'company' ? 'companies' : 'items'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.length === 0 && searchTerm ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No {type === 'company' ? 'companies' : 'items'} found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionSelect(option)}
                  className="w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
                >
                  <div className="text-sm font-medium text-gray-900 truncate">{option.label}</div>
                  {option.secondaryValue && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{option.secondaryValue}</div>
                  )}
                  {option.defaultPrice && (
                    <div className="text-xs text-blue-600 mt-1 font-medium">Default price: {option.defaultPrice.toFixed(2)}</div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Save current option */}
          {showSaveOption && (
            <div className="border-t border-gray-200 p-2">
              <button
                type="button"
                onClick={handleSaveClick}
                className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Save "{value}" for future use
              </button>
            </div>
          )}

          {/* Empty state */}
          {filteredOptions.length === 0 && !searchTerm && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              <div className="mb-2">No saved {type === 'company' ? 'companies' : 'items'} yet</div>
              <div className="text-xs">
                {type === 'company' 
                  ? 'Fill in company details and they\'ll be saved automatically' 
                  : 'Add item descriptions and they\'ll be saved for reuse'
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedOptionsDropdown;
