import { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { getManagerTeamApi, createManagerProjectApi } from "../../api/managerApi";
import { getDepartmentsApi } from "../../api/companyAdminApi";
import { Calendar, Users, X, AlertCircle, Search } from "lucide-react";
import TaskAttachmentField from "../tasks/TaskAttachmentField";
import toast from "react-hot-toast";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ProjectCreateModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();

  const { data: teamData } = useQuery({
    queryKey: ["managerTeam"],
    queryFn: () => getManagerTeamApi().then(r => r.data),
    enabled: isOpen,
  });

  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartmentsApi().then(r => r.data),
    enabled: isOpen,
  });

  const employees = teamData?.data?.teamMembers || teamData?.teamMembers || teamData?.team || [];
  const departments = deptData?.departments || [];

  const initialForm = {
    name: "",
    description: "",
    status: "planning",
    priority: "medium",
    startDate: getTodayDateString(),
    endDate: "",
    nextFollowUpDate: "",
    members: [],
    departmentId: "",
    attachments: [],
  };

  const [form, setForm] = useState(initialForm);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const createMut = useMutation({
    mutationFn: createManagerProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managerProjects"] });
      toast.success("Project created successfully");
      setForm(initialForm);
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create project");
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Project name is required");
    createMut.mutate(form);
  };

  const toggleMember = (empId) => {
    setForm(prev => {
      const isSelected = prev.members.includes(empId);
      if (isSelected) {
        return { ...prev, members: prev.members.filter(id => id !== empId) };
      } else {
        return { ...prev, members: [...prev.members, empId] };
      }
    });
  };

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (form.departmentId) {
      list = list.filter(emp => emp.departmentId?._id === form.departmentId || emp.departmentId === form.departmentId);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter(
        (emp) =>
          emp.fullName?.toLowerCase().includes(lowerSearch) ||
          emp.email?.toLowerCase().includes(lowerSearch)
      );
    }
    return list;
  }, [searchTerm, employees, form.departmentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full z-10"
        >
          <X size={18} />
        </button>

        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-4/20 bg-theme-4/10 dark:bg-ca-bg">
          <h2 className="text-xl font-bold text-ca-text">Create New Project</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} className="text-ca-text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              
              <div className="col-span-2">
                <label className="label-text">Project Name *</label>
                <input
                  type="text"
                  placeholder="Enter project name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="col-span-2">
                <label className="label-text">Description</label>
                <textarea
                  rows={3}
                  placeholder="Project details..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="label-text">Project Department</label>
                <select 
                  className="input-field"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="label-text">Assign Team Members</label>
                <div 
                  className="input-field min-h-[46px] flex flex-wrap gap-2 items-center cursor-pointer"
                  onClick={() => setIsDropdownOpen(true)}
                >
                  {form.members.length === 0 ? (
                    <div className="px-3 py-1.5 text-sm font-semibold text-slate-400">Select team members...</div>
                  ) : (
                    form.members.map(empId => {
                      const emp = employees.find(e => e._id === empId);
                      if (!emp) return null;
                      return (
                        <div key={empId} className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-orange-200 dark:border-orange-500/30">
                          {emp.fullName}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleMember(empId); }}
                            className="hover:bg-orange-200 dark:hover:bg-orange-500/30 rounded-full p-0.5 ml-1 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b border-slate-100 dark:border-slate-800 relative">
                        <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search members..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium outline-none text-slate-800 dark:text-white focus:border-orange-500 transition-colors"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-2 hide-scrollbar">
                        {filteredEmployees.length === 0 ? (
                          <div className="p-4 text-center text-sm font-semibold text-slate-400">No members found</div>
                        ) : (
                          filteredEmployees.map(emp => {
                            const isSelected = form.members.includes(emp._id);
                            return (
                              <div
                                key={emp._id}
                                onClick={() => toggleMember(emp._id)}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                                  isSelected ? "bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20" : "hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
                                }`}
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                                  {emp.fullName?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-bold truncate ${isSelected ? "text-orange-700 dark:text-orange-400" : "text-slate-700 dark:text-slate-200"}`}>
                                    {emp.fullName}
                                  </div>
                                  <div className="text-xs font-semibold text-slate-400 truncate">
                                    {emp.designationId?.name || "Member"}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                                    <X size={12} />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="label-text">Start Date *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-text">End Date / Deadline *</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-text">Next Follow-up Date</label>
                <input
                  type="date"
                  value={form.nextFollowUpDate}
                  onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-text">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="input-field"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

            </div>

            <TaskAttachmentField
              attachments={form.attachments}
              onChange={(attachments) => setForm((prev) => ({ ...prev, attachments }))}
            />

            <div className="px-6 py-4 border-t border-ca-border flex items-center justify-end space-x-3 bg-ca-surface">
              <button
                type="button"
                onClick={onClose}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMut.isPending}
                className="btn-primary"
              >
                {createMut.isPending ? "Creating Project..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
