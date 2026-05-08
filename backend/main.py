"""
Store Optimizer - FastAPI Backend
Deploy on Railway: railway up
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base, get_db
from routers import products, transactions, recommendations, zones, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title="Store Optimizer API",
    description="ML-powered retail store placement optimizer",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - allow Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(products.router,         prefix="/api/products",         tags=["Products"])
app.include_router(transactions.router,     prefix="/api/transactions",     tags=["Transactions"])
app.include_router(zones.router,            prefix="/api/zones",            tags=["Store Zones"])
app.include_router(recommendations.router,  prefix="/api/recommendations",  tags=["ML Recommendations"])
app.include_router(analytics.router,        prefix="/api/analytics",        tags=["Analytics"])

@app.get("/")
async def root():
    return {"status": "ok", "message": "Store Optimizer API running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
