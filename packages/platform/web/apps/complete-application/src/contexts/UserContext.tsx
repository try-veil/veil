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
}

// Context interface
interface UserContextType {
  user: UserContextData | null;
  isLoading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
  refreshUserData: async () => {},
});

export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserContextData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user: authUser, accessToken, refreshToken, isAuthenticated } = useAuth();

  const refreshUserData = async () => {
    if (!accessToken || !authUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch user data from API
      const userData = await fetchUserData(accessToken);
      
      // Fetch projects
      const projects = await fetchAllProjects(accessToken);
      
      setUser({
        ...userData,
        projects,
        accessToken,
        refreshToken
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && authUser) {
      refreshUserData();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, authUser?.id, accessToken]);

  return (
    <UserContext.Provider value={{ user, isLoading, error, refreshUserData }}>
      {children}
    </UserContext.Provider>
  );
}; 