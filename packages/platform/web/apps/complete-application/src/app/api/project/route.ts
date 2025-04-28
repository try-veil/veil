import { getOnboardAPIById } from "../onboard-api/route";

export interface Project {
  id?: string;
  name: string;
  thumbnail?: string;
  description?: string;
  favorite?: boolean;
  target_url?: string;
  enableLimitsToAPIs?: boolean;
  tenantId?: string;
  projectAllowedAPIs?: ProjectAllowedAPI[];
  apis?: API[];
  createdAt?: string;
  updatedAt?: string;
  hubListing: HubListing;
}

export interface HubListing {
  id: string;
  logo?: string;
  category?: string;
  shortDescription?: string;
  longDescription?: string;
  website?: string;
  termsOfUse?: string;
  visibleToPublic?: boolean;
  healthCheckUrl?: string;
  apiDocumentation?: string;
  proxySecret?: string;
  requestSizeLimitMb?: number;
  proxyTimeoutSeconds?: number;
  basicPlanId?: string;
  proPlanId?: string;
  ultraPlanId?: string;
  projectId?: number;
}


export interface ProjectAllowedAPI {
  apiId: string;
  apiVersionId: string;
  status: string;
  apiModel: {
    name: string;
  };
}

export interface API {
  apiId: string;
  apiVersionId: string;
  name: string;
  method: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export async function getAllProjectsByUserId(
  token: string
): Promise<Project[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch projects");
    }

    return data;
  } catch (error) {
    console.error("[getProjectsByUserId] Error:", error);
    throw error;
  }
}

export async function getProjectById(
  id: string | number,
  token: string
): Promise<Project> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch project details");
    }
    // Iterate over each API in the project to fetch API method and add it to the API object
    if (data.apis && Array.isArray(data.apis)) {
      for (const api of data.apis) {
        try {
          // Fetch API details (including method)
          const apiDetails = await getOnboardAPIById(api.apiId, token);
          console.log("Fetched API Details:", apiDetails); // Log API details

          // Check if method exists in the API details and assign it
          if (apiDetails && apiDetails.method) {
            api.method = apiDetails.method; // Add method to the API object
            console.log("API Method Updated:", api.method); // Log updated method
          } else {
            console.log(
              "No method found in API details for API ID:",
              api.apiId
            );
          }
        } catch (error) {
          console.error(
            `Error fetching details for API ID ${api.apiId}:`,
            error
          );
        }
      }
    }

    console.log("DAta:::::", data);

    return data;
  } catch (error) {
    console.error("[getProjectById] Error:", error);
    throw error;
  }
}

export async function createProject(
  data: Project,
  token: string
): Promise<Project> {
  if (!token) {
    throw new Error("Access token is missing");
  }
  try {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.error || "Failed to create project");
    }

    return resData;
  } catch (error) {
    console.error("[createProject] Error:", error);
    throw error;
  }
}

export async function updateProject(
  token: string,
  projectId: number,
  data: Partial<Omit<Project, "id" | "user_id" | "created_at" | "updated_at" | "hubListing">> & Partial<HubListing>
): Promise<Project> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/projects/${projectId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update project");
  }

  const resData = await response.json();

  return resData;
}
