import { useState } from "react";
import { api } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [token, setToken] = useState(""); // for demo
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      const res = await api("/auth/request-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMsg(res?.message || "If the account exists, reset email sent.");
      if (res?.token) setToken(res.token); // dev only
    } catch (e) {
      setErr(e?.message || "Something went wrong");
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-badge">GZ</div>
          <div>
            <div className="brand-name">Reset password</div>
            <div className="brand-sub">We’ll email a reset link</div>
          </div>
        </div>
        <form onSubmit={submit} className="auth-form">
          <input className="input" placeholder="Your account email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <button className="auth-btn">Send reset link</button>
          {msg && <div className="auth-success">{msg}</div>}
          {token && <div className="muted" style={{fontSize:12}}>DEV token (paste in Reset): <code>{token}</code></div>}
          {err && <div className="auth-error">{err}</div>}
        </form>
      </div>
    </div>
  );
}
