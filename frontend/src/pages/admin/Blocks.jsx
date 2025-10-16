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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);

  // Toast management using custom hook
  const { toasts, addToast, removeToast } = useToast();

  // Form states
  const [blockForm, setBlockForm] = useState({
    name: "",
    description: "",
  });

  const [unitForm, setUnitForm] = useState({
    number: "",
    blockId: "",
  });

  // Multi-unit creation state
  const [unitCreationStep, setUnitCreationStep] = useState(1); // 1: count, 2: create units
  const [unitsToCreate, setUnitsToCreate] = useState(1);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [currentUnitNumber, setCurrentUnitNumber] = useState("");
  const [createdUnits, setCreatedUnits] = useState([]);

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    setLoading(true);
    setError("");

    try {
      const user = getUser();
      const response = await axios.get(`${API_URL}/admin/blocks`, {
        headers: getAuthHeaders(),
        params: {
          communityId: user.communityId,
        },
      });

      if (response.data) {

        // Handle different response formats
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

        // Move to next unit or finish
        if (currentUnitIndex + 1 < unitsToCreate) {
          setCurrentUnitIndex((prev) => prev + 1);
          setCurrentUnitNumber("");
        } else {
          // All units created, close modal and refresh
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

  const handleUnitNumberKeyPress = (e) => {
    if (e.key === "Enter") {
      handleCreateUnit(e);
    }
  };

  const cancelForm = () => {
    setShowBlockForm(false);
    setShowUnitForm(false);
    setEditingBlock(null);
    setBlockForm({ name: "", description: "" });
    resetUnitCreationForm();
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ margin: 0, marginBottom: "8px" }}>
          <FiHome style={{ marginRight: "8px" }} />
          Blocks & Units Management
        </h2>
        <p style={{ color: "#666", margin: 0 }}>
          Manage blocks and units in your community
        </p>
      </div>

      {/* Create Block Button */}
      <div style={{ marginBottom: "24px" }}>
        <button
          className="btn"
          onClick={() => setShowBlockForm(true)}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <FiPlus />
          Create New Block
        </button>
      </div>

      {/* Block Form Modal */}
      {showBlockForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "500px",
              margin: "20px",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ margin: 0 }}>
                {editingBlock ? "Edit Block" : "Create New Block"}
              </h3>
              <button
                onClick={cancelForm}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            <form
              onSubmit={editingBlock ? handleUpdateBlock : handleCreateBlock}
            >
              <div style={{ marginBottom: "20px" }}>
                <label
                  className="label"
                  style={{ display: "block", marginBottom: "8px" }}
                >
                  Block Name *
                </label>
                <input
                  type="text"
                  className="input"
                  value={blockForm.name}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, name: e.target.value })
                  }
                  placeholder="e.g., A, B, Tower 1"
                  required
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label
                  className="label"
                  style={{ display: "block", marginBottom: "8px" }}
                >
                  Description
                </label>
                <textarea
                  className="textarea"
                  value={blockForm.description}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, description: e.target.value })
                  }
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={cancelForm}
                  style={{
                    padding: "10px 16px",
                    background: "#e5e7eb",
                    color: "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  <FiSave style={{ marginRight: "6px" }} />
                  {editingBlock ? "Update Block" : "Create Block"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Form Modal */}
      {showUnitForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "500px",
              margin: "20px",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ margin: 0 }}>
                {unitCreationStep === 1
                  ? "Create Units"
                  : `Create Unit ${currentUnitIndex + 1} of ${unitsToCreate}`}
              </h3>
              <button
                onClick={cancelForm}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            {unitCreationStep === 1 ? (
              // Step 1: Ask how many units to create
              <form onSubmit={handleUnitCountSubmit}>
                <div style={{ marginBottom: "20px" }}>
                  <label
                    className="label"
                    style={{ display: "block", marginBottom: "8px" }}
                  >
                    How many units do you want to create? *
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={unitsToCreate}
                    onChange={(e) =>
                      setUnitsToCreate(parseInt(e.target.value) || 1)
                    }
                    placeholder="Enter number of units"
                    min="1"
                    max="50"
                    required
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    You can create up to 50 units at once
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={cancelForm}
                    style={{
                      padding: "10px 16px",
                      background: "#e5e7eb",
                      color: "#374151",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn">
                    <FiSave style={{ marginRight: "6px" }} />
                    Next
                  </button>
                </div>
              </form>
            ) : (
              // Step 2: Create individual units
              <div>
                {createdUnits.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <h4
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      Created Units:
                    </h4>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}
                    >
                      {createdUnits.map((unit, index) => (
                        <span
                          key={index}
                          style={{
                            padding: "2px 8px",
                            background: "#d1fae5",
                            color: "#065f46",
                            borderRadius: "4px",
                            fontSize: "12px",
                          }}
                        >
                          {unit.number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateUnit}>
                  <div style={{ marginBottom: "20px" }}>
                    <label
                      className="label"
                      style={{ display: "block", marginBottom: "8px" }}
                    >
                      Unit {currentUnitIndex + 1} Number *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={currentUnitNumber}
                      onChange={(e) => setCurrentUnitNumber(e.target.value)}
                      onKeyPress={handleUnitNumberKeyPress}
                      placeholder="e.g., 101, A-01, 1A"
                      required
                      autoFocus
                    />
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "4px",
                      }}
                    >
                      Press Enter or click OK to create this unit
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "space-between",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (createdUnits.length > 0) {
                          // If some units were created, finish and refresh
                          addToast(
                            "info",
                            "Units Created",
                            `Created ${createdUnits.length} units successfully`
                          );
                          resetUnitCreationForm();
                          setShowUnitForm(false);
                          loadBlocks();
                        } else {
                          // Go back to step 1
                          setUnitCreationStep(1);
                        }
                      }}
                      style={{
                        padding: "10px 16px",
                        background: "#e5e7eb",
                        color: "#374151",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {createdUnits.length > 0 ? "Finish" : "Back"}
                    </button>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={cancelForm}
                        style={{
                          padding: "10px 16px",
                          background: "#fee2e2",
                          color: "#dc2626",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel All
                      </button>
                      <button type="submit" className="btn">
                        <FiSave style={{ marginRight: "6px" }} />
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

      {/* Blocks List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div className="spinner" style={{ margin: "0 auto" }}></div>
          <p style={{ color: "#666", marginTop: "16px" }}>Loading blocks...</p>
        </div>
      ) : blocks.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <FiHome size={48} style={{ color: "#ccc", marginBottom: "16px" }} />
          <h3 style={{ color: "#666", marginBottom: "8px" }}>
            No blocks found
          </h3>
          <p style={{ color: "#999", marginBottom: "24px" }}>
            Create your first block to get started
          </p>
          <button
            className="btn"
            onClick={() => setShowBlockForm(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <FiPlus />
            Create Block
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "24px" }}>
          {blocks.map((block) => (
            <div key={block.id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <FiHome style={{ marginRight: "8px" }} />
                    Block {block.name}
                  </h3>
                  {block.description && (
                    <p style={{ color: "#666", margin: 0 }}>
                      {block.description}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => startEditBlock(block)}
                    style={{
                      padding: "6px",
                      background: "#e5e7eb",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    title="Edit block"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    style={{
                      padding: "6px",
                      background: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    title="Delete block"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Units in this block */}
              <div
                style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <h4
                    style={{ margin: 0, display: "flex", alignItems: "center" }}
                  >
                    <FiGrid style={{ marginRight: "6px" }} />
                    Units ({block.units?.length || 0})
                  </h4>
                  <button
                    onClick={() => startCreateUnit(block.id)}
                    className="btn"
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FiPlus size={12} />
                    Add Unit
                  </button>
                </div>

                {block.units && block.units.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {block.units.map((unit) => (
                      <div
                        key={unit.id}
                        style={{
                          padding: "12px",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div>
                            <h5 style={{ margin: "0 0 4px 0" }}>
                              Unit {unit.number}
                            </h5>
                            {unit.residents && unit.residents.length > 0 ? (
                              <p
                                style={{
                                  margin: "4px 0 0 0",
                                  fontSize: "12px",
                                  color: "#059669",
                                }}
                              >
                                <FiUsers
                                  size={10}
                                  style={{ marginRight: "4px" }}
                                />
                                Occupied by {unit.residents[0].name}
                                {unit.residents.length > 1 &&
                                  ` +${unit.residents.length - 1} more`}
                              </p>
                            ) : (
                              <p
                                style={{
                                  margin: "4px 0 0 0",
                                  fontSize: "12px",
                                  color: "#6b7280",
                                  fontStyle: "italic",
                                }}
                              >
                                Vacant
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteUnit(unit.id)}
                            style={{
                              padding: "4px",
                              background: "#fee2e2",
                              color: "#dc2626",
                              border: "none",
                              borderRadius: "3px",
                              cursor: "pointer",
                            }}
                            title="Delete unit"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#999", fontStyle: "italic", margin: 0 }}>
                    No units in this block yet
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
