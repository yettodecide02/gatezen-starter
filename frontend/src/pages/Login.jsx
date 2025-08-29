import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { setUser, isAuthed } from "../lib/auth";
import CaptchaCheckbox from "../components/CaptchaCheckbox";
import MFAInput from "../components/MFAInput";
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from "react-icons/fi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("admin@gatezen.app");
  const [password, setPassword] = useState("admin123");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [captcha, setCaptcha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // MFA state
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaHint, setMfaHint] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (isAuthed()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const tryFinish = (res) => {
    if (!res?.user) throw new Error("Invalid response");
    setUser(res.user, { remember });
    navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
  };

  const startLogin = async () => {
    setErr(""); setLoading(true);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, captchaAccepted: captcha }),
      });

      if (res?.requiresMfa) {
        setRequiresMfa(true);
        setMfaHint(res?.hint);
        return;
      }
      tryFinish(res);
    } catch (e) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!captcha) { setErr("Please complete the CAPTCHA"); return; }
    await startLogin();
  };

  const verifyMfa = async () => {
    setErr(""); setLoading(true);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, captchaAccepted: captcha, mfaCode }),
      });
      tryFinish(res);
    } catch (e) {
      setErr(e?.message || "MFA verification failed");
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
            <div className="brand-sub">Community Portal</div>
          </div>
        </div>

        {!requiresMfa ? (
          <form onSubmit={submit} className="auth-form">
            <label className="field">
              <span className="field-icon"><FiMail /></span>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </label>

            <label className="field">
              <span className="field-icon"><FiLock /></span>
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </label>

            <div className="auth-row">
              <label className="remember">
                <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
                Remember me
              </label>
              <Link className="muted" to="/forgot">Forgot password?</Link>
            </div>

            <CaptchaCheckbox checked={captcha} onChange={setCaptcha} />

            <button className="auth-btn" disabled={loading}>
              {loading ? "Signing in…" : (<><FiLogIn /> Sign In</>)}
            </button>

            {err && <div className="auth-error">{err}</div>}

            <div className="auth-foot muted">
              New here? <Link to="/register">Create an account</Link>
            </div>
          </form>
        ) : (
          <MFAInput
            value={mfaCode}
            onChange={setMfaCode}
            onSubmit={verifyMfa}
            onCancel={()=> setRequiresMfa(false)}
            hint={mfaHint}
          />
        )}
      </div>
    </div>
  );
}
