import { useEffect, useMemo, useState } from "react";
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
  FiAlertCircle,
} from "react-icons/fi";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";

// Toast Hook
function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}

// Toast Container Component
function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-sm animate-slide-in ${
            toast.type === "success"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4
              className={`font-semibold mb-1 ${
                toast.type === "success" ? "text-green-900" : "text-red-900"
              }`}
            >
              {toast.title}
            </h4>
            <p
              className={`text-sm ${
                toast.type === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => onClose(toast.id)}
            className={`p-1 rounded hover:bg-opacity-20 ${
              toast.type === "success"
                ? "hover:bg-green-600"
                : "hover:bg-red-600"
            }`}
          >
            <FiXCircle className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function fmt(dt) {
  const d = new Date(dt);
  return d.toLocaleString();
}

function fmtTime(dt) {
  const d = new Date(dt);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Bookings() {
  const user = useMemo(() => {
    const userData = getUser();
    if (!userData || !userData.id || !userData.communityId) {
      return {
        id: "u1",
        name: "Admin",
        communityId: "default-community",
      };
    }
    return userData;
  }, []);

  const { toasts, addToast, removeToast } = useToast();

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
      addToast("error", "Setup Required", "Please complete your profile setup");
      return;
    }
  }, [token, user.communityId]);

  useEffect(() => {
    async function loadUserBookingsToday() {
      if (!user?.id || !date) return;
      try {
        const { data: list } = await axios.get(
          `${apiURL}/resident/user-bookings?userId=${user.id}&date=${date}`,
          { headers: { Authorization: `Bearer ${token}` } }
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

  async function loadFacilities() {
    if (!user.communityId || !token) return;

    try {
      const { data: f } = await axios.get(
        `${apiURL}/resident/facilities?communityId=${user.communityId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFacilities(Array.isArray(f.data) ? f.data : []);

      if (!facilityId && Array.isArray(f.data) && f.data[0]) {
        setFacilityId(f.data[0].id);
      }
    } catch (error) {
      console.error("Error loading facilities:", error);
      setFacilities([]);
      addToast("error", "Error", "Failed to load facilities");
    }
  }

  async function loadBookings() {
    if (!facilityId || !date || !token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (facilityId) params.set("facilityId", facilityId);
      if (date) params.set("date", date);
      const { data: list } = await axios.get(
        `${apiURL}/resident/bookings?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookings(
        Array.isArray(list)
          ? list.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
          : []
      );
    } catch (error) {
      console.error("Error loading bookings:", error);
      setBookings([]);
      addToast("error", "Error", "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  function buildSlots(facility, date) {
    if (!facility || !date || !facility.operatingHours) return [];

    const slots = [];
    const slotMins = facility.slotMins || 60;
    const hours = facility.operatingHours.split("-");
    if (hours.length !== 2) return [];

    const starttime = hours[0].trim();
    const endtime = hours[1].trim();

    try {
      const start = new Date(`${date}T${starttime}:00`);
      const end = new Date(`${date}T${endtime}:00`);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return [];
      }

      let curr = new Date(start);
      while (curr < end) {
        const slotStart = new Date(curr);
        const slotEnd = new Date(curr.getTime() + slotMins * 60000);
        if (slotEnd > end) break;

        if (!isNaN(slotStart.getTime()) && !isNaN(slotEnd.getTime())) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
        curr = slotEnd;
      }
    } catch (error) {
      console.error("Error building slots:", error);
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

  useEffect(() => {
    const facility = Array.isArray(facilities)
      ? facilities.find((f) => f.id === facilityId)
      : null;
    setSlots(buildSlots(facility, date));
    setSelectedSlot("");
  }, [facilities, facilityId, date]);

  useEffect(() => {
    const es = new EventSource(`${apiURL}/events`);
    const onBooking = () => loadBookings();
    es.addEventListener("booking", onBooking);
    es.onerror = () => {};
    return () => {
      es.removeEventListener("booking", onBooking);
      es.close();
    };
  }, [facilityId, date]);

  const usedMins = Array.isArray(userBookingsToday)
    ? userBookingsToday.reduce((sum, b) => {
        const s = new Date(b.startsAt);
        const e = new Date(b.endsAt);
        return sum + Math.round((e - s) / 60000);
      }, 0)
    : 0;
  const minsLeft = Math.max(0, 180 - usedMins);

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

    if (new Date(slot.start) < new Date()) {
      addToast("error", "Invalid Time", "Cannot book a slot in the past");
      return;
    }

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

    if (minsLeft < (facility?.slotMins || 60)) {
      addToast(
        "error",
        "Time Limit",
        `You have exceeded your daily booking limit`
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

      setNote("");
      setPeopleCount(1);
      setSelectedSlot("");
      addToast("success", "Success", "Booking confirmed successfully");

      setBookings((prev) => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return [...prevArray, response.data].sort(
          (a, b) => new Date(a.startsAt) - new Date(b.startsAt)
        );
      });

      const { data: userBookings } = await axios.get(
        `${apiURL}/resident/user-bookings?userId=${user.id}&date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserBookingsToday(Array.isArray(userBookings) ? userBookings : []);
    } catch (err) {
      console.error("Booking error:", err);
      addToast("error", "Booking Failed", "Booking failed. Please try again.");
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

      const { data: userBookings } = await axios.get(
        `${apiURL}/resident/user-bookings?userId=${user.id}&date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserBookingsToday(Array.isArray(userBookings) ? userBookings : []);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      addToast("error", "Error", "Failed to cancel booking");
    }
  }

  function shiftDay(delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }

  const facility = Array.isArray(facilities)
    ? facilities.find((f) => f.id === facilityId)
    : null;

  return (
    <div>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <FiCalendar className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Facility Bookings
          </h1>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: New Booking Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-4">
              <FiPlus className="w-4 h-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                New Booking
              </h2>
            </div>

            <form onSubmit={createBooking} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facility
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => shiftDay(-1)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FiChevronLeft className="w-5 h-5" />
                  </button>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => shiftDay(+1)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Slot
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of People
                </label>
                <input
                  type="number"
                  min={1}
                  max={facility?.capacity || 10}
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="Birthday, match, etc."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="p-1 bg-indigo-50 rounded-lg">
                <p className="text-xs text-indigo-700 flex justify-center items-center">
                  <FiClock className="inline w-3 h-3 mr-1" />
                  {Math.floor(minsLeft / 60)}h {minsLeft % 60}m left
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                <FiCheckCircle className="w-4 h-4" />
                Confirm Booking
              </button>
            </form>
          </div>

          {/* Right: Schedule View */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            {/* Schedule Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FiCalendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {facility?.name || "Select a Facility"}
                  </h2>
                  <p className="text-sm text-gray-500">
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
                onClick={loadBookings}
                disabled={loading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <FiRefreshCw
                  className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {/* Quick Date Actions */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setDate(new Date().toISOString().slice(0, 10))}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  date === new Date().toISOString().slice(0, 10)
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setDate(tomorrow.toISOString().slice(0, 10));
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Tomorrow
              </button>
              <button
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setDate(nextWeek.toISOString().slice(0, 10));
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Next Week
              </button>
            </div>

            {/* Schedule Content */}
            <div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500">Loading schedule...</p>
                </div>
              ) : !Array.isArray(bookings) || bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FiCalendar className="w-12 h-12 text-gray-300 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    No bookings scheduled
                  </h4>
                  <p className="text-gray-500">
                    This facility is available for the entire day
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
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
                        className={`border rounded-lg p-4 ${
                          booking.status === "cancelled"
                            ? "bg-gray-50 border-gray-200 opacity-60"
                            : isUserBooking
                            ? "bg-indigo-50 border-indigo-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <span>{fmtTime(booking.startsAt)}</span>
                                <span className="text-gray-400">—</span>
                                <span>{fmtTime(booking.endsAt)}</span>
                              </div>
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                {duration} min
                              </span>
                            </div>

                            <p className="text-sm text-gray-700 mb-2">
                              {booking.note || "No description"}
                            </p>

                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {booking.peopleCount && (
                                <span className="flex items-center gap-1">
                                  <FiUser className="w-3 h-3" />
                                  {booking.peopleCount} people
                                </span>
                              )}
                              {isUserBooking && (
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">
                                  Your booking
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                booking.status === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {booking.status === "confirmed" ? (
                                <>
                                  <FiCheckCircle className="w-3 h-3" />
                                  Confirmed
                                </>
                              ) : (
                                <>
                                  <FiXCircle className="w-3 h-3" />
                                  Cancelled
                                </>
                              )}
                            </span>

                            {isUserBooking &&
                              booking.status !== "cancelled" && (
                                <button
                                  onClick={() => cancelBooking(booking.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Cancel booking"
                                >
                                  <FiXCircle className="w-4 h-4" />
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

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
