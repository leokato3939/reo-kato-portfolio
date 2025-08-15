"""
避難所管理者向けAPIルーター

医薬品在庫情報の管理と閲覧機能に関連するエンドポイントを提供
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas import AdminLogin, InventoryInfo, InventoryUpdate, AdminLoginResponse
from services.admin_auth import AdminAuthService
from services.dependencies import get_current_admin_dep
from models import ShelterAdmin, Shelter
from schemas.inventory import AdminSettings
import re

# APIルーターを作成
router = APIRouter(
    prefix="/admins",
    tags=["admins"],
    responses={404: {"description": "Not found"}}
)




# 管理者設定取得
@router.get("/me/settings", response_model=AdminSettings)
async def get_admin_settings(
    db: Session = Depends(get_db),
    current_admin: ShelterAdmin = Depends(get_current_admin_dep)
):
    """
    管理者設定情報の取得
    
    管理者名、電話番号、避難所の集約範囲を取得します。
    
    管理者JWT認証が必要です。
    """
    try:
        # 管理者に関連する避難所情報を取得
        shelter = db.query(Shelter).filter(Shelter.shelter_id == current_admin.shelter_id).first()
        
        return AdminSettings(
            name=current_admin.name,
            phone=current_admin.phone,
            aggregate_range=shelter.aggregate_range if shelter else None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="設定情報取得中にエラーが発生しました"
        )


# 管理者設定更新
@router.put("/me/settings", response_model=AdminSettings)
async def update_admin_settings(
    settings: AdminSettings,
    db: Session = Depends(get_db),
    current_admin: ShelterAdmin = Depends(get_current_admin_dep)
):
    """
    管理者設定情報の更新
    - 管理者名は全角スペースを半角スペース1つに自動変換
    """
    # 全角スペースを半角スペース1つに変換(正規化)
    normalized_name = re.sub(r'\u3000+', ' ', settings.name)
    current_admin.name = normalized_name
    current_admin.phone = settings.phone
    
    # 集計範囲はshelterテーブル側
    if current_admin.shelter and settings.aggregate_range is not None:
        current_admin.shelter.aggregate_range = settings.aggregate_range
    
    db.commit()
    db.refresh(current_admin)
    
    return AdminSettings(
        name=current_admin.name,
        phone=current_admin.phone,
        aggregate_range=current_admin.shelter.aggregate_range if current_admin.shelter else None,
    )


@router.post("/login", response_model=AdminLoginResponse)
async def login_admin(
    admin_login: AdminLogin,
    db: Session = Depends(get_db)
):
    """
    管理者認証とトークン発行
    
    - **email**: 管理者のメールアドレス
    - **password**: パスワード
    
    成功時は JWT アクセストークンを返します
    """
    try:
        return AdminAuthService.login_admin(db, admin_login)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="管理者ログイン処理中にエラーが発生しました"
        )


@router.get("/inventory", response_model=list[InventoryInfo])
async def get_all_inventory(
    db: Session = Depends(get_db),
    current_admin: ShelterAdmin = Depends(get_current_admin_dep)
):
    """
    全避難所の医薬品在庫情報を取得
    
    管理者JWT認証が必要です。
    全避難所の在庫状況を一覧で取得できます。
    
    レスポンス情報：
    - 在庫ID、避難所名、住所
    - 医薬品名、在庫数量
    - 避難所の位置情報（緯度・経度）
    """
    try:
        return AdminAuthService.get_all_inventory_info(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="在庫情報取得中にエラーが発生しました"
        )


# 在庫管理用のルーター（別prefix）
inventory_router = APIRouter(
    prefix="/admins",
    tags=["inventory"],
    responses={404: {"description": "Not found"}}
)


@inventory_router.put("/inventory/{medication_name}", response_model=InventoryInfo)
async def update_shelter_inventory(
    medication_name: str,
    inventory_update: InventoryUpdate,
    db: Session = Depends(get_db),
    current_admin: ShelterAdmin = Depends(get_current_admin_dep)
):
    """
    担当避難所の在庫を更新
    
    - **medication_name**: 医薬品名
    - **quantity**: 更新後の在庫数量
    
    管理者JWT認証が必要です。
    管理者は自分が担当する避難所の在庫のみ更新可能です。
    """
    try:
        return AdminAuthService.update_shelter_inventory(
            db, medication_name, inventory_update, current_admin
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="在庫更新中にエラーが発生しました"
        )


@inventory_router.get("/my-shelter/inventory", response_model=list[InventoryInfo])
async def get_my_shelter_inventory(
    db: Session = Depends(get_db),
    current_admin: ShelterAdmin = Depends(get_current_admin_dep)
):
    """
    担当避難所の在庫情報を取得
    
    管理者JWT認証が必要です。
    自分が担当する避難所の全在庫情報を取得できます。
    """
    try:
        return AdminAuthService.get_shelter_inventory_info(db, current_admin.shelter_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="避難所在庫情報取得中にエラーが発生しました"
        )