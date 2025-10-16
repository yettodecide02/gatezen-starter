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
  FiHome,
  FiGrid,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { isAuthed, setToken, setUser } from "../lib/auth";
import GoogleSignin from "../components/GoogleSignin";
import ReCAPTCHA from "react-google-recaptcha";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [communities, setCommunities] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [units, setUnits] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
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

  const fetchBlocks = async (communityId) => {
    if (!communityId) return;

    setLoadingBlocks(true);
    setBlocks([]);
    setUnits([]);
    setSelectedBlock("");
    setSelectedUnit("");

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/auth/communities/${communityId}/blocks`
      );

      if (response.data.success) {
        setBlocks(response.data.data);
      } else {
        setErr("Failed to load blocks");
      }
    } catch (error) {
      console.error("Error fetching blocks:", error);
      setErr("Failed to load blocks. Please try again.");
    } finally {
      setLoadingBlocks(false);
    }
  };

  const fetchUnits = async (blockId) => {
    if (!blockId) return;

    setLoadingUnits(true);
    setUnits([]);
    setSelectedUnit("");

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/auth/blocks/${blockId}/units`
      );

      if (response.data.success) {
        setUnits(response.data.data);
      } else {
        setErr("Failed to load units");
      }
    } catch (error) {
      console.error("Error fetching units:", error);
      setErr("Failed to load units. Please try again.");
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleCommunityChange = (e) => {
    const communityId = e.target.value;
    setSelectedCommunity(communityId);
    if (communityId) {
      fetchBlocks(communityId);
    } else {
      setBlocks([]);
      setUnits([]);
      setSelectedBlock("");
      setSelectedUnit("");
    }
  };

  const handleBlockChange = (e) => {
    const blockId = e.target.value;
    setSelectedBlock(blockId);
    if (blockId) {
      fetchUnits(blockId);
    } else {
      setUnits([]);
      setSelectedUnit("");
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

      const requestData = {
        name: name,
        email: email,
        password: password,
        communityId: selectedCommunity,
        blockId: selectedBlock || null,
        unitId: selectedUnit || null,
        "g-recaptcha-response": captcha,
      };

      const res = await axios.post(
        import.meta.env.VITE_API_URL + "/auth/signup",
        requestData
      );

      console.log(res);
      if (res.status !== 201) {
        setErr("User registration failed");
        return;
      }

      setToken(res.data.jwttoken);

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
              onChange={handleCommunityChange}
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

          {/* Block Selection */}
          {selectedCommunity && (
            <label className="field">
              <span className="field-icon">
                {loadingBlocks ? <div className="spinner"></div> : <FiHome />}
              </span>
              <select
                value={selectedBlock}
                onChange={handleBlockChange}
                disabled={loadingBlocks || blocks.length === 0}
                className={selectedBlock === "" ? "placeholder" : ""}
              >
                <option value="" disabled>
                  {loadingBlocks
                    ? "Loading blocks..."
                    : blocks.length === 0
                    ? "No blocks available"
                    : "Select your block (optional)"}
                </option>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    Block {block.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Unit Selection */}
          {selectedBlock && (
            <label className="field">
              <span className="field-icon">
                {loadingUnits ? <div className="spinner"></div> : <FiGrid />}
              </span>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                disabled={loadingUnits || units.length === 0}
                className={selectedUnit === "" ? "placeholder" : ""}
              >
                <option value="" disabled>
                  {loadingUnits
                    ? "Loading units..."
                    : units.length === 0
                    ? "No units available"
                    : "Select your unit (optional)"}
                </option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    Unit {unit.number}
                  </option>
                ))}
              </select>
            </label>
          )}

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
