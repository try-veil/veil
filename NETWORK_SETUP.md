# Veil Project Network Configuration

## Overview
This document explains the network configuration for the Veil project, which consists of multiple Docker Compose files that need to communicate with each other.

## Network Architecture

### External Networks
Two external Docker networks have been created to enable communication between services across different Docker Compose files:

1. **veil_grafana** - For Grafana and monitoring services
2. **veil_fusionauth** - For FusionAuth and authentication services

### Service Network Assignments

#### Caddy Docker Compose (`/packages/caddy/docker-compose.yml`)
- **minio**: `grafana` network
- **loki**: `grafana` network  
- **promtail**: `grafana` network
- **grafana**: `grafana` + `fusionauth` networks (can communicate with both stacks)
- **grafana-init**: `grafana` network
- **webhook-service**: `grafana` network

#### Platform API Docker Compose (`/packages/platform/api/docker-compose.yml`)
- **db**: `fusionauth` network
- **fusionauth**: `fusionauth` + `grafana` networks (can communicate with both stacks)
- **search**: `fusionauth` network
- **my_postgres**: No specific network (uses default)

## Setup Instructions

### 1. Create External Networks
Run the setup script to create the required external networks:
```bash
./setup-networks.sh
```

This creates:
- `veil_grafana` network
- `veil_fusionauth` network

### 2. Start Services
Start the services in the correct order:

```bash
# Start FusionAuth stack first
cd packages/platform/api
docker-compose up -d

# Start Grafana stack
cd ../caddy  
docker-compose up -d
```

### 3. Test Connectivity
Run the connectivity test to verify services can communicate:
```bash
./test-connectivity.sh
```

## Service Communication

### Grafana ↔ FusionAuth
- **Grafana** can reach **FusionAuth** at `fusionauth:9011`
- **FusionAuth** can reach **Grafana** at `grafana:3000`
- This enables OAuth/OIDC authentication between the services

### Grafana ↔ Monitoring Stack
- **Grafana** can reach **Loki** at `loki:3100`
- **Grafana** can reach **Minio** at `minio:9000`
- This enables log aggregation and storage

## Environment Variables
Make sure to configure the following environment variables in Grafana for FusionAuth integration:
- `GF_AUTH_GENERIC_OAUTH_TOKEN_URL=http://fusionauth:9011/oauth2/token`
- `GF_AUTH_GENERIC_OAUTH_API_URL=http://fusionauth:9011/oauth2/userinfo`

## Troubleshooting

### Check Network Connectivity
```bash
# List all networks
docker network ls | grep veil_

# Inspect a network
docker network inspect veil_grafana
docker network inspect veil_fusionauth

# Check if containers are on the correct networks
docker inspect <container_name> | grep NetworkMode
```

### Common Issues
1. **Networks don't exist**: Run `./setup-networks.sh`
2. **Services can't communicate**: Verify containers are on the same external network
3. **Port conflicts**: Check that ports 4000 (Grafana) and 9011 (FusionAuth) are available

## Security Considerations
- External networks allow controlled communication between services
- Services not on the same network remain isolated
- Only necessary ports are exposed to the host system
