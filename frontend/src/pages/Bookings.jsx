import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiXCircle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
} from "react-icons/fi";
import Toast from "../components/Toast";
import axios from "axios";

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

export default function Bookings() {
  const user = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("user")) || { id: "u1", name: "Admin" }
      );
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

  // Facilities + Bookings
  const [facilities, setFacilities] = useState([]);
  const [facilityId, setFacilityId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState("");
  const [note, setNote] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [peopleCount, setPeopleCount] = useState(1);
  const [slots, setSlots] = useState([]);

  const [userBookingsToday, setUserBookingsToday] = useState([]);
  const apiURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const token = localStorage.getItem("token");

  useEffect(() => {
    async function loadUserBookingsToday() {
      if (!user?.id || !date) return;
      try {
        const { data: list } = await axios.get(
          `${apiURL}/resident/user-bookings?userId=${user.id}&date=${date}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUserBookingsToday(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Error loading user bookings:", error);
        setUserBookingsToday([]);
      }
    }
    loadUserBookingsToday();
  }, [user?.id, date]);

  // Only enabled facilities for user's community
  async function loadFacilities() {
    try {
      const { data: f } = await axios.get(
        `${apiURL}/resident/facilities?communityId=${user.communityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Ensure we always set an array
      setFacilities(Array.isArray(f.data) ? f.data : []);

      if (!facilityId && Array.isArray(f.data) && f.data[0]) {
        setFacilityId(f.data[0].id);
      }
    } catch (error) {
      console.error("Error loading facilities:", error);
      setFacilities([]); // Set empty array on error
      showToast("Failed to load facilities");
    }
  }
  async function loadBookings() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (facilityId) params.set("facilityId", facilityId);
      if (date) params.set("date", date);
      const { data: list } = await axios.get(
        `${apiURL}/resident/bookings?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBookings(
        Array.isArray(list)
          ? list.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
          : []
      );
    } catch (error) {
      console.error("Error loading bookings:", error);
      setBookings([]);
      showToast("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  // Build slots for the day based on facility open/close and slotMins
  function buildSlots(facility, date) {
    if (!facility || !date) return [];

    // Validate operatingHours format
    if (
      !facility.operatingHours ||
      typeof facility.operatingHours !== "string"
    ) {
      console.warn("Invalid operatingHours format:", facility.operatingHours);
      return [];
    }

    const slots = [];
    const slotMins = facility.slotMins || 60; // Default to 60 minutes if not specified

    // Split and validate operating hours
    const hours = facility.operatingHours.split("-");
    if (hours.length !== 2) {
      console.warn(
        'Invalid operatingHours format, should be "HH:MM-HH:MM":',
        facility.operatingHours
      );
      return [];
    }

    const starttime = hours[0].trim();
    const endtime = hours[1].trim();

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(starttime) || !timeRegex.test(endtime)) {
      console.warn("Invalid time format, should be HH:MM:", {
        starttime,
        endtime,
      });
      return [];
    }

    try {
      const start = new Date(`${date}T${starttime}:00`);
      const end = new Date(`${date}T${endtime}:00`);

      // Validate that dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.warn("Invalid date/time combination:", {
          date,
          starttime,
          endtime,
        });
        return [];
      }

      // Ensure end time is after start time
      if (end <= start) {
        console.warn("End time must be after start time:", {
          starttime,
          endtime,
        });
        return [];
      }

      let curr = new Date(start);
      while (curr < end) {
        const slotStart = new Date(curr);
        const slotEnd = new Date(curr.getTime() + slotMins * 60000);
        if (slotEnd > end) break;

        // Validate slot times before adding
        if (!isNaN(slotStart.getTime()) && !isNaN(slotEnd.getTime())) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
        curr = slotEnd;
      }
    } catch (error) {
      console.error("Error building slots:", error, { facility, date });
      return [];
    }

    return slots;
  }

  useEffect(() => {
    loadFacilities();
  }, []);
  useEffect(() => {
    if (facilityId && date) {
      loadBookings();
    }
  }, [facilityId, date]);

  // Update slots when facility or date changes
  useEffect(() => {
    const facility = Array.isArray(facilities)
      ? facilities.find((f) => f.id === facilityId)
      : null;
    setSlots(buildSlots(facility, date));
    setSelectedSlot(""); // reset slot selection on facility/date change
  }, [facilities, facilityId, date]);

  // SSE live refresh
  useEffect(() => {
    const es = new EventSource(`${apiURL}/events`);

    const onBooking = () => loadBookings();

    es.addEventListener("booking", onBooking);
    es.onerror = () => {};
    return () => {
      es.removeEventListener("booking", onBooking);
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId, date]);

  const usedMins = Array.isArray(userBookingsToday)
    ? userBookingsToday.reduce((sum, b) => {
        const s = new Date(b.startsAt);
        const e = new Date(b.endsAt);
        return sum + Math.round((e - s) / 60000);
      }, 0)
    : 0;
  const minsLeft = Math.max(0, 180 - usedMins);

  // create booking
  async function createBooking(e) {
    e.preventDefault();
    if (!facilityId || !selectedSlot) return;

    const slot = slots.find((s) => s.start === selectedSlot);
    if (!slot) {
      showToast("Please select a valid slot");
      return;
    }

    // Prevent booking in the past
    if (new Date(slot.start) < new Date()) {
      showToast("Cannot book a slot in the past");
      return;
    }

    // Check if slot is already full
    const facility = Array.isArray(facilities)
      ? facilities.find((f) => f.id === facilityId)
      : null;
    const bookedCount = Array.isArray(bookings)
      ? bookings
          .filter(
            (b) =>
              new Date(b.startsAt).getTime() ===
                new Date(slot.start).getTime() &&
              new Date(b.endsAt).getTime() === new Date(slot.end).getTime() &&
              b.status === "confirmed"
          )
          .reduce((sum, b) => sum + (b.peopleCount || 1), 0)
      : 0;

    if (bookedCount + peopleCount > (facility?.capacity || 10)) {
      showToast("This slot is full");
      return;
    }

    try {
      const bookingData = {
        userId: user.id,
        facilityId,
        startsAt: slot.start,
        endsAt: slot.end,
        note,
        peopleCount,
      };

      const b = await axios.post(apiURL + "/resident/bookings", bookingData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNote("");
      showToast("Booking confirmed");
      setBookings((prev) => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return [...prevArray, b.data || b].sort(
          (a, b) => new Date(a.startsAt) - new Date(b.startsAt)
        );
      });
      // Refresh slots after booking
      setSlots(buildSlots(facility, date));
      setSelectedSlot("");
    } catch (err) {
      console.error("Booking error:", err);
      console.error("Response data:", err.response?.data);
      console.error("Response status:", err.response?.status);

      if (err.response?.data?.error) {
        showToast(err.response.data.error);
      } else if (err.response?.status === 404) {
        showToast(
          "Booking endpoint not found. Check if backend is running on correct port."
        );
      } else {
        showToast("Booking failed (conflict or network)");
      }
    }
  }

  async function cancelBooking(id) {
    try {
      await axios.patch(`${apiURL}/resident/bookings/${id}/cancel`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings((prev) => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return prevArray.map((b) =>
          b.id === id ? { ...b, status: "cancelled" } : b
        );
      });
      showToast("Booking cancelled");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      showToast("Failed to cancel booking");
    }
  }

  // date nav
  function shiftDay(delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  // current facility meta - add safety check
  const facility = Array.isArray(facilities)
    ? facilities.find((f) => f.id === facilityId)
    : null;

  return (
    <div className="modern-content">
      {toast && <Toast text={toast} />}

      {/* Header */}
      <div className="section-header">
        <div className="section-left">
          <div className="section-icon">
            <FiCalendar />
          </div>
          <h3 style={{ margin: 0 }}>Facility Bookings</h3>
        </div>
      </div>

      <div
        className="dashboard-grid"
        style={{ gridTemplateColumns: "minmax(320px, 420px) 1fr" }}
      >
        {/* Left: New booking */}
        <div className="modern-card" style={{ display: "grid", gap: 12 }}>
          <div className="card-header">
            <h3>
              <FiPlus style={{ verticalAlign: "-2px", marginRight: 8 }} /> New
              Booking
            </h3>
          </div>

          <form className="stack" onSubmit={createBooking}>
            <label className="label">Facility</label>
            <select
              className="select"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
            >
              {Array.isArray(facilities) &&
                facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facilityType}
                  </option>
                ))}
            </select>

            <label className="label">Date</label>
            <div className="row">
              <button
                className="btn outline"
                type="button"
                onClick={() => shiftDay(-1)}
              >
                <FiChevronLeft />
              </button>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                className="btn outline"
                type="button"
                onClick={() => shiftDay(+1)}
              >
                <FiChevronRight />
              </button>
            </div>

            <label className="label">Slot</label>
            <select
              className="select"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
            >
              <option value="">Select slot</option>
              {Array.isArray(slots) &&
                slots.map((slot, idx) => {
                  const bookedCount = Array.isArray(bookings)
                    ? bookings
                        .filter(
                          (b) =>
                            new Date(b.startsAt).getTime() ===
                              new Date(slot.start).getTime() &&
                            new Date(b.endsAt).getTime() ===
                              new Date(slot.end).getTime() &&
                            b.status === "confirmed"
                        )
                        .reduce((sum, b) => sum + (b.peopleCount || 1), 0)
                    : 0;

                  const slotLabel = `${fmtTime(slot.start)} – ${fmtTime(
                    slot.end
                  )} (${bookedCount}/${facility?.capacity || 10} booked)`;

                  // Disable if slot is fully booked or in the past
                  const isPast = new Date(slot.start) < new Date();
                  return (
                    <option
                      key={idx}
                      value={slot.start}
                      disabled={
                        bookedCount >= (facility?.capacity || 10) || isPast
                      }
                    >
                      {slotLabel}
                    </option>
                  );
                })}
            </select>

            <label className="label">How many people?</label>
            <input
              className="input"
              type="number"
              min={1}
              max={facility?.capacity || 10}
              value={peopleCount}
              onChange={(e) => setPeopleCount(Number(e.target.value))}
            />

            <label className="label">Note (optional)</label>
            <input
              className="input"
              placeholder="Birthday, match, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="muted">
              You have {Math.floor(minsLeft / 60)}h {minsLeft % 60}m left to
              book today.
            </div>

            <button className="btn primary" type="submit">
              <FiCheckCircle /> Confirm Booking
            </button>
            {facility && (
              <div className="muted">
                <FiClock style={{ verticalAlign: "-2px" }} />
                {facility.operatingHours ? (
                  <>
                    Hours: {facility.operatingHours} • Slot:{" "}
                    {facility.slotMins || 60}m
                  </>
                ) : (
                  <>Facility configuration loading...</>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Right: Day view / availability */}
        <div className="modern-card" style={{ display: "grid", gap: 12 }}>
          <div className="row between">
            <div className="label">Schedule — {facility?.name || "…"}</div>
            <button className="btn ghost" onClick={loadBookings}>
              <FiRefreshCw /> Refresh
            </button>
          </div>

          <div className="stack">
            {loading && <div className="muted">Loading…</div>}
            {!loading && Array.isArray(bookings) && bookings.length === 0 && (
              <div className="empty">No bookings for this day.</div>
            )}
            {Array.isArray(bookings) &&
              bookings.map((b) => (
                <div key={b.id} className="list-item">
                  <div className="grow">
                    <div className="title">
                      {fmtTime(b.startsAt)} – {fmtTime(b.endsAt)}
                    </div>
                    <div className="sub">{b.note || "—"}</div>
                  </div>
                  <div
                    className={`chip ${b.status === "confirmed" ? "" : "paid"}`}
                  >
                    {b.status === "confirmed" ? (
                      <>
                        <FiCalendar /> Confirmed
                      </>
                    ) : (
                      <>
                        <FiXCircle /> Cancelled
                      </>
                    )}
                  </div>
                  {b.userId === user.id && b.status !== "cancelled" && (
                    <button
                      className="btn outline"
                      onClick={() => cancelBooking(b.id)}
                    >
                      <FiXCircle /> Cancel
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
