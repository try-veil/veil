"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[6186],{1756:(e,n,i)=>{i.r(n),i.d(n,{assets:()=>c,contentTitle:()=>t,default:()=>h,frontMatter:()=>a,metadata:()=>l,toc:()=>d});const l=JSON.parse('{"id":"contribution/architecture/readme","title":"Veil Architecture Design Document","description":"Overview","source":"@site/docs/contribution/architecture/readme.md","sourceDirName":"contribution/architecture","slug":"/contribution/architecture/","permalink":"/docs/contribution/architecture/","draft":false,"unlisted":false,"editUrl":"https://github.com/try-veil/veil/tree/main/docs/docs/contribution/architecture/readme.md","tags":[],"version":"current","frontMatter":{}}');var r=i(3420),s=i(4942);const a={},t="Veil Architecture Design Document",c={},d=[{value:"Overview",id:"overview",level:2},{value:"Core Components",id:"core-components",level:2},{value:"1. Gateway Layer (Caddy-based)",id:"1-gateway-layer-caddy-based",level:3},{value:"Components",id:"components",level:4},{value:"Key Features",id:"key-features",level:4},{value:"2. Platform Core",id:"2-platform-core",level:3},{value:"Services",id:"services",level:4},{value:"Data Store",id:"data-store",level:4},{value:"3. Observability Stack",id:"3-observability-stack",level:3},{value:"Components",id:"components-1",level:4},{value:"System Architecture",id:"system-architecture",level:2},{value:"Request Flow",id:"request-flow",level:3},{value:"Data Flow",id:"data-flow",level:3},{value:"Security Architecture",id:"security-architecture",level:2},{value:"Authentication",id:"authentication",level:3},{value:"Authorization",id:"authorization",level:3},{value:"Data Protection",id:"data-protection",level:3},{value:"Scalability Design",id:"scalability-design",level:2},{value:"Gateway Configuration Management",id:"gateway-configuration-management",level:3},{value:"Horizontal Scaling",id:"horizontal-scaling",level:3},{value:"Performance Optimization",id:"performance-optimization",level:3},{value:"Monitoring and Alerting",id:"monitoring-and-alerting",level:2},{value:"Key Metrics",id:"key-metrics",level:3},{value:"Alert Thresholds",id:"alert-thresholds",level:3},{value:"Disaster Recovery",id:"disaster-recovery",level:2},{value:"Backup Strategy",id:"backup-strategy",level:3},{value:"Recovery Procedures",id:"recovery-procedures",level:3},{value:"Development Workflow",id:"development-workflow",level:2},{value:"CI/CD Pipeline",id:"cicd-pipeline",level:3},{value:"Testing Strategy",id:"testing-strategy",level:3},{value:"Future Roadmap",id:"future-roadmap",level:2},{value:"Phase 1: Core Platform",id:"phase-1-core-platform",level:3},{value:"Phase 2: Enhanced Features",id:"phase-2-enhanced-features",level:3},{value:"Phase 3: Enterprise Features",id:"phase-3-enterprise-features",level:3},{value:"References",id:"references",level:2},{value:"Technology Stack",id:"technology-stack",level:2},{value:"Core Technologies",id:"core-technologies",level:3},{value:"Component Integration",id:"component-integration",level:3},{value:"Development Tools",id:"development-tools",level:3},{value:"Infrastructure",id:"infrastructure",level:3},{value:"Technology Selection Criteria",id:"technology-selection-criteria",level:3},{value:"Consistency Model",id:"consistency-model",level:2},{value:"Real-time vs. Delayed Operations",id:"real-time-vs-delayed-operations",level:3},{value:"Data Storage",id:"data-storage",level:3},{value:"V1: SQLite",id:"v1-sqlite",level:4},{value:"High Availability Features",id:"high-availability-features",level:4},{value:"Security Architecture",id:"security-architecture-1",level:2},{value:"API Key Management",id:"api-key-management",level:3},{value:"TLS Configuration",id:"tls-configuration",level:3},{value:"CORS Policy",id:"cors-policy",level:3},{value:"High Availability Design",id:"high-availability-design",level:2},{value:"Regional Deployment",id:"regional-deployment",level:3},{value:"Circuit Breaker Configuration",id:"circuit-breaker-configuration",level:3},{value:"Service Level Objectives",id:"service-level-objectives",level:3}];function o(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",h4:"h4",header:"header",li:"li",mermaid:"mermaid",ol:"ol",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,s.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.header,{children:(0,r.jsx)(n.h1,{id:"veil-architecture-design-document",children:"Veil Architecture Design Document"})}),"\n",(0,r.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,r.jsx)(n.p,{children:"Veil is an API marketplace platform that enables API providers to publish their APIs and allows consumers to discover, subscribe to, and manage API access through a unified gateway."}),"\n",(0,r.jsx)(n.h2,{id:"core-components",children:"Core Components"}),"\n",(0,r.jsx)(n.h3,{id:"1-gateway-layer-caddy-based",children:"1. Gateway Layer (Caddy-based)"}),"\n",(0,r.jsx)(n.h4,{id:"components",children:"Components"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Authentication Middleware"}),": Validates API keys and JWT tokens"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Rate Limiting"}),": Enforces usage quotas and throttling"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Request Transform"}),": Handles header manipulation and request routing"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Logging"}),": Captures detailed request/response metrics"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Health Check"}),": Monitors API endpoint availability"]}),"\n"]}),"\n",(0,r.jsx)(n.h4,{id:"key-features",children:"Key Features"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Real-time request validation"}),"\n",(0,r.jsx)(n.li,{children:"Automatic header transformation"}),"\n",(0,r.jsx)(n.li,{children:"Traffic shaping and throttling"}),"\n",(0,r.jsx)(n.li,{children:"Request/response logging"}),"\n",(0,r.jsx)(n.li,{children:"Error handling and retry logic"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"2-platform-core",children:"2. Platform Core"}),"\n",(0,r.jsx)(n.h4,{id:"services",children:"Services"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"API Management"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Onboarding service"}),"\n",(0,r.jsx)(n.li,{children:"Validation service"}),"\n",(0,r.jsx)(n.li,{children:"Update service"}),"\n",(0,r.jsx)(n.li,{children:"Deletion service"}),"\n",(0,r.jsx)(n.li,{children:"Version management"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"User Management"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Authentication service"}),"\n",(0,r.jsx)(n.li,{children:"Authorization service"}),"\n",(0,r.jsx)(n.li,{children:"Profile management"}),"\n",(0,r.jsx)(n.li,{children:"API key management"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Subscription Management"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Plan management"}),"\n",(0,r.jsx)(n.li,{children:"Quota tracking"}),"\n",(0,r.jsx)(n.li,{children:"Usage analytics"}),"\n",(0,r.jsx)(n.li,{children:"Billing integration"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h4,{id:"data-store",children:"Data Store"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"SQLite Database"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"User data"}),"\n",(0,r.jsx)(n.li,{children:"API configurations"}),"\n",(0,r.jsx)(n.li,{children:"Subscription data"}),"\n",(0,r.jsx)(n.li,{children:"Usage metrics"}),"\n",(0,r.jsx)(n.li,{children:"Audit logs"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"3-observability-stack",children:"3. Observability Stack"}),"\n",(0,r.jsx)(n.h4,{id:"components-1",children:"Components"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Logging (Loki)"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Request/response logs"}),"\n",(0,r.jsx)(n.li,{children:"Error logs"}),"\n",(0,r.jsx)(n.li,{children:"Audit logs"}),"\n",(0,r.jsx)(n.li,{children:"Performance metrics"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Metrics (Prometheus)"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Usage statistics"}),"\n",(0,r.jsx)(n.li,{children:"Performance metrics"}),"\n",(0,r.jsx)(n.li,{children:"Error rates"}),"\n",(0,r.jsx)(n.li,{children:"Response times"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Visualization (Grafana)"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Usage dashboards"}),"\n",(0,r.jsx)(n.li,{children:"Performance monitoring"}),"\n",(0,r.jsx)(n.li,{children:"Alerting"}),"\n",(0,r.jsx)(n.li,{children:"Trend analysis"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"system-architecture",children:"System Architecture"}),"\n",(0,r.jsx)(n.h3,{id:"request-flow",children:"Request Flow"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Client Request"})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"Client -> Gateway -> Auth -> Rate Limit -> Transform -> API\n"})}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Response Flow"})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"API -> Transform -> Logging -> Metrics -> Client\n"})}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Error Flow"})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"Error -> Error Handler -> Logging -> Metrics -> Client\n"})}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"data-flow",children:"Data Flow"}),"\n",(0,r.jsx)(n.mermaid,{value:"graph TD\n    A[Client] --\x3e B[Gateway]\n    B --\x3e C[Auth Service]\n    C --\x3e D[Rate Limiter]\n    D --\x3e E[Transform]\n    E --\x3e F[API Provider]\n\n    B --\x3e G[Logging]\n    G --\x3e H[Metrics]\n    H --\x3e I[Alerts]"}),"\n",(0,r.jsx)(n.h2,{id:"security-architecture",children:"Security Architecture"}),"\n",(0,r.jsx)(n.h3,{id:"authentication",children:"Authentication"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"API Key Authentication"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Format: ",(0,r.jsx)(n.code,{children:"veil_live_[base58]"})]}),"\n",(0,r.jsx)(n.li,{children:"Rotation policy: 90 days"}),"\n",(0,r.jsx)(n.li,{children:"Scope-based access control"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"JWT Tokens"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Short-lived (1 hour)"}),"\n",(0,r.jsx)(n.li,{children:"Refresh token support"}),"\n",(0,r.jsx)(n.li,{children:"Role-based access control"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"authorization",children:"Authorization"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Scopes"})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "api:read": "Read API metadata",\n  "api:write": "Modify API configuration",\n  "keys:manage": "Manage API keys",\n  "usage:read": "View usage statistics"\n}\n'})}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Roles"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"API Provider"}),"\n",(0,r.jsx)(n.li,{children:"API Consumer"}),"\n",(0,r.jsx)(n.li,{children:"Administrator"}),"\n",(0,r.jsx)(n.li,{children:"Billing Manager"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"data-protection",children:"Data Protection"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"At Rest"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Database encryption"}),"\n",(0,r.jsx)(n.li,{children:"Sensitive field encryption"}),"\n",(0,r.jsx)(n.li,{children:"Key rotation"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"In Transit"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"TLS 1.3 required"}),"\n",(0,r.jsx)(n.li,{children:"Certificate pinning"}),"\n",(0,r.jsx)(n.li,{children:"Perfect forward secrecy"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"scalability-design",children:"Scalability Design"}),"\n",(0,r.jsx)(n.p,{children:"Veil's architecture is designed for horizontal scalability across all components. The gateway layer employs a stateless design that allows for seamless scaling through load balancers and regional deployments. This approach enables the platform to handle increasing traffic loads by simply adding more gateway instances."}),"\n",(0,r.jsx)(n.h3,{id:"gateway-configuration-management",children:"Gateway Configuration Management"}),"\n",(0,r.jsx)(n.p,{children:"Veil takes a unique approach to Caddy configuration management, treating configuration as versioned, immutable objects. Each API's gateway configuration is stored as an individual JSON file, enabling granular updates and efficient change tracking:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "configVersion": "2024.1",\n  "apiId": "api_123",\n  "routes": {\n    "handle": [\n      {\n        "handler": "subroute",\n        "routes": [\n          {\n            "handle": [\n              {\n                "handler": "reverse_proxy",\n                "upstreams": [{ "dial": "api.provider.com:443" }],\n                "headers": {\n                  "request": {\n                    "set": {\n                      "Authorization": ["{http.request.header.X-Api-Key}"]\n                    }\n                  }\n                }\n              }\n            ]\n          }\n        ]\n      }\n    ]\n  }\n}\n'})}),"\n",(0,r.jsx)(n.p,{children:"Configuration changes are managed through a delta-based system:"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsx)(n.li,{children:"New configurations are stored as separate JSON files"}),"\n",(0,r.jsx)(n.li,{children:"Only changed routes are updated in Caddy"}),"\n",(0,r.jsx)(n.li,{children:"Version history is maintained for rollback capability"}),"\n",(0,r.jsx)(n.li,{children:"Configurations are validated before deployment"}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:"The platform uses an S3-compatible storage system for configuration management:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:"s3://veil-config/\n  \u251c\u2500\u2500 apis/\n  \u2502   \u251c\u2500\u2500 api_123/\n  \u2502   \u2502   \u251c\u2500\u2500 v1/config.json\n  \u2502   \u2502   \u251c\u2500\u2500 v2/config.json\n  \u2502   \u2502   \u2514\u2500\u2500 current -> v2/config.json\n  \u2502   \u2514\u2500\u2500 api_456/\n  \u2502       \u2514\u2500\u2500 v1/config.json\n  \u251c\u2500\u2500 global/\n  \u2502   \u2514\u2500\u2500 middleware/\n  \u2502       \u251c\u2500\u2500 auth.json\n  \u2502       \u2514\u2500\u2500 metrics.json\n  \u2514\u2500\u2500 versions.lock\n"})}),"\n",(0,r.jsx)(n.p,{children:"This approach provides several benefits:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Atomic updates to individual API configurations"}),"\n",(0,r.jsx)(n.li,{children:"Easy rollback to previous versions"}),"\n",(0,r.jsx)(n.li,{children:"Efficient diff-based change detection"}),"\n",(0,r.jsx)(n.li,{children:"Improved debugging through version history"}),"\n",(0,r.jsx)(n.li,{children:"Configuration auditability"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"horizontal-scaling",children:"Horizontal Scaling"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Gateway Layer"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Stateless design"}),"\n",(0,r.jsx)(n.li,{children:"Load balancer support"}),"\n",(0,r.jsx)(n.li,{children:"Regional deployment"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Platform Layer"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Microservices architecture"}),"\n",(0,r.jsx)(n.li,{children:"Independent scaling"}),"\n",(0,r.jsx)(n.li,{children:"Resource isolation"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"performance-optimization",children:"Performance Optimization"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Caching Strategy"})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "apiConfig": { "ttl": "5m" },\n  "authTokens": { "ttl": "1m" },\n  "rateLimits": { "ttl": "1s" }\n}\n'})}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Rate Limiting"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Token bucket algorithm"}),"\n",(0,r.jsx)(n.li,{children:"Distributed rate limiting"}),"\n",(0,r.jsx)(n.li,{children:"Burst handling"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"monitoring-and-alerting",children:"Monitoring and Alerting"}),"\n",(0,r.jsx)(n.h3,{id:"key-metrics",children:"Key Metrics"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Platform Health"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Gateway latency"}),"\n",(0,r.jsx)(n.li,{children:"Error rates"}),"\n",(0,r.jsx)(n.li,{children:"CPU/Memory usage"}),"\n",(0,r.jsx)(n.li,{children:"Database connections"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Business Metrics"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Active subscriptions"}),"\n",(0,r.jsx)(n.li,{children:"API usage"}),"\n",(0,r.jsx)(n.li,{children:"Revenue"}),"\n",(0,r.jsx)(n.li,{children:"Customer satisfaction"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"alert-thresholds",children:"Alert Thresholds"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "critical": {\n    "errorRate": ">5%",\n    "latency": ">500ms",\n    "availability": "<99.9%"\n  },\n  "warning": {\n    "errorRate": ">1%",\n    "latency": ">200ms",\n    "availability": "<99.95%"\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h2,{id:"disaster-recovery",children:"Disaster Recovery"}),"\n",(0,r.jsx)(n.h3,{id:"backup-strategy",children:"Backup Strategy"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Database"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Full backup: Daily"}),"\n",(0,r.jsx)(n.li,{children:"Incremental: Hourly"}),"\n",(0,r.jsx)(n.li,{children:"Retention: 90 days"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Configuration"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Version controlled"}),"\n",(0,r.jsx)(n.li,{children:"Infrastructure as Code"}),"\n",(0,r.jsx)(n.li,{children:"Automated recovery"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"recovery-procedures",children:"Recovery Procedures"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Gateway Failure"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Automatic failover"}),"\n",(0,r.jsx)(n.li,{children:"Regional redundancy"}),"\n",(0,r.jsx)(n.li,{children:"Blue-green deployment"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Data Recovery"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Point-in-time recovery"}),"\n",(0,r.jsx)(n.li,{children:"Cross-region replication"}),"\n",(0,r.jsx)(n.li,{children:"Automated verification"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"development-workflow",children:"Development Workflow"}),"\n",(0,r.jsx)(n.h3,{id:"cicd-pipeline",children:"CI/CD Pipeline"}),"\n",(0,r.jsx)(n.mermaid,{value:"graph LR\n    A[Code] --\x3e B[Test]\n    B --\x3e C[Build]\n    C --\x3e D[Stage]\n    D --\x3e E[Deploy]"}),"\n",(0,r.jsx)(n.h3,{id:"testing-strategy",children:"Testing Strategy"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Unit Tests"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Service layer"}),"\n",(0,r.jsx)(n.li,{children:"Data access"}),"\n",(0,r.jsx)(n.li,{children:"Utilities"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Integration Tests"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"API endpoints"}),"\n",(0,r.jsx)(n.li,{children:"Gateway configuration"}),"\n",(0,r.jsx)(n.li,{children:"Authentication flow"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Performance Tests"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Load testing"}),"\n",(0,r.jsx)(n.li,{children:"Stress testing"}),"\n",(0,r.jsx)(n.li,{children:"Failover scenarios"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"future-roadmap",children:"Future Roadmap"}),"\n",(0,r.jsx)(n.h3,{id:"phase-1-core-platform",children:"Phase 1: Core Platform"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Gateway implementation"}),"\n",(0,r.jsx)(n.li,{children:"Basic API management"}),"\n",(0,r.jsx)(n.li,{children:"Usage tracking"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"phase-2-enhanced-features",children:"Phase 2: Enhanced Features"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Advanced analytics"}),"\n",(0,r.jsx)(n.li,{children:"Billing integration"}),"\n",(0,r.jsx)(n.li,{children:"Documentation portal"}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"phase-3-enterprise-features",children:"Phase 3: Enterprise Features"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Multi-region support"}),"\n",(0,r.jsx)(n.li,{children:"Custom domains"}),"\n",(0,r.jsx)(n.li,{children:"SSO integration"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"references",children:"References"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsx)(n.li,{children:(0,r.jsx)(n.a,{target:"_blank","data-noBrokenLinkCheck":!0,href:i(8582).A+"",children:"Architecture Diagram"})}),"\n",(0,r.jsx)(n.li,{children:(0,r.jsx)(n.a,{href:"../../api/",children:"API Documentation"})}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"technology-stack",children:"Technology Stack"}),"\n",(0,r.jsx)(n.h3,{id:"core-technologies",children:"Core Technologies"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Backend"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Go"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Primary development language"}),"\n",(0,r.jsx)(n.li,{children:"Native integration with Caddy"}),"\n",(0,r.jsx)(n.li,{children:"High performance and concurrency"}),"\n",(0,r.jsx)(n.li,{children:"Strong type system"}),"\n",(0,r.jsx)(n.li,{children:"Built-in testing support"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Caddy"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Core gateway implementation"}),"\n",(0,r.jsx)(n.li,{children:"Custom middleware development"}),"\n",(0,r.jsx)(n.li,{children:"Native HTTPS support"}),"\n",(0,r.jsx)(n.li,{children:"Dynamic configuration"}),"\n",(0,r.jsx)(n.li,{children:"High performance proxy"}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Authentication & Authorization"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"Ory Stack"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Kratos: Identity management"}),"\n",(0,r.jsx)(n.li,{children:"Hydra: OAuth2 & OpenID Connect"}),"\n",(0,r.jsx)(n.li,{children:"Oathkeeper: Zero-trust networking"}),"\n",(0,r.jsx)(n.li,{children:"Keto: Fine-grained permissions"}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Data Storage"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.strong,{children:"SQLite"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Embedded database"}),"\n",(0,r.jsx)(n.li,{children:"ACID compliance"}),"\n",(0,r.jsx)(n.li,{children:"Zero configuration"}),"\n",(0,r.jsx)(n.li,{children:"Single file storage"}),"\n",(0,r.jsx)(n.li,{children:"Serverless operation"}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"component-integration",children:"Component Integration"}),"\n",(0,r.jsx)(n.mermaid,{value:"graph TD\n    A[Client] --\x3e B[Caddy Gateway]\n    B --\x3e C[Ory Oathkeeper]\n    C --\x3e D[Go Services]\n    D --\x3e E[SQLite]\n\n    F[API Provider] --\x3e B\n\n    G[Ory Kratos] --\x3e D\n    H[Ory Hydra] --\x3e D\n    I[Ory Keto] --\x3e D"}),"\n",(0,r.jsx)(n.h3,{id:"development-tools",children:"Development Tools"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Build & Development"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Go 1.23+"}),"\n",(0,r.jsx)(n.li,{children:"Air (Live reload)"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Testing"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Go testing framework"}),"\n",(0,r.jsx)(n.li,{children:"Testcontainers"}),"\n",(0,r.jsx)(n.li,{children:"k6 (Performance testing)"}),"\n",(0,r.jsx)(n.li,{children:"Newman (API testing)"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"infrastructure",children:"Infrastructure"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Container Runtime"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Docker"}),"\n",(0,r.jsx)(n.li,{children:"Docker Compose (development)"}),"\n",(0,r.jsx)(n.li,{children:"Kubernetes (production)"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Service Mesh"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Istio","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Traffic management"}),"\n",(0,r.jsx)(n.li,{children:"Security policies"}),"\n",(0,r.jsx)(n.li,{children:"Observability"}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"technology-selection-criteria",children:"Technology Selection Criteria"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Go"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Native Caddy integration capabilities"}),"\n",(0,r.jsx)(n.li,{children:"Strong standard library"}),"\n",(0,r.jsx)(n.li,{children:"Excellent performance characteristics"}),"\n",(0,r.jsx)(n.li,{children:"Built-in concurrency support"}),"\n",(0,r.jsx)(n.li,{children:"Simple deployment (single binary)"}),"\n",(0,r.jsx)(n.li,{children:"Strong community and ecosystem"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"Ory.sh"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Enterprise-grade security"}),"\n",(0,r.jsx)(n.li,{children:"OAuth2 and OIDC compliance"}),"\n",(0,r.jsx)(n.li,{children:"Zero-trust architecture"}),"\n",(0,r.jsx)(n.li,{children:"Cloud-native design"}),"\n",(0,r.jsx)(n.li,{children:"Active development and community"}),"\n",(0,r.jsx)(n.li,{children:"Comprehensive documentation"}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["\n",(0,r.jsx)(n.p,{children:(0,r.jsx)(n.strong,{children:"SQLite"})}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Simplified operations"}),"\n",(0,r.jsx)(n.li,{children:"No separate database server"}),"\n",(0,r.jsx)(n.li,{children:"Excellent performance for our scale"}),"\n",(0,r.jsx)(n.li,{children:"Easy backup and recovery"}),"\n",(0,r.jsx)(n.li,{children:"Native Go support"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"consistency-model",children:"Consistency Model"}),"\n",(0,r.jsx)(n.p,{children:"Veil employs a hybrid consistency model that prioritizes user experience while maintaining system reliability. At its core, the platform makes a deliberate trade-off between immediate consistency for critical operations and eventual consistency for analytical and billing functions."}),"\n",(0,r.jsx)(n.h3,{id:"real-time-vs-delayed-operations",children:"Real-time vs. Delayed Operations"}),"\n",(0,r.jsx)(n.p,{children:"Critical path operations such as API key validation, authentication checks, and per-second rate limiting are processed with immediate consistency. These operations happen directly in the gateway layer, ensuring minimal latency and maximum reliability for API consumers. Every request is validated in real-time before being proxied to the provider's API."}),"\n",(0,r.jsx)(n.p,{children:"However, for usage tracking and billing calculations, Veil adopts a log-based analytics approach. This design decision means that while all requests are logged immediately, the processing of these logs for usage metrics and billing calculations happens asynchronously. Usage statistics typically have a 5-minute delay, while billing calculations may take up to an hour to fully reconcile."}),"\n",(0,r.jsx)(n.mermaid,{value:"sequenceDiagram\n    participant Client\n    participant Gateway\n    participant LogProcessor\n    participant Analytics\n    participant Billing\n\n    Client->>Gateway: API Request\n    Gateway->>Gateway: Basic Rate Check\n    Gateway->>Client: Response\n    Gateway--\x3e>LogProcessor: Async Log Entry\n    LogProcessor--\x3e>Analytics: Process Usage (5m delay)\n    Analytics--\x3e>Billing: Update Usage Stats"}),"\n",(0,r.jsx)(n.p,{children:'This eventual consistency model has important implications for business operations. Usage limits may be temporarily exceeded during the processing window, potentially leading to "soft" overlimit situations. Similarly, billing calculations might show temporary negative balances until all usage data is processed. To mitigate these effects, Veil implements several safeguards:'}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Conservative initial rate limits with built-in buffers"}),"\n",(0,r.jsx)(n.li,{children:"Proactive notification system for approaching limits"}),"\n",(0,r.jsx)(n.li,{children:"Grace periods for quota enforcement"}),"\n",(0,r.jsx)(n.li,{children:"Automatic credit holds for high-risk scenarios"}),"\n",(0,r.jsx)(n.li,{children:"Regular reconciliation jobs to catch and correct discrepancies"}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:"The consistency windows are carefully tuned based on operational requirements:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "usageMetrics": {\n    "delay": "5m",\n    "accuracy": "99.9%"\n  },\n  "billing": {\n    "delay": "1h",\n    "accuracy": "100%"\n  },\n  "quotas": {\n    "delay": "5m",\n    "overage": "allowed"\n  }\n}\n'})}),"\n",(0,r.jsx)(n.p,{children:"To maintain system integrity, certain operations always maintain strong consistency guarantees: API key status changes, authentication token validation, basic rate limits, and configuration updates. These operations are handled synchronously to ensure immediate effect across the platform."}),"\n",(0,r.jsx)(n.p,{children:"For recovery and reconciliation, Veil maintains comprehensive audit trails and provides both automatic and manual adjustment capabilities. The system includes built-in dispute resolution mechanisms and regular reconciliation jobs to handle any discrepancies that may arise from the eventual consistency model."}),"\n",(0,r.jsx)(n.p,{children:"This hybrid approach allows Veil to maintain high performance and reliability while ensuring accurate usage tracking and billing, even at scale. The small trade-off in immediate consistency for analytical functions is balanced against the benefits of improved system performance and reliability."}),"\n",(0,r.jsx)(n.h3,{id:"data-storage",children:"Data Storage"}),"\n",(0,r.jsx)(n.h4,{id:"v1-sqlite",children:"V1: SQLite"}),"\n",(0,r.jsx)(n.p,{children:"For the initial release, Veil uses SQLite as its primary datastore, chosen for its simplicity and embedded nature:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Embedded database requiring no separate server"}),"\n",(0,r.jsx)(n.li,{children:"ACID compliance with WAL mode"}),"\n",(0,r.jsx)(n.li,{children:"Single file storage simplifying backups"}),"\n",(0,r.jsx)(n.li,{children:"Excellent performance for initial scale"}),"\n",(0,r.jsx)(n.li,{children:"Native Go support"}),"\n"]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "database": {\n    "path": "/data/veil.db",\n    "mode": "wal",\n    "timeout": "5s",\n    "maxOpenConns": 1,\n    "busyTimeout": "1s"\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h4,{id:"high-availability-features",children:"High Availability Features"}),"\n",(0,r.jsx)(n.p,{children:"V1 (SQLite):"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Regular backups to S3"}),"\n",(0,r.jsx)(n.li,{children:"Point-in-time recovery via WAL"}),"\n",(0,r.jsx)(n.li,{children:"Read-only replicas for analytics"}),"\n",(0,r.jsx)(n.li,{children:"Hot backup support"}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:"V2 (PostgreSQL):"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Automated failover with streaming replication"}),"\n",(0,r.jsx)(n.li,{children:"Connection pooling via PgBouncer"}),"\n",(0,r.jsx)(n.li,{children:"Read-write splitting"}),"\n",(0,r.jsx)(n.li,{children:"Continuous archiving"}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"security-architecture-1",children:"Security Architecture"}),"\n",(0,r.jsx)(n.h3,{id:"api-key-management",children:"API Key Management"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "keyFormat": {\n    "prefix": "veil_",\n    "entropy": 256,\n    "encoding": "base58",\n    "rotation": "90d"\n  },\n  "rateLimits": {\n    "ipBased": {\n      "window": "1m",\n      "max": 1000,\n      "burst": 50\n    },\n    "keyBased": {\n      "window": "1s",\n      "max": 100,\n      "burst": 10\n    }\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h3,{id:"tls-configuration",children:"TLS Configuration"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "minimumVersion": "1.3",\n  "preferredCipherSuites": [\n    "TLS_AES_256_GCM_SHA384",\n    "TLS_CHACHA20_POLY1305_SHA256"\n  ],\n  "certificatePolicy": {\n    "provider": "Let\'s Encrypt",\n    "renewBefore": "30d",\n    "ocspStapling": true\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h3,{id:"cors-policy",children:"CORS Policy"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "allowedOrigins": ["https://*.veil.sh"],\n  "allowedMethods": ["GET", "POST", "PUT", "DELETE"],\n  "allowedHeaders": ["Authorization", "Content-Type"],\n  "maxAge": 3600,\n  "requireSecure": true\n}\n'})}),"\n",(0,r.jsx)(n.h2,{id:"high-availability-design",children:"High Availability Design"}),"\n",(0,r.jsx)(n.h3,{id:"regional-deployment",children:"Regional Deployment"}),"\n",(0,r.jsx)(n.mermaid,{value:'graph TD\n    A[Global Load Balancer] --\x3e B[Region US]\n    A --\x3e C[Region EU]\n    A --\x3e D[Region APAC]\n\n    subgraph "Region US"\n        B --\x3e E[Gateway Cluster]\n        E --\x3e F[Service Cluster]\n    end'}),"\n",(0,r.jsx)(n.h3,{id:"circuit-breaker-configuration",children:"Circuit Breaker Configuration"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "upstreamAPIs": {\n    "failureThreshold": 0.5,\n    "samplingPeriod": "1m",\n    "minimumRequests": 100,\n    "recoveryTime": "30s",\n    "backoffPolicy": {\n      "initial": "1s",\n      "max": "30s",\n      "multiplier": 2\n    }\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h3,{id:"service-level-objectives",children:"Service Level Objectives"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "availability": {\n    "target": "99.99%",\n    "measurement": "rolling-30d",\n    "excludedEvents": ["planned-maintenance"]\n  },\n  "latency": {\n    "p95": "100ms",\n    "p99": "200ms"\n  },\n  "errorBudget": {\n    "monthly": "0.01%",\n    "alertThreshold": "75%"\n  }\n}\n'})})]})}function h(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(o,{...e})}):o(e)}},4942:(e,n,i)=>{i.d(n,{R:()=>a,x:()=>t});var l=i(6672);const r={},s=l.createContext(r);function a(e){const n=l.useContext(s);return l.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function t(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:a(e.components),l.createElement(s.Provider,{value:n},e.children)}},8582:(e,n,i)=>{i.d(n,{A:()=>l});const l=i.p+"assets/files/arch-3e8b197f743ad0c32ab80ac96478c1f6.mmd"}}]);