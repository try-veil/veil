import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "swagger/veil-api-management",
    },
    {
      type: "category",
      label: "API Management",
      items: [
        {
          type: "doc",
          id: "swagger/onboard-a-new-api",
          label: "Onboard a new API",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "swagger/add-new-api-keys",
          label: "Add new API keys",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "swagger/update-api-key-status",
          label: "Update API key status",
          className: "api-method put",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
