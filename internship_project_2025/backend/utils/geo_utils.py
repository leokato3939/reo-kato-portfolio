"""
地理計算ユーティリティ

緯度経度間の距離計算などの地理的計算を行う
"""

import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    2点間の距離をhaversine公式で計算（km単位）
    
    Args:
        lat1, lon1: 地点1の緯度、経度
        lat2, lon2: 地点2の緯度、経度
        
    Returns:
        距離（km）
    """
    # 地球の半径（km）
    R = 6371.0
    
    # 度をラジアンに変換
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # 差を計算
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # haversine公式
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # 距離を計算
    distance = R * c
    
    return distance


def is_within_range(user_lat: float, user_lon: float, 
                   shelter_lat: float, shelter_lon: float, 
                   range_km: float) -> bool:
    """
    ユーザーが避難所の集約範囲内にいるかを判定
    
    Args:
        user_lat, user_lon: ユーザーの緯度、経度
        shelter_lat, shelter_lon: 避難所の緯度、経度
        range_km: 集約範囲（km）
        
    Returns:
        範囲内かどうか
    """
    distance = haversine_distance(user_lat, user_lon, shelter_lat, shelter_lon)
    return distance <= range_km
