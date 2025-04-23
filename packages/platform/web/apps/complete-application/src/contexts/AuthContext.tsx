'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (userData: any, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
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
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Load auth data from localStorage on initial load
  useEffect(() => {
    // Skip localStorage access during SSR
    if (typeof window === 'undefined') {
      setIsInitialized(true);
      return;
    }
    
    try {
      console.log('Running auth initialization in browser environment');
      const storedUser = localStorage.getItem('user');
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      console.log('Auth initialization - stored tokens:', {
        hasUser: !!storedUser, 
        hasAccessToken: !!storedAccessToken,
        hasRefreshToken: !!storedRefreshToken
      });
      
      if (storedUser && storedAccessToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
          setIsAuthenticated(true);
          
          // Set auth cookie for middleware
          Cookies.set('auth-token', 'true', COOKIE_OPTIONS);
          
          console.log('Auth: User authenticated from localStorage', parsedUser.id);
        } catch (parseError) {
          console.error('Failed to parse user data from localStorage:', parseError);
          // Clear invalid data
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          Cookies.remove('auth-token');
        }
      } else {
        console.log('Auth: No valid auth data in localStorage');
      }
    } catch (error) {
      console.error('Error loading auth from localStorage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);
  
  const login = (userData: User, accessToken: string, refreshToken: string) => {
    console.log('Auth: Logging in user', userData.id);
    setUser(userData);
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setIsAuthenticated(true);
    
    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Set auth cookie for middleware
      Cookies.set('auth-token', 'true', COOKIE_OPTIONS);
    }
  };
  
  const logout = () => {
    console.log('Auth: Logging out user');
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
    
    // Clear localStorage and cookies
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      Cookies.remove('auth-token');
    }
  };
  
  const updateTokens = (newAccessToken: string, newRefreshToken: string) => {
    console.log('Auth: Updating tokens');
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      // Ensure auth cookie is set
      Cookies.set('auth-token', 'true', COOKIE_OPTIONS);
    }
  };
  
  return (
    <AuthContext.Provider 
      value={{ 
        user, 
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