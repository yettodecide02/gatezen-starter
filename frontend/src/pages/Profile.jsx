import { useMemo, useState } from "react";
import { FiUser, FiMail, FiHome } from "react-icons/fi";
import { getUser } from "../lib/auth";

function SectionHead({ icon, title, actions }) {
  return (
    <div className="section-head">
      <h2>
        <span className="section-icon">{icon}</span>
        {title}
      </h2>
      <div>{actions}</div>
    </div>
  );
}

function Row({ children, between }) {
  return <div className={`row ${between ? "between" : ""}`}>{children}</div>;
}

export default function Profile() {
  const baseUser = useMemo(() => getUser());

  const [user] = useState(baseUser);

  // ------------------- Renderers for each tab -------------------
  const ProfileForm = () => (
    <div className="card">
      <SectionHead icon={<FiUser />} title="Personal Info" />
      <div className="stack">
        <label className="item">
          <div className="item-title">
            <FiMail /> Email
          </div>
          <input
            className="select"
            value={user.email}
            readOnly
            placeholder="your@email.com"
            style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
          />
        </label>
        <label className="item">
          <div className="item-title">
            <FiMail /> Community
          </div>
          <input
            className="select"
            value={user.communityName}
            readOnly
            placeholder="Your community"
            style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
          />
        </label>
        <Row>
          <label className="item" style={{ flex: 1 }}>
            <div className="item-title">
              <FiHome /> Block
            </div>
            <input
              className="select"
              readOnly
              value={user.unit?.block?.name || user.blockName || ""}
              placeholder="Block/Building"
              style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
            />
          </label>
          <label className="item" style={{ flex: 1 }}>
            <div className="item-title">
              <FiHome /> Unit
            </div>
            <input
              className="select"
              readOnly
              value={user.unit?.number || user.unitNumber || ""}
              placeholder="Unit/Flat"
              style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
            />
          </label>
        </Row>
      </div>
    </div>
  );

  // ------------------- main layout -------------------
  return (
    <div className="modern-content">
      <ProfileForm />
    </div>
  );
}
