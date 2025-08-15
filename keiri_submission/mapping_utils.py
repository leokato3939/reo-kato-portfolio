#mapping_utils.py 
import pandas as pd
from pathlib import Path
import os
from config import MAPPING_STORE_PATH

def sort_mapping_store():
    path = Path(MAPPING_STORE_PATH)
    if not path.exists():
        raise FileNotFoundError(f"{path} が見つかりません。")
    df = pd.read_csv(path, encoding='utf-8-sig')
    df = df.sort_values(by='cleaned', ignore_index=True)
    df.to_csv(path, index=False, encoding='utf-8-sig')