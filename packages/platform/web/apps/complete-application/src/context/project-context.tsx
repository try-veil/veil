'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectById, Project } from '@/app/api/project/route';

interface ProjectContextType {
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;
  refreshProject: () => Promise<void>;
  projectList:Project[]
  setProjectList: (projectList: Project[]) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (selectedProjectId: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ 
  children,  
}: { 
  children: ReactNode; 
}) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();
  const [projectList, setProjectList] = useState<Project[]>([]);

  const fetchProjectDetails = async () => {
    if (!accessToken || !selectedProjectId) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const projectData = await getProjectById(selectedProjectId, accessToken);
      setSelectedProject(projectData);
      setError(null);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('Failed to load project details');
      setSelectedProject(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [selectedProjectId, accessToken]);

  const refreshProject = async () => {
    await fetchProjectDetails();
  };

  return (
    <ProjectContext.Provider value={{ selectedProject, isLoading, error, refreshProject, projectList, setProjectList, selectedProjectId, setSelectedProjectId }}>
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