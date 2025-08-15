"""
スキーマパッケージ

すべてのPydanticスキーマをインポートしてまとめて管理
"""

from .user import (
    UserCreate,
    UserLogin,
    User,
    Medication,
    MedicalInfo,
    Token,
    TokenData
)

from .inventory import (
    Shelter,
    AdminLogin,
    AdminLoginResponse,
    ShelterAdmin,
    InventoryUpdate,
    MedicationInventory,
    InventoryInfo
)

__all__ = [
    "UserCreate", 
    "UserLogin",
    "User",
    "Medication",
    "MedicalInfo",
    "Token",
    "TokenData",
    "Shelter",
    "AdminLogin",
    "AdminLoginResponse",
    "ShelterAdmin",
    "InventoryUpdate",
    "MedicationInventory",
    "InventoryInfo"
]
