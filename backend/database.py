"""
Database configuration - Neon PostgreSQL with async SQLAlchemy
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

# Convert postgres:// to postgresql+asyncpg://
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ─── ORM Models ──────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String(255), nullable=False)
    category        = Column(String(100), nullable=False)
    price           = Column(Numeric(10, 2), nullable=False)
    cost            = Column(Numeric(10, 2), nullable=False)
    stock_quantity  = Column(Integer, default=0)
    shelf_life_days = Column(Integer, default=365)
    weight_kg       = Column(Numeric(8, 3), default=0)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transaction_items = relationship("TransactionItem", back_populates="product")
    placements        = relationship("ProductPlacement", back_populates="product")


class StoreZone(Base):
    __tablename__ = "store_zones"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name             = Column(String(100), nullable=False)
    zone_type        = Column(String(50), nullable=False)
    visibility_score = Column(Integer, default=5)
    position_x       = Column(Integer, nullable=False)
    position_y       = Column(Integer, nullable=False)
    capacity         = Column(Integer, default=10)
    description      = Column(Text)

    placements = relationship("ProductPlacement", back_populates="zone")


class ProductPlacement(Base):
    __tablename__ = "product_placements"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"))
    zone_id    = Column(UUID(as_uuid=True), ForeignKey("store_zones.id", ondelete="CASCADE"))
    placed_at  = Column(DateTime, default=datetime.utcnow)
    is_current = Column(Boolean, default=True)

    product = relationship("Product", back_populates="placements")
    zone    = relationship("StoreZone", back_populates="placements")


class Transaction(Base):
    __tablename__ = "transactions"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_date = Column(DateTime, default=datetime.utcnow)
    total_amount     = Column(Numeric(10, 2), default=0)
    customer_id      = Column(String(100))
    notes            = Column(Text)

    items = relationship("TransactionItem", back_populates="transaction")


class TransactionItem(Base):
    __tablename__ = "transaction_items"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"))
    product_id     = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"))
    quantity       = Column(Integer, nullable=False, default=1)
    unit_price     = Column(Numeric(10, 2), nullable=False)

    transaction = relationship("Transaction", back_populates="items")
    product     = relationship("Product", back_populates="transaction_items")


class PlacementRecommendation(Base):
    __tablename__ = "placement_recommendations"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id          = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"))
    recommended_zone_id = Column(UUID(as_uuid=True), ForeignKey("store_zones.id", ondelete="CASCADE"))
    placement_score     = Column(Numeric(5, 2), nullable=False)
    reason              = Column(Text)
    generated_at        = Column(DateTime, default=datetime.utcnow)
    is_applied          = Column(Boolean, default=False)


class ProductAssociation(Base):
    __tablename__ = "product_associations"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_a    = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"))
    product_b    = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"))
    support      = Column(Numeric(8, 4))
    confidence   = Column(Numeric(8, 4))
    lift         = Column(Numeric(8, 4))
    calculated_at = Column(DateTime, default=datetime.utcnow)
