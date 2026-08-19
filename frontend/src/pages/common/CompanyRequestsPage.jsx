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
  Layers,
  ArrowUpRight,
  FileText,
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
  { label: "Low", badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  { label: "Medium", badge: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  { label: "High", badge: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  { label: "Urgent", badge: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 animate-pulse" },
];

const STATUS_BADGES = {
  Open: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  "In Progress": "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  Resolved: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  Closed: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

export default function CompanyRequestsPage({ role = "hr" }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter States
  const [tab, setTab] = useState("all"); // 'all' | 'sent_by_me' | 'assigned_to_me' | 'resolved'
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);

  // Reply state
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

  // Fetch Departments
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

  // Fetch Employees
  const { data: employeesData } = useQuery({
    queryKey: ["employeesListForRequests"],
    queryFn: async () => {
      try {
        const res = await getEmployeesApi();
        return res.data?.employees || res.data?.data || res.data || [];
      } catch (_) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Requests
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

  // Create Request Mutation
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

  // Reply Mutation
  const replyMutation = useMutation({
    mutationFn: ({ id, payload }) => replyToInternalRequestApi(id, payload),
    onSuccess: (res) => {
      toast.success("Feedback response submitted!");
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

  // Status Change Mutation
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

  // Delete Mutation
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

  // Handle File Upload for Create Form
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

  // Handle File Upload for Reply
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
    <div className="space-y-4 p-4 sm:p-6 max-w-[1600px] mx-auto transition-colors duration-200">
      {/* ══════════ TOP HERO HEADER ══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-500/20 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
            <MessageSquare size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Company Requests & Query Hub
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                Core
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Broadcast data requirements, inquiries, and collaborate in real-time across company teams
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-white dark:bg-[#111C24] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all shadow-2xs cursor-pointer"
            title="Refresh Requests"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin text-amber-500" : ""} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* ══════════ METRICS STATS CARDS ══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Requests</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Inbox size={17} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Open & Active</p>
            <p className="text-xl sm:text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">{stats.open + stats.inProgress}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Clock size={17} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Resolved</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.resolved}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={17} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sent by Me</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{stats.sentByMe}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Send size={17} />
          </div>
        </div>
      </div>

      {/* ══════════ TABS & FILTERS BAR ══════════ */}
      <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        {/* Navigation Tabs + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { id: "all", label: "All Requests", count: stats.total },
              { id: "sent_by_me", label: "My Requests (Sent)", count: stats.sentByMe },
              { id: "assigned_to_me", label: "Received / For Me" },
              { id: "resolved", label: "Resolved", count: stats.resolved },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tab === t.id
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {t.label} {t.count !== undefined && <span className="opacity-80">({t.count})</span>}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, title, topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Dropdown Filters Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mr-1">
            <Filter size={13} />
            <span>Filters:</span>
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 text-xs"
          >
            <option value="all">All Departments</option>
            {deptData?.map((d) => (
              <option key={d._id || d.id} value={d._id || d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 text-xs"
          >
            <option value="all">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label} Priority
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 text-xs"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
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
              className="text-amber-600 dark:text-amber-400 hover:underline text-[11px] ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ══════════ REQUESTS LIST / HIGH DENSITY CARDS ══════════ */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
          <RefreshCw size={22} className="animate-spin text-amber-500" />
          <p className="text-xs">Loading company requests & feedback...</p>
        </div>
      ) : requestsList.length === 0 ? (
        <div className="py-16 text-center rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center p-6 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
            <Inbox size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">No Requests Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            {search
              ? "No requests matching your active search or filters."
              : "No requests found in this view. Click 'New Request' above to create one."}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            Create First Request
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {requestsList.map((reqItem) => {
            const priorityBadge =
              PRIORITIES.find((p) => p.label === reqItem.priority)?.badge || PRIORITIES[1].badge;
            const statusBadge = STATUS_BADGES[reqItem.status] || STATUS_BADGES.Open;
            const responsesCount = reqItem.responses?.length || 0;

            return (
              <div
                key={reqItem._id}
                onClick={() => setActiveRequest(reqItem)}
                className="group p-4 rounded-xl bg-white dark:bg-[#111C24] hover:bg-slate-50/70 dark:hover:bg-[#15232d] border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left Column: Code, Title, Target & Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                        {reqItem.requestCode}
                      </span>
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded border ${priorityBadge}`}>
                        {reqItem.priority}
                      </span>
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${statusBadge}`}>
                        {reqItem.status}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        • {reqItem.category}
                      </span>
                    </div>

                    <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                      {reqItem.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {reqItem.description}
                    </p>

                    {/* Target Audience Tag & Attachments */}
                    <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {reqItem.targetType === "ALL_EMPLOYEES" ? (
                          <>
                            <Building2 size={12} className="text-amber-600 dark:text-amber-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">All Company Members</span>
                          </>
                        ) : reqItem.targetType === "DEPARTMENT" ? (
                          <>
                            <Users size={12} className="text-cyan-600 dark:text-cyan-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Dept: {reqItem.targetDepartmentName || "Department"}</span>
                          </>
                        ) : (
                          <>
                            <User size={12} className="text-indigo-600 dark:text-indigo-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Target: {reqItem.targetEmployeeIds?.length || 0} Staff</span>
                          </>
                        )}
                      </div>

                      {reqItem.attachments?.length > 0 && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          <Paperclip size={11} className="text-amber-500" />
                          <span>{reqItem.attachments.length} Attachment(s)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Requester & Responses Counter */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-right">
                      <div className="hidden sm:block text-right">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {reqItem.requesterId?.name || "Requester"}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(reqItem.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {(reqItem.requesterId?.name || "R").charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs font-bold">
                        <MessageSquare size={13} />
                        <span>{responsesCount} Feedback</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ MODAL: CREATE NEW REQUEST ══════════ */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#0E1726] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  Create Company Request
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Broadcast data requirement or inquiry to company team</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 oc-scroll">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Request Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Sales Data & Expense Receipts Submission"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Priority Level
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label} Priority
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Audience
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, targetType: "ALL_EMPLOYEES" })}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      form.targetType === "ALL_EMPLOYEES"
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Building2 size={16} />
                    <span>All Company</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, targetType: "DEPARTMENT" })}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      form.targetType === "DEPARTMENT"
                        ? "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Users size={16} />
                    <span>Department</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, targetType: "SPECIFIC_EMPLOYEES" })}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      form.targetType === "SPECIFIC_EMPLOYEES"
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <User size={16} />
                    <span>Specific Staff</span>
                  </button>
                </div>

                {form.targetType === "DEPARTMENT" && (
                  <div className="mt-2">
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Select Department:</label>
                    <select
                      value={form.targetDepartmentId}
                      onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- Choose Department --</option>
                      {deptData?.map((d) => (
                        <option key={d._id || d.id} value={d._id || d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.targetType === "SPECIFIC_EMPLOYEES" && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Select Team Members ({form.targetEmployeeIds.length} chosen):</span>
                      <input
                        type="text"
                        placeholder="Search employee..."
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        className="px-2 py-0.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white text-[11px]"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1 oc-scroll">
                      {filteredEmployees.map((emp) => {
                        const empId = emp.userId?._id || emp._id;
                        const isSelected = form.targetEmployeeIds.includes(empId);
                        const empName = emp.fullName || emp.name || emp.firstName || "Employee";
                        return (
                          <div
                            key={empId}
                            onClick={() => toggleEmployeeSelection(empId)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <span>
                              {empName} ({emp.departmentId?.name || emp.role || "Staff"})
                            </span>
                            {isSelected && <CheckCheck size={14} className="text-indigo-600 dark:text-indigo-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Detailed Instructions & Requirements *
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain exactly what information, document, or feedback is required from team members..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                />
              </div>

              {/* File Attachment Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Attach Documents / Templates (Optional)
                </label>
                <input
                  type="file"
                  ref={createFileInputRef}
                  onChange={handleCreateFileUpload}
                  multiple
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => createFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                  >
                    <UploadCloud size={14} />
                    <span>Upload Local Files / Docs</span>
                  </button>

                  {form.attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px]"
                    >
                      <Paperclip size={11} />
                      <span className="truncate max-w-[140px]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            attachments: p.attachments.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="text-slate-400 hover:text-rose-500 ml-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isLoading ? "Broadcasting..." : "Broadcast Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ SLIDE-OVER DRAWER: REQUEST DETAILS & THREADED FEEDBACK CHAT ══════════ */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-[#0E1726] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                    {activeRequest.requestCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      STATUS_BADGES[activeRequest.status] || STATUS_BADGES.Open
                    }`}
                  >
                    {activeRequest.status}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">• {activeRequest.category}</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate mt-1">
                  {activeRequest.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Toggle Dropdown */}
                <select
                  value={activeRequest.status}
                  onChange={(e) =>
                    statusMutation.mutate({ id: activeRequest._id, status: e.target.value })
                  }
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="Open">Status: Open</option>
                  <option value="In Progress">Status: In Progress</option>
                  <option value="Resolved">Status: Resolved</option>
                  <option value="Closed">Status: Closed</option>
                </select>

                <button
                  onClick={() => setActiveRequest(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Content (Details + Live Feed) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 oc-scroll">
              {/* Request Overview Card */}
              <div className="p-4.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Requested by: {activeRequest.requesterId?.name || "Requester"}
                    </span>
                    <span>• {activeRequest.requesterRole || "Staff"}</span>
                  </div>
                  <span>{new Date(activeRequest.createdAt).toLocaleString()}</span>
                </div>

                <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {activeRequest.description}
                </p>

                {/* Attachments if any */}
                {activeRequest.attachments?.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Attached Files / Docs:</p>
                    <div className="flex flex-wrap gap-2">
                      {activeRequest.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 text-xs border border-slate-200 dark:border-slate-700 transition-all"
                        >
                          <Paperclip size={12} />
                          <span>{att.name}</span>
                          <Download size={11} className="ml-1 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Threaded Team Responses & Data Submissions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <MessageSquare size={14} className="text-amber-500" />
                    Team Responses & Data Submissions ({activeRequest.responses?.length || 0})
                  </h4>
                </div>

                {(!activeRequest.responses || activeRequest.responses.length === 0) ? (
                  <div className="py-10 text-center rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs">
                    No responses or data submitted yet. Be the first to reply below!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeRequest.responses.map((resp, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${
                          resp.isResolution
                            ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                              {resp.senderName?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{resp.senderName}</span>
                              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 ml-1.5">
                                ({resp.department || resp.senderRole || "Staff"})
                              </span>
                            </div>
                            {resp.isResolution && (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 ml-2">
                                Resolution
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(resp.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
                              ", " +
                              new Date(resp.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap ml-9 leading-relaxed">
                          {resp.message}
                        </p>

                        {resp.attachments?.length > 0 && (
                          <div className="ml-9 mt-2.5 flex flex-wrap gap-2">
                            {resp.attachments.map((att, i) => (
                              <a
                                key={i}
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700"
                              >
                                <Paperclip size={11} />
                                <span>{att.name}</span>
                                <Download size={11} className="ml-1 text-slate-400" />
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

            {/* Bottom Reply Composer */}
            <div className="p-4 md:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A101D]">
              <form onSubmit={handleSendReply} className="space-y-2.5">
                <textarea
                  rows={2}
                  placeholder="Type your feedback, requested data, or resolution note..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 resize-none"
                />

                {/* Reply Attachments List */}
                {replyAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {replyAttachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-[11px]"
                      >
                        <Paperclip size={11} />
                        <span className="truncate max-w-[140px]">{att.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyAttachments((p) => p.filter((_, idx) => idx !== i))
                          }
                          className="text-slate-400 hover:text-rose-500 ml-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                      type="file"
                      ref={replyFileInputRef}
                      onChange={handleReplyFileUpload}
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                    >
                      <Paperclip size={13} className="text-amber-500" />
                      <span>Attach File / Doc</span>
                    </button>

                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isResolutionReply}
                        onChange={(e) => setIsResolutionReply(e.target.checked)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-0"
                      />
                      <span>Mark as Resolution</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={replyMutation.isLoading || !replyMessage.trim()}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>{replyMutation.isLoading ? "Posting..." : "Send Response"}</span>
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
