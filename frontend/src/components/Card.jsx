import React from "react";

export default function Card({ title, icon, actions, children }) {
  return (
    <div className="modern-card">
      <div className="card-header" style={{justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {icon && <span className="card-icon">{icon}</span>}
          <h3>{title}</h3>
        </div>
        {actions}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}
