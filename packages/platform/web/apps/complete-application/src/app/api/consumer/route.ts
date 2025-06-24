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
