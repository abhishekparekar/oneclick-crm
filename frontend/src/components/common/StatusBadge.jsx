const StatusBadge = ({ status }) => {
  const isSA = typeof window !== "undefined" && window.location.pathname.includes("/superadmin");

  const statusConfig = {
    // General
    active: { 
      bg: isSA ? "bg-sa-primary/15 dark:bg-[#613DC1]/25 border border-sa-primary/30" : "bg-theme-3-light", 
      text: isSA ? "text-sa-primary dark:text-[#93CAF6]" : "text-theme-1", 
      dot: isSA ? "bg-sa-primary dark:bg-[#93CAF6]" : "bg-theme-3" 
    },
    inactive: { bg: "bg-ca-bg dark:bg-white/10", text: "text-ca-text-secondary dark:text-slate-300", dot: "bg-slate-400" },
    suspended: { bg: "bg-ca-primary-light dark:bg-rose-500/20 border border-rose-500/30", text: "text-red-800 dark:text-rose-400", dot: "bg-ca-primary" },
    // Attendance
    present: { 
      bg: isSA ? "bg-sa-primary/15 dark:bg-[#613DC1]/25 border border-sa-primary/30" : "bg-theme-3-light", 
      text: isSA ? "text-sa-primary dark:text-[#93CAF6]" : "text-theme-1", 
      dot: isSA ? "bg-sa-primary dark:bg-[#93CAF6]" : "bg-theme-3" 
    },
    absent: { bg: "bg-ca-primary-light dark:bg-rose-500/20", text: "text-red-700 dark:text-rose-400", dot: "bg-ca-primary" },
    late: { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-ca-primary" },
    half_day: { bg: "bg-orange-100 dark:bg-orange-500/20", text: "text-orange-700 dark:text-orange-400", dot: "bg-ca-primary" },
    on_leave: { bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
    // Leave / Approval
    pending: { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-800 dark:text-amber-400", dot: "bg-ca-primary" },
    approved: { 
      bg: isSA ? "bg-sa-primary/15 dark:bg-[#613DC1]/25 border border-sa-primary/30" : "bg-theme-3-light", 
      text: isSA ? "text-sa-primary dark:text-[#93CAF6]" : "text-theme-1", 
      dot: isSA ? "bg-sa-primary dark:bg-[#93CAF6]" : "bg-theme-3" 
    },
    rejected: { bg: "bg-ca-primary-light dark:bg-rose-500/20", text: "text-red-700 dark:text-rose-400", dot: "bg-ca-primary" },
    // Payroll
    paid: { 
      bg: isSA ? "bg-sa-primary/15 dark:bg-[#613DC1]/25 border border-sa-primary/30" : "bg-theme-3-light", 
      text: isSA ? "text-sa-primary dark:text-[#93CAF6]" : "text-theme-1", 
      dot: isSA ? "bg-sa-primary dark:bg-[#93CAF6]" : "bg-theme-3" 
    },
    unpaid: { bg: "bg-ca-bg dark:bg-white/10", text: "text-ca-text-secondary dark:text-slate-300", dot: "bg-slate-400" },
    // Projects
    "on-hold": { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-ca-primary" },
    completed: { 
      bg: isSA ? "bg-sa-primary/15 dark:bg-[#613DC1]/25 border border-sa-primary/30" : "bg-blue-100 dark:bg-blue-500/20", 
      text: isSA ? "text-sa-primary dark:text-[#93CAF6]" : "text-blue-700 dark:text-blue-400", 
      dot: isSA ? "bg-sa-primary dark:bg-[#93CAF6]" : "bg-blue-500" 
    },
    cancelled: { bg: "bg-ca-primary-light dark:bg-rose-500/20", text: "text-red-700 dark:text-rose-400", dot: "bg-ca-primary" },
  };

  const normalizedStatus = status?.toLowerCase() || "pending";
  const config = statusConfig[normalizedStatus] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${config.dot}`}></span>
      {status}
    </span>
  );
};

export default StatusBadge;
