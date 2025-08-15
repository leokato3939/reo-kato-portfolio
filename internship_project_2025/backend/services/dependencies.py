"""
認証依存関数

FastAPIの依存性注入で使用する認証関連の依存関数を定義
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from uuid import UUID

from database import get_db
from models import User, ShelterAdmin
from services.auth import security, AuthService


def get_current_user_dep(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """現在のユーザーを取得（依存性注入用）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報を検証できませんでした",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = AuthService.verify_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception
    
    if token_data.user_type != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ユーザー権限が必要です"
        )
    
    user = db.query(User).filter(User.user_id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_admin_dep(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> ShelterAdmin:
    """現在の管理者を取得（依存性注入用）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報を検証できませんでした",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = AuthService.verify_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception
    
    if token_data.user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です"
        )
    
    admin = db.query(ShelterAdmin).filter(ShelterAdmin.admin_id == token_data.user_id).first()
    if admin is None:
        raise credentials_exception
    return admin


def verify_shelter_permission_dep(shelter_id: UUID):
    """指定された避難所の管理権限を確認する依存関数を生成"""
    def _verify_permission(
        admin: ShelterAdmin = Depends(get_current_admin_dep)
    ) -> ShelterAdmin:
        if admin.shelter_id != shelter_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="この避難所への操作権限がありません"
            )
        return admin
    return _verify_permission
