export function customCors(allowedOrigins: string[]) {
  return (app: any) => {
    return app
      .onRequest(({ request, set }: { request: Request; set: any }) => {
        const origin = request.headers.get('origin');

        if (origin && allowedOrigins.includes(origin)) {
          set.headers['Access-Control-Allow-Origin'] = origin;
        }

        set.headers['Access-Control-Allow-Credentials'] = 'true';
        set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
        set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
        set.headers['Access-Control-Max-Age'] = '86400';

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
          set.status = 204;
          return '';
        }
      });
  };
}