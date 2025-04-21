export interface Project {
  name: string;
  thumbnail?: string;
  description?: string;
  favorite?:boolean;
  enableLimitsToAPIs?:boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function getAllProjectsByUserId(token: string): Promise<Project[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch projects');
    }

    return data;
  } catch (error) {
    console.error('[getProjectsByUserId] Error:', error);
    throw error;
  }
}

export async function createProject(data:Project, token: string): Promise<Project> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.error || 'Failed to create project');
    }

    return resData;
  } catch (error) {
    console.error('[createProject] Error:', error);
    throw error;
  }
}
