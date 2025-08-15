from pydantic import Field
from datetime import datetime, date
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, EmailStr


# 避難所関連スキーマ
class Shelter(BaseModel):
    """避難所レスポンススキーマ"""
    shelter_id: UUID
    name: str
    address: str
    latitude: float
    longitude: float
    aggregate_range: str # 集約範囲（例: 3km圏内など）
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# 避難所管理者関連スキーマ
class ShelterAdmin(BaseModel):
    """避難所管理者レスポンススキーマ"""
    admin_id: UUID
    email: EmailStr
    name: str
    phone: Optional[str] = None
    shelter_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# 管理者ログイン関連スキーマ
class AdminLogin(BaseModel):
    """管理者ログインスキーマ"""
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    """管理者ログインレスポンススキーマ"""
    access_token: str
    token_type: str = "bearer"
    admin_id: UUID


# 管理者設定スキーマ
class AdminSettings(BaseModel):
    name: str = Field(..., description="管理者名")
    phone: Optional[str] = Field(None, description="連絡先")
    aggregate_range: Optional[str] = Field(None, description="集約範囲（例: 3km圏内など）")

    class Config:
        from_attributes = True


# 在庫関連スキーマ
class InventoryUpdate(BaseModel):
    """在庫更新スキーマ"""
    quantity: int


class MedicationInventory(BaseModel):
    """在庫レスポンススキーマ"""
    inventory_id: int
    shelter_id: UUID
    medication_name: str
    quantity: int
    expiry_date: Optional[date] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class InventoryInfo(BaseModel):
    """在庫情報スキーマ"""
    shelter_name: str
    medication_name: str
    quantity: int
    expiry_date: Optional[date] = None
    description: Optional[str] = None
    required_quantity: Optional[int] = Field(None, description="必要在庫数（集約範囲内ユーザーの医薬品数）")
    
    class Config:
        from_attributes = True
