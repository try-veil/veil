
// Function to get the color class for the HTTP method
export const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "text-blue-500";
      case "POST":
        return "text-green-500";
      case "PUT":
        return "text-yellow-500";
      case "DELETE":
        return "text-red-500";
      case "PATCH":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };