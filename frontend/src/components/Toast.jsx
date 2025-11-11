import React, { useEffect } from "react";
import { FiCheckCircle, FiXCircle, FiInfo, FiX } from "react-icons/fi";

// Individual Toast Component
function Toast({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <FiCheckCircle />;
      case "error":
        return <FiXCircle />;
      case "info":
        return <FiInfo />;
      default:
        return <FiInfo />;
    }
  };

  return (
    <div className={`toast ${toast.type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={() => onClose(toast.id)}>
        <FiX />
      </button>
    </div>
  );
}

// Toast Container Component
export function ToastContainer({ toasts, onClose }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = React.useState([]);
  const toastCounter = React.useRef(0);

  const addToast = (type, title, message) => {
    toastCounter.current += 1;
    const id = `${Date.now()}-${toastCounter.current}`;
    const newToast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
}

// Backward compatibility - simple toast for basic use cases
export default function SimpleToast({ text }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        background: "#111827",
        color: "#fff",
        padding: "10px 12px",
        borderRadius: 12,
        boxShadow: "0 10px 22px rgba(0,0,0,.22)",
        zIndex: 50,
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}
