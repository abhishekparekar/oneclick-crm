const COMPLETE_STATUSES = new Set(["complete", "re_complete"]);
const LATE_STATUSES = new Set(["late_complete", "re_late_complete"]);
const PENDING_STATUSES = new Set(["pending", "re_pending"]);
const IN_PROCESS_STATUSES = new Set(["in_process", "re_in_process"]);

const buildTaskReportSummary = (tasks = []) => {
  const statusCounts = {};
  let pending = 0;
  let inProcess = 0;
  let overdue = 0;
  let onTime = 0;
  let delayed = 0;

  tasks.forEach((task) => {
    const status = task.status || "pending";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (COMPLETE_STATUSES.has(status)) onTime += 1;
    else if (LATE_STATUSES.has(status)) delayed += 1;
    else if (status === "overdue") overdue += 1;
    else if (IN_PROCESS_STATUSES.has(status)) inProcess += 1;
    else if (PENDING_STATUSES.has(status)) pending += 1;
  });

  const assigned = tasks.length;
  const completed = onTime + delayed;
  const completionRate = assigned ? Math.round((completed / assigned) * 100) : 0;
  const onTimeRate = completed ? Math.round((onTime / completed) * 100) : 0;

  return {
    assigned,
    total: assigned,
    pending,
    inProcess,
    overdue,
    onTime,
    delayed,
    completedOnTime: onTime,
    completedLate: delayed,
    completed,
    completionRate,
    onTimeRate,
    statusCounts,
    // Legacy aliases for older UI fragments
    todo: pending,
    inProgress: inProcess,
    review: overdue,
    done: onTime,
  };
};

module.exports = { buildTaskReportSummary };
