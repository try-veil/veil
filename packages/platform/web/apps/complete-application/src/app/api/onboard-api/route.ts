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
  query_params?: { key: string; value: string }[];
  body?: {
    type: string;
    content: string;
    form_data?: { key: string; value: string }[];
    json_data?: any;
  };
}

export interface OnboardResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface OnboardUpdateAPI extends OnboardAPI {
  project_id?: number;
  required_subscription?: string;
  specification?: Record<string, any>;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
  }[];
  api_keys?: {
    key: string;
    name: string;
    is_active: boolean;
  }[];
  query_params?: { key: string; value: string }[];
  body?: {
    type: string;
    content: string;
    form_data?: { key: string; value: string }[];
    json_data?: any;
  };
}

export async function onboardAPI(data: OnboardAPI, token: string): Promise<OnboardResponse> {
  try {
    console.log('[onboardAPI] Creating API with data:', data);
    console.log('[onboardAPI] Query params:', data.query_params);
    console.log('[onboardAPI] Body data:', data.body);

    const response = await fetch(`${API_BASE_URL}/onboard`, {
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

export async function updateOnboardAPI(apiId: string, data: OnboardUpdateAPI, token: string): Promise<OnboardResponse> {
  try {

    console.log('[updateOnboardAPI] Updating API with data:', apiId, data);
    console.log('[updateOnboardAPI] Query params:', data.query_params);
    console.log('[updateOnboardAPI] Body data:', data.body);

    const response = await fetch(`${API_BASE_URL}/onboard/api/${apiId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.error || 'Failed to update API');
    }

    return resData;
  } catch (error) {
    console.error('[updateOnboardAPI] Error:', error);
    throw error;
  }
}

export async function deleteAPI(project_id: string, api_id: string, token: string): Promise<OnboardResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${project_id}/apis/${api_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    if (response.ok) {
      return { success: true, message: 'API deleted successfully' };
    } else {
      let errorMessage = 'Deleting API failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('[deleteAPI] Error:', error);
    throw error;
  }
}