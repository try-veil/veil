"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[3362],{2749:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>t,contentTitle:()=>d,default:()=>h,frontMatter:()=>l,metadata:()=>i,toc:()=>c});const i=JSON.parse('{"id":"api/readme","title":"API Documentation","description":"Overview","source":"@site/docs/api/readme.md","sourceDirName":"api","slug":"/api/","permalink":"/docs/api/","draft":false,"unlisted":false,"editUrl":"https://github.com/try-veil/veil/tree/main/docs/docs/api/readme.md","tags":[],"version":"current","frontMatter":{}}');var r=s(3420),a=s(4942);const l={},d="API Documentation",t={},c=[{value:"Overview",id:"overview",level:2},{value:"Available APIs",id:"available-apis",level:2},{value:"Provider APIs",id:"provider-apis",level:3},{value:"Consumer APIs",id:"consumer-apis",level:3},{value:"Analytics APIs",id:"analytics-apis",level:3},{value:"Billing APIs",id:"billing-apis",level:3},{value:"Common Patterns",id:"common-patterns",level:2},{value:"Standard Error Response",id:"standard-error-response",level:3},{value:"API Versioning",id:"api-versioning",level:2},{value:"Related Resources",id:"related-resources",level:2},{value:"Error Codes",id:"error-codes",level:2},{value:"SDK Examples",id:"sdk-examples",level:2}];function o(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",header:"header",li:"li",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,a.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.header,{children:(0,r.jsx)(n.h1,{id:"api-documentation",children:"API Documentation"})}),"\n",(0,r.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,r.jsx)(n.p,{children:"The API Marketplace exposes several REST APIs for managing APIs, users, and analytics."}),"\n",(0,r.jsx)(n.h2,{id:"available-apis",children:"Available APIs"}),"\n",(0,r.jsx)(n.h3,{id:"provider-apis",children:"Provider APIs"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/provider/onboarding",children:"API Onboarding"})," - Register and configure new APIs"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/provider/validate",children:"API Validation"})," - Test and validate API configurations"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/provider/update",children:"API Updates"})," - Modify existing API configurations"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/provider/delete",children:"API Deletion"})," - Remove APIs from the marketplace"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"consumer-apis",children:"Consumer APIs"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/consumer/register",children:"User Registration"})," - Register new API consumers"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/consumer/api-keys",children:"API Key Management"})," - Generate and manage API keys"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/consumer/subscriptions",children:"Subscription Management"})," - Manage API subscriptions"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"analytics-apis",children:"Analytics APIs"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/analytics/usage",children:"Usage Analytics"})," - Query API usage metrics"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/analytics/rate-limits",children:"Rate Limits"})," - View and configure rate limits"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"billing-apis",children:"Billing APIs"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/billing/reports",children:"Billing Reports"})," - Access billing information"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/billing/invoices",children:"Invoices"})," - Manage and download invoices"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/billing/payment-methods",children:"Payment Methods"})," - Manage payment options"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"/docs/api/billing/charges",children:"Usage Charges"})," - View detailed usage charges"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"common-patterns",children:"Common Patterns"}),"\n",(0,r.jsx)(n.p,{children:"All APIs follow these common patterns:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Base URL: ",(0,r.jsx)(n.code,{children:"https://api.marketplace.com/v1"})]}),"\n",(0,r.jsx)(n.li,{children:"Authentication: Bearer token in Authorization header"}),"\n",(0,r.jsx)(n.li,{children:"Rate Limiting: Documented per endpoint"}),"\n",(0,r.jsx)(n.li,{children:"Error Responses: Consistent error format"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"standard-error-response",children:"Standard Error Response"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "status": "success|error",\n  "code": "string",\n  "message": "string",\n  "data|errors": {}\n}\n'})}),"\n",(0,r.jsx)(n.h2,{id:"api-versioning",children:"API Versioning"}),"\n",(0,r.jsx)(n.p,{children:"APIs are versioned using URL path versioning:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Current version: ",(0,r.jsx)(n.code,{children:"v1"})]}),"\n",(0,r.jsxs)(n.li,{children:["Beta features: ",(0,r.jsx)(n.code,{children:"v1-beta"})]}),"\n",(0,r.jsx)(n.li,{children:"Legacy support: Maintained for 12 months"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"related-resources",children:"Related Resources"}),"\n",(0,r.jsx)(n.h2,{id:"error-codes",children:"Error Codes"}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Code"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"4001"}),(0,r.jsx)(n.td,{children:"Invalid parameters"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"4002"}),(0,r.jsx)(n.td,{children:"Resource not found"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"4003"}),(0,r.jsx)(n.td,{children:"Rate limit exceeded"})]})]})]}),"\n",(0,r.jsx)(n.h2,{id:"sdk-examples",children:"SDK Examples"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-typescript",children:'// TypeScript\nconst api = new Veil(apiKey);\nconst result = await api.validate({\n  apiId: "api_123",\n  endpoint: "/users",\n});\n'})})]})}function h(e={}){const{wrapper:n}={...(0,a.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(o,{...e})}):o(e)}},4942:(e,n,s)=>{s.d(n,{R:()=>l,x:()=>d});var i=s(6672);const r={},a=i.createContext(r);function l(e){const n=i.useContext(a);return i.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function d(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:l(e.components),i.createElement(a.Provider,{value:n},e.children)}}}]);