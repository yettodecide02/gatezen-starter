import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from "react-icons/fi";
import axios from "axios";
import { isAdmin, isAuthed, setUser } from "../lib/auth";
import GoogleSignin from "../components/GoogleSignin";
import ReCAPTCHA from "react-google-recaptcha";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (isAuthed() && isAdmin()) navigate("/admin");
    else if (isAuthed()) navigate("/dashboard");
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!captcha) {
      setErr("Please complete the reCAPTCHA");
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post(
        import.meta.env.VITE_API_URL + "/auth/login",
        {
          email: email,
          password: password,
          "g-recaptcha-response": captcha,
        }
      );

      if (!res) {
        setErr("Invalid email or password");
        return;
      }

      localStorage.setItem("token", res.data.jwttoken);
      if (res.data.user) setUser(res.data.user);

      // Check user status
      if (res.data.user.status === "PENDING") {
        navigate("/pending", { replace: true });
      } else if (res.data.user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (e) {
      setErr(e.response?.data?.error || "Login failed");
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

        <form onSubmit={submit} className="auth-form">
          <label className="field">
            <span className="field-icon">
              <FiMail />
            </span>
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
            <span className="field-icon">
              <FiLock />
            </span>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw(!showPw)}
            >
              {showPw ? <FiEyeOff /> : <FiEye />}
            </button>
          </label>
          <div className="auth-forget">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <ReCAPTCHA
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            onChange={(token) => setCaptcha(token)}
          />

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? (
              "Signing in…"
            ) : (
              <>
                <FiLogIn /> Sign In
              </>
            )}
          </button>
          <GoogleSignin />

          {err && <div className="auth-error">{err}</div>}

          <div className="auth-foot muted">
            New here? <Link to="/register">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
