import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

const STORAGE_KEY = 'sport-eda-cart';

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadCart());

  const persist = useCallback((next) => {
    setItems((prev) => {
      const result = typeof next === 'function' ? next(prev) : next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      return result;
    });
  }, []);

  const addItem = useCallback((productId, quantity = 1, price, name, image_url) => {
    persist((prev) => {
      const existing = prev.find((i) => i.product_id === productId);
      if (existing) {
        return prev.map((i) =>
          i.product_id === productId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product_id: productId, quantity, price, name, image_url: image_url || null }];
    });
  }, [persist]);

  const removeItem = useCallback((productId) => {
    persist((prev) => prev.filter((i) => i.product_id !== productId));
  }, [persist]);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) removeItem(productId);
    else persist((prev) => prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i)));
  }, [persist, removeItem]);

  const clearCart = useCallback(() => persist([]), [persist]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalSum = items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalSum }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
