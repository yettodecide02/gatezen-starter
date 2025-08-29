import { useState } from "react";
import { api } from "../api";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setOk(""); setErr("");
    try {
      const res = await api("/auth/reset", {
        method: "POST",
        body: JSON.stringify({ email, token, newPassword }),
      });
      setOk(res?.message || "Password updated");
    } catch (e) {
      setErr(e?.message || "Reset failed");
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-badge">GZ</div>
          <div>
            <div className="brand-name">Set new password</div>
            <div className="brand-sub">Use the email & token you received</div>
          </div>
        </div>
        <form onSubmit={submit} className="auth-form">
          <input className="input" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <input className="input" placeholder="Reset token" value={token} onChange={(e)=>setToken(e.target.value)} required />
          <input className="input" type="password" placeholder="New password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
          <button className="auth-btn">Update password</button>
          {ok && <div className="auth-success">{ok}</div>}
          {err && <div className="auth-error">{err}</div>}
        </form>
      </div>
    </div>
  );
}
