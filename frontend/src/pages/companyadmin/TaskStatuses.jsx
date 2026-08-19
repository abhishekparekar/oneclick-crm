import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTaskStatusesApi,
  createTaskStatusApi,
  updateTaskStatusConfigApi,
  deleteTaskStatusApi,
  reorderTaskStatusesApi,
} from "../../api/companyAdminApi";
import {
  LayoutList,
  Plus,
  Trash2,
  Edit2,
  Move,
  X,
  Save,
  CheckCircle,
  XCircle,
} from "lucide-react";

const COMMON_STATUSES = [
  { label: "Review", color: "#92400e", backgroundColor: "#fef3c7" },
  { label: "Testing", color: "#9a3412", backgroundColor: "#ffedd5" },
  { label: "Blocked", color: "#991b1b", backgroundColor: "#fee2e2" },
  { label: "Hold", color: "#1e3a8a", backgroundColor: "#dbeafe" },
  { label: "Design", color: "#3730a3", backgroundColor: "#e0e7ff" },
  { label: "Development", color: "#065f46", backgroundColor: "#d1fae5" },
  { label: "Deployed", color: "#166534", backgroundColor: "#dcfce7" },
  { label: "Cancelled", color: "#475569", backgroundColor: "#f1f5f9" },
];

export default function TaskStatuses() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);

  const [formData, setFormData] = useState({
    label: "",
    statusKey: "",
    color: "#1e293b",
    backgroundColor: "#f1f5f9",
    icon: "circle",
    isActive: true,
  });

  const { data: statusesData, isLoading } = useQuery({
    queryKey: ["taskStatuses"],
    queryFn: async () => {
      const res = await getTaskStatusesApi();
      return res.data.statuses || [];
    },
  });

  const statuses = useMemo(() => {
    if (!statusesData) return [];
    return [...statusesData].sort((a, b) => a.order - b.order);
  }, [statusesData]);

  const createMutation = useMutation({
    mutationFn: createTaskStatusApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["taskStatuses"]);
      closeModal();
    },
    onError: (err) => alert(err?.response?.data?.message || "Error creating status"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateTaskStatusConfigApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["taskStatuses"]);
      closeModal();
    },
    onError: (err) => alert(err?.response?.data?.message || "Error updating status"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTaskStatusApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["taskStatuses"]);
    },
    onError: (err) => alert(err?.response?.data?.message || "Error deleting status (It might be in use)"),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderTaskStatusesApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["taskStatuses"]);
    },
  });

  const openModal = (status = null) => {
    if (status) {
      setEditingStatus(status);
      setFormData({
        label: status.label,
        statusKey: status.statusKey,
        color: status.color,
        backgroundColor: status.backgroundColor,
        icon: status.icon,
        isActive: status.isActive,
      });
    } else {
      setEditingStatus(null);
      setFormData({
        label: "",
        statusKey: "",
        color: "#3b82f6",
        backgroundColor: "#dbeafe",
        icon: "circle",
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStatus(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStatus) {
      updateMutation.mutate({
        id: editingStatus._id,
        data: {
          label: formData.label,
          color: formData.color,
          backgroundColor: formData.backgroundColor,
          isActive: formData.isActive,
        },
      });
    } else {
      createMutation.mutate({
        ...formData,
        statusKey: formData.statusKey || formData.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        order: statuses.length,
      });
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this status? You cannot delete it if tasks are using it.")) {
      deleteMutation.mutate(id);
    }
  };

  const moveItem = (index, direction) => {
    const newStatuses = [...statuses];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newStatuses.length) return;

    // Swap
    const temp = newStatuses[index];
    newStatuses[index] = newStatuses[newIndex];
    newStatuses[newIndex] = temp;

    // Save
    reorderMutation.mutate(newStatuses.map(s => s._id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ca-text">Task Statuses</h1>
          <p className="text-base text-ca-text-secondary mt-1">
            Manage dynamic statuses and Kanban columns for your company's tasks.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-5 py-2.5 bg-ca-text text-white rounded-xl hover:bg-ca-text transition-all shadow-sm font-bold text-sm"
        >
          <Plus size={18} className="mr-2" />
          Add Status
        </button>
      </div>

      <div className="bg-ca-surface rounded-3xl border border-ca-border overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)]">
        <div className="p-5 border-b border-ca-border bg-slate-50/30">
          <p className="text-xs text-ca-text-secondary font-medium">
            <strong className="text-ca-text-secondary">Note:</strong> The "All" filter tab is always visible. Pending, In Process, and Complete are default system statuses.
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-ca-text-secondary font-medium">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ca-border mr-3"></div>
            Loading statuses...
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {statuses.map((status, index) => (
              <div
                key={status._id}
                className="p-4 flex items-center justify-between hover:bg-ca-hover transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                      className="p-1 text-ca-text-secondary hover:text-ca-text disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveItem(index, "down")}
                      disabled={index === statuses.length - 1}
                      className="p-1 text-ca-text-secondary hover:text-ca-text disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>

                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-ca-border shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]" style={{ backgroundColor: status.backgroundColor || "#f1f5f9" }}>
                    <LayoutList size={20} color={status.color || "#475569"} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-ca-text text-[15px]">{status.label}</h3>
                      {status.isDefault && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-ca-border bg-ca-bg text-ca-text-secondary">
                          System
                        </span>
                      )}
                      {!status.isActive && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-ca-border bg-ca-primary-light text-ca-primary">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ca-text-secondary mt-0.5 font-mono tracking-wider">KEY: {status.statusKey}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: status.backgroundColor,
                      color: status.color,
                      borderColor: status.color + "30",
                    }}
                  >
                    Preview
                  </div>

                  {status.isEditable && (
                    <button
                      onClick={() => openModal(status)}
                      className="p-2 text-ca-text-secondary hover:text-ca-primary hover:bg-ca-primary-light rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}

                  {status.isDeletable ? (
                    <button
                      onClick={() => handleDelete(status._id)}
                      className="p-2 text-ca-text-secondary hover:text-ca-primary hover:bg-ca-primary-light rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <div className="w-[34px]" /> // Spacer
                  )}
                </div>
              </div>
            ))}

            {statuses.length === 0 && (
              <div className="p-8 text-center text-ca-text-secondary">
                No statuses found. Click "Add Status" to create one.
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ca-surface rounded-3xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-ca-border">
            <div className="flex items-center justify-between p-6 border-b border-ca-border">
              <h2 className="text-xl font-black text-ca-text">
                {editingStatus ? "Edit Status" : "Add New Status"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-ca-text-secondary hover:text-ca-text hover:bg-ca-hover rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {!editingStatus && (
                <div className="mb-5">
                  <label className="block text-xs font-bold text-ca-text-secondary uppercase tracking-wider mb-2">
                    Quick Suggestions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_STATUSES.filter(
                      (cs) => !statuses.some((s) => s.label.toLowerCase() === cs.label.toLowerCase())
                    ).map((suggestion) => (
                      <button
                        key={suggestion.label}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            label: suggestion.label,
                            statusKey: suggestion.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
                            color: suggestion.color,
                            backgroundColor: suggestion.backgroundColor,
                          })
                        }
                        className="px-3 py-1 rounded-full text-xs font-medium border hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: suggestion.backgroundColor,
                          color: suggestion.color,
                          borderColor: suggestion.color + "30",
                        }}
                      >
                        + {suggestion.label}
                      </button>
                    ))}
                    {COMMON_STATUSES.filter(
                      (cs) => !statuses.some((s) => s.label.toLowerCase() === cs.label.toLowerCase())
                    ).length === 0 && (
                        <span className="text-xs text-ca-text-secondary">All common statuses added</span>
                      )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ca-text-secondary uppercase tracking-widest mb-2">
                    Label <span className="text-ca-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-4 py-2.5 bg-ca-bg border border-ca-border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-sm font-medium transition-all"
                    placeholder="e.g. In QA Review"
                  />
                </div>

                {!editingStatus && (
                  <div>
                    <label className="block text-xs font-bold text-ca-text-secondary uppercase tracking-widest mb-2">
                      Status Key
                    </label>
                    <input
                      type="text"
                      value={formData.statusKey}
                      onChange={(e) => setFormData({ ...formData, statusKey: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_") })}
                      className="w-full px-4 py-2.5 bg-ca-bg border border-ca-border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-sm font-medium transition-all"
                      placeholder="Auto-generated if empty"
                    />
                    <p className="text-[10px] font-bold text-ca-text-secondary mt-1.5 uppercase tracking-wider">Unique identifier. Cannot be changed later.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ca-text-secondary uppercase tracking-widest mb-2">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 p-1 bg-ca-bg"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-4 py-2.5 bg-ca-bg border border-ca-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ca-text-secondary uppercase tracking-widest mb-2">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 p-1 bg-ca-bg"
                      />
                      <input
                        type="text"
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        className="flex-1 px-4 py-2.5 bg-ca-bg border border-ca-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-ca-primary rounded border-ca-border focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-ca-text-secondary">Active (Visible in UI)</span>
                  </label>
                  <p className="text-xs text-ca-text-secondary mt-1 ml-6">
                    Inactive statuses won't appear as options for new or updated tasks.
                  </p>
                </div>

                <div className="mt-4 p-4 rounded-lg border border-dashed border-ca-border flex flex-col items-center justify-center gap-2">
                  <span className="text-xs font-medium text-ca-text-secondary uppercase tracking-wider">Live Preview</span>
                  <div
                    className="px-3 py-1 rounded-full text-sm font-medium border"
                    style={{
                      backgroundColor: formData.backgroundColor,
                      color: formData.color,
                      borderColor: formData.color + "30",
                    }}
                  >
                    {formData.label || "Sample Label"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-bold text-ca-text-secondary hover:bg-ca-hover rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="flex items-center px-5 py-2.5 text-sm font-bold text-white bg-ca-text hover:bg-ca-text rounded-xl shadow-sm transition disabled:opacity-70"
                >
                  <Save size={16} className="mr-2" />
                  {editingStatus ? "Update Status" : "Create Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}