import React from "react";

export default function SectionHeader({ icon, title, action }) {
  return (
    <div className="section-header">
      <div className="section-left">
        <span className="section-icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  );
}
