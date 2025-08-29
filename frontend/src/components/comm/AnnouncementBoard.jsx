import React, { useEffect, useState } from "react";
import { api } from "../../api";

export default function AnnouncementBoard({ me }) {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const canPost = me?.role === "admin" || me?.role === "staff";

  const load = async () => {
    const data = await api("/announcements");
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const post = async (e) => {
    e.preventDefault();
    const res = await api("/announcements", {
      method: "POST",
      body: JSON.stringify({ title, body, email: me?.email }),
    });
    setTitle(""); setBody("");
    setItems(prev => [res, ...prev]);
  };

  return (
    <div className="stack" style={{ display: "grid", gap: 12 }}>
      {canPost && (
        <form className="card" onSubmit={post} style={{ gap: 8 }}>
          <div className="title">Post Announcement</div>
          <input className="input" placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} required />
          <textarea className="input" placeholder="Details" value={body} onChange={(e)=>setBody(e.target.value)} rows={3} required />
          <button className="btn">Publish</button>
        </form>
      )}

      <ul className="list">
        {items.map(a => (
          <li key={a.id} className="list-row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <div className="list-title">{a.title}</div>
              <div className="list-sub">{new Date(a.createdAt).toLocaleString()}</div>
              <div className="list-body">{a.body}</div>
              <Comments announcementId={a.id} me={me} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Comments({ announcementId, me }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState("");

  const load = async () => {
    const data = await api(`/announcements/${announcementId}/comments`);
    setList(data || []);
  };
  useEffect(() => { load(); }, [announcementId]);

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await api(`/announcements/${announcementId}/comments`, {
      method: "POST",
      body: JSON.stringify({ email: me?.email, body: text }),
    });
    setText("");
    setList(prev => [...prev, res]);
  };

  return (
    <div className="card" style={{ marginTop: 10, background: "#fafbff" }}>
      <div className="title" style={{ fontWeight: 600 }}>Comments</div>
      <ul className="list" style={{ marginTop: 8 }}>
        {list.map(c => (
          <li key={c.id} className="list-row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="list-body">{c.body}</div>
            <div className="list-sub">{new Date(c.createdAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
      <form onSubmit={add} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
        <input className="input" placeholder="Write a comment…" value={text} onChange={(e)=>setText(e.target.value)} />
        <button className="btn">Send</button>
      </form>
    </div>
  );
}
