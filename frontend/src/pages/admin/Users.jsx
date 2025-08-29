import React, { useEffect, useState } from "react";
import Card from "../../components/Card";
import { api } from "../../api";
import { FiUsers } from "react-icons/fi";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", role: "resident" });
  const load = () => api("/users").then(setUsers);
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    await api("/users", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", email: "", role: "resident" });
    load();
  };

  return (
    <div className="dashboard-grid">
      <Card title="Add User" icon={<FiUsers />}>
        <form onSubmit={add} style={{display:"grid", gap:12}}>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e)=>setForm({ ...form, name: e.target.value })}
            style={{padding:12, border:"1px solid #e5e7eb", borderRadius:8}}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e)=>setForm({ ...form, email: e.target.value })}
            style={{padding:12, border:"1px solid #e5e7eb", borderRadius:8}}
          />
          <select
            value={form.role}
            onChange={(e)=>setForm({ ...form, role: e.target.value })}
            style={{padding:12, border:"1px solid #e5e7eb", borderRadius:8}}
          >
            <option>resident</option>
            <option>admin</option>
            <option>security</option>
          </select>
          <button
            style={{background:"#0ea5e9", color:"#fff", border:"none", padding:"10px 14px", borderRadius:8, fontWeight:700}}
          >
            Add User
          </button>
        </form>
      </Card>

      <Card title="All Users" icon={<FiUsers />}>
        <ul style={{listStyle:"none", padding:0}}>
          {users.map(u => (
            <li key={u.id} style={{padding:"10px 0", borderBottom:"1px solid #eef2f7"}}>
              <b>{u.name}</b> — {u.email} <span style={{fontSize:12, color:"#64748b"}}>({u.role})</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
