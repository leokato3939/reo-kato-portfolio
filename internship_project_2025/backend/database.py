from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# データベースエンジンの作成
engine = create_engine(settings.database_url)

# セッションローカルクラスの作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ベースクラスの作成
Base = declarative_base()


def get_db():
    """データベースセッションを取得する依存関数"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """すべてのテーブルを作成する"""
    Base.metadata.create_all(bind=engine)
