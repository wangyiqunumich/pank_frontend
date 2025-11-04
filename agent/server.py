#!/usr/bin/env python3
"""
PlannerAgent API Server
FastAPI server for serving PlannerAgent queries via HTTP
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import time
import logging
from contextlib import asynccontextmanager

# Import the main chat function
from main import chat_one_round
from utils import reset_cypher_queries

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize agents on startup, cleanup on shutdown"""
    logger.info("=" * 60)
    logger.info("Starting PlannerAgent API Server...")
    logger.info("=" * 60)
    
    # Pre-initialize agents to avoid first-request delay
    try:
        logger.info("Pre-loading Text2Cypher agent...")
        start_time = time.time()
        
        from PankBaseAgent.utils import _get_text2cypher_agent, _get_pankbase_session
        _get_text2cypher_agent()  # Initialize the agent
        _get_pankbase_session()   # Initialize the session
        
        elapsed = time.time() - start_time
        logger.info(f"✓ Agents initialized successfully in {elapsed:.2f}s")
        logger.info("=" * 60)
        logger.info("Server is ready to accept requests!")
        logger.info("=" * 60)
    except Exception as e:
        logger.error(f"✗ Failed to initialize agents: {e}")
        raise
    
    yield  # Server runs here
    
    # Cleanup on shutdown
    logger.info("Shutting down server...")


# Create FastAPI app
app = FastAPI(
    title="PlannerAgent API",
    description="API for querying biomedical knowledge graph using natural language",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class QueryRequest(BaseModel):
    question: str = Field(..., description="Natural language question about genes, diseases, etc.")
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "What is the function of gene TP53?"
            }
        }


class QueryResponse(BaseModel):
    answer: str = Field(..., description="Formatted answer from the knowledge graph")
    processing_time_ms: float = Field(..., description="Time taken to process the query in milliseconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "TP53 is a tumor suppressor gene...",
                "processing_time_ms": 1234.56
            }
        }


class HealthResponse(BaseModel):
    status: str
    message: str
    uptime_seconds: Optional[float] = None


# Global variable to track server start time
SERVER_START_TIME = time.time()


# API Endpoints
@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API information"""
    return {
        "service": "PlannerAgent API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "query": "POST /query - Submit a natural language question",
            "health": "GET /health - Check server health",
            "docs": "GET /docs - Interactive API documentation"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    uptime = time.time() - SERVER_START_TIME
    return HealthResponse(
        status="healthy",
        message="Server is running and ready to accept requests",
        uptime_seconds=uptime
    )


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Process a natural language query about genes, diseases, SNPs, etc.
    
    The query will be processed through multiple specialized agents:
    - PankBaseAgent: Knowledge graph queries
    - GLKBAgent: Literature search
    - TemplateToolAgent: Template matching
    - FormatAgent: Response formatting
    
    Returns a formatted answer with relevant information.
    """
    start_time = time.time()
    
    try:
        # Validate input
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        question = request.question.strip()
        logger.info(f"Received query: {question[:100]}...")
        
        # Reset cypher queries for new request
        reset_cypher_queries()
        
        # Process the query using the main chat function
        messages = []
        _, response = chat_one_round(messages, question)
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        logger.info(f"Query processed successfully in {processing_time:.2f}ms")
        
        return QueryResponse(
            answer=response,
            processing_time_ms=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc)
        }
    )


# For local development
if __name__ == "__main__":
    import uvicorn
    import os
    import sys
    
    # Get port from command line argument, environment variable, or use default
    port = 8080  # Default port
    
    # Check for command line argument: python server.py 9000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Error: Invalid port '{sys.argv[1]}'. Using default port {port}")
    # Check for environment variable: PORT=9000 python server.py
    elif "PORT" in os.environ:
        try:
            port = int(os.getenv("PORT"))
        except ValueError:
            print(f"Error: Invalid PORT environment variable. Using default port {port}")
    
    print("\n" + "=" * 60)
    print("Starting PlannerAgent API Server (Development Mode)")
    print("=" * 60)
    print(f"\nServer will be available at:")
    print(f"  - http://localhost:{port}")
    print(f"  - API docs: http://localhost:{port}/docs")
    print(f"  - Health check: http://localhost:{port}/health")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 60 + "\n")
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=False,  # Set to True for development auto-reload
        log_level="info"
    )

