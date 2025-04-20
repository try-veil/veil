"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import EndpointViewer from "@/features/consumer/endpoint-viewer";
import { OnboardAPI, getOnboardAPIById } from "@/app/api/onboard-api/route";

type Endpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  name: string;
  category: string;
  api_id: string;
};

const endpoints: { category: string; items: Endpoint[] }[] = [
  {
    category: "Personal Data",
    items: [
      {
        method: "GET",
        name: "Get Posts",
        category: "Personal Data",
        api_id: "c308770f-68fb-4c28-98b2-03f858b690e2",
      },
    ],
  },
];

export default function PlaygroundPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [apiDetails, setApiDetails] = useState<OnboardAPI | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => {
      // Create initial set with all categories collapsed except Personal Data
      const initialCollapsed = new Set(endpoints.map((e) => e.category));
      initialCollapsed.delete("Personal Data");
      return initialCollapsed;
    }
  );

  useEffect(() => {
    const fetchApiDetails = async () => {
      if (selectedEndpoint) {
        try {
          // TODO: Replace with actual token management
          const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjFyeWJyOGpUTXNNa0tYbzd1MjJ0Qm5XeVc2dyJ9.eyJhdWQiOiIyMTMwMWZkZC02NWJhLTQ2OWUtOTlmMy0xZjZlY2RlY2IzMjUiLCJleHAiOjE3ODExMzQ5MjAsImlhdCI6MTc0NTEzNDkyMCwiaXNzIjoidHJ5dmVpbC5mdXNpb25hdXRoLmlvIiwic3ViIjoiM2VjMjQ3MTgtYzAwOC00NDUwLWFjMmQtZjYyMTJhYTg0MDE1IiwianRpIjoiZjIyNWEwNjQtNmJmMi00NTFiLWE2ZmItYjM2YjdlMDE0YjJjIiwiYXV0aGVudGljYXRpb25UeXBlIjoiUEFTU1dPUkQiLCJhcHBsaWNhdGlvbklkIjoiMjEzMDFmZGQtNjViYS00NjllLTk5ZjMtMWY2ZWNkZWNiMzI1Iiwicm9sZXMiOlsicHJvdmlkZXIiXSwic2lkIjoiMDFkNTk4MjktOTUxNi00OWJmLWFkOWYtYjIwYWJlODQxMmE3IiwiYXV0aF90aW1lIjoxNzQ1MTM0OTIwLCJ0aWQiOiJmZWI4MDE5YS01YmE2LTQwYzQtMzBhZC03NGQ3YzQ3OWZiOTAifQ.hvQnd-At13JKkeOjRr1Cp_w4A9YERwblx2ZFxvIjYLfAs-UwSEm_tKrUn-t5FngHZfL8RhN93qfuxd94OaTvjz6b1A2psDQ1vO2nVgqvx1UrF6US-E6HpKDql7QNsJzJBobyRN29MnyB30j2SbyWDWZzVP1jjHCFx47sHnnZA1MAuJ1Ty2BbfQF3DUJBIN_26pP3JtAR0-toZ039aUzscwbw5xTjCmu5qSQyFwt2kICsPpmGOFQygAvC8KqbRmJShOnXhzWIgqq430tKQeUHvbaB7sc910fb-EKUnkAOXDLewGIxSuS_NKzxX5NLQOYG4qNKI8UGCzx_qCYitIFGiw";
          const details = await getOnboardAPIById(selectedEndpoint.api_id, token);
          setApiDetails(details);
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

  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Filter endpoints based on search query
  const filteredEndpoints = endpoints
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (endpoint) =>
          endpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          endpoint.method.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Left Column - Endpoints List */}
      <div className="w-full lg:w-1/3 border-r border-gray-200 overflow-y-auto p-4 max-h-[50vh] lg:max-h-screen">
        <div className="mb-4">
          <div className="relative">
            <Input
              placeholder="Search Endpoints"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Expand all categories that have matching results
                if (e.target.value) {
                  const newCollapsed = new Set<string>();
                  filteredEndpoints.forEach((category) => {
                    if (category.items.length > 0) {
                      newCollapsed.delete(category.category);
                    }
                  });
                  setCollapsedCategories(newCollapsed);
                }
              }}
              className="h-8 w-full"
            />
          </div>
        </div>

        {filteredEndpoints.map((category) => (
          <div key={category.category} className="mb-4">
            <button
              onClick={() => toggleCategory(category.category)}
              className="flex items-center gap-2 w-full text-sm font-medium mb-2 hover:bg-gray-50 rounded-md p-2"
            >
              <span
                className="transform transition-transform duration-200"
                style={{
                  transform: collapsedCategories.has(category.category)
                    ? "rotate(-90deg)"
                    : "rotate(0deg)",
                }}
              >
                ▼
              </span>
              <span>{category.category}</span>
            </button>
            {!collapsedCategories.has(category.category) && (
              <div className="ml-2 pl-4 border-l-2 border-gray-200">
                {category.items.map((endpoint) => (
                  <div
                    key={endpoint.name}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 ${
                      selectedEndpoint?.name === endpoint.name
                        ? "bg-gray-100"
                        : ""
                    }`}
                    onClick={() => setSelectedEndpoint(endpoint)}
                  >
                    <span
                      className={`text-xs font-medium ${
                        endpoint.method === "GET"
                          ? "text-blue-500"
                          : "text-green-500"
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <span className="text-sm">{endpoint.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right Column - Selected Endpoint Display */}
      <div className="w-full lg:w-2/3 p-4">
        <div>
            <EndpointViewer endpoint={selectedEndpoint} apiDetails={apiDetails} />
        </div>
      </div>
    </div>
  );
}
