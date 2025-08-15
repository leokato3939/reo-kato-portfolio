"""
例外ハンドラー

APIで発生する例外を適切にハンドリングする
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP例外ハンドラー"""
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """バリデーション例外ハンドラー"""
    logger.error(f"Validation Error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "message": "入力データが正しくありません",
            "details": exc.errors(),
            "status_code": 422
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """一般例外ハンドラー"""
    logger.error(f"Internal Server Error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "サーバー内部エラーが発生しました",
            "status_code": 500
        }
    )
