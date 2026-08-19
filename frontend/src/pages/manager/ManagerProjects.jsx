import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getManagerProjectsApi, deleteManagerProjectApi } from "../../api/managerApi";
import {
  FolderKanban,
  RefreshCw,
  Plus,
  Search,
  Users,
  Folder,
  Pencil,
  Trash2,
  CalendarClock,
  Filter,
  CheckCircle2,
  Clock,
  PauseCircle,
  Briefcase
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import ProjectCreateModal from "../../components/projects/ProjectCreateModal";
import ProjectEditModal from "../../components/projects/ProjectEditModal";

const STATUS_CONFIG = {
  planning: { label: "Planning", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", dot: "bg-violet-500", hex: "#8b5cf6" },
  active: { label: "Active", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", dot: "bg-blue-500", hex: "#3b82f6" },
  working: { label: "Working", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", dot: "bg-amber-500", hex: "#f59e0b" },
  review: { label: "Review", color: "text-pink-700 dark:text-pink-400", bg: "bg-pink-500/10 border-pink-500/20", dot: "bg-pink-500", hex: "#ec4899" },
  deployment: { label: "Deployment", color: "text-cyan-700 dark:text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", dot: "bg-cyan-500", hex: "#06b6d4" },
  completed: { label: "Completed", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-500", hex: "#10b981" },
  "on-hold": { label: "On Hold", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", dot: "bg-rose-500", hex: "#ef4444" },
  cancelled: { label: "Cancelled", color: "text-slate-700 dark:text-slate-400", bg: "bg-slate-500/10 border-slate-500/20", dot: "bg-slate-500", hex: "#64748b" },
};

const PRIORITY_CONFIG = {
  high: { label: "High", bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
  medium: { label: "Medium", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  low: { label: "Low", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
};

const FILTER_TABS = ["All", "Active", "Planning", "Completed", "On Hold"];

const MiniAvatar = ({ name, idx = 0, size = "w-6 h-6", textSize = "text-[10px]" }) => (
  <div className={`${size} rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold ${textSize} shrink-0 shadow-2xs`}>
    {(name || "?").charAt(0).toUpperCase()}
  </div>
);

const PriorityBadge = ({ priority }) => {
  if (!priority) return null;
  const cfg = PRIORITY_CONFIG[priority?.toLowerCase()] || PRIORITY_CONFIG.medium;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.text} ${cfg.bg} border shadow-2xs`}>
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
};

const ManagerProjects = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["managerProjects"],
    queryFn: () => getManagerProjectsApi().then((r) => r.data),
    refetchInterval: 5000,
    retry: 1,
  });

  const deleteMut = useMutation({
    mutationFn: deleteManagerProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managerProjects"] });
      toast.success("Project deleted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete project");
    }
  });

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteMut.mutate(id);
    }
  };

  const handleEdit = (e, project) => {
    e.stopPropagation();
    setEditProject(project);
  };

  const _rawProjects = data?.projects || data?.data;
  const allProjects = useMemo(() => (Array.isArray(_rawProjects) ? _rawProjects : []), [_rawProjects]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = allProjects.length;
    const active = allProjects.filter((p) => ["active", "working", "deployment"].includes((p.status || "").toLowerCase())).length;
    const planning = allProjects.filter((p) => ["planning", "review"].includes((p.status || "").toLowerCase())).length;
    const completed = allProjects.filter((p) => (p.status || "").toLowerCase() === "completed").length;
    return { total, active, planning, completed };
  }, [allProjects]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return allProjects.filter((p) => {
      const name = p.name || "";
      const desc = p.description || "";
      const client = p.clientName || "";
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        desc.toLowerCase().includes(search.toLowerCase()) ||
        client.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "All") return true;
      const st = (p.status || "").toLowerCase();
      if (statusFilter === "Active") return ["active", "working", "deployment"].includes(st);
      if (statusFilter === "Planning") return ["planning", "review"].includes(st);
      if (statusFilter === "Completed") return st === "completed";
      if (statusFilter === "On Hold") return st === "on-hold" || st === "on_hold";
      return true;
    });
  }, [allProjects, search, statusFilter]);

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto pb-8 font-sans">
      <PageHeader title="Projects Management" icon={FolderKanban}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Projects"
            className="flex items-center justify-center p-2 rounded-xl text-slate-950 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 font-bold shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 shadow-2xs transition-all cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} /> New Project
          </button>
        </div>
      </PageHeader>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {[
          { label: "Total Projects", value: stats.total, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: FolderKanban },
          { label: "Active & Working", value: stats.active, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
          { label: "In Planning", value: stats.planning, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", icon: Briefcase },
          { label: "Completed", value: stats.completed, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-white dark:bg-[#111C24] border ${s.border} rounded-2xl p-4 shadow-2xs relative overflow-hidden transition-all hover:shadow-md flex items-center justify-between`}>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] font-bold tracking-tight text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>
                <Icon size={20} strokeWidth={2.2} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center justify-between bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name, description, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter size={13} className="text-slate-400 shrink-0 mr-1 hidden md:inline" />
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab
                  ? "bg-amber-500 text-slate-950 shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl h-44 animate-pulse bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400 shadow-2xs">
          <FolderKanban size={48} className="mx-auto mb-3 opacity-30 text-amber-500" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No projects found</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting search query or create a new project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredProjects.map((project, i) => {
            const statusKey = (project.status || "planning").toLowerCase();
            const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.active;
            const assignedNames = (project.members || []).filter((a) => a && (a.firstName || a.name || a.fullName));
            const deadline = project.deadline || project.endDate ? new Date(project.deadline || project.endDate) : null;

            return (
              <div
                key={project._id || i}
                onClick={() => navigate(`/manager/projects/${project._id}`)}
                className="group relative flex flex-col justify-between bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
              >
                {/* Left Status Accent Ribbon */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-[4px] group-hover:w-[6px] transition-all duration-300 z-10"
                  style={{ backgroundColor: statusCfg.hex }}
                />

                <div className="pl-1.5">
                  {/* Top Badges & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusCfg.bg} ${statusCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} mr-1`} />
                        {statusCfg.label}
                      </span>
                      <PriorityBadge priority={project.priority || "medium"} />
                    </div>

                    {/* Edit & Delete Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
                      <button
                        onClick={(e) => handleEdit(e, project)}
                        title="Edit Project"
                        className="p-1 text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project._id)}
                        title="Delete Project"
                        className="p-1 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug mb-1 line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {project.name || "Untitled Project"}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {project.description || "No description provided."}
                  </p>
                </div>

                {/* Footer Details */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between pl-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <CalendarClock size={13} className="text-slate-400" />
                    <span>
                      {deadline
                        ? deadline.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "No deadline"}
                    </span>
                  </div>

                  {/* Team Member Avatars */}
                  <div className="flex items-center -space-x-1.5">
                    {assignedNames.length > 0 ? (
                      <>
                        {assignedNames.slice(0, 3).map((a, idx) => (
                          <MiniAvatar
                            key={a._id || idx}
                            name={a.firstName || a.name || a.fullName}
                            idx={idx}
                            size="w-6 h-6"
                            textSize="text-[10px]"
                          />
                        ))}
                        {assignedNames.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center text-[9px] font-black border border-amber-500/20 shadow-2xs z-10">
                            +{assignedNames.length - 3}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Users size={12} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <ProjectCreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} />

      {/* Edit Project Modal */}
      {editProject && (
        <ProjectEditModal
          isOpen={true}
          onClose={() => setEditProject(null)}
          editData={editProject}
        />
      )}
    </div>
  );
};

export default ManagerProjects;


