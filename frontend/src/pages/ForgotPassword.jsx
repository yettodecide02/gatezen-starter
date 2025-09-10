import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [stage, setStage] = useState("email_verification");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    const url = import.meta.env.VITE_API_URL;
    try {
      if (stage === "email_verification") {
        if (!email.trim()) {
          setErr("Email is required");
          return;
        }
        const res = await axios.post(`${url}/auth/send-otp`, {
          email: email.trim(),
        });
        setMsg(res?.data?.message || "If the account exists, a code was sent.");
        setStage("otp");
      } else if (stage === "otp") {
        if (!otp.trim()) {
          setErr("Enter the verification code");
          return;
        }
        const res = await axios.post(`${url}/auth/check-otp`, {
          email: email.trim(),
          otp: otp.trim(),
        });
        setMsg(res?.data?.message || "Code verified. Set a new password.");
        setStage("reset");
      } else if (stage === "reset") {
        if (!newPassword) {
          setErr("New password is required");
          return;
        }
        const res = await axios.post(`${url}/auth/password-reset`, {
          email: email.trim(),
          password: newPassword,
        });
        if (!res) {
          setErr("Error resetting password");
          return;
        }
        navigate("/");
        setMsg(
          res?.data?.message ||
            "Password reset successful. You can now sign in."
        );
      }
    } catch (e) {
      console.error("Error resetting password:", e);
      setErr(
        e?.response?.data?.message || e?.message || "Something went wrong"
      );
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-badge">GZ</div>
          <div>
            <div className="brand-name">Reset password</div>
          </div>
        </div>
        <form onSubmit={submit} className="auth-form">
          {stage === "email_verification" && (
            <>
              <input
                className="input"
                type="email"
                placeholder="Your account email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="auth-btn" type="submit">
                Send code
              </button>
            </>
          )}
          {stage === "otp" && (
            <>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="Enter verification code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button className="auth-btn" type="submit">
                Verify code
              </button>
            </>
          )}
          {stage === "reset" && (
            <>
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button className="auth-btn" type="submit">
                Reset password
              </button>
            </>
          )}
          {msg && <div className="auth-success">{msg}</div>}
          {err && <div className="auth-error">{err}</div>}
        </form>
      </div>
    </div>
  );
}
