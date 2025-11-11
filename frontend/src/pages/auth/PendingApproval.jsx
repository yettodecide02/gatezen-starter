import {
  FiClock,
  FiUserCheck,
  FiMail,
  FiLogOut,
  FiXCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { clearUser, getUser } from "../../lib/auth";

export default function PendingApproval() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  // Default to "PENDING" if no status is found
  const status = user?.status?.toUpperCase?.() || "PENDING";

  // Dynamic content based on status
  const isRejected = status === "REJECTED";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center border border-gray-100">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={`p-4 rounded-full ${
              isRejected
                ? "bg-red-100 text-red-600"
                : "bg-yellow-100 text-yellow-600"
            }`}
          >
            {isRejected ? (
              <FiXCircle className="text-4xl" />
            ) : (
              <FiClock className="text-4xl" />
            )}
          </div>
        </div>

        {/* Title */}
        <h1
          className={`text-2xl font-semibold mb-2 ${
            isRejected ? "text-red-700" : "text-gray-800"
          }`}
        >
          {isRejected ? "Account Rejected" : "Account Pending Approval"}
        </h1>

        <p className="text-gray-500 mb-6">
          Hello{" "}
          <span className="font-medium text-gray-700">
            {user.name || "User"}
          </span>
          ,
        </p>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          {isRejected
            ? "Unfortunately, your account registration request was rejected. Please contact your community head or administrator for more details."
            : "Your registration request is currently under review. Please contact your community head or building administrator for account approval."}
        </p>

        {/* Info Section */}
        <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3 mb-6">
          <div className="flex items-center space-x-3 text-gray-700">
            <FiMail className="text-gray-500" />
            <span className="text-sm">Email: {user.email}</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <FiUserCheck className="text-gray-500" />
            <span className="text-sm">
              Status:{" "}
              <span
                className={`font-medium ${
                  isRejected ? "text-red-600" : "text-yellow-600"
                }`}
              >
                {status === "PENDING" ? "Pending Approval" : "Rejected"}
              </span>
            </span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="text-left mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">
            {isRejected ? "Next steps" : "What's next?"}
          </h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {isRejected ? (
              <>
                <li>Contact your community head or building administrator</li>
                <li>Ask for clarification regarding the rejection</li>
                <li>Submit a new registration request if advised</li>
              </>
            ) : (
              <>
                <li>Contact your community head or building administrator</li>
                <li>Wait for approval email</li>
                <li>You'll receive access once approved</li>
              </>
            )}
          </ul>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2.5 rounded-lg hover:bg-red-600 transition-all duration-200"
        >
          <FiLogOut className="text-lg" />
          Logout & Try Different Account
        </button>
      </div>
    </div>
  );
}
