import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/authService";

const MyPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("basic");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory] = useState("all");
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [medications, setMedications] = useState([]);
// eslint-disable-next-line
  const [categories, setCategories] = useState([]);

  // 用户信息获取 - 根据backend /api/users/me
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setIsLoading(true);
        if (!AuthService.isAuthenticated() || !AuthService.isUser()) {
          alert("ユーザー認証が必要です");
          navigate("/login");
          return;
        }
        try {
          const userData = await AuthService.getCurrentUser();
          setUserInfo(userData);
        } catch (apiError) {
          const localUserInfo = AuthService.getUserInfo();
          if (localUserInfo) {
            setUserInfo(localUserInfo);
          } else {
            throw new Error("ユーザー情報が見つかりません");
          }
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
        alert("ユーザー情報の取得に失敗しました");
        if (error.message.includes("認証")) {
          AuthService.logout();
          navigate("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserInfo();
  }, [navigate]);

  // 获取本人药品信息
  useEffect(() => {
    const fetchMedications = async () => {
      if (userInfo && (userInfo.user_id || userInfo.id || userInfo.uuid)) {
        try {
          const userId = userInfo.user_id || userInfo.id || userInfo.uuid;
          const medicalInfo = await AuthService.getMedicalInfoForQR(userId);
          if (medicalInfo && Array.isArray(medicalInfo.medications)) {
            setMedications(medicalInfo.medications);
            const cats = Array.from(
              new Set(
                medicalInfo.medications.map((m) => m.category).filter(Boolean)
              )
            );
            setCategories(cats);
          } else {
            setMedications([]);
            setCategories([]);
          }
        } catch (e) {
          console.error("获取药品信息失败", e);
          setMedications([]);
          setCategories([]);
        }
      }
    };
    fetchMedications();
  }, [userInfo]);

  // 本物のQRコード画像をバックエンドから取得
  useEffect(() => {
    const fetchQrImage = async () => {
      if (!userInfo) return;
      const userId = userInfo.user_id || userInfo.id || userInfo.uuid;
      if (!userId) return;
      try {
        const apiBase = window.location.origin.includes("localhost")
          ? "http://localhost:8000"
          : "";
        const url = `${apiBase}/api/users/qr-image/${userId}`;
        const res = await fetch(url, {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${AuthService.getToken?.() || ""}`,
          },
        });
        if (!res.ok) throw new Error("QRコード画像の取得に失敗しました");
        const blob = await res.blob();
        setQrImageUrl(URL.createObjectURL(blob));
      } catch (e) {
        console.error("QRコード画像取得エラー:", e);
        setQrImageUrl("");
      }
    };
    fetchQrImage();
  }, [userInfo]);

  const downloadQRCode = () => {
    if (qrImageUrl) {
      const link = document.createElement("a");
      link.href = qrImageUrl;
      link.download = `patient-qr-${userInfo?.name || "user"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const goBack = () => navigate(-1);

  const showMenu = () => {
    const choice = window.confirm("ログアウトしますか？");
    if (choice) {
      AuthService.logout();
      navigate("/login");
    }
  };

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
        <p style={{ marginTop: "16px" }}>ユーザー情報を読み込み中...</p>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", paddingTop: "50px" }}
      >
        <i
          className="fas fa-exclamation-triangle"
          style={{ fontSize: "2em", color: "#ffc107" }}
        ></i>
        <p style={{ marginTop: "16px" }}>
          ユーザー情報の読み込みに失敗しました
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/login")}>
          再ログイン
        </button>
      </div>
    );
  }

  // ==========================================================
  //【解决方案】在此处添加所有缺失的辅助函数
  // ==========================================================

  // 1. 定义标签页切换函数
  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  // 2. 定义生日格式化函数
  const formatBirthday = (dateString) => {
    if (!dateString) return "未設定";
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}年${month}月${day}日`;
    } catch (e) {
      return dateString; // 如果格式化失败，返回原始字符串
    }
  };

  // 3. 定义获取当前日期时间的函数
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  // 4. 定义药品列表过滤函数
  const getFilteredMedications = () => {
    if (!medications) return [];

    let filtered = medications;

    // 根据搜索词过滤
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (med) =>
          (med.name && med.name.toLowerCase().includes(lowercasedTerm)) ||
          (med.dosage && med.dosage.toLowerCase().includes(lowercasedTerm)) ||
          (med.schedule && med.schedule.toLowerCase().includes(lowercasedTerm))
      );
    }

    // (未来可以扩展) 根据分类过滤
    if (selectedCategory !== "all") {
      filtered = filtered.filter((med) => med.category === selectedCategory);
    }

    return filtered;
  };

  return (
    <>
      <div className="nav-bar">
        <button className="nav-back" onClick={goBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <span className="nav-title">マイページ</span>
        <button className="nav-menu" onClick={showMenu}>
          <i className="fas fa-bars"></i>
        </button>
      </div>

      <div className="container">
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === "basic" ? "active" : ""}`}
            onClick={() => switchTab("basic")}
          >
            基本情報
          </button>
          <button
            className={`nav-tab ${activeTab === "medication" ? "active" : ""}`}
            onClick={() => switchTab("medication")}
          >
            医薬品情報
          </button>
        </div>

        {activeTab === "basic" && (
          <div className="tab-content">
            <div className="patient-info">
              <div className="info-row">
                <span className="info-label">氏名:</span>
                <span className="info-value">{userInfo.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">メールアドレス:</span>
                <span className="info-value">{userInfo.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">生年月日:</span>
                <span className="info-value">
                  {formatBirthday(userInfo.birthday)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">血液型:</span>
                <span className="info-value">
                  {userInfo.blood_type || "未設定"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">アレルギー:</span>
                <span className="info-value">
                  {userInfo.allergy_name || "無し"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">基礎疾患:</span>
                <span className="info-value">{userInfo.condition_name}</span>
              </div>
            </div>
            {/* QR码直接显示区域 */}
            <div style={{ marginTop: "32px", textAlign: "center" }}>
              <h4 style={{ marginBottom: "12px", color: "#333" }}>
                <i className="fas fa-qrcode"></i> 患者QRコード
              </h4>
              <div
                className="qr-code"
                style={{
                  marginBottom: "16px",
                  width: "180px",
                  height: "180px",
                  margin: "0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="患者QRコード"
                    style={{
                      width: "100%",
                      maxWidth: "180px",
                      maxHeight: "180px",
                      height: "100%",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "180px",
                      height: "180px",
                      border: "2px dashed #ddd",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                    }}
                  >
                    <i
                      className="fas fa-qrcode"
                      style={{ fontSize: "3em" }}
                    ></i>
                  </div>
                )}
              </div>
              {qrImageUrl && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={downloadQRCode}
                  style={{ marginTop: "8px" }}
                >
                  <i className="fas fa-download"></i> ダウンロード
                </button>
              )}
              <p
                style={{ fontSize: "0.9em", color: "#666", marginTop: "10px" }}
              >
                このQRコードをスキャンして患者情報にアクセスできます
              </p>
            </div>
            <div className="update-info">
              <i className="fas fa-clock"></i> 最終更新: {getCurrentDateTime()}
            </div>
          </div>
        )}

        {activeTab === "medication" && (
          <div className="tab-content">
            {/* 搜索栏 */}
            <div style={{ marginBottom: "16px" }}>
              <div className="search-bar">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="薬品名または用法で検索"
                />
                <button className="btn btn-secondary btn-sm">
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>

            {/* 药品列表 */}
            <div className="medication-list">
              {getFilteredMedications().length > 0 ? (
                getFilteredMedications().map((medication, index) => (
                  <div key={index} className="medication-item">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <h4>{medication.name}</h4>
                      <span
                        className="status-badge status-active"
                        style={{ fontSize: "0.7em", padding: "2px 6px" }}
                      >
                        {medication.category}
                      </span>
                    </div>
                    <p>{medication.dosage}</p>
                    <p>{medication.schedule}</p>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#666",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                  }}
                >
                  <i
                    className="fas fa-search"
                    style={{
                      fontSize: "2em",
                      marginBottom: "12px",
                      color: "#ccc",
                    }}
                  ></i>
                  <p>検索条件に一致する薬品が見つかりません</p>
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: "12px" }}
                    >
                      フィルターをクリア
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 统计信息 */}
            {getFilteredMedications().length > 0 && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#f0f8ff",
                  borderRadius: "8px",
                  fontSize: "0.85em",
                  color: "#1976d2",
                }}
              >
                <i className="fas fa-info-circle"></i>
                {searchTerm
                  ? `検索結果: ${
                      getFilteredMedications().length
                    }件 (検索: "${searchTerm}")`
                  : `全薬品: ${getFilteredMedications().length}件`}
              </div>
            )}

            <div className="update-info">
              <i className="fas fa-clock"></i> 薬品リスト最終更新:{" "}
              {getCurrentDateTime()}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MyPage;
