import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { FiCreditCard, FiCheckCircle, FiFileText, FiRepeat, FiZap, FiAlertCircle } from "react-icons/fi";

export default function Payments() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState("mock");
  const [autopay, setAutopay] = useState({ autopay: false, provider: "mock", last4: "0000" });

  const due = useMemo(() => items.filter(i => i.status === "due"), [items]);
  const history = useMemo(() => items.filter(i => i.status !== "due"), [items]);

  const load = async () => {
    const data = await api("/payments");
    setItems(data);
    const ap = await api("/payments/autopay");
    setAutopay(ap);
  };

  useEffect(() => { load(); }, []);

  const payNow = async (id) => {
    try {
      setBusy(true);
      // Use new unified checkout endpoint (provider can be mock/stripe/razorpay)
      const res = await api("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ id, provider })
      });
      if (provider === "mock") {
        // Payment completed server-side
        await load();
        alert("Payment successful (mock).");
        return;
      }
      if (provider === "stripe") {
        // In real integration, use Stripe.js to confirm card
        alert("Stripe client secret received. Integrate Stripe.js to complete the payment.");
        console.log("Stripe clientSecret:", res.clientSecret);
        return;
      }
      if (provider === "razorpay") {
        // In real integration, open Razorpay checkout with res.order.id
        alert("Razorpay order created. Integrate Razorpay Checkout to complete the payment.");
        console.log("Razorpay order:", res.order);
        return;
      }
    } catch (e) {
      console.error(e);
      alert("Payment failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadReceipt = async (id) => {
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const resp = await fetch(`${base}/payments/${id}/receipt`);
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || resp.statusText);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Cannot download receipt yet (only for paid items).");
    }
  };

  const toggleAutopay = async () => {
    const next = { autopay: !autopay.autopay, provider, last4: autopay.last4 || "0000" };
    const res = await api("/payments/autopay", {
      method: "POST",
      body: JSON.stringify(next)
    });
    setAutopay(res);
  };

  return (
    <div className="payments-page">
      {/* Alert / Reminder */}
      {due.length > 0 && (
        <div className="banner warn">
          <FiAlertCircle />
          <div>
            <strong>{due.length} invoice(s)</strong> pending — settle now to avoid late fees.
          </div>
        </div>
      )}

      {/* Provider + Autopay */}
      <div className="card row between center">
        <div className="row gap">
          <label className="label">Payment Provider</label>
          <select value={provider} onChange={(e)=>setProvider(e.target.value)} className="select">
            <option value="mock">Mock (demo)</option>
            <option value="stripe">Stripe</option>
            <option value="razorpay">Razorpay</option>
          </select>
          <span className="muted">Configure keys on backend for live providers.</span>
        </div>
        <div className="row gap center">
          <FiRepeat />
          <span>Auto-pay</span>
          <label className="switch">
            <input type="checkbox" checked={!!autopay.autopay} onChange={toggleAutopay} />
            <span className="slider" />
          </label>
          <span className="muted">{autopay.autopay ? `On (${autopay.provider}, **** ${autopay.last4})` : "Off"}</span>
        </div>
      </div>

      {/* Outstanding */}
      <section>
        <div className="section-head">
          <h2><FiCreditCard /> Outstanding Bills</h2>
        </div>
        {due.length === 0 ? (
          <div className="empty">No dues 🎉</div>
        ) : (
          <div className="list">
            {due.map(b => (
              <div className="list-item" key={b.id}>
                <div className="grow">
                  <div className="title">{b.description}</div>
                  <div className="sub">{new Date(b.createdAt).toLocaleString()}</div>
                </div>
                <div className="amt">{b.amount} {b.currency || "INR"}</div>
                <button className="btn primary" disabled={busy} onClick={()=>payNow(b.id)}>
                  <FiZap /> Pay now
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <div className="section-head">
          <h2><FiFileText /> Payment History</h2>
        </div>
        {history.length === 0 ? (
          <div className="empty">No previous payments</div>
        ) : (
          <div className="list">
            {history.map(h => (
              <div className="list-item" key={h.id}>
                <div className="grow">
                  <div className="title">{h.description}</div>
                  <div className="sub">
                    {h.status === "paid" ? `Paid on ${new Date(h.paidAt).toLocaleString()}` : h.status.toUpperCase()}
                  </div>
                </div>
                <div className={`chip ${h.status}`}><FiCheckCircle /> {h.status}</div>
                <button className="btn outline" onClick={()=>downloadReceipt(h.id)} disabled={h.status!=='paid'}>
                  <FiFileText /> Receipt
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
