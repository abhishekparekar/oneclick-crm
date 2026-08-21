import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCompanyProfileApi, getDepartmentsApi, getEmployeesApi } from "../../api/companyAdminApi";
import Sidebar from "./Sidebar";
import Header from "./Header";
import TaskCreateModal from "../tasks/TaskCreateModal";
import { X } from "lucide-react";

const DashboardLayout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Responsive Screen Listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const isSuperAdmin = user?.role === "SuperAdmin" || location.pathname.startsWith("/superadmin");
  const isManager = user?.role === "Manager" || location.pathname.startsWith("/manager");
  const isEmployee = user?.role === "Employee" || location.pathname.startsWith("/employee");
  const isHR = user?.role === "HR" || location.pathname.startsWith("/hr");

  // Only fetch company profile for CompanyAdmin or HR role
  const { data: profileData } = useQuery({
    queryKey: ["companyProfile"],
    queryFn: () => getCompanyProfileApi().then((res) => res.data),
    enabled: user?.role === "CompanyAdmin" || user?.role === "HR",
    staleTime: 5 * 60 * 1000,
  });

  // Fetch departments and employees for TaskCreateModal
  const { data: deptRes } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res = await getDepartmentsApi();
        return res.data?.departments || res.data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!user && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });
  const { data: empRes } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const res = await getEmployeesApi({ limit: 1000 });
        return res.data?.employees || res.data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!user && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const departments = Array.isArray(deptRes) ? deptRes : (deptRes?.departments || []);
  const employees = Array.isArray(empRes) ? empRes : (empRes?.employees || []);

  const footerName =
    user?.role === "CompanyAdmin" || user?.role === "HR"
      ? (profileData?.company?.companyName || profileData?.company?.name || "One Click Solutions")
      : user?.role === "Manager"
        ? (user?.name || "Manager")
        : user?.role === "Employee"
          ? (user?.name || "Employee")
          : "One Click Solutions";

  return (
    <div className={`flex h-screen w-full overflow-hidden print:h-auto print:overflow-visible bg-[#F8FAFC] dark:bg-[#070A10] text-slate-900 dark:text-slate-100 ${isManager || isEmployee ? "manager-panel" : ""}`}>

      {/* ── Mobile Dark Overlay Backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Slide-Over Drawer Sidebar (lg:hidden) ── */}
      {isMobile && (
        <div
          className={`fixed inset-y-0 left-0 z-50 w-[240px] max-w-[85vw] bg-[#090D16] border-r border-white/[0.08] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08] bg-[#06080E] flex-shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Navigation Menu</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close Menu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Sidebar onItemClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar (lg:block side-by-side flex layout) ── */}
      <div
        className="hidden lg:block flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out print:hidden"
        style={{ width: sidebarOpen ? "228px" : "0px" }}
      >
        <Sidebar />
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden print:overflow-visible">
        <div className="print:hidden flex-shrink-0">
          <Header onMenuClick={() => setSidebarOpen((prev) => !prev)} />
        </div>
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-4 md:p-6 hide-scrollbar print:overflow-visible print:p-0 w-full">
          {children}
        </main>
        <footer className="flex-shrink-0 border-t border-ca-border px-4 sm:px-6 py-2.5 flex items-center justify-between print:hidden bg-ca-surface text-ca-text-secondary">
          <p className="text-xs sm:text-sm font-medium truncate pr-2">
            © {new Date().getFullYear()} {footerName}. All rights reserved.
          </p>
          <p className="text-xs sm:text-sm font-medium flex-shrink-0">Version 2.5.0</p>
        </footer>
      </div>

      {/* Legacy Task Create Modal */}
      <TaskCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        departments={departments}
        employees={employees}
      />
    </div>
  );
};

export default DashboardLayout;
