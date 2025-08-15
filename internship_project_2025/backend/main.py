"""
災害時医薬品情報共有サービス API

個人の医療情報管理と避難所の医薬品在庫管理を統合したAPIサービス
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from config import settings
from database import create_tables, SessionLocal
from routers import users, shelter_admins
from exceptions import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from models import Shelter

# FastAPIアプリケーションを作成
app = FastAPI(
    title="災害時医薬品情報共有サービス",
    description="災害時における医薬品情報の安全かつ効率的な共有を実現するAPIサービス",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 例外ハンドラーを追加
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# データベーステーブルを作成
create_tables()

# 初期データが存在しない場合はサンプルデータを自動挿入
def init_sample_data():
    """アプリ起動時にサンプルデータがない場合は自動挿入"""
    db = SessionLocal()
    try:
        # 避難所データが存在するかチェック
        existing_shelters = db.query(Shelter).count()
        if existing_shelters == 0:
            print("初期データが見つかりません。サンプルデータを自動挿入します...")
            # db_manager.pyの関数を使用してサンプルデータを挿入
            from db_manager import insert_sample_data
            insert_sample_data()
        else:
            print(f"既存データが見つかりました (避難所数: {existing_shelters})")
    finally:
        db.close()

# サンプルデータの初期化
init_sample_data()

# APIルーターを登録
app.include_router(users.router, prefix="/api")
app.include_router(shelter_admins.router, prefix="/api") 
app.include_router(shelter_admins.inventory_router, prefix="/api")  # 在庫管理用ルーター

@app.get("/")
async def root():
    """
    ルートエンドポイント - APIの動作確認用
    """
    return {
        "message": "災害時医薬品情報共有サービス API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """
    ヘルスチェックエンドポイント
    """
    return {"status": "healthy", "service": "disaster-medical-api"}
