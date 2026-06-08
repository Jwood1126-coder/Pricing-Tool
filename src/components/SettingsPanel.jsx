import React, { useState } from "react";
import { T, S } from "../styles/tokens.js";

// Admin-configurable defaults, persisted to the meta store.
export default function SettingsPanel({ settings, onSave }) {
  const [floorPct, setFloorPct] = useState(String(Math.round(settings.floorMargin * 100)));
  const [dailyLimit, setDailyLimit] = useState(String(settings.dailyLimit));
  const [bulkLimit, setBulkLimit] = useState(String(settings.bulkLimit));
  const [saved, setSaved] = useState(false);

  function save() {
    onSave({
      floorMargin: (parseFloat(floorPct) || 0) / 100,
      dailyLimit: parseInt(dailyLimit, 10) || 100,
      bulkLimit: parseInt(bulkLimit, 10) || 25,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const field = (label, value, setter, suffix) => (
    <div>
      <label style={S.lbl}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input style={{ ...S.input, width: 120 }} type="number" value={value} onChange={(e) => setter(e.target.value)} />
        {suffix && <span style={{ fontSize: 12, color: T.slate }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div style={S.card}>
      <div style={S.head}><span>Admin Settings</span></div>
      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 20 }}>
          {field("Floor Margin", floorPct, setFloorPct, "%")}
          {field("Daily Lookup Limit", dailyLimit, setDailyLimit, "per user / day")}
          {field("Bulk Import Limit", bulkLimit, setBulkLimit, "items / batch")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button style={S.btn} onClick={save}>Save Settings</button>
          {saved && <span style={{ color: T.green, fontSize: 12, fontWeight: 700 }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
