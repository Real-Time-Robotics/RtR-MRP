#!/bin/sh
# docker/scripts/healthcheck.sh
# Use 127.0.0.1 explicitly (not localhost which may resolve to ::1 in Alpine)
wget -q --spider http://127.0.0.1:3000/api/health
