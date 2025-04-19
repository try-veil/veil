"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[247],{54942:(e,n,s)=>{s.d(n,{R:()=>a,x:()=>o});var r=s(36672);const i={},t=r.createContext(i);function a(e){const n=r.useContext(t);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function o(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:a(e.components),r.createElement(t.Provider,{value:n},e.children)}},77512:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>c,contentTitle:()=>o,default:()=>u,frontMatter:()=>a,metadata:()=>r,toc:()=>l});const r=JSON.parse('{"id":"api/user/register","title":"User Registration Specification","description":"Overview","source":"@site/docs/api/user/register.md","sourceDirName":"api/user","slug":"/api/user/register","permalink":"/docs/api/user/register","draft":false,"unlisted":false,"editUrl":"https://github.com/try-veil/veil/tree/main/docs/docs/api/user/register.md","tags":[],"version":"current","frontMatter":{},"sidebar":"docs","previous":{"title":"API Deletion Specification","permalink":"/docs/api/provider/delete"},"next":{"title":"API Key Management Specification","permalink":"/docs/api/user/api-keys"}}');var i=s(23420),t=s(54942);const a={},o="User Registration Specification",c={},l=[{value:"Overview",id:"overview",level:2},{value:"Base URL",id:"base-url",level:2},{value:"Request Body",id:"request-body",level:2},{value:"Response",id:"response",level:2},{value:"Success Response (201 Created)",id:"success-response-201-created",level:3},{value:"Error Response (400 Bad Request)",id:"error-response-400-bad-request",level:3},{value:"Notes",id:"notes",level:2}];function d(e){const n={code:"code",h1:"h1",h2:"h2",h3:"h3",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",...(0,t.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.header,{children:(0,i.jsx)(n.h1,{id:"user-registration-specification",children:"User Registration Specification"})}),"\n",(0,i.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,i.jsx)(n.p,{children:"The user registration endpoint allows API consumers to create accounts in the marketplace."}),"\n",(0,i.jsx)(n.h2,{id:"base-url",children:"Base URL"}),"\n",(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{children:"POST /v1/users/register\n"})}),"\n",(0,i.jsx)(n.h2,{id:"request-body",children:"Request Body"}),"\n",(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-json",children:'{\n  "user": {\n    "email": "string",           // User\'s email address\n    "name": "string",            // Full name\n    "company": {\n      "name": "string",          // Company name\n      "website": "string",       // Company website (optional)\n      "size": "string"           // Company size category (optional)\n    },\n    "usage": {\n      "purpose": "string",       // Intended API usage purpose\n      "estimatedRequests": number // Estimated monthly requests\n    },\n    "preferences": {\n      "newsletter": boolean,     // Opt-in for newsletter\n      "notifications": {\n        "email": boolean,        // Email notifications\n        "webhook": boolean       // Webhook notifications\n      }\n    }\n  },\n  "security": {\n    "password": "string",        // User password (min 8 chars)\n    "mfaEnabled": boolean       // Enable 2FA during registration\n  }\n}\n'})}),"\n",(0,i.jsx)(n.h2,{id:"response",children:"Response"}),"\n",(0,i.jsx)(n.h3,{id:"success-response-201-created",children:"Success Response (201 Created)"}),"\n",(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-json",children:'{\n  "status": "success",\n  "message": "User successfully registered",\n  "user": {\n    "id": "string",\n    "email": "string",\n    "name": "string",\n    "registrationDate": "string", // ISO 8601 datetime\n    "verificationStatus": {\n      "email": "pending",\n      "company": "pending"\n    }\n  },\n  "nextSteps": {\n    "emailVerification": {\n      "required": true,\n      "expiresIn": "24h"\n    },\n    "mfaSetup": {\n      "required": boolean,\n      "setupUrl": "string"\n    }\n  }\n}\n'})}),"\n",(0,i.jsx)(n.h3,{id:"error-response-400-bad-request",children:"Error Response (400 Bad Request)"}),"\n",(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-json",children:'{\n  "status": "error",\n  "code": "VALIDATION_ERROR",\n  "message": "Invalid registration data",\n  "details": [\n    {\n      "field": "string",\n      "message": "string"\n    }\n  ]\n}\n'})}),"\n",(0,i.jsx)(n.h2,{id:"notes",children:"Notes"}),"\n",(0,i.jsxs)(n.ol,{children:["\n",(0,i.jsx)(n.li,{children:"Email verification is required before API access is granted"}),"\n",(0,i.jsx)(n.li,{children:"Password must meet security requirements (8+ chars, mixed case, numbers)"}),"\n",(0,i.jsx)(n.li,{children:"Company verification may be required for certain usage levels"}),"\n",(0,i.jsx)(n.li,{children:"MFA setup must be completed if enabled during registration"}),"\n",(0,i.jsx)(n.li,{children:"Initial rate limits are based on estimated usage"}),"\n",(0,i.jsx)(n.li,{children:"Welcome email is sent after successful registration"}),"\n"]})]})}function u(e={}){const{wrapper:n}={...(0,t.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(d,{...e})}):d(e)}}}]);