import { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext(null);

// Currency configuration
const CURRENCIES = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    flag: '🇿🇦',
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    flag: '🇳🇬',
  },
};

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState(null);

  useEffect(() => {
    // Check localStorage first
    const saved = localStorage.getItem('consultpro_currency');
    if (saved && CURRENCIES[saved]) {
      setCurrency(saved);
      setLoading(false);
      return;
    }

    // Detect from geo location
    fetch('/api/geo')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.currency) {
          const detectedCurrency = data.data.currency;
          if (CURRENCIES[detectedCurrency]) {
            setCurrency(detectedCurrency);
            localStorage.setItem('consultpro_currency', detectedCurrency);
          }
          if (data.data.country) {
            setDetectedCountry(data.data.country);
          }
        }
      })
      .catch(() => {
        // Default to USD on error
        setCurrency('USD');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const changeCurrency = (newCurrency) => {
    if (CURRENCIES[newCurrency]) {
      setCurrency(newCurrency);
      localStorage.setItem('consultpro_currency', newCurrency);
    }
  };

  const formatPrice = (prices, yearly = false) => {
    const priceKey = yearly ? `price_${currency.toLowerCase()}_yearly` : `price_${currency.toLowerCase()}`;
    const amount = prices[priceKey] || prices[`price_${currency.toLowerCase()}`] || 0;
    const config = CURRENCIES[currency];

    return {
      amount,
      formatted: `${config.symbol}${amount.toLocaleString()}`,
      currency: config.code,
      symbol: config.symbol,
    };
  };

  const value = {
    currency,
    setCurrency: changeCurrency,
    currencies: Object.values(CURRENCIES),
    currencyConfig: CURRENCIES[currency],
    loading,
    detectedCountry,
    formatPrice,
    CURRENCIES,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
