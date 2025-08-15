from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import settings
from models import User, ShelterAdmin
from schemas import TokenData

# パスワードハッシュ化のコンテキスト
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Bearer認証スキーム
security = HTTPBearer()


class AuthService:
    """認証サービスクラス"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """プレーンテキストパスワードとハッシュを比較"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """パスワードをハッシュ化"""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """アクセストークンを作成"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[TokenData]:
        """トークンを検証し、トークンデータを返す"""
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            user_id: str = payload.get("sub")
            user_type: str = payload.get("type")  # "user" or "admin"
            
            if user_id is None:
                return None
            
            return TokenData(user_id=UUID(user_id), user_type=user_type)
        except JWTError:
            return None
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """ユーザーを認証"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not AuthService.verify_password(password, user.password_hash):
            return None
        return user
    
    @staticmethod
    def authenticate_admin(db: Session, email: str, password: str) -> Optional[ShelterAdmin]:
        """管理者を認証"""
        admin = db.query(ShelterAdmin).filter(ShelterAdmin.email == email).first()
        if not admin:
            return None
        if not AuthService.verify_password(password, admin.password_hash):
            return None
        return admin


def get_current_user(credentials: HTTPAuthorizationCredentials, db: Session) -> User:
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


def get_current_admin(credentials: HTTPAuthorizationCredentials, db: Session) -> ShelterAdmin:
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


def check_shelter_permission(admin: ShelterAdmin, shelter_id: UUID):
    """管理者が指定された避難所の権限を持っているかチェック"""
    if admin.shelter_id != shelter_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この避難所への操作権限がありません"
        )
