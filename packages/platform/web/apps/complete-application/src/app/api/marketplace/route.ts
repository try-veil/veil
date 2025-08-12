const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type RequiredHeader = {
  name: string;
  value: string;
  is_variable: boolean;
};

export interface MarketplaceAPI {
  api_id: string;
  name: string;
  path: string;
  target_url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  version: string;
  description: string;
  documentation_url: string;
  required_headers: RequiredHeader[];
  query_params?: { key: string; value: string }[];
  body?: {
    type: string;
    content: string;
    form_data?: { key: string; value: string }[];
    json_data?: any;
  };
}

export interface MarketplaceProject {
  id: number;
  name: string;
  description: string;
  // Add other fields as needed based on the actual response
}

export async function getMarketplaceProjects(token: string): Promise<MarketplaceProject[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/marketplace`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch marketplace projects');
    }

    return data;
  } catch (error) {
    console.error('[getMarketplaceProjects] Error:', error);
    throw error;
  }
}

export async function getMarketplaceAPIById(api_id: string, token: string): Promise<MarketplaceAPI> {
  try {
    const response = await fetch(`${API_BASE_URL}/marketplace/apis/${api_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch API details');
    }

    return data;
  } catch (error) {
    console.error('[getOnboardAPIById] Error:', error);
    throw error;
  }
}

