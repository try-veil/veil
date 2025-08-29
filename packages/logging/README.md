# Grafana with FusionAuth OIDC Setup

This setup provides Grafana with FusionAuth OIDC authentication and RBAC-based dashboard access.

## Services

- **PostgreSQL**: Database for FusionAuth
- **Elasticsearch**: Search engine for FusionAuth  
- **FusionAuth**: OIDC provider (port 9011)
- **Grafana**: Monitoring dashboard (port 3000)

## Quick Start

1. Start the services:
   ```bash
   docker-compose up -d
   ```

2. Wait for all services to be ready (check with `docker-compose logs`)

3. Access FusionAuth admin panel:
   - URL: http://localhost:9011
   - Complete initial setup wizard
   - The kickstart configuration will automatically create the Grafana application

4. Access Grafana:
   - URL: http://localhost:3000
   - Click "Sign in with FusionAuth" to use OIDC
   - Or use admin/admin123 for local admin access

## Test Users

The kickstart configuration creates these test users:

- **admin@example.com** (password: password123) - Grafana Admin role
- **editor@example.com** (password: password123) - Grafana Editor role
- **viewer@example.com** (password: password123) - Grafana Viewer role

## RBAC Dashboard Access

Users are mapped to Grafana roles based on their FusionAuth roles:
- `grafana-admin` → Grafana Admin (full access)
- `grafana-editor` → Grafana Editor (edit dashboards)
- `grafana-viewer` → Grafana Viewer (view only)

To restrict specific dashboards to specific users, configure folder permissions in Grafana after OIDC login.

## Configuration Details

- **Application ID**: 85a03867-dccf-4882-adde-1a79aeec50df
- **Redirect URI**: http://localhost:3000/login/generic_oauth
- **Roles**: grafana-admin, grafana-editor, grafana-viewer

## Troubleshooting

- Check service logs: `docker-compose logs [service-name]`
- Ensure all services are healthy before testing
- FusionAuth setup may take a few minutes on first run
