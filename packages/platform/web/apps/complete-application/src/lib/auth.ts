/**
 * Function to refresh the access token using the refresh token
 * @param refreshToken The refresh token to use for getting a new access token
 * @returns An object containing the new access token and refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    const fusionAuthUrl = process.env.NEXT_PUBLIC_FUSIONAUTH_URL!;
    const tenantId = process.env.FUSIONAUTH_TENANT_ID!;

    const response = await fetch(`${fusionAuthUrl}/api/jwt/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FusionAuth-TenantId": tenantId
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    
    return {
      accessToken: data.token,
      refreshToken: data.refreshToken || refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

/**
 * Create an authenticated fetch function that handles token refresh
 * @param accessToken Current access token
 * @param refreshToken Current refresh token
 * @param tokenUpdater Function to update tokens if they change
 */
export function createAuthFetch(
  accessToken: string,
  refreshToken: string,
  tokenUpdater: (newAccessToken: string, newRefreshToken: string) => void
) {
  return async (url: string, options: RequestInit = {}) => {
    // Add the access token to the request
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    };

    // Make the request
    let response = await fetch(url, { ...options, headers });

    // If we get a 401 Unauthorized, try to refresh the token
    if (response.status === 401 && refreshToken) {
      try {
        const newTokens = await refreshAccessToken(refreshToken);
        
        // Update the tokens in the context/localStorage
        tokenUpdater(newTokens.accessToken, newTokens.refreshToken);
        
        // Retry the request with the new token
        const newHeaders = {
          ...options.headers,
          Authorization: `Bearer ${newTokens.accessToken}`,
        };
        
        response = await fetch(url, { ...options, headers: newHeaders });
      } catch (error) {
        console.error('Error refreshing token during fetch:', error);
        // If refresh fails, we still return the original 401 response
      }
    }

    return response;
  };
} 