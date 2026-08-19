import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeProjectsApi, getEmployeeProjectDetailsApi } from "../../api/employeeApi";
import {
  FolderKanban,
  CheckSquare,
  Clock,
  User,
  Search,
  X,
  ExternalLink,
  Users
} from "lucide-react";

const EmployeeProjects = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projectsRes, isLoading } = useQuery({
    queryKey: ["employeeProjects"],
    queryFn: () => getEmployeeProjectsApi().then((res) => res.data),
  });

  const projects = projectsRes?.projects || projectsRes?.data || [];

  const filteredProjects = projects.filter((p) =>
    (p.name || p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[var(--color-ca-card)] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FolderKanban className="text-[#E65100]" size={26} /> My Assigned Projects
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Projects you are assigned to as a team contributor.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search project name or description..."
          className="input-field pl-10 bg-white dark:bg-[var(--color-ca-card)] border-slate-200 dark:border-slate-800"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Projects Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Loading assigned projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="card p-12 text-center bg-white dark:bg-[var(--color-ca-card)] rounded-2xl border border-slate-200 dark:border-slate-800">
          <FolderKanban size={48} className="mx-auto mb-3 text-orange-400 opacity-60" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">No Projects Found</h3>
          <p className="text-xs text-slate-400 mt-1">You have not been assigned to any project yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div
              key={project._id || project.id}
              onClick={() => setSelectedProject(project)}
              className="card p-5 bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-400/50 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-orange-100 text-orange-700 dark:bg-[#E65100]/20 dark:text-orange-400">
                    {project.status || "Active"}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> {project.deadline ? new Date(project.deadline).toLocaleDateString() : "No deadline"}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 dark:text-white text-base line-clamp-1">
                  {project.name || project.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  {project.description || "No description available."}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Completion</span>
                  <span className="font-bold text-[#E65100] dark:text-orange-400">{project.progress ?? 50}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#E65100] h-full rounded-full transition-all duration-300"
                    style={{ width: `${project.progress ?? 50}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
            >
              <X size={20} />
            </button>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-[#E65100]/20 dark:text-orange-400">
                {selectedProject.status || "Active"}
              </span>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mt-2">{selectedProject.name || selectedProject.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{selectedProject.description || "No project description available."}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[var(--color-ca-bg)] border border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">Client / Department</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{selectedProject.client || "Internal"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Deadline</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : "Flexible"}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Project Progress</h4>
              <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-3 overflow-hidden mt-1">
                <div
                  className="bg-[#E65100] h-full rounded-full"
                  style={{ width: `${selectedProject.progress ?? 50}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProjects;



