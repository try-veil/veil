#!/bin/bash

echo "Setting up external Docker networks for Veil project..."

# Create external networks if they don't exist
docker network create veil_grafana 2>/dev/null || echo "Network veil_grafana already exists"
docker network create veil_fusionauth 2>/dev/null || echo "Network veil_fusionauth already exists"

echo "Networks created successfully!"
echo "Available networks:"
docker network ls | grep veil_
