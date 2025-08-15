from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Numeric, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from database import Base


class Shelter(Base):
    """避難所テーブル"""
    __tablename__ = "shelters"
    
    shelter_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=False)
    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    aggregate_range = Column(String(255), nullable=False)  # 集計範囲
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # リレーションシップ
    admins = relationship("ShelterAdmin", back_populates="shelter")
    inventory = relationship("MedicationInventory", back_populates="shelter", cascade="all, delete-orphan")


class ShelterAdmin(Base):
    """避難所管理者テーブル"""
    __tablename__ = "shelter_admins"
    
    admin_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    shelter_id = Column(UUID(as_uuid=True), ForeignKey("shelters.shelter_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # リレーションシップ
    shelter = relationship("Shelter", back_populates="admins")
class MedicationInventory(Base):
    """医薬品在庫テーブル"""
    __tablename__ = "medication_inventory"
    
    inventory_id = Column(Integer, primary_key=True, autoincrement=True)
    shelter_id = Column(UUID(as_uuid=True), ForeignKey("shelters.shelter_id"), nullable=False)
    medication_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    expiry_date = Column(Date, nullable=True)  # 有効期限
    description = Column(Text, nullable=True)  # 薬品の概要
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # リレーションシップ
    shelter = relationship("Shelter", back_populates="inventory")
