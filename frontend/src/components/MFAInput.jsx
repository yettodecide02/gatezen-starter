import React from "react";

export default function MFAInput({ value, onChange, onSubmit, onCancel, hint }) {
  return (
    <div className="card" style={{ padding: 16, gap: 10 }}>
      <div className="title" style={{ fontWeight: 600 }}>Multi-Factor Authentication</div>
      <p className="muted" style={{ marginTop: -4 }}>Enter the 6-digit code sent to your device. (demo hint: <b>{hint || '******'}</b>)</p>
      <input
        className="input"
        placeholder="123456"
        value={value}
        maxLength={6}
        onChange={(e)=>onChange(e.target.value.replace(/\D/g,''))}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={onSubmit}>Verify</button>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
