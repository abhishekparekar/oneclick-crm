import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getManagerProjectByIdApi, getManagerProjectTasksApi, getManagerProjectActivityApi } from "../../api/managerApi";
import { Calendar, Users, ArrowLeft, Loader2, Play, Clock, FileText, CheckCircle2, ArrowRight, Activity, LayoutList, ChevronRight, History, ChevronLeft, Image as ImageIcon, Eye, Download, X } from "lucide-react";

const PROJECT_STATUS_THEMES = {
  planning: {
    label: "Planning",
    banner: "from-blue-50 to-indigo-50 dark:from-blue-500 dark:to-indigo-600",
    icon: Calendar,
    desc: "Project is in the initial planning stages."
  },
  active: {
    label: "Active",
    banner: "from-orange-50 to-amber-50 dark:from-orange-600 dark:to-orange-700",
    icon: Play,
    desc: "Project has kicked off and is currently active."
  },
  working: {
    label: "Working",
    banner: "from-teal-50 to-cyan-50 dark:from-teal-600 dark:to-teal-800",
    icon: Clock,
    desc: "Team is actively working on the project tasks."
  },
  review: {
    label: "Review",
    banner: "from-purple-50 to-pink-50 dark:from-purple-600 dark:to-pink-700",
    icon: FileText,
    desc: "Project deliverables are under review."
  },
  deployment: {
    label: "Deployment",
    banner: "from-indigo-50 to-violet-50 dark:from-indigo-600 dark:to-violet-700",
    icon: ArrowRight,
    desc: "Project is in the deployment phase."
  },
  completed: {
    label: "Completed",
    banner: "from-emerald-50 to-teal-50 dark:from-emerald-500 dark:to-teal-600",
    icon: CheckCircle2,
    desc: "Project has been completed successfully."
  }
};

const ManagerProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tasks");
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const handleDownloadAttachment = (file) => {
    const url = file.fileUrl || file.url;
    const fileName = file.fileName || file.name || "Attachment";
    if (!url) return;

    if (url.startsWith("data:")) {
      try {
        const parts = url.split(";base64,");
        const contentType = parts[0].replace("data:", "");
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      } catch (e) {
        console.error("Failed to parse base64 data url", e);
      }
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { data: projData, isLoading: projLoading, error: projError } = useQuery({
    queryKey: ["managerProject", id],
    queryFn: () => getManagerProjectByIdApi(id).then((r) => r.data),
    enabled: !!id,
    retry: false,
  });

  const project = projData?.data || projData?.project;

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["managerProjectTasks", id],
    queryFn: () => getManagerProjectTasksApi(id).then((r) => r.data),
    enabled: !!id && !projError && !!project,
    retry: false,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["managerProjectActivity", id],
    queryFn: () => getManagerProjectActivityApi(id).then((r) => r.data),
    enabled: !!id && !projError && !!project,
    retry: false,
  });

  const tasks = tasksData?.data || tasksData?.tasks || [];
  const activities = activityData?.data || activityData?.activityLog || [];

  if (projLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (projError || !project) {
    return (
      <div className="max-w-[1400px] mx-auto py-12 px-4 text-center font-sans">
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 max-w-md mx-auto shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <LayoutList size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Project Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-6 leading-relaxed">
            The project you are looking for does not exist or may have been deleted.
          </p>
          <button 
            onClick={() => navigate("/manager/projects")}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 shadow-2xs transition-all cursor-pointer"
          >
            Back to Projects List
          </button>
        </div>
      </div>
    );
  }

  const themeKey = (project.status || "planning").toLowerCase();
  const theme = PROJECT_STATUS_THEMES[themeKey] || PROJECT_STATUS_THEMES.planning;
  const StatusIcon = theme.icon;

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-12 font-sans px-2 sm:px-0">
      {/* ── Top Bar & Navigation ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 rounded-xl px-4 py-2.5 shadow-md border border-slate-800 relative overflow-hidden">
        {/* Subtle glow inside header */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

        <div className="flex items-center gap-2.5 relative z-10">
          <button
            onClick={() => navigate("/manager/projects")}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-300 shrink-0 shadow-sm"
            title="Back to Projects"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">
              <span>Project Management</span>
              <span className="opacity-50">/</span>
              <span className="text-slate-300">Details</span>
            </div>
            <h1 className="text-[17px] font-bold text-white leading-none tracking-tight">Project Overview</h1>
          </div>
        </div>
      </div>

      {/* ── Status Highlight Banner ── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-gradient-to-r ${theme.banner} shadow-sm border border-black/5 dark:border-white/10 transition-all relative overflow-hidden`}>
        <div className="flex items-center gap-3 relative z-10">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/10 shadow-sm text-slate-700 dark:text-white`}>
            <StatusIcon size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/70 mb-0.5">Project Status</div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap leading-tight">
              <span className="text-base font-black capitalize text-slate-800 dark:text-white">{theme.label}</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1.5 bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/10 shadow-sm ml-12 md:ml-0 w-fit">
          <span className="text-slate-400 dark:text-white/50 text-xs hidden md:inline">•</span>
          <span className="text-xs font-semibold text-slate-700 dark:text-white/95">
            {theme.desc}
          </span>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Project Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--ca-palette-5)]/5 rounded-bl-[100px] -z-0"></div>
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black bg-[var(--ca-palette-5)] text-white shadow-lg shadow-[var(--ca-palette-5)]/30 shrink-0">
                {project.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight mb-1">
                  {project.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-[var(--ca-palette-1)] text-[var(--ca-palette-7)] border border-[var(--ca-palette-3)] dark:bg-[var(--ca-palette-9)]/40 dark:text-[var(--ca-palette-4)] dark:border-[var(--ca-palette-8)]/60 shadow-sm">
                  Priority: {project.priority || "Medium"}
                </span>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Description
                </h4>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[var(--color-ca-card)]/ p-4 rounded-2xl border border-slate-150 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
                  {project.description || "No description provided for this project."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    <Calendar size={12} className="text-orange-500"/> Timeline
                  </div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                    <br/>
                    <span className="text-slate-400">to</span> {project.endDate || project.deadline ? new Date(project.endDate || project.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    <Users size={12} className="text-blue-500"/> Team Size
                  </div>
                  <div className="text-base font-black text-slate-700 dark:text-slate-200">
                    {project.members?.length || project.memberCount || 0} Members
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    <LayoutList size={12} className="text-emerald-500"/> Department
                  </div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {project.departmentId?.name || "All Departments"}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    <History size={12} className="text-purple-500"/> Next Follow-up
                  </div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {project.nextFollowUpDate ? new Date(project.nextFollowUpDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not Set"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members List */}
          <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Users size={14}/> Assigned Members
            </h4>
            <div className="space-y-3">
              {project.members && project.members.length > 0 ? (
                project.members.map((member) => (
                  <div key={member._id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-800 hover:border-orange-500/50 transition-colors cursor-default">
                    <img 
                      src={member.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=f97316&color=fff`}
                      alt={member.fullName}
                      className="w-10 h-10 rounded-xl object-cover shadow-sm bg-white"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                        {member.fullName}
                      </div>
                      <div className="text-xs font-semibold text-slate-400">
                        {member.designationId?.name || "Team Member"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400 italic p-4 bg-slate-50 dark:bg-[var(--color-ca-card)] rounded-2xl border border-slate-150 dark:border-slate-800 text-center">
                  No members assigned to this project yet.
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {project.attachments && project.attachments.length > 0 && (
            <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mt-4">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <FileText size={14}/> Attachments ({project.attachments.length})
              </h4>
              <div className="space-y-3">
                {project.attachments.map((file, idx) => {
                  const isImg =
                    file.fileType?.startsWith("image/") ||
                    file.fileUrl?.startsWith("data:image/") ||
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName || "");

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 transition-all"
                    >
                      <div
                        onClick={() => setPreviewAttachment(file)}
                        className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1 min-w-0 pr-2"
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                          {isImg ? <ImageIcon size={18} /> : <FileText size={18} />}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate hover:text-amber-600 transition-colors">
                            {file.fileName || "Attachment"}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                            {isImg ? "Image Document" : "File Attachment"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(file)}
                          title="Preview Document"
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 rounded-xl transition-colors cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(file)}
                          title="Download Document"
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 rounded-xl transition-colors cursor-pointer"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Tasks & Activity */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-2 sm:p-3 shadow-sm h-full min-h-[600px] flex flex-col">
            
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-850 rounded-2xl mb-4 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab("tasks")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "tasks" 
                    ? "bg-white dark:bg-[var(--color-ca-card)] text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200 dark:border-slate-700" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent"
                }`}
              >
                <LayoutList size={14} /> Project Tasks
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "activity" 
                    ? "bg-white dark:bg-[var(--color-ca-card)] text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200 dark:border-slate-700" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Activity size={14} /> Activity Log
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-2 sm:p-4 bg-slate-50 dark:bg-[var(--color-ca-card)] rounded-2xl border border-slate-100 dark:border-slate-850 overflow-y-auto">
              
              {activeTab === "tasks" && (
                <div className="space-y-3">
                  {tasksLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500"/></div>
                  ) : tasks.length > 0 ? (
                    tasks.map(task => (
                      <div key={task._id} className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:border-orange-500/50 transition-colors flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`w-2 h-2 rounded-full ${task.status === 'complete' ? 'bg-emerald-500' : task.status === 'in_process' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{task.status || "Pending"}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{task.title}</h4>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 text-slate-400">
                      <LayoutList size={32} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-semibold">No tasks created for this project yet.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-6 pl-4 border-l-2 border-slate-200 dark:border-slate-800 ml-4 py-4">
                  {activityLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500"/></div>
                  ) : activities.length > 0 ? (
                    activities.map((act, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-orange-100 dark:bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center top-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                            {act.action || act.description}
                          </div>
                          <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                            <span>{new Date(act.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            {act.user && <span>• by {act.user.fullName || "User"}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 text-slate-400 -ml-4">
                      <History size={32} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-semibold">No activity recorded yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attachment Lightbox Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#1E293B]/50">
              <div className="flex items-center gap-2 truncate pr-4">
                <FileText size={16} className="text-amber-500 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {previewAttachment.fileName || "Attachment Preview"}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(previewAttachment)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer"
                >
                  <Download size={13} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 flex items-center justify-center max-h-[70vh] overflow-auto bg-slate-950/20">
              {previewAttachment.fileType?.startsWith("image/") ||
              previewAttachment.fileUrl?.startsWith("data:image/") ||
              /\.(jpg|jpeg|png|gif|webp)$/i.test(previewAttachment.fileName || "") ? (
                <img
                  src={previewAttachment.fileUrl || previewAttachment.url}
                  alt={previewAttachment.fileName || "Attachment"}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md"
                />
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <FileText size={48} className="mx-auto mb-3 opacity-40 text-amber-500" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">File Preview Not Supported</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Click download to save and open this file on your device.</p>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(previewAttachment)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    <Download size={14} /> Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerProjectDetails;
