import React, { useEffect, useRef, useState } from "react";
import { getUser } from "../lib/auth";
import AnnouncementBoard from "../components/comm/AnnouncementBoard";
import DiscussionBoard from "../components/comm/DiscussionBoard";
import ChatWindow from "../components/comm/ChatWindow";
import { FiBell, FiMessageSquare, FiUsers } from "react-icons/fi";

export default function Communications() {
  const me = getUser();
  const [tab, setTab] = useState("ann"); // 'ann' | 'chat' | 'disc'
  const [badge, setBadge] = useState({ chat: 0, ann: 0, disc: 0 });
  const esRef = useRef(null);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const es = new EventSource(`${base}/events`);
    esRef.current = es;

    es.addEventListener("chat:message", () => setBadge(b => ({ ...b, chat: b.chat + 1 })));
    es.addEventListener("announcement:new", () => setBadge(b => ({ ...b, ann: b.ann + 1 })));
    es.addEventListener("announcement:comment", () => setBadge(b => ({ ...b, ann: b.ann + 1 })));
    es.addEventListener("discussion:new", () => setBadge(b => ({ ...b, disc: b.disc + 1 })));
    es.addEventListener("discussion:reply", () => setBadge(b => ({ ...b, disc: b.disc + 1 })));

    return () => es.close();
  }, []);

  useEffect(() => { setBadge(b => ({ ...b, [tab]: 0 })); }, [tab]);

  const TabBtn = ({ id, icon, label, count }) => (
    <button className={`pill ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
      <span className="icon">{icon}</span>
      {label}
      {count > 0 && <span className="badge">{count}</span>}
    </button>
  );

  return (
    <div className="card span-2" style={{ gridColumn: "1 / -1" }}>
      <div className="section-header">
        <div className="section-left">
          <span className="section-icon"><FiBell /></span>
          <h3>Announcements & Communication</h3>
        </div>
      </div>

      <div className="tabs" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <TabBtn id="ann" icon={<FiBell />} label="Bulletin" count={badge.ann} />
        <TabBtn id="chat" icon={<FiUsers />} label="Chat" count={badge.chat} />
        <TabBtn id="disc" icon={<FiMessageSquare />} label="Discussions" count={badge.disc} />
      </div>

      {tab === "ann" && <AnnouncementBoard me={me} />}
      {tab === "chat" && <ChatWindow me={me} />}
      {tab === "disc" && <DiscussionBoard me={me} />}
    </div>
  );
}
