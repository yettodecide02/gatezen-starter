// frontend/src/components/Toast.jsx
export default function Toast({ text }) {
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
