### 1. ユーザー情報関連テーブル

ユーザーが登録する個人医療情報を管理します。

- **`users` テーブル**
    - `user_id`: `UUID` (PRIMARY KEY) - ユーザーを一意に識別するID。QRコードのトークンとしても使用。
    - `email`: `VARCHAR(255)` (UNIQUE, NOT NULL) - ユーザーのメールアドレス。
    - `password_hash`: `TEXT` (NOT NULL) - パスワードのハッシュ値。
    - `name`: `VARCHAR(255)` (NOT NULL) - 氏名
    - `birthday` : `DATE` (NOT NULL) - 生年月日
    - `blood_type` : `VARCHAR(255)` - 血液型
    - `allergy_name`: `VARCHAR(255)` - アレルゲン名。
    - `condition_name`: `VARCHAR(255)` (NOT NULL) - 基礎疾患名。
- **`medications` テーブル**
    - `medication_id`: `SERIAL` (PRIMARY KEY) - 医薬品ID。
    - `user_id`: `UUID` (FOREIGN KEY REFERENCES `users`(user_id), NOT NULL) - 紐づくユーザーID。
    - `name`: `VARCHAR(255)` (NOT NULL) - 医薬品名。
    - `dosage`: `VARCHAR(255)` (NOT NULL) - 用量。
    - `schedule`: `VARCHAR(255)` - 用法。

### 2. 医薬品在庫情報関連テーブル

災害時の医薬品在庫を管理します。

- **`shelters` テーブル**
    - `shelter_id`: `UUID` (PRIMARY KEY) - 避難所ID。
    - `name`: `VARCHAR(255)` (NOT NULL) - 避難所名。
    - `address`: `VARCHAR(255)` (NOT NULL) - 住所。
    - `latitude`: `NUMERIC(9, 6)` (NOT NULL) - 緯度。
    - `longitude`: `NUMERIC(9, 6)` (NOT NULL) - 経度。
    - `aggrigate_range` (NOT NULL) : - 集計範囲
- **`shelter_admins` テーブル**
    - `admin_id`: `UUID` (PRIMARY KEY) - 管理者ID。
    - `password_hash`: `TEXT` (NOT NULL) - パスワードのハッシュ値。
- **`medication_inventory` テーブル**
    - `inventory_id`: `SERIAL` (PRIMARY KEY) - 在庫ID。
    - `shelter_id`: `UUID` (FOREIGN KEY REFERENCES `shelters`(shelter_id), NOT NULL) - 紐づく避難所ID。
    - `medication_name`: `INTEGER` (NOT NULL) - 医薬品名。
    - `quantity`: `INTEGER` (NOT NULL) - 在庫数。