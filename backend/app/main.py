import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, generate_latest, Counter, Histogram
from loguru import logger
from app.core.config import settings

# Setup Prometheus Monitoring Metric Trackers
REGISTRY = CollectorRegistry()
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total", 
    "Total count of HTTP requests", 
    ["method", "endpoint", "status"],
    registry=REGISTRY
)
HTTP_REQUEST_DURATION = Histogram(
    "http_request_duration_seconds", 
    "HTTP requests latency duration histograms", 
    ["method", "endpoint"],
    registry=REGISTRY
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Apply CORS middleware overrides
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tenant Schema Isolation Connection Middleware
@app.middleware("http")
async def tenant_context_middleware(request: Request, call_next):
    # Extract Tenant Header
    tenant_id = request.headers.get("X-Tenant-ID", "public")
    
    # Store tenant context in active thread local state
    # (Enables the SQLAlchemy connection context router to focus operations on specific schema namespaces)
    request.state.tenant_id = tenant_id
    
    start_time = time.time()
    
    # Process requests
    try:
        response: Response = await call_next(request)
    except Exception as e:
        logger.error(f"Uncaught Server Exception: {str(e)} on URL: {request.url.path}")
        response = Response("Internal Server Error", status_code=500)
    
    # Record execution latencies & counter metrics
    duration = time.time() - start_time
    method = request.method
    endpoint = request.url.path
    status = response.status_code
    
    HTTP_REQUESTS_TOTAL.labels(method=method, endpoint=endpoint, status=status).inc()
    HTTP_REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
    
    # Append header to track workspace contexts
    response.headers["X-Active-Workspace-Context"] = tenant_id
    return response

# Standard Healthcheck Endpoints
@app.get("/health", tags=["Compliance"])
async def server_healthcheck():
    return {"status": "operational", "timestamp": time.time()}

# Prometheus Metrics Scraping path
@app.get("/metrics", tags=["Compliance"])
async def metrics_endpoint():
    data = generate_latest(REGISTRY)
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

# Include API Routers
from app.api.v1.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Main router entry points
@app.get("/", tags=["Root"])
async def api_root():
    return {
        "app": settings.PROJECT_NAME,
        "version": "1.0.0-Beta",
        "documentation": "/docs"
    }
