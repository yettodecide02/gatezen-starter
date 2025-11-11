import { useCallback, useEffect, useState } from "react";
import {
  FiCheck,
  FiX,
  FiLogOut,
  FiCamera,
  FiRefreshCw,
  FiAlertTriangle,
} from "react-icons/fi";
import QrScanner from "react-qr-scanner";
import axios from "axios";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

export default function QRScanner() {
  const [hasPermission, setHasPermission] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [lastScan, setLastScan] = useState(null);
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const { toasts, addToast, removeToast } = useToast();

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    let stream;

    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        setToken(t);
        setUser(u || { id: "g1", name: "Gatekeeper", role: "GATEKEEPER" });
      } catch {
        setUser({ id: "g1", name: "Gatekeeper", role: "GATEKEEPER" });
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
      } catch {
        setHasPermission(false);
      }
    })();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const z = (type, title, message) => {
    addToast(type, title, message);
  };

  const resetScan = useCallback(() => {
    setScanning(true);
    setLastScan(null);
    setVisitor(null);
  }, []);

  const handleBarCodeScanned = useCallback(
    async (data) => {
      if (!data || !scanning || data === lastScan) return;

      setLastScan(data);
      setScanning(false);

      try {
        let visitorId = data;
        let communityId = user?.communityId || "1";

        if (data.includes("scan?id=")) {
          try {
            const url = new URL(data);
            visitorId = url.searchParams.get("id") || "";
            communityId =
              url.searchParams.get("communityId") || user?.communityId || "1";
          } catch {
            const queryPart = data.includes("?") ? data.split("?")[1] : data;
            const params = new URLSearchParams(queryPart);
            visitorId = params.get("id") || "";
            communityId = params.get("communityId") || user?.communityId || "1";
          }
        } else if (data.includes(":")) {
          const parts = data.split(":");
          visitorId = parts[0];
          communityId = parts[1] || user?.communityId || "1";
        }

        if (!visitorId) throw new Error("Invalid QR code");

        setLoading(true);
        const res = await axios.get(`${backendUrl}/gatekeeper/scan`, {
          params: { id: visitorId, communityId },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        setVisitor(res.data.visitor);
        showToast("success", "Scan Successful", "Visitor data loaded.");
      } catch (e) {
        showToast("error", "Scan Failed", "Invalid or unrecognized QR code.");
        resetScan();
      } finally {
        setLoading(false);
      }
    },
    [scanning, lastScan, backendUrl, token, user?.communityId, resetScan]
  );

  const updateVisitorStatus = async (newStatus) => {
    if (!visitor) return;

    try {
      await axios.post(
        `${backendUrl}/gatekeeper`,
        { id: visitor.id, status: newStatus },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      showToast(
        "success",
        "Success",
        `Visitor ${newStatus.replace("_", " ")}.`
      );
      resetScan();
    } catch {
      showToast("error", "Error", "Failed to update visitor status.");
    }
  };

  const requestPermissionAgain = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      showToast("success", "Permission Granted", "Camera access restored.");
    } catch {
      setHasPermission(false);
      showToast("error", "Permission Denied", "Camera access denied.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 relative">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold">QR Scanner</h1>
        <p className="text-gray-500">Scan visitor QR codes for quick access</p>
      </div>

      {hasPermission === false && (
        <div className="flex flex-col items-center justify-center text-center bg-white border border-gray-200 rounded-xl shadow-md p-6 max-w-md mx-auto">
          <FiAlertTriangle className="text-amber-500 text-4xl mb-3" />
          <h2 className="text-xl font-bold mb-2">Camera Access Required</h2>
          <p className="text-gray-500 mb-4">
            We need permission to access your camera to scan QR codes.
          </p>
          <button
            onClick={requestPermissionAgain}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <FiRefreshCw /> Retry Permission
          </button>
        </div>
      )}

      {hasPermission && scanning ? (
        <div className="flex flex-col items-center gap-6">
          <div className="w-80 h-80 border-4 border-gray-300 rounded-2xl overflow-hidden relative">
            <QrScanner
              delay={300}
              style={{ width: "100%" }}
              onError={(err) => console.error(err)}
              onScan={(data) => {
                if (data) handleBarCodeScanned(data.text);
              }}
            />
          </div>
          <p className="text-gray-600 text-sm">
            Position QR code within the frame
          </p>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
          {loading ? (
            <div className="text-center text-gray-600">
              Loading visitor information...
            </div>
          ) : visitor ? (
            <>
              <h2 className="text-xl font-bold mb-4">Visitor Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase text-gray-500">Name</p>
                  <p className="font-semibold">{visitor.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Visiting</p>
                  <p className="font-semibold">{visitor.hostName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Unit</p>
                  <p className="font-semibold">{visitor.unitNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Purpose</p>
                  <p className="font-semibold">
                    {visitor.purpose || "General visit"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Status</p>
                  <p
                    className={`font-bold ${
                      visitor.status === "checked_in"
                        ? "text-green-600"
                        : visitor.status === "cancelled"
                        ? "text-red-600"
                        : "text-amber-600"
                    }`}
                  >
                    {visitor.status?.toUpperCase() || "PENDING"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                {visitor.status === "pending" && (
                  <>
                    <button
                      onClick={() => updateVisitorStatus("checked_in")}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
                    >
                      <FiCheck /> Check In
                    </button>
                    <button
                      onClick={() => updateVisitorStatus("cancelled")}
                      className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg"
                    >
                      <FiX /> Cancel
                    </button>
                  </>
                )}

                {visitor.status === "checked_in" && (
                  <button
                    onClick={() => updateVisitorStatus("checked_out")}
                    className="flex-1 flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg"
                  >
                    <FiLogOut /> Check Out
                  </button>
                )}
              </div>

              <button
                onClick={resetScan}
                className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg mt-4 w-full"
              >
                <FiCamera /> Scan Another
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
