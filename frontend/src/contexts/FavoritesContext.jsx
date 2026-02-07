import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);
const STORAGE_KEY = 'sport-eda-favorites';
const API_URL = '/api';
const TOKEN_KEY = 'sport-eda-token';

function loadGuestFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveGuestFavorites(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [synced, setSynced] = useState(false);
  const mergedRef = useRef(false);

  const idsSet = new Set(favoriteIds);
  const totalCount = favoriteIds.length;

  const fetchFavorites = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setFavoriteIds(loadGuestFavorites());
      setSynced(true);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/favorites`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(Array.isArray(data) ? data : []);
      } else {
        setFavoriteIds(loadGuestFavorites());
      }
    } catch {
      setFavoriteIds(loadGuestFavorites());
    } finally {
      setSynced(true);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    if (!user || mergedRef.current) return;
    const guestIds = loadGuestFavorites();
    if (guestIds.length === 0) {
      mergedRef.current = true;
      fetchFavorites();
      return;
    }
    mergedRef.current = true;
    Promise.all(
      guestIds.map((id) =>
        fetch(`${API_URL}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ product_id: id }),
        })
      )
    ).finally(() => {
      saveGuestFavorites([]);
      fetchFavorites();
    });
  }, [user, fetchFavorites]);

  const add = useCallback(async (productId) => {
    const id = parseInt(productId, 10);
    if (!id) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const res = await fetch(`${API_URL}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ product_id: id }),
        });
        if (res.ok) {
          setFavoriteIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
          return;
        }
      } catch {}
    }
    setFavoriteIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveGuestFavorites(next);
      return next;
    });
  }, []);

  const remove = useCallback(async (productId) => {
    const id = parseInt(productId, 10);
    if (!id) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch(`${API_URL}/favorites/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      } catch {}
    }
    setFavoriteIds((prev) => {
      const next = prev.filter((x) => x !== id);
      if (!token) saveGuestFavorites(next);
      return next;
    });
  }, []);

  const toggle = useCallback((productId) => {
    const id = parseInt(productId, 10);
    if (!id) return;
    if (favoriteIds.includes(id)) remove(id);
    else add(id);
  }, [favoriteIds, add, remove]);

  const isFavorite = useCallback((productId) => idsSet.has(parseInt(productId, 10)), [idsSet]);

  const value = {
    favoriteIds,
    totalCount,
    add,
    remove,
    toggle,
    isFavorite,
    refetch: fetchFavorites,
    synced,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
