import os
import re
from datetime import datetime

def parse_filename(filename):

    name = os.path.basename(filename)
    name = os.path.splitext(name)[0]
    name = re.sub(r'_[Ww][Ee][Bb]$', '', name)
    
    pattern = r'(.+?)_(.+?)_(\d{4})年(\d{1,2})月'
    match = re.match(pattern, name)

    if match:
        department = match.group(1)
        client = match.group(2)
        year = int(match.group(3))
        month = int(match.group(4))
        return {
            '部署': department,
            '下請け': client,
            '年': year,
            '月': month,
            '年月': f"{year}-{month:02d}"
        }
    else:
        return {
            'エラー': f"ファイル名形式不正: {name}"
        }
