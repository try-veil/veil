const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export interface MarketplaceProject {
  id: string;
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

