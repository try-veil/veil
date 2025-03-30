"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[6119],{4942:(e,n,i)=>{i.d(n,{R:()=>o,x:()=>a});var s=i(6672);const t={},r=s.createContext(t);function o(e){const n=s.useContext(r);return s.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:o(e.components),s.createElement(r.Provider,{value:n},e.children)}},6336:(e,n,i)=>{i.r(n),i.d(n,{assets:()=>d,contentTitle:()=>a,default:()=>p,frontMatter:()=>o,metadata:()=>s,toc:()=>l});const s=JSON.parse('{"id":"api/provider/update","title":"API Update Specification","description":"Overview","source":"@site/docs/api/provider/update.md","sourceDirName":"api/provider","slug":"/api/provider/update","permalink":"/veil/docs/api/provider/update","draft":false,"unlisted":false,"editUrl":"https://github.com/try-veil/veil/tree/main/docs/docs/api/provider/update.md","tags":[],"version":"current","frontMatter":{},"sidebar":"docs","previous":{"title":"API Validation Endpoint","permalink":"/veil/docs/api/provider/validate"},"next":{"title":"API Deletion Specification","permalink":"/veil/docs/api/provider/delete"}}');var t=i(3420),r=i(4942);const o={},a="API Update Specification",d={},l=[{value:"Overview",id:"overview",level:2},{value:"Base URL",id:"base-url",level:2},{value:"Request Body",id:"request-body",level:2},{value:"Response",id:"response",level:2},{value:"Success Response (200 OK)",id:"success-response-200-ok",level:3},{value:"Error Response (400 Bad Request)",id:"error-response-400-bad-request",level:3},{value:"Notes",id:"notes",level:2},{value:"Version Control",id:"version-control",level:2}];function c(e){const n={code:"code",h1:"h1",h2:"h2",h3:"h3",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",ul:"ul",...(0,r.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.header,{children:(0,t.jsx)(n.h1,{id:"api-update-specification",children:"API Update Specification"})}),"\n",(0,t.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,t.jsx)(n.p,{children:"The API update endpoint allows providers to modify existing API configurations in the marketplace."}),"\n",(0,t.jsx)(n.h2,{id:"base-url",children:"Base URL"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{children:"PUT /v1/apis/{apiId}\n"})}),"\n",(0,t.jsx)(n.h2,{id:"request-body",children:"Request Body"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-json",children:'{\n  "api": {\n    "name": "string",                    // Updated API name (optional)\n    "version": "string",                 // Updated API version (optional)\n    "description": "string",             // Updated description (optional)\n    "baseUrl": "string",                 // Updated base URL (optional)\n    "category": "string",                // Updated category (optional)\n    "auth": {\n      "staticToken": "string",           // New static token (optional)\n      "tokenLocation": "string",         // Updated token location (optional)\n      "tokenName": "string"              // Updated token name (optional)\n    },\n    "endpoints": [                       // Updated endpoints list (optional)\n      {\n        "path": "string",\n        "method": "string",\n        "name": "string",\n        "description": "string",\n        "parameters": [\n          {\n            "name": "string",\n            "type": "string",\n            "required": boolean,\n            "location": "string",\n            "description": "string"\n          }\n        ],\n        "responses": {\n          "200": {\n            "description": "string",\n            "schema": "object"\n          }\n        },\n        "rateLimit": {\n          "requests": number,\n          "period": "string"\n        }\n      }\n    ],\n    "pricing": {                         // Updated pricing (optional)\n      "type": "string",\n      "plans": [\n        {\n          "name": "string",\n          "price": number,\n          "period": "string",\n          "features": ["string"]\n        }\n      ]\n    }\n  }\n}\n'})}),"\n",(0,t.jsx)(n.h2,{id:"response",children:"Response"}),"\n",(0,t.jsx)(n.h3,{id:"success-response-200-ok",children:"Success Response (200 OK)"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-json",children:'{\n  "apiId": "string",\n  "status": "success",\n  "message": "API successfully updated",\n  "updateDate": "string", // ISO 8601 datetime\n  "changes": {\n    // Summary of changes\n    "modified": ["name", "version"], // Fields that were modified\n    "added": ["newEndpoint"], // New items added\n    "removed": ["oldEndpoint"] // Items removed\n  },\n  "gatewayConfig": {\n    // Updated gateway configuration\n    "endpoints": [\n      {\n        "path": "string",\n        "method": "string",\n        "gatewayUrl": "string"\n      }\n    ]\n  }\n}\n'})}),"\n",(0,t.jsx)(n.h3,{id:"error-response-400-bad-request",children:"Error Response (400 Bad Request)"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-json",children:'{\n  "status": "error",\n  "code": "string",\n  "message": "string",\n  "details": [\n    {\n      "field": "string",\n      "message": "string"\n    }\n  ]\n}\n'})}),"\n",(0,t.jsx)(n.h2,{id:"notes",children:"Notes"}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsx)(n.li,{children:"Only include fields that need to be updated"}),"\n",(0,t.jsx)(n.li,{children:"Endpoint updates are merged with existing endpoints"}),"\n",(0,t.jsx)(n.li,{children:"Removed endpoints must be explicitly marked for deletion"}),"\n",(0,t.jsx)(n.li,{children:"Version updates trigger a validation check"}),"\n",(0,t.jsx)(n.li,{children:"Gateway routes are automatically updated"}),"\n",(0,t.jsx)(n.li,{children:"Active subscriptions are notified of changes"}),"\n",(0,t.jsx)(n.li,{children:"Update history is maintained for auditing"}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"version-control",children:"Version Control"}),"\n",(0,t.jsx)(n.p,{children:"Updates to APIs are versioned using semantic versioning:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Major version changes require re-validation"}),"\n",(0,t.jsx)(n.li,{children:"Minor version changes are backward compatible"}),"\n",(0,t.jsx)(n.li,{children:"Patch versions for bug fixes only"}),"\n"]})]})}function p(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(c,{...e})}):c(e)}}}]);