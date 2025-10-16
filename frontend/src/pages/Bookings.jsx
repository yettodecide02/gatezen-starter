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
  FiUser,
} from "react-icons/fi";
import { useToast, ToastContainer } from "../components/Toast";
import axios from "axios";
import { getToken, getUser } from "../lib/auth";

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
    const userData = getUser();
    if (!userData || !userData.id || !userData.communityId) {
      console.warn("User data incomplete:", userData);
      return {
        id: "u1",
        name: "Admin",
        communityId: "default-community", // Fallback - should be set from actual user data
      };
    }
    return userData;
  }, []);

  // Toast system
  const { toasts, addToast, removeToast } = useToast();

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
  const token = getToken();

  // Check authentication
  useEffect(() => {
    if (!token) {
      addToast(
        "error",
        "Authentication Required",
        "Please log in to access bookings"
      );
      return;
    }
    if (!user.communityId || user.communityId === "default-community") {
      addToast(
        "error",
        "Setup Required",
        "Please complete your profile setup to access bookings"
      );
      return;
    }
  }, [token, user.communityId, addToast]);

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
        addToast("error", "Error", "Failed to load your bookings");
      }
    }
    loadUserBookingsToday();
  }, [user?.id, date]);

  // Only enabled facilities for user's community
  async function loadFacilities() {
    if (!user.communityId || !token) {
      console.warn("Cannot load facilities: missing communityId or token");
      return;
    }

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
      if (error.response?.status === 401) {
        addToast("error", "Authentication Error", "Please log in again");
      } else if (error.response?.status === 403) {
        addToast(
          "error",
          "Access Denied",
          "You don't have permission to view facilities"
        );
      } else {
        addToast("error", "Error", "Failed to load facilities");
      }
    }
  }
  async function loadBookings() {
    if (!facilityId || !date || !token) {
      console.warn("Cannot load bookings: missing facilityId, date, or token");
      return;
    }

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
      if (error.response?.status === 401) {
        addToast("error", "Authentication Error", "Please log in again");
      } else if (error.response?.status === 403) {
        addToast(
          "error",
          "Access Denied",
          "You don't have permission to view bookings"
        );
      } else {
        addToast("error", "Error", "Failed to load bookings");
      }
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
    if (!facilityId || !selectedSlot) {
      addToast(
        "error",
        "Validation Error",
        "Please select a facility and time slot"
      );
      return;
    }

    const slot = slots.find((s) => s.start === selectedSlot);
    if (!slot) {
      addToast("error", "Invalid Slot", "Please select a valid time slot");
      return;
    }

    // Prevent booking in the past
    if (new Date(slot.start) < new Date()) {
      addToast("error", "Invalid Time", "Cannot book a slot in the past");
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
      addToast("error", "Slot Full", "This time slot is already fully booked");
      return;
    }

    // Check if user has enough time quota left
    if (minsLeft < (facility?.slotMins || 60)) {
      addToast(
        "error",
        "Time Limit",
        `You have exceeded your daily booking limit. Only ${Math.floor(
          minsLeft / 60
        )}h ${minsLeft % 60}m remaining.`
      );
      return;
    }

    try {
      const bookingData = {
        userId: user.id,
        facilityId,
        startsAt: slot.start,
        endsAt: slot.end,
        note: note.trim() || undefined,
        peopleCount,
        communityId: user.communityId,
      };

      const response = await axios.post(
        apiURL + "/resident/bookings",
        bookingData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Clear form
      setNote("");
      setPeopleCount(1);
      setSelectedSlot("");

      addToast("success", "Success", "Booking confirmed successfully");

      // Update bookings list
      setBookings((prev) => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return [...prevArray, response.data].sort(
          (a, b) => new Date(a.startsAt) - new Date(b.startsAt)
        );
      });

      // Refresh user bookings for quota calculation
      const dayStart = new Date(date + "T00:00:00.000Z");
      const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

      const { data: userBookings } = await axios.get(
        `${apiURL}/resident/user-bookings?userId=${user.id}&date=${date}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserBookingsToday(Array.isArray(userBookings) ? userBookings : []);
    } catch (err) {
      console.error("Booking error:", err);

      let errorMessage = "Booking failed. Please try again.";

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 400) {
        errorMessage = "Invalid booking data. Please check your inputs.";
      } else if (err.response?.status === 403) {
        errorMessage = "You don't have permission to make this booking.";
      } else if (err.response?.status === 404) {
        errorMessage = "Booking service not available. Please contact support.";
      } else if (err.response?.status === 409) {
        errorMessage = "This time slot conflicts with another booking.";
      } else if (err.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (!err.response) {
        errorMessage = "Network error. Please check your connection.";
      }

      addToast("error", "Booking Failed", errorMessage);
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
      addToast("success", "Success", "Booking cancelled successfully");

      // Refresh user bookings for quota calculation
      const { data: userBookings } = await axios.get(
        `${apiURL}/resident/user-bookings?userId=${user.id}&date=${date}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserBookingsToday(Array.isArray(userBookings) ? userBookings : []);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      addToast("error", "Error", "Failed to cancel booking");
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
      <ToastContainer toasts={toasts} onClose={removeToast} />

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

        {/* Right: Enhanced Schedule View */}
        <div className="modern-card">
          {/* Schedule Header */}
          <div className="schedule-header">
            <div className="schedule-title">
              <div className="schedule-icon">
                <FiCalendar />
              </div>
              <div>
                <h3 className="schedule-heading">
                  {facility?.name || "Select a Facility"}
                </h3>
                <p className="schedule-subtitle">
                  {date
                    ? new Date(date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Select a date"}
                </p>
              </div>
            </div>
            <button
              className={`btn-refresh `}
              onClick={loadBookings}
              disabled={loading}
            >
              <FiRefreshCw />
            </button>
          </div>

          {/* Date Navigation */}
          <div className="schedule-date-controls">
            <div className="date-nav-section">
              <label className="date-label">View bookings for:</label>
              <div className="date-picker-group">
                <button
                  className="btn ghost date-nav-btn"
                  type="button"
                  onClick={() => shiftDay(-1)}
                  title="Previous day"
                >
                  <FiChevronLeft />
                </button>
                <input
                  className="date-input-schedule"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]} 
                />
                <button
                  className="btn ghost date-nav-btn"
                  type="button"
                  onClick={() => shiftDay(+1)}
                  title="Next day"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
            <div className="quick-date-actions">
              <button
                className={`btn ghost quick-date-btn ${
                  date === new Date().toISOString().slice(0, 10) ? "active" : ""
                }`}
                onClick={() => setDate(new Date().toISOString().slice(0, 10))}
              >
                Today
              </button>
              <button
                className="btn ghost quick-date-btn"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setDate(tomorrow.toISOString().slice(0, 10));
                }}
              >
                Tomorrow
              </button>
              <button
                className="btn ghost quick-date-btn"
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setDate(nextWeek.toISOString().slice(0, 10));
                }}
              >
                Next Week
              </button>
            </div>
          </div>

          {/* Schedule Content */}
          <div className="schedule-content">
            {loading ? (
              <div className="schedule-loading">
                <div className="loading-spinner"></div>
                <p>Loading schedule...</p>
              </div>
            ) : !Array.isArray(bookings) || bookings.length === 0 ? (
              <div className="schedule-empty">
                <FiCalendar className="empty-icon" size={48} />
                <h4>No bookings scheduled</h4>
                <p>This facility is available for the entire day</p>
              </div>
            ) : (
              <div className="booking-timeline">
                {bookings.map((booking) => {
                  const isUserBooking = booking.userId === user.id;
                  const startTime = new Date(booking.startsAt);
                  const endTime = new Date(booking.endsAt);
                  const duration = Math.round(
                    (endTime - startTime) / (1000 * 60)
                  );

                  return (
                    <div
                      key={booking.id}
                      className={`booking-card ${
                        booking.status === "cancelled" ? "cancelled" : ""
                      } ${isUserBooking ? "your-booking" : ""}`}
                    >
                      <div className="booking-time">
                        <div className="time-display">
                          <span className="start-time">
                            {fmtTime(booking.startsAt)}
                          </span>
                          <span className="time-separator">—</span>
                          <span className="end-time">
                            {fmtTime(booking.endsAt)}
                          </span>
                        </div>
                        <div className="booking-duration">{duration} min</div>
                      </div>

                      <div className="booking-details">
                        <div className="booking-info">
                          <div className="booking-note">
                            {booking.note || "No description"}
                          </div>
                          <div className="booking-meta">
                            {booking.peopleCount && (
                              <span className="people-count">
                                <FiUser size={12} /> {booking.peopleCount}{" "}
                                people
                              </span>
                            )}
                            {isUserBooking && (
                              <span className="your-booking-badge">
                                Your booking
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="booking-actions">
                          <div
                            className={`status-badge ${
                              booking.status === "confirmed"
                                ? "status-confirmed"
                                : "status-cancelled"
                            }`}
                          >
                            {booking.status === "confirmed" ? (
                              <>
                                <FiCheckCircle size={12} />
                                Confirmed
                              </>
                            ) : (
                              <>
                                <FiXCircle size={12} />
                                Cancelled
                              </>
                            )}
                          </div>

                          {isUserBooking && booking.status !== "cancelled" && (
                            <button
                              className="cancel-btn"
                              onClick={() => cancelBooking(booking.id)}
                              title="Cancel your booking"
                            >
                              <FiXCircle size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
