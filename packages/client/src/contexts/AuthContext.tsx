import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { api } from '../lib/api';
import type { User } from '../types/app';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

type Action =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; user: User }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_FINISH' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true };
    case 'AUTH_SUCCESS':
      return { user: action.user, isAuthenticated: true, isLoading: false };
    case 'AUTH_LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'AUTH_FINISH':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refreshUser = async () => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await api.get<{ user: User }>('/api/auth/me');
      dispatch({ type: 'AUTH_SUCCESS', user: response.user });
    } catch {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  useEffect(() => {
    const handler = () => {
      void (async () => {
        dispatch({ type: 'AUTH_START' });
        try {
          await api.post('/api/auth/logout');
        } finally {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      })();
    };

    window.addEventListener('auth:logout', handler);
    return () => {
      window.removeEventListener('auth:logout', handler);
    };
  }, []);

  const login = async (payload: { email: string; password: string }) => {
    dispatch({ type: 'AUTH_START' });
    const response = await api.post<{ user: User }>('/api/auth/login', payload);
    dispatch({ type: 'AUTH_SUCCESS', user: response.user });
  };

  const register = async (payload: { email: string; username: string; password: string }) => {
    dispatch({ type: 'AUTH_START' });
    const response = await api.post<{ user: User }>('/api/auth/register', payload);
    dispatch({ type: 'AUTH_SUCCESS', user: response.user });
  };

  const logout = async () => {
    dispatch({ type: 'AUTH_START' });
    try {
      await api.post('/api/auth/logout');
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      refreshUser,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
