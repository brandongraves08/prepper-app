FROM nvidia/cuda:12.1.1-devel-ubuntu22.04

WORKDIR /app

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install vLLM and dependencies
RUN pip3 install --no-cache-dir \
    vllm \
    fastapi \
    uvicorn \
    psutil

# Copy the server script
COPY vllm_server.py /app/

# Expose the port
EXPOSE 8001

# Start the server
CMD ["python3", "vllm_server.py"]
