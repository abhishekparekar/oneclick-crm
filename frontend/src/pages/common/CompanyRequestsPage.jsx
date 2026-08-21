import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import {
  getInternalRequestsApi,
  createInternalRequestApi,
  replyToInternalRequestApi,
  updateInternalRequestStatusApi,
  deleteInternalRequestApi,
} from "../../api/internalRequestApi";
import { getDepartmentsApi, getEmployeesApi } from "../../api/companyAdminApi";
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Filter,
  Users,
  Building2,
  User,
  Clock,
  CheckCircle2,
  Paperclip,
  Trash2,
  ChevronRight,
  Sparkles,
  Inbox,
  X,
  RefreshCw,
  CheckCheck,
  Download,
  UploadCloud,
  FileText,
  AlertCircle,
  Tag,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = [
  "Data Request",
  "Document Submission",
  "General Query",
  "IT Support",
  "HR Assistance",
  "Feedback & Survey",
  "Approval Request",
  "Accounts & Finance",
  "Other",
];

const PRIORITIES = [
  { label: "Low", badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
  { label: "Medium", badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  { label: "High", badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  { label: "Urgent", badge: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
];

const STATUS_BADGES = {
  Open: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  "In Progress": "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  Resolved: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  Closed: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

export default function CompanyRequestsPage({ role = "hr" }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter States
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);

  // Reply State
  const [replyMessage, setReplyMessage] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [isResolutionReply, setIsResolutionReply] = useState(false);
  const replyFileInputRef = useRef(null);

  // Create Form State
  const [form, setForm] = useState({
    title: "",
    category: "Data Request",
    priority: "Medium",
    targetType: "ALL_EMPLOYEES",
    targetDepartmentId: "",
    targetEmployeeIds: [],
    description: "",
    attachments: [],
  });
  const createFileInputRef = useRef(null);
  const [empSearch, setEmpSearch] = useState("");

  // Queries
  const { data: deptData } = useQuery({
    queryKey: ["departmentsListForRequests"],
    queryFn: async () => {
      try {
        const res = await getDepartmentsApi();
        return res.data?.departments || res.data?.data || res.data || [];
      } catch (_) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employeesListForRequests"],
    queryFn: async () => {
      try {
        const res = await getEmployeesApi({ limit: 1000 });
        return res.data?.employees || res.data?.data || res.data || [];
      } catch (_) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: requestsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["internalRequests", tab, selectedCategory, selectedPriority, selectedDepartment, search],
    queryFn: () =>
      getInternalRequestsApi({
        tab,
        category: selectedCategory,
        priority: selectedPriority,
        departmentId: selectedDepartment,
        search,
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const requestsList = requestsData?.data || [];
  const stats = requestsData?.stats || { total: 0, open: 0, inProgress: 0, resolved: 0, sentByMe: 0 };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => createInternalRequestApi(data),
    onSuccess: (res) => {
      toast.success(res?.data?.message || "Request broadcasted successfully!");
      queryClient.invalidateQueries(["internalRequests"]);
      setCreateModalOpen(false);
      setForm({
        title: "",
        category: "Data Request",
        priority: "Medium",
        targetType: "ALL_EMPLOYEES",
        targetDepartmentId: "",
        targetEmployeeIds: [],
        description: "",
        attachments: [],
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to create request");
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, payload }) => replyToInternalRequestApi(id, payload),
    onSuccess: (res) => {
      toast.success("Response submitted!");
      queryClient.invalidateQueries(["internalRequests"]);
      setReplyMessage("");
      setReplyAttachments([]);
      setIsResolutionReply(false);
      if (res?.data?.data) {
        setActiveRequest(res.data.data);
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to post reply");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateInternalRequestStatusApi(id, status),
    onSuccess: (res) => {
      toast.success("Status updated!");
      queryClient.invalidateQueries(["internalRequests"]);
      if (res?.data?.data) {
        setActiveRequest(res.data.data);
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteInternalRequestApi(id),
    onSuccess: () => {
      toast.success("Request deleted");
      queryClient.invalidateQueries(["internalRequests"]);
      setActiveRequest(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete");
    },
  });

  // File Upload Handlers
  const handleCreateFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({
          ...prev,
          attachments: [
            ...prev.attachments,
            {
              name: file.name,
              url: reader.result,
              type: file.type || "document",
              size: `${(file.size / 1024).toFixed(1)} KB`,
            },
          ],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleReplyFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setReplyAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: reader.result,
            type: file.type || "document",
            size: `${(file.size / 1024).toFixed(1)} KB`,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      return toast.error("Title and description are required");
    }
    createMutation.mutate(form);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeRequest) return;

    replyMutation.mutate({
      id: activeRequest._id,
      payload: {
        message: replyMessage,
        attachments: replyAttachments,
        isResolution: isResolutionReply,
      },
    });
  };

  const toggleEmployeeSelection = (empId) => {
    setForm((prev) => {
      const exists = prev.targetEmployeeIds.includes(empId);
      return {
        ...prev,
        targetEmployeeIds: exists
          ? prev.targetEmployeeIds.filter((id) => id !== empId)
          : [...prev.targetEmployeeIds, empId],
      };
    });
  };

  const filteredEmployees = (employeesData || []).filter((emp) => {
    const name = (emp.fullName || emp.name || emp.firstName || "").toLowerCase();
    const dept = (emp.departmentId?.name || "").toLowerCase();
    const q = empSearch.toLowerCase();
    return name.includes(q) || dept.includes(q);
  });

  return (
    <div className="space-y-3 pb-16 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">

      {/* ── 1. SLIM EXECUTIVE HEADER ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <MessageSquare size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Company Requests & Query Hub
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Broadcast data requirements, inquiries, and collaborate in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh requests"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-amber-500" : ""} />
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <Plus size={13} strokeWidth={3} />
              <span>New Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. MICRO-KPI STAT CARDS (4 Columns) ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Requests</p>
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Inbox size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Open & Active</p>
            <p className="text-base sm:text-lg font-black text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">{stats.open + stats.inProgress}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Clock size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Resolved</p>
            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{stats.resolved}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">My Requests</p>
            <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{stats.sentByMe}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Send size={15} />
          </div>
        </div>
      </div>

      {/* ── 3. TABS & FILTER STRIP ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          {/* Segmented Tab Controls */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: "all", label: "All Requests", count: stats.total },
              { id: "sent_by_me", label: "My Sent", count: stats.sentByMe },
              { id: "assigned_to_me", label: "Received / For Me" },
              { id: "resolved", label: "Resolved", count: stats.resolved },
            ].map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-black shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
                >
                  {t.label} {t.count !== undefined && <span className="opacity-75 font-mono">({t.count})</span>}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, title, topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Dropdown Filters Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 text-xs font-semibold cursor-pointer"
          >
            <option value="all">All Departments</option>
            {deptData?.map((d) => (
              <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 text-xs font-semibold cursor-pointer"
          >
            <option value="all">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.label} value={p.label}>{p.label} Priority</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 text-xs font-semibold cursor-pointer"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(selectedDepartment !== "all" || selectedPriority !== "all" || selectedCategory !== "all" || search) && (
            <button
              onClick={() => {
                setSelectedDepartment("all");
                setSelectedPriority("all");
                setSelectedCategory("all");
                setSearch("");
              }}
              className="text-amber-600 dark:text-amber-400 hover:underline text-[11px] font-bold ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── 4. REQUESTS FEED ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading requests...</div>
      ) : requestsList.length === 0 ? (
        <div className="py-14 text-center rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <Inbox size={28} className="mx-auto mb-2 opacity-40 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-white">No Requests Found</h3>
          <p className="text-[10.5px] text-slate-400 mt-0.5">
            {search ? "No requests matching your active filters." : "Create your first broadcast request to begin collaborating."}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs cursor-pointer"
          >
            Create Request
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {requestsList.map((reqItem) => {
            const priorityBadge =
              PRIORITIES.find((p) => p.label === reqItem.priority)?.badge || PRIORITIES[1].badge;
            const statusBadge = STATUS_BADGES[reqItem.status] || STATUS_BADGES.Open;
            const responsesCount = reqItem.responses?.length || 0;

            return (
              <div
                key={reqItem._id}
                onClick={() => setActiveRequest(reqItem)}
                className="group p-3 rounded-xl bg-white dark:bg-[#111C24] hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 shadow-2xs transition-all cursor-pointer"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        {reqItem.requestCode}
                      </span>
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${priorityBadge}`}>
                        {reqItem.priority}
                      </span>
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${statusBadge}`}>
                        {reqItem.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">• {reqItem.category}</span>
                    </div>

                    <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                      {reqItem.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {reqItem.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                        {reqItem.targetType === "ALL_EMPLOYEES" ? (
                          <>
                            <Building2 size={11} className="text-amber-500" />
                            <span>All Company</span>
                          </>
                        ) : reqItem.targetType === "DEPARTMENT" ? (
                          <>
                            <Users size={11} className="text-cyan-500" />
                            <span>Dept: {reqItem.targetDepartmentName || "Department"}</span>
                          </>
                        ) : (
                          <>
                            <User size={11} className="text-indigo-500" />
                            <span>{reqItem.targetEmployeeIds?.length || 0} Staff</span>
                          </>
                        )}
                      </div>

                      {reqItem.attachments?.length > 0 && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          <Paperclip size={10} className="text-amber-500" />
                          <span>{reqItem.attachments.length} files</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800/80">
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{reqItem.requesterId?.name || "Requester"}</p>
                      <p className="text-[9.5px] text-slate-400 font-mono">{new Date(reqItem.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10.5px] font-bold">
                        <MessageSquare size={11} />
                        <span>{responsesCount}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. MODAL: CREATE REQUEST ───────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-xl bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Create Company Request</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Request Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Sales Data & Expense Receipts Submission"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.label} value={p.label}>{p.label} Priority</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Target Audience</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "ALL_EMPLOYEES", label: "All Company", icon: Building2 },
                    { id: "DEPARTMENT", label: "Department", icon: Users },
                    { id: "SPECIFIC_EMPLOYEES", label: "Specific Staff", icon: User },
                  ].map(t => {
                    const Icon = t.icon;
                    const isSel = form.targetType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm({ ...form, targetType: t.id })}
                        className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSel
                            ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400"
                            : "bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Icon size={13} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {form.targetType === "DEPARTMENT" && (
                  <div className="mt-2">
                    <select
                      value={form.targetDepartmentId}
                      onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}
                      required
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                    >
                      <option value="">-- Choose Department --</option>
                      {deptData?.map((d) => (
                        <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.targetType === "SPECIFIC_EMPLOYEES" && (
                  <div className="mt-2 space-y-1.5">
                    <input
                      type="text"
                      placeholder="Search member..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded text-xs"
                    />
                    <div className="max-h-32 overflow-y-auto bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 space-y-0.5">
                      {filteredEmployees.map((emp) => {
                        const empId = emp.userId?._id || emp._id;
                        const isSelected = form.targetEmployeeIds.includes(empId);
                        return (
                          <div
                            key={empId}
                            onClick={() => toggleEmployeeSelection(empId)}
                            className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer ${
                              isSelected ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <span>{emp.fullName || emp.name}</span>
                            {isSelected && <Check size={12} className="text-amber-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Instructions *</label>
                <textarea
                  rows={3}
                  placeholder="Explain exactly what information or feedback is required..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div>
                <input type="file" ref={createFileInputRef} onChange={handleCreateFileUpload} multiple className="hidden" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => createFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#0B101B] hover:bg-slate-100 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <UploadCloud size={12} />
                    <span>Attach Files</span>
                  </button>

                  {form.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10.5px] font-bold">
                      <Paperclip size={10} />
                      <span className="truncate max-w-[120px]">{att.name}</span>
                      <button type="button" onClick={() => setForm(p => ({ ...p, attachments: p.attachments.filter((_, idx) => idx !== i) }))}>
                        <X size={11} className="text-slate-400 hover:text-rose-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isLoading ? "Broadcasting..." : "Broadcast Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. SLIDE-OVER DRAWER: REQUEST DETAILS & THREAD ─────────────────── */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl h-full bg-white dark:bg-[#111C24] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slideLeft">
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    {activeRequest.requestCode}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">• {activeRequest.category}</span>
                </div>
                <h2 className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {activeRequest.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={activeRequest.status}
                  onChange={(e) => statusMutation.mutate({ id: activeRequest._id, status: e.target.value })}
                  className="bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-1 text-xs font-black text-amber-600 dark:text-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>

                <button onClick={() => setActiveRequest(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Content & Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-300">By: {activeRequest.requesterId?.name || "Requester"}</span>
                  <span className="font-mono">{new Date(activeRequest.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {activeRequest.description}
                </p>

                {activeRequest.attachments?.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
                    {activeRequest.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 text-[10.5px] font-bold border border-slate-200 dark:border-slate-700"
                      >
                        <Paperclip size={10} />
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <Download size={10} className="text-slate-400" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Thread Responses */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-amber-500" />
                  Team Responses ({activeRequest.responses?.length || 0})
                </h4>

                {(!activeRequest.responses || activeRequest.responses.length === 0) ? (
                  <div className="py-8 text-center rounded-xl bg-slate-50 dark:bg-slate-900/30 text-slate-400 text-xs">
                    No responses yet. Submit your feedback below.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeRequest.responses.map((resp, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border ${
                          resp.isResolution
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-slate-50 dark:bg-[#0B101B] border-slate-200/80 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs">{resp.senderName}</span>
                          <span className="text-[9.5px] text-slate-400 font-mono">{new Date(resp.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {resp.message}
                        </p>
                        {resp.attachments?.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {resp.attachments.map((att, i) => (
                              <a
                                key={i}
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-[10px] font-bold text-cyan-600 border border-slate-200 dark:border-slate-700"
                              >
                                <Paperclip size={9} />
                                <span>{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B101B]">
              <form onSubmit={handleSendReply} className="space-y-2 text-xs">
                <textarea
                  rows={2}
                  placeholder="Type your response or resolution notes..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-semibold resize-none"
                />

                {replyAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {replyAttachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 text-[10.5px] font-bold">
                        <Paperclip size={10} />
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <button type="button" onClick={() => setReplyAttachments(p => p.filter((_, idx) => idx !== i))}>
                          <X size={11} className="text-slate-400 hover:text-rose-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input type="file" ref={replyFileInputRef} onChange={handleReplyFileUpload} multiple className="hidden" />
                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                    >
                      <Paperclip size={12} className="text-amber-500" />
                      <span>Attach</span>
                    </button>
                    <label className="flex items-center gap-1 text-[10.5px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isResolutionReply}
                        onChange={(e) => setIsResolutionReply(e.target.checked)}
                        className="rounded text-amber-500"
                      />
                      <span>Resolution</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={replyMutation.isLoading || !replyMessage.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={12} />
                    <span>{replyMutation.isLoading ? "Posting..." : "Send"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
