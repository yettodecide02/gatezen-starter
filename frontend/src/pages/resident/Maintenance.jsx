import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiTool,
  FiPlus,
  FiImage,
  FiSend,
  FiPaperclip,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";

const STATUS_LABEL = {
  submitted: "Submitted",
  in_progress: "In Progress",
  resolved: "Resolved",
};

// Toast Component
function Toast({ text, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64">
        <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-sm text-gray-900 flex-1">{text}</p>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <FiX className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

// Status Chip Component
function StatusChip({ status }) {
  const styles = {
    submitted: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <FiClock className="w-4 h-4" />,
    },
    in_progress: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: <FiAlertCircle className="w-4 h-4" />,
    },
    resolved: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      icon: <FiCheckCircle className="w-4 h-4" />,
    },
  };

  const style = styles[status] || styles.submitted;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
    >
      {style.icon}
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default function Maintenance() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [desc, setDesc] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(null);

  const user = useMemo(() => {
    try {
      return getUser() || { id: "u1", name: "Admin", communityId: null };
    } catch {
      return { id: "u1", name: "Admin", communityId: null };
    }
  }, []);

  const token = getToken();

  function showToast(text) {
    setToast(text);
  }

  async function load() {
    try {
      setLoading(true);
      const response = await axios.get(
        (import.meta.env.VITE_API_URL || "http://localhost:5000") +
          `/resident/maintenance`,
        {
          headers: {
            Authorization: `Bearer ${token}` || "",
          },
          params: {
            communityId: user.communityId,
            userId: user.id,
          },
        }
      );

      const list = Array.isArray(response.data) ? response.data : [];
      setTickets(list);
      setSelected(
        (prev) =>
          (prev ? list.find((t) => t.id === prev.id) || list[0] : list[0]) ||
          null
      );
    } catch (error) {
      console.error("Error loading tickets:", error);
      setTickets([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [selected?.id]);

  async function submitTicket(e) {
    e.preventDefault();

    if (!user.id || !user.communityId || !title.trim() || !category) {
      showToast("Please fill in all required fields");
      return;
    }

    try {
      const payload = {
        userId: user.id,
        communityId: user.communityId,
        title: title.trim(),
        category,
        description: desc.trim(),
        images: imgUrl ? [imgUrl] : [],
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/resident/maintenance`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newTicket = response.data;
      setTitle("");
      setCategory("General");
      setDesc("");
      setImgUrl("");
      setTickets((prev) =>
        Array.isArray(prev) ? [newTicket, ...prev] : [newTicket]
      );
      setSelected(newTicket);
      showToast("Ticket submitted successfully");
    } catch (error) {
      console.error("Error submitting ticket:", error);
      showToast(error.response?.data?.error || "Error submitting ticket");
    }
  }

  async function addComment() {
    if (!selected || !message.trim()) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/resident/maintenance/${
          selected.id
        }/comments`,
        {
          userId: user.id,
          name: user.name,
          text: message.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newComment = response.data;
      setTickets((prev) =>
        Array.isArray(prev)
          ? prev.map((t) =>
              t.id === selected.id
                ? { ...t, comments: [...(t.comments || []), newComment] }
                : t
            )
          : prev
      );
      setSelected((s) => ({
        ...s,
        comments: [...(s?.comments || []), newComment],
      }));
      setMessage("");
      showToast("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast("Error adding comment");
    }
  }

  async function changeStatus(next) {
    if (!selected) return;

    try {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/resident/maintenance/${
          selected.id
        }/status`,
        {
          status: next,
          communityId: user.communityId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updated = response.data;
      setTickets((prev) =>
        Array.isArray(prev)
          ? prev.map((t) => (t.id === updated.id ? updated : t))
          : prev
      );
      setSelected(updated);
      showToast(`Marked as: ${STATUS_LABEL[next]}`);
    } catch (error) {
      console.error("Error changing status:", error);
      showToast("Error changing status");
    }
  }

  async function attachImage() {
    if (!selected || !imgUrl) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/resident/maintenance/${
          selected.id
        }/images`,
        { imageUrl: imgUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setImgUrl("");
      load();
      showToast("Image attached");
    } catch (error) {
      console.error("Error attaching image:", error);
      showToast("Error attaching image");
    }
  }

  return (
    <div className="min-h-screen">
      {toast && <Toast text={toast} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <FiTool className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Maintenance Requests
          </h1>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left: New Request + Ticket List */}
          <div className="space-y-6">
            {/* New Request Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <FiPlus className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  New Request
                </h2>
              </div>

              <form onSubmit={submitTicket} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Title (e.g., Leaking tap)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option>General</option>
                    <option>Electrical</option>
                    <option>Plumbing</option>
                    <option>Carpentry</option>
                    <option>Cleaning</option>
                    <option>Security</option>
                  </select>
                </div>

                <div>
                  <textarea
                    rows={4}
                    placeholder="Describe the issue in detail…"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Image URL (optional)"
                    value={imgUrl}
                    onChange={(e) => setImgUrl(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={attachImage}
                    disabled={!selected || !imgUrl}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiImage className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  <FiPlus className="w-5 h-5" />
                  Submit Request
                </button>
              </form>
            </div>

            {/* My Tickets List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                My Tickets
              </h2>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Loading…
                  </p>
                )}
                {!loading &&
                  (!Array.isArray(tickets) || tickets.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No requests yet.
                    </p>
                  )}
                {Array.isArray(tickets) &&
                  tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors ${
                        selected?.id === t.id
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {t.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">
                        {t.category} • {new Date(t.createdAt).toLocaleString()}
                      </p>
                      <StatusChip status={t.status} />
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Right: Ticket Details */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {!selected ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select a ticket to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between pb-6 border-b border-gray-200">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {selected.title}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selected.category} • Opened{" "}
                      {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <StatusChip status={selected.status} />
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-700">
                    {selected.description || "No description provided"}
                  </p>
                </div>

                {/* Images */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Images</h3>
                  {selected.images?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selected.images.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <img
                            src={src}
                            alt={`Attachment ${i + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No images attached</p>
                  )}
                </div>

                {/* Timeline */}
                {selected.history && selected.history.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Timeline
                    </h3>
                    <div className="space-y-3">
                      {selected.history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <StatusChip status={h.status} />
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(h.changedAt).toLocaleString()}
                            </p>
                            {h.note && (
                              <p className="text-sm text-gray-700 mt-2">
                                {h.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Comments</h3>

                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {!selected.comments || selected.comments.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No messages yet
                      </p>
                    ) : (
                      selected.comments.map((c) => {
                        const mine = c.userId === user.id;
                        return (
                          <div
                            key={c.id}
                            className={`flex ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-xs px-4 py-3 rounded-lg ${
                                mine
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-100 text-gray-900"
                              }`}
                            >
                              {!mine && (
                                <p className="font-semibold text-sm mb-1">
                                  {c.name || "User"}
                                </p>
                              )}
                              <p className="text-sm break-words">{c.text}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  mine ? "text-indigo-200" : "text-gray-500"
                                }`}
                              >
                                {new Date(c.updatedAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a message…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addComment()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={addComment}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    >
                      <FiSend className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <FiPaperclip className="w-3 h-3" />
                    Use the image URL field above to attach photos
                  </p>
                </div>
              </div>
            )}
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
