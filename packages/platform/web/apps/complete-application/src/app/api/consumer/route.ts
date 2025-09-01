const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

type RequiredHeader = {
  name: string;
  value: string;
  is_variable: boolean;
};

export interface ProjectAPI {
  apiId: string;
  name: string;
  path: string;
  target_url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  version: string;
  description: string;
  documentation_url: string;
  required_headers: RequiredHeader[];
}

export interface HubListing {
  id?: string;
  logo?: string;
  category: string;
  shortDescription?: string;
  longDescription?: string;
  website?: string;
  termsOfUse?: string;
  visibleToPublic: boolean;
  healthCheckUrl?: string;
  apiDocumentation?: string;
  projectId: number;
  basicPlan?: {
    id: string,
    enabled: boolean,
    pricePerMonth: number,
    requestQuotaPerMonth: number,
    hardLimitQuota: number
  }
  proPlan?: {
    id: string,
    enabled: boolean,
    pricePerMonth: number,
    requestQuotaPerMonth: number,
    hardLimitQuota: number
  }
  ultraPlan?: {
    id: string,
    enabled: boolean,
    pricePerMonth: number,
    requestQuotaPerMonth: number,
    hardLimitQuota: number
  }
}

export interface ProjectWithHubListing {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  category?: string;
  website?: string;
  thumbnail?: string;
  target_url?: string;
  apis: ProjectAPI[];
  hubListing?: HubListing;
}

export async function getAllProjectAPIs(
  token: string,
  project_id: string
): Promise<ProjectAPI[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/projects/marketplace/${project_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch APIs");
    }

    return data.apis;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export async function getProjectWithHubListing(
  token: string,
  project_id: string
): Promise<ProjectWithHubListing> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/projects/marketplace/${project_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch project with hub listing");
    }

    console.log('[getProjectWithHubListing] Success:', data);
    return data;
  } catch (error) {
    console.error("Error fetching project with hub listing:", error);
    throw error;
  }
}
