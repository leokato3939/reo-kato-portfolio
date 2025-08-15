"""
ユーザー認証サービス

ユーザーの登録、ログイン、医療情報取得の業務ロジックを管理
"""

from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from models import User, Medication
from schemas import UserCreate, UserLogin, Token, User as UserSchema, MedicalInfo
from services.auth import AuthService


class UserAuthService:
    """ユーザー認証サービス"""
    
    @staticmethod
    def register_user(db: Session, user_create: UserCreate) -> UserSchema:
        """新規ユーザー登録"""
        # メールアドレスの重複チェック
        db_user = db.query(User).filter(User.email == user_create.email).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このメールアドレスは既に登録されています"
            )
        
        # パスワードをハッシュ化
        hashed_password = AuthService.get_password_hash(user_create.password)
        
        # 新しいユーザーを作成
        db_user = User(
            email=user_create.email,
            password_hash=hashed_password,
            name=user_create.name,
            birthday=user_create.birthday,
            blood_type=user_create.blood_type,
            allergy_name=user_create.allergy_name,
            condition_name=user_create.condition_name
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return UserSchema.from_orm(db_user)
    
    @staticmethod
    def login_user(db: Session, user_login: UserLogin) -> Token:
        """ユーザーログイン"""
        # ユーザー認証
        user = AuthService.authenticate_user(db, user_login.email, user_login.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="メールアドレスまたはパスワードが正しくありません",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # アクセストークン作成
        access_token_expires = timedelta(minutes=30)
        access_token = AuthService.create_access_token(
            data={"sub": str(user.user_id), "type": "user"},
            expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token)
    
    @staticmethod
    def get_medical_info_by_user_id(db: Session, user_id: UUID) -> MedicalInfo:
        """ユーザーIDから医療情報を取得（QRコード用）"""
        # ユーザー情報を取得
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ユーザーが見つかりません"
            )
        
        # ユーザーの医薬品情報を取得
        medications = db.query(Medication).filter(Medication.user_id == user_id).all()
        
        # 医薬品情報をdictに変換
        medication_list = [
            {
                "name": med.name,
                "dosage": med.dosage,
                "schedule": med.schedule
            }
            for med in medications
        ]
        
        # 医療情報レスポンスを作成（個人特定情報を除外）
        return MedicalInfo(
            name=user.name,
            birthday=user.birthday,
            blood_type=user.blood_type,
            allergy_name=user.allergy_name,
            condition_name=user.condition_name,
            medications=medication_list
        )
