import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # データベース設定
    database_url: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://team5user:team5pass@db:5432/team5db"
    )
    
    # JWT設定
    secret_key: str = os.getenv(
        "SECRET_KEY", 
        "your-secret-key-here-please-change-in-production"
    )
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # アプリケーション設定
    app_name: str = "災害時医薬品情報共有サービス"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # CORS設定
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080"
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
