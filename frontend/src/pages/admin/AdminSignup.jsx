import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiLock,
  FiHome,
  FiMapPin,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { setToken, setUser } from "../../lib/auth";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";

function AdminSignup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captcha, setCaptcha] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    communityName: "",
    address: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.communityName
    ) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (!captcha) {
      setError("Please complete the reCAPTCHA");
      setLoading(false);
      return;
    }

    try {
      // Send captcha token to backend for verification
      const requestData = {
        ...formData,
        "g-recaptcha-response": captcha, // Use the exact field name expected by backend
      };

      console.log("Sending signup request:", {
        ...requestData,
        password: "[HIDDEN]",
      });

      const res = await axios.post(
        import.meta.env.VITE_API_URL + "/auth/community-signup",
        requestData
      );

      if (res.data.user && res.data.jwttoken) {
        // Store user data and token
        setUser(res.data.user);
        setToken(res.data.jwttoken);

        // Navigate to community configuration page
        navigate("/admin/community");
      }
    } catch (err) {
      console.error("Admin signup error:", err);
      setError(err.response?.data?.error || "Failed to create admin account");
      setCaptcha(null); // Reset captcha on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-badge">GZ</div>
          <div>
            <div className="brand-name">GateZen</div>
            <div className="brand-sub">Community Setup</div>
          </div>
        </div>

        <h2
          style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: "700" }}
        >
          Create Your Community
        </h2>
        <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: "14px" }}>
          Set up your community and admin account
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Admin Name */}
          <div className="field">
            <div className="field-icon">
              <FiUser />
            </div>
            <input
              type="text"
              name="name"
              placeholder="Your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <div className="field-icon"></div>
          </div>

          {/* Admin Email */}
          <div className="field">
            <div className="field-icon">
              <FiMail />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Admin email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <div className="field-icon"></div>
          </div>

          {/* Admin Password */}
          <div className="field">
            <div className="field-icon">
              <FiLock />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Create password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {/* Community Name */}
          <div className="field">
            <div className="field-icon">
              <FiHome />
            </div>
            <input
              type="text"
              name="communityName"
              placeholder="Community name"
              value={formData.communityName}
              onChange={handleChange}
              required
            />
            <div className="field-icon"></div>
          </div>

          {/* Community Address */}
          <div className="field">
            <div className="field-icon">
              <FiMapPin />
            </div>
            <input
              type="text"
              name="address"
              placeholder="Community address (optional)"
              value={formData.address}
              onChange={handleChange}
            />
            <div className="field-icon"></div>
          </div>

          <ReCAPTCHA
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            onChange={(token) => setCaptcha(token)}
          />

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Community"}
          </button>
        </form>

        <div className="auth-foot">
          <span className="muted">Already have an account? </span>
          <button
            type="button"
            className="muted"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={() => navigate("/login")}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSignup;
