import { useEffect, useState } from "react";
import axios from "axios";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck } from "react-icons/fi";
import { getSAToken } from "../../lib/superAdminAuth";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const FEATURE_MODULES = [
  {
    label: "Basic — Gate Management",
    features: [
      "VISITOR_MANAGEMENT",
      "DELIVERY_MANAGEMENT",
      "DAILY_HELP_MANAGEMENT",
      "VEHICLE_MANAGEMENT",
      "KIDS_CHECKOUT",
      "DIRECTORY",
      "OVERSTAY_ALERT",
      "ATTENDANCE_MARKING",
      "PRE_APPROVE_ENTRY",
      "EMERGENCY_CALLING",
    ],
  },
  {
    label: "Prime — Communications",
    features: [
      "HELPDESK",
      "AMENITY_BOOKING",
      "COMMUNICATION",
      "HOME_PLANNER",
      "RENT_A_PARKING",
      "SOS_ALERT",
      "E_INTERCOM",
      "VEHICLE_SEARCH",
      "NOTICE_BOARD",
      "DOCUMENTS_UPLOADING",
      "SURVEYS",
      "ELECTION_POLLS",
      "MEETING_ALIGNMENT",
    ],
  },
  {
    label: "Elite — Accounting",
    features: [
      "GUARD_PATROLLING",
      "INVOICE_GENERATION",
      "UTILITY_PAYMENT",
      "RENT_PAYMENT",
      "INCOME_EXPENSE_ANALYSIS",
      "ASSET_INVENTORY_MANAGEMENT",
      "FINANCIAL_REPORTS",
      "FLATWISE_DUES",
      "BUDGET_MAINTENANCE",
      "RECEIPT_GENERATION",
      "BANK_RECONCILIATION",
      "MIS_REPORTS",
      "SECURITY_DEPOSIT",
      "BALANCE_SHEET_TAX",
    ],
  },
];

const ALL_FEATURES = FEATURE_MODULES.flatMap((m) => m.features);
const BASIC_FEATURES = FEATURE_MODULES[0].features;
const PRIME_FEATURES = [
  ...FEATURE_MODULES[0].features,
  ...FEATURE_MODULES[1].features,
];

function featureLabel(key) {
  return key
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

const emptyForm = { name: "", description: "", price: "", features: [] };

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // null | "create" | "edit"
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${getSAToken()}` },
  });

  const fetchPlans = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/superadmin/plans`,
        authHeader(),
      );
      setPlans(res.data.plans || []);
    } catch {
      setError("Failed to load plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setEditTarget(null);
    setModal("create");
  };

  const openEdit = (plan) => {
    setForm({
      name: plan.name,
      description: plan.description || "",
      price: plan.price?.toString() || "",
      features: [...plan.features],
    });
    setFormError("");
    setEditTarget(plan);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditTarget(null);
  };

  const toggleFeature = (key) => {
    setForm((f) => {
      const has = f.features.includes(key);
      return {
        ...f,
        features: has
          ? f.features.filter((k) => k !== key)
          : [...f.features, key],
      };
    });
  };

  const selectModule = (moduleFeatures, checked) => {
    setForm((f) => {
      const rest = f.features.filter((k) => !moduleFeatures.includes(k));
      return { ...f, features: checked ? [...rest, ...moduleFeatures] : rest };
    });
  };

  const isModuleChecked = (moduleFeatures) =>
    moduleFeatures.every((k) => form.features.includes(k));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Plan name is required.");
      return;
    }
    if (form.features.length === 0) {
      setFormError("Select at least one feature.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price !== "" ? parseFloat(form.price) : null,
        features: form.features,
      };
      if (modal === "create") {
        await axios.post(
          `${BACKEND_URL}/superadmin/plans`,
          payload,
          authHeader(),
        );
      } else {
        await axios.put(
          `${BACKEND_URL}/superadmin/plans/${editTarget.id}`,
          payload,
          authHeader(),
        );
      }
      closeModal();
      fetchPlans();
    } catch (err) {
      setFormError(err.response?.data?.error || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (plan._count?.communities > 0) {
      setDeleteConfirm({ plan, blocked: true });
      return;
    }
    setDeleteConfirm({ plan, blocked: false });
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(
        `${BACKEND_URL}/superadmin/plans/${deleteConfirm.plan.id}`,
        authHeader(),
      );
      setDeleteConfirm(null);
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed.");
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading plans…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage subscription plans and feature access
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <FiPlus /> New Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No plans yet</p>
          <p className="text-sm mt-1">Create your first plan to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{plan.name}</h2>
                  {plan.price != null && (
                    <p className="text-violet-600 font-bold text-lg mt-0.5">
                      ₹{Number(plan.price).toLocaleString()}
                      <span className="text-gray-400 text-xs font-normal">
                        /mo
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEdit(plan)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                  >
                    <FiEdit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>
              {plan.description && (
                <p className="text-gray-500 text-sm mt-2">{plan.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {plan.features.slice(0, 6).map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full"
                  >
                    {featureLabel(f)}
                  </span>
                ))}
                {plan.features.length > 6 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                    +{plan.features.length - 6} more
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {plan._count?.communities ?? 0}{" "}
                {plan._count?.communities === 1 ? "community" : "communities"}{" "}
                using this plan
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-lg">
                {modal === "create"
                  ? "Create Plan"
                  : `Edit "${editTarget?.name}"`}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {formError && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Name + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="e.g. Prime"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹/mo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Optional short description"
                />
              </div>

              {/* Quick preset buttons */}
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-gray-500 self-center">
                  Quick select:
                </span>
                {[
                  { label: "All Basic", features: BASIC_FEATURES },
                  { label: "Basic + Prime", features: PRIME_FEATURES },
                  { label: "All Features", features: ALL_FEATURES },
                ].map(({ label, features }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, features }))}
                    className="px-3 py-1 text-xs bg-violet-50 text-violet-700 rounded-full hover:bg-violet-100 transition-colors"
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, features: [] }))}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Clear All
                </button>
              </div>

              {/* Feature checkboxes grouped */}
              {FEATURE_MODULES.map((mod) => (
                <div key={mod.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id={`mod-${mod.label}`}
                      checked={isModuleChecked(mod.features)}
                      onChange={(e) =>
                        selectModule(mod.features, e.target.checked)
                      }
                      className="accent-violet-600"
                    />
                    <label
                      htmlFor={`mod-${mod.label}`}
                      className="text-sm font-semibold text-gray-800 cursor-pointer"
                    >
                      {mod.label}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-5">
                    {mod.features.map((key) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.features.includes(key)}
                          onChange={() => toggleFeature(key)}
                          className="accent-violet-600"
                        />
                        {featureLabel(key)}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {form.features.length} feature
                {form.features.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  <FiCheck /> {saving ? "Saving…" : "Save Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            {deleteConfirm.blocked ? (
              <>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Cannot Delete Plan
                </h3>
                <p className="text-sm text-gray-500">
                  <strong>{deleteConfirm.plan.name}</strong> is currently
                  assigned to {deleteConfirm.plan._count?.communities}{" "}
                  community/communities. Unassign all communities first.
                </p>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="mt-4 w-full py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  OK
                </button>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Delete Plan?
                </h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete{" "}
                  <strong>{deleteConfirm.plan.name}</strong>? This action cannot
                  be undone.
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
