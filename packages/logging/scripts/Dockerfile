FROM alpine:3.18

# Install curl for API calls
RUN apk add --no-cache curl bash grep

# Copy the initialization script
COPY init-grafana.sh /init-grafana.sh
RUN chmod +x /init-grafana.sh

# Run as root for file permissions (init container, runs once)
ENTRYPOINT ["/init-grafana.sh"]