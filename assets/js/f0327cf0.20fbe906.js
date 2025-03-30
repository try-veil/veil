"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[4330],{4593:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>d,contentTitle:()=>o,default:()=>u,frontMatter:()=>a,metadata:()=>i,toc:()=>l});const i=JSON.parse('{"id":"api/provider/validate","title":"API Validation Endpoint","description":"Base URL","source":"@site/docs/api/provider/validate.md","sourceDirName":"api/provider","slug":"/api/provider/validate","permalink":"/docs/api/provider/validate","draft":false,"unlisted":false,"editUrl":"https://github.com/try-veil/veil/tree/main/docs/docs/api/provider/validate.md","tags":[],"version":"current","frontMatter":{},"sidebar":"docs","previous":{"title":"API Onboarding Specification","permalink":"/docs/api/provider/onboarding"},"next":{"title":"API Update Specification","permalink":"/docs/api/provider/update"}}');var r=t(3420),s=t(4942);const a={},o="API Validation Endpoint",d={},l=[{value:"Base URL",id:"base-url",level:2},{value:"Request Body",id:"request-body",level:2},{value:"Response",id:"response",level:2},{value:"Success Response (200 OK)",id:"success-response-200-ok",level:3},{value:"Error Response (400 Bad Request)",id:"error-response-400-bad-request",level:3},{value:"Example Validation Scenarios",id:"example-validation-scenarios",level:2},{value:"1. Successful Validation",id:"1-successful-validation",level:3},{value:"2. Failed Validation",id:"2-failed-validation",level:3},{value:"Notes",id:"notes",level:2},{value:"Response Codes",id:"response-codes",level:2},{value:"Authentication",id:"authentication",level:2}];function c(e){const n={code:"code",h1:"h1",h2:"h2",h3:"h3",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,s.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.header,{children:(0,r.jsx)(n.h1,{id:"api-validation-endpoint",children:"API Validation Endpoint"})}),"\n",(0,r.jsx)(n.h2,{id:"base-url",children:"Base URL"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"POST /v1/apis/validate\n"})}),"\n",(0,r.jsx)(n.h2,{id:"request-body",children:"Request Body"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "apiId": "string", // API ID received from onboarding\n  "endpointPath": "string", // Specific endpoint to test (optional)\n  "testParameters": {\n    "path": {\n      // Path parameters if required\n      "paramName": "value"\n    },\n    "query": {\n      // Query parameters if required\n      "paramName": "value"\n    },\n    "body": {\n      // Request body if required\n      "key": "value"\n    },\n    "headers": {\n      // Additional headers if required\n      "headerName": "value"\n    }\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h2,{id:"response",children:"Response"}),"\n",(0,r.jsx)(n.h3,{id:"success-response-200-ok",children:"Success Response (200 OK)"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "status": "success",\n  "validation": {\n    "isValid": true,\n    "testedEndpoints": [\n      {\n        "path": "string",\n        "method": "string",\n        "statusCode": number,\n        "responseTime": number,         // Response time in ms\n        "success": boolean,\n        "response": {                   // Sample response received\n          "body": "object",\n          "headers": "object"\n        }\n      }\n    ],\n    "curlCommands": {\n      "withGateway": "string",         // Curl command using gateway endpoint\n      "direct": "string"               // Curl command using direct endpoint (for testing)\n    }\n  },\n  "gateway": {\n    "endpoint": "string",              // Generated gateway endpoint\n    "sampleApiKey": "string"           // Temporary API key for testing\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h3,{id:"error-response-400-bad-request",children:"Error Response (400 Bad Request)"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "status": "error",\n  "code": "string",\n  "validation": {\n    "isValid": false,\n    "errors": [\n      {\n        "endpoint": "string",\n        "statusCode": number,\n        "error": "string",\n        "details": "string",\n        "troubleshooting": [\n          {\n            "issue": "string",\n            "suggestion": "string"\n          }\n        ]\n      }\n    ],\n    "curlCommands": {\n      "failedRequest": "string",       // Curl command that failed\n      "suggestedFix": "string"         // Curl command with potential fix\n    }\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h2,{id:"example-validation-scenarios",children:"Example Validation Scenarios"}),"\n",(0,r.jsx)(n.h3,{id:"1-successful-validation",children:"1. Successful Validation"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "status": "success",\n  "validation": {\n    "isValid": true,\n    "testedEndpoints": [\n      {\n        "path": "/weather/current",\n        "method": "GET",\n        "statusCode": 200,\n        "responseTime": 234,\n        "success": true,\n        "response": {\n          "body": {\n            "temperature": 22.5,\n            "humidity": 65\n          },\n          "headers": {\n            "content-type": "application/json"\n          }\n        }\n      }\n    ],\n    "curlCommands": {\n      "withGateway": "curl -X GET \'https://api.yourgateway.com/weather/v1/current\' -H \'X-API-Key: temp_key_123\'",\n      "direct": "curl -X GET \'https://api.provider.com/weather/current\' -H \'Authorization: Bearer static_token\'"\n    }\n  },\n  "gateway": {\n    "endpoint": "https://api.yourgateway.com/weather/v1/current",\n    "sampleApiKey": "temp_key_123"\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h3,{id:"2-failed-validation",children:"2. Failed Validation"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "status": "error",\n  "code": "AUTH_FAILED",\n  "validation": {\n    "isValid": false,\n    "errors": [\n      {\n        "endpoint": "/weather/current",\n        "statusCode": 401,\n        "error": "Authentication failed",\n        "details": "The provided static token was rejected by the API provider",\n        "troubleshooting": [\n          {\n            "issue": "Invalid token format",\n            "suggestion": "Ensure the token is provided with the correct prefix (e.g., \'Bearer\')"\n          },\n          {\n            "issue": "Token expired or revoked",\n            "suggestion": "Generate a new static token from your API provider dashboard"\n          }\n        ]\n      }\n    ],\n    "curlCommands": {\n      "failedRequest": "curl -X GET \'https://api.provider.com/weather/current\' -H \'Authorization: Bearer invalid_token\'",\n      "suggestedFix": "curl -X GET \'https://api.provider.com/weather/current\' -H \'Authorization: Bearer your_new_token\'"\n    }\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h2,{id:"notes",children:"Notes"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsx)(n.li,{children:"The validation endpoint performs real API calls to verify integration"}),"\n",(0,r.jsx)(n.li,{children:"A temporary API key is generated for testing the gateway endpoint"}),"\n",(0,r.jsx)(n.li,{children:"Curl commands are provided for both gateway and direct testing"}),"\n",(0,r.jsx)(n.li,{children:"Response includes timing and performance metrics"}),"\n",(0,r.jsx)(n.li,{children:"Detailed troubleshooting suggestions for common errors"}),"\n",(0,r.jsx)(n.li,{children:"The temporary API key expires after 24 hours"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"response-codes",children:"Response Codes"}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Code"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"200"}),(0,r.jsx)(n.td,{children:"Validation successful"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"400"}),(0,r.jsx)(n.td,{children:"Invalid request parameters"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"401"}),(0,r.jsx)(n.td,{children:"Authentication failed"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"429"}),(0,r.jsx)(n.td,{children:"Too many validation requests"})]})]})]}),"\n",(0,r.jsx)(n.h2,{id:"authentication",children:"Authentication"}),"\n",(0,r.jsx)(n.p,{children:"All validation endpoints require the following header:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"Authorization: Bearer <api_token>\n"})}),"\n",(0,r.jsxs)(n.p,{children:["The API token must have the ",(0,r.jsx)(n.code,{children:"validate:api"})," scope."]})]})}function u(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(c,{...e})}):c(e)}},4942:(e,n,t)=>{t.d(n,{R:()=>a,x:()=>o});var i=t(6672);const r={},s=i.createContext(r);function a(e){const n=i.useContext(s);return i.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function o(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:a(e.components),i.createElement(s.Provider,{value:n},e.children)}}}]);