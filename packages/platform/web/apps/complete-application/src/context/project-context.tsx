'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectById, Project } from '@/app/api/project/route';

interface ProjectContextType {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  refreshProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ 
  children, 
  projectId 
}: { 
  children: ReactNode; 
  projectId: string;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  const fetchProjectDetails = async () => {
    if (!accessToken || !projectId) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const projectData = await getProjectById(projectId, accessToken);
      setProject(projectData);
      setError(null);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('Failed to load project details');
      setProject(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId, accessToken]);

  const refreshProject = async () => {
    await fetchProjectDetails();
  };

  return (
    <ProjectContext.Provider value={{ project, isLoading, error, refreshProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
} 