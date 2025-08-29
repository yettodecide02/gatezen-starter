// frontend/src/pages/admin/Users.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import {
  FiUserPlus, FiSearch, FiFilter, FiEdit2, FiTrash2, FiUserCheck,
  FiUserX, FiMail, FiShield, FiRefreshCw, FiCheckCircle, FiXCircle
} from "react-icons/fi";

const roleOptions = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "resident", label: "Resident" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const Badge = ({ children, tone = "default" }) => (
  <span
    className="chip"
    style={
      tone === "green"
        ? { background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" }
        : tone === "red"
        ? { background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" }
        : tone === "blue"
        ? { background: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe" }
        : {}
    }
  >
    {children}
  </span>
);

function UserModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial || { name: "", email: "", role: "resident", status: "inactive", verified: false }
  );

  useEffect(() => {
    setForm(
      initial || { name: "", email: "", role: "resident", status: "inactive", verified: false }
    );
  }, [initial, open]);

  if (!open) return null;

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{initial ? "Edit user" : "Add user"}</h3>
        </div>
        <div className="modal-body">
          <label className="label">Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
            placeholder="Full name"
          />

          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => change("email", e.target.value)}
            placeholder="name@example.com"
          />

          <div className="row">
            <div className="col">
              <label className="label">Role</label>
              <select
                className="select"
                value={form.role}
                onChange={(e) => change("role", e.target.value)}
              >
                {roleOptions
                  .filter((o) => o.value !== "all")
                  .map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col">
              <label className="label">Status</label>
              <select
                className="select"
                value={form.status}
                onChange={(e) => change("status", e.target.value)}
              >
                {statusOptions
                  .filter((o) => o.value !== "all")
                  .map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <label className="remember">
              <input
                type="checkbox"
                checked={!!form.verified}
                onChange={(e) => change("verified", e.target.checked)}
              />
              Mark as verified
            </label>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={() => onSave(form)}
            disabled={!form.name || !form.email}
          >
            {initial ? "Save changes" : "Create user"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [onlyPending, setOnlyPending] = useState(false);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      if (onlyPending) params.set("verified", "false");
      const list = await api(`/users?${params.toString()}`);
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initial

  // refetch when filters change (debounce search a bit)
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, status, onlyPending]);

  const resetFilters = () => {
    setQ("");
    setRole("all");
    setStatus("all");
    setOnlyPending(false);
  };

  const onCreate = async (form) => {
    await api("/users", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setModalOpen(false);
    setEditUser(null);
    await load();
  };

  const onSaveEdit = async (form) => {
    await api(`/users/${editUser.id}`, {
      method: "PATCH",
      body: JSON.stringify(form),
    });
    setModalOpen(false);
    setEditUser(null);
    await load();
  };

  const onVerify = async (id) => {
    await api(`/users/${id}/verify`, { method: "POST" });
    await load();
  };

  const onToggle = async (id) => {
    await api(`/users/${id}/toggle`, { method: "POST" });
    await load();
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this user?")) return;
    await api(`/users/${id}`, { method: "DELETE" });
    await load();
  };

  const filteredCount = useMemo(() => users.length, [users]);

  return (
    <div className="modern-content">
      <div className="section-head">
        <h2 className="row">
          <FiShield /> User & Account Management
        </h2>
        <div className="row">
          <button className="btn" onClick={resetFilters}>
            <FiRefreshCw /> Reset
          </button>
          <button
            className="btn primary"
            onClick={() => { setEditUser(null); setModalOpen(true); }}
          >
            <FiUserPlus /> Add user
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div className="row" style={{ flex: 1, minWidth: 260 }}>
            <FiSearch />
            <input
              className="input"
              placeholder="Search name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div className="row" style={{ gap: 8 }}>
            <div className="row">
              <FiFilter />
              <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
                {roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="row">
              <FiFilter />
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <label className="remember">
              <input
                type="checkbox"
                checked={onlyPending}
                onChange={(e) => setOnlyPending(e.target.checked)}
              />
              Pending verification
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="label">Users</div>
          <div className="muted">{loading ? "Loading…" : `${filteredCount} result(s)`}</div>
        </div>

        {users.length === 0 && !loading ? (
          <div className="empty">No users match your filters.</div>
        ) : (
          <div className="table">
            <div className="thead">
              <div>Name</div>
              <div>Role</div>
              <div>Status</div>
              <div>Verified</div>
              <div>Actions</div>
            </div>
            <div className="tbody">
              {users.map((u) => (
                <div className="trow" key={u.id}>
                  <div>
                    <div className="title">{u.name}</div>
                    <div className="sub"><FiMail /> {u.email}</div>
                  </div>

                  <div>
                    <Badge tone="blue"><FiShield /> {u.role}</Badge>
                  </div>

                  <div>
                    {u.status === "active" ? (
                      <Badge tone="green">Active</Badge>
                    ) : (
                      <Badge tone="red">Inactive</Badge>
                    )}
                  </div>

                  <div>
                    {u.verified ? (
                      <span className="row"><FiCheckCircle style={{ color: "#16a34a" }} /> Verified</span>
                    ) : (
                      <span className="row"><FiXCircle style={{ color: "#e11d48" }} /> Pending</span>
                    )}
                  </div>

                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className="btn outline"
                      title="Edit"
                      onClick={() => { setEditUser(u); setModalOpen(true); }}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="btn outline"
                      title={u.status === "active" ? "Deactivate" : "Activate"}
                      onClick={() => onToggle(u.id)}
                    >
                      {u.status === "active" ? <FiUserX /> : <FiUserCheck />}
                    </button>
                    {!u.verified && (
                      <button className="btn outline" title="Verify" onClick={() => onVerify(u.id)}>
                        <FiCheckCircle />
                      </button>
                    )}
                    <button className="btn outline" title="Delete" onClick={() => onDelete(u.id)}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <UserModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditUser(null); }}
        onSave={editUser ? onSaveEdit : onCreate}
        initial={editUser}
      />
    </div>
  );
}
