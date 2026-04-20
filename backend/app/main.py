from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.auth.routes import router as auth_router
from app.azure_resources.routes import router as resource_router
from app.assessment.routes import router as assessment_router
from app.report.routes import router as report_router

settings = get_settings()

app = FastAPI(
    title="EA to CSP Assessment Platform",
    description="Assess Azure resources for migration from EA/Web Direct to CSP",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(resource_router, prefix="/api/resources", tags=["Azure Resources"])
app.include_router(assessment_router, prefix="/api/assessment", tags=["Assessment"])
app.include_router(report_router, prefix="/api/report", tags=["Report"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
