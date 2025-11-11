import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FiHome,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiGrid,
  FiUsers,
  FiSave,
  FiX,
  FiCheckCircle,
} from "react-icons/fi";
import { getToken, getUser } from "../../lib/auth";
import { ToastContainer, useToast } from "../../components/Toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getAuthHeaders = () => {
  const token = getToken() || "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export default function Blocks() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState({});

  const { toasts, addToast, removeToast } = useToast();

  const [blockForm, setBlockForm] = useState({
    name: "",
    description: "",
  });

  const [unitForm, setUnitForm] = useState({
    number: "",
    blockId: "",
  });

  // Multi-unit creation state
  const [unitCreationStep, setUnitCreationStep] = useState(1);
  const [unitsToCreate, setUnitsToCreate] = useState(1);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [currentUnitNumber, setCurrentUnitNumber] = useState("");
  const [createdUnits, setCreatedUnits] = useState([]);

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    setLoading(true);

    try {
      const user = getUser();
      const response = await axios.get(`${API_URL}/admin/blocks`, {
        headers: getAuthHeaders(),
        params: {
          communityId: user.communityId,
        },
      });

      if (response.data) {
        const blocksData =
          response.data.blocks || response.data.data || response.data;
        setBlocks(Array.isArray(blocksData) ? blocksData : []);
      } else {
        addToast("error", "Load Failed", "Failed to load blocks");
      }
    } catch (error) {
      console.error("Error loading blocks:", error);
      addToast(
        "error",
        "Load Failed",
        "Failed to load blocks. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlock = async (e) => {
    e.preventDefault();

    try {
      const user = getUser();
      const payload = {
        ...blockForm,
        communityId: user.communityId,
      };

      const response = await axios.post(`${API_URL}/admin/blocks`, payload, {
        headers: getAuthHeaders(),
      });

      if (response.data) {
        addToast("success", "Block Created", "Block created successfully!");
        setShowBlockForm(false);
        setBlockForm({ name: "", description: "" });
        await loadBlocks();
      } else {
        addToast(
          "error",
          "Creation Failed",
          response.data.message || "Failed to create block"
        );
      }
    } catch (error) {
      console.error("Error creating block:", error);
      addToast(
        "error",
        "Creation Failed",
        error.response?.data?.message || "Failed to create block"
      );
    }
  };

  const handleUpdateBlock = async (e) => {
    e.preventDefault();

    try {
      const user = getUser();
      const payload = {
        ...blockForm,
        communityId: user.communityId,
      };

      const response = await axios.put(
        `${API_URL}/admin/blocks/${editingBlock.id}`,
        payload,
        { headers: getAuthHeaders() }
      );

      if (response.data) {
        addToast("success", "Block Updated", "Block updated successfully!");
        setEditingBlock(null);
        setShowBlockForm(false);
        setBlockForm({ name: "", description: "" });
        await loadBlocks();
      } else {
        addToast(
          "error",
          "Update Failed",
          response.data.message || "Failed to update block"
        );
      }
    } catch (error) {
      console.error("Error updating block:", error);
      addToast(
        "error",
        "Update Failed",
        error.response?.data?.message || "Failed to update block"
      );
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this block? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleteLoading((prev) => ({ ...prev, [blockId]: true }));

    try {
      const response = await axios.delete(
        `${API_URL}/admin/blocks/${blockId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data) {
        addToast("success", "Block Deleted", "Block deleted successfully!");
        await loadBlocks();
      } else {
        addToast(
          "error",
          "Delete Failed",
          response.data.message || "Failed to delete block"
        );
      }
    } catch (error) {
      console.error("Error deleting block:", error);
      addToast(
        "error",
        "Delete Failed",
        error.response?.data?.message || "Failed to delete block"
      );
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [blockId]: false }));
    }
  };

  const handleCreateUnit = async (e) => {
    e.preventDefault();

    if (!currentUnitNumber.trim()) {
      addToast("error", "Validation Error", "Unit number is required");
      return;
    }

    try {
      const user = getUser();
      const payload = {
        number: currentUnitNumber.trim(),
        blockId: unitForm.blockId,
        communityId: user.communityId,
      };

      const response = await axios.post(`${API_URL}/admin/units`, payload, {
        headers: getAuthHeaders(),
      });

      if (response.data) {
        const newUnit = {
          number: currentUnitNumber.trim(),
          created: true,
        };
        setCreatedUnits((prev) => [...prev, newUnit]);

        addToast(
          "success",
          "Unit Created",
          `Unit ${currentUnitNumber} created successfully!`
        );

        if (currentUnitIndex + 1 < unitsToCreate) {
          setCurrentUnitIndex((prev) => prev + 1);
          setCurrentUnitNumber("");
        } else {
          addToast(
            "success",
            "All Units Created",
            `Successfully created ${unitsToCreate} units!`
          );
          resetUnitCreationForm();
          setShowUnitForm(false);
          await loadBlocks();
        }
      } else {
        addToast(
          "error",
          "Creation Failed",
          response.data.message || "Failed to create unit"
        );
      }
    } catch (error) {
      console.error("Error creating unit:", error);
      addToast(
        "error",
        "Creation Failed",
        error.response?.data?.message || "Failed to create unit"
      );
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this unit? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleteLoading((prev) => ({ ...prev, [`unit-${unitId}`]: true }));

    try {
      const response = await axios.delete(`${API_URL}/admin/units/${unitId}`, {
        headers: getAuthHeaders(),
      });

      if (response.data) {
        addToast("success", "Unit Deleted", "Unit deleted successfully!");
        await loadBlocks();
      } else {
        addToast(
          "error",
          "Delete Failed",
          response.data.message || "Failed to delete unit"
        );
      }
    } catch (error) {
      console.error("Error deleting unit:", error);
      addToast(
        "error",
        "Delete Failed",
        error.response?.data?.message || "Failed to delete unit"
      );
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [`unit-${unitId}`]: false }));
    }
  };

  const startEditBlock = (block) => {
    setEditingBlock(block);
    setBlockForm({
      name: block.name,
      description: block.description || "",
    });
    setShowBlockForm(true);
  };

  const startCreateUnit = (blockId) => {
    setUnitForm({ ...unitForm, blockId });
    setUnitCreationStep(1);
    setUnitsToCreate(1);
    setCurrentUnitIndex(0);
    setCurrentUnitNumber("");
    setCreatedUnits([]);
    setShowUnitForm(true);
  };

  const resetUnitCreationForm = () => {
    setUnitCreationStep(1);
    setUnitsToCreate(1);
    setCurrentUnitIndex(0);
    setCurrentUnitNumber("");
    setCreatedUnits([]);
    setUnitForm({ number: "", blockId: "" });
  };

  const handleUnitCountSubmit = (e) => {
    e.preventDefault();
    if (unitsToCreate < 1 || unitsToCreate > 50) {
      addToast(
        "error",
        "Invalid Count",
        "Please enter a number between 1 and 50"
      );
      return;
    }
    setUnitCreationStep(2);
    setCurrentUnitIndex(0);
    setCurrentUnitNumber("");
  };

  const cancelForm = () => {
    setShowBlockForm(false);
    setShowUnitForm(false);
    setEditingBlock(null);
    setBlockForm({ name: "", description: "" });
    resetUnitCreationForm();
  };

  // Calculate statistics
  const stats = {
    totalBlocks: blocks.length,
    totalUnits: blocks.reduce(
      (sum, block) => sum + (block.units?.length || 0),
      0
    ),
    occupiedUnits: blocks.reduce(
      (sum, block) =>
        sum +
        (block.units?.filter((unit) => unit.residents?.length > 0).length || 0),
      0
    ),
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg">
            <FiHome size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Blocks & Units Management
            </h2>
            <p className="text-sm text-gray-600">
              Manage blocks and units in your community
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FiHome size={20} />
            </div>
            <div className="text-sm font-medium text-gray-600">
              Total Blocks
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalBlocks}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
              <FiGrid size={20} />
            </div>
            <div className="text-sm font-medium text-gray-600">Total Units</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalUnits}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <FiUsers size={20} />
            </div>
            <div className="text-sm font-medium text-gray-600">Occupied</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.occupiedUnits}
          </div>
        </div>
      </div>

      {/* Create Block Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowBlockForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FiPlus />
          Create New Block
        </button>
      </div>

      {/* Block Form Modal */}
      {showBlockForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingBlock ? "Edit Block" : "Create New Block"}
              </h3>
              <button
                onClick={cancelForm}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <form
              onSubmit={editingBlock ? handleUpdateBlock : handleCreateBlock}
              className="px-6 py-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Block Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={blockForm.name}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, name: e.target.value })
                  }
                  placeholder="e.g., A, B, Tower 1"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={blockForm.description}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, description: e.target.value })
                  }
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <FiSave />
                  {editingBlock ? "Update Block" : "Create Block"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Form Modal */}
      {showUnitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {unitCreationStep === 1
                  ? "Create Units"
                  : `Create Unit ${currentUnitIndex + 1} of ${unitsToCreate}`}
              </h3>
              <button
                onClick={cancelForm}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {unitCreationStep === 1 ? (
              <form
                onSubmit={handleUnitCountSubmit}
                className="px-6 py-4 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How many units do you want to create?{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={unitsToCreate}
                    onChange={(e) =>
                      setUnitsToCreate(parseInt(e.target.value) || 1)
                    }
                    placeholder="Enter number of units"
                    min="1"
                    max="50"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    You can create up to 50 units at once
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-6 py-4">
                {createdUnits.length > 0 && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <FiCheckCircle /> Created Units:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {createdUnits.map((unit, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 border border-green-200 rounded-full"
                        >
                          {unit.number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateUnit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit {currentUnitIndex + 1} Number{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentUnitNumber}
                      onChange={(e) => setCurrentUnitNumber(e.target.value)}
                      placeholder="e.g., 101, A-01, 1A"
                      required
                      autoFocus
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Press Enter or click OK to create this unit
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (createdUnits.length > 0) {
                          addToast(
                            "info",
                            "Units Created",
                            `Created ${createdUnits.length} units successfully`
                          );
                          resetUnitCreationForm();
                          setShowUnitForm(false);
                          loadBlocks();
                        } else {
                          setUnitCreationStep(1);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {createdUnits.length > 0 ? "Finish" : "Back"}
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelForm}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Cancel All
                      </button>
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <FiSave />
                        OK
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading blocks...</p>
          </div>
        </div>
      ) : blocks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <FiHome size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No blocks found
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Create your first block to get started
            </p>
            <button
              onClick={() => setShowBlockForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FiPlus />
              Create Block
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <FiHome size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Block {block.name}
                    </h3>
                  </div>
                  {block.description && (
                    <p className="text-sm text-gray-600 ml-11">
                      {block.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEditBlock(block)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit block"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    disabled={deleteLoading[block.id]}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete block"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <FiGrid className="text-cyan-600" />
                    Units ({block.units?.length || 0})
                  </h4>
                  <button
                    onClick={() => startCreateUnit(block.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <FiPlus size={14} />
                    Add Unit
                  </button>
                </div>

                {block.units?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {block.units.map((unit) => (
                      <div
                        key={unit.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-900 mb-2">
                              Unit {unit.number}
                            </h5>
                            {unit.residents?.length > 0 ? (
                              <div className="flex items-center gap-1.5 text-xs text-green-700">
                                <FiUsers size={12} className="flex-shrink-0" />
                                <span className="truncate">
                                  {unit.residents[0].name}
                                  {unit.residents.length > 1 &&
                                    ` +${unit.residents.length - 1}`}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">
                                Vacant
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteUnit(unit.id)}
                            disabled={deleteLoading[`unit-${unit.id}`]}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            title="Delete unit"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    No units in this block yet. Click "Add Unit" to create one.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
