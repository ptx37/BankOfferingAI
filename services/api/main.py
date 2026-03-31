"""FastAPI application entry point for the Bank Offering AI API service."""

import hashlib
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel
from sqlalchemy import text

from services.api.routers import compliance, customers, offers, profiles, webhooks

logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [
    "https://bankofferingai.example.com",
    "http://localhost:3000",
    "http://172.24.208.80:3000",
]


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _verify_password(plain: str, hashed: str) -> bool:
    return _hash_password(plain) == hashed


async def _ensure_users_table(engine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                user_id      TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                role         TEXT NOT NULL DEFAULT 'customer',
                display_name TEXT NOT NULL,
                is_active    BOOLEAN NOT NULL DEFAULT TRUE
            )
        """))


async def _seed_default_users(engine) -> None:
    """Insert default users if they don't already exist."""
    emp_hash = _hash_password("employee123")
    adm_hash = _hash_password("admin123")
    cust_hash = _hash_password("customer123")

    rows = [
        ("demo-001",  emp_hash,  "employee", "Demo Employee"),
        ("admin-001", adm_hash,  "admin",    "Admin User"),
    ]
    for i in range(1, 51):
        cid = f"CUST-{i:03d}"
        rows.append((cid, cust_hash, "customer", f"Customer {i:03d}"))

    async with engine.begin() as conn:
        for user_id, password_hash, role, display_name in rows:
            await conn.execute(text("""
                INSERT INTO users (user_id, password_hash, role, display_name, is_active)
                VALUES (:uid, :ph, :role, :dn, true)
                ON CONFLICT (user_id) DO NOTHING
            """), {"uid": user_id, "ph": password_hash, "role": role, "dn": display_name})


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown lifecycle events."""
    logger.info("Starting up API service...")

    import redis.asyncio as aioredis
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/bankofferingai",
    )
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    engine = create_async_engine(database_url, pool_size=20, max_overflow=10)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    redis_client = aioredis.from_url(redis_url, decode_responses=True)

    app.state.db_engine = engine
    app.state.db_session_factory = session_factory
    app.state.redis = redis_client

    logger.info("Database and Redis connections established.")

    # Ensure users table exists and seed default users
    try:
        await _ensure_users_table(engine)
        await _seed_default_users(engine)
        logger.info("Users table ready.")
    except Exception as exc:
        logger.warning("User table setup skipped: %s", exc)

    # Seed customer data from Excel dataset
    try:
        import asyncio
        import redis as sync_redis

        from services.api.data_seeder import seed_all

        sync_redis_client = sync_redis.from_url(redis_url, decode_responses=True)
        await asyncio.to_thread(seed_all, sync_redis_client)
        sync_redis_client.close()
    except Exception as exc:
        logger.warning("Data seeding skipped: %s", exc)

    yield

    logger.info("Shutting down API service...")
    await redis_client.aclose()
    await engine.dispose()
    logger.info("Connections closed.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Bank Offering AI",
        description="Personalized bank product offering engine powered by AI",
        version="1.0.0",
        lifespan=lifespan,
        redirect_slashes=False,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Authorization", "Content-Type"],
    )

    Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        excluded_handlers=["/health", "/metrics"],
    ).instrument(app).expose(app, endpoint="/metrics")

    # Routers
    app.include_router(offers.router, prefix="/offers", tags=["offers"])
    app.include_router(customers.router, prefix="/customers", tags=["customers"])
    app.include_router(compliance.router, prefix="/compliance", tags=["compliance"])
    app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
    app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

    # Lazy-import admin router to avoid circular issues at module load time
    from services.api.routers import admin as admin_router
    app.include_router(admin_router.router, prefix="/admin", tags=["admin"])

    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "healthy", "service": "bank-offering-api"}

    class LoginRequest(BaseModel):
        username: str
        password: str

    @app.post("/auth/login", tags=["auth"])
    async def login(body: LoginRequest, request: Request):
        """Authenticate with username+password; returns JWT with role."""
        db_engine = request.app.state.db_engine
        try:
            async with db_engine.connect() as conn:
                result = await conn.execute(
                    text(
                        "SELECT password_hash, role, display_name FROM users "
                        "WHERE user_id = :uid AND is_active = true"
                    ),
                    {"uid": body.username},
                )
                row = result.fetchone()
        except Exception as exc:
            logger.error("DB error during login: %s", exc)
            raise HTTPException(status_code=503, detail="Authentication service unavailable")

        if not row or not _verify_password(body.password, row.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        from jose import jwt as jose_jwt

        secret = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
        payload = {
            "customer_id": body.username,
            "sub": body.username,
            "role": row.role,
            "display_name": row.display_name,
            "aud": os.getenv("JWT_AUDIENCE", "bank-offering-api"),
            "iss": os.getenv("JWT_ISSUER", "bank-auth-service"),
            "exp": datetime.utcnow() + timedelta(hours=24),
        }
        token = jose_jwt.encode(payload, secret, algorithm="HS256")
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": row.role,
            "display_name": row.display_name,
            "customer_id": body.username,
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("services.api.main:app", host="0.0.0.0", port=8000, reload=True)
