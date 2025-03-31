

export class MockFusionAuthClient {
  constructor(apiKey: string, url: string) {
    console.log(`Mock FusionAuth client created with API Key: ${apiKey.substring(0, 3)}... and URL: ${url}`);
  }

  register(userId: string, request: any) {
    console.log(`Mock register called for user: ${request?.user?.email}`);
    return {
      wasSuccessful: () => true,
      statusCode: 200,
      response: {
        user: {
          id: '12345',
          email: request?.user?.email,
          firstName: request?.user?.firstName,
          lastName: request?.user?.lastName,
        },
        token: 'mock-fusion-auth-token',
      },
    };
  }

  login(request: any) {
    console.log(`Mock login called for user: ${request?.loginId}`);
    return {
      wasSuccessful: () => true,
      statusCode: 200,
      response: {
        user: {
          id: '12345',
          email: request?.loginId,
          firstName: 'Test',
          lastName: 'User',
        },
        token: 'mock-fusion-auth-token',
      },
    };
  }

  validateJWT(token: string) {
    console.log(`Mock validateJWT called with token: ${token.substring(0, 10)}...`);
    return {
      statusCode: 200,
      response: {
        jwt: {
          sub: '12345',
          email: 'test@example.com',
          given_name: 'Test',
          family_name: 'User',
        },
      },
    };
  }
}