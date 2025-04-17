'use client'

import React, { createContext, useContext, useState } from 'react';
import { IconLayoutDashboard, IconChecklist, IconPackages } from '@tabler/icons-react';

interface Request {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  icon: any;
}

interface RequestsContextType {
  requests: Request[];
  addRequest: (request: Omit<Request, 'id' | 'url' | 'icon'>) => void;
}

const RequestsContext = createContext<RequestsContextType | undefined>(undefined);

export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<Request[]>([
    {
      id: '1',
      title: 'Request 1',
      description: '',
      category: 'api',
      url: '/projects/project_jiya/client/request1',
      icon: IconLayoutDashboard,
    },
    {
      id: '2',
      title: 'Request 2',
      description: '',
      category: 'api',
      url: '/projects/project_jiya/client/request2',
      icon: IconChecklist,
    },
  ]);

  const addRequest = (request: Omit<Request, 'id' | 'url' | 'icon'>) => {
    const newRequest: Request = {
      id: Date.now().toString(),
      ...request,
      url: `/projects/project_jiya/client/request${requests.length + 1}`,
      icon: IconPackages,
    };
    setRequests([...requests, newRequest]);
  };

  return (
    <RequestsContext.Provider value={{ requests, addRequest }}>
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const context = useContext(RequestsContext);
  if (context === undefined) {
    throw new Error('useRequests must be used within a RequestsProvider');
  }
  return context;
} 