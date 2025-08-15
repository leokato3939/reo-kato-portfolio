import React, { useState } from "react";

function parseQuery() {
  const params = new URLSearchParams(window.location.search);
  const data = params.get("data");
  if (!data) return null;
  try {
    // QRコード内のdata=...がURLエンコードされている前提
    return JSON.parse(decodeURIComponent(data));
  } catch (e) {
    return null;
  }
}

const MedicalInfoViewer = () => {
  const [medicalInfo] = useState(parseQuery());

  if (!medicalInfo) {
    return <div style={{ color: "red" }}>データがありません（または形式が不正です）</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "2em auto", fontFamily: "sans-serif" }}>
      <h2>医療情報</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          <tr><th style={{ textAlign: "left" }}>氏名</th><td>{medicalInfo.name}</td></tr>
          <tr><th style={{ textAlign: "left" }}>生年月日</th><td>{medicalInfo.birthday}</td></tr>
          <tr><th style={{ textAlign: "left" }}>血液型</th><td>{medicalInfo.blood_type}</td></tr>
          <tr><th style={{ textAlign: "left" }}>アレルギー</th><td>{medicalInfo.allergy_name}</td></tr>
          <tr><th style={{ textAlign: "left" }}>既往歴</th><td>{medicalInfo.condition_name}</td></tr>
        </tbody>
      </table>
      <h3 style={{ marginTop: "2em" }}>服薬情報</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>薬剤名</th><th>用法</th><th>スケジュール</th>
          </tr>
        </thead>
        <tbody>
          {(medicalInfo.medications || []).map((m, i) => (
            <tr key={i}>
              <td>{m.name}</td>
              <td>{m.dosage}</td>
              <td>{m.schedule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MedicalInfoViewer;