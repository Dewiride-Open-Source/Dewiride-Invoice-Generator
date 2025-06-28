/**
 * Utilities for managing recurring invoice details in localStorage
 */

export interface CompanyDetails {
  id: string;
  name: string;
  address: string;
  lastUsed: Date;
}

export interface ItemDescription {
  id: string;
  description: string;
  defaultPrice?: number;
  lastUsed: Date;
}

const STORAGE_KEYS = {
  FROM_COMPANIES: 'invoice_from_companies',
  TO_COMPANIES: 'invoice_to_companies',
  ITEM_DESCRIPTIONS: 'invoice_item_descriptions',
} as const;

// Company Details Management
export const saveFromCompany = (name: string, address: string): void => {
  if (!name.trim() || !address.trim()) return;
  
  const companies = getFromCompanies();
  const normalizedName = name.trim().toLowerCase();
  const normalizedAddress = address.trim().toLowerCase();
  
  // Find existing company by name (case-insensitive)
  const existingIndex = companies.findIndex(c => 
    c.name.toLowerCase() === normalizedName
  );
  
  if (existingIndex >= 0) {
    // Update existing company's address and last used date
    companies[existingIndex].name = name.trim(); // Keep original casing
    companies[existingIndex].address = address.trim();
    companies[existingIndex].lastUsed = new Date();
  } else {
    // Add new company only if it's truly unique
    const newCompany: CompanyDetails = {
      id: generateId(),
      name: name.trim(),
      address: address.trim(),
      lastUsed: new Date(),
    };
    companies.unshift(newCompany);
  }
  
  // Keep only the 20 most recent companies
  const sortedCompanies = companies
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    .slice(0, 20);
  
  localStorage.setItem(STORAGE_KEYS.FROM_COMPANIES, JSON.stringify(sortedCompanies));
};

export const saveToCompany = (name: string, address: string): void => {
  if (!name.trim() || !address.trim()) return;
  
  const companies = getToCompanies();
  const normalizedName = name.trim().toLowerCase();
  const normalizedAddress = address.trim().toLowerCase();
  
  // Find existing company by name (case-insensitive)
  const existingIndex = companies.findIndex(c => 
    c.name.toLowerCase() === normalizedName
  );
  
  if (existingIndex >= 0) {
    // Update existing company's address and last used date
    companies[existingIndex].name = name.trim(); // Keep original casing
    companies[existingIndex].address = address.trim();
    companies[existingIndex].lastUsed = new Date();
  } else {
    // Add new company only if it's truly unique
    const newCompany: CompanyDetails = {
      id: generateId(),
      name: name.trim(),
      address: address.trim(),
      lastUsed: new Date(),
    };
    companies.unshift(newCompany);
  }
  
  // Keep only the 20 most recent companies
  const sortedCompanies = companies
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    .slice(0, 20);
  
  localStorage.setItem(STORAGE_KEYS.TO_COMPANIES, JSON.stringify(sortedCompanies));
};

export const getFromCompanies = (): CompanyDetails[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.FROM_COMPANIES);
    if (!stored) return [];
    
    const companies = JSON.parse(stored) as CompanyDetails[];
    return companies.map(c => ({
      ...c,
      lastUsed: new Date(c.lastUsed),
    }));
  } catch {
    return [];
  }
};

export const getToCompanies = (): CompanyDetails[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TO_COMPANIES);
    if (!stored) return [];
    
    const companies = JSON.parse(stored) as CompanyDetails[];
    return companies.map(c => ({
      ...c,
      lastUsed: new Date(c.lastUsed),
    }));
  } catch {
    return [];
  }
};

export const deleteFromCompany = (id: string): void => {
  const companies = getFromCompanies().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.FROM_COMPANIES, JSON.stringify(companies));
};

export const deleteToCompany = (id: string): void => {
  const companies = getToCompanies().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.TO_COMPANIES, JSON.stringify(companies));
};

// Item Descriptions Management
export const saveItemDescription = (description: string, defaultPrice?: number): void => {
  if (!description.trim() || description.trim().length < 3) return;
  
  const items = getItemDescriptions();
  const normalizedDescription = description.trim().toLowerCase();
  
  // Find existing item by description (case-insensitive)
  const existingIndex = items.findIndex(i => 
    i.description.toLowerCase() === normalizedDescription
  );
  
  if (existingIndex >= 0) {
    // Update existing item's last used date and price
    items[existingIndex].description = description.trim(); // Keep original casing
    items[existingIndex].lastUsed = new Date();
    if (defaultPrice !== undefined && defaultPrice > 0) {
      items[existingIndex].defaultPrice = defaultPrice;
    }
  } else {
    // Add new item only if it's truly unique
    const newItem: ItemDescription = {
      id: generateId(),
      description: description.trim(),
      defaultPrice: defaultPrice && defaultPrice > 0 ? defaultPrice : undefined,
      lastUsed: new Date(),
    };
    items.unshift(newItem);
  }
  
  // Keep only the 50 most recent items
  const sortedItems = items
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    .slice(0, 50);
  
  localStorage.setItem(STORAGE_KEYS.ITEM_DESCRIPTIONS, JSON.stringify(sortedItems));
};

export const getItemDescriptions = (): ItemDescription[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ITEM_DESCRIPTIONS);
    if (!stored) return [];
    
    const items = JSON.parse(stored) as ItemDescription[];
    return items.map(i => ({
      ...i,
      lastUsed: new Date(i.lastUsed),
    }));
  } catch {
    return [];
  }
};

export const deleteItemDescription = (id: string): void => {
  const items = getItemDescriptions().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.ITEM_DESCRIPTIONS, JSON.stringify(items));
};

// Utility function to generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Search functionality
export const searchFromCompanies = (query: string): CompanyDetails[] => {
  if (!query.trim()) return getFromCompanies();
  
  const companies = getFromCompanies();
  const searchTerm = query.toLowerCase();
  
  return companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm) || 
    c.address.toLowerCase().includes(searchTerm)
  );
};

export const searchToCompanies = (query: string): CompanyDetails[] => {
  if (!query.trim()) return getToCompanies();
  
  const companies = getToCompanies();
  const searchTerm = query.toLowerCase();
  
  return companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm) || 
    c.address.toLowerCase().includes(searchTerm)
  );
};

export const searchItemDescriptions = (query: string): ItemDescription[] => {
  if (!query.trim()) return getItemDescriptions();
  
  const items = getItemDescriptions();
  const searchTerm = query.toLowerCase();
  
  return items.filter(i => 
    i.description.toLowerCase().includes(searchTerm)
  );
};

// Utility functions for clearing data
export const clearFromCompanies = (): void => {
  localStorage.removeItem(STORAGE_KEYS.FROM_COMPANIES);
};

export const clearToCompanies = (): void => {
  localStorage.removeItem(STORAGE_KEYS.TO_COMPANIES);
};

export const clearItemDescriptions = (): void => {
  localStorage.removeItem(STORAGE_KEYS.ITEM_DESCRIPTIONS);
};

export const clearAllSavedData = (): void => {
  clearFromCompanies();
  clearToCompanies();
  clearItemDescriptions();
};
