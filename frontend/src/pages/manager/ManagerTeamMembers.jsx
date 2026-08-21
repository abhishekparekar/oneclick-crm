import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getManagerTeamApi } from "../../api/managerApi";
import { UsersRound, Search, RefreshCw, Mail, Phone, Briefcase, MapPin, Users, Building2, ShieldCheck, ChevronRight } from "lucide-react";

export default function ManagerTeamMembers() {
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

  return (
    <div className="space-y-3 pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">
      {/* ── 1. SLIM EXECUTIVE HEADER ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Team Members
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {filtered.length} Staff
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Directory of assigned team members and direct reports
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, email, dept..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Team Members"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-amber-500" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TEAM MEMBERS CARD GRID ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />
          Loading team directory...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <UsersRound size={28} className="mx-auto mb-2 opacity-40 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-white">No Team Members Found</h3>
          <p className="text-[10.5px] text-slate-400 mt-0.5">
            {search ? "No members match your search criteria." : "No team members are assigned yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filtered.map((member, i) => {
            const name = member.fullName || member.name || (member.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : null) || member.employeeId?.fullName || member.employeeId?.name || "Unknown Staff";
            const email = member.email || member.employeeId?.email || "";
            const phone = member.phone || member.employeeId?.phone || "";
            const dept = member.department?.name || member.departmentId?.name || member.departmentName || member.employeeId?.departmentId?.name || "General";
            const desig = member.designation?.name || member.designationId?.name || member.designationName || member.employeeId?.designationId?.name || "Team Member";
            const branch = member.branch?.name || member.branchId?.branchName || member.employeeId?.branchId?.branchName || "";

            return (
              <div
                key={member._id || i}
                className="group bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-black text-xs shadow-2xs">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111C24]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-amber-600 transition-colors">
                        {name}
                      </h3>
                      <p className="text-[10.5px] text-slate-400 font-medium truncate">{desig}</p>
                      <span className="inline-block mt-1 text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {dept}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300">
                    {email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} className="text-slate-400 shrink-0" />
                        <span className="font-mono">{phone}</span>
                      </div>
                    )}
                    {branch && (
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{branch}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
