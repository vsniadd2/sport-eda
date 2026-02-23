import { createContext, useContext } from 'react';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme: () => {}, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext) ?? { theme: 'light', setTheme: () => {}, toggleTheme: () => {} };
}
