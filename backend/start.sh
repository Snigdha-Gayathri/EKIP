#!/bin/bash

# Startup script for EKIP Backend on Render

# Use PORT environment variable from Render, default to 8000
PORT=${PORT:-8000}

echo "Starting EKIP Backend on port $PORT..."

# Start uvicorn with the PORT from environment
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
