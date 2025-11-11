import axios from "axios";
import { useEffect, useState } from "react";
import {
  FiLock,
  FiLogIn,
  FiMapPin,
  FiHome,
  FiGrid,
  FiRefreshCw,
  FiArrowLeft,
  FiCheck,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { isAuthed, setToken, setUser } from "../../lib/auth";
import ReCAPTCHA from "react-google-recaptcha";
import supabase from "../../lib/supabase";

export default function Register() {
  const navigate = useNavigate();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // Form fields
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  // Data arrays
  const [communities, setCommunities] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [units, setUnits] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [err, setErr] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (isAuthed()) navigate("/dashboard");
    async function fetchUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data) throw new Error("Data not found");
        const supU = data?.user;
        setName(supU.user_metadata.full_name);
        setEmail(supU.email);
        setPassword(import.meta.env.VITE_GOOGLE_SIGNUP_PASSWORD);
      } catch (e) {
        console.error(e);
      }
    }
    fetchUser();
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

  // Step 1: Check email, send OTP
  // const handleStep1Submit = async (e) => {
  //   e.preventDefault();
  //   setErr("");
  //   setLoading(true);

  //   try {
  //     // Check if user exists
  //     const existingUser = await axios.get(
  //       import.meta.env.VITE_API_URL + "/auth/existing-user",
  //       { params: { email } }
  //     );

  //     if (existingUser.data.exists) {
  //       setErr("User with this email already exists. Please login.");
  //       setLoading(false);
  //       return;
  //     }

  //     // Send OTP
  //     const otpResponse = await axios.post(
  //       import.meta.env.VITE_API_URL + "/auth/send-otp",
  //       { email: email, operation: "Sign-up" }
  //     );

  //     if (otpResponse.data.success) {
  //       setOtpSent(true);
  //       setCurrentStep(2);
  //       setErr("");
  //     } else {
  //       setErr("Failed to send OTP. Please try again.");
  //     }
  //   } catch (error) {
  //     console.error("Error in step 1:", error);
  //     setErr(
  //       error.response?.data?.error || "Failed to proceed. Please try again."
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Step 2: Verify OTP
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const verifyResponse = await axios.post(
        import.meta.env.VITE_API_URL + "/auth/check-otp",
        { email, otp }
      );

      if (verifyResponse.data.success) {
        await fetchCommunities();
        setCurrentStep(2);
        setErr("");
      } else {
        setErr("Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setErr(error.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Select community, block, unit and complete registration
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    console.log(await supabase.auth.getUser());
    
    if (!captcha) {
      setErr("Please complete the reCAPTCHA");
      setLoading(false);
      return;
    }

    if (!selectedCommunity) {
      setErr("Please select a community to continue");
      setLoading(false);
      return;
    }

    try {
      const requestData = {
        name,
        email,
        password,
        communityId: selectedCommunity,
        blockId: selectedBlock,
        unitId: selectedUnit,
        "g-recaptcha-response": captcha,
      };
      console.log(requestData);

      const res = await axios.post(
        import.meta.env.VITE_API_URL + "/auth/signup",
        requestData
      );

      if (res.status !== 201) {
        setErr("User registration failed");
        return;
      }

      setToken(res.data.jwttoken);

      if (res.data.user) setUser(res.data.user);

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

  const handleResendOTP = async () => {
    setSent(true);
    setErr("");
    setLoading(true);

    try {
      const otpResponse = await axios.post(
        import.meta.env.VITE_API_URL + "/auth/send-otp",
        { email: email, operation: "Sign-up" }
      );

      if (otpResponse.data.success) {
        setErr("OTP resent successfully!");
      } else {
        setErr("Failed to resend OTP. Please try again.");
      }
    } catch (error) {
      setErr("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <div className="mb-3 w-full flex flex-col ">
      <div className="flex items-center">
        {[1, 2].map((step) => (
          <div
            key={step}
            className={`flex items-center justify-center ${
              step == 2 ? "flex-1" : "flex-4"
            }  `}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  currentStep > step
                    ? "bg-green-500 text-white"
                    : currentStep === step
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {currentStep > step ? <FiCheck size={20} /> : step}
              </div>
              <span className="text-xs mt-2 font-medium text-gray-600">
                {step === 1 && "Verify"}
                {step === 2 && "Details"}
              </span>
            </div>
            {step < 2 && (
              <div
                className={`flex-1 h-1 mx-2 transition-all ${
                  currentStep > step ? "bg-green-500" : "bg-gray-200"
                }`}
              ></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 my-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            GZ
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">GateZen</div>
            <div className="text-sm text-gray-500">Community Portal</div>
          </div>
        </div>
        {renderProgressBar()}
        {/* Step 1: Email and Password */}

        {/* Step 2: OTP Verification */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Verify Email</h2>
              <p className="text-sm text-gray-500 mt-1">
                We've sent a verification code to{" "}
                <span className="font-semibold">{email}</span>
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <FiLock size={20} />
              </div>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                autoFocus
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-2xl tracking-widest font-semibold"
              />
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold disabled:opacity-50"
              >
                {!sent ? "Send OTP" : "Resend OTP"}
              </button>
            </div>

            {err && (
              <div
                className={`${
                  err.includes("successfully")
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                } border px-4 py-3 rounded-lg text-sm`}
              >
                {err}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setOtp("");
                  setErr("");
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2"
              >
                <FiArrowLeft size={20} /> Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Community, Block, Unit Selection */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Property Details
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select your community and unit
              </p>
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                {loadingCommunities ? (
                  <FiRefreshCw size={20} className="animate-spin" />
                ) : (
                  <FiMapPin size={20} />
                )}
              </div>
              <select
                value={selectedCommunity}
                onChange={handleCommunityChange}
                required
                disabled={loadingCommunities || communities.length === 0}
                className="w-full pl-12 pr-10 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400 hover:border-gray-300 cursor-pointer text-gray-700 font-medium"
              >
                <option value="" disabled className="text-gray-400">
                  {loadingCommunities
                    ? "Loading communities..."
                    : communities.length === 0
                    ? "No communities available"
                    : "Select your community"}
                </option>
                {communities.map((community) => (
                  <option
                    key={community.id}
                    value={community.id}
                    className="text-gray-700 py-2"
                  >
                    {community.name}{" "}
                    {community.address && `- ${community.address}`}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {communities.length === 0 && !loadingCommunities && (
                <button
                  type="button"
                  onClick={fetchCommunities}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors"
                >
                  Retry
                </button>
              )}
            </div>

            {selectedCommunity && (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                  {loadingBlocks ? (
                    <FiRefreshCw size={20} className="animate-spin" />
                  ) : (
                    <FiHome size={20} />
                  )}
                </div>
                <select
                  value={selectedBlock}
                  onChange={handleBlockChange}
                  disabled={loadingBlocks || blocks.length === 0}
                  className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
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
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            )}

            {selectedBlock && (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                  {loadingUnits ? (
                    <FiRefreshCw size={20} className="animate-spin" />
                  ) : (
                    <FiGrid size={20} />
                  )}
                </div>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  disabled={loadingUnits || units.length === 0}
                  className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
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
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptcha(token)}
              />
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {err}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(2);
                  setErr("");
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2"
              >
                <FiArrowLeft size={20} /> Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  "Completing..."
                ) : (
                  <>
                    <FiLogIn size={20} /> Complete Registration
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
