import React, { useEffect, useState } from "react";
import {
  FiHelpCircle,
  FiSearch,
  FiMessageSquare,
  FiPhone,
  FiMail,
  FiBookOpen,
  FiSend,
  FiCheckCircle,
  FiAlertCircle,
  FiExternalLink
} from "react-icons/fi";
import { api } from "../api";

const faqsSeed = [
  {
    q: "How do I reset my password?",
    a: "Go to Login → Forgot Password, enter your registered email, and follow the link sent to you."
  },
  {
    q: "Where can I see my maintenance requests?",
    a: "Open the Maintenance page. You can track statuses (submitted, in-progress, resolved) and add comments."
  },
  {
    q: "How do I download invoices/receipts?",
    a: "Go to Payments, open the payment row, and click Download Receipt."
  },
  {
    q: "How do I book community facilities?",
    a: "Visit the Bookings page, pick a date/time slot, and confirm. Double-booking is automatically prevented."
  }
];

export default function Help() {
  const [faqs, setFaqs] = useState(faqsSeed);
  const [query, setQuery] = useState("");
  const filtered = faqs.filter(
    f =>
      f.q.toLowerCase().includes(query.toLowerCase()) ||
      f.a.toLowerCase().includes(query.toLowerCase())
  );

  // Support form
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "General",
    message: ""
  });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ type: "", text: "" });

  useEffect(() => {
    // If you later wire a backend FAQs endpoint, load it here:
    // api("/faq").then(setFaqs).catch(() => {});
  }, []);

  const submitTicket = async (e) => {
    e.preventDefault();
    setSending(true);
    setToast({ type: "", text: "" });
    try {
      // If backend exists:
      // await api("/support", { method: "POST", body: JSON.stringify(form) });
      // Mock a successful send:
      await new Promise(r => setTimeout(r, 600));
      setToast({ type: "ok", text: "Thanks! Your message has been sent. We’ll get back to you shortly." });
      setForm({ name: "", email: "", topic: "General", message: "" });
    } catch (err) {
      setToast({ type: "err", text: "Could not send right now. Please try again in a moment." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modern-content">
      {/* Header / Quick actions */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-header">
          <div className="section-left">
            <div className="section-icon"><FiHelpCircle /></div>
            <h3 style={{ margin: 0 }}>Help & Support</h3>
          </div>
        </div>

        <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="chip"><FiBookOpen /> Community Guidelines</div>
          <div className="chip"><FiMessageSquare /> Contact Support</div>
          <div className="chip"><FiMail /> Email Us</div>
          <div className="chip"><FiPhone /> Call Desk</div>
        </div>
      </div>

      <div className="dash-grid">
        {/* FAQ / Knowledge Base */}
        <div className="card span-2">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon"><FiBookOpen /></div>
              <h3 style={{ margin: 0 }}>FAQs & Knowledge Base</h3>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <div className="field" style={{ width: 320, borderRadius: 12 }}>
                <div className="field-icon"><FiSearch /></div>
                <input
                  placeholder="Search help…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div style={{ width: 36 }} />
              </div>
            </div>
          </div>

          <ul className="list" style={{ marginTop: 10 }}>
            {filtered.map((f, i) => (
              <li key={i} className="item">
                <details>
                  <summary className="item-title" style={{ cursor: "pointer" }}>
                    {f.q}
                  </summary>
                  <div className="item-body" style={{ marginTop: 6 }}>
                    {f.a}
                  </div>
                </details>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="empty">No results. Try a different keyword.</li>
            )}
          </ul>
        </div>

        {/* Contact Channels */}
        <div className="card">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon"><FiMessageSquare /></div>
              <h3 style={{ margin: 0 }}>Contact Support</h3>
            </div>
          </div>

          <div className="stack">
            <a className="list-item" href="mailto:support@gatezen.app">
              <div className="section-icon"><FiMail /></div>
              <div className="grow">
                <div className="title">Email</div>
                <div className="sub">support@gatezen.app</div>
              </div>
              <FiExternalLink />
            </a>

            <a className="list-item" href="tel:+911234567890">
              <div className="section-icon"><FiPhone /></div>
              <div className="grow">
                <div className="title">Phone</div>
                <div className="sub">+91 12345 67890 (9 AM – 7 PM)</div>
              </div>
              <FiExternalLink />
            </a>

            <div className="list-item">
              <div className="section-icon"><FiMessageSquare /></div>
              <div className="grow">
                <div className="title">Live Chat</div>
                <div className="sub">Chat with our support team (beta)</div>
              </div>
              <button className="btn outline" type="button">Open</button>
            </div>
          </div>
        </div>

        {/* Submit a Ticket */}
        <div className="card span-2">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon"><FiSend /></div>
              <h3 style={{ margin: 0 }}>Submit a Support Ticket</h3>
            </div>
          </div>

          {toast.text && (
            <div
              className="payments-page banner"
              style={{
                background: toast.type === "ok" ? "#ecfdf5" : "#fef2f2",
                borderColor: toast.type === "ok" ? "#a7f3d0" : "#fecaca",
                color: toast.type === "ok" ? "#065f46" : "#991b1b"
              }}
            >
              {toast.type === "ok" ? <FiCheckCircle /> : <FiAlertCircle />}
              <div>{toast.text}</div>
            </div>
          )}

          <form className="stack" onSubmit={submitTicket}>
            <div className="row" style={{ gap: 12 }}>
              <label className="item" style={{ flex: 1 }}>
                <div className="item-title">Your Name</div>
                <input
                  className="select"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter your name"
                  required
                />
              </label>
              <label className="item" style={{ flex: 1 }}>
                <div className="item-title">Email</div>
                <input
                  type="email"
                  className="select"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                />
              </label>
            </div>

            <label className="item">
              <div className="item-title">Topic</div>
              <select
                className="select"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              >
                <option>General</option>
                <option>Payments & Billing</option>
                <option>Maintenance Requests</option>
                <option>Bookings</option>
                <option>Visitors & Access</option>
                <option>Account & Security</option>
              </select>
            </label>

            <label className="item">
              <div className="item-title">Message</div>
              <textarea
                className="select"
                style={{ minHeight: 120, resize: "vertical" }}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your issue or question…"
                required
              />
            </label>

            <div className="row">
              <button className="btn primary" type="submit" disabled={sending}>
                <FiSend /> {sending ? "Sending…" : "Send Message"}
              </button>
            </div>
          </form>
        </div>

        {/* Community Rules quick links */}
        <div className="card">
          <div className="section-header">
            <div className="section-left">
              <div className="section-icon"><FiBookOpen /></div>
              <h3 style={{ margin: 0 }}>Community Rules & Guides</h3>
            </div>
          </div>
          <div className="stack">
            <a className="list-item" href="/docs/community-rules.pdf" target="_blank">
              <div className="grow">
                <div className="title">Community Rules (PDF)</div>
                <div className="sub">Latest policy and etiquette for residents</div>
              </div>
              <FiExternalLink />
            </a>
            <a className="list-item" href="/docs/move-in-checklist.pdf" target="_blank">
              <div className="grow">
                <div className="title">Move-in Checklist</div>
                <div className="sub">Quick checklist for new residents</div>
              </div>
              <FiExternalLink />
            </a>
            <a className="list-item" href="/docs/emergency-contacts.pdf" target="_blank">
              <div className="grow">
                <div className="title">Emergency Contacts</div>
                <div className="sub">Security, maintenance, medical and more</div>
              </div>
              <FiExternalLink />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
