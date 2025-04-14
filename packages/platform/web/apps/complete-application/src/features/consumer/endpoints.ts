export const dummyEndpoint = {
  url: 'https://fresh-linkedin-profile-data.p.rapidapi.com/get-post-details',
  method: 'GET',
  params: [
    { name: 'urn', type: 'string', required: true, value: '731577981646765670Kjk5' },
    { name: 'page', type: 'number', required: false },
    { name: 'limit', type: 'number', required: false },
    { name: 'sort', type: 'string', required: false },
  ],
  headers: [
    { name: 'x-rapidapi-host', value: 'fresh-linkedin-profile-data.p.rapidapi.com' },
    { name: 'x-rapidapi-key', value: '5c7f9cdbccmsh12257f228132795p15ab43jsn45a7b3afcf50' },
  ],
  auth: {
    type: 'api_key',
    apiKey: {
      key: 'x-rapidapi-key',
      value: '5c7f9cdbccmsh12257f228132795p15ab43jsn45a7b3afcf50',
      in: 'header'
    },
    oauth2: {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
          tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
          refreshUrl: 'https://www.linkedin.com/oauth/v2/refresh',
          scopes: {
            'r_liteprofile': 'Read lite profile',
            'r_emailaddress': 'Read email address',
            'w_member_social': 'Write member social',
          }
        }
      }
    },
    bearerToken: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  },
  codeSnippets: {
    shell: {
      name: 'Shell',
      language: 'bash',
      code: `curl --request GET \\
  --url 'https://fresh-linkedin-profile-data.p.rapidapi.com/get-post-details?urn=731577981646765670Kjk5' \\
  --header 'x-rapidapi-host: fresh-linkedin-profile-data.p.rapidapi.com' \\
  --header 'x-rapidapi-key: 5c7f9cdbccmsh12257f228132795p15ab43jsn45a7b3afcf50'`
    },
    node: {
      name: 'Node.js',
      language: 'javascript',
      code: `const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-host': 'fresh-linkedin-profile-data.p.rapidapi.com',
    'x-rapidapi-key': '5c7f9cdbccmsh12257f228132795p15ab43jsn45a7b3afcf50'
  }
};

fetch('https://fresh-linkedin-profile-data.p.rapidapi.com/get-post-details?urn=731577981646765670Kjk5', options)
  .then(response => response.json())
  .then(response => console.log(response))
  .catch(err => console.error(err));`
    },
    python: {
      name: 'Python',
      language: 'python',
      code: `import requests

url = "https://fresh-linkedin-profile-data.p.rapidapi.com/get-post-details"

querystring = {"urn":"731577981646765670Kjk5"}

headers = {
    "x-rapidapi-host": "fresh-linkedin-profile-data.p.rapidapi.com",
    "x-rapidapi-key": "5c7f9cdbccmsh12257f228132795p15ab43jsn45a7b3afcf50"
}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())`
    }
  },
  body: null,
  exampleResponses: {
    '200': {
      status: 200,
      description: 'Successful response',
      mediaType: 'application/json',
      data: {
        images: [],
        num_appreciations: 47,
        num_comments: 310,
        num_empathy: 405,
        num_entertainments: 3,
        num_interests: 26,
        num_likes: 6813,
        num_praises: 357,
        num_reactions: 7651,
        num_reposts: 97,
        post_url: "https://www.linkedin.com/feed/update/urn:li:activity:731577981646765670/",
        posted: "2025-04-09 16:57:09"
      }
    },
    '400': {
      status: 400,
      description: 'Bad Request',
      mediaType: 'application/json',
      data: {
        message: "Invalid request parameters",
        errors: [
          {
            field: "urn",
            message: "urn parameter is required"
          }
        ]
      }
    },
    '401': {
      status: 401,
      description: 'Unauthorized',
      mediaType: 'application/json',
      data: {
        message: "Invalid API key or unauthorized access"
      }
    },
    '403': {
      status: 403,
      description: 'Forbidden',
      mediaType: 'application/json',
      data: {
        message: "Access to the requested resource is forbidden"
      }
    },
    '404': {
      status: 404,
      description: 'Not Found',
      mediaType: 'application/json',
      data: {
        message: "LinkedIn post not found"
      }
    },
    '429': {
      status: 429,
      description: 'Too Many Requests',
      mediaType: 'application/json',
      data: {
        message: "Rate limit exceeded",
        retry_after: 60
      }
    },
    '500': {
      status: 500,
      description: 'Internal Server Error',
      mediaType: 'application/json',
      data: {
        message: "An unexpected error occurred"
      }
    }
  },
  results: {
    status: 200,
    data: {
      images: [],
      num_appreciations: 47,
      num_comments: 310,
      num_empathy: 405,
      num_entertainments: 3,
      num_interests: 26,
      num_likes: 6813,
      num_praises: 357,
      num_reactions: 7651,
      num_reposts: 97,
      post_url: "https://www.linkedin.com/feed/update/urn:li:activity:731577981646765670/",
      posted: "2025-04-09 16:57:09"
    },
    headers: {
      'content-type': 'application/json',
      'x-rapidapi-request-id': 'abc123'
    }
  }
} 