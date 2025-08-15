import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";

// ページコンポーネントのインポート
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import AdminDashboard from "./pages/AdminDashboard";
import InventoryManagementMobile from "./pages/InventoryManagementMobile";
import Setup from "./pages/Setup";
import MedicalInfoViewer from "./pages/MedicalInfoViewer";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 主要路由 */}
          <Route path="/login" element={<Login />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route
            path="/inventory-management"
            element={<InventoryManagementMobile />}
          />
          <Route path="/setup" element={<Setup />} />
          <Route path="/medical-info-viewer" element={<MedicalInfoViewer />} />
          {/* 任何未匹配的路径都重定向到登录页 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
