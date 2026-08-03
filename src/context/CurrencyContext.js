import React, { createContext, useContext } from 'react';

const CurrencyContext = createContext({ code: 'INR', symbol: '₹' });

export function CurrencyProvider({ code, symbol, children }) {
  return (
    <CurrencyContext.Provider value={{ code: code || 'INR', symbol: symbol || '₹' }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
