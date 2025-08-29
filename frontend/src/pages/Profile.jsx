import React, { useEffect, useMemo, useState } from "react";
import {
  FiUser,
  FiPhone,
  FiHome,
  FiMapPin,
  FiUsers,
  FiPlus,
  FiTrash2,
  FiTruck,     // ✅ use truck instead of the non-existent FiCar
  FiShield,
  FiKey,
  FiBell,
  FiLock,
  FiMail,
  FiSave,
} from "react-icons/fi";
import { getUser, setUser } from "../lib/auth"; // uses your existing helpers

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

function PillTabs({ tabs, value, onChange }) {
  return (
    <div className="pillbar" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`pill ${value === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
          type="button"
        >
          {t.icon}
          <span>{t.label}</span>
          {typeof t.badge === "number" && t.badge > 0 ? <span className="badge">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Row({ children, between }) {
  return <div className={`row ${between ? "between" : ""}`}>{children}</div>;
}

export default function Profile() {
  // ------- load/save base user from localStorage -------
  const baseUser = useMemo(
    () =>
      getUser() || {
        id: "u1",
        name: "Admin",
        email: "admin@gatezen.app",
        phone: "",
        address: {
          flat: "",
          building: "",
          line1: "",
          city: "",
          pincode: "",
        },
        family: [],
        vehicles: [],
        notify: {
          email: true,
          sms: false,
          maintenance: true,
          payments: true,
          announcements: true,
        },
      },
    []
  );

  const [user, setUserState] = useState(baseUser);
  const [active, setActive] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // security tab state (mock)
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    // sync localStorage snapshot whenever user state changes
    setUser(user);
  }, [user]);

  const tabs = [
    { id: "profile", label: "Profile", icon: <FiUser /> },
    { id: "family", label: "Family", icon: <FiUsers />, badge: user.family?.length || 0 },
    { id: "address", label: "Address", icon: <FiMapPin /> },
    { id: "vehicles", label: "Vehicles", icon: <FiTruck />, badge: user.vehicles?.length || 0 }, // ✅ FiTruck
    { id: "security", label: "Security", icon: <FiShield /> },
    { id: "notify", label: "Notifications", icon: <FiBell /> },
  ];

  function saveWithToast(next) {
    setSaving(true);
    setMsg("");
    // mock async save
    setTimeout(() => {
      setUserState((prev) => (typeof next === "function" ? next(prev) : next));
      setSaving(false);
      setMsg("Saved successfully.");
      setTimeout(() => setMsg(""), 1800);
    }, 400);
  }

  // ------------------- Renderers for each tab -------------------
  const ProfileForm = () => (
    <div className="card">
      <SectionHead icon={<FiUser />} title="Personal Info" />
      <div className="stack">
        <label className="item">
          <div className="item-title"><FiUser /> Full Name</div>
          <input
            className="select"
            value={user.name}
            onChange={(e) => setUserState({ ...user, name: e.target.value })}
            placeholder="Your full name"
          />
        </label>
        <label className="item">
          <div className="item-title"><FiMail /> Email</div>
          <input
            className="select"
            value={user.email}
            onChange={(e) => setUserState({ ...user, email: e.target.value })}
            placeholder="you@example.com"
          />
        </label>
        <label className="item">
          <div className="item-title"><FiPhone /> Phone</div>
          <input
            className="select"
            value={user.phone || ""}
            onChange={(e) => setUserState({ ...user, phone: e.target.value })}
            placeholder="+91 90000 00000"
          />
        </label>

        <Row>
          <button
            className="btn primary"
            onClick={() => saveWithToast((prev) => ({ ...prev }))}
            disabled={saving}
            type="button"
          >
            <FiSave /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </Row>
        {msg && <div className="chip" role="status">{msg}</div>}
      </div>
    </div>
  );

  const FamilyForm = () => {
    const addMember = () =>
      setUserState({
        ...user,
        family: [...(user.family || []), { id: crypto.randomUUID(), name: "", relation: "", phone: "" }],
      });
    const remove = (id) => setUserState({ ...user, family: user.family.filter((m) => m.id !== id) });
    const edit = (id, field, value) =>
      setUserState({
        ...user,
        family: user.family.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
      });

    return (
      <div className="card">
        <SectionHead
          icon={<FiUsers />}
          title="Family Members"
          actions={
            <button className="btn" onClick={addMember} type="button">
              <FiPlus /> Add
            </button>
          }
        />
        <div className="list">
          {(user.family || []).length === 0 && <div className="empty">No family members added yet.</div>}
          {(user.family || []).map((m) => (
            <div key={m.id} className="list-item">
              <div className="grow" style={{ display: "grid", gap: 8 }}>
                <input
                  className="select"
                  placeholder="Name"
                  value={m.name}
                  onChange={(e) => edit(m.id, "name", e.target.value)}
                />
                <Row>
                  <input
                    className="select"
                    style={{ flex: 1 }}
                    placeholder="Relation (Spouse, Son, Mother...)"
                    value={m.relation}
                    onChange={(e) => edit(m.id, "relation", e.target.value)}
                  />
                  <input
                    className="select"
                    style={{ flex: 1 }}
                    placeholder="Phone"
                    value={m.phone}
                    onChange={(e) => edit(m.id, "phone", e.target.value)}
                  />
                </Row>
              </div>
              <button className="btn outline" onClick={() => remove(m.id)} type="button">
                <FiTrash2 /> Remove
              </button>
            </div>
          ))}
        </div>
        <Row style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => saveWithToast((p) => ({ ...p }))} disabled={saving} type="button">
            <FiSave /> {saving ? "Saving..." : "Save"}
          </button>
        </Row>
        {msg && <div className="chip" role="status">{msg}</div>}
      </div>
    );
  };

  const AddressForm = () => {
    const a = user.address || {};
    const setA = (field, value) => setUserState({ ...user, address: { ...a, [field]: value } });
    return (
      <div className="card">
        <SectionHead icon={<FiMapPin />} title="Address" />
        <div className="stack">
          <Row>
            <label className="item" style={{ flex: 1 }}>
              <div className="item-title"><FiHome /> Flat / Unit</div>
              <input className="select" value={a.flat || ""} onChange={(e) => setA("flat", e.target.value)} />
            </label>
            <label className="item" style={{ flex: 1 }}>
              <div className="item-title">Building</div>
              <input className="select" value={a.building || ""} onChange={(e) => setA("building", e.target.value)} />
            </label>
          </Row>
          <label className="item">
            <div className="item-title">Address Line</div>
            <input className="select" value={a.line1 || ""} onChange={(e) => setA("line1", e.target.value)} />
          </label>
          <Row>
            <label className="item" style={{ flex: 1 }}>
              <div className="item-title">City</div>
              <input className="select" value={a.city || ""} onChange={(e) => setA("city", e.target.value)} />
            </label>
            <label className="item" style={{ flex: 1 }}>
              <div className="item-title">PIN Code</div>
              <input className="select" value={a.pincode || ""} onChange={(e) => setA("pincode", e.target.value)} />
            </label>
          </Row>
          <Row>
            <button className="btn primary" onClick={() => saveWithToast((p) => ({ ...p }))} disabled={saving} type="button">
              <FiSave /> {saving ? "Saving..." : "Save"}
            </button>
          </Row>
          {msg && <div className="chip" role="status">{msg}</div>}
        </div>
      </div>
    );
  };

  const VehiclesForm = () => {
    const addV = () =>
      setUserState({
        ...user,
        vehicles: [...(user.vehicles || []), { id: crypto.randomUUID(), type: "Car", regNo: "", sticker: "" }],
      });
    const remove = (id) => setUserState({ ...user, vehicles: user.vehicles.filter((v) => v.id !== id) });
    const edit = (id, field, value) =>
      setUserState({
        ...user,
        vehicles: user.vehicles.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
      });

    return (
      <div className="card">
        <SectionHead
          icon={<FiTruck />} // ✅ truck icon
          title="Vehicles"
          actions={
            <button className="btn" onClick={addV} type="button">
              <FiPlus /> Add
            </button>
          }
        />
        <div className="list">
          {(user.vehicles || []).length === 0 && <div className="empty">No vehicles added yet.</div>}
          {(user.vehicles || []).map((v) => (
            <div key={v.id} className="list-item">
              <div className="grow" style={{ display: "grid", gap: 8 }}>
                <Row>
                  <select
                    className="select"
                    style={{ flex: 1 }}
                    value={v.type}
                    onChange={(e) => edit(v.id, "type", e.target.value)}
                  >
                    <option>Car</option>
                    <option>Bike</option>
                    <option>Scooter</option>
                    <option>Van</option>
                    <option>Other</option>
                  </select>
                  <input
                    className="select"
                    style={{ flex: 1 }}
                    placeholder="Registration No."
                    value={v.regNo}
                    onChange={(e) => edit(v.id, "regNo", e.target.value)}
                  />
                </Row>
                <input
                  className="select"
                  placeholder="Parking Sticker / RFID"
                  value={v.sticker}
                  onChange={(e) => edit(v.id, "sticker", e.target.value)}
                />
              </div>
              <button className="btn outline" onClick={() => remove(v.id)} type="button">
                <FiTrash2 /> Remove
              </button>
            </div>
          ))}
        </div>
        <Row style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => saveWithToast((p) => ({ ...p }))} disabled={saving} type="button">
            <FiSave /> {saving ? "Saving..." : "Save"}
          </button>
        </Row>
        {msg && <div className="chip" role="status">{msg}</div>}
      </div>
    );
  };

  const SecurityForm = () => {
    const canSubmit = pw.next.length >= 6 && pw.next === pw.confirm && pw.current;
    return (
      <div className="card">
        <SectionHead icon={<FiShield />} title="Security" />
        <div className="stack">
          <label className="item">
            <div className="item-title"><FiLock /> Current Password</div>
            <input
              type="password"
              className="select"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              placeholder="••••••••"
            />
          </label>
          <Row>
            <label className="item" style={{ flex: 1 }}>
              <div className="item-title"><FiKey /> New Password</div>
              <input
                type="password"
                className="select"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                placeholder="min 6 chars"
              />
            </label>
            <label className="item" style={{ flex: 1 }}>
              <div className="item-title"><FiKey /> Confirm</div>
              <input
                type="password"
                className="select"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                placeholder="re-enter"
              />
            </label>
          </Row>
          <Row>
            <button
              className="btn primary"
              disabled={!canSubmit || saving}
              onClick={() => {
                setSaving(true);
                setTimeout(() => {
                  setSaving(false);
                  setPw({ current: "", next: "", confirm: "" });
                  setMsg("Password updated.");
                  setTimeout(() => setMsg(""), 1800);
                }, 500);
              }}
              type="button"
            >
              <FiSave /> {saving ? "Updating..." : "Update Password"}
            </button>
          </Row>
          {msg && <div className="chip" role="status">{msg}</div>}
        </div>
      </div>
    );
  };

  const NotifyForm = () => {
    const n = user.notify || {};
    const toggle = (key) => setUserState({ ...user, notify: { ...n, [key]: !n[key] } });

    const Toggle = ({ id, label, desc }) => (
      <div className="list-item" style={{ alignItems: "flex-start" }}>
        <div className="grow">
          <div className="title">{label}</div>
          <div className="sub">{desc}</div>
        </div>
        <label className="switch" title={label}>
          <input type="checkbox" checked={!!n[id]} onChange={() => toggle(id)} />
          <span className="slider" />
        </label>
      </div>
    );

    return (
      <div className="card">
        <SectionHead icon={<FiBell />} title="Notifications" />
        <div className="list">
          <Toggle id="email" label="Email Alerts" desc="Receive updates, invoices and security alerts by email." />
          <Toggle id="sms" label="SMS Alerts" desc="Short critical alerts to your phone number." />
          <Toggle id="maintenance" label="Maintenance Updates" desc="Get status changes for your tickets." />
          <Toggle id="payments" label="Payment Reminders" desc="Due reminders, receipts and refund notices." />
          <Toggle id="announcements" label="Announcements" desc="Community-wide notices and events." />
        </div>
        <Row style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => saveWithToast((p) => ({ ...p }))} disabled={saving} type="button">
            <FiSave /> {saving ? "Saving..." : "Save"}
          </button>
        </Row>
        {msg && <div className="chip" role="status">{msg}</div>}
      </div>
    );
  };

  // ------------------- main layout -------------------
  return (
    <div className="modern-content">
      <PillTabs tabs={tabs} value={active} onChange={setActive} />

      {active === "profile" && <ProfileForm />}
      {active === "family" && <FamilyForm />}
      {active === "address" && <AddressForm />}
      {active === "vehicles" && <VehiclesForm />}
      {active === "security" && <SecurityForm />}
      {active === "notify" && <NotifyForm />}

      <div className="muted" style={{ marginTop: 10 }}>
        <FiMail /> Your email: <b>{user.email}</b>
      </div>
    </div>
  );
}
