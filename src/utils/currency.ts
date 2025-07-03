export const getCurrencySymbol = (currency: string): string => {
  const symbols: { [key: string]: string } = {
    USD: '$',
    EUR: 'EUR',
    GBP: 'GBP',
    JPY: 'JPY',
    CAD: 'CAD',
    AUD: 'AUD',
    INR: 'INR',
  };
  return symbols[currency] || currency;
};

export const formatCurrency = (amount: number, currency: string): string => {
  const symbol = getCurrencySymbol(currency);
  // Format number with commas as thousand separators
  const formattedAmount = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol} ${formattedAmount}`;
};
