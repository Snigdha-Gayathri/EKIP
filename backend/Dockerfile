FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir .

COPY . .

# Make startup script executable
RUN chmod +x start.sh

EXPOSE 8000

# Use startup script that handles PORT environment variable
CMD ["./start.sh"]
