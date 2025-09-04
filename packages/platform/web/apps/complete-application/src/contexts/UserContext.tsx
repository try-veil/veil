"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllProjects, Project, fetchUserData } from '@/lib/api';

// User interface
export interface UserContextData {
  id: string;
  name?: string;
  email?: string;
  projects?: Project[];
  role?: string;
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
}

// Context interface
interface UserContextType {
  user: UserContextData | null;
  isLoading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
  setUser: (user: UserContextData | null) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
  refreshUserData: async () => { },
  setUser: (user: UserContextData | null) => { },
});

export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserContextData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken, refreshToken, isAuthenticated } = useAuth();

  const refreshUserData = async () => {
    if (!accessToken) {
      console.log('UserContext: No access token available');
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('UserContext: Fetching user data with token:', accessToken.substring(0, 20) + '...');
      console.log('UserContext: isAuthenticated:', isAuthenticated);
      
      // Fetch user data from API
      const userData = await fetchUserData(accessToken);
      console.log('UserContext: User data fetched successfully:', userData);

      setUser(userData);
      setError(null);
    } catch (err) {
      console.error('UserContext: Error fetching user data:', err);
      console.error('UserContext: Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        token: accessToken ? 'Present' : 'Missing',
        tokenLength: accessToken?.length,
        isAuthenticated
      });
      setError('Failed to load user data');
      // Don't set user to null on error, keep existing user data
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshUserData();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  return (
    <UserContext.Provider value={{ user, isLoading, error, refreshUserData, setUser }}>
      {children}
    </UserContext.Provider>
  );
}; 