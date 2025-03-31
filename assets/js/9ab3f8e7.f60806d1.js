"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[130],{54942:(e,n,i)=>{i.d(n,{R:()=>d,x:()=>a});var r=i(36672);const t={},s=r.createContext(t);function d(e){const n=r.useContext(s);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:d(e.components),r.createElement(s.Provider,{value:n},e.children)}},79169:(e,n,i)=>{i.r(n),i.d(n,{assets:()=>o,contentTitle:()=>a,default:()=>h,frontMatter:()=>d,metadata:()=>r,toc:()=>l});const r=JSON.parse('{"id":"api/provider/onboarding","title":"API Onboarding Specification","description":"Overview","source":"@site/docs/api/provider/onboarding.md","sourceDirName":"api/provider","slug":"/api/provider/onboarding","permalink":"/veil/docs/api/provider/onboarding","draft":false,"unlisted":false,"editUrl":"https://github.com/try-veil/veil/tree/main/docs/docs/api/provider/onboarding.md","tags":[],"version":"current","frontMatter":{},"sidebar":"docs","previous":{"title":"Veil - Documentation","permalink":"/veil/docs/intro"},"next":{"title":"API Validation Endpoint","permalink":"/veil/docs/api/provider/validate"}}');var t=i(23420),s=i(54942);const d={},a="API Onboarding Specification",o={},l=[{value:"Overview",id:"overview",level:2},{value:"Base URL",id:"base-url",level:2},{value:"Request Body",id:"request-body",level:2},{value:"Required Fields",id:"required-fields",level:2},{value:"Notes",id:"notes",level:2},{value:"Prerequisites",id:"prerequisites",level:2},{value:"Endpoint Versions",id:"endpoint-versions",level:2}];function c(e){const n={code:"code",h1:"h1",h2:"h2",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,s.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.header,{children:(0,t.jsx)(n.h1,{id:"api-onboarding-specification",children:"API Onboarding Specification"})}),"\n",(0,t.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,t.jsx)(n.p,{children:"The API onboarding endpoint allows providers to register their APIs with the marketplace platform."}),"\n",(0,t.jsx)(n.h2,{id:"base-url",children:"Base URL"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{children:"POST /v1/apis/onboard\n"})}),"\n",(0,t.jsx)(n.h2,{id:"request-body",children:"Request Body"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-json",children:'{\n  "api": {\n    "name": "string",                    // Name of the API\n    "version": "string",                 // API version (e.g., "1.0.0")\n    "description": "string",             // Detailed description of the API\n    "baseUrl": "string",                 // Base URL of the API\n    "category": "string",                // Category (e.g., "Weather", "Finance")\n    "headers": [                         // Provider-specific headers\n      {\n        "name": "string",                // Header name\n        "value": "string"                // Header value\n      }\n    ],\n    "auth": {\n      "staticToken": "string",           // Provider\'s static access token\n      "tokenLocation": "string",         // Where to send token: "header" or "query"\n      "tokenName": "string"              // Name of header/query parameter for token\n    },\n    "endpoints": [\n      {\n        "path": "string",                // Endpoint path (e.g., "/weather/current")\n        "method": "string",              // HTTP method (GET, POST, etc.)\n        "name": "string",                // Friendly name for the endpoint\n        "description": "string",         // Endpoint description\n        "parameters": [\n          {\n            "name": "string",            // Parameter name\n            "type": "string",            // Parameter type\n            "required": boolean,         // Is parameter required?\n            "location": "string",        // Where parameter appears: "query", "path", "body"\n            "description": "string"      // Parameter description\n          }\n        ]\n      }\n    ]\n  },\n  "owner": {\n    "name": "string",                    // API owner/company name\n    "email": "string",                   // Contact email\n    "website": "string"                  // Company website\n  }\n}\n'})}),"\n",(0,t.jsx)(n.h2,{id:"required-fields",children:"Required Fields"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"api.name"}),"\n",(0,t.jsx)(n.li,{children:"api.version"}),"\n",(0,t.jsx)(n.li,{children:"api.baseUrl"}),"\n",(0,t.jsx)(n.li,{children:"api.auth.staticToken"}),"\n",(0,t.jsx)(n.li,{children:"api.auth.tokenLocation"}),"\n",(0,t.jsx)(n.li,{children:"api.auth.tokenName"}),"\n",(0,t.jsx)(n.li,{children:"api.endpoints (at least one endpoint)"}),"\n",(0,t.jsx)(n.li,{children:"owner.name"}),"\n",(0,t.jsx)(n.li,{children:"owner.email"}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"notes",children:"Notes"}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsx)(n.li,{children:"All URLs must be valid HTTPS URLs"}),"\n",(0,t.jsx)(n.li,{children:"API version should follow semantic versioning"}),"\n",(0,t.jsx)(n.li,{children:"Rate limits are optional but recommended"}),"\n",(0,t.jsx)(n.li,{children:"The static token provided will be encrypted at rest"}),"\n",(0,t.jsx)(n.li,{children:"The gateway will generate unique API keys for each client"}),"\n",(0,t.jsx)(n.li,{children:"Provider's static token will never be exposed to clients"}),"\n",(0,t.jsx)(n.li,{children:"Gateway will handle all client-side authentication"}),"\n",(0,t.jsx)(n.li,{children:"Provider-specific headers will be passed through to the upstream service"}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"prerequisites",children:"Prerequisites"}),"\n",(0,t.jsx)(n.p,{children:"Before onboarding an API, ensure:"}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsx)(n.li,{children:"API is publicly accessible via HTTPS"}),"\n",(0,t.jsx)(n.li,{children:"OpenAPI/Swagger specification is available"}),"\n",(0,t.jsx)(n.li,{children:"Authentication mechanism is supported"}),"\n",(0,t.jsx)(n.li,{children:"Rate limiting configuration is defined"}),"\n",(0,t.jsx)(n.li,{children:"Required headers are documented"}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"endpoint-versions",children:"Endpoint Versions"}),"\n",(0,t.jsxs)(n.table,{children:[(0,t.jsx)(n.thead,{children:(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.th,{children:"Version"}),(0,t.jsx)(n.th,{children:"Status"}),(0,t.jsx)(n.th,{children:"Changes"})]})}),(0,t.jsxs)(n.tbody,{children:[(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"v1"}),(0,t.jsx)(n.td,{children:"Active"}),(0,t.jsx)(n.td,{children:"Initial release"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"v2-beta"}),(0,t.jsx)(n.td,{children:"Beta"}),(0,t.jsx)(n.td,{children:"Added OpenAPI 3.0 support"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:"v1.1"}),(0,t.jsx)(n.td,{children:"Active"}),(0,t.jsx)(n.td,{children:"Added rate limiting configuration"})]})]})]})]})}function h(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(c,{...e})}):c(e)}}}]);