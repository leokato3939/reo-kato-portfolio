from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


# ユーザー関連スキーマ
class UserCreate(BaseModel):
    """ユーザー作成スキーマ"""
    email: EmailStr
    name: str
    birthday: date
    blood_type: Optional[str] = None
    allergy_name: Optional[str] = None
    condition_name: str
    password: str


class UserLogin(BaseModel):
    """ユーザーログインスキーマ"""
    email: EmailStr
    password: str


class User(BaseModel):
    """ユーザーレスポンススキーマ"""
    user_id: UUID
    email: EmailStr
    name: str
    birthday: date
    blood_type: Optional[str] = None
    allergy_name: Optional[str] = None
    condition_name: str
    latitude: float
    longitude: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# 医薬品関連スキーマ
class Medication(BaseModel):
    """医薬品レスポンススキーマ"""
    medication_id: int
    user_id: UUID
    name: str
    dosage: str
    schedule: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# QRコード用医療情報スキーマ
class MedicalInfo(BaseModel):
    """QRコード用医療情報スキーマ（個人特定情報を除外）"""
    name: str
    birthday: date
    blood_type: Optional[str] = None
    allergy_name: Optional[str] = None
    condition_name: str
    medications: list[dict]  # MedicationBaseの代わりにdictを使用
    
    class Config:
        from_attributes = True


# トークン関連スキーマ
class Token(BaseModel):
    """トークンスキーマ"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """トークンデータスキーマ"""
    user_id: Optional[UUID] = None
    user_type: Optional[str] = None  # "user" or "admin"
