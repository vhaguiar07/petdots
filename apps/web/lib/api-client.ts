import { ApiClient, type TokenStorage } from "@petdots/shared";

const ACCESS_TOKEN_KEY = "petdots.accessToken";
const REFRESH_TOKEN_KEY = "petdots.refreshToken";

const browserTokenStorage: TokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  tokenStorage: typeof window !== "undefined" ? browserTokenStorage : undefined,
});
