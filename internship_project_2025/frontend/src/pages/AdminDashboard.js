import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/authService";
import InventoryService from "../services/inventoryService";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [modalData, setModalData] = useState({
    isOpen: false,
    title: "",
    items: [],
  });
  const [inventoryData, setInventoryData] = useState([]);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 在庫データを取得する
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setIsLoading(true);
        // 管理者の認証状态を確認する
        if (!AuthService.isAuthenticated() || !AuthService.isAdmin()) {
          alert("管理者認証が必要です");
          navigate("/login");
          return;
        }

        // 実際のAPIから在庫情報を取得する
        const inventoryList = await InventoryService.getAllInventory();
        console.log("API返回数据:", inventoryList);
        console.log("API数据类型:", typeof inventoryList);
        console.log("API数据长度:", inventoryList?.length);

        // サンプルデータがある場合は詳細をログ出力
        if (inventoryList && inventoryList.length > 0) {
          console.log("API数据样本:", inventoryList[0]);
          console.log("样本字段:", Object.keys(inventoryList[0]));
        }

        // 确保返回的是数组
        const validInventoryList = Array.isArray(inventoryList)
          ? inventoryList
          : [];
        setInventoryData(validInventoryList);

        // 当前管理員の避難所を推定（通常は最初に表示される避難所）
        // 注意：これは暫定的な方法で、本来は/api/admins/meから取得すべき
        let currentShelterName = null;
        if (validInventoryList.length > 0) {
          // 避難所をグループ化して、最初の避難所を当前管理員のものとする
          const shelterGroups = {};
          validInventoryList.forEach((item) => {
            if (item.shelter_name) {
              if (!shelterGroups[item.shelter_name]) {
                shelterGroups[item.shelter_name] = [];
              }
              shelterGroups[item.shelter_name].push(item);
            }
          });
          // 最初の避難所を当前管理員の避難所とする（暫定）
          const shelterNames = Object.keys(shelterGroups);
          if (shelterNames.length > 0) {
            currentShelterName = shelterNames[0]; // 例：'中央区避難所'
          }
        }

        console.log("推定された当前管理員の避難所:", currentShelterName);

        if (currentShelterName && validInventoryList.length > 0) {
          // 当前避難所の在庫データのみ抽出
          const currentShelterInventory = validInventoryList.filter(
            (item) => item.shelter_name === currentShelterName
          );

          console.log("当前避難所の在庫データ:", currentShelterInventory);

          // デバッグ: データ構造を詳しく確認
          if (currentShelterInventory.length > 0) {
            console.log("サンプルデータ:", currentShelterInventory[0]);
            console.log(
              "利用可能なフィールド:",
              Object.keys(currentShelterInventory[0])
            );

            currentShelterInventory.forEach((item, index) => {
              console.log(`アイテム${index}:`, {
                medication_name: item.medication_name,
                quantity: item.quantity,
                required_quantity: item.required_quantity,
                quantityType: typeof item.quantity,
                requiredQuantityType: typeof item.required_quantity,
              });
            });
          }

          // 統計を計算 - 当前避難所のみ
          const shortageCount = currentShelterInventory.filter((item) => {
            const qty = Number(item.quantity) || 0;
            const requiredQty = Number(item.required_quantity) || 0;
            console.log(
              `${
                item.medication_name
              }: 在庫=${qty}, 必要量=${requiredQty}, 不足判定=${
                qty < requiredQty
              }`
            );
            return qty < requiredQty; // 必要量より在庫数が下回っている
          }).length;

          const excessCount = currentShelterInventory.filter((item) => {
            const qty = Number(item.quantity) || 0;
            const requiredQty = Number(item.required_quantity) || 0;
            const isExcess = requiredQty > 0 && qty > requiredQty * 2;
            console.log(
              `${item.medication_name}: 在庫=${qty}, 必要量=${requiredQty}, 超過判定=${isExcess}`
            );
            return isExcess; // 必要量の2倍以上ある場合を「大幅に上回っている」とする
          }).length;

          console.log("在庫統計:", {
            shortage: shortageCount,
            excess: excessCount,
          });

          setInventoryStats({
            shortage: shortageCount,
            excess: excessCount,
          }); // 推定された避難所名をユーザー情報として保存（暫定）
          const tempUserInfo = AuthService.getUserInfo() || {};
          tempUserInfo.shelter_name = currentShelterName;
          AuthService.setUserInfo(tempUserInfo);
        } else {
          setInventoryStats({
            shortage: 0,
            excess: 0,
          });
        }
      } catch (error) {
        console.error("在庫データ取得に失敗:", error);
        alert("在庫情報の取得に失敗しました: " + error.message);
        // 认证错误であればログインページへ遷移
        if (error.message.includes("認証") || error.message.includes("401")) {
          AuthService.logout();
          navigate("/login");
        }

        // デフォルト統計を設定
        setInventoryStats({
          shortage: 0,
          excess: 0,
        });
        setInventoryData([]); // 设置为空数组避免后续错误
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventoryData();
  }, [navigate]);

  // 在庫の詳細を表示
  const showStockDetails = async (category) => {
    if (!inventoryData || inventoryData.length === 0) {
      alert("在庫データが見つかりません");
      return;
    }

    let title = "";
    let items = [];

    try {
      // 现在の管理者の避难所名を取得
      const currentUser = AuthService.getUserInfo();
      const currentShelterName = currentUser?.shelter_name;
      if (!currentShelterName) {
        alert("ユーザー情報が見つかりません");
        return;
      }
      // 避难所に对应する在庫データを抽出
      const currentShelterInventory = inventoryData.filter(
        (item) => item.shelter_name === currentShelterName
      );

      switch (category) {
        case "shortage":
          title = "在庫不足薬品 (必要量より在庫数が下回っている)";
          console.log("在庫不足フィルタリング開始:");
          items = currentShelterInventory
            .filter((item) => {
              const qty = Number(item.quantity) || 0;
              const requiredQty = Number(item.required_quantity) || 0;
              const isShortage = qty < requiredQty;
              console.log(
                `詳細表示フィルタ - ${item.medication_name}: 在庫=${qty}, 必要量=${requiredQty}, 不足判定=${isShortage}`
              );
              return isShortage;
            })
            .map((item) => ({
              name: item.medication_name || "薬品名なし",
              info: `在庫: ${item.quantity}個 | 必要量: ${
                item.required_quantity
              }個 | 不足: ${
                (Number(item.required_quantity) || 0) -
                (Number(item.quantity) || 0)
              }個 | 期限: ${item.expiry_date || "未設定"}`,
              quantity: Number(item.quantity) || 0,
              required_quantity: Number(item.required_quantity) || 0,
              expiry_date: item.expiry_date,
              description: item.description,
            }));
          console.log("フィルタリング結果:", items);
          break;
        case "excess":
          title = "在庫超過薬品 (必要量より大幅に上回っている)";
          console.log("在庫超過フィルタリング開始:");
          items = currentShelterInventory
            .filter((item) => {
              const qty = Number(item.quantity) || 0;
              const requiredQty = Number(item.required_quantity) || 0;
              const isExcess = requiredQty > 0 && qty > requiredQty * 2;
              console.log(
                `詳細表示フィルタ - ${
                  item.medication_name
                }: 在庫=${qty}, 必要量=${requiredQty}, 2倍=${
                  requiredQty * 2
                }, 超過判定=${isExcess}`
              );
              return isExcess;
            })
            .map((item) => ({
              name: item.medication_name || "薬品名なし",
              info: `在庫: ${item.quantity}個 | 必要量: ${
                item.required_quantity
              }個 | 超過: ${
                (Number(item.quantity) || 0) -
                (Number(item.required_quantity) || 0)
              }個 | 期限: ${item.expiry_date || "未設定"}`,
              quantity: Number(item.quantity) || 0,
              required_quantity: Number(item.required_quantity) || 0,
              expiry_date: item.expiry_date,
              description: item.description,
            }));
          console.log("フィルタリング結果:", items);
          break;
        default:
          alert("無効なカテゴリです");
          return;
      }

      if (items.length === 0) {
        alert(`${title}の該当項目がありません`);
        return;
      }

      setModalData({
        isOpen: true,
        title,
        items,
      });
    } catch (error) {
      console.error("在庫詳細取得失敗:", error);
      alert("在庫詳細の取得に失敗しました");
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    setModalData({
      isOpen: false,
      title: "",
      items: [],
    });
  };

  // 前のページに戻る
  const goBack = () => {
    navigate(-1);
  };

  // 設定画面へ遷移
  const showMenu = () => {
    navigate("/setup");
  };

  // 获取避难所列表 - 分离当前避难所和其他避难所
  const getShelterList = () => {
    if (!inventoryData || inventoryData.length === 0)
      return { currentShelter: null, otherShelters: [] };

    // 获取当前管理员的避难所名
    const currentUser = AuthService.getUserInfo();
    const currentShelterName = currentUser?.shelter_name;

    // 从真实API数据中提取唯一的避难所信息
    const shelterMap = new Map();

    inventoryData.forEach((item) => {
      if (item.shelter_name && !shelterMap.has(item.shelter_name)) {
        shelterMap.set(item.shelter_name, {
          shelterId: item.shelter_name,
          shelterName: item.shelter_name,
          shelterAddress: "住所情報なし", // API中没有地址信息
          medicationCount: 0,
          totalQuantity: 0,
          medications: [], // 存储该避难所的所有药品信息
        });
      }

      if (item.shelter_name && shelterMap.has(item.shelter_name)) {
        const shelter = shelterMap.get(item.shelter_name);
        // 在庫が0より大きい薬品のみカウント
        if (Number(item.quantity) > 0) {
          shelter.medicationCount++;
        }
        shelter.totalQuantity += Number(item.quantity) || 0;
        shelter.medications.push(item); // 添加药品详细信息
      }
    });

    const allShelters = Array.from(shelterMap.values());

    // 分离当前避难所和其他避难所
    const currentShelter = allShelters.find(
      (shelter) => shelter.shelterName === currentShelterName
    );
    const otherShelters = allShelters.filter(
      (shelter) => shelter.shelterName !== currentShelterName
    );

    return { currentShelter, otherShelters };
  };

  // 显示避难所详细信息
  const showShelterDetails = async (shelter) => {
    try {
      if (!shelter.medications || shelter.medications.length === 0) {
        alert("指定された避難所の在庫情報が見つかりません");
        return;
      }
      setModalData({
        isOpen: true,
        title: `${shelter.shelterName} - 在庫詳細 (${shelter.medicationCount}種類)`,
        items: shelter.medications.map((item) => ({
          name: item.medication_name || "薬品名なし",
          info: `在庫: ${item.quantity}個 | 期限: ${
            item.expiry_date || "未設定"
          } | 説明: ${item.description || "なし"}`,
          quantity: Number(item.quantity) || 0,
          expiry_date: item.expiry_date,
          description: item.description,
        })),
      });
    } catch (error) {
      console.error("显示避难所详情失败:", error);
      alert("避難所情報の取得に失敗しました");
    }
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", paddingTop: "50px" }}
      >
        <i
          className="fas fa-spinner fa-spin"
          style={{ fontSize: "2em", color: "#e60012" }}
        ></i>
        <p style={{ marginTop: "16px" }}>在庫情報を読み込み中...</p>
      </div>
    );
  }

  // 統計情報の読み込みに失敗した場合
  if (!inventoryStats) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", paddingTop: "50px" }}
      >
        <i
          className="fas fa-exclamation-triangle"
          style={{ fontSize: "2em", color: "#ffc107" }}
        ></i>
        <p style={{ marginTop: "16px" }}>在庫情報の読み込みに失敗しました</p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          再読み込み
        </button>
      </div>
    );
  }

  const shelterList = getShelterList();

  return (
    <>
      <div className="nav-bar">
        <button className="nav-back" onClick={goBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <img 
            src="/rakumedilink-logo.webp" 
            alt="RakuMediLink" 
            style={{ 
              width: '28px', 
              height: '28px',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(255,255,255,0.2)'
            }}
            onError={(e) => {
              // Fallback to FontAwesome icon if image fails to load
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'inline-block';
            }}
          />
          {/* Fallback icon */}
          <i 
            className="fas fa-pills" 
            style={{ 
              fontSize: '20px', 
              display: 'none',
              color: 'white'
            }}
          ></i>
          <div>
            <span className="nav-title">管理者ダッシュボード</span>
            <div style={{
              fontSize: '10px',
              opacity: 0.8,
              fontWeight: '400'
            }}>RakuMediLink</div>
          </div>
        </div>
        <button className="nav-menu" onClick={showMenu} title="設定メニュー">
          <i className="fas fa-cog"></i>
        </button>
      </div>

      <div className="container">
        {/* 担当避難所情報 */}
        {shelterList.currentShelter && (
          <div
            className="current-shelter-info"
            style={{ marginBottom: "20px" }}
          >
            <h4>
              <i className="fas fa-home"></i> 担当避難所
            </h4>
            <div
              style={{
                padding: "12px",
                background: "#e3f2fd",
                borderRadius: "8px",
                marginBottom: "8px",
                cursor: "pointer",
                border: "2px solid #2196f3",
                transition: "background-color 0.2s",
              }}
              onClick={() => showShelterDetails(shelterList.currentShelter)}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#bbdefb")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#e3f2fd")}
            >
              <strong style={{ color: "#1976d2" }}>
                {shelterList.currentShelter.shelterName}
              </strong>
              <br />
              <small style={{ color: "#1565c0" }}>
                薬品種類: {shelterList.currentShelter.medicationCount}種類 |
                総在庫: {shelterList.currentShelter.totalQuantity}個
              </small>
            </div>
          </div>
        )}

        {/* 在庫不足・超過の表示エリア */}
        <div className="dashboard-stats">
          <div
            className="stat-card"
            onClick={() => showStockDetails("shortage")}
            style={{ cursor: "pointer" }}
          >
            <i
              className="fas fa-exclamation-triangle"
              style={{ color: "#dc3545" }}
            ></i>
            <h3>{inventoryStats.shortage}</h3>
            <p>在庫不足</p>
          </div>
          <div
            className="stat-card"
            onClick={() => showStockDetails("excess")}
            style={{ cursor: "pointer" }}
          >
            <i className="fas fa-arrow-up" style={{ color: "#28a745" }}></i>
            <h3>{inventoryStats.excess}</h3>
            <p>在庫超過</p>
          </div>
        </div>

        {/* 管理機能エリア */}
        <div className="management-section">
          <h3 style={{ marginBottom: "16px", color: "#333" }}>
            <i className="fas fa-cogs"></i> 管理機能
          </h3>
          <div className="action-buttons">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate("/inventory-management")}
              style={{ width: "100%" }} // 【修改】添加此行来使其铺满
            >
              <i className="fas fa-boxes"></i> 在庫管理
            </button>
          </div>
          <div style={{ marginBottom: "16px" }}></div>

          {/* 其他避难所网络信息 */}
          {shelterList.otherShelters.length > 0 && (
            <div className="other-shelter-info">
              <h4>
                <i className="fas fa-building"></i> 他の避難所ネットワーク
              </h4>
              <p>連携避難所数: {shelterList.otherShelters.length}ヶ所</p>
              <p>
                総薬品種類:{" "}
                {shelterList.otherShelters.reduce(
                  (total, shelter) => total + shelter.medicationCount,
                  0
                )}
                種類
              </p>
              <p
                style={{
                  fontSize: "0.85em",
                  color: "#666",
                  fontStyle: "italic",
                }}
              ></p>
              <div style={{ marginTop: "12px" }}>
                <h5>避難所一覧:</h5>
                {shelterList.otherShelters.slice(0, 4).map((shelter, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "8px",
                      background: "#f8f9fa",
                      borderRadius: "4px",
                      marginBottom: "4px",
                      cursor: "pointer",
                      border: "1px solid #e9ecef",
                      transition: "background-color 0.2s",
                    }}
                    onClick={() => showShelterDetails(shelter)}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e9ecef")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "#f8f9fa")
                    }
                  >
                    <strong>{shelter.shelterName}</strong>
                    <br />
                    <small style={{ color: "#666" }}>
                      薬品種類: {shelter.medicationCount}種類 | 総在庫:{" "}
                      {shelter.totalQuantity}個
                    </small>
                  </div>
                ))}
                {shelterList.otherShelters.length > 4 && (
                  <p
                    style={{
                      color: "#666",
                      fontSize: "0.9em",
                      marginTop: "8px",
                    }}
                  >
                    他 {shelterList.otherShelters.length - 4}{" "}
                    ヶ所の避難所があります
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 詳細モーダル */}
      {modalData.isOpen && (
        <div
          className="modal"
          style={{ display: "block" }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modalData.title}</h3>
              <button className="close-btn" onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className="shelter-list">
              {modalData.items.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#666",
                  }}
                >
                  該当するアイテムがありません
                </div>
              ) : (
                modalData.items.map((item, index) => {
                  return (
                    <div key={index} className="shelter-item">
                      <div style={{ flex: 1 }}>
                        <span className="shelter-name">{item.name}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            fontSize: "0.8em",
                            background:
                              item.required_quantity &&
                              item.required_quantity > 0
                                ? item.quantity < item.required_quantity
                                  ? "#f8d7da" // 不足時は赤
                                  : item.quantity > item.required_quantity * 2
                                  ? "#d4edda" // 超過時は緑
                                  : "#fff3cd" // 適正時は黄
                                : item.quantity > 10
                                ? "#d4edda"
                                : item.quantity > 5
                                ? "#fff3cd"
                                : item.quantity > 0
                                ? "#f8d7da"
                                : "#f5f5f5",
                            color:
                              item.required_quantity &&
                              item.required_quantity > 0
                                ? item.quantity < item.required_quantity
                                  ? "#721c24" // 不足時は濃い赤
                                  : item.quantity > item.required_quantity * 2
                                  ? "#155724" // 超過時は濃い緑
                                  : "#856404" // 適正時は濃い黄
                                : item.quantity > 10
                                ? "#155724"
                                : item.quantity > 5
                                ? "#856404"
                                : item.quantity > 0
                                ? "#721c24"
                                : "#6c757d",
                            padding: "2px 6px",
                            borderRadius: "12px",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          在庫: {item.quantity}個
                        </span>
                        {item.required_quantity &&
                          item.required_quantity > 0 && (
                            <span
                              style={{
                                fontSize: "0.7em",
                                color: "#6c757d",
                                background: "#f8f9fa",
                                padding: "1px 4px",
                                borderRadius: "8px",
                                display: "block",
                              }}
                            >
                              必要: {item.required_quantity}個
                            </span>
                          )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
