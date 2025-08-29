// frontend/src/pages/Bookings.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiPlus,
  FiUsers,
  FiXCircle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
} from "react-icons/fi";
import Toast from "../components/Toast";

function fmt(dt) {
  const d = new Date(dt);
  return d.toLocaleString();
}
function fmtTime(dt) {
  const d = new Date(dt);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function toISO(date, time) {
  // date: "YYYY-MM-DD", time: "HH:mm"
  return new Date(`${date}T${time}:00`).toISOString();
}
function addHours(iso, h) {
  return new Date(new Date(iso).getTime() + h * 3600e3).toISOString();
}

export default function Bookings() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || { id: "u1", name: "Admin" };
    } catch {
      return { id: "u1", name: "Admin" };
    }
  }, []);

  // toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();
  function showToast(t) {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  // Tabs: Facilities | Events
  const [tab, setTab] = useState("facilities");

  // Facilities + Bookings
  const [facilities, setFacilities] = useState([]);
  const [facilityId, setFacilityId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [durationHrs, setDurationHrs] = useState(1);
  const [note, setNote] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Events
  const [events, setEvents] = useState([]);

  async function loadFacilities() {
    const f = await api("/facilities");
    setFacilities(f);
    if (!facilityId && f[0]) setFacilityId(f[0].id);
  }
  async function loadBookings() {
    setLoading(true);
    const params = new URLSearchParams();
    if (facilityId) params.set("facilityId", facilityId);
    if (date) params.set("date", date);
    const list = await api(`/bookings?${params.toString()}`);
    setBookings(list.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)));
    setLoading(false);
  }
  async function loadEvents() {
    const e = await api("/events");
    // sort by start
    e.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    setEvents(e);
  }

  useEffect(() => {
    loadFacilities();
  }, []);
  useEffect(() => {
    if (facilityId && date) loadBookings();
  }, [facilityId, date]);

  // SSE live refresh
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const es = new EventSource(`${API_URL}/events`);

    const onBooking = () => loadBookings();
    const onEvent = () => loadEvents();

    es.addEventListener("booking", onBooking);
    es.addEventListener("event", onEvent);
    es.onerror = () => {};
    return () => {
      es.removeEventListener("booking", onBooking);
      es.removeEventListener("event", onEvent);
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId, date]);

  useEffect(() => {
    loadEvents();
  }, []);

  // create booking
  async function createBooking(e) {
    e.preventDefault();
    if (!facilityId) return;

    const startsAt = toISO(date, startTime);
    const endsAt = addHours(startsAt, Number(durationHrs));

    try {
      const b = await api("/bookings", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, facilityId, startsAt, endsAt, note }),
      });
      setNote("");
      showToast("Booking confirmed");
      // local refresh
      setBookings(prev => [...prev, b].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)));
    } catch (err) {
      try {
        const j = await err.json?.();
        if (j?.error) return showToast(j.error);
      } catch {}
      showToast("Booking failed (conflict or network)");
    }
  }

  async function cancelBooking(id) {
    await api(`/bookings/${id}/cancel`, { method: "PATCH" });
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status: "cancelled" } : b))
    );
    showToast("Booking cancelled");
  }

  async function toggleRSVP(id) {
    const e = await api(`/events/${id}/rsvp`, { method: "POST", body: JSON.stringify({ userId: user.id }) });
    setEvents(prev => prev.map(x => (x.id === id ? e : x)));
    const going = e.attendees.includes(user.id);
    showToast(going ? "RSVP'd ✅" : "RSVP removed");
  }

  // date nav
  function shiftDay(delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  // current facility meta
  const facility = facilities.find(f => f.id === facilityId);

  return (
    <div className="modern-content">
      {toast && <Toast text={toast} />}

      {/* Header */}
      <div className="section-header">
        <div className="section-left">
          <div className="section-icon"><FiCalendar /></div>
          <h3 style={{ margin: 0 }}>Bookings & Events</h3>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className={`pill ${tab === "facilities" ? "active" : ""}`} onClick={() => setTab("facilities")}>
            Facilities
          </button>
          <button className={`pill ${tab === "events" ? "active" : ""}`} onClick={() => setTab("events")}>
            Events
          </button>
        </div>
      </div>

      {tab === "facilities" ? (
        <div className="dashboard-grid" style={{ gridTemplateColumns: "minmax(320px, 420px) 1fr" }}>
          {/* Left: New booking */}
          <div className="modern-card" style={{ display: "grid", gap: 12 }}>
            <div className="card-header">
              <h3><FiPlus style={{ verticalAlign: "-2px", marginRight: 8 }} /> New Booking</h3>
            </div>

            <form className="stack" onSubmit={createBooking}>
              <label className="label">Facility</label>
              <select className="select" value={facilityId} onChange={e => setFacilityId(e.target.value)}>
                {facilities.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
              </select>

              <label className="label">Date</label>
              <div className="row">
                <button className="btn outline" type="button" onClick={() => shiftDay(-1)}><FiChevronLeft /></button>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                <button className="btn outline" type="button" onClick={() => shiftDay(+1)}><FiChevronRight /></button>
              </div>

              <div className="row" style={{ gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Start</label>
                  <input className="input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div style={{ width: 140 }}>
                  <label className="label">Duration</label>
                  <select className="select" value={durationHrs} onChange={e => setDurationHrs(e.target.value)}>
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                  </select>
                </div>
              </div>

              <label className="label">Note (optional)</label>
              <input className="input" placeholder="Birthday, match, etc." value={note} onChange={e => setNote(e.target.value)} />

              <button className="btn primary" type="submit"><FiCheckCircle /> Confirm Booking</button>
              {facility && (
                <div className="muted">
                  <FiClock style={{ verticalAlign: "-2px" }} /> Hours: {facility.open}–{facility.close} • Slot: {facility.slotMins}m
                </div>
              )}
            </form>
          </div>

          {/* Right: Day view / availability */}
          <div className="modern-card" style={{ display: "grid", gap: 12 }}>
            <div className="row between">
              <div className="label">Schedule — {facility?.name || "…"}</div>
              <button className="btn ghost" onClick={loadBookings}><FiRefreshCw /> Refresh</button>
            </div>

            <div className="stack">
              {loading && <div className="muted">Loading…</div>}
              {!loading && bookings.length === 0 && (
                <div className="empty">No bookings for this day.</div>
              )}
              {bookings.map(b => (
                <div key={b.id} className="list-item">
                  <div className="grow">
                    <div className="title">{fmtTime(b.startsAt)} – {fmtTime(b.endsAt)}</div>
                    <div className="sub">{b.note || "—"}</div>
                  </div>
                  <div className={`chip ${b.status === "confirmed" ? "" : "paid"}`}>
                    {b.status === "confirmed" ? <><FiCalendar /> Confirmed</> : <><FiXCircle /> Cancelled</>}
                  </div>
                  {b.userId === user.id && b.status !== "cancelled" && (
                    <button className="btn outline" onClick={() => cancelBooking(b.id)}><FiXCircle /> Cancel</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // EVENTS TAB
        <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="modern-card" style={{ display: "grid", gap: 12 }}>
            <div className="card-header">
              <h3><FiUsers style={{ verticalAlign: "-2px", marginRight: 8 }} /> Community Events</h3>
            </div>

            <div className="stack">
              {events.length === 0 && <div className="muted">No upcoming events.</div>}
              {events.map(ev => {
                const going = ev.attendees?.includes(user.id);
                return (
                  <div key={ev.id} className="list-item">
                    <div className="grow">
                      <div className="title">{ev.title}</div>
                      <div className="sub">
                        <FiMapPin style={{ verticalAlign: "-2px" }} /> {ev.location} • {fmt(ev.startsAt)} – {fmtTime(ev.endsAt)}
                      </div>
                      <div className="sub">{ev.description}</div>
                    </div>
                    <div className="chip"><FiUsers /> {ev.attendees?.length || 0} going</div>
                    <button className={`btn ${going ? "outline" : "primary"}`} onClick={() => toggleRSVP(ev.id)}>
                      {going ? <>Leave</> : <>RSVP</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
