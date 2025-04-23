const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type RequiredHeader = {
  name: string;
  value: string;
  is_variable: boolean;
};

export interface OnboardAPI {
  api_id: string;
  name: string;
  path: string;
  target_url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  version: string;
  description: string;
  documentation_url: string;
  required_headers: RequiredHeader[];
}

export interface OnboardResponse {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function onboardAPI(data: OnboardAPI, token: string): Promise<OnboardResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/onboard/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(data),
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.error || 'Onboarding failed');
    }

    return resData;
  } catch (error) {
    console.error('[onboardAPI] Error:', error);
    throw error;
  }
}


export async function getOnboardAPIById(api_id: string, token: string): Promise<OnboardAPI> {
  try {
    const response = await fetch(`${API_BASE_URL}/onboard/api/${api_id}`, {
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


export async function getAllOnboardAPIs(token: string): Promise<OnboardAPI[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/onboard/api`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch onboard APIs');
    }

    return data;
  } catch (error) {
    console.error('[getAllOnboardAPIs] Error:', error);
    throw error;
  }
}

