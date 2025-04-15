"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import EndpointViewer from "@/features/consumer/endpoint-viewer";
interface Endpoint {
  method: "GET" | "POST";
  name: string;
  category: string;
}

const endpoints: { category: string; items: Endpoint[] }[] = [
  {
    category: "Personal Data",
    items: [
      {
        method: "GET",
        name: "Get Personal Profile",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Detect Activity Time",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile by Sales Nav URL",
        category: "Personal Data",
      },
      {
        method: "POST",
        name: "Google Full Profiles",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile Latest Post Date",
        category: "Personal Data",
      },
    ],
  },
  {
    category: "Company Data",
    items: [
      {
        method: "GET",
        name: "Get Personal Profile",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Detect Activity Time",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile by Sales Nav URL",
        category: "Personal Data",
      },
      {
        method: "POST",
        name: "Google Full Profiles",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile Latest Post Date",
        category: "Personal Data",
      },
    ],
  },
  {
    category: "Post Data",
    items: [
      {
        method: "GET",
        name: "Get Personal Profile",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Detect Activity Time",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile by Sales Nav URL",
        category: "Personal Data",
      },
      {
        method: "POST",
        name: "Google Full Profiles",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile Latest Post Date",
        category: "Personal Data",
      },
    ],
  },
  {
    category: "Employee Search (Sales Nav)",
    items: [
      {
        method: "GET",
        name: "Get Personal Profile",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Detect Activity Time",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile by Sales Nav URL",
        category: "Personal Data",
      },
      {
        method: "POST",
        name: "Google Full Profiles",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile Latest Post Date",
        category: "Personal Data",
      },
    ],
  },
  {
    category: "Company Search (Sales Nav)",
    items: [
      {
        method: "GET",
        name: "Get Personal Profile",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Detect Activity Time",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile by Sales Nav URL",
        category: "Personal Data",
      },
      {
        method: "POST",
        name: "Google Full Profiles",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile Latest Post Date",
        category: "Personal Data",
      },
    ],
  },
  {
    category: "Job Search",
    items: [
      {
        method: "GET",
        name: "Get Personal Profile",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Detect Activity Time",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile by Sales Nav URL",
        category: "Personal Data",
      },
      {
        method: "POST",
        name: "Google Full Profiles",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile Latest Post Date",
        category: "Personal Data",
      },
    ],
  },
  {
    category: "Other Endpoints",
    items: [
      {
        method: "GET",
        name: "Get Personal Profile",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Detect Activity Time",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile by Sales Nav URL",
        category: "Personal Data",
      },
      {
        method: "POST",
        name: "Google Full Profiles",
        category: "Personal Data",
      },
      {
        method: "GET",
        name: "Get Profile Latest Post Date",
        category: "Personal Data",
      },
    ],
  },
];

export default function PlaygroundPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => {
      // Create initial set with all categories collapsed except Personal Data
      const initialCollapsed = new Set(endpoints.map((e) => e.category));
      initialCollapsed.delete("Personal Data");
      return initialCollapsed;
    }
  );

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
    <div className="flex">
      {/* Left Column - Endpoints List */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-4">
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
      <div className="flex-1 p-4">
        <div>
            <EndpointViewer endpoint={selectedEndpoint}/>
        </div>
      </div>
    </div>
  );
}
