import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/authService";
import InventoryService from "../services/inventoryService";

const InventoryManagementMobile = () => {
  const navigate = useNavigate();
  const [inventoryData, setInventoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentShelterName, setCurrentShelterName] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("own");
  const [sortByShortage, setSortByShortage] = useState(false); // 不足率でソートするかどうか

  // 避難所検索機能用のstate
  const [shelterList, setShelterList] = useState([]);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [viewMode, setViewMode] = useState("inventory"); // "list" or "inventory"

  // 薬品検索機能用のstate
  const [medicationList, setMedicationList] = useState([]);
  const [selectedMedication, setSelectedMedication] = useState(null);

  // 個数管理用の状態
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  // 認証チェック
  useEffect(() => {
    if (!AuthService.isAuthenticated() || !AuthService.isAdmin()) {
      alert("管理者認証が必要です");
      navigate("/login");
      return;
    }
  }, [navigate]);

  // 在庫データを取得
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setLoading(true);

        // 优先使用 getMyShelterInventory API 来获取包含 required_quantity 的数据
        console.log("🔍 开始获取库存数据...");

        let allInventoryData = [];
        let currentShelterName = null;

        try {
          // 1. 首先尝试获取当前避难所的库存信息（包含required_quantity）
          console.log("📡 调用 getMyShelterInventory API...");
          const myShelterData = await InventoryService.getMyShelterInventory();
          console.log("✅ 获取到当前避难所数据:", myShelterData);

          if (Array.isArray(myShelterData) && myShelterData.length > 0) {
            // 验证required_quantity字段是否存在
            const hasRequiredQuantity = myShelterData.every((item) =>
              item.hasOwnProperty("required_quantity")
            );
            console.log(
              "🔢 required_quantity字段验证:",
              hasRequiredQuantity ? "✅ 存在" : "❌ 缺失"
            );

            // 获取当前避难所名称
            currentShelterName = myShelterData[0].shelter_name;
            allInventoryData = [...myShelterData];

            // 2. 尝试获取其他避难所的数据
            try {
              console.log("📡 调用 getAllInventory API 获取其他避难所数据...");
              const allData = await InventoryService.getAllInventory();
              if (Array.isArray(allData)) {
                // 过滤出其他避难所的数据
                const otherSheltersData = allData.filter(
                  (item) => item.shelter_name !== currentShelterName
                );
                console.log(
                  "✅ 获取到其他避难所数据:",
                  otherSheltersData.length,
                  "条"
                );
                allInventoryData = [...allInventoryData, ...otherSheltersData];
              }
            } catch (otherSheltersError) {
              console.warn(
                "⚠️ 获取其他避难所数据失败:",
                otherSheltersError.message
              );
            }
          } else {
            throw new Error("当前避难所没有库存数据");
          }
        } catch (apiError) {
          console.error(
            "❌ API调用失败，回退到getAllInventory:",
            apiError.message
          );

          // 回退方案：使用getAllInventory
          const fallbackData = await InventoryService.getAllInventory();
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            allInventoryData = fallbackData;

            // 尝试推断当前用户的避难所
            const userInfo = AuthService.getUserInfo();
            currentShelterName = userInfo?.shelter_name;

            if (!currentShelterName) {
              // 使用第一个避难所作为当前避难所
              const shelterNames = [
                ...new Set(fallbackData.map((item) => item.shelter_name)),
              ];
              currentShelterName = shelterNames[0];
            }
          } else {
            throw new Error("无法获取任何库存数据");
          }
        }

        // 验证最终数据
        console.log("📊 最终库存数据:", allInventoryData.length, "条");
        console.log("🏢 当前避难所:", currentShelterName);

        // 验证required_quantity字段在最终数据中的存在情况
        const requiredQuantityStats = allInventoryData.reduce(
          (acc, item) => {
            if (item.hasOwnProperty("required_quantity")) {
              acc.withRequired++;
            } else {
              acc.withoutRequired++;
            }
            return acc;
          },
          { withRequired: 0, withoutRequired: 0 }
        );

        console.log("🔢 required_quantity字段统计:", requiredQuantityStats);

        setInventoryData(allInventoryData);
        setFilteredData(allInventoryData);
        setCurrentShelterName(currentShelterName);

        // 避難所リストを生成（自分の避難所を除く）
        generateShelterList(allInventoryData, currentShelterName);
      } catch (error) {
        console.error("❌ 库存数据获取失败:", error);
        setError(`库存数据获取失败: ${error.message}`);
        setInventoryData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  // 避難所リストと薬品リストを生成する関数
  const generateShelterList = (data, currentShelter) => {
    // 避難所リスト（自分の避難所を除く、在庫0の薬品を除外）
    const uniqueShelters = [...new Set(data.map((item) => item.shelter_name))]
      .filter((shelterName) => shelterName !== currentShelter)
      .map((shelterName) => ({
        name: shelterName,
        medicationCount: data.filter(
          (item) => item.shelter_name === shelterName && item.quantity > 0
        ).length,
        totalQuantity: data
          .filter(
            (item) => item.shelter_name === shelterName && item.quantity > 0
          )
          .reduce((sum, item) => sum + (item.quantity || 0), 0),
      }))
      .filter((shelter) => shelter.medicationCount > 0); // 在庫のある薬品がない避難所は除外

    // 薬品リスト（重複なし、所属避難所を除く、在庫0を除外）
    const uniqueMedications = [
      ...new Set(data.map((item) => item.medication_name)),
    ]
      .map((medicationName) => {
        const medicationData = data.filter(
          (item) =>
            item.medication_name === medicationName &&
            item.shelter_name !== currentShelter &&
            item.quantity > 0 // 在庫0を除外
        );

        // 在庫のあるデータがない場合はスキップ
        if (medicationData.length === 0) {
          return null;
        }

        const shelterCount = new Set(
          medicationData.map((item) => item.shelter_name)
        ).size;
        const totalQuantity = medicationData.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        );

        return {
          name: medicationName,
          shelterCount,
          totalQuantity,
          shelters: medicationData.map((item) => ({
            shelterName: item.shelter_name,
            quantity: item.quantity,
            requiredQuantity: item.required_quantity,
          })),
        };
      })
      .filter((medication) => medication !== null);

    setShelterList(uniqueShelters);
    setMedicationList(uniqueMedications);
  };

  // フィルタリング処理
  useEffect(() => {
    let filtered = [...inventoryData];

    switch (activeFilter) {
      case "own":
        filtered = inventoryData.filter(
          (item) => item.shelter_name === currentShelterName
        );
        break;
      case "shelter":
      case "medication":
        // 避難所検索と薬品検索では自身の避難所を除外
        filtered = inventoryData.filter(
          (item) => item.shelter_name !== currentShelterName
        );
        break;
      default:
        break;
    }

    if (searchTerm) {
      if (activeFilter === "shelter") {
        filtered = filtered.filter((item) =>
          item.shelter_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else if (activeFilter === "medication") {
        filtered = filtered.filter((item) =>
          item.medication_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else {
        filtered = filtered.filter(
          (item) =>
            item.shelter_name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            item.medication_name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }
    }

    // ソート処理：不足率の小さい順（必要在庫数に対する在庫数の割合が小さい順）
    // 所属避難所タブでソートが有効な時のみ実行
    if (activeFilter === "own" && sortByShortage) {
      filtered = filtered.sort((a, b) => {
        // required_quantity が存在しない場合は最後に配置
        const aRequired = a.required_quantity || 0;
        const bRequired = b.required_quantity || 0;

        if (aRequired === 0 && bRequired === 0) return 0;
        if (aRequired === 0) return 1;
        if (bRequired === 0) return -1;

        // 在庫数 / 必要在庫数 の割合を計算（小さい方が優先）
        const aRatio = a.quantity / aRequired;
        const bRatio = b.quantity / bRequired;

        return aRatio - bRatio;
      });
    }

    setFilteredData(filtered);
  }, [
    inventoryData,
    activeFilter,
    searchTerm,
    currentShelterName,
    sortByShortage,
  ]);

  // フィルタボタンのクリック処理
  const handleFilterClick = (filterType) => {
    setActiveFilter(filterType);
    setSearchTerm("");
    setSelectedShelter(null);
    setSelectedMedication(null);

    // 避難所検索または薬品検索タブの場合はリストビューを表示
    if (filterType === "shelter" || filterType === "medication") {
      setViewMode("list");
    } else {
      setViewMode("inventory");
    }

    // 所属避難所以外のタブでは、ソート状態をリセット
    if (filterType !== "own") {
      setSortByShortage(false);
    }
    setShowQuantityModal(false);
  };

  // 避難所選択処理
  const handleShelterSelect = (shelter) => {
    setSelectedShelter(shelter);
    setViewMode("inventory");

    // 選択された避難所の在庫データをフィルタリング（在庫0を除外）
    const shelterInventory = inventoryData.filter(
      (item) => item.shelter_name === shelter.name && item.quantity > 0
    );
    setFilteredData(shelterInventory);
  };

  // 薬品選択処理
  const handleMedicationSelect = (medication) => {
    setSelectedMedication(medication);
    setViewMode("inventory");

    // 選択された薬品の在庫データをフィルタリング（所属避難所を除く、在庫0を除外）
    const medicationInventory = inventoryData.filter(
      (item) =>
        item.medication_name === medication.name &&
        item.shelter_name !== currentShelterName &&
        item.quantity > 0
    );
    setFilteredData(medicationInventory);
  };

  // リストビューに戻る
  const handleBackToList = () => {
    setViewMode("list");
    setSelectedShelter(null);
    setSelectedMedication(null);
  };

  // 個数管理ボタンのクリック処理
  const handleQuantityManagement = (item) => {
    if (item.shelter_name !== currentShelterName) {
      alert("所属避難所の薬品のみ編集できます");
      return;
    }
    setEditingItem(item);
    setEditQuantity(item.quantity.toString());
    setShowQuantityModal(true);
  };

  // 編集キャンセル
  const cancelEdit = () => {
    setEditingItem(null);
    setEditQuantity("");
    setShowQuantityModal(false);
  };

  // 在庫数更新
  const updateQuantity = async () => {
    if (!editingItem) return;

    const newQuantity = parseInt(editQuantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      alert("有効な数値を入力してください（0以上）");
      return;
    }

    try {
      setUpdating(true);

      // デバッグ情報を追加
      console.log("=== 在庫更新デバッグ情報 ===");
      console.log("編集中のアイテム:", editingItem);
      console.log("新しい数量:", newQuantity);
      console.log("現在のトークン:", AuthService.getToken() ? "あり" : "なし");
      console.log("ユーザータイプ:", AuthService.getUserType());
      console.log("認証状態:", AuthService.isAuthenticated());
      console.log("管理者状態:", AuthService.isAdmin());
      console.log("現在の避難所:", currentShelterName);
      console.log("アイテムの避難所:", editingItem.shelter_name);

      await InventoryService.updateMedicationInventory(
        editingItem.medication_name,
        {
          quantity: newQuantity,
          description: editingItem.description || "",
        }
      );

      // ローカルデータを更新
      const updatedInventoryData = inventoryData.map((item) => {
        if (
          item.shelter_name === editingItem.shelter_name &&
          item.medication_name === editingItem.medication_name
        ) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });

      setInventoryData(updatedInventoryData);

      setEditingItem(null);
      setEditQuantity("");
      setShowQuantityModal(false);

      alert("在庫数が正常に更新されました");
    } catch (error) {
      console.error("在庫数更新エラー:", error);
      console.log("エラーの詳細情報:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      let errorMessage = "在庫数の更新に失敗しました: ";

      if (error.message.includes("認証")) {
        errorMessage += "認証エラー。再度ログインしてください。";
        // 自動的にログインページに遷移
        setTimeout(() => {
          AuthService.logout();
          navigate("/login");
        }, 2000);
      } else if (error.message.includes("薬品が見つかりません")) {
        errorMessage += "指定された薬品が見つかりません。";
      } else if (error.message.includes("404")) {
        errorMessage +=
          "APIエンドポイントが見つかりません。システム管理者に連絡してください。";
      } else {
        errorMessage += error.message;
      }

      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const goBack = () => navigate(-1);
  const showSettings = () => navigate("/setup");

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f8f9fa",
          padding: "20px",
        }}
      >
        <i
          className="fas fa-spinner fa-spin"
          style={{ fontSize: "2.5em", color: "#e60012", marginBottom: "16px" }}
        ></i>
        <p style={{ fontSize: "16px", color: "#666" }}>
          在庫情報を読み込み中...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f8f9fa",
          padding: "20px",
        }}
      >
        <i
          className="fas fa-exclamation-triangle"
          style={{ fontSize: "2.5em", color: "#ffc107", marginBottom: "16px" }}
        ></i>
        <p
          style={{
            color: "#dc3545",
            marginBottom: "20px",
            textAlign: "center",
            fontSize: "16px",
          }}
        >
          {error}
        </p>
        <button
          style={{
            backgroundColor: "#e60012",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontSize: "16px",
            cursor: "pointer",
          }}
          onClick={() => window.location.reload()}
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* モバイル対応ナビゲーションバー */}
      <div
        style={{
          backgroundColor: "#e60012",
          color: "white",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={goBack}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "white",
            fontSize: "18px",
            cursor: "pointer",
            padding: "8px",
          }}
        >
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
              width: '32px', 
              height: '32px',
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
              fontSize: '24px', 
              display: 'none',
              color: 'white'
            }}
          ></i>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: '600',
              lineHeight: '1.2'
            }}>在庫管理</h1>
            <div style={{
              fontSize: '11px',
              opacity: 0.8,
              fontWeight: '400'
            }}>RakuMediLink</div>
          </div>
        </div>
        
        <button
          onClick={showSettings}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "white",
            fontSize: "18px",
            cursor: "pointer",
            padding: "8px",
          }}
        >
          <i className="fas fa-cog"></i>
        </button>
      </div>

      <div style={{ padding: "16px" }}>
        {/* フィルタボタン - モバイル対応 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
            justifyContent: "center",
          }}
        >
          {[
            { key: "own", label: "所属避難所", icon: "fas fa-home" },
            {
              key: "shelter",
              label: "避難所検索",
              icon: "fas fa-map-marker-alt",
            },
            { key: "medication", label: "薬品検索", icon: "fas fa-pills" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleFilterClick(filter.key)}
              style={{
                backgroundColor:
                  activeFilter === filter.key ? "#e60012" : "white",
                color: activeFilter === filter.key ? "white" : "#e60012",
                border: `2px solid #e60012`,
                borderRadius: "25px",
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: "140px",
                justifyContent: "center",
                transition: "all 0.3s ease",
                boxShadow:
                  activeFilter === filter.key
                    ? "0 4px 12px rgba(230, 0, 18, 0.3)"
                    : "0 2px 8px rgba(0,0,0,0.1)",
                transform:
                  activeFilter === filter.key ? "translateY(-2px)" : "none",
              }}
            >
              <i className={filter.icon} style={{ fontSize: "14px" }}></i>
              {filter.label}
            </button>
          ))}
        </div>

        {/* ソートオプション - 所属避難所タブでのみ表示 */}
        {activeFilter === "own" && (
          <div
            style={{
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                color: "#333",
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: sortByShortage ? "#e6f3ff" : "transparent",
                border: `1px solid ${sortByShortage ? "#0066cc" : "#ddd"}`,
                transition: "all 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={sortByShortage}
                onChange={(e) => setSortByShortage(e.target.checked)}
                style={{
                  accentColor: "#e60012",
                  transform: "scale(1.1)",
                }}
              />
              <i
                className="fas fa-sort-amount-up"
                style={{
                  fontSize: "12px",
                  color: sortByShortage ? "#0066cc" : "#666",
                }}
              ></i>
              <span
                style={{
                  fontWeight: sortByShortage ? "600" : "400",
                  color: sortByShortage ? "#0066cc" : "#666",
                }}
              >
                不足率順でソート
              </span>
            </label>
          </div>
        )}

        {/* 検索ボックス - モバイル対応 */}
        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            gap: "8px",
          }}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeFilter === "shelter"
                ? "避難所名を入力してください"
                : activeFilter === "medication"
                ? "薬品名を入力してください"
                : "検索キーワードを入力してください"
            }
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "2px solid #e9ecef",
              borderRadius: "8px",
              fontSize: "16px",
              backgroundColor: "white",
            }}
          />
          <button
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 16px",
              cursor: "pointer",
            }}
          >
            <i className="fas fa-search"></i>
          </button>
        </div>

        {/* リストビュー */}
        {(activeFilter === "shelter" || activeFilter === "medication") &&
        viewMode === "list" ? (
          <div>
            {activeFilter === "shelter" ? (
              // 避難所リスト
              <div>
                <h2
                  style={{
                    fontSize: "18px",
                    marginBottom: "16px",
                    color: "#333",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <i className="fas fa-building"></i>
                  避難所一覧
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#666",
                      backgroundColor: "#e9ecef",
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    {searchTerm
                      ? shelterList.filter((shelter) =>
                          shelter.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        ).length
                      : shelterList.length}
                    件
                  </span>
                </h2>

                {(() => {
                  const filteredShelters = searchTerm
                    ? shelterList.filter((shelter) =>
                        shelter.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      )
                    : shelterList;

                  return filteredShelters.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#666",
                        backgroundColor: "white",
                        borderRadius: "12px",
                        border: "1px solid #e9ecef",
                      }}
                    >
                      <i
                        className="fas fa-building"
                        style={{
                          fontSize: "48px",
                          marginBottom: "16px",
                          color: "#ccc",
                        }}
                      ></i>
                      <p>
                        {searchTerm
                          ? `「${searchTerm}」に一致する避難所が見つかりません`
                          : "避難所が見つかりません"}
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {filteredShelters.map((shelter, index) => (
                        <div
                          key={index}
                          onClick={() => handleShelterSelect(shelter)}
                          style={{
                            backgroundColor: "white",
                            borderRadius: "12px",
                            border: "1px solid #e9ecef",
                            padding: "16px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                backgroundColor: "#e60012",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "20px",
                              }}
                            >
                              <i className="fas fa-building"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                              <h3
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  margin: "0 0 4px 0",
                                  color: "#333",
                                }}
                              >
                                {shelter.name}
                              </h3>
                              <p
                                style={{
                                  fontSize: "14px",
                                  color: "#666",
                                  margin: 0,
                                }}
                              >
                                {shelter.medicationCount}種類の薬品・総在庫数:{" "}
                                {shelter.totalQuantity}
                              </p>
                            </div>
                            <i
                              className="fas fa-chevron-right"
                              style={{ color: "#ccc", fontSize: "14px" }}
                            ></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              // 薬品リスト
              <div>
                <h2
                  style={{
                    fontSize: "18px",
                    marginBottom: "16px",
                    color: "#333",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <i className="fas fa-pills"></i>
                  薬品一覧
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#666",
                      backgroundColor: "#e9ecef",
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    {searchTerm
                      ? medicationList.filter((medication) =>
                          medication.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        ).length
                      : medicationList.length}
                    件
                  </span>
                </h2>

                {(() => {
                  const filteredMedications = searchTerm
                    ? medicationList.filter((medication) =>
                        medication.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      )
                    : medicationList;

                  return filteredMedications.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#666",
                        backgroundColor: "white",
                        borderRadius: "12px",
                        border: "1px solid #e9ecef",
                      }}
                    >
                      <i
                        className="fas fa-pills"
                        style={{
                          fontSize: "48px",
                          marginBottom: "16px",
                          color: "#ccc",
                        }}
                      ></i>
                      <p>
                        {searchTerm
                          ? `「${searchTerm}」に一致する薬品が見つかりません`
                          : "薬品が見つかりません"}
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {filteredMedications.map((medication, index) => (
                        <div
                          key={index}
                          onClick={() => handleMedicationSelect(medication)}
                          style={{
                            backgroundColor: "white",
                            borderRadius: "12px",
                            border: "1px solid #e9ecef",
                            padding: "16px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                backgroundColor: "#17a2b8",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "20px",
                              }}
                            >
                              <i className="fas fa-pills"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                              <h3
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  margin: "0 0 4px 0",
                                  color: "#333",
                                }}
                              >
                                {medication.name}
                              </h3>
                              <p
                                style={{
                                  fontSize: "14px",
                                  color: "#666",
                                  margin: 0,
                                }}
                              >
                                {medication.shelterCount}
                                箇所の避難所で保有・総在庫数:{" "}
                                {medication.totalQuantity}
                              </p>
                            </div>
                            <i
                              className="fas fa-chevron-right"
                              style={{ color: "#ccc", fontSize: "14px" }}
                            ></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* 戻るボタン */}
            {(selectedShelter || selectedMedication) && (
              <button
                onClick={handleBackToList}
                style={{
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  marginBottom: "16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                }}
              >
                <i className="fas fa-arrow-left"></i>
                {selectedShelter ? "避難所一覧に戻る" : "薬品一覧に戻る"}
              </button>
            )}

            {/* 結果表示 - カード形式 */}
            <div>
              <h2
                style={{
                  fontSize: "18px",
                  marginBottom: "16px",
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <i className="fas fa-list"></i>
                {selectedShelter
                  ? `${selectedShelter.name}の在庫状況`
                  : selectedMedication
                  ? `${selectedMedication.name}の保有状況`
                  : activeFilter === "own"
                  ? `所属避難所の在庫 (${currentShelterName || "未設定"})`
                  : "全在庫情報"}
                <span
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    backgroundColor: "#e9ecef",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  {filteredData.length}件
                </span>
              </h2>

              {/* ソート有効時の説明 - 所属避難所タブでのみ表示 */}
              {activeFilter === "own" && sortByShortage && (
                <div
                  style={{
                    backgroundColor: "#e6f3ff",
                    border: "1px solid #0066cc",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "16px",
                    fontSize: "14px",
                    color: "#0066cc",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <i className="fas fa-info-circle"></i>
                  <span>
                    不足率の高い順（必要在庫数に対する在庫数の割合が低い順）で表示しています
                  </span>
                </div>
              )}

              {filteredData.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: "#666",
                    backgroundColor: "white",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <i
                    className="fas fa-box-open"
                    style={{
                      fontSize: "3em",
                      marginBottom: "16px",
                      color: "#ccc",
                    }}
                  ></i>
                  <p style={{ fontSize: "16px" }}>データがありません</p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {filteredData.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "16px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        border:
                          item.shelter_name === currentShelterName
                            ? "2px solid #e60012"
                            : "1px solid #e9ecef",
                      }}
                    >
                      {/* 避難所名 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "12px",
                          paddingBottom: "8px",
                          borderBottom: "1px solid #f1f3f4",
                        }}
                      >
                        <i
                          className="fas fa-building"
                          style={{
                            color:
                              item.shelter_name === currentShelterName
                                ? "#e60012"
                                : "#6c757d",
                            marginRight: "8px",
                          }}
                        ></i>
                        <span
                          style={{
                            fontWeight: "600",
                            color:
                              item.shelter_name === currentShelterName
                                ? "#e60012"
                                : "#333",
                            fontSize: "14px",
                          }}
                        >
                          {item.shelter_name}
                          {item.shelter_name === currentShelterName && (
                            <span
                              style={{
                                backgroundColor: "#e60012",
                                color: "white",
                                fontSize: "12px",
                                padding: "2px 6px",
                                borderRadius: "8px",
                                marginLeft: "8px",
                              }}
                            >
                              所属
                            </span>
                          )}
                        </span>
                      </div>

                      {/* 薬品情報 */}
                      <div style={{ marginBottom: "16px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <i
                              className="fas fa-pills"
                              style={{ color: "#28a745", marginRight: "8px" }}
                            ></i>
                            <span
                              style={{
                                fontWeight: "500",
                                fontSize: "16px",
                                color: "#333",
                              }}
                            >
                              {item.medication_name}
                            </span>
                            {/* ソート有効時に不足率を表示 - 所属避難所タブでのみ */}
                            {activeFilter === "own" &&
                              sortByShortage &&
                              item.required_quantity > 0 && (
                                <span
                                  style={{
                                    backgroundColor: (() => {
                                      const ratio =
                                        item.quantity / item.required_quantity;
                                      if (ratio >= 1) return "#28a745";
                                      if (ratio >= 0.5) return "#ffc107";
                                      return "#fd7e14";
                                    })(),
                                    color: "white",
                                    padding: "2px 6px",
                                    borderRadius: "10px",
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {Math.round(
                                    (item.quantity / item.required_quantity) *
                                      100
                                  )}
                                  %
                                </span>
                              )}
                          </div>
                          <div
                            style={{
                              backgroundColor:
                                item.shelter_name === currentShelterName &&
                                item.required_quantity !== undefined
                                  ? item.quantity < item.required_quantity
                                    ? "#dc3545"
                                    : "#28a745"
                                  : item.quantity === 0
                                  ? "#dc3545"
                                  : item.quantity < 3
                                  ? "#ffc107"
                                  : "#28a745",
                              color: "white",
                              padding: "8px 12px",
                              borderRadius: "16px",
                              fontSize:
                                item.shelter_name === currentShelterName &&
                                item.required_quantity !== undefined
                                  ? "18px"
                                  : "14px",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: "40px",
                              height: "40px",
                              gap: "4px",
                            }}
                          >
                            {item.shelter_name === currentShelterName &&
                            item.required_quantity !== undefined ? (
                              // 所属避難所の薬品は記号表示
                              item.quantity < item.required_quantity ? (
                                "×"
                              ) : (
                                "○"
                              )
                            ) : (
                              // その他の避難所の薬品は在庫数表示
                              <>
                                {item.quantity === 0 && (
                                  <i
                                    className="fas fa-exclamation-triangle"
                                    style={{ fontSize: "12px" }}
                                  ></i>
                                )}
                                {item.quantity}個
                              </>
                            )}
                          </div>
                        </div>

                        {/* 库存状态和必要量显示 - 所属避難所の薬品のみ */}
                        {item.required_quantity !== undefined &&
                          item.shelter_name === currentShelterName && (
                            <div
                              style={{
                                marginBottom: "8px",
                                padding: "12px",
                                backgroundColor: "#f8f9fa",
                                borderRadius: "8px",
                                fontSize: "14px",
                              }}
                            >
                              {/* 必要量信息 */}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginBottom: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <div style={{ color: "#666" }}>
                                  <i
                                    className="fas fa-target"
                                    style={{
                                      marginRight: "6px",
                                      color: "#6c757d",
                                    }}
                                  ></i>
                                  必要量:{" "}
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      color: "#333",
                                    }}
                                  >
                                    {item.required_quantity}個
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#666",
                                  }}
                                >
                                  現在: {item.quantity}個
                                </div>
                              </div>

                              {/* 进度条 */}
                              <div
                                style={{
                                  width: "100%",
                                  height: "12px",
                                  backgroundColor: "#e9ecef",
                                  borderRadius: "6px",
                                  overflow: "hidden",
                                  position: "relative",
                                  marginBottom: "4px",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${Math.min(
                                      (item.quantity /
                                        (item.required_quantity || 1)) *
                                        100,
                                      100
                                    )}%`,
                                    backgroundColor:
                                      item.quantity >= item.required_quantity
                                        ? "#28a745"
                                        : item.quantity === 0
                                        ? "#dc3545"
                                        : item.quantity /
                                            item.required_quantity >=
                                          0.5
                                        ? "#ffc107"
                                        : "#fd7e14",
                                    transition: "width 0.3s ease",
                                    borderRadius: "6px",
                                  }}
                                ></div>
                                {/* 100%标记线 */}
                                {item.quantity < item.required_quantity && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: 0,
                                      right: 0,
                                      width: "2px",
                                      height: "100%",
                                      backgroundColor: "#28a745",
                                      opacity: 0.5,
                                    }}
                                  ></div>
                                )}
                              </div>

                              {/* 状态和百分比 */}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  fontSize: "12px",
                                }}
                              ></div>
                            </div>
                          )}

                        {/* 詳細情報 */}
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#666",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            marginLeft: "24px",
                          }}
                        >
                          {item.expiry_date && (
                            <div>
                              <i
                                className="fas fa-calendar"
                                style={{ marginRight: "6px", width: "12px" }}
                              ></i>
                              期限: {item.expiry_date}
                            </div>
                          )}
                          {item.description && (
                            <div>
                              <i
                                className="fas fa-info-circle"
                                style={{ marginRight: "6px", width: "12px" }}
                              ></i>
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 個数管理ボタン - 所属避難所の薬品のみ表示 */}
                      {item.shelter_name === currentShelterName && (
                        <button
                          onClick={() => handleQuantityManagement(item)}
                          style={{
                            width: "100%",
                            backgroundColor: "#e60012",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            padding: "12px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <i className="fas fa-edit"></i>
                          個数管理
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 個数管理モーダル */}
      {showQuantityModal && editingItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "18px",
                fontWeight: "600",
                color: "#333",
                textAlign: "center",
              }}
            >
              個数管理
            </h3>

            <div
              style={{
                backgroundColor: "#f8f9fa",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}
              >
                薬品名
              </div>
              <div
                style={{ fontSize: "16px", fontWeight: "500", color: "#333" }}
              >
                {editingItem.medication_name}
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333",
                  marginBottom: "8px",
                }}
              >
                新しい在庫数
              </label>
              <input
                type="number"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                min="0"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e9ecef",
                  borderRadius: "8px",
                  fontSize: "16px",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
                disabled={updating}
                placeholder="0"
              />
            </div>

            {/* Required Quantity 表示（読み取り専用） */}
            {editingItem.required_quantity !== undefined && (
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#666",
                    marginBottom: "8px",
                  }}
                >
                  必要在庫数（変更不可）
                </label>
                <div
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "16px",
                    textAlign: "center",
                    fontWeight: "bold",
                    backgroundColor: "#f8f9fa",
                    color: "#666",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <i className="fas fa-target" style={{ color: "#6c757d" }}></i>
                  {editingItem.required_quantity}個
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    textAlign: "center",
                    marginTop: "4px",
                  }}
                >
                  この値は管理者によって設定され、変更できません
                </div>

                {/* 现在数量与必要量的比较 */}
                <div
                  style={{
                    marginTop: "8px",
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor:
                      editQuantity && editingItem.required_quantity
                        ? parseInt(editQuantity) >=
                          editingItem.required_quantity
                          ? "#d4edda"
                          : "#f8d7da"
                        : "#fff3cd",
                    border:
                      "1px solid " +
                      (editQuantity && editingItem.required_quantity
                        ? parseInt(editQuantity) >=
                          editingItem.required_quantity
                          ? "#c3e6cb"
                          : "#f5c6cb"
                        : "#ffeaa7"),
                  }}
                >
                  {editQuantity && editingItem.required_quantity ? (
                    <>
                      {/* 进度条 */}
                      <div
                        style={{
                          width: "100%",
                          height: "16px",
                          backgroundColor: "#e9ecef",
                          borderRadius: "8px",
                          overflow: "hidden",
                          position: "relative",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(
                              (parseInt(editQuantity) /
                                editingItem.required_quantity) *
                                100,
                              100
                            )}%`,
                            backgroundColor:
                              parseInt(editQuantity) >=
                              editingItem.required_quantity
                                ? "#28a745"
                                : parseInt(editQuantity) === 0
                                ? "#dc3545"
                                : parseInt(editQuantity) /
                                    editingItem.required_quantity >=
                                  0.5
                                ? "#ffc107"
                                : "#fd7e14",
                            transition: "width 0.3s ease",
                            borderRadius: "8px",
                          }}
                        ></div>
                        {/* 100%标记线 */}
                        {parseInt(editQuantity) <
                          editingItem.required_quantity && (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              right: 0,
                              width: "2px",
                              height: "100%",
                              backgroundColor: "#28a745",
                              opacity: 0.7,
                            }}
                          ></div>
                        )}
                      </div>

                      {/* 状态信息 */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "14px",
                        }}
                      >
                        <div>
                          <strong>
                            {parseInt(editQuantity) >=
                            editingItem.required_quantity
                              ? "✅ 充足"
                              : parseInt(editQuantity) === 0
                              ? "🚫 在庫切れ"
                              : "⚠️ 不足"}
                          </strong>
                        </div>
                        <div style={{ fontWeight: "bold" }}>
                          {Math.round(
                            (parseInt(editQuantity) /
                              editingItem.required_quantity) *
                              100
                          )}
                          %
                        </div>
                      </div>

                      {/* 详细信息 */}
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          textAlign: "center",
                          marginTop: "4px",
                        }}
                      >
                        現在の設定: {editQuantity}個 / 必要:{" "}
                        {editingItem.required_quantity}個
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#666",
                        fontSize: "14px",
                      }}
                    >
                      数量を入力してください
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "12px",
              }}
            >
              <button
                onClick={cancelEdit}
                disabled={updating}
                style={{
                  flex: 1,
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: updating ? "not-allowed" : "pointer",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={updateQuantity}
                disabled={updating}
                style={{
                  flex: 1,
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: updating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {updating ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    更新中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    更新
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagementMobile;
