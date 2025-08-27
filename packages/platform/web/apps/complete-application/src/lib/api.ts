export interface Project {
  id: number;
  name: string;
  description?: string;
  target_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserData {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  fusionAuthId?: string;
  tenantId?: string;
  role?: string;
}

/**
 * Fetch user data from the API
 */
export async function fetchUserData(token: string): Promise<UserData> {
  const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/me`;
  console.log('fetchUserData: Making request to:', apiUrl);
  console.log('fetchUserData: Token length:', token?.length);
  console.log('fetchUserData: Token preview:', token?.substring(0, 50) + '...');

  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('fetchUserData: Response status:', response.status);
  console.log('fetchUserData: Response ok:', response.ok);
  console.log('fetchUserData: Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('fetchUserData: Request failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url: apiUrl
    });
    throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const userData = await response.json();
  console.log('fetchUserData: User data received:', userData);
  return userData;
}

/**
 * Fetch all projects for the current user
 */
export async function fetchAllProjects(token: string): Promise<Project[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/projects`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }

  return await response.json();
}

/**
 * Fetch a specific project by ID
 */
export async function fetchProjectById(token: string, projectId: number): Promise<Project> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/projects/${projectId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch project');
  }

  return await response.json();
}

/**
 * Create a new project
 */
export async function createProject(token: string, data: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Project> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to create project');
  }

  return await response.json();
}

/**
 * Update an existing project
 */
export async function updateProject(token: string, projectId: string, data: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Project> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/projects/${projectId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to update project');
  }

  return await response.json();
}

/**
 * Delete a project
 */
export async function deleteProject(token: string, projectId: number): Promise<void> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete project');
  }
} 