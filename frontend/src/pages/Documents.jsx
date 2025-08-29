import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { FiFileText, FiUpload, FiSearch, FiDownload, FiTrash2, FiFilter } from "react-icons/fi";

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function Documents() {
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || { id: "u1" }; }
    catch { return { id: "u1" }; }
  }, []);

  const [docs, setDocs] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (type) qs.set("type", type);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (user.id) qs.set("ownerId", user.id);
    const list = await api(`/documents?${qs.toString()}`);
    setDocs(list);
  }
  useEffect(() => { load(); }, [q, type, from, to]);

  // live updates
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const es = new EventSource(`${API_URL}/events`);
    const refresh = () => load();
    es.addEventListener("document", refresh);
    es.onerror = () => {};
    return () => { es.removeEventListener("document", refresh); es.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setMsg("");
    try {
      const b64 = await fileToBase64(f);
      const body = {
        ownerId: user.id,
        name: f.name,
        type: type || "other",
        tags: [],
        data: b64,
        mime: f.type || "application/octet-stream"
      };
      await api("/documents", { method:"POST", body: JSON.stringify(body) });
      setMsg("Upload complete.");
      await load();
    } catch (err) {
      setMsg("Upload failed.");
    } finally {
      setBusy(false);
      e.target.value = ""; // reset input
    }
  }

  async function del(id) {
    if (!confirm("Delete document?")) return;
    await api(`/documents/${id}`, { method:"DELETE" });
    await load();
  }

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  return (
    <div className="modern-content">
      <div className="section-header">
        <div className="section-left">
          <div className="section-icon"><FiFileText/></div>
          <h3 style={{margin:0}}>Documents</h3>
        </div>
        <label className="btn outline" style={{cursor:"pointer", position:"relative", overflow:"hidden"}}>
          <FiUpload/> Upload
          <input type="file" style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} onChange={onUpload} disabled={busy}/>
        </label>
      </div>

      <div className="modern-card" style={{display:"grid", gap:12}}>
        <div className="row between">
          <div className="row" style={{gap:8}}>
            <div className="input" style={{display:"flex", alignItems:"center", gap:8}}>
              <FiSearch/>
              <input className="input" style={{border:"none",boxShadow:"none",padding:0}} placeholder="Search by name/type/tag" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
            <div className="row" style={{gap:8}}>
              <div className="input" style={{display:"flex", alignItems:"center",gap:8, minWidth:160}}>
                <FiFilter/>
                <select className="input" style={{border:"none",boxShadow:"none",padding:0}} value={type} onChange={e=>setType(e.target.value)}>
                  <option value="">All types</option>
                  <option value="lease">Lease</option>
                  <option value="agreement">Agreement</option>
                  <option value="invoice">Invoice</option>
                  <option value="id">ID Proof</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)} />
              <input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)} />
            </div>
          </div>
          {msg && <div className="muted">{msg}</div>}
        </div>

        <div className="list">
          {docs.length === 0 && <div className="empty">No documents match your filters.</div>}
          {docs.map(d => (
            <div key={d.id} className="list-item">
              <div className="grow">
                <div className="title">{d.name}</div>
                <div className="sub">{d.type} • {new Date(d.createdAt).toLocaleString()}</div>
              </div>
              <a className="btn outline" href={`${API_URL}/documents/${d.id}/download`} target="_blank" rel="noreferrer">
                <FiDownload/> Download
              </a>
              <button className="btn" onClick={()=>del(d.id)}><FiTrash2/> Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
