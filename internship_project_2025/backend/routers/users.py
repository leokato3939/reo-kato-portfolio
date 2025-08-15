import io
import qrcode
import json
from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from database import get_db
from schemas import UserCreate, UserLogin, User, Token, MedicalInfo
from services.user_auth import UserAuthService
from services.dependencies import get_current_user_dep

"""
ユーザー向けAPIルーター

個人の医療情報登録・共有機能に関連するエンドポイントを提供
"""

# APIルーターを作成
router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}}
)


@router.post("/login", response_model=Token)
async def login_user(
    user_login: UserLogin,
    db: Session = Depends(get_db)
):
    """
    ユーザー認証とトークン発行
    
    - **email**: 登録済みのメールアドレス
    - **password**: パスワード
    
    成功時は JWT アクセストークンを返します
    """
    try:
        return UserAuthService.login_user(db, user_login)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ログイン処理中にエラーが発生しました"
        )

@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: User = Depends(get_current_user_dep)
):
    """
    現在認証されているユーザーの情報を取得
    
    JWT認証が必要です。
    自分自身のユーザー情報を取得できます。
    """
    return current_user

@router.get("/qr/{user_id}", response_model=MedicalInfo)
async def get_medical_info_for_qr(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    """
    特定ユーザーの医療情報を取得（QRコード用）
    
    - **user_id**: 対象ユーザーのUUID
    
    認証不要のエンドポイントです。
    個人特定情報（メールアドレス等）は除外し、
    医療従事者が必要とする情報のみを返します。
    """
    try:
        return UserAuthService.get_medical_info_by_user_id(db, user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="医療情報取得中にエラーが発生しました"
        )

# QRコード画像を返すエンドポイント
@router.get("/qr-image/{user_id}")
async def get_qr_image_for_medical_info(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dep)
):
    """
    特定ユーザーの医療情報データをQRコード画像(PNG)として返す
    - **user_id**: 対象ユーザーのUUID
    認証必須
    """
    try:
        print(f"[DEBUG] user_id: {user_id} (type: {type(user_id)})")
        print(f"[DEBUG] db: {db}")
        print(f"[DEBUG] current_user: {current_user}")
        # 医療情報データを取得
        medical_info = UserAuthService.get_medical_info_by_user_id(db, user_id)
        print(f"[DEBUG] medical_info: {medical_info} (type: {type(medical_info)})")
        if medical_info is None:
            print("[ERROR] medical_info is None")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="医療情報が見つかりません"
            )
        # dict化できるか確認
        if hasattr(medical_info, "dict"):
            try:
                mi_dict = medical_info.dict()

            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"medical_info.dict()失敗: {e}"
                )
        else:
            mi_dict = medical_info
        # JSONをURLエンコードしてWebビューアURLに埋め込む
        import urllib.parse
        try:
            json_str = json.dumps(mi_dict, ensure_ascii=False, default=str)
            print(f"[DEBUG] json_str: {json_str}")
            # localhostでアクセス可能なURL
            base_url = "http://localhost:3000/medical-info-viewer?data="
            qr_data = base_url + urllib.parse.quote(json_str)
            print(f"[DEBUG] QRコードURL: {qr_data}")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"json.dumps/url-encode失敗: {e}"
            )
        # QRコード生成
        try:
            img = qrcode.make(qr_data)
            print(f"[DEBUG] QRコード生成成功")
        except Exception as e:
            print(f"[ERROR] qrcode.make failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"qrcode.make失敗: {e}"
            )
        # PNG保存
        try:
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            buf.seek(0)
            print(f"[DEBUG] PNG保存成功 バッファサイズ: {buf.getbuffer().nbytes}")
        except Exception as e:
            print(f"[ERROR] img.save failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"img.save失敗: {e}"
            )
        return StreamingResponse(buf, media_type="image/png")
    except HTTPException as he:
        print(f"[HTTPException] {he.detail}")
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[UNEXPECTED ERROR] {e}\n{tb}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"QRコード画像生成中にエラー: {e}"
        )
    