"""
データベース管理スクリプト

テーブルの作成・削除・再作成を行うためのスクリプト
"""

import sys
import os
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from passlib.context import CryptContext
import random
from datetime import date, timedelta

# プロジェクトルートをPythonパスに追加
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, engine, SessionLocal
from models import User, Medication, Shelter, ShelterAdmin, MedicationInventory

# パスワードハッシュ化用
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def drop_all_tables():
    """すべてのテーブルを削除"""
    print("すべてのテーブルを削除しています...")
    
    # 外部キー制約を一時的に無効化してテーブルを削除
    with engine.connect() as conn:
        tables_to_drop = [
            'medications',
            'medication_inventory', 
            'shelter_admins',
            'users',
            'shelters'
        ]
        
        for table in tables_to_drop:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
                print(f"  ✓ テーブル '{table}' を削除しました")
            except ProgrammingError as e:
                print(f"  - テーブル '{table}' の削除をスキップ: {e}")
        
        conn.commit()


def create_all_tables():
    """すべてのテーブルを作成"""
    print("すべてのテーブルを作成しています...")
    Base.metadata.create_all(bind=engine)
    print("  ✓ テーブル作成完了")


def recreate_tables():
    """テーブルを再作成"""
    print("=== データベーステーブル再作成 ===")
    drop_all_tables()
    create_all_tables()
    print("=== 完了 ===")


def show_tables():
    """テーブル一覧を表示"""
    print("=== データベーステーブル一覧 ===")
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """))
        
        tables = result.fetchall()
        if tables:
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("  テーブルが存在しません")


def insert_sample_data():
    """サンプルデータを挿入"""
    print("サンプルデータを挿入しています...")
    random.seed(42)
    
    # 定数定義
    MEDICATION_NAMES = [
        "フェノバール注射液100mg",
        "デエビゴ錠5mg",
        "イーケプラ錠静注500mg",
        "ロキソニン錠60mg",
        "PL配合顆粒",
        "ボルタレンサポ50mg",
        "カロナール錠200mg",
        "アンヒバ坐剤小児用100mg",
        "ブスコパン錠10mg",
        "ムコスタ錠100mg"
    ]
    
    SHELTERS_DATA = [
        {
            "name": "中央区避難所",
            "address": "東京都中央区銀座1-1-1",
            "latitude": 35.6762,
            "longitude": 139.7660,
            "aggregate_range": "3"
        },
        {
            "name": "港区避難所",
            "address": "東京都港区赤坂1-1-1", 
            "latitude": 35.6745,
            "longitude": 139.7380,
            "aggregate_range": "3"
        },
        {
            "name": "新宿区避難所",
            "address": "東京都新宿区新宿1-1-1",
            "latitude": 35.6938,
            "longitude": 139.7036,
            "aggregate_range": "3"
        }
    ]
    
    db = SessionLocal()
    
    try:
        # 既存データの確認
        existing_shelters = db.query(Shelter).count()
        if existing_shelters > 0:
            print(f"  既にサンプルデータが存在します (避難所数: {existing_shelters})")
            return
            
        # 避難所データを挿入
        shelter_objects = []
        for shelter_data in SHELTERS_DATA:
            shelter = Shelter(**shelter_data)
            db.add(shelter)
            shelter_objects.append(shelter)
        
        # コミットしてIDを取得
        db.commit()
        
        # 各避難所の管理者を作成
        for i, shelter in enumerate(shelter_objects):
            admin_email = f"admin{i+1}@example.com"
            admin_password = f"admin{i+1}pass"  # デモ用の簡単なパスワード
            admin_phone = f"090-{1000+i:04d}-{5678+i:04d}"  # ダミーの電話番号
            
            admin = ShelterAdmin(
                email=admin_email,
                password_hash=pwd_context.hash(admin_password),
                name=f"管理者{i+1}",
                phone=admin_phone,
                shelter_id=shelter.shelter_id
            )
            db.add(admin)
            
            print(f"  ✓ 避難所 '{shelter.name}' と管理者 '{admin_email}' (パスワード: {admin_password}) を作成")
        
        # コミットして管理者IDを取得
        db.commit()
        
        # 医薬品の説明データ
        MEDICATION_DESCRIPTIONS = {
            "フェノバール注射液100mg": "抗てんかん薬。けいれん発作の治療に使用。",
            "デエビゴ錠5mg": "睡眠薬。不眠症の治療に使用。",
            "イーケプラ錠静注500mg": "抗てんかん薬。てんかん発作の予防に使用。",
            "ロキソニン錠60mg": "解熱鎮痛薬。頭痛、発熱、炎症の緩和に使用。",
            "PL配合顆粒": "総合感冒薬。風邪の諸症状の緩和に使用。",
            "ボルタレンサポ50mg": "解熱鎮痛薬。発熱、炎症、疼痛の緩和に使用。",
            "カロナール錠200mg": "解熱鎮痛薬。発熱、頭痛の緩和に使用。",
            "アンヒバ坐剤小児用100mg": "小児用解熱鎮痛薬。小児の発熱時に使用。",
            "ブスコパン錠10mg": "鎮痙薬。腹痛、胃痛の緩和に使用。",
            "ムコスタ錠100mg": "胃粘膜保護薬。胃炎、胃潰瘍の治療に使用。"
        }
        
        # 在庫数量の選択肢
        QUANTITY_OPTIONS = [0, 10, 20, 30]
        
        for shelter in shelter_objects:
            for med_name in MEDICATION_NAMES:
                # 有効期限を1年～3年後のランダムな日付に設定
                expiry_date = date.today() + timedelta(days=random.randint(365, 1095))
                # 在庫数量をランダムに選択
                quantity = random.choice(QUANTITY_OPTIONS)
                
                inventory = MedicationInventory(
                    shelter_id=shelter.shelter_id,
                    medication_name=med_name,
                    quantity=quantity,
                    expiry_date=expiry_date,
                    description=MEDICATION_DESCRIPTIONS.get(med_name, "医薬品の詳細情報")
                )
                db.add(inventory)
        
        db.commit()
        
        # ユーザーデータを作成（各避難所付近に10名ずつ）
        user_objects = []
        blood_types = ["A", "B", "AB", "O", "不明"]
        allergies = ["特になし", "ペニシリン", "卵", "そば", "エビ・カニ", "牛乳"]
        conditions = ["高血圧", "糖尿病", "高脂血症", "不整脈", "喘息", "関節炎", "不眠症", "胃炎", "頭痛", "腰痛"]
        
        for i, shelter in enumerate(shelter_objects):
            for j in range(10):  # 各避難所付近に10名
                user_email = f"user{i+1}-{j+1:02d}@example.com"
                user_password = f"user{i+1}-{j+1:02d}pass"
                
                # 避難所から半径2km以内にランダムに配置
                # 緯度経度の微小変化（約2km圏内）
                lat_offset = random.uniform(-0.018, 0.018)  # 約2km
                lng_offset = random.uniform(-0.023, 0.023)  # 約2km（緯度による補正）
                user_lat = float(shelter.latitude) + lat_offset
                user_lng = float(shelter.longitude) + lng_offset
                
                user = User(
                    email=user_email,
                    password_hash=pwd_context.hash(user_password),
                    name=f"田中 太郎{i+1}-{j+1:02d}",
                    birthday=date(1960 + (j % 40), 1 + (j % 12), 1 + (j % 28)),
                    blood_type=random.choice(blood_types),
                    allergy_name=random.choice(allergies),
                    condition_name=random.choice(conditions),
                    latitude=user_lat,
                    longitude=user_lng
                )
                db.add(user)
                user_objects.append(user)
        
        # コミットしてユーザーIDを取得
        db.commit()
        
        # 各ユーザーに3つずつ医薬品を割り当て
        for user in user_objects:
            # ランダムに3つの医薬品を選択（重複なし）
            selected_meds = random.sample(MEDICATION_NAMES, 3)
            dosages = ["朝1錠", "朝夕各1錠", "毎食後1錠", "就寝前1錠", "頓服"]
            schedules = ["食後", "食前", "食間", "就寝前", "必要時"]
            
            for med_name in selected_meds:
                medication = Medication(
                    user_id=user.user_id,
                    name=med_name,
                    dosage=random.choice(dosages),
                    schedule=random.choice(schedules)
                )
                db.add(medication)
        
        db.commit()
        
        print("\n【管理者ログイン情報】")
        for i, shelter_data in enumerate(SHELTERS_DATA):
            print(f"  避難所: {shelter_data['name']}")
            print(f"  メールアドレス: admin{i+1}@example.com")
            print(f"  パスワード: admin{i+1}pass")
            print()
        
        print("\n【サンプルユーザーログイン情報（各避難所付近に10名ずつ）】")
        for i, shelter_data in enumerate(SHELTERS_DATA):
            print(f"  {shelter_data['name']}付近のユーザー:")
            for j in range(3):  # 最初の3名のみ表示
                print(f"    メールアドレス: user{i+1}-{j+1:02d}@example.com")
                print(f"    パスワード: user{i+1}-{j+1:02d}pass")
            print(f"    （他7名: user{i+1}-04@example.com ～ user{i+1}-10@example.com）")
            print()
            
    except Exception as e:
        db.rollback()
        print(f"  エラーが発生しました: {e}")
        raise e
    finally:
        db.close()


def show_table_structure(table_name: str):
    """指定されたテーブルの構造を表示"""
    print(f"=== テーブル '{table_name}' の構造 ===")
    with engine.connect() as conn:
        result = conn.execute(text(f"""
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = '{table_name}' 
            ORDER BY ordinal_position;
        """))
        
        columns = result.fetchall()
        if columns:
            for column in columns:
                print(f"  - {column[0]}: {column[1]} ({'NULL' if column[2] == 'YES' else 'NOT NULL'})")
        else:
            print(f"  テーブル '{table_name}' が存在しません")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方法:")
        print("  python db_manager.py recreate    # テーブルを再作成")
        print("  python db_manager.py create      # テーブルを作成")
        print("  python db_manager.py drop        # テーブルを削除")
        print("  python db_manager.py show        # テーブル一覧を表示")
        print("  python db_manager.py structure <table_name>  # テーブル構造を表示")
        print("  python db_manager.py seed        # サンプルデータを挿入")
        print("  python db_manager.py setup       # テーブル作成 + サンプルデータ挿入")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    try:
        if command == "recreate":
            recreate_tables()
        elif command == "create":
            create_all_tables()
        elif command == "drop":
            drop_all_tables()
        elif command == "show":
            show_tables()
        elif command == "structure" and len(sys.argv) > 2:
            show_table_structure(sys.argv[2])
        elif command == "seed":
            insert_sample_data()
        elif command == "setup":
            create_all_tables()
            insert_sample_data()
        else:
            print(f"不明なコマンド: {command}")
            sys.exit(1)
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1)
