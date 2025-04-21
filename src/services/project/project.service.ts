// Add an API to the project's allowed list
const allowedApi = await this.prisma.projectAllowedAPI.create({
  data: {
    projectId: projectId, // Use direct foreign key
    apiId: apiId,
    apiVersionId: apiVersionId,
    status: "ACTIVE", // Or use the status variable if it exists
    api: api, // Assuming 'api' holds the JSON data
  },
});
