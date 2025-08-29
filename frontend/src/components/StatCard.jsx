import React from "react";

export default function StatCard({ icon, title, value, hint, accent = "indigo", loading }) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-top">
        <div className="stat-icon">{icon}</div>
        <div className="stat-title">{title}</div>
      </div>
      <div className="stat-value">{loading ? "…" : value}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  );
}
