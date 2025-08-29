import React, { useEffect, useRef, useState } from "react";
import { api } from "../../api";

export default function ChatWindow({ me }) {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const loadThreads = async () => {
    const data = await api(`/chat/threads?email=${encodeURIComponent(me?.email)}`);
    setThreads(data || []);
    if (!active && data?.length) setActive(data[0]);
  };

  const loadMsgs = async (threadId) => {
    const data = await api(`/chat/messages?threadId=${encodeURIComponent(threadId)}`);
    setMsgs(data || []);
    setTimeout(()=> bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => { loadThreads(); }, []);
  useEffect(() => { if (active?.id) loadMsgs(active.id); }, [active?.id]);

  // Live updates
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const es = new EventSource(`${base}/events`);
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.threadId === active?.id) setMsgs(prev => [...prev, msg]);
    };
    es.addEventListener("chat:message", handler);
    return () => es.close();
  }, [active?.id]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    const res = await api("/chat/send", {
      method: "POST",
      body: JSON.stringify({ threadId: active.id, fromEmail: me?.email, body: text }),
    });
    setText("");
    setMsgs(prev => [...prev, res]);
    setTimeout(()=> bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
  };

  const createDm = async () => {
    const toEmail = prompt("Enter user email to DM:");
    if (!toEmail) return;
    const t = await api("/chat/dm", {
      method: "POST",
      body: JSON.stringify({ fromEmail: me?.email, toEmail }),
    });
    await loadThreads();
    setActive(t);
  };

  return (
    <div className="chat-grid" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12 }}>
      <div className="card">
        <div className="title" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Threads</span>
          <button className="btn ghost" onClick={createDm}>New DM</button>
        </div>
        <ul className="list">
          {threads.map(t => (
            <li key={t.id}
                className="list-row"
                style={{ gridTemplateColumns: "1fr auto", cursor: "pointer", background: active?.id===t.id?"#f1f5ff":"transparent", borderRadius: 8, padding: 6 }}
                onClick={()=>setActive(t)}>
              <div className="list-title">{t.name || "Direct Message"}</div>
              <div className="badge">{t.type.toUpperCase()}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ display: "grid", gridTemplateRows: "auto 1fr auto", minHeight: 340 }}>
        <div className="title">{active?.name || (active ? "Direct Message" : "Select a thread")}</div>
        <div className="scroll" style={{ overflow: "auto", display:"grid", gap:8, paddingRight:4 }}>
          {msgs.map(m => (
            <div key={m.id} className={`bubble ${m.fromUserId===me?.id ? "me": ""}`}>
              <div className="body">{m.body}</div>
              <div className="time">{new Date(m.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {active && (
          <form onSubmit={send} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input className="input" placeholder="Type a message…" value={text} onChange={(e)=>setText(e.target.value)} />
            <button className="btn">Send</button>
          </form>
        )}
      </div>
    </div>
  );
}
