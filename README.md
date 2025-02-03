# veil

Coming Soon

### Development Setup

#### MacOS

_Note: These commands assume that you are at the root of the cloned veil project._

```bash
chmod +x ./scripts/setup/mac.sh
./scripts/setup/mac.sh
```

This should install `homebrew`, `go`, `caddy` and `xcaddy` since these are the hard dependencies for you to start developing with veil.

### TODO

- [ ] Setup scripts for local development
- [ ] Basic CI/CD pipeline using GitHub Actions
  - [ ] Test - Unit, e2e
  - [ ] Build Scripts
  - [ ] Lint and Format
- [ ] Auto generation of Swagger
- [ ] Auto generation of Postman Collections
- [ ] Closure of Onboarding and Validation API
  - [ ] Support for Headers
  - [ ] Support for Query Params
  - [ ] Support for Body
  - [ ] Support for Path Params
  - [ ] Support for POST
- [ ] Support for Generating API Keys for Users
- [ ] Logging and Monitoring Design
- [ ] Billing APIs
- [ ] Consumer APIs
- [ ] Analytics APIs
- [ ] Ory Integration and Auth Setup
- [ ] A Basic UI to validate the data for faster development
- [ ] Auto generation of Client SDKs
- [ ] Basic Home Page for the Platform
- [ ] Optionality of features
  - [ ] Reverse Proxy Mode - Only use it a reverse proxy and monitoring of all traffic
  - [ ] Markeplatce Mode + Reverse Proxy Mode


## References 

### Tools

- [swaggest](https://github.com/orgs/swaggest/repositories) - Swagger and OpenAPI spec related tools written in go
- [Writing a Caddy Plugin - Blog](https://moebuta.org/posts/writing-a-caddy-plugin-part-ii/)