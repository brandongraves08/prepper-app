# Enhanced vLLM HTTP server for local inference
# Requires: pip install vllm fastapi uvicorn psutil

from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
import sys
import time
import platform
import psutil
import logging
import uvicorn
from typing import Optional, Dict, Any, List
from vllm import LLM, SamplingParams

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("vllm_server")

# Environment variables
MODEL_PATH = os.environ.get("VLLM_MODEL_PATH", "TheBloke/Mistral-7B-Instruct-v0.2-GGUF")
PORT = int(os.environ.get("VLLM_SERVER_PORT", 8001))
HOST = os.environ.get("VLLM_SERVER_HOST", "0.0.0.0")
ENABLE_CORS = os.environ.get("VLLM_ENABLE_CORS", "true").lower() == "true"

# Create FastAPI app
app = FastAPI(
    title="vLLM API Server",
    description="API server for local LLM inference using vLLM",
    version="1.0.0"
)

# Add CORS middleware if enabled
if ENABLE_CORS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Global variables
llm = None
start_time = time.time()

class QueryRequest(BaseModel):
    prompt: str
    max_tokens: int = Field(default=256, ge=1, le=4096, description="Maximum number of tokens to generate")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for sampling")
    top_p: float = Field(default=0.95, ge=0.0, le=1.0, description="Top-p sampling parameter")
    stop_sequences: Optional[List[str]] = Field(default=None, description="Sequences that stop generation")
    repetition_penalty: Optional[float] = Field(default=None, ge=0.0, description="Repetition penalty parameter")
    
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    uptime_seconds: float
    
class SystemInfoResponse(BaseModel):
    hostname: str
    platform: str
    python_version: str
    cpu_count: int
    cpu_percent: float
    memory_used_gb: float
    memory_total_gb: float
    model_path: str

def get_system_info() -> Dict[str, Any]:
    """Get system information"""
    memory = psutil.virtual_memory()
    return {
        "hostname": platform.node(),
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "cpu_count": psutil.cpu_count(logical=True),
        "cpu_percent": psutil.cpu_percent(),
        "memory_used_gb": memory.used / (1024 ** 3),
        "memory_total_gb": memory.total / (1024 ** 3),
        "model_path": MODEL_PATH
    }

@app.on_event("startup")
def load_model():
    """Load the LLM model on startup"""
    global llm
    try:
        logger.info(f"Loading model from: {MODEL_PATH}")
        llm = LLM(model=MODEL_PATH)
        logger.info(f"Successfully loaded model: {MODEL_PATH}")
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        # We don't raise an exception here to allow the server to start
        # even if the model fails to load initially

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model_loaded": llm is not None,
        "uptime_seconds": time.time() - start_time
    }

@app.get("/system", response_model=SystemInfoResponse)
def system_info():
    """Get system information"""
    return get_system_info()

@app.post("/generate", status_code=status.HTTP_200_OK)
def generate(request: QueryRequest):
    """Generate text based on the provided prompt"""
    if llm is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Model not loaded. Please try again later."
        )
    
    try:
        # Create sampling parameters
        sampling_params_dict = {
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p,
        }
        
        # Add optional parameters if provided
        if request.stop_sequences:
            sampling_params_dict["stop"] = request.stop_sequences
        if request.repetition_penalty is not None:
            sampling_params_dict["repetition_penalty"] = request.repetition_penalty
            
        sampling_params = SamplingParams(**sampling_params_dict)
        
        # Generate text
        start = time.time()
        outputs = llm.generate([request.prompt], sampling_params)
        generation_time = time.time() - start
        
        # Extract and return the generated text
        generated_text = outputs[0].outputs[0].text.strip()
        
        logger.info(f"Generated {len(generated_text)} chars in {generation_time:.2f}s")
        
        return {
            "response": generated_text,
            "generation_time_seconds": generation_time
        }
    except Exception as e:
        logger.error(f"Error during generation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {str(e)}"
        )

@app.post("/reload-model")
def reload_model():
    """Reload the model (for admin use)"""
    try:
        global llm
        if llm is not None:
            # Clean up old model if possible
            del llm
        
        logger.info(f"Reloading model from: {MODEL_PATH}")
        llm = LLM(model=MODEL_PATH)
        logger.info(f"Successfully reloaded model: {MODEL_PATH}")
        
        return {"status": "success", "message": f"Model {MODEL_PATH} reloaded successfully"}
    except Exception as e:
        logger.error(f"Failed to reload model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reload model: {str(e)}"
        )

if __name__ == "__main__":
    logger.info(f"Starting vLLM server on {HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT)
