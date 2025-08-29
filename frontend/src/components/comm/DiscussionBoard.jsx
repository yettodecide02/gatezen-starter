import React, { useEffect, useState } from "react";
import { api } from "../../api";

export default function DiscussionBoard({ me }) {
  const [list, setList] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  const load = async () => {
    const data = await api("/discussions");
    setList(data || []);
  };
  useEffect(()=>{ load(); }, []);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const es = new EventSource(`${base}/events`);
    const onNew = () => load();
    es.addEventListener("discussion:new", onNew);
    es.addEventListener("discussion:reply", onNew);
    return () => es.close();
  }, []);

  const post = async (e) => {
    e.preventDefault();
    const res = await api("/discussions", {
      method: "POST",
      body: JSON.stringify({ email: me?.email, title, body, tags: tags.split(',').map(s=>s.trim()).filter(Boolean) }),
    });
    setTitle(""); setBody(""); setTags("");
    setList(prev => [res, ...prev]);
  };

  return (
    <div className="stack" style={{ display: "grid", gap: 12 }}>
      <form className="card" onSubmit={post} style={{ gap: 8 }}>
        <div className="title">Start a Discussion</div>
        <input className="input" placeholder="Topic title" value={title} onChange={(e)=>setTitle(e.target.value)} required />
        <textarea className="input" rows={3} placeholder="Say something…" value={body} onChange={(e)=>setBody(e.target.value)} required />
        <input className="input" placeholder="tags (comma separated)" value={tags} onChange={(e)=>setTags(e.target.value)} />
        <button className="btn">Post</button>
      </form>

      <ul className="list">
        {list.map(d => (
          <li key={d.id} className="list-row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <div className="list-title">{d.title}</div>
              <div className="list-sub">{new Date(d.createdAt).toLocaleString()}</div>
              <div className="list-body">{d.body}</div>
              {d.tags?.length ? (
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {d.tags.map((t, i) => <span key={i} className="badge">{t}</span>)}
                </div>
              ) : null}
              <Replies discussionId={d.id} me={me} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Replies({ discussionId, me }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState("");

  const load = async () => {
    const data = await api(`/discussions/${discussionId}/replies`);
    setList(data || []);
  };
  useEffect(()=>{ load(); }, [discussionId]);

  const send = async (e) => {
    e.preventDefault();
    const res = await api(`/discussions/${discussionId}/replies`, {
      method: "POST",
      body: JSON.stringify({ email: me?.email, body: text }),
    });
    setText("");
    setList(prev => [...prev, res]);
  };

  return (
    <div className="card" style={{ marginTop: 10, background: "#fafbff" }}>
      <div className="title" style={{ fontWeight: 600 }}>Replies</div>
      <ul className="list" style={{ marginTop: 8 }}>
        {list.map(r => (
          <li key={r.id} className="list-row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="list-body">{r.body}</div>
            <div className="list-sub">{new Date(r.createdAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
      <form onSubmit={send} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
        <input className="input" placeholder="Write a reply…" value={text} onChange={(e)=>setText(e.target.value)} />
        <button className="btn">Reply</button>
      </form>
    </div>
  );
}
