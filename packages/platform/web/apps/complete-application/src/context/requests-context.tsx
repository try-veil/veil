'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  projectId: string;
}

const RequestsContext = createContext<RequestsContextType | undefined>(undefined);

export function RequestsProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  const [requests, setRequests] = useState<Request[]>([]);

  // Initialize requests when projectId changes
  useEffect(() => {
    // You might want to load requests from an API or local storage here
    setRequests([
      {
        id: '1',
        title: 'Request 1',
        description: '',
        category: 'api',
        url: `/projects/${projectId}/client/request1`,
        icon: IconLayoutDashboard,
      },
      {
        id: '2',
        title: 'Request 2',
        description: '',
        category: 'api',
        url: `/projects/${projectId}/client/request2`,
        icon: IconChecklist,
      },
    ]);
  }, [projectId]);

  const addRequest = (request: Omit<Request, 'id' | 'url' | 'icon'>) => {
    const newRequest: Request = {
      id: Date.now().toString(),
      ...request,
      url: `/projects/${projectId}/client/${request.title}`,
      icon: IconPackages,
    };
    setRequests(prevRequests => [...prevRequests, newRequest]);
  };

  return (
    <RequestsContext.Provider value={{ requests, addRequest, projectId }}>
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