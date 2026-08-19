import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getManagerTeamApi } from "../../api/managerApi";
import { UsersRound, Search, RefreshCw, Mail, Phone, Briefcase, MapPin, Users } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const ManagerTeamMembers = () => {
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["managerTeam"],
    queryFn: () => getManagerTeamApi().then((r) => r.data),
    refetchInterval: 5000,
    retry: 1,
  });

  const _raw = data?.data?.teamMembers || data?.teamMembers || data?.team || data?.employees;
  const members = Array.isArray(_raw) ? _raw : (Array.isArray(data?.data) ? data?.data : []);

  const filtered = members.filter((m) => {
    if (!search) return true;
    const name = m.fullName || m.name || (m.firstName ? `${m.firstName} ${m.lastName || ''}`.trim() : null) || m.employeeId?.fullName || m.employeeId?.name || "";
    const email = m.email || m.employeeId?.email || "";
    const dept = m.department?.name || m.departmentId?.name || m.departmentName || m.employeeId?.departmentId?.name || "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      dept.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getInitials = (name = "") =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const AVATAR_COLORS = [
    ["#f97316", "rgba(249,115,22,0.1)"],
    ["#8b5cf6", "rgba(139,92,246,0.1)"],
    ["#10b981", "rgba(16,185,129,0.1)"],
    ["#3b82f6", "rgba(59,130,246,0.1)"],
    ["#f59e0b", "rgba(245,158,11,0.1)"],
  ];

  return (
    <div className="space-y-3 max-w-[1400px] mx-auto pb-8 font-sans">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <span>Team Members</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
              {filtered.length}
            </span>
          </div>
        }
        icon={Users}
      >
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-md transition-all border border-[#CC4800]/50 bg-[#E65100] hover:bg-[#CC4800] disabled:opacity-50"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      {/* Search */}
      <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-semibold outline-none bg-slate-50 dark:bg-[var(--color-ca-card)]/ border border-slate-150 dark:border-slate-800 text-slate-850 dark:text-white"
          />
        </div>
      </div>

      {/* Members Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-3xl h-40 animate-pulse bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-400 shadow-sm">
          <UsersRound size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No team members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member, i) => {
            const name = member.fullName || member.name || (member.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : null) || member.employeeId?.fullName || member.employeeId?.name || "Unknown";
            const email = member.email || member.employeeId?.email || "";
            const phone = member.phone || member.employeeId?.phone || "";
            const dept = member.department?.name || member.departmentId?.name || member.departmentName || member.employeeId?.departmentId?.name || "";
            const desig = member.designation?.name || member.designationId?.name || member.designationName || member.employeeId?.designationId?.name || "";
            const branch = member.branch?.name || member.branchId?.branchName || member.employeeId?.branchId?.branchName || "";
            const [color, bg] = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const status = member.status || "Active";

            const rawPhoto = member.photo || member.user?.profileImage;
            const photoUrl = rawPhoto ? (rawPhoto.startsWith("http") || rawPhoto.startsWith("data:") ? rawPhoto : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}`) : null;

            return (
              <div
                key={member._id}
                className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-4 border-b border-slate-50 dark:border-slate-800 pb-3">
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt={name} 
                      className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black flex-shrink-0"
                      style={{ background: bg, color }}
                    >
                      {getInitials(name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-white truncate">{name}</p>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5 truncate">{desig || "Employee"}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      status === "Active"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                        : "bg-red-50 text-red-600 dark:bg-red-950/20"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="space-y-2">
                  {email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{email}</span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{phone}</span>
                    </div>
                  )}
                  {dept && (
                    <div className="flex items-center gap-2">
                      <Briefcase size={12} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{dept}</span>
                    </div>
                  )}
                  {branch && (
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{branch}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManagerTeamMembers;

