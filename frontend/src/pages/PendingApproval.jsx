import { FiClock, FiUserCheck, FiMail, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { clearUser, getUser } from "../lib/auth";

export default function PendingApproval() {
  const navigate = useNavigate();
  const user = getUser()

  const handleLogout = () => {
    clearUser()
    navigate("/");
  };

  return (
    <div className="pending-container">
      <div className="pending-card">
        <div className="pending-icon">
          <FiClock />
        </div>

        <h1 className="pending-title">Account Pending Approval</h1>

        <div className="pending-content">
          <p className="pending-message">
            Hello <strong>{user.name || "User"}</strong>,
          </p>
          <p className="pending-description">
            Your registration request is currently under review. Please consult
            your community head for approval of your account.
          </p>

          <div className="pending-info">
            <div className="info-item">
              <FiMail className="info-icon" />
              <span>Email: {user.email}</span>
            </div>
            <div className="info-item">
              <FiUserCheck className="info-icon" />
              <span>Status: Pending Approval</span>
            </div>
          </div>

          <div className="pending-steps">
            <h3>What's next?</h3>
            <ul>
              <li>Contact your community head or building administrator</li>
              <li>Provide necessary documentation if required</li>
              <li>Wait for approval notification</li>
              <li>You'll receive access once approved</li>
            </ul>
          </div>
        </div>

        <div className="pending-actions">
          <button onClick={handleLogout} className="pending-logout-btn">
            <FiLogOut />
            Logout & Try Different Account
          </button>
        </div>
      </div>
    </div>
  );
}
