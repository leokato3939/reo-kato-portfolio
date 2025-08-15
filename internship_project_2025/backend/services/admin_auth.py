"""
管理者認証サービス

避難所管理者の認証と在庫管理の業務ロジックを管理
"""

from datetime import timedelta
from collections import Counter
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from models import ShelterAdmin, Shelter, MedicationInventory, User, Medication
from schemas import AdminLogin, InventoryInfo, InventoryUpdate, AdminLoginResponse
from services.auth import AuthService
from utils.geo_utils import is_within_range


class AdminAuthService:
    """管理者認証サービス"""
    
    @staticmethod
    def login_admin(db: Session, admin_login: AdminLogin) -> AdminLoginResponse:
        """管理者ログイン"""
        # 管理者認証
        admin = AuthService.authenticate_admin(db, admin_login.email, admin_login.password)
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="メールアドレスまたはパスワードが正しくありません",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # アクセストークン作成
        access_token_expires = timedelta(minutes=30)
        access_token = AuthService.create_access_token(
            data={"sub": str(admin.admin_id), "type": "admin"},
            expires_delta=access_token_expires
        )
        
        return AdminLoginResponse(
            access_token=access_token,
            admin_id=admin.admin_id
        )
    
    @staticmethod
    def get_all_inventory_info(db: Session) -> list[InventoryInfo]:
        """全避難所の在庫情報を取得"""
        # 在庫情報と避難所情報を結合して取得
        inventory_data = (
            db.query(MedicationInventory, Shelter)
            .join(Shelter, MedicationInventory.shelter_id == Shelter.shelter_id)
            .all()
        )
        
        # レスポンススキーマに変換
        inventory_list = []
        for inventory, shelter in inventory_data:
            # 各避難所の集約範囲内のユーザーの医薬品需要を計算
            try:
                range_km = float(shelter.aggregate_range)
            except (ValueError, TypeError):
                range_km = 3.0  # デフォルト3km
            
            # 集約範囲内のユーザーの医薬品需要を計算
            medication_demand = AdminAuthService._calculate_medication_demand(
                db, float(shelter.latitude), float(shelter.longitude), range_km
            )
            
            required_quantity = medication_demand.get(inventory.medication_name, 0)
            
            inventory_info = InventoryInfo(
                shelter_name=shelter.name,
                medication_name=inventory.medication_name,
                quantity=inventory.quantity,
                expiry_date=inventory.expiry_date,
                description=inventory.description,
                required_quantity=required_quantity
            )
            inventory_list.append(inventory_info)
        
        return inventory_list
    
    @staticmethod
    def get_shelter_inventory_info(db: Session, shelter_id: UUID) -> list[InventoryInfo]:
        """指定された避難所の在庫情報を取得（医薬品需要を含む）"""
        return AdminAuthService.get_shelter_inventory_with_demand(db, shelter_id)
    
    @staticmethod
    def update_shelter_inventory(
        db: Session, 
        medication_name: str,
        inventory_update: InventoryUpdate,
        admin: ShelterAdmin
    ) -> InventoryInfo:
        """担当避難所の在庫を更新"""
        shelter_id = admin.shelter_id
        
        # 避難所の存在確認
        shelter = db.query(Shelter).filter(Shelter.shelter_id == shelter_id).first()
        if not shelter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="担当避難所が見つかりません"
            )
        
        # 在庫情報を取得または作成
        inventory = db.query(MedicationInventory).filter(
            MedicationInventory.shelter_id == shelter_id,
            MedicationInventory.medication_name == medication_name
        ).first()
        
        if inventory:
            # 既存の在庫を更新（在庫数のみ）
            inventory.quantity = inventory_update.quantity
        else:
            # 新しい在庫レコードを作成
            inventory = MedicationInventory(
                shelter_id=shelter_id,
                medication_name=medication_name,
                quantity=inventory_update.quantity
            )
            db.add(inventory)
        
        db.commit()
        db.refresh(inventory)
        
        # レスポンススキーマに変換して返す
        return InventoryInfo(
            shelter_name=shelter.name,
            medication_name=inventory.medication_name,
            quantity=inventory.quantity,
            expiry_date=inventory.expiry_date,
            description=inventory.description
        )

    @staticmethod
    def get_shelter_inventory_with_demand(db: Session, shelter_id: UUID) -> list[InventoryInfo]:
        """避難所の在庫情報に必要在庫数を含めて取得"""
        # 避難所情報を取得
        shelter = db.query(Shelter).filter(Shelter.shelter_id == shelter_id).first()
        if not shelter:
            raise HTTPException(status_code=404, detail="避難所が見つかりません")
        
        # aggregate_rangeをkmに変換（"3"などの文字列から数値へ）
        try:
            range_km = float(shelter.aggregate_range)
        except (ValueError, TypeError):
            range_km = 3.0  # デフォルト3km
        
        # 避難所の在庫情報を取得
        inventory_data = (
            db.query(MedicationInventory, Shelter)
            .join(Shelter, MedicationInventory.shelter_id == Shelter.shelter_id)
            .filter(MedicationInventory.shelter_id == shelter_id)
            .all()
        )
        
        # 集約範囲内のユーザーの医薬品需要を計算
        medication_demand = AdminAuthService._calculate_medication_demand(
            db, float(shelter.latitude), float(shelter.longitude), range_km
        )
        
        # レスポンススキーマに変換
        inventory_list = []
        for inventory, shelter_info in inventory_data:
            required_quantity = medication_demand.get(inventory.medication_name, 0)
            
            inventory_info = InventoryInfo(
                shelter_name=shelter_info.name,
                medication_name=inventory.medication_name,
                quantity=inventory.quantity,
                expiry_date=inventory.expiry_date,
                description=inventory.description,
                required_quantity=required_quantity
            )
            inventory_list.append(inventory_info)
        
        return inventory_list

    @staticmethod
    def _get_users_in_range(db: Session, shelter_lat: float, shelter_lon: float, range_km: float) -> list[User]:
        """集約範囲内のユーザーを取得"""
        # 全ユーザーを取得して距離でフィルタリング
        all_users = db.query(User).all()
        users_in_range = []
        
        for user in all_users:
            if is_within_range(
                float(user.latitude), float(user.longitude),
                shelter_lat, shelter_lon, range_km
            ):
                users_in_range.append(user)
        
        return users_in_range

    @staticmethod
    def _calculate_medication_demand(db: Session, shelter_lat: float, shelter_lon: float, range_km: float) -> dict[str, int]:
        """集約範囲内のユーザーの医薬品需要を計算"""
        # 集約範囲内のユーザーを取得
        users_in_range = AdminAuthService._get_users_in_range(db, shelter_lat, shelter_lon, range_km)
        
        if not users_in_range:
            return {}
        
        # ユーザーIDのリストを作成
        user_ids = [user.user_id for user in users_in_range]
        
        # これらのユーザーの医薬品情報を取得
        medications = db.query(Medication).filter(Medication.user_id.in_(user_ids)).all()
        
        # 医薬品名ごとにカウント
        medication_counter = Counter()
        for medication in medications:
            medication_counter[medication.name] += 1
        
        return dict(medication_counter)
