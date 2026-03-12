#!/bin/sh
# docker/scripts/healthcheck.sh
# Health check script for RTR MRP container

# Check if the app is responding
response=$(wget --no-verbose --tries=1 --spider http://localhost:3000/api/health 2>&1)

if echo "$response" | grep -q "200"; then
  exit 0
else
  exit 1
fi
