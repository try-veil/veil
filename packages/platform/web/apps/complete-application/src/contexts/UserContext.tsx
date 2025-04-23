"use client"
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface User {
  id: string;
  fusionAuthId: string;
  name: string;
  username: string;
  email: string;
  slugifiedName: string;
  type: string;
  description: null | string;
  bio: null | string;
  thumbnail: null | string;
  parents: any[];
  publishedApisList: any[];
  followedApis: any[];
  createdAt: string;
  updatedAt: string;
  attributes: any[];
  metadataAttributes: any[];
}

interface UserWithAuth extends User {
  accessToken?: string;
  refreshToken?: string;
}

interface UserContextType {
  user: UserWithAuth | null;
  setUser: (user: UserWithAuth | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

async function fetchUserInfo(accessToken: string): Promise<User> {
  try {
    console.log('Making API request with token:', accessToken);
    const response = await fetch('http://localhost:3000/users/me', {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user details');
    }

    const data = await response.json();
    console.log('API response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status } = useSession();

  useEffect(() => {
    async function loadUserDetails() {
      if (status === 'loading') {
        return;
      }

      if (status === 'unauthenticated') {
        setIsLoading(false);
        setUser(null);
        return;
      }

      const accessToken = session?.user?.accessToken;
      if (accessToken) {
        try {
          setIsLoading(true);
          console.log('Session data:', session);
          const userDetails = await fetchUserInfo(accessToken);
          
          setUser({
            ...userDetails,
            accessToken: accessToken,
            refreshToken: session.user?.refreshToken
          });
        } catch (error) {
          console.error('Failed to load user details:', error);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('No access token in session:', session);
        setIsLoading(false);
        setUser(null);
      }
    }

    loadUserDetails();
  }, [session, status]);

  const value = {
    user,
    setUser,
    isAuthenticated: !!user,
    isLoading
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 