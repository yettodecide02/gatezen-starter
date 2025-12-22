import React, { useEffect } from "react";
import { FiCheckCircle, FiXCircle, FiInfo, FiX } from "react-icons/fi";

function Toast({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const iconMap = {
    success: <FiCheckCircle className="text-xl" />,
    error: <FiXCircle className="text-xl" />,
    info: <FiInfo className="text-xl" />,
  };

  const baseClasses =
    "flex items-center gap-3 px-4 py-3 rounded-xl min-w-[300px] max-w-[400px] shadow-xl backdrop-blur border animate-slide-in";

  const typeClasses = {
    success: "bg-green-500/95 border-green-400/30 text-white",
    error: "bg-red-500/95 border-red-400/30 text-white",
    info: "bg-blue-500/95 border-blue-400/30 text-white",
  };

  return (
    <div className={`${baseClasses} ${typeClasses[toast.type]}`}>
      <div className="shrink-0">{iconMap[toast.type]}</div>

      <div className="flex-1">
        <div className="text-sm font-semibold">{toast.title}</div>
        <div className="text-xs opacity-90">{toast.message}</div>
      </div>

      <button
        onClick={() => onClose(toast.id)}
        className="p-1 rounded hover:bg-white/20 transition"
      >
        <FiX />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = React.useState([]);
  const counter = React.useRef(0);

  const addToast = (type, title, message) => {
    counter.current += 1;
    setToasts((prev) => [
      ...prev,
      { id: `${Date.now()}-${counter.current}`, type, title, message },
    ]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
