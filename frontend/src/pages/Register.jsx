import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import CaptchaCheckbox from "../components/CaptchaCheckbox";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "resident",
  });
  const [captcha, setCaptcha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const change = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setOk(""); setLoading(true);
    try {
      const res = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...form, captchaAccepted: captcha }),
      });
      setOk("Registered! You can sign in now.");
      setTimeout(()=> navigate("/", { replace: true }), 700);
    } catch (e) {
      setErr(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-badge">GZ</div>
          <div>
            <div className="brand-name">GateZen</div>
            <div className="brand-sub">Create your account</div>
          </div>
        </div>

        <form onSubmit={submit} className="auth-form">
          <input className="input" placeholder="Full name" value={form.name} onChange={(e)=>change('name', e.target.value)} required />
          <input className="input" type="email" placeholder="Email address" value={form.email} onChange={(e)=>change('email', e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e)=>change('password', e.target.value)} required />

          <select className="input" value={form.role} onChange={(e)=>change('role', e.target.value)}>
            <option value="resident">Resident</option>
            <option value="owner">Owner</option>
            <option value="staff">Staff</option>
          </select>

          <CaptchaCheckbox checked={captcha} onChange={setCaptcha} />

          <button className="auth-btn" disabled={loading}>{loading ? "Creating…" : "Create account"}</button>

          {err && <div className="auth-error">{err}</div>}
          {ok && <div className="auth-success">{ok}</div>}

          <div className="auth-foot muted">
            Already have an account? <Link to="/">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
