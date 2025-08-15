from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from database import Base


class User(Base):
    """ユーザーテーブル"""
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String(255), nullable=False)
    birthday = Column(Date, nullable=False)
    blood_type = Column(String(255), nullable=True)
    allergy_name = Column(String(255), nullable=True)
    condition_name = Column(String(255), nullable=False)
    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # リレーションシップ
    medications = relationship("Medication", back_populates="user", cascade="all, delete-orphan")


class Medication(Base):
    """医薬品テーブル"""
    __tablename__ = "medications"
    
    medication_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    dosage = Column(String(255), nullable=False)
    schedule = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # リレーションシップ
    user = relationship("User", back_populates="medications")
