// frontend/src/pages/admin/AdminLogin.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FiMail, FiLock, FiShield, FiKey, FiLogIn, FiChevronLeft } from "react-icons/fi";
import { api } from "../../api";
import { setUser } from "../../lib/auth";

export default function AdminLogin() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("admin@gatezen.app");
  const [password, setPassword] = useState("admin123");
  const [tempToken, setTempToken] = useState("");
  const [code, setCode] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state && location.state.from) || "/admin";

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      // Step 1: ask server to start admin MFA flow
      const r = await api("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (r.mfaRequired && r.tempToken) {
        setTempToken(r.tempToken);
        setStep(2);
      } else {
        setErr("Unexpected response");
      }
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await api("/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ tempToken, code })
      });
      setUser(r.user);
      navigate(backTo, { replace: true });
    } catch (e2) {
      setErr(e2.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ width: "min(480px, 92vw)" }}>
        <div className="auth-brand">
          <div className="logo-badge">GZ</div>
          <div>
            <div className="brand-name">GateZen Admin</div>
            <div className="brand-sub">Administrator Access</div>
          </div>
        </div>

        {step === 1 && (
          <>
            <h3 style={{ margin: "6px 0 12px" }}>
              <FiShield style={{ verticalAlign: "-2px" }} /> Admin Login
            </h3>
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="field">
                <span className="field-icon"><FiMail /></span>
                <input
                  placeholder="Admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
                <span style={{ width: 36 }} />
              </div>
              <div className="field">
                <span className="field-icon"><FiLock /></span>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <span style={{ width: 36 }} />
              </div>

              {err && <div className="auth-error">{err}</div>}

              <button className="auth-btn" disabled={loading}>
                <FiLogIn /> {loading ? "Checking..." : "Continue"}
              </button>

              <div className="auth-row" style={{ marginTop: 6 }}>
                <Link to="/" className="muted"><FiChevronLeft /> Back to user login</Link>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ margin: "6px 0 12px" }}>
              <FiKey style={{ verticalAlign: "-2px" }} /> MFA Verification
            </h3>
            <p className="muted" style={{ margin: "0 0 10px" }}>
              Enter the 6-digit code (demo code is <b>123456</b>).
            </p>
            <form className="auth-form" onSubmit={handleVerify}>
              <div className="field">
                <span className="field-icon"><FiKey /></span>
                <input
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                />
                <span style={{ width: 36 }} />
              </div>

              {err && <div className="auth-error">{err}</div>}

              <button className="auth-btn" disabled={loading}>
                <FiLogIn /> {loading ? "Verifying..." : "Verify & Enter"}
              </button>

              <div className="auth-row" style={{ justifyContent: "flex-start" }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => { setStep(1); setCode("123456"); setErr(""); }}
                >
                  <FiChevronLeft /> Back
                </button>
              </div>
            </form>
          </>
        )}

        <div className="auth-foot">© {new Date().getFullYear()} GateZen</div>
      </div>
    </div>
  );
}
