'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  updateTokens: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Cookie options
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load auth data from localStorage on initial load
useEffect(() => {
  // Skip during SSR
  if (typeof window === 'undefined') {
    setIsInitialized(true);
    return;
  }

  try {
    console.log('Running auth initialization in browser environment');
    
    const storedAccessToken = Cookies.get('accessToken') || '';
    const storedRefreshToken = Cookies.get('refreshToken') || '';

    if (storedAccessToken) {
      // Set state from cookies
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setIsAuthenticated(true);

      // ✅ Set cookies using stored values, not state
      Cookies.set('accessToken', storedAccessToken, COOKIE_OPTIONS);
      Cookies.set('refreshToken', storedRefreshToken, COOKIE_OPTIONS);

      console.log('Auth: User authenticated from cookies');
    } else {
      console.log('Auth: No valid auth data in cookies');
    }
  } catch (error) {
    console.error('Error loading auth from cookies:', error);
  } finally {
    setIsInitialized(true);
  }
}, []);

  const login = (accessToken: string, refreshToken: string) => {
    console.log('Auth: Logging in user');
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setIsAuthenticated(true);

    // Store in localStorage
    if (typeof window !== 'undefined') {
      // localStorage.setItem('accessToken', accessToken);
      // localStorage.setItem('refreshToken', refreshToken);

      // Set auth cookie for middleware
      Cookies.set('accessToken', `${accessToken}`, COOKIE_OPTIONS);
      Cookies.set('refreshToken', `${refreshToken}`, COOKIE_OPTIONS);
    }
  };

  const logout = () => {
    console.log('Auth: Logging out user');
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);

    // Clear localStorage and cookies
    if (typeof window !== 'undefined') {
      // localStorage.removeItem('accessToken');
      // localStorage.removeItem('refreshToken');
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
    }
  };

  const updateTokens = (newAccessToken: string, newRefreshToken: string) => {
    console.log('Auth: Updating tokens');
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);

    // Update localStorage
    if (typeof window !== 'undefined') {
      Cookies.set('accessToken', `${accessToken}`, COOKIE_OPTIONS);
      Cookies.set('refreshToken', `${refreshToken}`, COOKIE_OPTIONS);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        isAuthenticated,
        login,
        logout,
        updateTokens
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 