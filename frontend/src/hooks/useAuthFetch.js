import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TOKEN_KEY = 'sport-eda-token';

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

/**
 * Возвращает функцию fetch с подставленными auth-заголовками.
 * При ответе 401 вызывает logout и перенаправляет на /login.
 */
export function useAuthFetch() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        logout();
        navigate('/login', { replace: true });
        throw new Error('Unauthorized');
      }
      return res;
    },
    [logout, navigate]
  );

  return authFetch;
}

export default useAuthFetch;
