import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient, type TokenStorage } from '@petdots/shared';

const ACCESS_TOKEN_KEY = 'petdots.accessToken';
const REFRESH_TOKEN_KEY = 'petdots.refreshToken';

const asyncStorageTokenStorage: TokenStorage = {
  getAccessToken: () => AsyncStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => AsyncStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: async (accessToken, refreshToken) => {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens: async () => {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Em desenvolvimento, "localhost" não acessa a API a partir de um device/emulador real.
// Ajuste EXPO_PUBLIC_API_URL para o IP da máquina na rede local quando necessário.
export const apiClient = new ApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
  tokenStorage: asyncStorageTokenStorage,
});
