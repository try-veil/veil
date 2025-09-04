export interface Tenant {
  id: string;
  name: string;
  domain: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export async function createTenant(data: Omit<Tenant, 'id'>, token: string): Promise<Tenant> {
  try {
    const response = await fetch(`${API_BASE_URL}/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      },
      body: JSON.stringify(data),
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.error || 'Failed to create tenant');
    }

    return resData as Tenant; // Ensure the response matches the Tenant type
  } catch (error) {
    console.error('[createTenant] Error:', error);
    throw error;
  }
}

export async function getTenants(token: string): Promise<Tenant[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/tenants`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch tenants');
    }

    return data;
  } catch (error) {
    console.error('[getTenants] Error:', error);
    throw error;
  }
}
