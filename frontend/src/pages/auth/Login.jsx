import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from "react-icons/fi";
import axios from "axios";
import { isAdmin, isAuthed, isGatekeeper, setToken, setUser } from "../../lib/auth";
import GoogleSignin from "../../components/GoogleSignin";
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
  if (!isAuthed) return;

  if (isAdmin()) navigate("/admin");
  else if (isGatekeeper()) navigate("/gatekeeper");
  else if(isAuthed()) navigate("/dashboard");
}, [isAuthed, isAdmin, isGatekeeper, navigate]);


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
        setCaptcha(null);
        return;
      }

      setToken(res.data.jwttoken);
      if (res.data.user) setUser(res.data.user);

      if (res.data.user.status === "PENDING") {
        navigate("/pending", { replace: true });
      } else if (res.data.user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (res.data.user.role === "GATEKEEPER") {
        navigate("/gatekeeper", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (e) {
      setErr(e.response?.data?.error || "Login failed");
      setCaptcha(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            GZ
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">GateZen</div>
            <div className="text-sm text-gray-500">Community Portal</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <FiMail size={20} />
            </div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <FiLock size={20} />
            </div>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              {showPw ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
          </div>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <div className="flex justify-center">
            <ReCAPTCHA
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={(token) => setCaptcha(token)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              "Signing in…"
            ) : (
              <>
                <FiLogIn size={20} /> Sign In
              </>
            )}
          </button>
          <div className="w-full">
            <GoogleSignin />
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {err}
            </div>
          )}

          <div className="text-center text-gray-600 text-sm pt-4 border-t border-gray-200">
            New here?{" "}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Create an account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
