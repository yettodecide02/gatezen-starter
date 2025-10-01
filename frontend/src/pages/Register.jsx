import axios from "axios";
import { useEffect, useState } from "react";
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiLogIn,
  FiMail,
  FiUser,
  FiMapPin,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { isAuthed, setUser } from "../lib/auth";
import GoogleSignin from "../components/GoogleSignin";
import ReCAPTCHA from "react-google-recaptcha";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [communities, setCommunities] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (isAuthed()) navigate("/dashboard");
    fetchCommunities();
  }, [navigate]);

  const fetchCommunities = async () => {
    setLoadingCommunities(true);
    setErr("");

    try {
      const response = await axios.get(
        import.meta.env.VITE_API_URL + "/auth/communities"
      );

      if (response.data.success) {
        setCommunities(response.data.data);
        if (response.data.data.length === 0) {
          setErr("No communities available. Please contact administrator.");
        }
      } else {
        setErr("Failed to load communities");
      }
    } catch (error) {
      console.error("Error fetching communities:", error);
      setErr("Failed to load communities. Please try again.");
    } finally {
      setLoadingCommunities(false);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    if (!captcha) {
      setErr("Please complete the reCAPTCHA");
      setLoading(false);
      return;
    }

    // Validate community selection
    if (!selectedCommunity) {
      setErr("Please select a community to continue");
      setLoading(false);
      return;
    }

    if (communities.length === 0) {
      setErr("No communities available. Please contact administrator.");
      setLoading(false);
      return;
    }

    try {
      const existingUser = await axios.get(
        import.meta.env.VITE_API_URL + "/auth/existing-user",
        { params: { email } }
      );

      if (existingUser.data.exists) {
        setErr("User with this email already exists. Please login.");
        return;
      }

      const res = await axios.post(
        import.meta.env.VITE_API_URL + "/auth/signup",
        {
          name: name,
          email: email,
          password: password,
          communityId: selectedCommunity,
          "g-recaptcha-response": captcha, // Send reCAPTCHA token to backend for verification
        }
      );
      console.log(res);
      if (res.status !== 201) {
        setErr("User registration failed");
        return;
      }

      localStorage.setItem("token", res.data.jwttoken);

      if (res.data.user) setUser(res.data.user);

      // Check user status after registration
      if (res.data.user.status === "PENDING") {
        navigate("/pending", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (e) {
      setErr(e.response?.data?.error || "Registration failed");
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
              <FiUser />
            </span>
            <input
              type="text"
              placeholder="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

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
              {loadingCommunities ? (
                <div className="spinner"></div>
              ) : (
                <FiMapPin />
              )}
            </span>
            <select
              value={selectedCommunity}
              onChange={(e) => setSelectedCommunity(e.target.value)}
              required
              disabled={loadingCommunities || communities.length === 0}
              className={selectedCommunity === "" ? "placeholder" : ""}
            >
              <option value="" disabled>
                {loadingCommunities
                  ? "Loading communities..."
                  : communities.length === 0
                  ? "No communities available"
                  : "Select your community"}
              </option>
              {communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}{" "}
                  {community.address && `- ${community.address}`}
                </option>
              ))}
            </select>
            {communities.length === 0 && !loadingCommunities && (
              <button
                type="button"
                className="retry-btn"
                onClick={fetchCommunities}
              >
                Retry
              </button>
            )}
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

          <ReCAPTCHA
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            onChange={(token) => setCaptcha(token)}
          />

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? (
              "Signing in…"
            ) : (
              <>
                <FiLogIn /> Sign Up
              </>
            )}
          </button>
          <GoogleSignin />

          {err && <div className="auth-error">{err}</div>}

          <div className="auth-foot muted">
            Already have an account? <Link to="/">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
