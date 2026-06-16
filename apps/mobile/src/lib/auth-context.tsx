import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, LoginInput, RegisterInput } from '@petdots/shared';
import { apiClient } from './api-client';

const USER_STORAGE_KEY = 'petdots.user';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateLocalUser: (fields: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistUser = useCallback((authUser: AuthUser) => {
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const clearUser = useCallback(() => {
    AsyncStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(USER_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            setUser(JSON.parse(stored) as AuthUser);
          } catch {
            AsyncStorage.removeItem(USER_STORAGE_KEY);
          }
        }
      })
      .then(() => apiClient.getMe())
      .then((profile) => {
        persistUser({ id: profile.id, email: profile.email, name: profile.name, role: profile.role });
      })
      .catch(() => clearUser())
      .finally(() => setIsLoading(false));
  }, [persistUser, clearUser]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await apiClient.login(input);
      persistUser(response.user);
      return response.user;
    },
    [persistUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await apiClient.register(input);
      persistUser(response.user);
      return response.user;
    },
    [persistUser],
  );

  const logout = useCallback(async () => {
    await apiClient.logout();
    clearUser();
  }, [clearUser]);

  const updateLocalUser = useCallback((fields: Partial<AuthUser>) => {
    if (!user) return;
    const updated = { ...user, ...fields };
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
