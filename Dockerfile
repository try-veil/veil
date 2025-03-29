# Use the official Golang image
FROM golang:1.23

# Set the working directory inside the container
WORKDIR /app

# Install xcaddy
RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Ensure Go bin directory is in PATH
ENV PATH="${PATH}:/go/bin"

# Copy the entire project to the working directory
COPY . .

# Setup the project
RUN make setup

# Build the project
RUN make build

# Make the caddy binary executable
RUN chmod +x ./veil

# Expose the port your application runs on
EXPOSE 2020

# Command to run the application
CMD ["./veil", "run", "--config", "Caddyfile"]