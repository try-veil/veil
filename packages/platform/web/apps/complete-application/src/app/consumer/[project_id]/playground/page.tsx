"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import EndpointViewer from "@/features/consumer/endpoint-viewer";
import { OnboardAPI, getOnboardAPIById } from "@/app/api/onboard-api/route";
import { getAllProjectAPIs } from "@/app/api/consumer/route";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/context/project-context";
import { getMethodColor } from "@/utils/getMethodColor";

type Endpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  name: string;
  apiId: string;
  version: string;
  path: string;
};

export default function PlaygroundPage() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [apiDetails, setApiDetails] = useState<OnboardAPI | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { accessToken } = useAuth();
  const { selectedProject, isLoading: projectLoading } = useProject();

  const fetchAPIs = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      const token = accessToken;
      if (!token) throw new Error("No authentication token found");
      if (!selectedProject?.id) throw new Error("No project selected");
  
      const projectsData = await getAllProjectAPIs(token, selectedProject.id.toString());
  
      const enrichedEndpoints: Endpoint[] = await Promise.all(
        projectsData.map(async (item: any) => {
          try {
            const details = await getOnboardAPIById(item.apiId, token);
            return {
              apiId: item.apiId,
              name: details.name ?? item.apiId, // fallback if name missing
              method: details.method ?? "GET",  // fallback method
              version: details.version ?? "v1",
              path:item.apiId
            };
          } catch (e) {
            console.error(`Failed to fetch details for ${item.apiId}`, e);
            return {
              apiId: item.apiId,
              name: item.apiId,
              method: "GET", // fallback on error
              version: "v1",
              path:item.apiId
            };
          }
        })
      );
  
      setEndpoints(enrichedEndpoints);

      console.log("Enriched Endpoints:",enrichedEndpoints)
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch projects");
    } finally {
      setIsLoading(false);
    }
  };
  

  useEffect(() => {
    if (accessToken && selectedProject?.id && !projectLoading) {
      console.log("Fetching APIs for project:", selectedProject.id);
      fetchAPIs();
    }
  }, [accessToken, selectedProject?.id, projectLoading]);

  useEffect(() => {
    const fetchApiDetails = async () => {
      if (selectedEndpoint) {
        try {
          const token = accessToken;
          if (!token) throw new Error("No authentication token found");
          const details = await getOnboardAPIById(selectedEndpoint.apiId, token);

          console.log(details);

          setApiDetails(details);

          console.log("***********",selectedEndpoint);
        } catch (error) {
          console.error("Failed to fetch API details:", error);
          setApiDetails(null);
        }
      } else {
        setApiDetails(null);
      }
    };

    fetchApiDetails();
  }, [selectedEndpoint]);

  const filteredEndpoints = endpoints.filter(
    (endpoint) =>
      endpoint.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.method?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading state while project is loading or APIs are being fetched
  if (projectLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading endpoints...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading endpoints</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Left Column - Endpoints List */}
      <div className="w-full lg:w-1/4 border-r border-gray-200 dark:border-muted overflow-y-auto p-4 max-h-[50vh] lg:max-h-screen">
        <Input
          placeholder="Search Endpoints"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 w-full mb-4"
        />

        {filteredEndpoints.map((endpoint) => (
          <div
            key={endpoint.apiId}
            className={`flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-muted ${
              selectedEndpoint?.apiId === endpoint.apiId ? "bg-gray-100 dark:bg-muted" : ""
            }`}
            onClick={() => setSelectedEndpoint(endpoint)}
          >
            <span
              className={`text-xs font-medium ${getMethodColor(endpoint.method)}`}
            >
              {endpoint.method}
            </span>
            <span className="text-sm leading-[1.05rem]">{endpoint.name ?? "Endpoint"}</span>
          </div>
        ))}
      </div>

      {/* Right Column - Selected Endpoint Display */}
      <div className="w-full lg:w-3/4 p-4">
        <EndpointViewer 
          endpoint={selectedEndpoint} 
          apiDetails={apiDetails} 
        />
      </div>
    </div>
  );
}
