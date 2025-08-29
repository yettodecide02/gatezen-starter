import React from "react";

export default function CaptchaCheckbox({ checked, onChange }) {
  return (
    <label className="remember" style={{ alignItems: "center" }}>
      <input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} />
      I’m not a robot
    </label>
  );
}
