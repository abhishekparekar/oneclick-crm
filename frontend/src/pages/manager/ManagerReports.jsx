import Reports from "../companyadmin/Reports";

/**
 * ManagerReports Component
 * 
 * Re-exports the unified, comprehensive Business Intelligence & Reporting Suite (Reports.jsx)
 * so that Company Admin, HR, and Manager roles share an identical, high-standard report experience
 * with simple wording, proper KPI cards, status graphs, top performers, overdue tasks,
 * recent tasks ledger, and department-wise fulfillment breakdowns.
 */
const ManagerReports = () => {
  return <Reports />;
};

export default ManagerReports;
