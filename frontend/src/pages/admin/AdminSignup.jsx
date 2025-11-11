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
  FiShield,
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
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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
      const requestData = {
        ...formData,
        "g-recaptcha-response": captcha,
      };

      const res = await axios.post(
        import.meta.env.VITE_API_URL + "/auth/community-signup",
        requestData
      );

      if (res.data.user && res.data.jwttoken) {
        setUser(res.data.user);
        setToken(res.data.jwttoken);
        navigate("/admin/community");
      }
    } catch (err) {
      console.error("Admin signup error:", err);
      setError(err.response?.data?.error || "Failed to create admin account");
      setCaptcha(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              GZ
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">GateZen</div>
              <div className="text-sm text-gray-600">Community Setup</div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Create Your Community
            </h2>
            <p className="text-sm text-gray-600">
              Set up your community and admin account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <FiShield className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiUser size={18} />
                </div>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            {/* Admin Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Admin Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiMail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            {/* Admin Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiLock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Minimum 6 characters
              </p>
            </div>

            {/* Community Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Community Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiHome size={18} />
                </div>
                <input
                  type="text"
                  name="communityName"
                  placeholder="e.g., Green Valley Apartments"
                  value={formData.communityName}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            {/* Community Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Community Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiMapPin size={18} />
                </div>
                <input
                  type="text"
                  name="address"
                  placeholder="Optional: Street address, City, State"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            {/* reCAPTCHA */}
            <div className="flex justify-center py-2">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptcha(token)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </span>
              ) : (
                "Create Community"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminSignup;
