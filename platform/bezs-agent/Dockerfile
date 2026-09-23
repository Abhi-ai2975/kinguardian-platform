FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libfreetype6-dev \
    libart-2.0-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with timeout handling and retry logic
RUN pip install --no-cache-dir -r requirements.txt \
    --timeout 300 \
    --retries 3 \
    --index-url https://pypi.org/simple/ \
    --trusted-host pypi.org \
    --upgrade pip

# Copy the application code
COPY . .


# Expose port for FastAPI
EXPOSE 8000

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Default command - run the FastAPI server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
